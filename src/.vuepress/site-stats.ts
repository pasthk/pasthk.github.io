import { chapters, pathSegments } from "./chapters.js";
import { parseDateValue } from "./format.js";

export interface StatsInput {
  path?: string;
  filePath?: string | null;
  frontmatter?: Record<string, unknown>;
}

export interface SiteStats {
  total: number;
  sources: number;
  compiled: number;
  firstYear?: string;
  lastYear?: string;
  decades: [string, number][];
}

const included = (page: StatsInput, dir?: string): boolean => {
  if (page.frontmatter?.sitemap === false) return false;
  if (!page.filePath?.endsWith(".md")) return false;
  if (page.path === "/404.html") return false;
  if (!dir) return true;

  return pathSegments(page.path ?? "")[0] === dir;
};

export const siteStats = (pages: StatsInput[], dir?: string): SiteStats => {
  const scope = pages.filter((page) => included(page, dir));
  const years = scope
    .map((page) => parseDateValue(page.frontmatter?.datePublished)?.year)
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

export const describeSite = (stats: SiteStats): string =>
  `本站現有 ${stats.sources} 篇原始文獻轉錄` +
  (stats.firstYear && stats.lastYear
    ? `（原始出版年分 ${stats.firstYear}–${stats.lastYear} 年）`
    : "") +
  `，另有 ${stats.compiled} 個索引與說明頁面，合計 ${stats.total} 個可供檢索的頁面，` +
  `分屬 ${chapters.length} 個主題章節。`;
