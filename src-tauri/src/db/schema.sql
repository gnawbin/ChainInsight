-- ============================================================================
-- ChainInsight AI  ·  SQLite schema (v1)
--
-- 用途   ：单文件本地库，位于 app_data_dir()/chaininsight.db
--          （不用 $HOME —— Android 上没有 $HOME，见设计文档 §16.1 修正 3）
-- 目标   ：bundled SQLite 3.46.0（libsqlite3-sys 0.30.1 实测）
--          故 STRICT（>=3.37）可用；FTS5 / trigram 可用
-- 迁移   ：用 PRAGMA user_version 管理；本文件是 version 1 的全量建表
-- 读法   ：带 [BUGFIX] / [NEW] 的注释是本次修订点
-- 主键   ：所有表统一使用 id INTEGER PRIMARY KEY AUTOINCREMENT 作为主键
-- ============================================================================
-- 表清单（14 张）
--   1 密钥与设置   secret  setting[NEW]
--   2 基础数据     chain  protocol  selector  token[NEW]
--   3 用户数据     label
--   4 缓存         cache
--   5 AI           ai_report  ai_usage[NEW]
--   6 日志         query_log  usage_log[NEW]
--   7 虚表         search_fts(FTS5)  addr_vec(vec0，需 sqlite-vec 扩展)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ============================================================================
-- 1 密钥与设置
-- ============================================================================

-- 用户自填的三个 API Key。明文存储，理由与威胁模型见设计文档 §11.1
CREATE TABLE secret (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  secret_type TEXT NOT NULL CHECK (secret_type IN ('helius','etherscan','ai')),
  value       TEXT NOT NULL CHECK (length(value) > 0),
  hint        TEXT NOT NULL,                -- 掩码预览 '..ab12'，只用于回显
  updated_at  INTEGER NOT NULL
) STRICT;

-- [NEW] 设置。KV + JSON 字面量。此前设计文档引用了 settings.welcome_done 却无此表
CREATE TABLE setting (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         TEXT NOT NULL UNIQUE,
  value       TEXT NOT NULL,
  updated_at  INTEGER NOT NULL
) STRICT;
-- 已知 key（代码约定，不加 CHECK，便于增字段）
--   welcome_done / demo_mode / theme
--   cache_enabled / cache_ttl_json
--   ai_enabled / ai_provider / ai_base_url / ai_model_light / ai_model_heavy
--   ai_max_items / ai_temperature / ai_output_lang
--   ai_price_in / ai_price_out / ai_budget_alert     用户自填单价与提醒阈值
--   evm_rpc_url
--   data_version_chains / data_version_protocols     决定是否重灌 resources/*.json

-- ============================================================================
-- 2 基础数据（随版本发布，首次启动灌入；改数据不改代码）
-- ============================================================================

CREATE TABLE chain (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT NOT NULL,              -- 原 id 值：'solana' | 'eip155:1' | 'eip155:8453'
  family        TEXT NOT NULL CHECK (family IN ('solana','evm')),
  evm_chainid   INTEGER,                   -- Etherscan V2 必传 chainid；solana 必须为 NULL
  name          TEXT NOT NULL,
  native_symbol TEXT NOT NULL,
  decimals      INTEGER NOT NULL,
  explorer      TEXT,
  enabled       INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  UNIQUE(code),
  -- 用 CHECK 强制不变量：evm 必须有 chainid，solana 必须没有
  CHECK ((family = 'evm'    AND evm_chainid IS NOT NULL)
      OR (family = 'solana' AND evm_chainid IS NULL))
) STRICT;

-- [BUGFIX] 原设计只有 chain_family，无法区分同一协议在不同 EVM 链上的部署
--          例：Uniswap V2 Router 在 ETH / Base / Arbitrum 是三个不同地址
CREATE TABLE protocol (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id      INTEGER NOT NULL REFERENCES chain(id) ON DELETE CASCADE,
  protocol_code TEXT NOT NULL,             -- 原 id 值：'uniswap-v2@eip155:1' | 'jupiter@solana'
  category      TEXT NOT NULL CHECK (category IN
            ('dex','lending','staking','farm','perp','bridge','nft','other')),
  address       TEXT NOT NULL,             -- EVM 合约地址 或 Solana Program ID
  name          TEXT NOT NULL,
  url           TEXT,
  UNIQUE (chain_id, address, protocol_code)
) STRICT;
CREATE INDEX idx_protocol_addr ON protocol(chain_id, address);

-- topic0 / 4-byte selector / Anchor discriminator 的人类可读解释
-- 同时是「这个 0x3df02124 是什么」的落点（检索页 /search）
CREATE TABLE selector (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  hex           TEXT NOT NULL UNIQUE,      -- '0xd78ad95f..' | '3df02124' | base58
  kind          TEXT NOT NULL CHECK (kind IN
              ('evm-topic0','evm-selector','sol-anchor-disc')),
  protocol_id   INTEGER REFERENCES protocol(id) ON DELETE SET NULL,
  signature     TEXT,                      -- 用于 tiny-keccak 自算校验（设计文档 §7.3）
  human         TEXT NOT NULL
) STRICT;
CREATE INDEX idx_selector_protocol ON selector(protocol_id);

-- [NEW] 查询过程中沉淀的代币元数据。
-- 理由：交易列表 / DeFi 活动的每一行都要 symbol + decimals；
--       若走 cache KV 会退化成 N 次点查。若 P1 实测无压力，可裁剪此表改用 cache。
CREATE TABLE token (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id      INTEGER NOT NULL REFERENCES chain(id) ON DELETE CASCADE,
  address       TEXT NOT NULL,             -- mint / 合约地址；原生币写 'native'
  symbol        TEXT,
  name          TEXT,
  decimals      INTEGER,
  logo_uri      TEXT,
  fetched_at    INTEGER NOT NULL,
  UNIQUE (chain_id, address)
) STRICT;

-- ============================================================================
-- 3 用户数据
-- ============================================================================

-- 本地地址标签。只能由用户手填，不接入任何身份/征信数据源（PRD §8.2 不去匿名溯源）
CREATE TABLE label (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id      INTEGER NOT NULL REFERENCES chain(id) ON DELETE CASCADE,
  address       TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('cex','bridge','dex','user','other')),
  name          TEXT NOT NULL CHECK (length(name) > 0),
  note          TEXT,
  watched       INTEGER NOT NULL DEFAULT 0 CHECK (watched IN (0,1)),   -- 首页「我关注的地址」
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  UNIQUE (chain_id, address)
) STRICT;
CREATE INDEX idx_label_watched ON label(watched, updated_at DESC);

-- ============================================================================
-- 4 缓存（唯一带 TTL 的部分）
-- ============================================================================

-- 只存「归一化后的结果」，不存原始响应（设计文档 §4.1 原则 4）。
-- 关键：缓存由前端通过 cache_get / cache_put 驱动，出网传输层不参与缓存。
CREATE TABLE cache (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  key           TEXT NOT NULL UNIQUE,      -- 'sol:addr:XXX:txs:head' / 'eip155:1:token:0xabc'
  payload       TEXT NOT NULL,
  fetched_at    INTEGER NOT NULL,
  ttl_secs      INTEGER NOT NULL CHECK (ttl_secs > 0),
  provider      TEXT NOT NULL,
  hit_count     INTEGER NOT NULL DEFAULT 0,  -- 供 Settings 显示缓存命中率
  last_hit_at   INTEGER
) STRICT;
CREATE INDEX idx_cache_fetched  ON cache(fetched_at);
CREATE INDEX idx_cache_provider ON cache(provider, fetched_at);

-- ============================================================================
-- 5 AI
-- ============================================================================

-- 6 模块画像报告缓存。不设 TTL：prompt_ver 一改，hash 自然失效（设计文档 §4.5）
CREATE TABLE ai_report (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  hash          TEXT NOT NULL UNIQUE,      -- sha256(scope|target|prompt_ver|model)
  scope         TEXT NOT NULL CHECK (scope IN ('address','tx','contract','defi-event')),
  target        TEXT NOT NULL,
  model         TEXT NOT NULL,
  prompt_ver    INTEGER NOT NULL,
  payload       TEXT NOT NULL,             -- 6 模块结构化 JSON
  created_at    INTEGER NOT NULL
) STRICT;
CREATE INDEX idx_ai_target ON ai_report(scope, target, created_at DESC);

-- [NEW] AI 用量台账。供 Settings/AI 页展示「本月统计 / 按槽位分列 / 最近 10 次调用」
--       命中报告缓存时记 cache_hit=1 且 tokens 为 0 —— 这正是「省了多少」的证据
CREATE TABLE ai_usage (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  at         INTEGER NOT NULL,
  slot       TEXT NOT NULL CHECK (slot IN ('light','heavy')),
  model      TEXT NOT NULL,
  task_kind  TEXT NOT NULL,                -- tx_explain | address_report | contract_summary
  tokens_in  INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  cache_hit  INTEGER NOT NULL DEFAULT 0 CHECK (cache_hit IN (0,1)),
  ok         INTEGER NOT NULL DEFAULT 1 CHECK (ok IN (0,1))
) STRICT;
CREATE INDEX idx_ai_usage_at   ON ai_usage(at DESC);
CREATE INDEX idx_ai_usage_slot ON ai_usage(slot, at DESC);

-- ============================================================================
-- 6 日志（仅存本机，不外传；Settings 提供一键清除）
-- ============================================================================

-- 用户行为日志 → 首页「最近查询」
CREATE TABLE query_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  at        INTEGER NOT NULL,
  chain_id  TEXT,
  kind      TEXT NOT NULL,                 -- address | tx | contract | block | search
  target    TEXT NOT NULL,
  hit_cache INTEGER NOT NULL DEFAULT 0 CHECK (hit_cache IN (0,1))
) STRICT;
CREATE INDEX idx_qlog_at ON query_log(at DESC);

-- [NEW] 出网与配额记账（设计文档 §11.6）
-- WARN endpoint 只允许记 path，绝不记 query string —— 后者可能含 ?api-key=
--      （设计文档 §11.2 的真实风险）。下面这条 CHECK 是兜底防线。
CREATE TABLE usage_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  at         INTEGER NOT NULL,
  provider   TEXT NOT NULL,
  endpoint   TEXT NOT NULL CHECK (endpoint NOT LIKE '%api-key%'
                              AND endpoint NOT LIKE '%apikey%'
                              AND endpoint NOT LIKE '%Authorization%'),
  status     INTEGER,
  credits    INTEGER NOT NULL DEFAULT 0,   -- Helius balances 每次 100 credits
  latency_ms INTEGER
) STRICT;
CREATE INDEX idx_ulog_at       ON usage_log(at DESC);
CREATE INDEX idx_ulog_provider ON usage_log(provider, at DESC);

-- ============================================================================
-- 7 虚表（虚表不能用 STRICT）
-- ============================================================================

-- 全文检索（FTS5 由 bundled SQLite 自带，已实测可用：libsqlite3-sys build.rs:129）
-- tokenize='trigram'：默认的 unicode61 不切分中文，中文检索会退化成整段匹配；
--                     trigram 对 CJK 与「地址中部子串」都有效，代价是索引更大。
CREATE VIRTUAL TABLE search_fts USING fts5(
  ref    UNINDEXED,                        -- 'protocol:uniswap-v2@eip155:1'
  kind   UNINDEXED,                        -- protocol | selector | label | token
  title,
  body,
  tokenize = 'trigram'
);

-- 地址行为指纹（256 位 bit 向量 + 汉明距离）。
-- 需要 sqlite-vec 扩展已静态链接并注册（设计文档 §4.3）。
-- NOTE 下面这条 DDL 与函数签名在实现时必须对 sqlite-vec 官方 API 参考逐条核对 ——
--      其文档首页明确写着 "sqlite-vec is pre-v1, so expect breaking changes"，
--      且 vec0 的 PARTITION KEY 写法未在本机验证过（本机没有 sqlite-vec）。
CREATE VIRTUAL TABLE addr_vec USING vec0(
  chain       TEXT PARTITION KEY,          -- 按链分区，避免跨链污染 KNN 结果
  fingerprint bit[256]
);

-- ============================================================================
-- 8 维护：清理与「清除数据」白名单
-- ============================================================================

-- 过期缓存（启动时 + 低频执行）
-- DELETE FROM cache WHERE fetched_at + ttl_secs < unixepoch();

-- 日志上限（各保留最近 5000 行）
-- DELETE FROM query_log WHERE id NOT IN (SELECT id FROM query_log ORDER BY at DESC LIMIT 5000);
-- DELETE FROM usage_log WHERE id NOT IN (SELECT id FROM usage_log ORDER BY at DESC LIMIT 5000);

-- AI 用量按自然月保留 3 个月（AI 页要展示「本月」）
-- DELETE FROM ai_usage WHERE at < unixepoch('now','-3 months');

-- 「清除缓存」按钮允许清除的表（写死在 Rust 里，前端传不了表名）
--   DELETE FROM cache;  DELETE FROM query_log;  DELETE FROM ai_report;  DELETE FROM usage_log;
-- 永不被触碰：
--   secret  label  chain  protocol  selector  token  addr_vec
--   ↑ secret 被清 = 用户三把密钥永久丢失（我们不留副本）

-- ============================================================================
-- 9 待定项（不影响本文件可执行性）
-- ============================================================================
-- (a) token 表是否在 P1 引入 —— 若砍掉，代币元数据改走 cache（key 如 'eip155:1:token:0xabc'）
-- (b) addr_vec 的 vec0 DDL 需对 sqlite-vec 官方参考逐条核对（见上）
-- (c) 是否需要更多 EVM 链 —— 只需往 chain 表加行 + resources/chains.json 加条目，不动 DDL
-- (d) 「我关注的地址」是否需要独立表 —— 当前用 label.watched 表达，够用