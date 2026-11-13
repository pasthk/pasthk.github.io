import { navbar } from "vuepress-theme-hope";

import { TIMELINE_PATH } from "./page-meta.js";

export default navbar([
  {
    text: "閱讀說明",
    link: "/reading-notes.html",
  },
  {
    text: "其他項目",
    children: ["/project/ay1928/"],
  },
  {
    text: "文獻綜覽",
    link: TIMELINE_PATH,
  },
]);
