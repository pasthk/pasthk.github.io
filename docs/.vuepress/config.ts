import { defineUserConfig } from "vuepress";
import { hopeTheme } from "vuepress-theme-hope";
import { googleAnalyticsPlugin } from '@vuepress/plugin-google-analytics';
import { searchProPlugin } from "vuepress-plugin-search-pro";
import { registerComponentsPlugin } from '@vuepress/plugin-register-components'
import { getDirname, path } from '@vuepress/utils'
const __dirname = getDirname(import.meta.url)

export default defineUserConfig({
  base: "/",
  lang: "zh-TW",
  title: "追跡香江",
  description: "香港專題研究索引集",
  head:[
    [
      "script",
      {
        "data-ad-client": "ca-pub-8975507583219124",
        async: true,
        src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
      }
    ],
  ],
  plugins: [
    registerComponentsPlugin({
      components: {
        adsense: path.resolve(__dirname, './components/adsense.vue'),
      },
    }),
    googleAnalyticsPlugin({
      id: 'G-0FJ0KYS5QB',
    }),
    searchProPlugin({
      indexContent: true,
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
    copyright: "香港專題研究索引集",
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
        tabs: true,
      },
    },
  }),
});