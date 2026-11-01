import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

const hostname = "https://www.pasthk.com";

export default hopeTheme({
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
    url: "https://www.pasthk.com",
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
        const { datePublished } = page.frontmatter as {
          datePublished?: string;
        };

        if (datePublished && "article:published_time" in ogp) {
          ogp["article:published_time"] = datePublished;
        }

        return ogp;
      },
      jsonLd: (jsonLd, page) => {
        const { datePublished, dateCreated } = page.frontmatter as {
          datePublished?: string;
          dateCreated?: string;
        };

        if (datePublished) jsonLd.datePublished = datePublished;
        if (dateCreated) jsonLd.dateCreated = dateCreated;

        return jsonLd;
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
}, { custom: true });
