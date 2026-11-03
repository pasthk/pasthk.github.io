import { fileURLToPath } from "node:url";
import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";
import { breadcrumbPlugin } from "./breadcrumb.js";
import { ogImagePlugin } from "./og/plugin.js";
import { llms } from "./llms.js";
import { pageIndexPlugin } from "./page-index.js";
import { referenceBoxPlugin } from "./reference-box.js";
import { robotsPlugin } from "./robots.js";
import { SITE_NAME, SITE_TAGLINE } from "./site.js";
import { slimsearchDevWorkerPlugin } from "./slimsearch-dev-worker-plugin.js";
import { stripUnusedFonts } from "./strip-unused-fonts.js";
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

      // 主題的 _normalize.scss 會 @use fonts/crimson.css，該檔自帶一段 4.3KB 的
      // base64 @font-face；本站 --vp-font 為 serif，沒有任何元素使用 Crimson，
      // 這段資料卻跟著每次載入的 CSS 一起下載。此處在產出階段移除未被引用的字面，
      // 詳見 strip-unused-fonts.ts（有守衛：一旦有規則引用該字族就原樣保留）。
      config.plugins.push(stripUnusedFonts());
    },
  }),
  lang: "zh-Hant",
  title: SITE_NAME,
  description: `${SITE_TAGLINE}。`,
  head: [
    [
      "meta",
      {
        name: "google-adsense-account",
        content: "ca-pub-8975507583219124",
      },
    ],
    // 主題的建置模板（vuepress-theme-hope/templates/index.build.html）會在 hydration
    // 前無條件依 prefers-color-scheme 先設 data-theme="dark"，即使 darkmode: "disable"
    // （rc.110 要等 onMounted 才改回 light）。本站 palette 把 --vp-c-text 固定為 #000，
    // 深色偏好訪客在指令碼載入前會看到黑底黑字。此處在主題腳本之後、樣式表之前執行，
    // 直接把主題鎖定為淺色，同時省掉一次全頁重繪。
    ["script", {}, 'document.documentElement.dataset.theme="light";'],
  ],
  theme,
  plugins: [
    // 必須排在 breadcrumbPlugin 之前：breadcrumbTrails() 會快取整份頁面清單，
    // 索引頁晚於它建立就不會被算進導覽鏈。
    pageIndexPlugin(),
    llms,
    ogImagePlugin(),
    robotsPlugin(),
    breadcrumbPlugin(),
    referenceBoxPlugin(),
  ],
});
