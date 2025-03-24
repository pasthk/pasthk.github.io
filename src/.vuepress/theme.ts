import { hopeTheme } from "vuepress-theme-hope";
import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

export default hopeTheme({
  hostname: "https://www.pasthk.com",
  darkmode: "disable",
  pure: true,
  focus: true,
  logo: "/logo.svg",
  favicon: "/logo.svg",
  pageInfo: ["Date", "Category", "Tag"],
  contributors: false,
  editLink: false,
  lastUpdated: false,
  copyright: false,
  print: false,
  author: {
    name: "康明",
  },
  docsDir: "src",
  navbar,
  sidebar,
  footer: "哈囉，考古學！",
  displayFooter: true,
 // 插件設定 
  plugins: {
    blog: {
      excerpt: true,
      excerptLength: 300,
      excerptSeparator: "更多內容",
    },
    slimsearch: {
      indexContent: true,
    },
  },
 // 博客設定 
  blog: {
    name: "康明",
    description: "一個挖土人，考古學在讀博士生。",
    avatar: "/avatar.svg",
  },
 // Markdown設定 
  markdown: {
    footnote: true,
    imgLazyload: true,
  },
});
