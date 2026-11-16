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
import { chroniclesPlugin } from "./chronicles.js";
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
  shouldPrefetch: false,
  pagePatterns: ["**/*.md", "!.vuepress", "!.vuepress/dist/**"],
  bundler: viteBundler({
    configureVite: (config) => {
      const existing = (config.resolve?.alias ?? []) as AliasEntry[];

      config.resolve ??= {};
      config.resolve.alias = [...componentAlias, ...existing];

      const noExternal = (config.ssr?.noExternal ?? []) as (string | RegExp)[];

      config.ssr ??= {};
      config.ssr.noExternal = [...noExternal, "@vuepress/search-helper"];

      config.plugins ??= [];
      config.plugins.push(slimsearchDevWorkerPlugin());

      config.plugins.push(stripUnusedFonts());

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
    [
      "link",
      { rel: "describedby", type: "text/markdown", href: "/llms.txt" },
    ],
    ["script", {}, 'document.documentElement.dataset.theme="light";'],
    [
      "script",
      {},
      // 全文索引較大，但 worker 只在「開啟搜尋」時才建立，不下載就不佔首屏。
      // 預載分兩層：頁面空閒時低優先預載（讓首次搜尋幾乎零等待），
      // 以及 hover / focus / touch / 快捷鍵等「即將搜尋」訊號立即補載。
      // 2G 與省流量模式完全不預載，只在真正開啟搜尋時才下載。
      '(function(){var d=!1,c=navigator.connection,' +
        'eType=c&&c.effectiveType||"",' +
        'slow=!!(c&&(c.saveData||/^(slow-)?2g$/.test(eType))),' +
        'fast=!c||!/^(2g|3g)$/.test(eType),' +
        'w=function(){if(d||slow)return;d=!0;' +
        'var l=document.createElement("link");l.rel="prefetch";' +
        'l.href="/slimsearch.worker.js";document.head.appendChild(l)},' +
        'h=function(e){var t=e.target;t&&t.closest&&t.closest(".vp-search-button")&&w()},' +
        'idle=function(){if(!fast)return;' +
        'try{if(sessionStorage.getItem("pasthk-sw"))return;' +
        'sessionStorage.setItem("pasthk-sw","1")}catch(e){}' +
        'if("requestIdleCallback" in window)' +
        'requestIdleCallback(w,{timeout:5000});else setTimeout(w,3000)};' +
        'addEventListener("pointerover",h,{passive:!0,capture:!0});' +
        'addEventListener("focusin",h,{passive:!0,capture:!0});' +
        'addEventListener("touchstart",h,{passive:!0,capture:!0});' +
        'addEventListener("keydown",function(e){' +
        '(e.ctrlKey||e.metaKey)&&(e.key==="k"||e.key==="/")&&w()},' +
        '{passive:!0,capture:!0});' +
        'if(document.readyState==="complete")idle();' +
        'else addEventListener("load",idle,{once:!0})})();',
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
    chaptersGuardPlugin(),
    contentGuardPlugin(),
    chroniclesPlugin(),
    pageIndexPlugin(),
    relatedDocumentsPlugin(),
    llms,
    llmsCanonicalPlugin(),
    ogImagePlugin(),
    outputCleanupPlugin(),
    breadcrumbPlugin(),
    referenceBoxPlugin(),
    adEligibilityPlugin(),
    verifyDroppedStyles(),
  ],
});
