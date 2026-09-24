# ChainInsight AI

> ETH + Solana 双链**只读** AI 链上浏览器。
> Tauri 2 桌面端 · React 19 + Mantine 9 · Rust 后端（独占 SQLite 与出网）

---

## 这是什么

一个把公开链上数据翻译成人类语言的浏览器：查地址、查交易、查合约，自动解析 DeFi 行为，
并用 AI 生成大白话解读与地址画像。

## 这**永远不是**什么

**只读是产品的核心定位，不是路线图上的一个阶段。**

| 永久不做 | 原因 |
| --- | --- |
| 私钥 / 助记词导入与存储 | 产品不接触任何密钥材料 |
| 钱包连接 | 没有这个代码路径 |
| 交易签名、广播、转账 | 无写链能力 |
| 投资建议、价格预测 | AI 输出经 `guard` 后置校验 |
| 把地址与现实身份绑定 | 不接任何身份/征信数据源 |

这些不是「暂未实现」，而是**架构上不存在对应的代码路径** —— 并且由
`scripts/check-redlines.mjs` 扫描源码、构建产物与**两侧**依赖清单（`package.json` +
`Cargo.toml`）来强制。详见设计文档 §1.2 与 §10。

**你不需要注册本软件，也不需要连接钱包。** 唯一需要自备的是三个数据源 API Key
（Helius / Etherscan / AI）。它们只存在你本机的 SQLite 里，由 Rust 独占读写，前端拿不到明文。

---

## 当前状态

诚实地说：**这是骨架，不是可用的产品。**

| 部分 | 状态 |
| --- | --- |
| 只读重构（删掉签名面） | ✅ 16 个文件已删，两侧依赖已清 |
| 13 条路由 + 应用外壳 + 免责声明页脚 + 演示数据横幅 | ✅ 可点击、可导航 |
| 链识别引擎（EVM / Solana 地址与交易哈希） | ✅ 29 个用例 |
| 合规强制（红线扫描 + 免责声明 hash 锁） | ✅ 进 `pnpm verify` |
| **真实数据接入** | ❌ 未开始（Rust 的 DB 与出网层都还没写） |
| **各页内容** | ❌ 目前是规格占位卡（指向设计文档章节） |
| **AI 层** | ❌ 未开始 |

无密钥时产品进入**演示数据模式**，页面顶部有不可关闭的黄色横幅标明「当前展示的是内置样本数据」。

---

## 快速开始

```bash
pnpm install
pnpm dev            # 浏览器 http://localhost:1420（纯前端，无 Tauri 命令）
pnpm tauri dev      # 桌面壳（首次编译 Rust 约 1–3 分钟）
```

> `pnpm dev` 只跑前端。窗口标题、系统集成、SQLite、出网代理都需要 `pnpm tauri dev`。

### 验收：一条命令，两个语言域

```bash
pnpm verify
# = typecheck && test && build && check:rust && check:redlines
```

`pnpm verify` 的存在有具体原因：**项目曾只验前端就宣布通过，于是 `lib.rs` 里留了两个重复的
`pub fn run()` 而无人发现**，直到手动 `pnpm tauri dev` 报 `E0428`。复盘见设计文档 §3.6 E/F。

---

## 脚本

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | Vite 开发服务器（纯前端） |
| `pnpm tauri dev` | 桌面壳 + 热重载 |
| `pnpm build` | `tsc` + 生产构建到 `dist/` |
| `pnpm verify` | **两个语言域的 5 道关卡**（见上） |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest（链识别 + 免责声明 hash 锁） |
| `pnpm check:rust` | `cargo check`（快，不改产物） |
| `pnpm check:redlines` | 红线扫描；加 `--self-test` 验证扫描器本身有效 |
| `pnpm test:rust` | `cargo test --lib`（目前无测试） |

---

## 技术栈

| 层 | 选择 | 版本 |
| --- | --- | --- |
| 桌面壳 | Tauri | 2 |
| UI | React + Vite | 19.3 · 8.3 |
| 语言 | TypeScript（前端）/ Rust（后端） | 7.0 · 1.98 |
| 组件 | Mantine（`core`/`hooks`/`form`/`notifications`/`charts`） | 9.6.1 |
| 样式管线 | Mantine CSS + `postcss-preset-mantine` | — |
| 路由 | `react-router-dom`（`HashRouter`） | 7.18 |
| 测试 | Vitest + Testing Library + jsdom | 5.0.1 · 16.3 · 26 |
| 数据库 | SQLite（`rusqlite` bundled + `sqlite-vec`）· **待接入** | — |

**为什么是 `HashRouter`**：打包后的 Tauri 用自定义协议提供前端，`/address/...` 这类路径深链
不会被重写到 `index.html`，所以任何非根路由刷新都会 404。

**为什么前端不直连数据源**：Helius 的鉴权是 URL query string（`?api-key=`）。若请求由前端发出，
前端就必须持有明文密钥，「密钥不进 webview」的承诺当场失效。所以出网统一收敛到 Rust 的传输层
（走 IPC，**不起 HTTP 服务器**）。

---

## 架构

```
┌─ WebView：全部业务逻辑（TS）────────────────────────────────┐
│  routes/ · components/ · chains/（链识别）                    │
│  defi/（行为归一化）· ai/（证据包 / prompt / guard / report）  │
└──────────┬───────────────────────────────────────────────────┘
           │ Tauri IPC
┌──────────▼─ Rust（只做两件 TS 做不到的事）───────────────────┐
│  db/     独占 SQLite（schema.sql 已就位；mod.rs / migrate.rs 待写）│
│  proxy/  独占出网（注入密钥 · host 白名单 · 限流退避 · 日志脱敏）│
└───────────────────────────────────────────────────────────────┘
```

**Rust 不写业务逻辑** —— `normalize` / `evidence` / `guard` / `report` 全在 TS。它只负责让密钥
不离开 Rust，以及让所有出网经过一个可审计的点。

更详细的取舍（为什么不启 Axum、为什么不用 SurrealDB、为什么缓存由前端驱动）见设计文档 §3。

---

## 目录

```
src/
├── api/                     IPC 入口（tauri-specta 生成，待接入）
├── chains/detect.ts         链识别引擎（纯函数，29 用例）
├── components/
│   ├── compliance/          免责声明页脚（hash 锁定）
│   ├── layout/              AppShell · PageHeader · ChainBadge · ProviderStatus
│   └── common/              规格占位卡
├── hooks/useAppStatus.ts    数据源状态 + 演示模式判定
├── lib/                     disclaimer（冻结文案）· strings（品牌名唯一落点）· format · env
└── routes/                  13 条路由（见设计文档 §8.1）
src-tauri/
├── src/db/schema.sql        13 张表的完整 DDL（已执行验证：26 语句 / 32 约束用例）
├── src/lib.rs               目前为空 —— 刻意如此
└── .gitignore               gen/ 整目录忽略（46 MB 生成物）
scripts/check-redlines.mjs   红线扫描（含 --self-test）
```

---

## 文档

| 文档 | 内容 |
| --- | --- |
| **[`docs/chaininsight-design.md`](docs/chaininsight-design.md)** | **单一设计文档**：架构 · 数据模型 · IPC 契约 · 页面逐字段规格 · AI 层 · 合规可执行规范 · 测试与 CI · 实施规划 · 风险登记 · 决策记录 |
| [`docs/PRD.md`](docs/PRD.md) | 产品需求原文（含合规章节） |
| [`docs/android.md`](docs/android.md) | Android 构建 playbook（历史 trace，命名已过时） |
| [`docs/architecture-review.md`](docs/architecture-review.md) | 迁移前对签名器架构的评审（其测试选型矩阵仍被采纳） |

---

## 许可

[Apache License 2.0](LICENSE)

---

> 本工具仅用于区块链公开数据查询、解析与学术研究参考，不构成任何投资、金融、法律建议。
> 完整免责声明见 [`src/lib/disclaimer.ts`](src/lib/disclaimer.ts) —— 冻结文案，改一个标点就会让测试失败。

