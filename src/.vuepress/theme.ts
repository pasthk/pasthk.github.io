import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

export default hopeTheme({
  pure: true,
  darkmode: "disable",
  hostname: "https://www.pasthk.com",
  author: {
    name: "NG KIN CHUNG",
    url: "https://www.pasthk.com",
  },
  logo: "https://theme-hope-assets.vuejs.press/logo.svg",
  docsDir: "src",
  navbar,
  sidebar,
  footer: "Default footer",
  displayFooter: true,
  encrypt: {
    config: {
      "/demo/encrypt.html": {
        hint: "Password: 1234",
        password: "1234",
      },
    },
  },
  metaLocales: {
    editLink: "Edit this page on GitHub",
  },

  markdown: {
    align: true,
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
        // oxlint-disable-next-line typescript/consistent-return
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
    components: {
      components: ["Badge", "VPCard"],
    },

    icon: {
      prefix: "fa6-solid:",
    },
  },
});
