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
        ...existingAliases,
      ];
    },
  }),
  lang: "zh-Hant",
  title: "香港文獻類編",
  description: "認識香港，從文獻開始。",
  head: [
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.cn" }],
    [
      "link",
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.cn",
        crossorigin: "anonymous",
      },
    ],
    [
      "link",
      {
        rel: "preload",
        as: "style",
        href: "https://fonts.googleapis.cn/css2?family=Noto+Serif+TC:wght@400&display=swap",
        onload: "this.onload=null;this.rel='stylesheet'",
        onerror:
          "this.onerror=null;this.href='https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400&display=swap'",
      },
    ],
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