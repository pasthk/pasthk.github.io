import { fileURLToPath } from "node:url";
import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";

import { breadcrumbPlugin } from "./breadcrumb.js";
import { cleanupPlugin } from "./build/cleanup.js";
import {
  dropUnusedStylesPlugin,
  verifyDroppedStylesPlugin,
} from "./build/drop-styles.js";
import { stripUnusedFontsPlugin } from "./build/fonts.js";
import { slimPageDataPlugin } from "./build/page-data.js";
import { checksPlugin } from "./checks.js";
import { timelinePlugin } from "./timeline.js";
import { llms } from "./llms/index.js";
import { llmsCanonicalPlugin } from "./llms/markdown.js";
import { ogImagePlugin } from "./og/plugin.js";
import { pageIndexPlugin } from "./page-index.js";
import { pfBlocksPlugin } from "./pf-blocks.js";
import { referenceBoxPlugin } from "./reference-box.js";
import { robotsMetaPlugin } from "./seo/crawl.js";
import { relatedDocumentsPlugin } from "./related-documents.js";
import { slimsearchDevWorkerPlugin } from "./search/dev-worker.js";
import { searchIndexPlugin } from "./search/index.js";
import { SITE_NAME, SITE_TAGLINE } from "./site.js";
import theme from "./theme.js";

type AliasEntry = { find: string | RegExp; replacement: string };

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

/**
 * Vue 執行期單獨成塊。
 *
 * app.js 內含全部頁面 chunk 的依賴表（routes 的 mapDeps），任何一頁新增或改動
 * 都會讓它的檔名變更。若不拆包，回訪讀者每次遇到內容更新都要重新下載整個
 * app.js（約 116 KB gzip）；拆出 Vue 後只有實際變動的那一塊需要重下。
 *
 * 只挑選「每個頁面都必然載入」的核心套件，其餘依賴仍由 Vite 按需分割，
 * 避免把主題的動態元件（部落格、圖表等）拉進首屏。
 */
const VUE_VENDOR = /[\\/]node_modules[\\/](?:vue|vue-router|@vue)[\\/]/u;

const splitVueVendor = (
  id: string,
): string | undefined => (VUE_VENDOR.test(id) ? "vue" : undefined);

export default defineUserConfig({
  base: "/",
  shouldPrefetch: false,
  pagePatterns: ["**/*.md", "!.vuepress"],
  bundler: viteBundler({
    configureVite: (config, isServer) => {
      const existing = (config.resolve?.alias ?? []) as AliasEntry[];

      config.resolve ??= {};
      config.resolve.alias = [...componentAlias, ...existing];

      const noExternal = (config.ssr?.noExternal ?? []) as (string | RegExp)[];

      config.ssr ??= {};
      config.ssr.noExternal = [...noExternal, "@vuepress/search-helper"];

      /* SSR 產物是單一 bundle，不需要（也不應該）手動分塊 */
      if (!isServer) {
        config.build ??= {};
        config.build.rollupOptions ??= {};

        const { rollupOptions } = config.build;
        const outputs = Array.isArray(rollupOptions.output)
          ? rollupOptions.output
          : [rollupOptions.output ?? {}];

        for (const output of outputs) output.manualChunks = splitVueVendor;

        rollupOptions.output = Array.isArray(rollupOptions.output)
          ? outputs
          : outputs[0];
      }

      config.plugins ??= [];
      config.plugins.push(slimsearchDevWorkerPlugin());

      /* JSON-LD 與 git 只供建置期使用，客戶端 chunk 不必內嵌 */
      if (!isServer) config.plugins.push(slimPageDataPlugin());

      config.plugins.push(stripUnusedFontsPlugin());

      config.plugins.push(dropUnusedStylesPlugin());
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
    [
      "link",
      { rel: "describedby", type: "text/markdown", href: "/llms.txt" },
    ],
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
    timelinePlugin(),
    pageIndexPlugin(),
    relatedDocumentsPlugin(),
    llms,
    llmsCanonicalPlugin(),
    ogImagePlugin(),
    cleanupPlugin(),
    searchIndexPlugin(),
    breadcrumbPlugin(),
    referenceBoxPlugin(),
    pfBlocksPlugin(),
    robotsMetaPlugin(),
    checksPlugin(),
    verifyDroppedStylesPlugin(),
  ],
});
