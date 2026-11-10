import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import type { App, Page, Plugin } from "vuepress/core";
import { success, warn } from "vuepress/utils";

import { chapterOfPath, pathSegments } from "../chapters.js";
import { referenceBoxText } from "../page-meta.js";
import { SITE_NAME, SITE_NAME_EN } from "../site.js";
import {
  buildCardSvg,
  CARD_FONT_FAMILY,
  type CardContent,
} from "./card.js";
import { ogFileName } from "./paths.js";

/** 首頁卡片標題下的說明；與 site.ts 的 SITE_TAGLINE（頁腳標語）不同 */
const HOME_CARD_META = "香港歷史文獻索引";

const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), "fonts");

/** 子集字型：Regular 與 Bold 兩份，家族名相同、字重不同 */
const FONT_FILES = [
  join(FONT_DIR, "noto-serif-tc-400.ttf"),
  join(FONT_DIR, "noto-serif-tc-700.ttf"),
];

/** 引用框內容為「報刊，日期，版次。」，改寫為卡片上的「報刊 · 日期 · 版次」 */
function metaFromReferenceBox(raw: string): string | undefined {
  const text = referenceBoxText(raw);

  if (!text) return undefined;

  const parts = text
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
    // 章節落地頁的標題就是章節名，右上角再標一次只會重複
    section: section === title ? undefined : section,
  };
}

/**
 * 光柵化參數。
 *
 * 卡片 SVG 用 <text> 寫字，字型必須在這裡指定，否則 resvg 會退回系統字型
 * （建置機器若沒有中文襯線體，字重與字形都會走樣）。缺檔時退回系統字型並示警，
 * 讓建置繼續完成而不是整批失敗。
 */
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

/**
 * 子集字型涵蓋的碼位，由 scripts/build-og-fonts.py 產生。
 *
 * 子集是「產生當下」全站用字的快照。之後新增的史料若帶來沒見過的字
 * （例如標題裡的「尸」「屛」），resvg 會把它畫成 .notdef 方框，
 * 而建置本身不會失敗——卡片照樣產出，只是分享出去才看得出壞掉。
 * 這裡逐字比對，把缺字寫進建置日誌，讓問題在本地就看得見。
 * 檔案不存在（尚未重建過字型）時跳過檢查。
 */
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

    // 子頁數量：路徑為 /a/b.html 的頁面，其子頁是 /a/b/ 底下的所有頁面。
    const childCounts = new Map<string, number>();

    for (const page of app.pages) {
      const segments = pathSegments(page.path);

      if (segments.length < 2) continue;

      const parentPath = `/${segments.slice(0, -1).join("/")}.html`;

      childCounts.set(parentPath, (childCounts.get(parentPath) ?? 0) + 1);
    }

    const font = await fontOptions();

    // 空殼頁（只有標題、無正文）已設 sitemap: false 與 noindex，不會出現在搜尋結果，
    // 也就不會被分享，卡片永遠用不到。仍計入 childCounts，父頁的「收錄 N 篇」才不會少算。
    const pages = app.pages.filter((page) => page.frontmatter.sitemap !== false);

    // 先平行讀入所有原始 Markdown；光柵化本身是同步 CPU 工作，維持逐頁處理，
    // 但不再讓每頁各自等一次磁碟 I/O。
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

      const svg = buildCardSvg(content);

      // 社群平台一律不接受 SVG 作 og:image，必須光柵化。
      // 卡片自帶白底 rect，這裡的 background 只是保險。
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
