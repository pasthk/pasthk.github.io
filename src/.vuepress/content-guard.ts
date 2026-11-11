import type { App, Plugin } from "vuepress/core";
import { warn } from "vuepress/utils";

import { pagePathOfLink } from "./breadcrumb.js";
import { linkEntries } from "./item-list.js";
import {
  isIndexablePage,
  isSourceDocument,
  pageDataExtras,
  visibleContentLength,
} from "./page-meta.js";
import { sidebarLinks } from "./sidebar.js";


const MAX_SAMPLES = 12;

const sample = (paths: string[]): string =>
  paths.length > MAX_SAMPLES
    ? `${paths.slice(0, MAX_SAMPLES).join("、")} 等 ${paths.length} 頁`
    : paths.join("、");

export const contentGuardPlugin = (): Plugin => ({
  name: "content-guard",

  onInitialized(app: App): void {
    const thin: string[] = [];
    const autoDesc: string[] = [];
    const knownPaths = new Set(app.pages.map((item) => item.path));

    for (const page of app.pages) {
      if (!isIndexablePage(page)) continue;

      if (pageDataExtras(page.data).autoDesc) {
        autoDesc.push(page.path);
      }

      if (isSourceDocument(page)) continue;

      const links = linkEntries(page).filter((entry) =>
        knownPaths.has(entry.path),
      ).length;

      if (visibleContentLength(page.content) < 100 && links < 2) {
        thin.push(page.path);
      }
    }

    if (thin.length) {
      warn(
        `有 ${thin.length} 個可收錄的索引／說明頁正文不足 100 字且沒有史料連結：${sample(thin)}。` +
          `建議補上主題說明，或改設 sitemap: false／noindex，避免薄內容進入 sitemap。`,
      );
    }

    if (autoDesc.length) {
      warn(
        `有 ${autoDesc.length} 個可收錄頁面沒有人工 description，目前使用正文自動截取的摘要：${sample(autoDesc)}。` +
          `史料為 OCR 轉錄，建議補寫 frontmatter.description 以改善搜尋結果摘要。`,
      );
    }

    const deadLinks = [
      ...new Set(sidebarLinks().map(pagePathOfLink)),
    ].filter((path) => !knownPaths.has(path));

    if (deadLinks.length) {
      warn(
        `側邊欄有 ${deadLinks.length} 個連結找不到對應頁面：${sample(deadLinks)}。` +
          `請更新 sidebar.ts 或補回來源檔，避免導覽與麵包屑出現死鏈。`,
      );
    }
  },
});
