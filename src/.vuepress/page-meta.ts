import type { Page } from "vuepress/core";

import {
  parseDateValue,
  splitCitation,
  stripFrontmatter,
} from "./format.js";
import { absoluteUrl } from "./site.js";


export type Frontmatter = Record<string, unknown>;

export interface RelatedItem {
  title: string;
  path: string;
  date?: string;
}

/** 以當前頁為中心的編年導覽：上方較早、中間當前、下方較晚 */
export interface RelatedTimeline {
  /** 較早的前兩頁，依日期由遠而近（顯示於當前頁上方） */
  before: RelatedItem[];
  /** 當前頁面 */
  current: RelatedItem;
  /** 較晚的後兩頁，依日期由近而遠（顯示於當前頁下方） */
  after: RelatedItem[];
}

export interface RelatedInfo {
  /** 相關度挑選結果，供 llms.txt 與 Markdown 匯出使用 */
  items: RelatedItem[];
  chapter?: string;
  /** 供 RelatedDocuments.vue 呈現的編年軸；舊資料可能沒有 */
  timeline?: RelatedTimeline;
}

export interface PageDataExtras {
  autoDesc?: boolean;
  git?: { updatedTime?: number };
  related?: RelatedInfo;
  adEligible?: boolean;
}

export const pageDataExtras = (data: unknown): PageDataExtras =>
  data as PageDataExtras;

export const visibleContentLength = (content: string): number => {
  const text = stripFrontmatter(content)
    .replace(/^\s{0,3}#{1,6}\s.*$/gmu, "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/gu, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/[*_>`|]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

  return text.length;
};

/** 頁面分類只依賴這幾個欄位，讓 Page、LLMPage、StatsInput 共用同一套判斷 */
export interface PageLike {
  path?: string;
  filePath?: string | null;
  frontmatter?: Record<string, unknown>;
  title?: string;
  content?: string;
}

/** 文獻綜覽虛擬頁：舊網址照常輸出，新網址為正式入口 */
export const LEGACY_INDEX_PATH = "/browse.html";
export const TIMELINE_PATH = "/timeline.html";

/** 是否為文獻綜覽索引頁（新舊網址皆算） */
export const isTimelineIndex = (page: PageLike): boolean =>
  page.path === LEGACY_INDEX_PATH || page.path === TIMELINE_PATH;

/** 由 Markdown 原始檔產生的頁面；虛擬頁（文獻綜覽）沒有 filePath */
export const isMarkdownPage = (page: PageLike): boolean =>
  Boolean(page.filePath?.endsWith(".md"));

/** 對外收錄與否：sitemap 可關閉，404 一律排除 */
export const isListedPage = (page: PageLike): boolean =>
  page.frontmatter?.sitemap !== false && page.path !== "/404.html";

const frontmatterOf = (page: Page): Frontmatter =>
  page.frontmatter as Frontmatter;

const asDate = (value: unknown): string | undefined =>
  parseDateValue(value)?.text;

export const isIndexablePage = (page: PageLike): boolean =>
  Boolean(page.title) && isListedPage(page) && !isTimelineIndex(page);

export const isSourceDocument = (page: Page): boolean =>
  asDate(frontmatterOf(page).datePublished) !== undefined;

export const publishedDate = (page: Page): string | undefined =>
  asDate(frontmatterOf(page).datePublished);

export const createdDate = (page: Page): string | undefined =>
  asDate(frontmatterOf(page).dateCreated) ?? asDate(frontmatterOf(page).date);

export const canonicalUrl = (page: Page): string => absoluteUrl(page.path);

export const pageTitleMap = (
  pages: readonly { path: string; title: string }[],
): Map<string, string> =>
  new Map(pages.map((page): [string, string] => [page.path, page.title]));

export const isLlmsPage = (page: PageLike): boolean =>
  isListedPage(page) &&
  page.frontmatter?.llmstxt !== false &&
  isMarkdownPage(page) &&
  stripFrontmatter(page.content ?? "").trim().length > 0;

/** 同一頁會被多個外掛讀取，長文本正則只跑一次 */
const visibleLengthCache = new WeakMap<object, number>();

export const visibleLengthOf = (page: PageLike): number => {
  const cached = visibleLengthCache.get(page as object);

  if (cached !== undefined) return cached;

  const length = visibleContentLength(page.content ?? "");

  visibleLengthCache.set(page as object, length);

  return length;
};

const REFERENCE_BOX = /<ReferenceBox>([\s\S]*?)<\/ReferenceBox>/u;

/* 全域版預先編譯：每頁轉出 .md 鏡像時不必再 new RegExp */
const REFERENCE_BOX_ALL = /<ReferenceBox>([\s\S]*?)<\/ReferenceBox>/gu;

export const replaceReferenceBoxes = (
  markdown: string,
  format: (inner: string) => string,
): string =>
  markdown.replace(REFERENCE_BOX_ALL, (_matched, inner: string) =>
    format(inner),
  );

export const citationOf = (markdown: string): string | undefined => {
  const text = REFERENCE_BOX.exec(markdown)?.[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text || undefined;
};

export interface SourceInfo {
  citation: string;
  publication?: string;
  pagination?: string;
}

export const sourceOf = (markdown: string): SourceInfo | undefined => {
  const citation = citationOf(markdown);

  if (!citation) return undefined;

  const text = splitCitation(citation)
    .source.replace(/[。.\s]+$/u, "")
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

/** 來源解析（含兩次全文正則）按頁快取，theme 與 page-index 共用同一結果 */
const sourceCache = new WeakMap<object, SourceInfo | undefined>();

export const sourceOfPage = (page: PageLike): SourceInfo | undefined => {
  const key = page as object;

  if (sourceCache.has(key)) return sourceCache.get(key);

  const source = sourceOf(page.content ?? "");

  sourceCache.set(key, source);

  return source;
};
