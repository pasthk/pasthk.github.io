import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import type { App, Page, Plugin } from "vuepress/core";
import { success, warn } from "vuepress/utils";

import { chapterOfPath, pathSegments } from "../chapters.js";
import { citationOf } from "../page-meta.js";
import { HOST, SITE_NAME, SITE_NAME_EN } from "../site.js";
import {
  buildCardSvg,
  CARD_FONT_FAMILY,
  type CardContent,
} from "./card.js";
import { ogFileName } from "./paths.js";

const HOME_CARD_META = "香港歷史文獻索引";

const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), "fonts");

const FONT_FILES = [
  join(FONT_DIR, "noto-serif-tc-400.ttf"),
  join(FONT_DIR, "noto-serif-tc-700.ttf"),
];

function metaFromReferenceBox(raw: string): string | undefined {
  const text = citationOf(raw);

  if (!text) return undefined;

  const parts = text
    .replace(/。\s*$/, "")
    .split(/[，,]/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts.join(" · ") : undefined;
}

function firstClause(description: string): string | undefined {
  const clause = description.split(/[，。；：]/)[0]?.trim();

  if (!clause) return undefined;

  return clause.length > 46 ? `${clause.slice(0, 45)}…` : clause;
}

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function buildContent(
  page: Page,
  raw: string,
  childCount: number,
): CardContent {
  if (page.path === "/") {
    return {
      title: SITE_NAME,
      meta: HOME_CARD_META,
      header: SITE_NAME_EN,
    };
  }

  if (page.path === "/404.html") {
    return { title: "找不到頁面", meta: "404 Not Found" };
  }

  const meta =
    metaFromReferenceBox(raw) ??
    (childCount > 0 ? `收錄 ${childCount} 篇文獻` : undefined) ??
    (typeof page.frontmatter.datePublished === "string"
      ? page.frontmatter.datePublished
      : undefined) ??
    firstClause(page.frontmatter.description ?? "");

  const section = chapterOfPath(page.path);
  const title = clean(page.title) || SITE_NAME;

  return {
    title,
    meta: meta ? clean(meta) : undefined,
    section: section === title ? undefined : section,
  };
}

async function fontOptions() {
  const present = await Promise.all(
    FONT_FILES.map(async (file) => {
      try {
        await access(file);

        return file;
      } catch {
        return null;
      }
    }),
  );

  if (present.every(Boolean)) {
    return {
      fontFiles: present as string[],
      loadSystemFonts: false,
      defaultFontFamily: CARD_FONT_FAMILY,
    };
  }

  warn(
    `OG 卡片：缺少子集字型（${FONT_DIR}），改用建置機器的系統字型，字重與字形可能與設計不符`,
  );

  return { loadSystemFonts: true };
}

async function loadCoverage(): Promise<Set<number> | undefined> {
  try {
    const raw = await readFile(join(FONT_DIR, "coverage.json"), "utf8");

    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return undefined;
  }
}

export const ogImagePlugin = (): Plugin => ({
  name: "og-image-generator",

  async onGenerated(app: App): Promise<void> {
    const outDir = app.dir.dest("og");

    await mkdir(outDir, { recursive: true });

    const coverage = await loadCoverage();
    const uncovered: string[] = [];

    const knownPaths = new Set(app.pages.map((page) => page.path));
    const childCounts = new Map<string, number>();

    for (const page of app.pages) {
      const segments = pathSegments(page.path);

      for (let depth = 1; depth < segments.length; depth += 1) {
        const base = segments.slice(0, depth).join("/");

        for (const candidate of [`/${base}/`, `/${base}.html`]) {
          if (!knownPaths.has(candidate)) continue;

          childCounts.set(candidate, (childCounts.get(candidate) ?? 0) + 1);
        }
      }
    }

    const font = await fontOptions();

    const pages = app.pages.filter((page) => page.frontmatter.sitemap !== false);

    const raws = await Promise.all(
      pages.map(async (page): Promise<string> => {
        try {
          return page.filePath ? await readFile(page.filePath, "utf8") : "";
        } catch {
          return "";
        }
      }),
    );

    let total = 0;

    for (const [index, page] of pages.entries()) {
      const content = buildContent(
        page,
        raws[index],
        childCounts.get(page.path) ?? 0,
      );

      if (coverage) {
        const text = [content.title, content.meta, content.section, content.header]
          .filter(Boolean)
          .join("");
        const gaps = [...new Set(text)].filter(
          (char) => !coverage.has(char.codePointAt(0) as number),
        );

        if (gaps.length) uncovered.push(`${page.path} → ${gaps.join("")}`);
      }

      const svg = buildCardSvg({ header: SITE_NAME, footer: HOST, ...content });

      const png = new Resvg(svg, { background: "#ffffff", font })
        .render()
        .asPng();

      await writeFile(join(outDir, ogFileName(page.path)), png);

      total += png.length;
    }

    const mode = "fontFiles" in font ? "子集字型" : "系統字型";
    const skipped = app.pages.length - pages.length;
    const skipNote = skipped > 0 ? `，跳過 ${skipped} 個空殼頁` : "";

    success(
      `生成 ${pages.length} 張 PNG（${mode}，共 ${Math.round(total / 1024)} KB${skipNote}）→ ${outDir}`,
    );

    if (uncovered.length) {
      warn(
        `OG 卡片有 ${uncovered.length} 頁用到子集字型以外的字元，會顯示為方框。` +
          `請執行 npm run docs:og-fonts 重建子集後再建置：\n  ${uncovered.join("\n  ")}`,
      );
    }
  },
});
