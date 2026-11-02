import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const require = createRequire(import.meta.url);

/** 上游套件在開發模式預期存在、但實際未打包的 worker 檔案。 */
const UPSTREAM_WORKER = "dist/client/worker/dev.js";

/**
 * 修補 slimsearch 在開發模式下缺少 worker 的問題。
 *
 * `@vuepress/plugin-slimsearch@2.0.0-rc.137` 的客戶端設定以
 * `new URL("worker/dev.js", import.meta.url)` 指向
 * `dist/client/worker/dev.js`，但官方 tarball 內沒有這個檔案（rc.136 調整
 * 輸出結構時漏打包，rc.130 及以前放在 `dist/worker/dev.js`）。開發伺服器對
 * 該路徑查無檔案，退回 SPA 的 index.html，Worker 載入 HTML 後即失敗；客戶端
 * 只把錯誤印成 console 警告而不 reject，搜尋框因此永遠停在「搜尋中」。
 *
 * 這裡在開發伺服器最前面攔下該請求，改寫成同專案內的替代實作
 * （`slimsearch-dev-worker.js`），讓 Vite 正常轉譯它。正式建置不受影響。
 *
 * 僅在上游檔案確實不存在時才介入，上游補上後本外掛自動失效。
 */
export function slimsearchDevWorkerPlugin(): Plugin {
  const shim = fileURLToPath(
    new URL("./slimsearch-dev-worker.js", import.meta.url),
  );

  return {
    name: "local:slimsearch-dev-worker",
    apply: "serve",
    configureServer(server) {
      const upstream = (() => {
        try {
          return resolve(
            dirname(require.resolve("@vuepress/plugin-slimsearch/package.json")),
            UPSTREAM_WORKER,
          );
        } catch {
          return null;
        }
      })();

      if (upstream && existsSync(upstream)) return;

      server.middlewares.use((req, _res, next) => {
        const path = req.url?.split("?")[0] ?? "";

        if (path.endsWith(`/plugin-slimsearch/${UPSTREAM_WORKER}`)) {
          req.url = `/@fs/${shim}`;
        }

        next();
      });
    },
  };
}
