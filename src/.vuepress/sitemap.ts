import type { App, Page } from "vuepress/core";

import {
  createdDate,
  pageDataExtras,
  type Frontmatter,
} from "./page-meta.js";


const toIso = (value: unknown): string => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  if (typeof value !== "string" || !value.trim()) return "";

  const date = new Date(value.trim());

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const sourceModifiedTime = (page: Page): string => {
  const frontmatter = page.frontmatter as Frontmatter;
  const explicit = toIso(frontmatter.dateModified);

  if (explicit) return explicit;

  const git = pageDataExtras(page.data).git;
  const committed = toIso(git?.updatedTime);

  if (committed) return committed;

  return toIso(createdDate(page));
};

const INDEX_PATHS = new Set(["/browse.html"]);

const browseTimes = new WeakMap<App, string>();

export const sitemapModifiedTime = (page: Page, app: App): string => {
  if (!INDEX_PATHS.has(page.path)) return sourceModifiedTime(page);

  const cached = browseTimes.get(app);

  if (cached !== undefined) return cached;

  const times = app.pages
    .filter(
      (item) =>
        !INDEX_PATHS.has(item.path) &&
        item.path !== "/404.html" &&
        item.frontmatter.sitemap !== false,
    )
    .map(sourceModifiedTime)
    .filter(Boolean)
    .sort();
  const latest = times.at(-1) ?? "";

  browseTimes.set(app, latest);

  return latest;
};
