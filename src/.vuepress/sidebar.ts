import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "portfolio",
    {
      text: "Demo",
      prefix: "demo/",
      link: "demo/",
      children: "structure",
    },
    {
      text: "Docs",
      prefix: "guide/",
      children: "structure",
    },
    {
      text: "Slides",
      link: "https://ecosystem.vuejs.press/plugins/markdown/revealjs/demo.html",
    },
  ],
});
