import type { App, Plugin } from "vuepress/core";

import { pushTo } from "./map-utils.js";
import sidebar from "./sidebar.js";

/** 導覽中的一節；`link` 為空表示該層只是側邊欄分組，沒有對應頁面 */
export interface TrailItem {
  text: string;
  link?: string;
}

type SidebarNode = {
  text?: string;
  link?: string;
  children?: (SidebarNode | string)[];
};

const HOME: TrailItem = { text: "首頁", link: "/" };

/**
 * 側邊欄的 link 是 .md 路徑，頁面的 path 是 .html 路徑，兩者要先對齊。
 * 麵包屑與側邊欄死鏈校驗共用同一份轉換，不會出現兩套路徑口徑。
 */
export const pagePathOfLink = (link: string): string => {
  let path = link.replace(/\.md$/, ".html");

  if (path.endsWith("/README.html")) path = path.slice(0, -"README.html".length);
  else if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length);

  return path;
};

/** 依 sidebar.ts 的鍵長排序，讓最長的（最具體的）根優先命中 */
const roots = Object.keys(sidebar).sort((a, b) => b.length - a.length);

/**
 * 側邊欄中每個頁面的完整導覽鏈，最後一項是頁面自身。
 *
 * 分組層（如「自然環境」「宋代」）沒有對應頁面，只寫進文字鏈；
 * 同一頁面若出現多處，取側邊欄順序中的第一次。
 */
const sidebarTrails = (
  titleOf: (path: string) => string | undefined,
): Map<string, TrailItem[]> => {
  const trails = new Map<string, TrailItem[]>();

  const visit = (nodes: (SidebarNode | string)[], chain: TrailItem[]): void => {
    for (const node of nodes) {
      const item: SidebarNode = typeof node === "string" ? { link: node } : node;
      const path = item.link ? pagePathOfLink(item.link) : undefined;
      const text = item.text ?? (path ? titleOf(path) : undefined);
      const next = text ? [...chain, { text, link: path }] : chain;

      if (path && text && !trails.has(path)) trails.set(path, next);
      if (item.children) visit(item.children, next);
    }
  };

  for (const root of roots) {
    // 非 "/" 的側邊欄根（如 /project/ay1928）補上該專題首頁作為第一層
    const index = `${root}/`;
    const title =
      root === "/" ? undefined : (titleOf(index) ?? titleOf(`${root}.html`));

    visit(
      (sidebar as Record<string, SidebarNode[]>)[root] ?? [],
      title ? [{ text: title, link: index }] : [],
    );
  }

  return trails;
};

/** 上一層目錄，如 /a/b/c.html → /a/b/ → /a/ → / */
const parentDir = (dir: string): string =>
  dir.replace(/\/$/, "").replace(/[^/]*$/, "");

/** 兩個路徑共有的目錄層數，用來在多個可能的上一級中挑最接近的 */
const sharedDepth = (a: string, b: string): number => {
  const left = a.split("/").slice(0, -1);
  const right = b.split("/").slice(0, -1);
  let depth = 0;

  while (depth < left.length && depth < right.length && left[depth] === right[depth]) {
    depth += 1;
  }

  return depth;
};

/** 兩條祖先鏈的共同前綴，用於「頁面不在側邊欄時」退到所屬章節 */
const commonPrefix = (chains: TrailItem[][]): TrailItem[] => {
  if (!chains.length) return [];

  const [first, ...rest] = chains;
  let size = first.length;

  for (const chain of rest) {
    let i = 0;
    while (i < size && i < chain.length && chain[i].text === first[i].text) i += 1;
    size = i;
  }

  return first.slice(0, size);
};

/**
 * 頁面的祖先鏈（不含自身與首頁）。依次嘗試：
 * 1. 頁面本身在側邊欄中：取其鏈（去掉自身）
 * 2. 頁面是某個側邊欄頁面的下層（如專題內的單篇報道）：接到該頁之後
 * 3. 沒有 URL 上的上下層關係：取連到本頁的側邊欄頁面作上一級，
 *    多個候選時取目錄最接近者，同分則依側邊欄順序
 * 4. 仍找不到：退到所在目錄所屬的章節
 */
/**
 * 每個 app 只建立一次的尋徑索引。
 *
 * 先前每算一個頁面的麵包屑就重新 filter + sort 全部 trail 鍵，並逐層
 * 掃描整份 trails 取共同前綴。改為預先排序祖先前綴、快取各目錄的共同
 * 前綴後，單頁只需走一份已排序索引。
 */
interface TrailIndex {
  trails: Map<string, TrailItem[]>;
  parents: Map<string, string[]>;
  /** 依鍵長遞減，find 第一個符合者即最長（最具體）的祖先 */
  ancestors: { key: string; prefix: string }[];
  chainForDir: (dir: string) => TrailItem[];
}

const buildTrail = (path: string, index: TrailIndex): TrailItem[] => {
  const own = index.trails.get(path);
  if (own) return own.slice(0, -1);

  const ancestor = index.ancestors.find(({ prefix }) =>
    path.startsWith(prefix),
  )?.key;
  if (ancestor) return index.trails.get(ancestor) ?? [];

  const candidates = index.parents.get(path) ?? [];
  if (candidates.length) {
    const parent = candidates.reduce((best, item) =>
      sharedDepth(item, path) > sharedDepth(best, path) ? item : best,
    );

    return index.trails.get(parent) ?? [];
  }

  for (let dir = parentDir(path); dir && dir !== "/"; dir = parentDir(dir)) {
    const chain = index.chainForDir(dir);

    if (chain.length) return chain;
  }

  return [];
};

/** 每個 app 只算一次；routeMeta 與結構化資料共用同一份結果 */
const trailCache = new WeakMap<App, Map<string, TrailItem[]>>();

/**
 * 全站導覽鏈：頁面路徑 → 祖先鏈（含首頁，不含當前頁）。
 *
 * 抽成獨立函式而非只寫在鉤子裡，是因為 `@vuepress/plugin-seo` 的
 * `jsonLd` 在它自己的 `onInitialized` 中執行，而那比本外掛的同名鉤子更早，
 * 屆時 `routeMeta` 還是空的。改由呼叫方按需計算，兩邊就都拿得到同一份資料。
 */
export const breadcrumbTrails = (app: App): Map<string, TrailItem[]> => {
  const cached = trailCache.get(app);
  if (cached) return cached;

  const pages = new Map(app.pages.map((page) => [page.path, page]));
  const trails = sidebarTrails((path) => pages.get(path)?.title);

  // 報道類頁面放在年代目錄（如 /tropical-cyclone/1960s/），與所屬年份頁面
  // 沒有 URL 上的上下層關係，只能靠「哪一頁連到它」判斷上一級。
  const parents = new Map<string, string[]>();

  for (const path of trails.keys()) {
    for (const link of pages.get(path)?.links ?? []) {
      const target = link.absolute?.split("#")[0];
      if (!target) continue;

      const parent = pagePathOfLink(target);
      if (parent === path) continue;

      if (!parents.get(parent)?.includes(path)) pushTo(parents, parent, path);
    }
  }

  const ancestors = [...trails.keys()]
    .map((key) => ({ key, prefix: `${key.replace(/\.html$/, "")}/` }))
    .sort((a, b) => b.key.length - a.key.length);

  const chainCache = new Map<string, TrailItem[]>();
  const chainForDir = (dir: string): TrailItem[] => {
    const cached = chainCache.get(dir);
    if (cached !== undefined) return cached;

    const chain = commonPrefix(
      [...trails]
        .filter(([key]) => key.startsWith(dir))
        .map(([, trail]) => trail.slice(0, -1)),
    );

    chainCache.set(dir, chain);

    return chain;
  };

  const index: TrailIndex = { trails, parents, ancestors, chainForDir };
  const result = new Map<string, TrailItem[]>();

  for (const page of app.pages) {
    // 專題首頁會以自己作為第一層，需去掉指向本頁的層級，否則出現自我連結
    const trail = [HOME, ...buildTrail(page.path, index)].filter(
      (item) => item.link !== page.path,
    );

    // 只有首頁一層的路徑沒有資訊量，寧可不顯示
    if (trail.length > 1) result.set(page.path, trail);
  }

  trailCache.set(app, result);

  return result;
};

/**
 * 把中文路徑寫進每頁的 routeMeta，供 PageBreadCrumb 讀取。
 * 必須在 onInitialized（全部頁面已建立、標題已解析）之後、
 * prepareRoutes（讀取 routeMeta）之前完成，故選用此鉤子。
 */
export const breadcrumbPlugin = (): Plugin => ({
  name: "breadcrumb-trail",

  onInitialized(app: App) {
    const trails = breadcrumbTrails(app);

    for (const page of app.pages) {
      const trail = trails.get(page.path);

      if (trail) page.routeMeta.breadcrumbTrail = trail;
    }
  },
});
