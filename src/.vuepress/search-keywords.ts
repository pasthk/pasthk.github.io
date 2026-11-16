import type { Page } from "vuepress/core";

import { chapterOfPath } from "./chapters.js";
import { publishedDate, sourceOfPage } from "./page-meta.js";

/**
 * 搜尋索引的自訂關鍵詞：章節、報刊、原始出版日與 description。
 * 標題、各級標題與整篇正文由 slimsearch 自行索引（indexContent 為 true），
 * 這裡只補上能提高排序權重的結構化欄位，不重複任何正文內容。
 */
export const searchKeywords = (page: Page): string[] => {
  const description = page.frontmatter.description;

  return [
    chapterOfPath(page.path),
    typeof description === "string" ? description.trim() : undefined,
    sourceOfPage(page)?.publication,
    publishedDate(page),
  ].filter((value): value is string => Boolean(value));
};
