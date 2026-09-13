import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

export default hopeTheme({
  pure: true,
  darkmode: "disable",
  hostname: "https://www.pasthk.com",
  author: {
    name: "吳某",
    url: "https://www.pasthk.com",
  },
  docsDir: "src",
  navbar,
  sidebar,
  footer: "認識香港，從文獻開始。",
  displayFooter: true,
  lastUpdated: false,
  contributors: false,
  breadcrumb: false,
  markdown: {
    footnote: true,
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
    readingTime: false,
    sitemap: true,
    slimsearch: true,
    components: {
      components: ["Badge", "VPCard"],
    },
    icon: {
      prefix: "fa6-solid:",
    },
  },
});
