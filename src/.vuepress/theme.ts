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
  locales: {
    "/": {
      blogLocales: {
        article: "文章",
        articleList: "文章列表",
        category: "分類",
        tag: "標籤",
        timeline: "時間軸",
        timelineTitle: "時間軸標題",
        all: "全部",
        intro: "個人介紹",
        star: "星標文章",
      },
      paginationLocales: {
        prev: "上一頁",
        next: "下一頁",
        navigate: "跳轉",
      },
      metaLocales: {
        author: "作者",
        date: "日期",
        origin: "原創",
        views: "訪問量",
        tag: "標籤",
        category: "分類",
        readingTime: "預計閱讀時間",
        words: "文章字數",
        toc: "此頁內容",
        prev: "上一頁",
        next: "下一頁",
        contributors: "貢獻者",
        editLink: "編輯此頁",
      },
      routeLocales: {
        skipToContent: "跳轉至主要內容",
        notFoundTitle: "肆零肆",
        home: "返回主頁",
        back: "返回上一頁",
      },
    },
  },
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
