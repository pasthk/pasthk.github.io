import { success } from "vuepress/utils";
import type { App, Plugin } from "vuepress/core";

import {
  isIndexablePage,
  pageDataExtras,
  visibleLengthOf,
} from "./page-meta.js";

const MIN_AD_CONTENT_CHARS = 150;

export const adEligibilityPlugin = (): Plugin => ({
  name: "ad-eligibility",

  onInitialized(app: App): void {
    let eligible = 0;

    for (const page of app.pages) {
      const allowed =
        isIndexablePage(page) &&
        page.frontmatter.index !== false &&
        visibleLengthOf(page) >= MIN_AD_CONTENT_CHARS;

      pageDataExtras(page.data).adEligible = allowed;
      if (allowed) eligible += 1;
    }

    success(
      `廣告投放範圍：${eligible}/${app.pages.length} 頁（可見正文 ≥ ${MIN_AD_CONTENT_CHARS} 字且非 404／空殼／導覽頁）`,
    );
  },
});
