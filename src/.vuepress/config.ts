import { fileURLToPath } from "node:url";
import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";
import { breadcrumbPlugin } from "./breadcrumb.js";
import { ogImagePlugin } from "./og/plugin.js";
import { llms } from "./llms.js";
import { robotsPlugin } from "./robots.js";
import { slimsearchDevWorkerPlugin } from "./slimsearch-dev-worker-plugin.js";
import theme from "./theme.js";

type AliasEntry = { find: string | RegExp; replacement: string };

// 以自訂元件覆寫主題的日期／閱讀時間資訊與麵包屑。
// 這些條目必須排在 alias 陣列最前面，才能蓋過主題註冊的 `@theme-hope` 前綴 alias。
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
  {
    find: /^@theme-hope\/components\/base\/BreadCrumb$/,
    replacement: fileURLToPath(
      new URL("./components/PageBreadCrumb.vue", import.meta.url),
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

      // slimsearch 的搜尋框執行期來自 @vuepress/search-helper，該套件在模組頂層
      // import 了一份 CSS。VuePress 只把「插件本身」放進 SSR 的 noExternal，
      // 未含其相依套件，於是渲染頁面時 Node 直接載入該模組，遇到 .css 便拋
      // ERR_UNKNOWN_FILE_EXTENSION。在此補上，讓 Vite 於 SSR 一併處理它。
      const noExternal = (config.ssr?.noExternal ?? []) as (string | RegExp)[];

      config.ssr ??= {};
      config.ssr.noExternal = [...noExternal, "@vuepress/search-helper"];

      // 開發模式的搜尋 worker。上游套件漏打包 dist/client/worker/dev.js，
      // 少了它搜尋框只會停在「搜尋中」，詳見 slimsearch-dev-worker-plugin.ts。
      config.plugins ??= [];
      config.plugins.push(slimsearchDevWorkerPlugin());
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
    llms,
    ogImagePlugin(),
    robotsPlugin(),
    breadcrumbPlugin(),
  ],
});
