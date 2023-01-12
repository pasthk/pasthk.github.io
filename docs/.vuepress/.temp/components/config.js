import { defineClientConfig } from "@vuepress/client";
import { hasGlobalComponent } from "/Users/ngkinchung/Documents/GitHub/pasthk.github.io/node_modules/vuepress-plugin-components/lib/client/shared.js";
import { h } from "vue";

import Badge from "/Users/ngkinchung/Documents/GitHub/pasthk.github.io/node_modules/vuepress-plugin-components/lib/client/components/Badge.js";
import FontIcon from "/Users/ngkinchung/Documents/GitHub/pasthk.github.io/node_modules/vuepress-plugin-components/lib/client/components/FontIcon.js";
import BackToTop from "/Users/ngkinchung/Documents/GitHub/pasthk.github.io/node_modules/vuepress-plugin-components/lib/client/components/BackToTop.js";


import "/Users/ngkinchung/Documents/GitHub/pasthk.github.io/node_modules/vuepress-plugin-components/lib/client/styles/sr-only.scss";

export default defineClientConfig({
  enhance: ({ app }) => {
    if(!hasGlobalComponent("Badge")) app.component("Badge", Badge);
    if(!hasGlobalComponent("FontIcon")) app.component("FontIcon", FontIcon);
    
  },
  setup: () => {
    
  },
  rootComponents: [
    () => h(BackToTop, { threshold: 300 }),
    
  ],
});
