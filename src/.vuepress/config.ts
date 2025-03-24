import { defineUserConfig } from "vuepress";
import theme from "./theme.js";
export default defineUserConfig({
  head: [
    ["script",
      {
        "data-ad-client": "ca-pub-8975507583219124",
        async: true,
        src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
      }
    ],
    ["link", { rel: "preconnect", href: "https://fonts.proxy.ustclug.org" }],
    [
      "link",
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    ],
    [
      "link",
      {
        href: "https://fonts.proxy.ustclug.org/css2?family=Noto+Serif+TC&display=swap",
        rel: "stylesheet",
      },
    ], 
  ],
  base: "/",
  lang: "zh-TW",
  title: "香江源流考鏡",
  description: "從考古認識香港",
  theme, 
});