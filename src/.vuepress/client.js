import { defineClientConfig } from "vuepress/client";
import { defineSearchConfig } from "@vuepress/plugin-slimsearch/client";
import Layout from "./layouts/Layout.vue";
import ReferenceBox from "./components/ReferenceBox.vue";
import { splitQuery } from "./search-tokenize";

// 查詢端必須與索引端（theme.ts 的 indexOptions.tokenize）用同一套斷詞，
// 否則切出的詞與索引中的詞條對不上，中文查詢會落空。
// prefix 另開：單一漢字查詢（如「碑」）無法成對，靠前綴比對命中「碑記」「碑文」。
defineSearchConfig({
  prefix: true,
  querySplitter: splitQuery,
});

export default defineClientConfig({
  layouts: {
    Layout,
  },
  enhance: ({ app }) => {
    app.component("ReferenceBox", ReferenceBox);
  },
});
