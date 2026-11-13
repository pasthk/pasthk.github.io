import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Plugin } from "vite";
import type { App, Plugin as VuePressPlugin } from "vuepress/core";


const SRC_DIR = fileURLToPath(new URL("../", import.meta.url));

const DROP_PATHS = [
  /\/vuepress-theme-hope\/dist\/client\/styles\/home\/[^/]+\.scss$/u,
  /\/vuepress-theme-hope\/dist\/client\/styles\/blog\/[^/]+\.scss$/u,
  /\/@vuepress\/plugin-markdown-ext\/dist\/client\/styles\/tasklist\.css$/u,
  /\/@vuepress\/highlighter-helper\/dist\/client\/styles\/code-block-title\.css$/u,
  /\/@vuepress\/plugin-git\/dist\/Git(?:Changelog|Contributors)-[^/]+\.css$/u,
];

const USAGE_MARKERS: RegExp[] = [
  /^home:\s*true/mu,
  /^portfolio:\s*true/mu,
  /^blog:\s*true/mu,
  /^hero(?:Text|Image|FullScreen):/mu,
  /^features:/mu,
  /^changelog:\s*true/mu,
  /^contributors:\s*true/mu,
  /^```/mu,
  /^-\s+\[[ xX]\]/mu,
  /<GitChangelog\b/u,
];

/* 合併為單一正則：原本每個檔案要跑 10 次全文掃描，現在只需 1 次 */
const USAGE_PATTERN = new RegExp(
  USAGE_MARKERS.map((marker) => `(?:${marker.source})`).join("|"),
  "mu",
);

const DROPPED_CLASS_TOKENS = [
  "vp-hero",
  "vp-feature",
  "vp-highlight",
  "vp-home",
  "vp-portfolio",
  "vp-blog",
  "vp-article",
  "page-category",
  "page-tag",
  "vp-blogger",
  "vp-timeline",
  "task-list-",
  "code-block-title",
  "code-block-with-title",
  "vp-changelog",
  "vp-git-contributors",
];

/* 先以單一正則篩掉絕大多數乾淨頁面；命中時才逐項細查，結果與原本一致 */
const DROPPED_CLASS_PATTERN = new RegExp(DROPPED_CLASS_TOKENS.join("|"), "u");

function listMarkdown(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const path = join(dir, entry.name);

    if (entry.isDirectory()) files.push(...listMarkdown(path));
    else if (extname(entry.name) === ".md") files.push(path);
  }

  return files;
}

let dropCache: boolean | undefined;

function shouldDrop(): boolean {
  if (dropCache !== undefined) return dropCache;

  dropCache = listMarkdown(SRC_DIR).every(
    (file) => !USAGE_PATTERN.test(readFileSync(file, "utf8")),
  );

  return dropCache;
}

export function dropUnusedStyles(): Plugin {
  return {
    name: "pasthk:drop-unused-styles",
    enforce: "pre",
    transform(_code, id) {
      if (!shouldDrop()) return null;

      /* 目標檔全來自這兩個套件；其餘模組直接略過，省去路徑正規化與 5 次比對 */
      if (!id.includes("vuepress-theme-hope") && !id.includes("@vuepress/"))
        return null;

      const path = id.split("?", 1)[0].replaceAll("\\", "/");

      return DROP_PATHS.some((pattern) => pattern.test(path))
        ? { code: "", map: null }
        : null;
    },
  };
}

export function verifyDroppedStyles(): VuePressPlugin {
  return {
    name: "pasthk:verify-dropped-styles",

    onGenerated(app: App): void {
      if (!shouldDrop()) return;

      const offenders: string[] = [];

      const walk = (dir: string): void => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const path = join(dir, entry.name);

          if (entry.isDirectory()) {
            walk(path);
          } else if (entry.name.endsWith(".html")) {
            const html = readFileSync(path, "utf8");

            if (!DROPPED_CLASS_PATTERN.test(html)) continue;

            const found = DROPPED_CLASS_TOKENS.filter((token) =>
              html.includes(token),
            );

            if (found.length) offenders.push(`${path}: ${found.join(", ")}`);
          }
        }
      };

      walk(app.dir.dest());

      if (offenders.length) {
        throw new Error(
          `drop-unused-styles 已剝除樣式，但輸出 HTML 仍使用相關類別：\n${offenders
            .slice(0, 10)
            .join("\n")}\n請更新 drop-unused-styles.ts 的守衛或停用該外掛。`,
        );
      }
    },
  };
}
