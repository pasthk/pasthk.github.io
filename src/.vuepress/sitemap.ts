import { readFile, writeFile } from "node:fs/promises";
import type { App, Page, Plugin } from "vuepress/core";

import { createdDate } from "./page-meta.js";

/**
 * sitemap.xml 的修改時間與無效欄位治理。
 *
 * Google 明確忽略 `<changefreq>` 與 `<priority>`；`<lastmod>` 則只有在
 * 「持續且可驗證準確」且反映最後一次重大內容更新時才採用。外掛預設把
 * 每一頁都標成 `changefreq=daily`，對一批 1874–2005 年的靜態史料並不準確；
 * 未追蹤的新頁又因沒有 Git 資料而完全沒有 lastmod。
 *
 * 這裡的取値順序：
 * 1. frontmatter `dateModified`：人工維護的明確重大更新日。
 * 2. `page.data.git.updatedTime`：CI 由乾淨提交建置時可驗證的修改時間。
 * 3. `dateCreated`／`date`：尚未提交的本地新頁，以本站建檔日代替。
 * 4. 都沒有就回傳空字串，讓外掛省略 `<lastmod>`，不編造日期。
 *
 * `browse.html` 是執行期由其他頁面產生的索引，本身沒有來源檔；以全站
 * 其餘可索引頁面中最晚的修改時間代表其連結清單最後一次實質變動。
 */

type Frontmatter = Record<string, unknown>;
type GitData = { updatedTime?: number };

const toIso = (value: unknown): string => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  if (typeof value !== "string" || !value.trim()) return "";

  const date = new Date(value.trim());

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const sourceModifiedTime = (page: Page): string => {
  const frontmatter = page.frontmatter as Frontmatter;
  const explicit = toIso(frontmatter.dateModified);

  if (explicit) return explicit;

  const git = (page.data as unknown as { git?: GitData }).git;
  const committed = toIso(git?.updatedTime);

  if (committed) return committed;

  return toIso(createdDate(page));
};

/** 執行期產生的目錄頁：沒有來源檔，也沒有自己的修改時間 */
const INDEX_PATHS = new Set(["/browse.html"]);

const browseTimes = new WeakMap<App, string>();

/** 供 theme.ts 的 sitemap.modifyTimeGetter 使用 */
export const sitemapModifiedTime = (page: Page, app: App): string => {
  if (!INDEX_PATHS.has(page.path)) return sourceModifiedTime(page);

  const cached = browseTimes.get(app);

  if (cached !== undefined) return cached;

  const times = app.pages
    .filter(
      (item) =>
        !INDEX_PATHS.has(item.path) &&
        item.path !== "/404.html" &&
        item.frontmatter.sitemap !== false,
    )
    .map(sourceModifiedTime)
    .filter(Boolean)
    .sort();
  const latest = times.at(-1) ?? "";

  browseTimes.set(app, latest);

  return latest;
};

/** 外掛仍會寫入 changefreq；在建置後移除 Google 忽略的欄位 */
export const sitemapCleanPlugin = (): Plugin => () => ({
  name: "sitemap-clean",

  async onGenerated(app: App): Promise<void> {
    const path = app.dir.dest("sitemap.xml");
    const xml = await readFile(path, "utf8");
    const next = xml.replace(
      /[ \t]*<(?:changefreq|priority)>[^<]*<\/(?:changefreq|priority)>\s*/gu,
      "",
    );

    if (next !== xml) await writeFile(path, next, "utf8");
  },
});
