import { describe, expect, it } from "vitest";

import { DISCLAIMER_SHA256, DISCLAIMER_TEXT } from "./disclaimer";

/**
 * 用 Web Crypto 而不是 `node:crypto` —— 本仓库的 `tsconfig.json` 是**浏览器**配置
 * （`lib: ["ES2020", "DOM"]`，不引入 node 全局），所以 `node:crypto` 与 `Buffer`
 * 都不该出现在 `src/` 里。用 Web Crypto 既过类型检查，也是前端本来就该用的 API。
 */
async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** UTF-8 字节数（替代 `Buffer.byteLength`）。 */
function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * 免责声明的「不可删除」执行手段。
 *
 * PRD §8.4 要求这段文案在「前端页面底部、关于页面、AI 报告尾部永久显示」，
 * 且**不可删除**。光靠文档和自觉都不算数 —— 这里用 hash 把它锁住：
 *
 * - 改动文案（哪怕一个标点）→ 第 1 个用例失败
 * - 改动冻结的 hash 去「迁就」新文案 → 第 2 个用例失败（因为它对的是 PRD 原文的长度）
 *
 * 两条例外都需要**同时**改测试才能通过，那是刻意的摩擦：让「改免责声明」
 * 成为一次必须被看见的动作，而不是顺手改掉。
 */
describe("免责声明冻结", () => {
  it("文本的 sha256 与冻结值一致", async () => {
    await expect(sha256Hex(DISCLAIMER_TEXT)).resolves.toBe(DISCLAIMER_SHA256);
  });

  it("与 PRD §8.4 原文的长度一致（157 字符 / 467 UTF-8 字节）", () => {
    // 长度是第二道锁：只改 hash 常量无法让长度也对上。
    expect(DISCLAIMER_TEXT.length).toBe(157);
    expect(byteLength(DISCLAIMER_TEXT)).toBe(467);
  });

  it("首尾没有多余空白 —— 否则 hash 会悄悄变掉", () => {
    expect(DISCLAIMER_TEXT).toBe(DISCLAIMER_TEXT.trim());
  });

  it("包含 PRD 要求的几项关键承诺", () => {
    // 这些是 PRD §8.4 里最不能丢的句子，单独断言一遍是为了让失败信息可读
    //（hash 不一致只会说「字符串不同」，看不出丢了哪一句）。
    for (const phrase of [
      "不构成任何投资、金融、法律建议",
      "AI分析内容存在幻觉",
      "无钱包、无签名、无转账、无资产托管功能",
      "严禁用于隐私追踪、非法取证、洗钱分析等违规违法场景",
      "用户所有使用行为由用户本人自行承担全部责任",
    ]) {
      expect(DISCLAIMER_TEXT).toContain(phrase);
    }
  });
});

