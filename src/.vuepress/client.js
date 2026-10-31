import { defineClientConfig } from "vuepress/client";
import Layout from "./layouts/Layout.vue";
import ReferenceBox from "./components/ReferenceBox.vue";

export default defineClientConfig({
  layouts: {
    Layout,
  },
  enhance: ({ app }) => {
    app.component("ReferenceBox", ReferenceBox);
  },
});
