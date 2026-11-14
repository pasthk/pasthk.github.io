import { posix } from "node:path";
import type { App, Page } from "vuepress/core";

import {
  isListedPage,
  isSourceDocument,
  isTimelineIndex,
  pageTitleMap,
} from "./page-meta.js";
import { absoluteUrl } from "./site.js";


const LINK = /\[([^\]]+)\]\(([^)\s]+?)(?:\s+"[^"]*")?\)/gu;

const MIN_ITEMS = 2;

interface ListEntry {
  path: string;
  label: string;
}

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

const linkCache = new WeakMap<Page, ListEntry[]>();

export const linkEntries = (page: Page): ListEntry[] => {
  const cached = linkCache.get(page);

  if (cached) return cached;

  const found: ListEntry[] = [];
  const seen = new Set<string>([page.path]);

  for (const match of page.content.matchAll(LINK)) {
    const [, label, href] = match;
    const path = toPagePath(href, page.path);

    if (!path || seen.has(path)) continue;

    seen.add(path);
    found.push({ path, label: label.replace(/\s+/gu, " ").trim() });
  }

  linkCache.set(page, found);

  return found;
};

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

interface ItemListResult {
  itemList: Record<string, unknown>;
}

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

export const collectionItems = (
  page: Page,
  app: App,
): ItemListResult | undefined => {
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

  return {
    itemList: itemListNode(
      absoluteUrl(page.path),
      entries.map(({ path, label }) => ({
        name: titles.get(path) || label,
        url: absoluteUrl(path),
      })),
    ),
  };
};
