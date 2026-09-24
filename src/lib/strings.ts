/**
 * 用户可见文案的唯一落点。
 *
 * 两条约定：
 * 1. **品牌名只在这里出现一次** —— 改产品名不需要全库搜索替换。
 * 2. 代码与注释保持英文（仓库既有规范），**用户可见文案默认简体中文**。
 */

export const APP_NAME = "ChainInsight AI";

export const APP_TAGLINE = "ETH + Solana 双链只读 AI 链上浏览器";

/** 导航项。`to` 与 `src/App.tsx` 的路由表一一对应。 */
export const NAV = [
  { to: "/", label: "首页" },
  { to: "/search", label: "检索" },
  { to: "/settings", label: "设置" },
] as const;

/** 顶栏/首页的数据源状态条。 */
export const SOURCES = {
  helius: { label: "Helius", applyUrl: "https://dashboard.helius.dev", quota: "100 万积分/月" },
  etherscan: { label: "Etherscan", applyUrl: "https://etherscan.io/myapikey", quota: "10 万次/天" },
  ai: { label: "AI", applyUrl: "https://platform.deepseek.com", quota: "按量付费" },
} as const;

export const COPY = {
  /** 首次启动引导（§8.4）。这一页存在的唯一目的是消除「要注册吗」的误解。 */
  welcome: {
    title: `欢迎使用 ${APP_NAME}`,
    subtitle: "这是一个只读的链上数据浏览器",
    bullets: [
      "不需要注册，不需要登录",
      "不需要连接钱包，不需要助记词",
      "所有数据只存在你的电脑里",
    ],
    keyNote: "要开始查询链上数据，需要向数据源申请免费 API Key（那是 Helius / Etherscan 的账号，与本软件无关）",
    ctaPrimary: "配置 API Key",
    ctaDemo: "先用演示数据看看",
    ctaWhy: "了解为什么不收密钥",
  },

  /** 演示数据模式横幅 —— 不可关闭，且必须显眼（§8.12「不误导」）。 */
  demoBanner: "当前展示的是内置样本数据，非真实链上数据",

  /** 空壳状态（无密钥）。 */
  empty: {
    needKey: "需要先配置数据源 Key 才能查询真实链上数据",
    configure: "去配置",
    useDemo: "改用演示数据",
  },

  /** 帮助用户分清「API Key」和「登录」——这是首次使用最容易误解的一点。 */
  keyVsLogin: {
    title: "API Key 不等于登录",
    body: "Key 是你向数据源证明额度身份用的，存在本机、不会上传。你不需要注册本软件。",
  },
} as const;
