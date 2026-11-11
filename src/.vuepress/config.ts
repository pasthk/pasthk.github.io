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
