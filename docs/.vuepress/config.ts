import { defineUserConfig } from "vuepress";
import theme from "./theme.js";

export default defineUserConfig({
  base: "/",
      lang: "zh-TW",
      title: "PastHK",
      description: "A document site for Hong Kong history research.",

  theme,

  shouldPrefetch: false,
});
