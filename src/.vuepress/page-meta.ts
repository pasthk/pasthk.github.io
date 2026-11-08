import type { Page } from "vuepress/core";

import { HOSTNAME } from "./site.js";

/**
 * 頁面語義的單一來源。
 *
 * 本站有兩種頁面，而 @vuepress/plugin-seo 的預設把它們全當成 Article，
 * 並把 frontmatter.date（本站整理日，2026）填進 datePublished 與
 * article:published_time，等於對外宣稱 1897 年的報紙在 2026 年出版：
 *
 * - 史料頁：有 `datePublished`，值為原始報刊出版日 → Article。
 * - 索引／說明頁：只有 `date`（本站建檔日）→ WebPage，不得有出版日。
 *
 * theme.ts 的 seo.isArticle／ogp／jsonLd、llms.ts 的純文字版來源塊，
 * 都取用這裡的判斷，避免標準再次分歧。
 */

type Frontmatter = Record<string, unknown>;

/**
 * 接受完整日期與 ISO 8601 的降精度寫法。本站有 4 頁只考證到月／年
 * （`1909-02`、`1910`），不能因格式不齊把它們誤判成索引頁。
 */
const DATE_VALUE = /^\d{4}(?:-\d{2}(?:-\d{2})?)?(?:[T\s].*)?$/;

function asDate(value: unknown): string | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? undefined
      : value.toISOString().slice(0, 10);
  }

  if (typeof value !== "string") return undefined;

  const text = value.trim();

  return DATE_VALUE.test(text) ? text : undefined;
}

const frontmatterOf = (page: Page): Frontmatter =>
  page.frontmatter as Frontmatter;

/** 是否為「原始文獻轉錄頁」；唯一判準是 frontmatter 寫了原始出版日 */
export const isSourceDocument = (page: Page): boolean =>
  asDate(frontmatterOf(page).datePublished) !== undefined;

/** 原始文獻出版日；索引／說明頁回傳 undefined */
export const publishedDate = (page: Page): string | undefined =>
  asDate(frontmatterOf(page).datePublished);

/**
 * 本站建檔日。優先 dateCreated，其次 date。
 * 這個值只能進 dateCreated，不能進 datePublished。
 */
export const createdDate = (page: Page): string | undefined =>
  asDate(frontmatterOf(page).dateCreated) ?? asDate(frontmatterOf(page).date);

/** 頁面的正規網址，一律指向可供人閱讀與引用的 .html */
export const canonicalUrl = (page: Page): string =>
  new URL(page.path, HOSTNAME).href;

/** 由 Markdown 中的 <ReferenceBox> 取出標準引用字串 */
export const citationOf = (markdown: string): string | undefined => {
  const match = /<ReferenceBox>([\s\S]*?)<\/ReferenceBox>/u.exec(markdown);
  const text = match?.[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text || undefined;
};
