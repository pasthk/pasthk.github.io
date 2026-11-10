import { posix } from "node:path";
import type { App, Page } from "vuepress/core";

import { isSourceDocument } from "./page-meta.js";
import { HOSTNAME } from "./site.js";

/**
 * 主題索引頁的機器可讀收錄清單。
 *
 * 索引頁在 HTML 上已用編號清單列出文獻，但對生成式引擎而言那只是排版：
 * 它得先解析整頁 HTML、辨認哪些是導覽列、哪些才是史料連結，才能回答
 * 「這個主題收錄了哪些報道」。Google 的 ItemList 指引允許把清單直接放在
 * WebPage／CollectionPage 的 mainEntity，這裡據此輸出，且每項都指向
 * 可供人查核的 .html 規範網址，而非 .md 鏡像。
 *
 * 連結取自 page.content（原始 Markdown），刻意不用渲染後的 HTML：
 * 後者混有導覽列、麵包屑、主題元件產生的連結，無法區分是否為史料。
 */

/** 只用有明確副檔名的站內連結；錨點、外部協定與圖片一律略過 */
const LINK = /\[([^\]]+)\]\(([^)\s]+?)(?:\s+"[^"]*")?\)/gu;

/** 少於此數不視為「彙編」，避免把說明頁誤標成集合頁 */
const MIN_ITEMS = 2;

interface ListEntry {
  /** 正規化後的 .html 頁面路徑 */
  path: string;
  /** 索引頁上使用的連結文字；找不到目標頁標題時才退回它 */
  label: string;
}

/**
 * `./foo.md` → 相對該頁所在目錄；`/foo.md` → 絕對路徑；
 * 兩者都換成 .html，並去掉錨點。非頁面連結回傳 undefined。
 */
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

/** 解析索引頁正文的站內文獻連結，保留原始順序並去除重複 */
export const linkEntries = (page: Page): ListEntry[] => {
  const found: ListEntry[] = [];
  const seen = new Set<string>([page.path]);

  for (const match of page.content.matchAll(LINK)) {
    const [, label, href] = match;
    const path = toPagePath(href, page.path);

    if (!path || seen.has(path)) continue;

    seen.add(path);
    found.push({ path, label: label.replace(/\s+/gu, " ").trim() });
  }

  return found;
};

export interface ItemListResult {
  /** 是否應把頁面標為 CollectionPage */
  isCollection: boolean;
  /** 供 mainEntity 使用的完整節點 */
  itemList: Record<string, unknown>;
}

/**
 * 只對「可收錄、非史料、確實彙編多篇站內頁面」的索引頁生效。
 * 首頁、404、動態建立的 browse.html 都有自己的 head，不在此處理。
 */
export const collectionItems = (
  page: Page,
  app: App,
): ItemListResult | undefined => {
  if (
    isSourceDocument(page) ||
    page.frontmatter.sitemap === false ||
    page.path === "/" ||
    page.path === "/404.html" ||
    page.path === "/browse.html"
  ) {
    return undefined;
  }

  const titles = new Map<string, string>(
    app.pages.map((item) => [item.path, item.title]),
  );
  const entries = linkEntries(page).filter((entry) => titles.has(entry.path));

  if (entries.length < MIN_ITEMS) return undefined;

  return {
    isCollection: true,
    itemList: {
      "@type": "ItemList",
      "@id": `${new URL(page.path, HOSTNAME).href}#itemlist`,
      numberOfItems: entries.length,
      itemListElement: entries.map(({ path, label }, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: titles.get(path) || label,
        url: `${HOSTNAME}${path}`,
      })),
    },
  };
};
