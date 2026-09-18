/** Lamports per SOL (1 SOL = 10^9 lamports). */
export const LAMPORTS_PER_SOL = 1_000_000_000n;

/**
 * Formats lamports as SOL.
 *
 * All maths is BigInt so amounts never lose precision to floating point — which
 * matters because lamport values routinely exceed `Number.MAX_SAFE_INTEGER` when
 * aggregating across accounts.
 */
export function formatSol(lamports: bigint, decimals = 4): string {
  return formatUnits(lamports, 9, decimals);
}

/** Formats a raw token amount given the mint's decimals. */
export function formatUnits(amount: bigint, mintDecimals: number, displayDecimals = 4): string {
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const divisor = 10n ** BigInt(mintDecimals);
  const whole = absolute / divisor;
  const remainder = absolute % divisor;

  const sign = negative ? "-" : "";
  if (displayDecimals <= 0) return `${sign}${whole}`;

  const fraction = remainder
    .toString()
    .padStart(mintDecimals, "0")
    .slice(0, displayDecimals);
  return `${sign}${whole}.${fraction}`;
}

/** Shortens a base58 address for display, e.g. `9xQe…7fRt`. */
export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

/** Inserts thousands separators into an already-formatted decimal string. */
export function groupDigits(value: string): string {
  const [whole = "", fraction] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/** Formats a plain number with a bounded number of fraction digits. */
export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

/**
 * Parses a user-entered SOL amount into lamports.
 *
 * Returns `null` for anything that is not a plain decimal with at most 9
 * fraction digits, so callers can disable submission instead of silently
 * rounding — rounding a transfer amount changes what the user sends.
 */
export function parseSolToLamports(input: string): bigint | null {
  const trimmed = input.trim();
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return null;

  const [whole = "0", fraction = ""] = trimmed.split(".");
  if (fraction.length > 9) return null;

  try {
    return BigInt(whole || "0") * LAMPORTS_PER_SOL + BigInt(fraction.padEnd(9, "0") || "0");
  } catch {
    return null;
  }
}
