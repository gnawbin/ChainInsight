//! Tauri 后端入口。
//!
//! # 当前状态：**空的**
//!
//! 计划中的两个职责都还未落地（设计文档 §3.1 / §11.6）：
//! 1. **独占 SQLite** —— `db/`（连接管理 + `user_version` 迁移）与 `schema.sql`（已就位）
//! 2. **独占出网** —— `proxy/`（注入密钥 · host 白名单 · 限流退避 · 日志脱敏）
//!
//! # 这里为什么没有 `invoke_handler`
//!
//! 迁移前这里注册了 4 个命令：
//!
//! | 命令 | 它提供的能力 |
//! | --- | --- |
//! | `read_keypair` | 读出 64 字节私钥 |
//! | `create_keypair` | 生成新私钥 |
//! | `sign_message` | 用私钥对消息签名 |
//! | `local_address` | 由私钥派生地址 |
//!
//! 四者全部属于 PRD §8.3 的永久红线（禁止私钥导入与存储、禁止交易签名），
//! 已随 `src/keypair.rs` 一起删除。
//!
//! **`invoke_handler` 现在是空的 —— 这是刻意的，不是忘了写。** 将来新增的每一个
//! 命令都要过 `scripts/check-redlines.mjs` 的红线扫描。
//!
//! > 这些命令名之所以能写在注释里，是因为扫描器**跳过整行注释**（`isCommentLine`）。
//! > 否则「解释为什么删掉某个东西」这件事本身就会让扫描失败 —— 这个脚本实现时
//! > 确实被自己的注释绊倒过两次。

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
