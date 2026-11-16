import type { App, Page } from "vuepress/core";

import {
  isListedPage,
  isSourceDocument,
  isTimelineIndex,
  linkEntries,
  pageTitleMap,
} from "../page-meta.js";
import { absoluteUrl } from "../site.js";

/** 少於此數的連結視為「不是集合頁」，不輸出 ItemList */
const MIN_ITEMS = 2;

export interface ListItem {
  name: string;
  url: string;
}

export const itemListNode = (
  pageUrl: string,
  items: ListItem[],
): Record<string, unknown> => ({
  "@type": "ItemList",
  "@id": `${pageUrl}#itemlist`,
  numberOfItems: items.length,
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    url: item.url,
  })),
});

const titlesCache = new WeakMap<
  App,
  { size: number; titles: Map<string, string> }
>();

/** app.pages 會在建置期增長，以長度判斷快取是否過期 */
const titlesFor = (app: App): Map<string, string> => {
  const cached = titlesCache.get(app);

  if (cached && cached.size === app.pages.length) return cached.titles;

  const titles = pageTitleMap(app.pages);

  titlesCache.set(app, { size: app.pages.length, titles });

  return titles;
};

/**
 * 由頁面正文的連結推導集合頁的 ItemList。
 * 只在「可收錄、非史料、非時間軸、非首頁」的頁面成立。
 */
export const collectionItems = (
  page: Page,
  app: App,
): Record<string, unknown> | undefined => {
  if (
    isSourceDocument(page) ||
    !isListedPage(page) ||
    page.path === "/" ||
    isTimelineIndex(page)
  ) {
    return undefined;
  }

  const titles = titlesFor(app);
  const entries = linkEntries(page).filter((entry) => titles.has(entry.path));

  if (entries.length < MIN_ITEMS) return undefined;

  return itemListNode(
    absoluteUrl(page.path),
    entries.map(({ path, label }) => ({
      name: titles.get(path) || label,
      url: absoluteUrl(path),
    })),
  );
};
