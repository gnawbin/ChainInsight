/**
 * Typed access to Vite environment variables.
 *
 * **这里没有、也永远不会有 API Key。** 三个数据源密钥存在 Rust 独占的 SQLite
 * （`secret` 表）里，由用户在 Settings 页填写 —— 见设计文档 §11.1。
 * 密钥绝不能进 `VITE_*`：Vite 在**构建期**把它内联进 JS，等于发给所有用户。
 *
 * 因此本文件只剩「开发/调试开关」这一类别的东西。
 */

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function readFlag(value: unknown): boolean {
  return readString(value) === "1" || readString(value) === "true";
}

export const env = {
  /**
   * 强制进入演示数据模式（读 `src/fixtures/`，不发任何网络请求）。
   * 无密钥时的产品形态本来就是演示模式，这个开关只是让开发时能主动进。
   */
  forceDemoMode: readFlag(import.meta.env.VITE_FORCE_DEMO_MODE),
} as const;

