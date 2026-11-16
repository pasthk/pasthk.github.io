import { posix } from "node:path";
import type { Page } from "vuepress/core";

import {
  normalizeSpace,
  parseDateValue,
  splitCitation,
  splitCitationParts,
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

interface PageDataExtras {
  autoDesc?: boolean;
  git?: { updatedTime?: number };
  related?: RelatedInfo;
  adEligible?: boolean;
}

export const pageDataExtras = (data: unknown): PageDataExtras =>
  data as PageDataExtras;

const visibleContentLength = (content: string): number => {
  const text = normalizeSpace(
    stripFrontmatter(content)
      .replace(/^\s{0,3}#{1,6}\s.*$/gmu, "")
      .replace(/<[^>]+>/gu, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/gu, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
      .replace(/[*_>`|]/gu, ""),
  );

  return text.length;
};

/** 頁面分類只依賴這幾個欄位，讓 Page、LLMPage、StatsInput 共用同一套判斷 */
interface PageLike {
  path?: string;
  filePath?: string | null;
  frontmatter?: Record<string, unknown>;
  title?: string;
  content?: string;
}

/** 舊網址：不再產生內容頁，由 redirect 外掛靜態導向正式入口 */
export const LEGACY_INDEX_PATH = "/browse.html";
/** 文獻綜覽虛擬頁的正式網址 */
export const TIMELINE_PATH = "/timeline.html";

/** 是否為文獻綜覽索引頁 */
export const isTimelineIndex = (page: PageLike): boolean =>
  page.path === TIMELINE_PATH;

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

/* ---- 頁面內容解析：連結抽取 ---- */

/** Markdown 行內連結：`[標籤](目標 "可選標題")` */
const LINK = /\[([^\]]+)\]\(([^)\s]+?)(?:\s+"[^"]*")?\)/gu;

export interface PageLink {
  path: string;
  label: string;
}

/** 把正文連結正規化為頁面路徑；外部連結、錨點與非 .md／.html 目標一律略過 */
const toPagePath = (href: string, pagePath: string): string | undefined => {
  const [raw] = href.split("#");

  if (!raw || /^[a-z][a-z\d+.-]*:/iu.test(raw)) return undefined;
  if (raw.startsWith("//")) return undefined;

  const ext = raw.endsWith(".md")
    ? ".md"
    : raw.endsWith(".html")
      ? ".html"
      : undefined;

  if (!ext) return undefined;

  const normalized = `${raw.slice(0, -ext.length)}.html`;

  return normalized.startsWith("/")
    ? posix.normalize(normalized)
    : posix.normalize(posix.resolve(posix.dirname(pagePath), normalized));
};

const linkCache = new WeakMap<object, PageLink[]>();

/**
 * 頁面正文中指向其他頁面的連結（去重、保持出現順序）。
 * 集合頁的 ItemList、薄內容判斷與死鏈檢查共用同一份結果。
 */
export const linkEntries = (page: PageLike): PageLink[] => {
  const key = page as object;
  const cached = linkCache.get(key);

  if (cached) return cached;

  const pagePath = page.path ?? "/";
  const found: PageLink[] = [];
  const seen = new Set<string>([pagePath]);

  for (const match of (page.content ?? "").matchAll(LINK)) {
    const [, label, href] = match;
    const path = toPagePath(href, pagePath);

    if (!path || seen.has(path)) continue;

    seen.add(path);
    found.push({ path, label: normalizeSpace(label) });
  }

  linkCache.set(key, found);

  return found;
};

/* ---- 頁面內容解析：引用框 ---- */

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

/** 取出第一個引用框的純文字（僅本模組內部使用：摘要與來源解析共用） */
const citationOf = (markdown: string): string | undefined => {
  const text = normalizeSpace(
    REFERENCE_BOX.exec(markdown)?.[1].replace(/<[^>]+>/g, " ") ?? "",
  );

  return text || undefined;
};

/**
 * 引用字串的短摘要（`報刊 · 日期 · 版次`），供 OG 卡片第二行使用。
 * 只有一段時回 undefined，讓卡片改用其他來源（篇數、出版日、description）。
 */
export const citationSummary = (markdown: string): string | undefined => {
  const text = citationOf(markdown);

  if (!text) return undefined;

  const parts = splitCitationParts(text.replace(/。\s*$/u, ""));

  return parts.length > 1 ? parts.join(" · ") : undefined;
};

interface SourceInfo {
  citation: string;
  publication?: string;
  pagination?: string;
}

const sourceOf = (markdown: string): SourceInfo | undefined => {
  const citation = citationOf(markdown);

  if (!citation) return undefined;

  const text = splitCitation(citation)
    .source.replace(/[。.\s]+$/u, "")
    .trim();

  const parts = splitCitationParts(text);

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
