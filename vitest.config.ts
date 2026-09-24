import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Vitest 配置。
 *
 * 与 `vite.config.ts` 的关键差异：这里**不加** `server` 与 `clearScreen` 那套
 * Tauri 开发服务器设置 —— 测试不需要端口，也不该继承「端口被占用就失败」的行为。
 *
 * `environment: "jsdom"` 是必需的：批次 2 会加「页面冒烟测试」（逐个渲染 13 条路由
 * 并断言不崩），那需要 DOM。纯逻辑测试（链识别、hash）在 jsdom 下照样能跑
 * —— vitest 的 jsdom 环境里 `node:crypto` 仍然可用。
 */
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // 与 vite.config.ts 保持一致；两边都用 import.meta.url 定位，避免依赖 cwd。
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    // 不开启 globals：测试文件显式从 "vitest" 导入 describe/it/expect，
    // 省掉往 tsconfig 里塞 types 的麻烦，也让依赖来源一眼可见。
    globals: false,
  },
});
