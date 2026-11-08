import { chapters } from "./chapters.js";

/**
 * 可被引用統計的單一來源。
 *
 * GEO 實證（Princeton KDD 2024）中，「Statistics Addition」對生成式引擎的
 * 引用可見度有明顯幫助；但數字必須可由頁面本身驗證，不能為了 SEO 編造。
 * 這裡一律由 frontmatter 的 datePublished 與頁面清單即時計算，
 * browse.html、章節落地頁與 llms.txt 共用同一份結果，不會出現三種頁面數。
 *
 * 口徑與 @vuepress/plugin-llms 的收錄範圍一致：有實際來源檔、可索引的頁面。
 * 動態建立的索引頁（browse.html、章節頁）沒有 filePath，不計入；
 * 已設 sitemap: false 的空殼頁也不計入。
 */
export interface StatsInput {
  path?: string;
  filePath?: string | null;
  frontmatter?: Record<string, unknown>;
}

export interface SiteStats {
  /** 可供檢索的頁面總數 */
  total: number;
  /** 有原始出版日的史料轉錄頁 */
  sources: number;
  /** 本站整理的索引／說明頁 */
  compiled: number;
  /** 史料頁的出版年分範圍 */
  firstYear?: string;
  lastYear?: string;
  /** 史料頁依十年的篇數分佈，供章節頁製表 */
  decades: [string, number][];
}

const YEAR = /^(\d{4})/u;

const included = (page: StatsInput, dir?: string): boolean => {
  if (page.frontmatter?.sitemap === false) return false;
  if (!page.filePath?.endsWith(".md")) return false;
  if (page.path === "/404.html") return false;
  if (!dir) return true;

  return page.path?.split("/").filter(Boolean)[0] === dir;
};

export const siteStats = (pages: StatsInput[], dir?: string): SiteStats => {
  const scope = pages.filter((page) => included(page, dir));
  const years = scope
    .map((page) => page.frontmatter?.datePublished)
    .filter((value): value is string => typeof value === "string")
    .map((value) => YEAR.exec(value)?.[1])
    .filter((value): value is string => Boolean(value))
    .sort();
  const decades = new Map<string, number>();

  for (const year of years) {
    const key = `${Math.floor(Number(year) / 10) * 10}年代`;

    decades.set(key, (decades.get(key) ?? 0) + 1);
  }

  return {
    total: scope.length,
    sources: years.length,
    compiled: scope.length - years.length,
    firstYear: years[0],
    lastYear: years.at(-1),
    decades: [...decades].sort(([a], [b]) => a.localeCompare(b, "zh-Hant")),
  };
};

/** 全站統計句，放進 llms.txt 與文獻綜覽，讓引用時有可查核的具體數字 */
export const describeSite = (stats: SiteStats): string =>
  `本站現有 ${stats.sources} 篇原始文獻轉錄` +
  (stats.firstYear && stats.lastYear
    ? `（原始出版年分 ${stats.firstYear}–${stats.lastYear} 年）`
    : "") +
  `，另有 ${stats.compiled} 個索引與說明頁面，合計 ${stats.total} 個可供檢索的頁面，` +
  `分屬 ${chapters.length} 個主題章節。`;
