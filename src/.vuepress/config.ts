import { fileURLToPath } from "node:url";
import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";
import { ogImagePlugin } from "./og/plugin.js";
import { llms } from "./llms.js";
import { robotsPlugin } from "./robots.js";
import theme from "./theme.js";
import { llmsPlugin } from "@vuepress/plugin-llms";

type AliasEntry = { find: string | RegExp; replacement: string };

// 以自訂元件覆寫主題的日期／閱讀時間資訊。
// 這兩個條目必須排在 alias 陣列最前面，才能蓋過主題註冊的 `@theme-hope` 前綴 alias。
const componentAlias: AliasEntry[] = [
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
];

export default defineUserConfig({
  base: "/",
  bundler: viteBundler({
    configureVite: (config) => {
      // VuePress 的 resolveAlias() 一律回傳 { find, replacement }[]，故直接展開。
      const existing = (config.resolve?.alias ?? []) as AliasEntry[];

      config.resolve ??= {};
      config.resolve.alias = [...componentAlias, ...existing];
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
  plugins: [
    llmsPlugin(
      {
        llmsTxt: true,
        llmsPageTxt: true,
      },
    ), 
    ogImagePlugin(), robotsPlugin()],
});
