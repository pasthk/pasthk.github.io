import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { App, Page, Plugin } from "vuepress/core";
import { success, warn } from "vuepress/utils";

import { buildCardSvg, type CardContent, type EmbeddedFonts } from "./card.js";
import { needsPng, ogFileName } from "./paths.js";
import { setPngAvailable } from "./state.js";

/** sharp 的建構子型別，用於動態載入時標註變數型別。 */
type Sharp = typeof import("sharp").default;

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

const SITE_TAGLINE = "1890–1990 年代香港舊報紙與歷史文獻索引";

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
      header: "Hong Kong Documents",
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

/**
 * 讀入字型子集並轉成 base64。
 *
 * 這些字型是 Noto Serif TC（SIL Open Font License 1.1，可自由使用與散布）
 * 以 fontTools 依本站實際用到的字元子集化後的結果。
 *
 * 為什麼要內嵌：CI runner（ubuntu-24.04）沒有安裝中文字型，
 * 渲染器會把中文畫成方框（tofu）。內嵌後不依賴系統字型，
 * 本機與 CI 的產出完全一致。
 */
async function loadEmbeddedFonts(): Promise<EmbeddedFonts | undefined> {
  try {
    const [bold, regular] = await Promise.all([
      readFile(join(FONT_DIR, "noto-serif-tc-700.ttf")),
      readFile(join(FONT_DIR, "noto-serif-tc-400.ttf")),
    ]);

    return {
      bold: bold.toString("base64"),
      regular: regular.toString("base64"),
    };
  } catch {
    // 沒有字型子集時仍可產出 PNG，只是中文會依渲染環境的字型決定，
    // 在沒有中文字型的機器上會變成方框。至少社群平台能顯示版面。
    warn("OG 卡片：找不到字型子集，PNG 的中文字形將依賴系統字型");

    return undefined;
  }
}

export const ogImagePlugin = (): Plugin => (app: App) => ({
  name: "og-image-generator",

  /**
   * 在頁面渲染之前就決定 PNG 能不能產出。
   *
   * theme 的 seo 外掛在 appPrepare 階段呼叫 ogp，而 onPrepared 是在
   * appPrepare 之後才執行——太晚了，那時 meta 標籤已經寫入。
   * onInitialized 在 appInit 階段執行，早於頁面準備，是正確的時機。
   *
   * 兩者必須一致，否則缺少 PNG 時 og:image 會指向 404。
   */
  async onInitialized(): Promise<void> {
    const fonts = await loadEmbeddedFonts();

    if (!fonts) {
      setPngAvailable(false);

      return;
    }

    try {
      await import("sharp");
      setPngAvailable(true);
    } catch {
      setPngAvailable(false);
      warn("OG 卡片：未安裝 sharp，og:image 將指向 SVG");
    }
  },

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

    const fonts = await loadEmbeddedFonts();

    // sharp 是原生模組，只在真的要產生 PNG 時才載入，
    // 避免沒有入口頁時也付出啟動成本。
    let sharp: Sharp | undefined;

    const pngPages = app.pages.filter((page) => needsPng(page.path));

    if (pngPages.length > 0 && fonts) {
      try {
        sharp = (await import("sharp")).default;
      } catch {
        warn("OG 卡片：未安裝 sharp，略過 PNG 產生（og:image 將指向 SVG）");
      }
    }

    await Promise.all(
      app.pages.map(async (page) => {
        let raw = "";

        try {
          raw = page.filePath
            ? await readFile(page.filePath, "utf8")
            : "";
        } catch {
          raw = "";
        }

        const content = buildContent(page, raw, childCounts.get(page.path) ?? 0);

        // 所有頁面都產出 SVG：體積小（約 2 KB），Google 的結構化資料與
        // 圖片搜尋都接受 SVG 格式。
        const svg = buildCardSvg(content);

        await writeFile(join(outDir, ogFileName(page.path)), svg, "utf8");

        // 社群平台不支援 SVG，另外產出 PNG 版本並內嵌字型。
        if (sharp && needsPng(page.path)) {
          const withFont = buildCardSvg(content, fonts);

          const png = await sharp(Buffer.from(withFont))
            .png({ compressionLevel: 9 })
            .toBuffer();

          await writeFile(join(outDir, ogFileName(page.path, "png")), png);
        }
      }),
    );

    success(`OG 卡片已產生 ${app.pages.length} 張 SVG → ${outDir}`);

    if (pngPages.length > 0 && sharp) {
      success(`OG 卡片已產生 ${pngPages.length} 張 PNG（社群平台用）`);
    }
  },
});
