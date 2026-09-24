import { describe, expect, it } from "vitest";

import { chainOf, decodeBase58, detect, pathFor, type Detected } from "./detect";

/** 表驱动：`[输入, 期望的 kind]`。 */
const CASES: readonly (readonly [string, Detected["kind"]])[] = [
  // ── 带 0x 的 EVM：绝对无歧义 ──────────────────────────────────
  ["0x7a250d5630b4cf539739df2c5dacb4c659f2488d", "evm-address"],
  ["0x0000000000000000000000000000000000000000", "evm-address"],
  [
    "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
    "evm-tx-hash",
  ],
  // 大写 hex 也必须认（比如从某些区块浏览器复制出来的）
  ["0x7A250D5630B4CF539739DF2C5DACB4C659F2488D", "evm-address"],

  // ── 不带 0x 的 hex ───────────────────────────────────────────
  // ⚠️ 这一条是**对设计文档 §6.3 的修正**：文档初稿把 `7a250d…2488d` 当作
  //    「歧义」示例，但它含 `0`，而 `0` 不在 base58 字母表里 —— 所以 base58
  //    解释根本不成立，它只能是漏写前缀的 EVM 地址。多问一次是白打断用户。
  ["7a250d5630b4cf539739df2c5dacb4c659f2488d", "evm-address"],

  // ── Solana ──────────────────────────────────────────────────
  [
    "5h6xBEauJ3PK6SWCZ1PGjBvj8vDdWG3KpwATGy1ARAXFSDwt8GFXM7W5Ncn16wmqokgpiKRLuS83KUxyZyv2sUYv",
    "sol-signature",
  ],
  // 这条同时验证 base58 的**前导零字节**处理：44 字符解码正好 32 字节，
  // 且它是 Solana 的投票程序地址。
  ["Vote111111111111111111111111111111111111111", "sol-address"],
  ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "sol-address"],

  // ── 真·歧义：两种解释**都成立** ──────────────────────────────
  // 64 个 `1`：既是合法的 64 位 hex，又解码为恰好 64 字节（全是零）的 base58
  // —— 对应 EVM 交易哈希与 Solana 签名两种可能。这才是该问用户的情况。
  ["1".repeat(64), "ambiguous"],

  // ── 无法识别 ────────────────────────────────────────────────
  ["0x", "unknown"],
  ["0xZZZZ", "unknown"],
  ["IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII", "unknown"], // I 不在 base58 字母表
  ["", "unknown"],
  ["   ", "unknown"],
  ["a".repeat(65), "unknown"], // 长度不合法的 hex；base58 解出 48 字节，两边都不成立
  ["hello world", "unknown"],
];

describe("detect —— 链识别引擎（§6）", () => {
  it.each(CASES)("detect(%j) -> %s", (input, expected) => {
    expect(detect(input).kind).toBe(expected);
  });

  it("带 0x 的输入原样返回，不做任何改写", () => {
    const input = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";
    expect(detect(input).value).toBe(input);
  });

  it("无 0x 的 hex 会补上前缀 —— 否则下游拿到的是无效地址", () => {
    const result = detect("7a250d5630b4cf539739df2c5dacb4c659f2488d");
    expect(result.kind).toBe("evm-address");
    expect(result.value).toBe("0x7a250d5630b4cf539739df2c5dacb4c659f2488d");
  });

  it("歧义时给出两个可选项，且都不再是歧义", () => {
    const result = detect("1".repeat(64));
    if (result.kind !== "ambiguous") throw new Error("期望歧义");
    expect(result.options).toHaveLength(2);
    expect(result.options.map((o) => o.kind).sort()).toEqual(["evm-tx-hash", "sol-signature"]);
    for (const option of result.options) {
      expect(option.kind).not.toBe("ambiguous");
    }
  });

  it("前后空白被裁掉（从聊天窗口复制常带空格）", () => {
    expect(detect("  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \n").kind).toBe("sol-address");
  });

  it("判定是确定性的：同一输入永远同一答案（顺序不能变）", () => {
    const input = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";
    const first = detect(input);
    for (let i = 0; i < 5; i += 1) {
      expect(detect(input)).toEqual(first);
    }
  });

  it("失败时带可读原因，而不是只说不认识", () => {
    const result = detect("0xZZZZ");
    expect(result.kind).toBe("unknown");
    if (result.kind !== "unknown") throw new Error("unreachable");
    expect(result.reason).toContain("长度");
  });
});

describe("decodeBase58", () => {
  it("前导 `1` 表示前导零字节，不能丢", () => {
    expect([...decodeBase58("1")!]).toEqual([0]);
    expect([...decodeBase58("11")!]).toEqual([0, 0]);
    expect([...decodeBase58("1111")!]).toEqual([0, 0, 0, 0]);
  });

  it("空输入解出空数组（而不是 null）", () => {
    expect(decodeBase58("")).toEqual(new Uint8Array(0));
  });

  it("字母表外的字符返回 null（这就是 `0` / `O` / `I` / `l` 被排除的意义）", () => {
    for (const bad of ["0", "O", "I", "l", "0x1234", "hello!"]) {
      expect(decodeBase58(bad), `应当拒绝 ${bad}`).toBeNull();
    }
  });

  it("32 字节与 64 字节的往返长度对得上", () => {
    expect(decodeBase58("Vote111111111111111111111111111111111111111")!.length).toBe(32);
    expect(
      decodeBase58(
        "5h6xBEauJ3PK6SWCZ1PGjBvj8vDdWG3KpwATGy1ARAXFSDwt8GFXM7W5Ncn16wmqokgpiKRLuS83KUxyZyv2sUYv",
      )!.length,
    ).toBe(64);
  });
});

describe("chainOf / pathFor", () => {
  it("EVM 归到 eip155:1，Solana 归到 solana", () => {
    const evm = detect("0x7a250d5630b4cf539739df2c5dacb4c659f2488d");
    const sol = detect("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    if (evm.kind === "unknown" || evm.kind === "ambiguous") throw new Error("unreachable");
    if (sol.kind === "unknown" || sol.kind === "ambiguous") throw new Error("unreachable");
    expect(chainOf(evm)).toBe("eip155:1");
    expect(chainOf(sol)).toBe("solana");
  });

  it("地址与交易分别落到不同路由", () => {
    expect(pathFor(detect("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"))).toBe(
      "/address/solana/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    );
    expect(
      pathFor(
        detect("0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822"),
      ),
    ).toBe(
      "/tx/eip155%3A1/0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
    );
  });

  it("无法确定时返回 null —— 调用方据此去渲染歧义选择或回退检索", () => {
    expect(pathFor(detect("hello"))).toBeNull();
    expect(pathFor(detect("1".repeat(64)))).toBeNull();
  });
});
