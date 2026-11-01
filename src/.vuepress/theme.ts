import type { App, Page } from "vuepress/core";
import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";
import { ogImageUrl } from "./og/paths.js";

const hostname = "https://www.pasthk.com";

const ORGANIZATION_ID = `${hostname}/#organization`;
const WEBSITE_ID = `${hostname}/#website`;
const PERSON_ID = `${hostname}/#person`;

// 三個全站共用的實體。每頁都輸出，讓任一頁被單獨抓取時仍是完整的實體圖譜。
const organization = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "香港文獻類編",
  alternateName: "Hong Kong Documents",
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

/** 由頁面路徑組出麵包屑；父層頁面不存在時略過該層，避免產生無效連結 */
function buildBreadcrumb(page: Page, app: App) {
  const url = new URL(page.path, hostname).href;
  const items = [{ name: "首頁", item: `${hostname}/` }];

  if (page.path !== "/") {
    const segments = page.path.split("/").filter(Boolean);

    if (segments.length >= 3) {
      const parentPath = `/${segments.slice(0, -1).join("/")}.html`;
      const parent = app.pages.find((candidate) => candidate.path === parentPath);

      if (parent) {
        items.push({
          name: parent.title,
          item: new URL(parent.path, hostname).href,
        });
      }
    }

    items.push({ name: page.title, item: url });
  }

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
    breadcrumb: false,
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
      seo: {
        canonical: (page) => new URL(page.path, hostname).href,
        fallBackImage: `${hostname}/favicon.png`,
        ogp: (ogp, page) => {
          // 每頁都有對應的 1200×630 卡片，社群預覽與 Google 文章 rich result 共用同一張圖。
          const image = ogImageUrl(hostname, page.path);

          ogp["og:image"] = image;
          ogp["og:image:type"] = "image/svg+xml";
          ogp["og:image:width"] = "1200";
          ogp["og:image:height"] = "630";
          ogp["og:image:alt"] = page.title;
          ogp["twitter:card"] = "summary_large_image";
          ogp["twitter:image:src"] = image;
          ogp["twitter:image:alt"] = page.title;

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

          // @context 只保留在 @graph 根層，節點內不重複。
          delete main["@context"];

          if (datePublished) main.datePublished = datePublished;
          if (dateCreated) main.dateCreated = dateCreated;

          return {
            "@context": "https://schema.org",
            "@graph": [
              main,
              buildBreadcrumb(page, app),
              organization,
              person,
              website,
            ],
          } as unknown as typeof jsonLd;
        },
      },
      sitemap: true,
      icon: false,
      // 外掛會為沒有 README 的目錄自動生成「目錄頁」，內容單薄、標題為英文目錄名，
      // 且全站沒有連結指向它們，故關閉以免產生孤兒頁。
      catalog: false,
      // 全站沒有 Markdown 圖片，關閉圖片預覽以移除 photoswipe chunk（約 58 KB）
      photoSwipe: false,
      components: {
        components: ["Badge", "VPCard"],
      },
    },
  },
  { custom: true },
);
