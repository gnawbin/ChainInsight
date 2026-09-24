/**
 * 链识别引擎（设计文档 §6）。
 *
 * **纯函数、零 IO、零依赖** —— 这是全项目最高 ROI 的测试目标：判断错了会把用户
 * 带到错误的链上，还可能白花一次计费的 API 调用。
 *
 * 判定顺序本身就是设计的一部分，见 `detect()` 的注释。
 */

/** 已确定的识别结果。 */
export type CertainKind = "evm-address" | "evm-tx-hash" | "sol-address" | "sol-signature";

export type Certain = Readonly<{ kind: CertainKind; value: string }>;

export type Detected =
  | Certain
  /** 无 `0x` 前缀的 40/64 位 hex —— 两种解释都成立，交给用户选（§6.2）。 */
  | Readonly<{ kind: "ambiguous"; value: string; options: readonly Certain[] }>
  | Readonly<{ kind: "unknown"; value: string; reason: string }>;

/**
 * base58 字母表。注意它**排除了** `0` `O` `I` `l` 四个易混字符。
 *
 * 这正是为什么判定顺序不能反过来：小写十六进制字母集（`0-9a-f`）是 base58 的
 * **子集**，所以每个 40 字符的小写 hex 串同时也是一个合法的 base58 串。
 */
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const BASE58_INDEX = new Map<string, number>(
  [...BASE58_ALPHABET].map((char, index) => [char, index]),
);

const HEX_40 = /^0x[0-9a-fA-F]{40}$/;
const HEX_64 = /^0x[0-9a-fA-F]{64}$/;
const BARE_HEX_40 = /^[0-9a-fA-F]{40}$/;
const BARE_HEX_64 = /^[0-9a-fA-F]{64}$/;

/**
 * 解码 base58。遇到字母表外的字符返回 `null`。
 *
 * 用 BigInt 逐位累加也能写，但那在 88 字符的长输入上明显更慢；这里用标准的
 * 「字节数组做 58 进制进位」写法，`O(n²)` 但常数极小。
 *
 * ⚠️ 前导 `1` 在 base58 里表示**前导零字节**，不能丢 —— 丢了会让
 * `Vote111…`（Solana 投票程序）这类地址长度算错 32 字节。
 * 测试用例里专门留了它来覆盖这一点。
 */
export function decodeBase58(input: string): Uint8Array | null {
  if (input.length === 0) return new Uint8Array(0);

  /** 小端序累加器：`bytes[0]` 是最低位。 */
  const littleEndian: number[] = [];

  for (const char of input) {
    const digit = BASE58_INDEX.get(char);
    if (digit === undefined) return null;

    let carry = digit;
    for (let i = 0; i < littleEndian.length; i += 1) {
      carry += littleEndian[i]! * 58;
      littleEndian[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      littleEndian.push(carry & 0xff);
      carry >>= 8;
    }
  }

  let leadingZeros = 0;
  for (const char of input) {
    if (char === "1") leadingZeros += 1;
    else break;
  }

  const out = new Uint8Array(leadingZeros + littleEndian.length);
  for (let i = 0; i < littleEndian.length; i += 1) {
    out[out.length - 1 - i] = littleEndian[i]!;
  }
  return out;
}

function solKind(decoded: Uint8Array): CertainKind | null {
  if (decoded.length === 32) return "sol-address";
  if (decoded.length === 64) return "sol-signature";
  return null;
}

/**
 * 识别用户输入属于哪条链、哪一类实体。
 *
 * 判定必须**按顺序**（§6.1）：先 hex 再 base58，因为小写 hex 是 base58 的子集，
 * 反过来判会把 `0x…` 地址当 base58 处理。顺序定死后结果是确定的 —— 同一个输入
 * 永远得到同一个答案。
 */
export function detect(raw: string): Detected {
  const value = raw.trim();
  if (value === "") return { kind: "unknown", value, reason: "空输入" };

  // ① 带 0x 的 hex：绝对无歧义
  if (HEX_40.test(value)) return { kind: "evm-address", value };
  if (HEX_64.test(value)) return { kind: "evm-tx-hash", value };

  // ② 不带 0x 的 40/64 位 hex：可能是漏写前缀的 EVM 地址/哈希，也可能是长得像
  //    hex 的 base58 串。
  //
  //    ⚠️ 这里与设计文档 §6.1 的初稿有一处**修正**：初稿说「无 0x 的 40/64 位 hex
  //    一律判为歧义」，但那是按**形态**判的。按**解释是否成立**判更对：
  //
  //      - `7a250d…2488d` 含 `0`，而 `0` 不在 base58 字母表里 → base58 解释不成立
  //        → 它只能是漏了前缀的 EVM 地址，**不该多问一次**。
  //      - 只有两种解释**都成立**时才叫歧义（例如 `"1".repeat(64)`：既是合法的
  //        64 位 hex，又解码为恰好 64 字节的 base58 签名）。
  //
  //    好处是少一次无谓的打断；代价是判定多一步 base58 解码 —— 值得。
  if (BARE_HEX_40.test(value) || BARE_HEX_64.test(value)) {
    const asHex: Certain = {
      kind: value.length === 40 ? "evm-address" : "evm-tx-hash",
      value: `0x${value}`,
    };
    const decoded = decodeBase58(value);
    const asSolKind = decoded === null ? null : solKind(decoded);
    // base58 解释不成立 → 无歧义，直接给 EVM 解释（并补上前缀）
    if (asSolKind === null) return asHex;
    return {
      kind: "ambiguous",
      value,
      options: [asHex, { kind: asSolKind, value }],
    };
  }

  // ③ base58：按解码后的字节数区分钱包地址（32）与交易签名（64）
  const decoded = decodeBase58(value);
  if (decoded !== null) {
    const kind = solKind(decoded);
    if (kind !== null) return { kind, value };
    return {
      kind: "unknown",
      value,
      reason: `base58 解码得 ${decoded.length} 字节，既不是 32（地址）也不是 64（签名）`,
    };
  }

  // ④ 都不匹配
  return {
    kind: "unknown",
    value,
    reason: value.startsWith("0x")
      ? "0x 开头的十六进制长度不是 40（地址）或 64（交易哈希）"
      : "既不是十六进制地址/哈希，也不是合法的 base58 地址/签名",
  };
}

/** 把确定的识别结果转成路由需要的链标识（§4.2 的 `chain` 表主键形式）。 */
export function chainOf(detected: Certain): "solana" | `eip155:${number}` {
  switch (detected.kind) {
    case "evm-address":
    case "evm-tx-hash":
      return "eip155:1";
    case "sol-address":
    case "sol-signature":
      return "solana";
  }
}

/** 生成可跳转的站内路径；无法确定时返回 `null`（调用方去渲染歧义选择或检索）。 */
export function pathFor(detected: Detected): string | null {
  if (detected.kind === "unknown" || detected.kind === "ambiguous") return null;
  const chain = chainOf(detected);
  const encoded = encodeURIComponent(detected.value);
  if (detected.kind === "evm-tx-hash" || detected.kind === "sol-signature") {
    return `/tx/${encodeURIComponent(chain)}/${encoded}`;
  }
  return `/address/${encodeURIComponent(chain)}/${encoded}`;
}
