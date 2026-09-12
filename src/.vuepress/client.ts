import { defineClientConfig } from "vuepress/client";
import AdTop from "./components/AdTop.vue";

export default defineClientConfig({
  enhance({ app }) {
    app.component("AdTop", AdTop);
  },
});
