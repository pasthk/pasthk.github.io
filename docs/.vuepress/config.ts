import { defineUserConfig } from "vuepress";
import { hopeTheme } from "vuepress-theme-hope";

export default defineUserConfig({
  base: "/",
  lang: "zh-TW",
  title: "追跡香江",
  description: "香港歷史研究索引集",
  theme: hopeTheme({
    hostname: "https://pasthk.github.io",
    darkmode: "disable",
    themeColor: false,
    fullscreen: false,
    pageInfo: false,
    contributors: false,
    footer: "",
    copyright: "香港歷史研究索引集",
    displayFooter: true,
    author: {
        name: "NG, Kin-chung",
        url: "https://pasthk.github.io",
      },
    navbar: [
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