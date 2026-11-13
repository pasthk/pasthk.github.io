import { createPage } from "vuepress/core";
import type { App, Page, Plugin } from "vuepress/core";

import { collectionHead } from "./collection-head.js";
import {
  dateOrderOf,
  formatMonthDay,
  parseDateValue,
} from "./format.js";
import { ogImageUrl } from "./og/paths.js";
import {
  isIndexablePage,
  publishedDate,
  sourceOfPage,
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
  /** 補齊月日後的數值鍵，讓 1955、1955-08、1955-08-11 能正確排序 */
  order: number;
}

/** 資料來源：由史料頁 ReferenceBox 的引用文字解析報刊／出版者名稱 */
const sourceLabel = (page: Page): string | undefined =>
  sourceOfPage(page)?.publication;

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

/**
 * 年份標題的 id：沿用 VuePress slugify 的規則（開頭為數字時補底線），
 * 讓既有的 #_1874年 這類深層連結仍然可用。
 */
const yearAnchorId = (label: string): string =>
  /^\d/u.test(label) ? `_${label}` : label;

/**
 * 整頁共用一條軸線；年份為實心節點，其下條目為空心圓點。
 * 每個年份各自包在 section 內，貼頂的年份標題才會被下一節推走、隨捲動切換。
 */
const timelineMarkdown = (dated: DatedPage[]): string => {
  const lines = ['<div class="browse-timeline">', ""];
  let year = "";
  let lastDate = "";

  for (const entry of dated) {
    if (entry.year !== year) {
      if (year) lines.push("", "</section>", "");
      year = entry.year;
      /* 年份已由分組標題呈現，日期只留月日；換節後第一條必定顯示日期 */
      lastDate = "";
      /* 年份標題為純文字（無錨點連結），但保留 id 供深層連結定位 */
      const label = `${year}年`;

      lines.push(
        '<section class="browse-year">',
        "",
        `<h3 id="${yearAnchorId(label)}" class="browse-year-title"><span class="browse-year-label">${label}</span></h3>`,
        "",
      );
    }

    const dateLabel = formatMonthDay(entry.date);

    lines.push(
      timelineLine(entry.page, dateLabel === lastDate ? undefined : dateLabel),
    );
    lastDate = dateLabel;
  }

  if (year) lines.push("", "</section>");

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

    const parsed = parseDateValue(date);

    dated.push({
      page,
      date,
      year: parsed?.year ?? "年份不詳",
      order: parsed ? dateOrderOf(parsed) : 0,
    });
  }

  dated.sort(
    (a, b) => a.order - b.order || a.page.path.localeCompare(b.page.path),
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
