//! Local Solana CLI keypair support for the desktop build.
//!
//! `solana-keygen` writes keypairs as a JSON array of 64 bytes (secret key
//! followed by public key), which is the format handled here.
//!
//! The frontend picks one of two strategies:
//!
//! * `local-bytes` — [`read_keypair`] hands the 64 bytes to JS, which builds a
//!   Kit `KeyPairSigner`. Convenient, but the private key transits the webview.
//! * `rust-signer` — [`sign_message`] signs here so the private key never leaves
//!   this process. Only the 64-byte signature crosses the IPC boundary.

use std::path::{Path, PathBuf};

use ed25519_dalek::{Signer, SigningKey};

const KEYPAIR_FILE: &str = "id.json";
const KEYPAIR_BYTES: usize = 64;

/// Errors are surfaced to the frontend as plain strings.
type CommandResult<T> = Result<T, String>;

/// Directory the Solana CLI stores keypairs in (`~/.config/solana`).
fn solana_config_dir() -> Option<PathBuf> {
    std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".config").join("solana"))
}

/// Directory for keypairs created by this app (`~/.solana-defi-demo`).
fn app_keypair_dir() -> Option<PathBuf> {
    std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".solana-defi-demo"))
}

/// Directories a keypair may be read from.
///
/// This allowlist is the *only* thing standing between [`read_keypair`] and an
/// arbitrary-file-read primitive: the `path` argument originates in the webview,
/// so any XSS or compromised dependency could otherwise ask for `~/.ssh/id_rsa`.
fn allowed_keypair_dirs() -> Vec<PathBuf> {
    [solana_config_dir(), app_keypair_dir()]
        .into_iter()
        .flatten()
        .filter_map(|dir| dir.canonicalize().ok())
        .collect()
}

fn default_keypair_path() -> CommandResult<PathBuf> {
    solana_config_dir()
        .map(|dir| dir.join(KEYPAIR_FILE))
        .ok_or_else(|| "could not determine $HOME".to_owned())
}

/// Validates a caller-supplied path against the allowlist.
///
/// Canonicalising first resolves `..` and symlinks, so neither can be used to
/// escape the permitted directories.
fn resolve_allowed(path: &str) -> CommandResult<PathBuf> {
    let canonical = Path::new(path)
        .canonicalize()
        .map_err(|error| format!("cannot resolve {path}: {error}"))?;

    if !allowed_keypair_dirs().iter().any(|dir| canonical.starts_with(dir)) {
        return Err(
            "refusing to read a keypair outside the Solana config or app directories".to_owned(),
        );
    }
    Ok(canonical)
}

/// Reads a keypair file and returns its 64 bytes.
fn load_keypair_bytes(path: Option<String>) -> CommandResult<Vec<u8>> {
    let resolved = match path {
        Some(path) => resolve_allowed(&path)?,
        None => default_keypair_path()?,
    };

    let contents = std::fs::read_to_string(&resolved)
        .map_err(|error| format!("cannot read {}: {error}", resolved.display()))?;

    let bytes: Vec<u8> = serde_json::from_str(&contents)
        .map_err(|error| format!("{} is not a valid keypair: {error}", resolved.display()))?;

    if bytes.len() != KEYPAIR_BYTES {
        return Err(format!(
            "expected a {KEYPAIR_BYTES}-byte keypair, {} has {} bytes",
            resolved.display(),
            bytes.len()
        ));
    }
    Ok(bytes)
}

/// Builds a signing key from the local keypair.
fn signing_key(path: Option<String>) -> CommandResult<SigningKey> {
    let bytes = load_keypair_bytes(path)?;
    let array: [u8; KEYPAIR_BYTES] = bytes
        .as_slice()
        .try_into()
        .map_err(|_| format!("expected {KEYPAIR_BYTES} bytes"))?;

    // `from_keypair_bytes` also verifies that the public half matches the secret half.
    SigningKey::from_keypair_bytes(&array)
        .map_err(|error| format!("keypair bytes are inconsistent: {error}"))
}

/// Returns the raw keypair bytes so the frontend can build a Kit `KeyPairSigner`.
///
/// Backs the `local-bytes` strategy. Prefer [`sign_message`] when the extra
/// convenience is not required.
#[tauri::command]
pub fn read_keypair(path: Option<String>) -> CommandResult<Vec<u8>> {
    load_keypair_bytes(path)
}

/// Public (base58) address of the local keypair, without revealing the secret.
#[tauri::command]
pub fn local_address(path: Option<String>) -> CommandResult<String> {
    Ok(bs58::encode(signing_key(path)?.verifying_key().to_bytes()).into_string())
}

/// Signs a message (a compiled transaction message) with the local keypair.
///
/// Backs the `rust-signer` strategy: the private key stays in this process and
/// only the 64-byte signature is returned.
#[tauri::command]
pub fn sign_message(message: Vec<u8>, path: Option<String>) -> CommandResult<Vec<u8>> {
    Ok(signing_key(path)?.sign(&message).to_bytes().to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Creates a unique directory *inside* the app's allowlisted keypair dir.
    ///
    /// Using the real allowlisted location is the point: it exercises the same
    /// code path the app uses, rather than a test-only bypass.
    fn fixture_dir() -> PathBuf {
        let base = app_keypair_dir().expect("$HOME must be set to run these tests");
        let unique = format!(
            "test-{}-{:?}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        );
        let dir = base.join(unique);
        std::fs::create_dir_all(&dir).expect("create fixture dir");
        dir
    }

    fn write_fixture(dir: &Path, name: &str, bytes: &[u8]) -> PathBuf {
        let path = dir.join(name);
        let json = serde_json::to_string(&bytes).expect("serialize fixture");
        std::fs::write(&path, json).expect("write fixture");
        path
    }

    /// A deterministic 64-byte keypair (secret key followed by public key).
    fn deterministic_keypair() -> ([u8; 64], SigningKey) {
        let signing_key = SigningKey::from_bytes(&[7u8; 32]);
        let mut bytes = [0u8; 64];
        bytes[..32].copy_from_slice(&signing_key.to_bytes());
        bytes[32..].copy_from_slice(&signing_key.verifying_key().to_bytes());
        (bytes, signing_key)
    }

    #[test]
    fn keypair_outside_the_allowlist_is_refused() {
        // The whole point of the allowlist: a compromised webview must not be
        // able to turn `read_keypair` into an arbitrary file read.
        for path in ["/etc/passwd", "/etc/hostname", "/proc/self/environ"] {
            assert!(
                resolve_allowed(path).is_err(),
                "expected {path} to be rejected"
            );
            assert!(
                load_keypair_bytes(Some(path.to_owned())).is_err(),
                "expected {path} to be rejected by load_keypair_bytes"
            );
        }
    }

    #[test]
    fn path_traversal_out_of_the_allowlist_is_refused() {
        let dir = fixture_dir();
        let escape = dir.join("../../.ssh/id_rsa");
        let result = resolve_allowed(&escape.to_string_lossy());
        assert!(result.is_err(), "canonicalised traversal must be rejected");
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn allowlisted_keypair_round_trips_and_signs() {
        let dir = fixture_dir();
        let (bytes, signing_key) = deterministic_keypair();
        let path = write_fixture(&dir, "id.json", &bytes);

        // Read through the allowlist.
        let loaded = load_keypair_bytes(Some(path.to_string_lossy().into_owned())).expect("read");
        assert_eq!(loaded, bytes.to_vec());

        // The published address is base58 of the public half.
        let expected_address = bs58::encode(signing_key.verifying_key().to_bytes()).into_string();
        let derived = local_address(Some(path.to_string_lossy().into_owned())).expect("address");
        assert_eq!(derived, expected_address);

        // And a signature over arbitrary bytes verifies against that key.
        let message = b"compiled transaction message".to_vec();
        let signature = sign_message(message.clone(), Some(path.to_string_lossy().into_owned()))
            .expect("sign");
        assert_eq!(signature.len(), 64);

        use ed25519_dalek::Verifier;
        let sig = ed25519_dalek::Signature::from_slice(&signature).expect("signature bytes");
        signing_key
            .verifying_key()
            .verify(&message, &sig)
            .expect("signature must verify");

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn malformed_keypairs_are_refused() {
        let dir = fixture_dir();

        let wrong_length = write_fixture(&dir, "short.json", &[1u8; 32]);
        let error = load_keypair_bytes(Some(wrong_length.to_string_lossy().into_owned()))
            .expect_err("32 bytes must be rejected");
        assert!(error.contains("64-byte"), "unexpected error: {error}");

        let not_json = dir.join("garbage.json");
        std::fs::write(&not_json, "not json at all").expect("write");
        assert!(
            load_keypair_bytes(Some(not_json.to_string_lossy().into_owned())).is_err(),
            "non-JSON content must be rejected"
        );

        // A public key that does not match the secret half is rejected by
        // `SigningKey::from_keypair_bytes`, which is what keeps us from signing
        // with a keypair that can never pay for its own transactions.
        let (mut mismatched, _) = deterministic_keypair();
        mismatched[32..].copy_from_slice(&[9u8; 32]);
        let bad = write_fixture(&dir, "mismatched.json", &mismatched);
        assert!(
            sign_message(vec![1, 2, 3], Some(bad.to_string_lossy().into_owned())).is_err(),
            "mismatched public half must be rejected"
        );

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn missing_default_keypair_reports_an_error() {
        // No assertion on the exact message: it depends on whether the machine
        // running the tests happens to have a Solana CLI keypair installed.
        if default_keypair_path().map(|p| p.exists()).unwrap_or(false) {
            return;
        }
        assert!(load_keypair_bytes(None).is_err());
    }
}
