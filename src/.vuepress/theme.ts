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
  darkmode: "disable",
  favicon: "/favicon.png",
  logo: "/favicon.png",
  displayFooter: true,
  footer:
    '認識香港，從文獻開始。<br><a href="/privacy-policy.html">隱私政策</a> · <a href="/about.html">關於本站</a> · <a href="/contact.html">聯絡方式</a> · <a href="/sources-copyright-corrections.html">資料來源、版權與勘誤</a>',
  lastUpdated: false,
  contributors: false,
  breadcrumb: false,
  copyright: false,
  author: {
    name: "吳某",
    url: "https://www.pasthk.com",
  },
  markdown: {
    footnote: true,
    hint: true,
    preview: true,
    attrs: true,
    codeTabs: true,
    component: true,
    demo: true,
    figure: true,
    gfm: true,
    imgLazyload: true,
    imgSize: true,
    include: true,
    mark: true,
    plantuml: true,
    spoiler: true,
    stylize: [
      {
        matcher: "Recommended",
        replacer: ({ tag }) => {
          if (tag === "em") {
            return {
              tag: "Badge",
              attrs: { type: "tip" },
              content: "Recommended",
            };
          }
        },
      },
    ],
    sub: true,
    sup: true,
    tabs: true,
    tasklist: true,
    vPre: true,
  },
  plugins: {
    seo: {
      canonical: (page) => new URL(page.path, hostname).href,
      fallBackImage: `${hostname}/favicon.png`,
    },
    sitemap: true,
    icon: false,
    components: {
      components: ["Badge", "VPCard"],
    },
  },
}, { custom: true });
