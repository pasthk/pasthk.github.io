import type { App, Page, Plugin } from "vuepress/core";

import { chapterName, pathSegments } from "./chapters.js";
import { dateOrder } from "./format.js";
import { pushTo } from "./map-utils.js";
import {
  isIndexablePage,
  isSourceDocument,
  pageDataExtras,
  publishedDate,
  type RelatedInfo,
  type RelatedItem,
  type RelatedTimeline,
} from "./page-meta.js";
import { absoluteUrl } from "./site.js";

export type {
  RelatedInfo,
  RelatedItem,
  RelatedTimeline,
} from "./page-meta.js";


const MAX_RELATED = 4;

/** 編年軸在當前頁前後各取幾篇 */
const TIMELINE_NEIGHBORS = 2;

const relatedMap = new Map<string, RelatedInfo>();

export const relatedFor = (path: string): RelatedInfo | undefined =>
  relatedMap.get(path);

const isSourcePage = (page: Page): boolean =>
  isIndexablePage(page) && isSourceDocument(page);

interface Entry {
  page: Page;
  date: string;
  key: number;
  chapter: string;
  group: string;
}

const byDateThenPath = (a: Entry, b: Entry): number =>
  a.key - b.key || a.page.path.localeCompare(b.page.path);

function collect(app: App): void {
  relatedMap.clear();

  const toItem = ({ page, date }: Entry): RelatedItem => ({
    title: page.title,
    path: page.path,
    ...(date ? { date } : {}),
  });

  const entries: Entry[] = app.pages
    .filter(isSourcePage)
    .map((page) => {
      const date = publishedDate(page) ?? "";
      const segments = pathSegments(page.path);

      return {
        page,
        date,
        key: dateOrder(date),
        chapter: segments[0] ?? "",
        group: segments.slice(0, -1).join("/"),
      };
    });

  const byGroup = new Map<string, Entry[]>();
  const byChapter = new Map<string, Entry[]>();

  for (const entry of entries) {
    pushTo(byGroup, entry.group, entry);
    pushTo(byChapter, entry.chapter, entry);
  }

  const indexIn = (list: Entry[]): Map<string, number> =>
    new Map(list.map((entry, index) => [entry.page.path, index]));

  const groupIndex = new Map<string, Map<string, number>>();
  const chapterIndex = new Map<string, Map<string, number>>();

  for (const [key, list] of byGroup) {
    list.sort(byDateThenPath);
    groupIndex.set(key, indexIn(list));
  }

  for (const [key, list] of byChapter) {
    list.sort(byDateThenPath);
    chapterIndex.set(key, indexIn(list));
  }

  for (const entry of entries) {
    const picked: Entry[] = [];
    const seen = new Set<string>([entry.page.path]);
    const siblings = byGroup.get(entry.group) ?? [];
    const index = groupIndex.get(entry.group)?.get(entry.page.path) ?? -1;

    for (
      let offset = 1;
      index >= 0 && offset < siblings.length && picked.length < MAX_RELATED;
      offset += 1
    ) {
      for (const candidate of [siblings[index - offset], siblings[index + offset]]) {
        if (!candidate || seen.has(candidate.page.path)) continue;
        if (picked.length >= MAX_RELATED) break;

        picked.push(candidate);
        seen.add(candidate.page.path);
      }
    }

    if (picked.length < MAX_RELATED) {
      const near = (byChapter.get(entry.chapter) ?? [])
        .filter((candidate) => !seen.has(candidate.page.path))
        .sort(
          (a, b) =>
            Math.abs(a.key - entry.key) - Math.abs(b.key - entry.key) ||
            a.page.path.localeCompare(b.page.path),
        );

      for (const candidate of near) {
        if (picked.length >= MAX_RELATED) break;

        picked.push(candidate);
        seen.add(candidate.page.path);
      }
    }

    if (!picked.length) continue;

    // 編年時間軸：以章節內依出版日排序的完整序列為準，取當前頁前後各兩篇。
    // 與 items 的「相關度」挑選分流：items 供 llms.txt 導覽，timeline 供頁面呈現。
    const sequence = byChapter.get(entry.chapter) ?? [];
    const position = chapterIndex.get(entry.chapter)?.get(entry.page.path) ?? -1;
    const timeline: RelatedTimeline =
      position < 0
        ? { before: [], current: toItem(entry), after: [] }
        : {
            before: sequence
              .slice(Math.max(0, position - TIMELINE_NEIGHBORS), position)
              .map(toItem),
            current: toItem(entry),
            after: sequence
              .slice(position + 1, position + TIMELINE_NEIGHBORS + 1)
              .map(toItem),
          };

    const info: RelatedInfo = {
      chapter: chapterName(entry.chapter),
      items: picked.map(toItem),
      timeline,
    };

    relatedMap.set(entry.page.path, info);
    pageDataExtras(entry.page.data).related = info;
  }
}

export const relatedDocumentsPlugin = (): Plugin => ({
  name: "related-documents",

  onInitialized(app: App): void {
    collect(app);
  },
});

export const relatedMarkdown = (path: string): string => {
  const info = relatedFor(path);

  if (!info?.items.length) return "";

  return [
    "",
    "## 相關文獻（本站導覽）",
    "",
    "> 以下為本站導覽連結，不屬原始文獻內容；引用史料請使用各頁的規範網址。",
    "",
    ...info.items.map(
      (item) =>
        `- [${item.title}](${absoluteUrl(item.path)})${item.date ? `｜原始出版日：${item.date}` : ""}`,
    ),
    "",
  ].join("\n");
};
