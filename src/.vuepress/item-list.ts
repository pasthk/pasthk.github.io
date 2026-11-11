import { posix } from "node:path";
import type { App, Page } from "vuepress/core";

import { isSourceDocument, pageTitleMap } from "./page-meta.js";
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

export interface ItemListResult {
  isCollection: boolean;
  itemList: Record<string, unknown>;
}

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

  const titles = pageTitleMap(app.pages);
  const entries = linkEntries(page).filter((entry) => titles.has(entry.path));

  if (entries.length < MIN_ITEMS) return undefined;

  return {
    isCollection: true,
    itemList: itemListNode(
      absoluteUrl(page.path),
      entries.map(({ path, label }) => ({
        name: titles.get(path) || label,
        url: absoluteUrl(path),
      })),
    ),
  };
};
