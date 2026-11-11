import type { Page } from "vuepress/core";

import { absoluteUrl } from "./site.js";

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

export type Frontmatter = Record<string, unknown>;

/**
 * 各外掛寫進 `page.data` 的自訂欄位。
 * 先前每個讀取點各自寫 `as unknown as {...}`，欄位口徑容易漂移；
 * 集中在此，並用 pageDataExtras() 統一取用。
 */
export interface PageDataExtras {
  /** seo 外掛：description 是否由正文自動截取 */
  autoDesc?: boolean;
  /** git 外掛：最後修改時間（epoch 毫秒） */
  git?: { updatedTime?: number };
  /** related-documents 外掛：相關文獻導覽 */
  related?: unknown;
}

export const pageDataExtras = (data: unknown): PageDataExtras =>
  data as PageDataExtras;

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

/**
 * 可收錄、且需要人工維護內容的頁面：排除 404、動態建立的 browse.html、
 * `sitemap: false` 的空殼頁，以及沒有標題的頁面。
 *
 * page-index／content-guard／related-documents 先前各寫一份同義判斷，
 * 條件一旦增減就會各自漂移，集中在此。site-stats 與 llms-canonical 的
 * 用途不同（前者統計史料篇數、後者必須與 llms 外掛的 filter 完全一致），
 * 刻意保留自己的條件，不套用這裡的規則。
 */
export const isIndexablePage = (page: Page): boolean =>
  Boolean(page.title) &&
  page.frontmatter.sitemap !== false &&
  page.path !== "/404.html" &&
  page.path !== "/browse.html";

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
export const canonicalUrl = (page: Page): string => absoluteUrl(page.path);

/**
 * <ReferenceBox> 配對的唯一正則來源。
 * 史料引用會同時進 JSON-LD、OG 卡與 .md 純文字鏡像，三處共用避免規則漂移。
 */
const REFERENCE_BOX = /<ReferenceBox>([\s\S]*?)<\/ReferenceBox>/u;

/** 逐塊改寫 <ReferenceBox>；llms.ts 用它把引用框轉成純文字引用行 */
export const replaceReferenceBoxes = (
  markdown: string,
  format: (inner: string) => string,
): string =>
  markdown.replace(
    new RegExp(REFERENCE_BOX.source, "gu"),
    (_matched, inner: string) => format(inner),
  );

/** 取出第一塊 <ReferenceBox> 的純文字，壓平標記與空白 */
export const referenceBoxText = (markdown: string): string | undefined => {
  const text = REFERENCE_BOX.exec(markdown)?.[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text || undefined;
};

/** 由 Markdown 中的 <ReferenceBox> 取出標準引用字串 */
export const citationOf = (markdown: string): string | undefined =>
  referenceBoxText(markdown);

export interface SourceInfo {
  /** 正規化後的完整引用字串，維持可直接複製的形式 */
  citation: string;
  /** 報刊／期刊名；書目式出處無法可靠切分時從缺 */
  publication?: string;
  /** 版次、張次、頁碼等其餘段落 */
  pagination?: string;
}

/**
 * 由引用字串拆出「報刊名／日期／版次」，供 JSON-LD 建立 isBasedOn 實體。
 *
 * 史料頁的引用有兩種格式：報刊式「華僑日報，1962年8月29日，第3張第1頁。」，
 * 以及書目式「文獻出處：……（香港：……，1909年2月）。後者首段是書名而非
 * 報刊，且可能內含逗號；用括號與長度判別後直接略過，不猜錯來源類型。
 */
export const sourceOf = (markdown: string): SourceInfo | undefined => {
  const citation = citationOf(markdown);

  if (!citation) return undefined;

  const text = citation
    .replace(/^文獻出處[：:]\s*/u, "")
    .split(/按[：:]/u)[0]
    .replace(/[。.\s]+$/u, "")
    .trim();

  const parts = text
    .split(/[，,]/u)
    .map((part) => part.trim())
    .filter(Boolean);

  const publication = parts[0]
    ?.replace(/^[「『"《]|["」』》]$/gu, "")
    .trim();

  if (
    !publication ||
    !parts[1] ||
    publication.length > 30 ||
    /[（(：:]/u.test(publication)
  ) {
    return { citation };
  }

  return {
    citation,
    publication,
    ...(parts.length > 2 ? { pagination: parts.slice(2).join("，") } : {}),
  };
};
