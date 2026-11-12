import { createPage } from "vuepress/core";
import type { App, Page, Plugin } from "vuepress/core";

import { chapterMeta, chapters, pathSegments } from "./chapters.js";
import { collectionHead } from "./collection-head.js";
import { formatChineseDate } from "./format.js";
import { pushTo } from "./map-utils.js";
import { ogImageUrl } from "./og/paths.js";
import {
  isIndexablePage,
  pageTitleMap,
  publishedDate,
} from "./page-meta.js";
import {
  describeSite,
  siteStats,
  type SiteStats,
  type StatsInput,
} from "./site-stats.js";
import { absoluteUrl, HOSTNAME, SITE_NAME } from "./site.js";


const PAGE_PATH = "/browse.html";
const PAGE_TITLE = "文獻綜覽";

const prettyDir = (dir: string): string =>
  dir
    .replace(/^(\d{4})s$/, "$1年代")
    .replace(/^cap-(\d+)$/, "CAP-$1");

const groupLabel = (
  titles: Map<string, string>,
  dir: string,
  sub: string,
): string =>
  titles.get(`/${dir}/${sub}.html`) ??
  titles.get(`/${dir}/${sub}/`) ??
  prettyDir(sub);

const line = (page: Page): string => {
  const date = publishedDate(page);
  const suffix = date ? `（${formatChineseDate(date)}）` : "";

  return `- [${page.title}](${page.path})${suffix}`;
};

function buildContent(app: App, stats: SiteStats): string {
  const titles = pageTitleMap(app.pages);
  const overview: Page[] = [];
  const index = new Map<string, Map<string, Page[]>>();

  for (const page of app.pages) {
    if (!isIndexablePage(page)) continue;

    const [dir, sub, ...rest] = pathSegments(page.path);

    if (!sub) {
      overview.push(page);
      continue;
    }

    const label = rest.length ? groupLabel(titles, dir, sub) : "";
    const groups = index.get(dir) ?? new Map<string, Page[]>();

    pushTo(groups, label, page);
    index.set(dir, groups);
  }

  const blocks: string[] = [
    `${describeSite(stats)}以下依章節列出全部頁面，原始文獻轉錄頁另附原始出版日。`,
  ];

  if (overview.length) {
    blocks.push(
      ["", "## 總覽", "", ...overview.map((p) => `- [${p.title}](${p.path})`)].join(
        "\n",
      ),
    );
  }

  const emit = (dir: string, groups: Map<string, Page[]>): void => {
    const chapter = chapterMeta(dir);
    const body = [`## ${chapter?.name ?? dir}`, ""];

    if (chapter) {
      body.push(chapter.note, "");
    }

    const ordered = [...groups.entries()].sort(([a], [b]) => {
      if (a === b) return 0;
      if (!a) return -1;
      if (!b) return 1;

      return a.localeCompare(b, "zh-Hant");
    });

    for (const [label, pages] of ordered) {
      if (label) body.push(`### ${label}`, "");

      body.push(
        ...[...pages].sort((a, b) => a.path.localeCompare(b.path)).map(line),
        "",
      );
    }

    blocks.push(body.join("\n").trimEnd());
  };

  for (const { dir } of chapters) {
    const groups = index.get(dir);

    if (groups) {
      emit(dir, groups);
      index.delete(dir);
    }
  }

  for (const [dir, groups] of index) emit(dir, groups);

  return blocks.join("\n\n");
}

export const pageIndexPlugin = (): Plugin => ({
  name: "page-index",

  async onInitialized(app: App) {
    if (app.pages.some((item) => item.path === PAGE_PATH)) return;

    const stats = siteStats(app.pages as StatsInput[]);
    const content = buildContent(app, stats);
    const url = absoluteUrl(PAGE_PATH);
    const image = ogImageUrl(HOSTNAME, PAGE_PATH);
    const description =
      `${SITE_NAME}全部 ${stats.total} 個可供檢索頁面的完整索引，按 ${chapters.length} 個章節與分組排列；` +
      `其中 ${stats.sources} 篇為 ${stats.firstYear}–${stats.lastYear} 年的原始文獻轉錄。`;

    const items = app.pages
      .filter(isIndexablePage)
      .map((item) => ({ name: item.title, url: absoluteUrl(item.path) }));
    const head = collectionHead({
      url,
      title: PAGE_TITLE,
      description,
      image,
      items,
    });

    const page = await createPage(app, {
      path: PAGE_PATH,
      content: `${content}\n`,
      frontmatter: {
        title: PAGE_TITLE,
        description,
        head,
        toc: false,
        next: false,
        prev: false,
        comment: false,
        pageInfo: false,
      },
    });

    app.pages.push(page);
  },
});
