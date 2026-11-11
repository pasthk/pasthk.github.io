import { fileURLToPath } from "node:url";
import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";
import { adEligibilityPlugin } from "./ad-eligibility.js";
import { breadcrumbPlugin } from "./breadcrumb.js";
import { chaptersGuardPlugin } from "./chapters.js";
import { contentGuardPlugin } from "./content-guard.js";
import {
  dropUnusedStyles,
  verifyDroppedStyles,
} from "./drop-unused-styles.js";
import { ogImagePlugin } from "./og/plugin.js";
import { outputCleanupPlugin } from "./output-cleanup.js";
import { llms } from "./llms.js";
import { llmsCanonicalPlugin } from "./llms-canonical.js";
import { pageIndexPlugin } from "./page-index.js";
import { referenceBoxPlugin } from "./reference-box.js";
import { relatedDocumentsPlugin } from "./related-documents.js";
import { SITE_NAME, SITE_TAGLINE } from "./site.js";
import { slimsearchDevWorkerPlugin } from "./slimsearch-dev-worker-plugin.js";
import { stripUnusedFonts } from "./strip-unused-fonts.js";
import theme from "./theme.js";

type AliasEntry = { find: string | RegExp; replacement: string };

// 以自訂元件覆寫主題的日期／閱讀時間資訊與麵包屑。
// 這些條目必須排在 alias 陣列最前面，才能蓋過主題註冊的 `@theme-hope` 前綴 alias。
// 只需登記「主題模組路徑 → 本地檔名」，alias 與檔案 URL 由同一份對照表產生。
const COMPONENT_OVERRIDES: [string, string][] = [
  ["info/DateInfo", "DateInfo.vue"],
  ["info/ReadingTimeInfo", "ReadingTimeInfo.vue"],
  ["base/BreadCrumb", "PageBreadCrumb.vue"],
];

const componentAlias: AliasEntry[] = COMPONENT_OVERRIDES.map(
  ([module, file]) => ({
    find: new RegExp(`^@theme-hope/components/${module}$`),
    replacement: fileURLToPath(
      new URL(`./components/${file}`, import.meta.url),
    ),
  }),
);

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

      // 主題會把 home／blog 版型等從未使用的樣式一併打進共同 CSS，
      // 這裡在建置期從源頭移除；守衛與驗證見 drop-unused-styles.ts。
      config.plugins.push(dropUnusedStyles());
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
    // llmstxt.org v2 建議的雙向可發現性：HTML 用 describedby 指向全站索引，
    // 索引裡的各頁再用 alternate type="text/markdown" 指回純文字鏡像（見 llms-canonical.ts）。
    // Google 不使用 llms.txt，這裡只是給其他 LLM 服務的探索入口，不影響 SEO。
    [
      "link",
      { rel: "describedby", type: "text/markdown", href: "/llms.txt" },
    ],
    // 主題的建置模板（vuepress-theme-hope/templates/index.build.html）會在 hydration
    // 前無條件依 prefers-color-scheme 先設 data-theme="dark"，即使 darkmode: "disable"
    // （rc.110 要等 onMounted 才改回 light）。本站 palette 把 --vp-c-text 固定為 #000，
    // 深色偏好訪客在指令碼載入前會看到黑底黑字。此處在主題腳本之後、樣式表之前執行，
    // 直接把主題鎖定為淺色，同時省掉一次全頁重繪。
    ["script", {}, 'document.documentElement.dataset.theme="light";'],
    // AdSense 審核爬蟲不會捲動頁面，廣告程式碼必須出現在 HTML 原始碼中。
    // 腳本採 async 且不在此處 push({})；實際請求由 AdTop.vue 於掛載時送出，
    // 讓爬蟲在固定視窗下也能看到廣告單元已發出請求。
    // 順序置於淺色鎖定指令碼之後，避免樣式表先套用造成深色偏好訪客的閃屏。
    // 廣告位的 .ad-* 樣式已併入 styles/index.scss（隨主樣式表一起快取），
    // 此處不再掛第二張 render-blocking 樣式表，詳見該檔末尾說明。
    [
      "script",
      {
        async: true,
        crossorigin: "anonymous",
        src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8975507583219124",
      },
    ],
  ],
  theme,
  plugins: [
    // 兩項只讀校驗：章節定義與 src 頂層目錄不一致、以及可收錄頁面的
    // 薄內容／自動摘要。都在 onInitialized 彙總點名，不改動任何頁面。
    chaptersGuardPlugin(),
    contentGuardPlugin(),
    // 必須排在 breadcrumbPlugin 之前：breadcrumbTrails() 會快取整份頁面清單，
    // 索引頁晚於它建立就不會被算進導覽鏈。
    pageIndexPlugin(),
    // 必須排在 llms 之前：relatedMarkdown() 在 onGenerated 讀取這份對照表，
    // 讓 .md 純文字鏡像也有與 HTML 相同的相關文獻連結。
    relatedDocumentsPlugin(),
    llms,
    // 必須排在 llms 之後：等它寫完 .md 與 llms-full.txt 才改寫 frontmatter 的 url
    llmsCanonicalPlugin(),
    ogImagePlugin(),
    // 主題的 sitemap／seo 外掛已寫完 XML 與 robots.txt，這裡統一清理輸出檔。
    outputCleanupPlugin(),
    breadcrumbPlugin(),
    referenceBoxPlugin(),
    // 必須排在 pageIndexPlugin 之後：onInitialized 要看到動態建立的頁面，
    // 才能逐頁算出是否達投放廣告的內容門檻。
    adEligibilityPlugin(),
    // 最後檢查：確認被剝除的樣式沒有任何輸出頁面仍在使用。
    verifyDroppedStyles(),
  ],
});
