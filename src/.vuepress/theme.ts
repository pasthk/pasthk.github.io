import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

export default hopeTheme({
  hostname: "https://www.pasthk.com",
  darkmode: "disable",
  pure: true,
  author: {
    name: "康明",
  },
  docsDir: "src",
  navbar,
  sidebar,
  footer: "哈囉，考古學！",
  displayFooter: true,
  blog: {
    description: "一個挖土人。",
    intro: "/intro.html",
  },

  markdown: {
    footnote: true,
    imgLazyload: true,
  },

  plugins: {
    blog: true,
    
    components: {
      components: ["Badge", "VPCard"],
    },

    icon: {
      prefix: "fa6-solid:",
    },

  },
});
