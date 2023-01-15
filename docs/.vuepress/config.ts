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
    author: {
        name: "NG, Kin-chung",
        url: "https://pasthk.github.io",
      },
    footer: "",
    copyright: "北京大學考古文物學院考古系吳某",
    displayFooter: true,
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