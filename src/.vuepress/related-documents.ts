import type { App, Page, Plugin } from "vuepress/core";

import { chapterName } from "./chapters.js";
import { HOSTNAME } from "./site.js";

/**
 * 史料頁之間的上下文內部連結。
 *
 * 主題的側邊欄在 SSR 不輸出子項（見 page-index.ts），而文獻綜覽是全站唯一
 * 的完整入口；實測每篇史料頁只有 2 個入鏈（綜覽＋主題頁）、9 個出鏈全部是
 * 導覽列與麵包屑，175 篇史料彼此沒有任何橫向連結。對搜尋引擎是扁平的星狀
 * 連結圖，對生成式引擎則缺少「同一事件還有哪些報道」的可循線索。
 *
 * 這裡在建置期算出同主題、年代最接近的幾篇，交給 Layout.vue 的 contentAfter
 * 輸出 SSR 可見的 <a>，並由 llms.ts 補進 .md 純文字鏡像。刻意不寫入
 * page.content：那會讓 slimsearch 把重複出現的標題當成正文索引、也讓 OG 卡
 * 與「一級轉錄」的純文字版摻進導覽文字。
 */

/** 單頁最多列出的相關文獻數。控制在個位數，避免整站變成自動生成的連結牆。 */
const MAX_RELATED = 4;

export interface RelatedItem {
  title: string;
  path: string;
  /** 原始出版日，YYYY-MM-DD 或降精度的 YYYY-MM／YYYY */
  date?: string;
}

export interface RelatedInfo {
  items: RelatedItem[];
  /** 章節中文名，供結構化資料與元件共用 */
  chapter?: string;
}

/** 以頁面路徑為鍵。llms.ts 的 transformMarkdown 在 onGenerated 才執行，讀得到。 */
const relatedMap = new Map<string, RelatedInfo>();

export const relatedFor = (path: string): RelatedInfo | undefined =>
  relatedMap.get(path);

const segmentsOf = (path: string): string[] =>
  path.split("/").filter(Boolean);

/** 只有可收錄、有原始出版日的史料頁才參與連結，不把索引與空殼頁算進來 */
const isSourcePage = (page: Page): boolean =>
  page.path !== "/browse.html" &&
  page.path !== "/404.html" &&
  page.frontmatter.sitemap !== false &&
  typeof page.frontmatter.datePublished === "string" &&
  Boolean(page.title);

/** ISO 日期轉成可比較的整數；降精度寫法（1910）補 0 後仍可排序 */
const dateKey = (value: string): number =>
  Number(value.replace(/-/g, "").padEnd(8, "0")) || 0;

interface Entry {
  page: Page;
  date: string;
  key: number;
  chapter: string;
  /** 去掉最後一段檔名的目錄，例如 hospital/government-civil-hospital */
  group: string;
}

const byDateThenPath = (a: Entry, b: Entry): number =>
  a.key - b.key || a.page.path.localeCompare(b.page.path);

function collect(app: App): void {
  relatedMap.clear();

  const entries: Entry[] = app.pages
    .filter(isSourcePage)
    .map((page) => {
      const date = page.frontmatter.datePublished as string;
      const segments = segmentsOf(page.path);

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
    byGroup.set(entry.group, [
      ...(byGroup.get(entry.group) ?? []),
      entry,
    ]);
    byChapter.set(entry.chapter, [
      ...(byChapter.get(entry.chapter) ?? []),
      entry,
    ]);
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

    // 先取同主題、出版日最靠近的前後各兩篇。由近而遠交替取，
    // 讓單篇文獻不會永遠只連到比它早（或比它晚）的報道。
    for (let offset = 1; offset < siblings.length && picked.length < MAX_RELATED; offset += 1) {
      for (const candidate of [siblings[index - offset], siblings[index + offset]]) {
        if (!candidate || seen.has(candidate.page.path)) continue;
        if (picked.length >= MAX_RELATED) break;

        picked.push(candidate);
        seen.add(candidate.page.path);
      }
    }

    // 同主題篇數不足時，補同章節內年代最接近者；仍以出版日距離排序，
    // 不讓「同章節」變成與內容無關的隨機連結。
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
    // page.data 會被序列化進頁面 chunk，usePageData() 在 SSR 與客戶端都讀得到。
    (entry.page.data as unknown as Record<string, unknown>).related = info;
  }
}

export const relatedDocumentsPlugin = (): Plugin => ({
  name: "related-documents",

  onInitialized(app: App): void {
    collect(app);
  },
});

/** 供 .md 純文字鏡像使用的連結區塊；明確標示為導覽，避免被誤當成轉錄原文 */
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
        `- [${item.title}](${HOSTNAME}${item.path})${item.date ? `｜原始出版日：${item.date}` : ""}`,
    ),
    "",
  ].join("\n");
};
