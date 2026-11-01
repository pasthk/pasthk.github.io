import type { App, Page } from "vuepress/core";
import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";
import { ogImageUrl } from "./og/paths.js";

const hostname = "https://www.pasthk.com";

const ORGANIZATION_ID = `${hostname}/#organization`;
const WEBSITE_ID = `${hostname}/#website`;
const PERSON_ID = `${hostname}/#person`;

const organization = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "香港文獻類編",
  alternateName: "Hong Kong Documentation Project",
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
          const image = ogImageUrl(hostname, page.path);

          // SeoContent 是 union 且沒有索引簽名，og:image:type／width／height／alt
          // 這些標準 OG 標籤不在型別裡，twitter:* 也只存在於其中一個成員上，
          // 直接寫成 ogp["…"] = … 會被 TypeScript 判為不存在（TS7053／TS2551）。
          // 外掛輸出時是逐項遍歷，任何鍵都會被寫成 meta，故改用 Object.assign 附加。
          Object.assign(ogp, {
            "og:image": image,
            "og:image:type": "image/svg+xml",
            "og:image:width": "1200",
            "og:image:height": "630",
            "og:image:alt": page.title,
            "twitter:card": "summary_large_image",
            "twitter:image:src": image,
            "twitter:image:alt": page.title,
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
      catalog: false,
      photoSwipe: false,
      components: {
        components: ["Badge", "VPCard"],
      },
    },
  },
  { custom: true },
);
