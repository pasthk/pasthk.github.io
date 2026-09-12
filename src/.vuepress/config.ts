import { defineUserConfig } from "vuepress";
import theme from "./theme.js";

export default defineUserConfig({
  base: "/",
  lang: "zh-Hant",
  title: "香港文獻類編",
  description: "認識香港，從文獻開始。",

  theme,

  // Enable it with pwa
  // shouldPrefetch: false,
});
