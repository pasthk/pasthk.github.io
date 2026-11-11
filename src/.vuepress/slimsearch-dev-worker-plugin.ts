import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const require = createRequire(import.meta.url);

const UPSTREAM_WORKER = "dist/client/worker/dev.js";

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
