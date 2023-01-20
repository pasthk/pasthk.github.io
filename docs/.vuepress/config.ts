import { defineUserConfig } from "vuepress";
import { hopeTheme } from "vuepress-theme-hope";

export default defineUserConfig({
  base: "/",
  lang: "zh-TW",
  title: "追跡香江",
  description: "香港人文與科學研究索引集",
  head:[
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },],
    ["link", { href: "https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400&display=swap", rel: "stylesheet", },],
  ],
  theme: hopeTheme({
    hostname: "https://pasthk.github.io",
    darkmode: "disable",
    themeColor: false,
    fullscreen: false,
    pageInfo: false,
    contributors: false,
    lastUpdated: false,
    footer: "",
    copyright: "香港人文與科學研究索引集",
    displayFooter: true,
    author: {
        name: "NG, Kin-chung",
        url: "https://pasthk.github.io",
      },
    navbar: [
      {
        text: "資料庫",
        link: "/database/",
      }, 
      {
        text: "關於",
        link: "/about.md",
      }, 
    ],
      plugins: {
        mdEnhance: {
                  footnote: true,
                  imgLazyload: true,
                  sup: true,
                  sub: true,
                  mark: true,
                  container: true,
                },
      },
  }),
});