import type { App, Page, Plugin } from "vuepress/core";

import { chapterName, pathSegments } from "./chapters.js";
import { parseDateValue } from "./format.js";
import { pushTo } from "./map-utils.js";
import {
  isIndexablePage,
  isSourceDocument,
  pageDataExtras,
  publishedDate,
  type RelatedInfo,
} from "./page-meta.js";
import { absoluteUrl } from "./site.js";

export type { RelatedInfo, RelatedItem } from "./page-meta.js";


const MAX_RELATED = 4;

const relatedMap = new Map<string, RelatedInfo>();

export const relatedFor = (path: string): RelatedInfo | undefined =>
  relatedMap.get(path);

const isSourcePage = (page: Page): boolean =>
  isIndexablePage(page) && isSourceDocument(page);

const dateKey = (value: string): number => {
  const date = parseDateValue(value);

  return date
    ? Number(`${date.year}${date.month ?? "00"}${date.day ?? "00"}`)
    : 0;
};

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

  const entries: Entry[] = app.pages
    .filter(isSourcePage)
    .map((page) => {
      const date = publishedDate(page) ?? "";
      const segments = pathSegments(page.path);

      return {
        page,
        date,
        key: dateKey(date),
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

  for (const list of byGroup.values()) list.sort(byDateThenPath);
  for (const list of byChapter.values()) list.sort(byDateThenPath);

  for (const entry of entries) {
    const picked: Entry[] = [];
    const seen = new Set<string>([entry.page.path]);
    const siblings = byGroup.get(entry.group) ?? [];
    const index = siblings.findIndex(
      (item) => item.page.path === entry.page.path,
    );

    for (let offset = 1; offset < siblings.length && picked.length < MAX_RELATED; offset += 1) {
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

    const info: RelatedInfo = {
      chapter: chapterName(entry.chapter),
      items: picked.map(({ page, date }) => ({
        title: page.title,
        path: page.path,
        ...(date ? { date } : {}),
      })),
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
