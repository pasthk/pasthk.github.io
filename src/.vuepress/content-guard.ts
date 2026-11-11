import type { App, Plugin } from "vuepress/core";
import { warn } from "vuepress/utils";

import { pagePathOfLink } from "./breadcrumb.js";
import { linkEntries } from "./item-list.js";
import {
  isIndexablePage,
  isSourceDocument,
  pageDataExtras,
} from "./page-meta.js";
import { sidebarLinks } from "./sidebar.js";

/**
 * 建置期的收錄品質校驗（唯讀，不改動任何頁面）。
 *
 * 兩個會隨時間悄悄累積、且在成品裡看不出來的 SEO 問題：
 *
 * 1. **薄內容的索引頁**：可收錄、正文不足百字、又沒有站內史料連結的主題
 *    索引。這類頁通常是整理到一半的半成品，應補主題說明或設
 *    `sitemap: false`／`noindex`，而不是留在 sitemap。
 *    **只檢查本站整理頁**：史料轉錄本來就有數十字的新聞短訊，那是原件
 *    的長度而非內容不足，為它補說明反而違反「不加入個人評論」的原則。
 * 2. **自動摘要**：seo 外掛對沒有 frontmatter.description 的頁面，會從正文
 *    硬截 180 字當 meta description。史料頁是 OCR 轉錄，截斷處常在句中，
 *    甚至夾著標記；這種摘要會直接成為搜尋結果與分享卡的文案。此項對
 *    史料頁與整理頁都適用。
 * 3. **側邊欄死鏈**：sidebar.ts 手寫了數十個 .md 路徑，改檔名或刪頁時
 *    不會有任何編譯錯誤，只會在成品裡留下點不到的導覽。於建置期對照
 *    app.pages 一次點名。
 *
 * 三者都在建置日誌彙總點名一次，讓維護者按清單補齊，不製造逐頁雜訊。
 */

/** 去掉 Markdown 標記後的可見文字長度，標題列不計入正文 */
const visibleLength = (content: string): number => {
  const text = content
    .replace(/^---[\s\S]*?---/u, "")
    .replace(/^\s{0,3}#{1,6}\s.*$/gmu, "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/gu, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/[*_>`|]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

  return text.length;
};

/** 日誌最多列出幾個路徑，其餘以總數帶過 */
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
    // 先前每個連結都對 app.pages 做一次線性掃描；改成查表一次。
    const knownPaths = new Set(app.pages.map((item) => item.path));

    for (const page of app.pages) {
      if (!isIndexablePage(page)) continue;

      // seo 外掛在 onInitialized 寫入 page.data.autoDesc；主題插件先於
      // 使用者插件執行，這裡讀得到。
      if (pageDataExtras(page.data).autoDesc) {
        autoDesc.push(page.path);
      }

      if (isSourceDocument(page)) continue;

      const links = linkEntries(page).filter((entry) =>
        knownPaths.has(entry.path),
      ).length;

      if (visibleLength(page.content) < 100 && links < 2) {
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
