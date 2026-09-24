/// <reference types="vite/client" />

/**
 * Environment variables exposed to the frontend bundle.
 *
 * Only `VITE_`-prefixed variables are inlined by Vite. Anything defined here
 * ends up inside the shipped JS, so **never put secrets in `.env`**.
 *
 * ⚠️ 特别注意：三个数据源 API Key **不在这个列表里，也永远不该进来**。
 * 它们存在 Rust 独占的 SQLite 里（设计文档 §11.1）。把 Key 写进 `VITE_*`
 * 等于在构建期把它打进安装包、发给每一个用户。
 */
interface ImportMetaEnv {
  /** 设为 `1` / `true` 强制进入演示数据模式（读 fixture、不发网络请求）。 */
  readonly VITE_FORCE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

