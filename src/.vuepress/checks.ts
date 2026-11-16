import { readdirSync } from "node:fs";
import type { App, Plugin } from "vuepress/core";
import { success, warn } from "vuepress/utils";

import { chapters } from "./chapters.js";
import {
  isIndexablePage,
  isSourceDocument,
  linkEntries,
  pageDataExtras,
  visibleLengthOf,
} from "./page-meta.js";
import { pagePathOfLink } from "./site.js";
import { sidebarLinks } from "./sidebar.js";

/**
 * 建置期守衛。
 *
 * 這三類檢查原本是三個獨立外掛，各自 `for (const page of app.pages)`
 * 掃一遍全站，並各自重建站內路徑集合。合併成一次遍歷後：
 *   - `visibleLengthOf` 每頁只算一次（原本 ad／薄內容各算一次）；
 *   - 站內路徑集合只建一次；
 *   - 檢查項目集中在一處，新增守衛不必再開新檔案。
 *
 * 產出的警告與寫入的 page data 欄位（`adEligible`）與原本完全一致。
 */

/** 警告訊息中最多列出幾個路徑 */
const MAX_SAMPLES = 12;

/** 可收錄索引／說明頁的最低正文長度（字） */
const THIN_CONTENT_CHARS = 100;

/** 未達最低正文長度時，至少要有的站內史料連結數 */
const MIN_LINKS = 2;

/** 允許投放廣告的最低正文長度（字） */
const MIN_AD_CONTENT_CHARS = 150;

const sample = (paths: string[]): string =>
  paths.length > MAX_SAMPLES
    ? `${paths.slice(0, MAX_SAMPLES).join("、")} 等 ${paths.length} 頁`
    : paths.join("、");

/** 章節登記與來源目錄是否一致 */
const checkChapters = (app: App): void => {
  const actual = readdirSync(app.dir.source(), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name);
  const registered = new Set(chapters.map((chapter) => chapter.dir));

  const unlisted = actual.filter((dir) => !registered.has(dir));
  const missing = [...registered].filter((dir) => !actual.includes(dir));
  const duplicated = chapters
    .map((chapter) => chapter.dir)
    .filter((dir, index, all) => all.indexOf(dir) !== index);

  if (unlisted.length) {
    warn(
      `chapters.ts 未登記這些頂層目錄：${unlisted.join("、")}。` +
        `它們會以目錄名出現在 llms.txt 與分冊檔頭，OG 卡也沒有章節標籤。`,
    );
  }

  if (missing.length) {
    warn(
      `chapters.ts 登記了不存在的目錄：${missing.join("、")}。` +
        `對外文案的章節數會多算。`,
    );
  }

  if (duplicated.length) {
    warn(`chapters.ts 有重複的 dir：${duplicated.join("、")}，後者會被忽略。`);
  }
};

/** 逐頁檢查：廣告資格、自動摘要、薄內容；另做側邊欄死鏈 */
const checkPages = (app: App): void => {
  const knownPaths = new Set(app.pages.map((page) => page.path));
  const thin: string[] = [];
  const autoDesc: string[] = [];
  let eligible = 0;

  for (const page of app.pages) {
    const indexable = isIndexablePage(page);
    const length = visibleLengthOf(page);

    const allowed =
      indexable &&
      page.frontmatter.index !== false &&
      length >= MIN_AD_CONTENT_CHARS;

    pageDataExtras(page.data).adEligible = allowed;
    if (allowed) eligible += 1;

    if (!indexable) continue;

    if (pageDataExtras(page.data).autoDesc) autoDesc.push(page.path);
    if (isSourceDocument(page)) continue;

    const links = linkEntries(page).filter((entry) =>
      knownPaths.has(entry.path),
    ).length;

    if (length < THIN_CONTENT_CHARS && links < MIN_LINKS) thin.push(page.path);
  }

  success(
    `廣告投放範圍：${eligible}/${app.pages.length} 頁（可見正文 ≥ ${MIN_AD_CONTENT_CHARS} 字且非 404／空殼／導覽頁）`,
  );

  if (thin.length) {
    warn(
      `有 ${thin.length} 個可收錄的索引／說明頁正文不足 ${THIN_CONTENT_CHARS} 字且沒有史料連結：${sample(thin)}。` +
        `建議補上主題說明，或改設 sitemap: false／noindex，避免薄內容進入 sitemap。`,
    );
  }

  if (autoDesc.length) {
    warn(
      `有 ${autoDesc.length} 個可收錄頁面沒有人工 description，目前使用正文自動截取的摘要：${sample(autoDesc)}。` +
        `建議補寫 frontmatter.description 以改善搜尋結果摘要（規格見 scripts/description-style.md，可用 npm run docs:desc 檢查）。`,
    );
  }

  const deadLinks = [...new Set(sidebarLinks().map(pagePathOfLink))].filter(
    (path) => !knownPaths.has(path),
  );

  if (deadLinks.length) {
    warn(
      `側邊欄有 ${deadLinks.length} 個連結找不到對應頁面：${sample(deadLinks)}。` +
        `請更新 sidebar.ts 或補回來源檔，避免導覽與麵包屑出現死鏈。`,
    );
  }
};

export const checksPlugin = (): Plugin => ({
  name: "build-checks",

  onInitialized(app: App): void {
    checkChapters(app);
    checkPages(app);
  },
});
