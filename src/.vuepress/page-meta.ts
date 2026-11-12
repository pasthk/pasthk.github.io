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

const frontmatterOf = (page: Page): Frontmatter =>
  page.frontmatter as Frontmatter;

const asDate = (value: unknown): string | undefined =>
  parseDateValue(value)?.text;

export const isIndexablePage = (page: Page): boolean =>
  Boolean(page.title) &&
  page.frontmatter.sitemap !== false &&
  page.path !== "/404.html" &&
  page.path !== "/browse.html";

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

export const isLlmsPage = (page: {
  filePath?: string | null;
  frontmatter?: unknown;
  content?: string;
}): boolean => {
  const fm = page.frontmatter as Frontmatter | undefined;

  return (
    fm?.sitemap !== false &&
    fm?.llmstxt !== false &&
    Boolean(page.filePath?.endsWith(".md")) &&
    stripFrontmatter(page.content ?? "").trim().length > 0
  );
};

const REFERENCE_BOX = /<ReferenceBox>([\s\S]*?)<\/ReferenceBox>/u;

export const replaceReferenceBoxes = (
  markdown: string,
  format: (inner: string) => string,
): string =>
  markdown.replace(
    new RegExp(REFERENCE_BOX.source, "gu"),
    (_matched, inner: string) => format(inner),
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
