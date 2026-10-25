import { fileURLToPath } from "node:url";
import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";
import theme from "./theme.js";

export default defineUserConfig({
  base: "/",
  bundler: viteBundler({
    configureVite: (config) => {
      const aliases = config.resolve?.alias;
      const existingAliases = Array.isArray(aliases)
        ? aliases
        : Object.entries(aliases ?? {}).map(([find, replacement]) => ({
            find,
            replacement,
          }));

      config.resolve ??= {};
      config.resolve.alias = [
        {
          find: /^@theme-hope\/components\/info\/DateInfo$/,
          replacement: fileURLToPath(
            new URL("./components/DateInfo.vue", import.meta.url),
          ),
        },
        {
          find: /^@theme-hope\/components\/info\/ReadingTimeInfo$/,
          replacement: fileURLToPath(
            new URL("./components/ReadingTimeInfo.vue", import.meta.url),
          ),
        },
        ...existingAliases,
      ];

      config.ssr ??= {};
      const noExternal = config.ssr.noExternal;
      config.ssr.noExternal =
        noExternal === true
          ? true
          : [
              ...(Array.isArray(noExternal)
                ? noExternal
                : noExternal
                  ? [noExternal]
                  : []),
              "@vuepress/search-helper",
            ];

      config.plugins ??= [];
      config.plugins.push({
        name: "fix-slimsearch-dev-worker-url",
        enforce: "pre",
        transform(code, id) {
          if (!id.includes("/@vuepress/plugin-slimsearch/dist/client/config.js")) {
            return;
          }

          return code.replace(
            /new URL\((["'`])worker\/dev\.js\1,\s*import\.meta\.url\)/g,
            'new URL("../worker/dev.js",import.meta.url)',
          );
        },
      });
    },
  }),
  lang: "zh-Hant",
  title: "香港文獻類編",
  description: "認識香港，從文獻開始。",
  head: [
    [
      "meta",
      {
        name: "google-adsense-account",
        content: "ca-pub-8975507583219124",
      },
    ],
  ],
  theme,
});