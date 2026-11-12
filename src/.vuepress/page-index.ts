import { createPage } from "vuepress/core";
import type { App, Page, Plugin } from "vuepress/core";

import { collectionHead } from "./collection-head.js";
import { formatChineseDate, parseDateValue } from "./format.js";
import { ogImageUrl } from "./og/paths.js";
import {
  isIndexablePage,
  publishedDate,
  sourceOf,
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
const TIMELINE_TITLE = "事件時間軸";

interface DatedPage {
  page: Page;
  date: string;
  year: string;
  /** 補齊月日後的可比較鍵，讓 1955、1955-08、1955-08-11 能正確排序 */
  key: string;
}

const dateSortKey = (date: string): string => {
  const parsed = parseDateValue(date);

  return parsed
    ? `${parsed.year}-${parsed.month ?? "00"}-${parsed.day ?? "00"}`
    : date;
};

/** 資料來源：由史料頁 ReferenceBox 的引用文字解析報刊／出版者名稱 */
const sourceLabel = (page: Page): string | undefined =>
  sourceOf(page.content)?.publication;

/**
 * 日期放在條目最前，由 CSS 定位到軸線左側。
 * 同一日期只輸出一次；後續條目不帶日期，形成同一天的分組。
 */
const timelineLine = (page: Page, dateLabel?: string): string => {
  const prefix = dateLabel
    ? `<span class="browse-timeline-date">${dateLabel}</span> `
    : "";
  const source = sourceLabel(page);
  const suffix = source
    ? ` <span class="browse-timeline-source">${source}</span>`
    : "";

  return `- ${prefix}[${page.title}](${page.path})${suffix}`;
};

/** 整頁共用一條軸線；年份為實心節點，其下條目為空心圓點 */
const timelineMarkdown = (dated: DatedPage[]): string => {
  const lines = ['<div class="browse-timeline">', ""];
  let year = "";
  let lastDate = "";

  for (const entry of dated) {
    if (entry.year !== year) {
      if (year) lines.push("");
      year = entry.year;
      lines.push(`### ${year}年`, "");
    }

    const dateLabel = formatChineseDate(entry.date);

    lines.push(
      timelineLine(entry.page, dateLabel === lastDate ? undefined : dateLabel),
    );
    lastDate = dateLabel;
  }

  lines.push("", "</div>");

  return lines.join("\n");
};

interface BrowseContent {
  content: string;
  /** 實際列在時間軸上的頁面，供 JSON-LD ItemList 使用 */
  pages: Page[];
}

function buildContent(app: App, stats: SiteStats): BrowseContent {
  const dated: DatedPage[] = [];

  for (const page of app.pages) {
    if (!isIndexablePage(page)) continue;

    const date = publishedDate(page);

    if (!date) continue;

    dated.push({
      page,
      date,
      year: parseDateValue(date)?.year ?? "年份不詳",
      key: dateSortKey(date),
    });
  }

  dated.sort(
    (a, b) =>
      a.key.localeCompare(b.key) || a.page.path.localeCompare(b.page.path),
  );

  const blocks = [
    `${describeSite(stats)}以下依資料日期由舊至新列出 ${dated.length} 篇文獻，同一日期的報導合併顯示。`,
    `## ${TIMELINE_TITLE}`,
    timelineMarkdown(dated),
  ];

  return {
    content: blocks.join("\n\n"),
    pages: dated.map((entry) => entry.page),
  };
}

export const pageIndexPlugin = (): Plugin => ({
  name: "page-index",

  async onInitialized(app: App) {
    if (app.pages.some((item) => item.path === PAGE_PATH)) return;

    const stats = siteStats(app.pages as StatsInput[]);
    const { content, pages: listed } = buildContent(app, stats);
    const url = absoluteUrl(PAGE_PATH);
    const image = ogImageUrl(HOSTNAME, PAGE_PATH);
    const description =
      `${SITE_NAME}依原始出版日期由舊至新排列的${TIMELINE_TITLE}，` +
      `收錄 ${stats.sources} 篇 ${stats.firstYear}–${stats.lastYear} 年的原始文獻轉錄，` +
      `並標明資料來源。`;

    const items = listed.map((item) => ({
      name: item.title,
      url: absoluteUrl(item.path),
    }));
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
