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

const MAX_RELATED = 4;

/** 編年軸在當前頁前後各取幾篇 */
const TIMELINE_NEIGHBORS = 2;

const relatedMap = new Map<string, RelatedInfo>();

const relatedFor = (path: string): RelatedInfo | undefined =>
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

/** 與舊的 filter().sort() 完全相同的比較器，供 top-K 選擇沿用 */
const byDateDistance =
  (key: number) =>
  (a: Entry, b: Entry): number =>
    Math.abs(a.key - key) - Math.abs(b.key - key) ||
    a.page.path.localeCompare(b.page.path);

/**
 * 只取最接近的 limit 篇。章節清單動輒上百篇，舊寫法為每一頁都配置一份
 * 過濾後陣列並完整排序，卻只用到前 4 筆；改為線性維護一個長度上限 limit
 * 的有序陣列，結果逐字相同，成本由 O(C log C) 降為 O(C·limit)。
 */
const nearest = (
  chapter: Entry[],
  seen: Set<string>,
  key: number,
  limit: number,
): Entry[] => {
  const compare = byDateDistance(key);
  const best: Entry[] = [];

  for (const candidate of chapter) {
    if (seen.has(candidate.page.path)) continue;

    if (best.length === limit && compare(candidate, best[limit - 1]) >= 0)
      continue;

    let insertAt = best.length;

    while (insertAt > 0 && compare(candidate, best[insertAt - 1]) < 0)
      insertAt -= 1;

    best.splice(insertAt, 0, candidate);
    if (best.length > limit) best.pop();
  }

  return best;
};

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
      const near = nearest(
        byChapter.get(entry.chapter) ?? [],
        seen,
        entry.key,
        MAX_RELATED - picked.length,
      );

      for (const candidate of near) {
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
