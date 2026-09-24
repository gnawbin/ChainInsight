import { useMemo } from "react";

import { env } from "@/lib/env";
import {
  ALL_PROVIDERS,
  type ProviderKey,
  type ProviderState,
} from "@/components/layout/ProviderStatus";

export type AppStatus = Readonly<{
  providers: Readonly<Record<ProviderKey, ProviderState>>;
  /** 演示数据模式：读本地 fixture，不发任何网络请求，页面上要打横幅（§8.12）。 */
  demoMode: boolean;
}>;

/**
 * 应用级状态：三个数据源是否配好、是否处于演示模式。
 *
 * ⚠️ **这是一个占位实现，批次 2 会把它接到 `src/api/`。**
 * 现在它的行为是「假定全部未配置」—— 这不是偷懒，而是**当前唯一诚实的答案**：
 * 密钥存在 Rust 独占的 SQLite 里（§11.1），前端在 API 层就位之前无从查询。
 *
 * 用 `unknown` 还是 `missing`？这里选 `missing`：产品当前确实没有任何 Key，
 * 而 `unknown` 是给「已经问过后端、还没答复」用的中间态。等 API 层接上，
 * 首帧会短暂进入 `unknown` 再落定 —— 那时才不会闪。
 */
export function useAppStatus(): AppStatus {
  return useMemo(() => {
    const providers = Object.fromEntries(
      ALL_PROVIDERS.map((key) => [key, "missing" as ProviderState]),
    ) as Record<ProviderKey, ProviderState>;

    // 没有 Key ⇒ 必然是演示模式；开发时也可以显式打开。
    const demoMode = env.forceDemoMode || ALL_PROVIDERS.every((k) => providers[k] !== "configured");

    return { providers, demoMode };
  }, []);
}
