import type { App, Page } from "vuepress/core";

import { toIsoTimestamp as toIso } from "./format.js";
import {
  createdDate,
  isListedPage,
  isTimelineIndex,
  pageDataExtras,
  type Frontmatter,
} from "./page-meta.js";

const sourceModifiedTime = (page: Page): string => {
  const frontmatter = page.frontmatter as Frontmatter;
  const explicit = toIso(frontmatter.dateModified);

  if (explicit) return explicit;

  const git = pageDataExtras(page.data).git;
  const committed = toIso(git?.updatedTime);

  if (committed) return committed;

  return toIso(createdDate(page));
};

const indexTimes = new WeakMap<App, string>();

export const sitemapModifiedTime = (page: Page, app: App): string => {
  if (!isTimelineIndex(page)) return sourceModifiedTime(page);

  const cached = indexTimes.get(app);

  if (cached !== undefined) return cached;

  const times = app.pages
    .filter((item) => !isTimelineIndex(item) && isListedPage(item))
    .map(sourceModifiedTime)
    .filter(Boolean)
    .sort();
  const latest = times.at(-1) ?? "";

  indexTimes.set(app, latest);

  return latest;
};
