import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    {
      text: "考古",
      prefix: "archaeology/",
      children: "structure",
    },
  ],
});