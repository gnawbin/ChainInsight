# Android deployment

Verified on Ubuntu 24.04 with a **command-line-only Android SDK** (no Android
Studio). Everything below was learned by running the build on this machine.

> **Status.** The toolchain works, and the build gets through the frontend, the
> Rust cross-compile and most of Gradle. The one hard blocker was the Gradle
> distribution download (see section 2). The app still needs the code changes in
> section 6 before it is usable on a phone; see `docs/architecture-review.md` for
> the architectural reasons.

---

## 1. Toolchain

| Piece | Value on this machine |
| --- | --- |
| SDK root | `/home/ubuntu/Android/Sdk` |
| NDK | `.../Sdk/ndk/29.0.14206865` (r29) |
| JDK | `/usr/lib/jvm/java-21-openjdk-amd64` (OpenJDK 21) |
| Rust | 1.98.1 + all four `*-linux-android` targets |
| Tauri CLI | 2.11.4 (`pnpm tauri`) |

`ANDROID_HOME` currently points at `/home/ubuntu/Android` - the **parent** of the SDK
root, so Gradle cannot see `platforms/` or `ndk/` through it. Always export:

```bash
export ANDROID_HOME=/home/ubuntu/Android/Sdk
export NDK_HOME=$ANDROID_HOME/ndk/29.0.14206865
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
```

(or write `src-tauri/gen/android/local.properties` with `sdk.dir` instead).

The generated Gradle project pins `compileSdk`/`targetSdk` 36, `minSdk` 24, Gradle
8.14.3, AGP 8.11.0 and Kotlin 1.9.25. Install the platform once:

```bash
sdkmanager --sdk_root=$ANDROID_HOME "platforms;android-36"
```

`build-tools;35.0.0` and the rest are pulled by Gradle itself - the SDK licences are
already accepted here.

> `pnpm tauri info` prints **nothing** about Android/NDK/Java: it is not a mobile
toolchain check. Validate with `tauri android init` or a build.

---

## 2. Network: pre-seed the Gradle distribution

`services.gradle.org` times out on this network, which kills the build at the first
Gradle step:

```
Downloading https://services.gradle.org/distributions/gradle-8.14.3-bin.zip
java.io.IOException: Downloading ... failed: timeout (SocketTimeoutException)
```

Fix - drop the distribution into the wrapper cache. The hash directory
(`cv11ve7ro1n3o1j4so8xd9n66`) is derived from the distribution URL and is created by
the first failed attempt:

```bash
cd /tmp
curl -fL --retry 3 -o gradle-8.14.3-bin.zip \
  https://mirrors.cloud.tencent.com/gradle/gradle-8.14.3-bin.zip
python3 -c "import zipfile;n=zipfile.ZipFile('/tmp/gradle-8.14.3-bin.zip').namelist();print(len(n),n[0])"
# 323 gradle-8.14.3/

D=~/.gradle/wrapper/dists/gradle-8.14.3-bin/cv11ve7ro1n3o1j4so8xd9n66
rm -f "$D"/gradle-8.14.3-bin.zip.lck "$D"/gradle-8.14.3-bin.zip.part
cp /tmp/gradle-8.14.3-bin.zip "$D"/
```

Mirrors measured here: tencent ok, huaweicloud ok, nju ok, aliyun 404.
`dl.google.com` and `repo.maven.apache.org` are reachable, so **no Maven mirror
override is needed**.

---

## 3. Build

```bash
pnpm tauri android init                                   # once; creates src-tauri/gen/android
pnpm tauri android build --ci --apk --target aarch64      # APK for one ABI
pnpm tauri android build --ci --aab                       # Play bundle
pnpm tauri android dev --device                           # hot reload on a device
```

* **With pnpm, never write `--` before the flags.** `tauri android build` takes
  `[OPTIONS] [-- <ARGS>]`, where everything after `--` is forwarded to the *runner*
  (cargo), so `pnpm tauri android build -- --apk` fails with
  `error: unexpected argument '--apk' found`. npm is the opposite: it needs the `--`.
* `--ci` skips the interactive keystore prompt (a release build asks otherwise).
* Artifacts live under `src-tauri/gen/android/app/build/outputs/`:
  `apk/universal/release/app-universal-release.apk` and
  `bundle/universalRelease/app-universal-release.aab`.

---
## 4. Install

```bash
adb devices
adb install -r src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk

# or create an emulator first (this machine has no AVD and no system image)
sdkmanager --sdk_root=$ANDROID_HOME "system-images;android-36;google_apis;x86_64"
avdmanager create avd -n demo -k "system-images;android-36;google_apis;x86_64"
$ANDROID_HOME/emulator/emulator -avd demo &
adb wait-for-device
```

---

## 5. Release signing and publishing

```bash
keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 \
  -validity 10000 -alias upload
# 1. src-tauri/gen/android/keystore.properties : password / keyAlias / storeFile
# 2. gen/android/app/build.gradle.kts :
#    signingConfigs { create("release") { ... } }
#    buildTypes.getByName("release") { signingConfig = signingConfigs.getByName("release") }
```

`versionCode` defaults to `major*1000000 + minor*1000 + patch` (0.1.0 -> 1000000),
overridable via `bundle.android.versionCode` / `autoIncrementVersionCode`.

* **Google Play** - upload the AAB; the first upload has to be manual.
* **Solana dApp Store** - wants an **APK** signed with a key *different* from the Play
  key, submitted with the `dapp-store` CLI.

`src-tauri/gen/android/.gitignore` already ignores `local.properties` and
`keystore.properties`; keep the keystore itself out of the repository.

---

## 6. Code gaps on Android

Deployable is not the same as usable: as written, the app cannot get past its own boot
screen on a phone.

| # | Gap | Why it breaks | Direction |
| --- | --- | --- | --- |
| 1 | `src-tauri/src/keypair.rs` resolves everything through `std::env::var_os("HOME")` | Android app processes have no `HOME` -> `could not determine $HOME` -> the client promise rejects -> `ClientErrorScreen` | use `app.path().app_data_dir()` with `$HOME` as the desktop fallback; take `tauri::AppHandle` in the commands; keep the path allowlist and make the base directory injectable for tests |
| 2 | wallet mode depends on Wallet Standard extensions | the Android WebView loads no extensions, so `WalletButton` shows "No wallets detected" | Mobile Wallet Adapter: `registerMwa()` from `@solana-mobile/wallet-standard-mobile` registers MWA as a Wallet Standard wallet, so `walletSigner()` keeps working; the native alternative is a Kotlin MWA plugin plus a `TransactionPartialSigner` modelled on `desktop-signer.ts` |
| 3 | `local` cluster is `http://127.0.0.1:8899` | 127.0.0.1 is the phone itself; release builds set `usesCleartextTraffic="false"` (debug is true); MWA only authorises devnet/mainnet | default to devnet on mobile, drop or hide `local` |
| 4 | `desktopStrategy` defaults to `local-bytes` | ships the private key through the webview | default to `rust-signer` on mobile |
| 5 | capabilities | `default.json` has no `platforms` filter and points at the desktop schema | split into `default.json` (desktop) and `mobile.json` (`platforms: ["android","ios"]`, mobile schema) |
| 6 | icons | Android adaptive icons want a large source; `icons/icon.png` is 512x512 | `pnpm tauri icon <1024x1024.png>` |

Why gap 1 bites first: `detectSignerMode()` returns `"desktop"` for **any** Tauri host,
so on Android the app takes the local-keypair path - the very path that needs `$HOME`.

---

## 7. Gotchas

* `CARGO_TARGET_DIR` is `/home/ubuntu/rustlings-target` here, so the Android `.so` and
  its cargo cache live outside the repository (~1.5 GB per ABI).
* Release builds are minified (`isMinifyEnabled = true`). If the app crashes on
  start-up after R8, add keep rules for the Tauri/JNI classes.
* The Android package name is the sanitised bundle identifier: hyphens become
  underscores. The identifier is now `ai.chaininsight`, so the package is
  `ai.chaininsight` unchanged (it contains no hyphen). **Changing
  `tauri.conf.json > identifier` means deleting `src-tauri/gen/` and re-running
  `tauri android init`** —— the Java package directory tree and every gradle
  `namespace` / `applicationId` are derived from it.
* `src-tauri/gen/` is **deliberately gitignored** (it is 46 MB of build output and
  embeds the identifier). Regenerate with `pnpm tauri android init` when Android
  work resumes; see `src-tauri/.gitignore` for the reasoning.
* The historical trace below was captured under the old project name
  (`solana-defi-demo` / `com.ubuntu.solana_defi_demo` / `libsolana_defi_demo_lib.so`).
  It is kept as evidence that the toolchain works, **not** as the current naming.
  Re-running it now would produce `chaininsight` / `ai.chaininsight` /
  `libchaininsight_lib.so`.
* `tauri android dev/build` finds devices and emulators itself and fails with
  `No connected Android devices detected` when there is none.

---

## 8. Verified build trace

```
pnpm build                                      ok   dist/ (248 KB CSS, 737 KB JS)
cargo aarch64-linux-android                     ok   release 4m24s (2nd pass 2m25s)
  linker = ndk/.../toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-android24-clang
  link args = -landroid -llog -lOpenSLES --cfg mobile
symlink .../jniLibs/arm64-v8a/libsolana_defi_demo_lib.so   ok
Gradle 8.14.3 (pre-seeded)                      ok   daemon started
build-tools;35.0.0                              ok   auto-installed by AGP
assembleUniversalRelease -PabiList=arm64-v8a    ok   only the requested ABI
Kotlin compile (app + tauri-android)            ok   warnings only
Java compile (source/target 8 on JDK 21)        ok   3 deprecation warnings
dex / R8 (minify) / packaging                   ->   last observed stage
```
