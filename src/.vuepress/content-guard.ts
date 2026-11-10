import type { App, Page, Plugin } from "vuepress/core";
import { warn } from "vuepress/utils";

import { linkEntries } from "./item-list.js";
import { isSourceDocument } from "./page-meta.js";

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
 *
 * 兩者都在建置日誌彙總點名一次，讓維護者按清單補齊，不製造逐頁雜訊。
 */

/** 可收錄且需要人工維護內容的頁面 */
const isIndexable = (page: Page): boolean =>
  Boolean(page.title) &&
  page.frontmatter.sitemap !== false &&
  page.path !== "/404.html" &&
  page.path !== "/browse.html";

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

    for (const page of app.pages) {
      if (!isIndexable(page)) continue;

      // seo 外掛在 onInitialized 寫入 page.data.autoDesc；主題插件先於
      // 使用者插件執行，這裡讀得到。
      if ((page.data as unknown as { autoDesc?: boolean }).autoDesc) {
        autoDesc.push(page.path);
      }

      if (isSourceDocument(page)) continue;

      const links = linkEntries(page).filter((entry) =>
        app.pages.some((item) => item.path === entry.path),
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
  },
});
