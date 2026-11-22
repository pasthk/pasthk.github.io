import type { HeadConfig } from "@vuepress/shared";
import type { App, Page, Plugin } from "vuepress/core";

import { toIsoTimestamp as toIso } from "../format.js";
import {
  createdDate,
  isListedPage,
  isTimelineIndex,
  pageDataExtras,
  type Frontmatter,
} from "../page-meta.js";

/**
 * 搜尋引擎抓取層：sitemap 的最後修改時間與全站 robots 指令。
 *
 * 兩者都只影響爬蟲，與頁面本身的 SEO 標籤分開維護；合在同一個模組，
 * 調整抓取策略時不必在多個檔案之間來回找。
 */

/* ---- sitemap 時間戳 ---- */

const sourceModifiedTime = (page: Page): string => {
  const frontmatter = page.frontmatter as Frontmatter;
  const explicit = toIso(frontmatter.dateModified);

  if (explicit) return explicit;

  const git = pageDataExtras(page.data).git;
  const committed = toIso(git?.updatedTime);

  if (committed) return committed;

  return toIso(createdDate(page));
};

const indexTimes = new WeakMap<App, string>();

export const sitemapModifiedTime = (page: Page, app: App): string => {
  if (!isTimelineIndex(page)) return sourceModifiedTime(page);

  const cached = indexTimes.get(app);

  if (cached !== undefined) return cached;

  const times = app.pages
    .filter((item) => !isTimelineIndex(item) && isListedPage(item))
    .map(sourceModifiedTime)
    .filter(Boolean)
    .sort();
  const latest = times.at(-1) ?? "";

  indexTimes.set(app, latest);

  return latest;
};

/* ---- robots meta ---- */

/**
 * 全站 robots 指令。
 *
 * 站上原本沒有任何 `robots` meta，等同瀏覽器／爬蟲只看得到預設值：
 * 摘要長度與圖片預覽大小都由搜尋引擎自行判斷，AI 摘要（AI Overviews、
 * Copilot、生成式回答）想引長一點的原文時，可能只拿到被截短的一小段。
 * 這裡明確放寬兩件事：
 *
 * - `max-snippet:-1`        不限制文字摘要長度，回答可引用完整段落
 * - `max-image-preview:large` 允許大圖預覽（Discover／圖文摘要）
 * - `max-video-preview:-1`  本站無影片，一併放寬以免日後加影片時漏掉
 *
 * 只補在「本來就沒有 robots meta」的頁面：
 * - `index: false` 的年度索引頁在 frontmatter 自備 `noindex`，不覆寫也不疊加
 *   （兩個 robots meta 同時出現時，爬蟲取最嚴格者，但沒必要留這種歧義）
 * - 404 頁改為明確 `noindex`，避免它被當成一條可收錄的網址吃掉抓取預算
 */
const ROBOTS_CONTENT =
  "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1";

const declaresRobots = (head: unknown): boolean =>
  Array.isArray(head) &&
  head.some(
    (entry) =>
      Array.isArray(entry) &&
      entry[0] === "meta" &&
      typeof entry[1] === "object" &&
      entry[1] !== null &&
      (entry[1] as Record<string, unknown>).name === "robots",
  );

const addHead = (head: unknown, tag: HeadConfig): HeadConfig[] => [
  ...(Array.isArray(head) ? (head as HeadConfig[]) : []),
  tag,
];

export const robotsMetaPlugin = (): Plugin => ({
  name: "robots-meta",

  extendsPage: (page) => {
    if (declaresRobots(page.frontmatter.head)) return;

    const isNotFound = page.path === "/404.html";

    page.frontmatter.head = addHead(page.frontmatter.head, [
      "meta",
      { name: "robots", content: isNotFound ? "noindex" : ROBOTS_CONTENT },
    ]);
  },
});
