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

  dropCache = listMarkdown(SRC_DIR).every((file) => {
    const text = readFileSync(file, "utf8");

    return !USAGE_MARKERS.some((marker) => marker.test(text));
  });

  return dropCache;
}

export function dropUnusedStyles(): Plugin {
  return {
    name: "pasthk:drop-unused-styles",
    enforce: "pre",
    transform(_code, id) {
      if (!shouldDrop()) return null;

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
