import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

export default hopeTheme({
  docsDir: "src",
  hostname: "https://www.pasthk.com",
  navbar,
  sidebar,
  pure: true,
  darkmode: "disable",
  favicon: "/favicon.png",
  logo: "/favicon.png",
  displayFooter: true,
  footer: "認識香港，從文獻開始。",
  lastUpdated: true,
  contributors: false,
  breadcrumb: false,
  author: {
    name: "吳某",
    url: "https://www.pasthk.com",
  },
  markdown: {
    footnote: true,
    hint: true,
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
    sitemap: true,
    icon: false,
    slimsearch: {
      indexContent: true,
    },
    components: {
      components: ["Badge", "VPCard"],
    },
  },
});
