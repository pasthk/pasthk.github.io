import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { App, Page, Plugin } from "vuepress/core";
import { success, warn } from "vuepress/utils";

import { buildCardSvg, type CardContent } from "./card.js";
import { GlyphRenderer } from "./glyphs.js";
import { ogFileName } from "./paths.js";

/** 章節名稱，顯示在卡片右上角 */
const SECTION_NAMES: Record<string, string> = {
  archaeology: "香港考古",
  custom: "傳統節慶與打醮",
  education: "香港教育史",
  "historic-building": "歷史建築",
  legislation: "香港法例",
  project: "專題研究",
  "public-health": "公共衛生史",
  "stele-inscription": "碑刻",
  "tropical-cyclone": "熱帶氣旋與風球",
};

const SITE_TAGLINE = "香港歷史文獻索引";

const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), "fonts");

function sectionOf(pagePath: string): string | undefined {
  const [first] = pagePath.split("/").filter(Boolean);

  return first ? SECTION_NAMES[first] : undefined;
}

/** 引用框內容為「報刊，日期，版次。」，改寫為卡片上的「報刊 · 日期 · 版次」 */
function metaFromReferenceBox(raw: string): string | undefined {
  const matched = /<ReferenceBox>([\s\S]*?)<\/ReferenceBox>/.exec(raw);

  if (!matched) return undefined;

  const parts = matched[1]
    .trim()
    .replace(/。\s*$/, "")
    .split(/[，,]/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts.join(" · ") : undefined;
}

/** 取描述的第一個短句，避免在卡片上出現被硬生生截斷的半句 */
function firstClause(description: string): string | undefined {
  const clause = description.split(/[，。；：]/)[0]?.trim();

  if (!clause) return undefined;

  return clause.length > 46 ? `${clause.slice(0, 45)}…` : clause;
}

/** YAML 多行值（description、ReferenceBox）可能帶換行，先壓成單一空白 */
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
      title: "香港文獻類編",
      meta: SITE_TAGLINE,
      header: "Thematic Compilation of Hong Kong Archives",
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

  return {
    title: clean(page.title) || "香港文獻類編",
    meta: meta ? clean(meta) : undefined,
    section: sectionOf(page.path),
  };
}

export const ogImagePlugin = (): Plugin => (app: App) => ({
  name: "og-image-generator",

  async onGenerated(app: App): Promise<void> {
    const outDir = app.dir.dest("og");

    await mkdir(outDir, { recursive: true });

    // 子頁數量：路徑為 /a/b.html 的頁面，其子頁是 /a/b/ 底下的所有頁面。
    const childCounts = new Map<string, number>();

    for (const page of app.pages) {
      const segments = page.path.split("/").filter(Boolean);

      if (segments.length < 2) continue;

      const parentPath = `/${segments.slice(0, -1).join("/")}.html`;

      childCounts.set(parentPath, (childCounts.get(parentPath) ?? 0) + 1);
    }

    const renderer = await GlyphRenderer.load(FONT_DIR);

    if (!renderer) {
      warn(
        "OG 卡片：找不到字型子集，文字將以 <text> 輸出（社群平台可能顯示異常）",
      );
    }

    let total = 0;

    for (const page of app.pages) {
      let raw = "";

      try {
        raw = page.filePath ? await readFile(page.filePath, "utf8") : "";
      } catch {
        raw = "";
      }

      const content = buildContent(page, raw, childCounts.get(page.path) ?? 0);

      // 每張卡片重新收集字形，避免上一張的字形留在 defs 裡。
      renderer?.reset();

      const svg = buildCardSvg(content, renderer);

      await writeFile(join(outDir, ogFileName(page.path)), svg, "utf8");

      total += svg.length;
    }

    const mode = renderer ? "文字已轉為路徑" : "文字未轉路徑";

    success(
      `生成 ${app.pages.length} 張 SVG（${mode}，共 ${Math.round(total / 1024)} KB）→ ${outDir}`,
    );
  },
});
