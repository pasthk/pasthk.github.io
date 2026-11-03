import { createPage } from "vuepress/core";
import type { App, HeadConfig, Page, Plugin } from "vuepress/core";

import { chapters } from "./chapters.js";
import { ogImageUrl } from "./og/paths.js";
import { HOSTNAME, SITE_NAME } from "./site.js";

/**
 * 「全部文獻」索引頁。
 *
 * 緣起：主題的側邊欄分組都是 `collapsible: true`，而 `SidebarLinks` 以
 * `watchImmediate(routePath, …, { flush: "post" })` 計算展開組，這個回呼在
 * 服務端渲染階段不會執行，`openGroupIndex` 保持 -1；`SidebarGroup` 的判斷
 * 又是 `shouldOpen || !collapsible ? h(SidebarLinks) : null`，於是每個分組在
 * HTML 中都只留下一個標題按鈕，子項完全不輸出。
 *
 * 結果是整站 255 個頁面只有 13 個能從首頁沿連結走到（5%），其餘全靠
 * sitemap.xml 被動發現，no-JS 訪客也無法瀏覽。本頁把可收錄頁面整理成
 * 一份帶連結的清單並掛上頁尾（theme.ts 的 footer），讓每個頁面都能在
 * 兩次點擊內到達，
 * 不必改動主題元件、也不會讓每一頁的 HTML 為了側邊欄膨脹。
 *
 * 頁面內容在 `onInitialized` 期間由 `app.pages` 生成，因此目錄會隨內容
 * 增減自動更新，不需要人工維護。
 */

const PAGE_PATH = "/browse.html";

/** 不列入索引的頁面：noindex 的空殼頁、404、以及本頁自身 */
const isListable = (page: Page): boolean =>
  page.path !== PAGE_PATH &&
  page.path !== "/404.html" &&
  page.frontmatter.sitemap !== false &&
  Boolean(page.title);

/** `1890s` → `1890年代`、`cap-53` → `CAP-53`，其餘目錄名原樣返回 */
const prettyDir = (dir: string): string => {
  const decade = /^(\d{4})s$/.exec(dir);

  if (decade) return `${decade[1]}年代`;

  // 目錄名取自條例編號（src/legislation/cap-53/），沿用官方的全大寫寫法
  const cap = /^cap-(\d+)$/.exec(dir);

  return cap ? `CAP-${cap[1]}` : dir;
};

interface Bucket {
  /** 分組標題；空字串代表直接位於章節目錄下的頁面 */
  label: string;
  entries: { title: string; path: string; date?: string }[];
}

function buildContent(app: App): string {
  const titles = new Map<string, string>();

  for (const page of app.pages) titles.set(page.path, page.title);

  const overview: Page[] = [];
  const byChapter = new Map<string, Page[]>();

  for (const page of app.pages) {
    if (!isListable(page)) continue;

    const segments = page.path.split("/").filter(Boolean);

    // 根目錄頁面（首頁、關於本站、閱讀說明、支持本站）沒有章節歸屬
    if (segments.length < 2) {
      overview.push(page);
      continue;
    }

    const bucket = byChapter.get(segments[0]) ?? [];

    bucket.push(page);
    byChapter.set(segments[0], bucket);
  }

  /** 章節內的次級分組：取路徑第二段，沒有則歸入「本章」 */
  const groupOf = (page: Page): Bucket => {
    const segments = page.path.split("/").filter(Boolean);
    const sub = segments.length >= 3 ? segments[1] : "";
    // 分組若本身有頁面（如 /archaeology/lei-cheng-uk-han-tomb.html），用它的標題
    const parent = sub
      ? (titles.get(`/${segments[0]}/${sub}.html`) ??
        titles.get(`/${segments[0]}/${sub}/`))
      : undefined;

    return {
      label: sub ? (parent ?? prettyDir(sub)) : "",
      entries: [
        {
          title: page.title,
          path: page.path,
          date:
            typeof page.frontmatter.datePublished === "string"
              ? page.frontmatter.datePublished
              : undefined,
        },
      ],
    };
  };

  const line = ({ title, path, date }: Bucket["entries"][number]): string =>
    `- [${title}](${path})${date ? `（${date}）` : ""}`;

  const blocks: string[] = [];

  if (overview.length) {
    blocks.push(
      ["## 總覽", "", ...overview.map((page) => `- [${page.title}](${page.path})`)].join("\n"),
    );
  }

  const emit = (dir: string, pages: Page[]): void => {
    const groups = new Map<string, Bucket>();

    for (const page of pages) {
      const group = groupOf(page);
      const existing = groups.get(group.label);

      if (existing) existing.entries.push(...group.entries);
      else groups.set(group.label, group);
    }

    // 「本章」排最前，其餘依分組名排序（年代、專題名皆然）
    const ordered = [...groups.values()].sort((a, b) => {
      if (!a.label) return -1;
      if (!b.label) return 1;

      return a.label.localeCompare(b.label, "zh-Hant");
    });

    const chapter = chapters.find((item) => item.dir === dir);
    const body: string[] = [`## ${chapter?.name ?? dir}`, ""];

    if (chapter) body.push(chapter.note, "");

    for (const group of ordered) {
      if (group.label) body.push(`### ${group.label}`, "");

      body.push(
        ...group.entries
          .sort((a, b) => a.path.localeCompare(b.path))
          .map(line),
        "",
      );
    }

    blocks.push(body.join("\n").trimEnd());
  };

  for (const chapter of chapters) {
    const pages = byChapter.get(chapter.dir);

    if (pages?.length) {
      emit(chapter.dir, pages);
      byChapter.delete(chapter.dir);
    }
  }

  // chapters.ts 未列出的目錄（日後新增）仍會出現，不會靜默消失
  for (const [dir, pages] of byChapter) emit(dir, pages);

  return blocks.join("\n\n");
}

export const pageIndexPlugin = (): Plugin => (app: App) => ({
  name: "page-index",

  async onInitialized(app: App) {
    if (app.pagesMap[PAGE_PATH]) return;

    const content = buildContent(app);
    const count = app.pages.filter(isListable).length;
    const url = `${HOSTNAME}${PAGE_PATH}`;
    const image = ogImageUrl(HOSTNAME, PAGE_PATH);
    const description = `${SITE_NAME}全部 ${count} 個頁面的索引，按章節與分組排列。`;

    /**
     * 這頁是執行期才建立的，比 `@vuepress/plugin-seo` 的 `onInitialized`
     * （它會走訪當時的 `app.pages`，把 canonical、og:* 寫進各頁 frontmatter）
     * 更晚，因此拿不到它產生的標籤。這裡自行補上同樣的一組，避免這頁成為
     * 全站唯一沒有 canonical 與分享資訊的頁面。
     */
    const head: HeadConfig[] = [
      ["link", { rel: "canonical", href: url }],
      ["meta", { property: "og:type", content: "website" }],
      ["meta", { property: "og:url", content: url }],
      ["meta", { property: "og:site_name", content: SITE_NAME }],
      ["meta", { property: "og:title", content: "全部文獻" }],
      ["meta", { property: "og:description", content: description }],
      ["meta", { property: "og:image", content: image }],
      ["meta", { property: "og:image:type", content: "image/png" }],
      ["meta", { property: "og:image:width", content: "1200" }],
      ["meta", { property: "og:image:height", content: "630" }],
      ["meta", { property: "og:image:alt", content: "全部文獻" }],
      ["meta", { name: "twitter:card", content: "summary_large_image" }],
      ["meta", { name: "twitter:image:src", content: image }],
    ];

    const page = await createPage(app, {
      path: PAGE_PATH,
      content: `# 全部文獻\n\n${content}\n`,
      frontmatter: {
        title: "全部文獻",
        description,
        head,
        // 這頁本身就是目錄，不需要頁內目錄、頁碼資訊與前後頁導覽
        toc: false,
        pageInfo: false,
        next: false,
        prev: false,
        comment: false,
      },
    });

    app.pages.push(page);
    app.pagesMap[page.path] = page;
  },
});
