#!/usr/bin/env node
/**
 * 红线扫描（设计文档 §9.2）。
 *
 * 对**源码 + 构建产物 + 依赖清单**做静态扫描，命中即失败。每一条规则对应
 * PRD §8.3 的一行「永久禁止功能」。
 *
 * 两条设计决定值得说明：
 *
 * 1. **扫描范围包含 `dist/`**，不只是源码。打包器会把 `node_modules` 内联进产物，
 *    只看 `src/` 会漏掉通过依赖链引入的能力。
 * 2. **`scripts/` 自己不在扫描范围内** —— 本文件必须写出这些正则才能工作。
 *    这是有意的排除，不是遗漏；代价是「往 scripts/ 里藏东西」不会被这条规则挡住，
 *    所以新增脚本要走 code review。
 *
 * 用法：
 *   node scripts/check-redlines.mjs            # 扫描
 *   node scripts/check-redlines.mjs --self-test # 用合成样本验证扫描器本身有效
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** 扫描目标目录：源码 + 构建产物。 */
const TARGET_DIRS = ["src", "src-tauri/src", "dist"];
/** 这些目录不扫：依赖、Rust 构建缓存、Tauri 生成的 Android 工程。 */
const SKIP_DIRS = new Set(["node_modules", "target", "gen", "build", ".git", "dist/assets"]);
/** 只看文本文件；不按扩展名判断会去读二进制。 */
const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".rs", ".json", ".css", ".html", ".sql", ".md",
]);

/**
 * 三个扫描目标集。
 *
 * ⚠️ `cargo` 这一组是**补上的**：初版只扫 npm 的 `package.json`，漏掉了 Rust 侧依赖。
 * 而 `Cargo.toml` 里确实躺过红线依赖（`ed25519-dalek` —— 本地私钥签名用它），
 * 且 cargo 不会因为依赖未被引用而报警，所以那个问题**只有编译或显式扫描才看得见**。
 */
const TARGET_SETS = {
  src: () => TARGET_DIRS.flatMap((dir) => walk(join(ROOT, dir))),
  pkg: () => existingFiles(["package.json"]),
  cargo: () => existingFiles(["src-tauri/Cargo.toml"]),
};

function existingFiles(relPaths) {
  return relPaths
    .map((p) => join(ROOT, p))
    .filter((p) => {
      try {
        return statSync(p).isFile();
      } catch {
        return false;
      }
    });
}

/**
 * 规则表。每条对应 PRD §8.3 的一行。
 *
 * `target`：`src` 表示扫描源码与构建产物，`pkg` 表示只扫 `package.json`。
 */
const RULES = [
  {
    id: "no-keypair-api",
    target: "src",
    why: "PRD §8.3-1：禁止私钥、助记词导入与存储",
    patterns: [/\bread_keypair\b/, /\bcreate_keypair\b/, /\bsign_message\b/],
  },
  {
    id: "no-mnemonic",
    target: "src",
    why: "PRD §8.3-1：禁止助记词/种子短语",
    patterns: [/\bmnemonic\b/i, /\bseed_?phrase\b/i, /\bSecretKey\b/],
  },
  {
    id: "no-wallet-deps",
    target: "pkg",
    why: "PRD §8.3-2：禁止钱包连接",
    patterns: [/wallet-adapter/i, /@solana\/kit-plugin-wallet/i, /@solana\/react/i],
  },
  {
    id: "no-signing-api",
    target: "src",
    why: "PRD §8.3-2：禁止交易签名与广播",
    patterns: [
      /\bsignTransaction\b/,
      /\bsignAndSendTransaction\b/,
      /\bsendTransaction\b/,
      /\bTransactionPartialSigner\b/,
    ],
  },
  {
    id: "no-solana-kit",
    target: "pkg",
    why: "PRD §8.3-2：只读产品不需要 Kit 客户端（它自带签名面）",
    patterns: [/"@solana\/kit"/, /"@solana-program\//],
  },
  {
    id: "no-telemetry",
    target: "src",
    why: "PRD §8.2：开发者不上传、不收集任何用户数据",
    patterns: [/sentry/i, /posthog/i, /mixpanel/i, /google-analytics/i, /amplitude/i],
  },
  {
    id: "no-rust-signing-deps",
    target: "cargo",
    why: "PRD §8.3-1/2：禁止私钥处理与签名。Rust 侧的签名实现库同样在红线内",
    patterns: [
      /ed25519-dalek/,
      /secp256k1/,
      /libsecp256k1/,
      /\bk256\b/,
      /solana-sdk/,
      /solana-keygen/,
      // 助记词/种子派生：PRD §8.3-1 明确禁止
      /bip39/,
      /bip32/,
      /slip10/,
    ],
  },
];

/**
 * 整行注释的判定。
 *
 * **为什么需要它**：规则要同时表达「代码里不许出现 X」和「文档里解释为什么删掉 X」。
 * 前一条是安全要求，后一条是可维护性要求，两者天然冲突 —— 实现这个脚本时被自己的
 * 注释绊倒了两次（`lib.rs` 与 `Cargo.toml`）。
 *
 * 判据只取**行首**的注释标记，不做行尾截断：
 * - 行首 `//` 在 Rust/TS 里必然是注释 —— 精确，不会误判
 * - 行尾截断（`// ` 之后全丢）会在字符串含 `https://` 时把同行的真命中一起丢掉，
 *   minified 的 `dist/` 产物更是一整行，后果更严重
 *
 * 代价：**行尾注释**（`let x = 1; // signTransaction`）仍会被命中。这属于「宁严」的一侧，
 * 可接受。
 */
const COMMENT_PREFIXES = {
  "//": [".rs", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
  "#": [".toml"],
  "--": [".sql"],
  "/*": [".css"],
};

function isCommentLine(line, ext) {
  const trimmed = line.trimStart();
  for (const [prefix, exts] of Object.entries(COMMENT_PREFIXES)) {
    if (exts.includes(ext) && trimmed.startsWith(prefix)) return true;
  }
  return false;
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // 目录不存在（例如还没 build 过，没有 dist/）
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full);
    if (SKIP_DIRS.has(entry) || SKIP_DIRS.has(rel)) continue;
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walk(full, out);
    else if (TEXT_EXT.has(extname(entry))) out.push(full);
  }
  return out;
}

function collectTargets() {
  return Object.fromEntries(
    Object.entries(TARGET_SETS).map(([key, collect]) => [key, collect()]),
  );
}

/** 返回命中列表：`{ ruleId, why, file, line, excerpt }`。 */
function scan(files, rules = RULES) {
  const hits = [];
  for (const rule of rules) {
    for (const file of files[rule.target] ?? []) {
      let content;
      try {
        content = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const ext = extname(file);
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        // 整行注释不参与匹配 —— 见 isCommentLine 的说明。
        if (isCommentLine(line, ext)) return;
        for (const pattern of rule.patterns) {
          if (pattern.test(line)) {
            hits.push({
              ruleId: rule.id,
              why: rule.why,
              file: relative(ROOT, file),
              line: index + 1,
              excerpt: line.trim().slice(0, 120),
            });
          }
        }
      });
    }
  }
  return hits;
}

// ── 自测：合成样本必须被检出、干净样本必须不误报 ────────────────────────────
if (process.argv.includes("--self-test")) {
  const shouldFire = [
    ["no-keypair-api", "const raw = await read_keypair(null);"],
    ["no-keypair-api", "await sign_message(bytes, undefined);"],
    ["no-mnemonic", "const mnemonic = wallet.mnemonic;"],
    ["no-signing-api", "await client.sendTransaction(tx);"],
    ["no-signing-api", "const s: TransactionPartialSigner = x;"],
    ["no-telemetry", "Sentry.init({ dsn });"],
  ];
  const shouldNotFire = [
    "const address = shortenAddress(id, 10);",
    "// 这里的注释只谈只读数据，不涉及任何被禁能力",
    "const balances = await fetchBalances(address);",
  ];
  /** 整行注释必须被跳过；行尾注释与普通代码不能。 */
  const commentLineCases = [
    ["// read_keypair was deleted", ".ts", true],
    ["//! sign_message belonged to keypair.rs", ".rs", true],
    ["# ed25519-dalek was removed", ".toml", true],
    ["-- DELETE FROM cache", ".sql", true],
    ["/* no signTransaction here */", ".css", true],
    ["const x = 1; // read_keypair", ".ts", false], // 行尾注释不跳（宁严）
    ["let a = 1;", ".ts", false],
    ['const u = "https://api.example.com";', ".ts", false], // 不能因字符串里的 // 而误跳
    ['ed25519-dalek = "2"', ".toml", false], // 未注释的依赖必须命中
  ];

  let failed = 0;
  for (const [ruleId, line] of shouldFire) {
    const rule = RULES.find((r) => r.id === ruleId);
    const hit = rule.patterns.some((p) => p.test(line));
    if (!hit) {
      console.error(`  [FAIL] 规则 ${ruleId} 漏检: ${line}`);
      failed += 1;
    }
  }
  for (const line of shouldNotFire) {
    const fired = RULES.some((r) => r.patterns.some((p) => p.test(line)));
    if (fired) {
      console.error(`  [FAIL] 误报: ${line}`);
      failed += 1;
    }
  }
  for (const [line, ext, expected] of commentLineCases) {
    if (isCommentLine(line, ext) !== expected) {
      console.error(
        `  [FAIL] isCommentLine 判定错: ${JSON.stringify(line)} (${ext}) 期望 ${expected}`,
      );
      failed += 1;
    }
  }
  const total = shouldFire.length + shouldNotFire.length + commentLineCases.length;
  console.log(
    failed === 0
      ? `自测通过：${total} 个样本（${shouldFire.length} 应检出 / ${shouldNotFire.length} 不应误报 / ${commentLineCases.length} 注释行判定）全部符合预期`
      : `自测失败：${failed}/${total}`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

// ── 正式扫描 ──────────────────────────────────────────────────────────────
const hits = scan(collectTargets());

if (hits.length === 0) {
  console.log("红线扫描通过：0 处命中");
  process.exit(0);
}

console.error(`红线扫描失败：${hits.length} 处命中\n`);
for (const hit of hits) {
  console.error(`  ${hit.file}:${hit.line}  [${hit.ruleId}]  ${hit.why}`);
  console.error(`      ${hit.excerpt}`);
}
process.exit(1);
