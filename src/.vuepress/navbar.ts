import { navbar } from "vuepress-theme-hope";

export default navbar([
  {
    text: "閱讀說明",
    link: "/reading-notes.html",
  },
  {
    text: "本站資訊",
    link: "/about.html",
  },
  {
    text: "項目",
    children: ["/project/ay1928/"],
  },
]);