import type { App, Plugin } from "vuepress/core";

import { pushTo } from "./map-utils.js";
import sidebar from "./sidebar.js";

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

export const pagePathOfLink = (link: string): string => {
  let path = link.replace(/\.md$/, ".html");

  if (path.endsWith("/README.html")) path = path.slice(0, -"README.html".length);
  else if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length);

  return path;
};

const roots = Object.keys(sidebar).sort((a, b) => b.length - a.length);

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

const parentDir = (dir: string): string =>
  dir.replace(/\/$/, "").replace(/[^/]*$/, "");

const sharedDepth = (a: string, b: string): number => {
  const left = a.split("/").slice(0, -1);
  const right = b.split("/").slice(0, -1);
  let depth = 0;

  while (depth < left.length && depth < right.length && left[depth] === right[depth]) {
    depth += 1;
  }

  return depth;
};

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

interface TrailIndex {
  trails: Map<string, TrailItem[]>;
  parents: Map<string, string[]>;
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

const trailCache = new WeakMap<App, Map<string, TrailItem[]>>();

export const breadcrumbTrails = (app: App): Map<string, TrailItem[]> => {
  const cached = trailCache.get(app);
  if (cached) return cached;

  const pages = new Map(app.pages.map((page) => [page.path, page]));
  const trails = sidebarTrails((path) => pages.get(path)?.title);

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
    const trail = [HOME, ...buildTrail(page.path, index)].filter(
      (item) => item.link !== page.path,
    );

    if (trail.length > 1) result.set(page.path, trail);
  }

  trailCache.set(app, result);

  return result;
};

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
