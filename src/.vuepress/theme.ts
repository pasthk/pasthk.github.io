import type { App, Page } from "vuepress/core";
import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";
import { breadcrumbTrails } from "./breadcrumb.js";
import { ogImageUrl } from "./og/paths.js";
import { tokenizeForIndex } from "./search-tokenize.js";

const hostname = "https://www.pasthk.com";

const ORGANIZATION_ID = `${hostname}/#organization`;
const WEBSITE_ID = `${hostname}/#website`;
const PERSON_ID = `${hostname}/#person`;

const organization = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "香港文獻類編",
  alternateName: "Thematic Compilation of Hong Kong Archives",
  url: hostname,
  logo: {
    "@type": "ImageObject",
    url: `${hostname}/favicon.png`,
    width: 268,
    height: 268,
  },
  email: "pasthk@outlook.com",
  sameAs: ["https://github.com/pasthk/pasthk.github.io"],
};

const person = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: "NG, KIN CHUNG",
  url: `${hostname}/about.html`,
  email: "pasthk@outlook.com",
};

const website = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: `${hostname}/`,
  name: "香港文獻類編",
  inLanguage: "zh-Hant",
  publisher: { "@id": ORGANIZATION_ID },
};

/**
 * 由 breadcrumb.ts 的導覽鏈產生結構化資料，與頁面上看到的麵包屑同源，
 * 不再另外按 URL 層級推算。
 *
 * 只取有實際頁面的層級：側邊欄分組（如「自然環境」「熱帶氣旋」）沒有對應網址，
 * 而 Google 對 BreadcrumbList 的 `item`（網址）只在最後一項放寬，
 * 中間項缺 `item` 會判為缺必要屬性，故僅保留可連結的層級，最後補上當前頁。
 */
function buildBreadcrumb(page: Page, url: string, app: App) {
  // 首頁自身即是路徑起點；404 等無標題頁無從命名。兩者都不該輸出 BreadcrumbList，
  // 否則只會得到僅一項、或「首頁 > 首頁」的無效標記。
  if (page.path === "/" || !page.title) return null;

  const trail = breadcrumbTrails(app).get(page.path) ?? [];

  const items = [
    { name: "首頁", item: `${hostname}/` },
    ...trail
      .filter((entry) => entry.link && entry.link !== "/")
      .map((entry) => ({
        name: entry.text,
        item: new URL(entry.link as string, hostname).href,
      })),
    { name: page.title, item: url },
  ];

  return {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: items.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  };
}

export default hopeTheme(
  {
    docsDir: "src",
    hostname,
    navbar,
    sidebar,
    pure: true,
    focus: false,
    darkmode: "disable",
    favicon: "/favicon.png",
    displayFooter: true,
    footer:
      '認識香港，從文獻開始。<br><a href="/support.html">支持本站</a>',
    lastUpdated: false,
    contributors: false,
    pageInfo: ["Date", "ReadingTime"],
    breadcrumb: true,
    copyright: false,
    author: {
      name: "NG, KIN CHUNG",
      url: `${hostname}/about.html`,
    },
    markdown: {
      footnote: true,
      attrs: true,
      component: true,
      gfm: true,
      mark: true,
    },
    plugins: {
      // 全文檢索。主題內建支援 @vuepress/plugin-slimsearch，此處的選項會原樣
      // 透傳給插件，並由主題補上 indexContent: true（連正文一併索引，而非只有
      // 標題與摘要）。
      slimsearch: {
        // 插件預設用 Intl.Segmenter 斷詞，但 ICU 對中文的切分不穩定且常拆成單字，
        // 精確度極差（實測「丁屋」命中 61 頁、「徙置區」36 頁，多數只含其中一字）。
        // 改用自訂的二元切分，查詢端見 client.js 的 defineSearchConfig。
        indexOptions: { tokenize: tokenizeForIndex },
        // 本站正文量大，索引於首次搜尋時才下載解析；延遲略高於預設值，
        // 讓使用者輸入完整詞組後才觸發，避免連續查詢互相打斷。
        searchDelay: 200,
        // 預設只有 Ctrl 組合鍵；補上 macOS 的 Command 組合鍵。
        hotKeys: [
          { key: "k", ctrl: true },
          { key: "k", meta: true },
          { key: "/", ctrl: true },
        ],
        // 插件內建的介面文案只涵蓋 zh／zh-CN／zh-Hans，本站 lang 為 zh-Hant，
        // 未覆寫會混用簡體用語，故整組改寫。
        locales: {
          "/": {
            placeholder: "搜尋文獻內容",
            search: "搜尋",
            cancel: "取消",
            clear: "清除搜尋內容",
            remove: "移除記錄",
            searching: "搜尋中",
            defaultTitle: "文獻",
            select: "選擇",
            navigate: "切換",
            autocomplete: "自動補全",
            exit: "關閉",
            queryHistory: "搜尋記錄",
            resultHistory: "結果記錄",
            emptyHistory: "暫無搜尋記錄",
            emptyResult: "找不到相符內容",
            loading: "正在載入搜尋索引",
          },
        },
      },
      seo: {
        canonical: (page) => new URL(page.path, hostname).href,
        fallBackImage: `${hostname}/favicon.png`,
        ogp: (ogp, page) => {
          const image = ogImageUrl(hostname, page.path);
          const alt = page.path === "/" ? "香港文獻類編" : page.title;

          Object.assign(ogp, {
            "og:image": image,
            "og:image:type": "image/png",
            "og:image:width": "1200",
            "og:image:height": "630",
            "og:image:alt": alt,
            "twitter:card": "summary_large_image",
            "twitter:image:src": image,
            "twitter:image:alt": alt,
          });

          const { datePublished } = page.frontmatter as {
            datePublished?: string;
          };

          if (datePublished && "article:published_time" in ogp) {
            ogp["article:published_time"] = datePublished;
          }

          return ogp;
        },
        jsonLd: (jsonLd, page, app) => {
          const { datePublished, dateCreated } = page.frontmatter as {
            datePublished?: string;
            dateCreated?: string;
          };
          const url = new URL(page.path, hostname).href;

          const main = {
            ...jsonLd,
            "@id": `${url}#article`,
            url,
            inLanguage: "zh-Hant",
            isPartOf: { "@id": WEBSITE_ID },
            publisher: { "@id": ORGANIZATION_ID },
            author: { "@id": PERSON_ID },
            image: [ogImageUrl(hostname, page.path)],
          } as Record<string, unknown>;

          delete main["@context"];

          if (datePublished) main.datePublished = datePublished;
          if (dateCreated) main.dateCreated = dateCreated;

          const breadcrumb = buildBreadcrumb(page, url, app);

          return {
            "@context": "https://schema.org",
            "@graph": [
              main,
              ...(breadcrumb ? [breadcrumb] : []),
              organization,
              person,
              website,
            ],
          } as unknown as typeof jsonLd;
        },
      },
      sitemap: true,
      icon: false,
      catalog: false,
      photoSwipe: false,
      components: {
        components: ["Badge", "VPCard"],
      },
    },
  },
  { custom: true },
);
