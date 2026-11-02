import type { App, Plugin } from "vuepress/core";

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

/** 側邊欄中每個可達頁面的祖先鏈 */
interface SidebarEntry {
  path: string;
  text: string;
  chain: TrailItem[];
}

const HOME: TrailItem = { text: "首頁", link: "/" };

/** 側邊欄的 link 是 .md 路徑，頁面的 path 是 .html 路徑，兩者要先對齊 */
const toPagePath = (link: string): string => {
  let path = link.replace(/\.md$/, ".html");

  if (path.endsWith("/README.html")) path = path.slice(0, -"README.html".length);
  else if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length);

  return path;
};

/** 依 sidebar.ts 的鍵長排序，讓最長的（最具體的）根優先命中 */
const roots = Object.keys(sidebar).sort((a, b) => b.length - a.length);

const rootOf = (path: string): string =>
  roots.find(
    (root) => root !== "/" && (path === root || path.startsWith(`${root}/`)),
  ) ?? "/";

/** 攤平側邊欄，記下每個頁面的祖先鏈 */
const flatten = (
  titleOf: (path: string) => string | undefined,
): SidebarEntry[] => {
  const entries: SidebarEntry[] = [];

  const visit = (nodes: (SidebarNode | string)[], chain: TrailItem[]) => {
    for (const node of nodes) {
      const item: SidebarNode = typeof node === "string" ? { link: node } : node;
      const path = item.link ? toPagePath(item.link) : null;
      const text = item.text ?? (path ? titleOf(path) : undefined);

      if (path && text) entries.push({ path, text, chain });

      if (item.children) {
        visit(
          item.children,
          text ? [...chain, { text, link: path ?? undefined }] : chain,
        );
      }
    }
  };

  for (const root of roots) {
    visit((sidebar as Record<string, SidebarNode[]>)[root] ?? [], []);
  }

  return entries;
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

/**
 * 頁面 → 連到它的側邊欄頁面。
 * 報道類頁面放在年代目錄（如 /tropical-cyclone/1960s/），與所屬年份頁面
 * 沒有 URL 上的上下層關係，只能靠「哪一頁連到它」判斷上一級。
 */
const buildParentIndex = (
  entries: SidebarEntry[],
  linksOf: (path: string) => string[],
): Map<string, SidebarEntry[]> => {
  const index = new Map<string, SidebarEntry[]>();

  for (const entry of entries) {
    for (const link of linksOf(entry.path)) {
      if (link === entry.path) continue;

      const list = index.get(link) ?? [];
      if (!list.some((item) => item.path === entry.path)) list.push(entry);
      index.set(link, list);
    }
  }

  return index;
};

const buildTrail = (
  path: string,
  entries: SidebarEntry[],
  parents: Map<string, SidebarEntry[]>,
): TrailItem[] => {
  if (path === "/") return [];

  const root = rootOf(path);
  const scoped = entries.filter((entry) => rootOf(entry.path) === root);

  // 1. 頁面本身在側邊欄中：取其祖先鏈（不含當前頁）
  const exact = scoped.find((entry) => entry.path === path);
  if (exact) return [HOME, ...exact.chain];

  // 2. 頁面是某個側邊欄頁面的下層（如專題內的單篇報道）：接到該專題頁之後
  const nested = scoped
    .filter((entry) => path.startsWith(`${entry.path.replace(/\.html$/, "")}/`))
    .sort((a, b) => b.path.length - a.path.length);
  if (nested.length) {
    const [parent] = nested;
    return [HOME, ...parent.chain, { text: parent.text, link: parent.path }];
  }

  // 3. 沒有 URL 上的上下層關係：取連到本頁的側邊欄頁面作上一級，
  //    多個候選時取目錄最接近者，同分則依側邊欄順序
  const candidates = parents.get(path) ?? [];
  if (candidates.length) {
    const parent = candidates.reduce((best, item) =>
      sharedDepth(item.path, path) > sharedDepth(best.path, path) ? item : best,
    );
    return [HOME, ...parent.chain, { text: parent.text, link: parent.path }];
  }

  // 4. 仍找不到：退到所在目錄所屬的章節
  let dir = parentDir(path);
  while (dir && dir !== "/") {
    const chain = commonPrefix(
      scoped
        .filter((entry) => entry.path.startsWith(dir))
        .map((entry) => entry.chain),
    );
    if (chain.length) return [HOME, ...chain];
    dir = parentDir(dir);
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

  const titles = new Map<string, string>();
  const links = new Map<string, string[]>();

  for (const page of app.pages) {
    titles.set(page.path, page.title);
    links.set(
      page.path,
      page.links
        .map((link) => link.absolute?.split("#")[0])
        .filter((link): link is string => Boolean(link))
        .map(toPagePath),
    );
  }

  const titleOf = (path: string) => titles.get(path);
  const entries = flatten(titleOf);
  const parents = buildParentIndex(entries, (path) => links.get(path) ?? []);

  // 非 "/" 的側邊欄根（如 /project/ay1928）補上該專題首頁作為第一層
  const rootTitles = new Map<string, TrailItem>();
  for (const root of roots) {
    if (root === "/") continue;
    const indexPath = `${root}/`;
    const title = titleOf(indexPath) ?? titleOf(`${root}.html`);
    if (title) rootTitles.set(root, { text: title, link: indexPath });
  }

  const trails = new Map<string, TrailItem[]>();

  for (const page of app.pages) {
    const trail = buildTrail(page.path, entries, parents);
    const root = rootOf(page.path);
    const rootItem = rootTitles.get(root);
    // 專題首頁自己不列入路徑，否則會出現指向本頁的自我連結
    const isRootIndex = page.path === `${root}/`;
    const full =
      rootItem && !isRootIndex && trail.length
        ? [HOME, rootItem, ...trail.slice(1)]
        : trail;

    // 只有首頁一層的路徑沒有資訊量，寧可不顯示
    if (full.length > 1) trails.set(page.path, full);
  }

  trailCache.set(app, trails);

  return trails;
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
