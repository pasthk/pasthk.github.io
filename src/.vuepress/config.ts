import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  lang: "zh-Hant",
  title: "香港新聞類編",
  description: "認識香港，從歷史文化開始。",

  theme,

  // Enable it with pwa
  // shouldPrefetch: false,
});
