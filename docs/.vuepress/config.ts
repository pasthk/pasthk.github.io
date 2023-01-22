import { defineUserConfig } from "vuepress";
import { hopeTheme } from "vuepress-theme-hope";
import { googleAnalyticsPlugin } from '@vuepress/plugin-google-analytics'

export default defineUserConfig({
  base: "/",
  lang: "zh-TW",
  title: "追跡香江",
  description: "香港人文與科學研究索引集",
  head:[
    [
      "script",
      {
        "data-ad-client": "ca-pub-8975507583219124",
        async: true,
        src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
      }
    ],
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },],
    ["link", { href: "https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400&display=swap", rel: "stylesheet", },],
  ],
  plugins: [
    googleAnalyticsPlugin({
      id: 'G-0FJ0KYS5QB',
    }),
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