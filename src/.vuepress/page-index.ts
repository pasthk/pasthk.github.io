import { createPage } from "vuepress/core";
import type { App, Page, Plugin } from "vuepress/core";

import { chapters } from "./chapters.js";
import { collectionHead } from "./collection-head.js";
import { ogImageUrl } from "./og/paths.js";
import { describeSite, siteStats, type StatsInput } from "./site-stats.js";
import { HOSTNAME, SITE_NAME } from "./site.js";

/**
 * 「文獻綜覽」索引頁（/browse.html）。
 *
 * 主題的側邊欄分組在 SSR 階段不輸出子項（SidebarLinks 的 watchImmediate
 * 回呼不會在服務端執行），全站因此只有少數頁面能從首頁沿連結走到。本頁在
 * onInitialized 由 app.pages 產生一份完整清單並掛上頁尾，讓每個頁面兩次點擊
 * 內可達；不更動主題元件，也不讓每頁 HTML 為了側邊欄膨脹。目錄隨內容自動增減。
 */

const PAGE_PATH = "/browse.html";
const PAGE_TITLE = "文獻綜覽";

/** 不列入索引：noindex 的空殼頁、404，以及本頁自身 */
const isListable = (page: Page): boolean =>
  page.path !== PAGE_PATH &&
  page.path !== "/404.html" &&
  page.frontmatter.sitemap !== false &&
  Boolean(page.title);

/** `1890s` → `1890年代`、`cap-53` → `CAP-53`，其餘原樣返回 */
const prettyDir = (dir: string): string =>
  dir
    .replace(/^(\d{4})s$/, "$1年代")
    // 目錄名取自條例編號（src/legislation/cap-53/），沿用官方全大寫寫法
    .replace(/^cap-(\d+)$/, "CAP-$1");

/**
 * 次級分組標題取路徑第二段；若該分組本身有頁面，改用它的標題。
 * 對照表須由 app.pages 建立：VuePress 的 app.pagesMap 以 filePath 為鍵，
 * 用 page.path 查會找不到。
 */
const groupLabel = (
  titles: Map<string, string>,
  dir: string,
  sub: string,
): string =>
  titles.get(`/${dir}/${sub}.html`) ??
  titles.get(`/${dir}/${sub}/`) ??
  prettyDir(sub);

const line = (page: Page): string => {
  const date = page.frontmatter.datePublished;
  const suffix = typeof date === "string" ? `（${date}）` : "";

  return `- [${page.title}](${page.path})${suffix}`;
};

function buildContent(app: App): string {
  const stats = siteStats(app.pages as StatsInput[]);
  const titles = new Map<string, string>(
    app.pages.map((page): [string, string] => [page.path, page.title]),
  );
  const overview: Page[] = [];
  // 章節目錄 → 分組標題 → 頁面；空標題代表直接位於章節目錄下
  const index = new Map<string, Map<string, Page[]>>();

  for (const page of app.pages) {
    if (!isListable(page)) continue;

    const [dir, sub, ...rest] = page.path.split("/").filter(Boolean);

    // 根目錄頁面（首頁、關於本站、閱讀說明、支持本站）沒有章節歸屬
    if (!sub) {
      overview.push(page);
      continue;
    }

    // 路徑超過兩段才有次級分組，否則歸入「本章」
    const label = rest.length ? groupLabel(titles, dir, sub) : "";
    const groups = index.get(dir) ?? new Map<string, Page[]>();

    groups.set(label, [...(groups.get(label) ?? []), page]);
    index.set(dir, groups);
  }

  const blocks: string[] = [
    // 可由 frontmatter 查核的具體數字，比「收錄大量文獻」更易被引用
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
    const chapter = chapters.find((item) => item.dir === dir);
    const body = [`## ${chapter?.name ?? dir}`, ""];

    if (chapter) {
      body.push(chapter.note, "");
    }

    // 「本章」排最前，其餘依分組名排序（年代、專題名皆然）
    const ordered = [...groups.entries()].sort(([a], [b]) =>
      a && b ? a.localeCompare(b, "zh-Hant") : a ? 1 : -1,
    );

    for (const [label, pages] of ordered) {
      if (label) body.push(`### ${label}`, "");

      body.push(
        ...[...pages].sort((a, b) => a.path.localeCompare(b.path)).map(line),
        "",
      );
    }

    blocks.push(body.join("\n").trimEnd());
  };

  // 先按 chapters.ts 的順序輸出；未列出的目錄補在最後，日後新增不會靜默消失
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

export const pageIndexPlugin = (): Plugin => (app: App) => ({
  name: "page-index",

  async onInitialized(app: App) {
    if (app.pagesMap[PAGE_PATH]) return;

    const content = buildContent(app);
    const stats = siteStats(app.pages as StatsInput[]);
    const url = `${HOSTNAME}${PAGE_PATH}`;
    const image = ogImageUrl(HOSTNAME, PAGE_PATH);
    const description =
      `${SITE_NAME}全部 ${stats.total} 個可供檢索頁面的完整索引，按 ${chapters.length} 個章節與分組排列；` +
      `其中 ${stats.sources} 篇為 ${stats.firstYear}–${stats.lastYear} 年的原始文獻轉錄。`;

    /**
     * 主題的 seo 插件在 onInitialized 走訪 app.pages 寫入 canonical／og:*，
     * 而主題插件一律先於使用者插件註冊，本頁建立時已錯過那一輪，須自行補上。
     * 與各章節落地頁共用 collection-head.ts，social meta 與 JSON-LD 不會各自漂移。
     */
    const head = collectionHead({ url, title: PAGE_TITLE, description, image });

    const page = await createPage(app, {
      path: PAGE_PATH,
      // 主題會由 frontmatter.title 自己輸出一個 h1；若這裡再寫一個，
      // 頁面會出現兩個 h1（先前 browse.html 全站唯一的重複標題）。
      content: `${content}\n`,
      frontmatter: {
        title: PAGE_TITLE,
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
