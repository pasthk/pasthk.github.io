import { defineUserConfig } from "vuepress";
import theme from "./theme.js";
export default defineUserConfig({
  head: [
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    [
      "link",
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    ],
    [
      "link",
      {
        href: "https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@500..900&display=swap",
        rel: "stylesheet",
      },
    ],    
  ],
  base: "/",
  lang: "zh-TW",
  title: "香港考古春秋",
  description: "追跡香江　鑒古知今",
  theme,
});