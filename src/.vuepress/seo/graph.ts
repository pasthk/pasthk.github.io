import type { App, Page } from "vuepress/core";

import {
  isListedPage,
  isSourceDocument,
  isTimelineIndex,
  linkEntries,
  pageTitleMap,
} from "../page-meta.js";
import {
  absoluteUrl,
  AUTHOR_NODE,
  HOSTNAME,
  SITE_NAME,
  SITE_NAME_EN,
} from "../site.js";

/**
 * 全站 JSON-LD 圖譜與集合頁的 ItemList。
 *
 * 每個頁面都輸出同一組站級節點（Organization／Person／WebSite），頁面本身
 * 只放參照用的 @id。站級節點、ItemList 節點與集合頁推導只在這裡維護一次，
 * 主題的逐頁 jsonLd 與虛擬頁的 collectionHead 共用同一套建構器。
 */

export const ORGANIZATION_ID = `${HOSTNAME}/#organization`;
export const WEBSITE_ID = `${HOSTNAME}/#website`;

export type JsonLdNode = Record<string, unknown>;

const organization: JsonLdNode = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE_NAME,
  alternateName: SITE_NAME_EN,
  url: HOSTNAME,
  logo: {
    "@type": "ImageObject",
    url: `${HOSTNAME}/favicon.png`,
    width: 268,
    height: 268,
  },
  email: "pasthk@outlook.com",
  sameAs: ["https://github.com/pasthk/pasthk.github.io"],
};

const person: JsonLdNode = {
  ...AUTHOR_NODE,
  email: "pasthk@outlook.com",
};

const website: JsonLdNode = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: `${HOSTNAME}/`,
  name: SITE_NAME,
  inLanguage: "zh-Hant",
  publisher: { "@id": ORGANIZATION_ID },
};

/** 主節點 + 附加節點（如麵包屑）+ 三個站級節點，順序固定 */
export const jsonLdGraph = (
  main: JsonLdNode,
  extras: (JsonLdNode | null | undefined)[] = [],
): JsonLdNode => ({
  "@context": "https://schema.org",
  "@graph": [
    main,
    ...extras.filter((node): node is JsonLdNode => Boolean(node)),
    organization,
    person,
    website,
  ],
});

/* ---- 集合頁的 ItemList ---- */

export interface ListItem {
  name: string;
  url: string;
}

/** 少於此數的連結視為「不是集合頁」，不輸出 ItemList */
const MIN_ITEMS = 2;

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
