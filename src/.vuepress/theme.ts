import type { App, Page } from "vuepress/core";
import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";
import { breadcrumbTrails } from "./breadcrumb.js";
import { socialTags } from "./og/meta.js";
import { ogImageUrl } from "./og/paths.js";
import {
  canonicalUrl,
  citationOf,
  createdDate,
  isSourceDocument,
  publishedDate,
} from "./page-meta.js";
import { tokenizeForIndex } from "./search-tokenize.js";
import { sitemapModifiedTime } from "./sitemap.js";
import {
  HOSTNAME,
  SITE_NAME,
  SITE_NAME_EN,
  SITE_TAGLINE,
} from "./site.js";

/** 站台網址，集中定義於 site.ts */
const hostname = HOSTNAME;

const ORGANIZATION_ID = `${hostname}/#organization`;
const WEBSITE_ID = `${hostname}/#website`;
const PERSON_ID = `${hostname}/#person`;

const organization = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE_NAME,
  alternateName: SITE_NAME_EN,
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
  name: SITE_NAME,
  inLanguage: "zh-Hant",
  publisher: { "@id": ORGANIZATION_ID },
};

/**
 * 頁面對應的分享卡網址。
 *
 * 空殼頁（`sitemap: false`）不生成專屬卡片（見 og/plugin.ts 的過濾），
 * 若仍按路徑組出網址，og:image 與 JSON-LD 的 image 都會指向不存在的檔案，
 * 社群平台抓到 404 就等於沒有預覽圖。這類頁面改指向首頁那張通用卡。
 */
const cardUrl = (page: Page): string =>
  page.frontmatter.sitemap === false
    ? ogImageUrl(hostname, "/")
    : ogImageUrl(hostname, page.path);

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
    // 側邊欄分組在 SSR 階段不輸出子項（見 page-index.ts 的說明），
    // 頁尾的「全部文獻」是全站唯一能走到所有頁面的入口。
    footer:
      `${SITE_TAGLINE}。<br><a href="/about.html">關於本站</a> ・ <a href="/support.html">支持本站</a>`,
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

        /**
         * 外掛預設把「有來源檔且非 home」的頁面全當 Article，並以
         * frontmatter.date（本站整理日）填 datePublished。這裡改成只有
         * 真正轉錄原始文獻的頁面才是 Article；索引／說明頁改為 WebPage，
         * 外掛就不會再產生任何 article:* 出版日標籤。
         */
        isArticle: isSourceDocument,

        ogp: (ogp, page) => {
          const image = cardUrl(page);
          const alt = page.path === "/" ? SITE_NAME : page.title;

          Object.assign(ogp, socialTags(image, alt));

          const published = publishedDate(page);

          if (published) {
            ogp["article:published_time"] = published;
          } else {
            // 外掛無條件輸出 article:author／article:tag／article:modified_time，
            // 但 og:type 已是 website；留著只會讓分享解析器讀到矛盾資訊。
            for (const key of Object.keys(ogp)) {
              if (key.startsWith("article:")) delete ogp[key];
            }
          }

          return ogp;
        },
        jsonLd: (jsonLd, page, app) => {
          const article = isSourceDocument(page);
          const url = canonicalUrl(page);
          const published = publishedDate(page);
          const created = createdDate(page);
          const citation = article ? citationOf(page.content) : undefined;

          const main = {
            ...jsonLd,
            "@type": article ? "Article" : "WebPage",
            "@id": `${url}#${article ? "article" : "webpage"}`,
            url,
            inLanguage: "zh-Hant",
            isPartOf: { "@id": WEBSITE_ID },
            publisher: { "@id": ORGANIZATION_ID },
            author: { "@id": PERSON_ID },
            image: [cardUrl(page)],
          } as Record<string, unknown>;

          delete main["@context"];
          // 外掛以 date（本站整理日）填的 datePublished 一律丟棄，
          // 只回填真正的原始出版日與本站建檔日。
          delete main.datePublished;
          delete main.dateCreated;

          if (published) main.datePublished = published;
          if (created) main.dateCreated = created;
          // 史料頁把可直接複製的引用字串也放進結構化資料，供檢索器驗證出處。
          if (citation) main.citation = citation;

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
      sitemap: {
        // 只輸出可驗證的重大內容更新日；無值時讓外掛省略 lastmod。
        modifyTimeGetter: sitemapModifiedTime,
      },
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
