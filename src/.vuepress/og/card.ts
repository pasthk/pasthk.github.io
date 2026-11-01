// OG 分享卡片的 SVG 產生器。
//
// 預設走「文字轉路徑」模式：傳入 GlyphRenderer 時，卡片上所有文字都會
// 被換成 <path>，輸出檔不含任何 <text>，因此不需要字型也能在任何裝置、
// 任何平台上正確顯示（詳見 glyphs.ts 的說明）。
//
// 未傳入 renderer 時退回 <text> 輸出，僅作為字型載入失敗時的降級方案——
// 那種情況下圖形仍然正確，只是文字依賴觀看端有沒有安裝中文字型。

import type { GlyphRenderer } from "./glyphs.js";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const COLOR = {
  bg: "#ffffff",
  ink: "#1a1a1a",
  muted: "#6b6459",
  accent: "#0f5132",
  rule: "#d8d2c4",
};

// 降級模式下依序退回本機可用的襯線體。
const SERIF =
  "'Songti SC','Songti TC','Noto Serif TC','Noto Serif CJK TC','Source Han Serif TC',SimSun,serif";

const PAD_LEFT = 96;
const PAD_RIGHT = 96;
const CONTENT_WIDTH = CARD_WIDTH - PAD_LEFT - PAD_RIGHT;

// 各平台襯線體的字寬略有差異，換行時留一成餘裕，避免換到別的機器就溢出。
const WRAP_WIDTH = CONTENT_WIDTH * 0.9;

/** 中文與全形字約佔一個字身，拉丁字母較窄；只用於估算換行位置。 */
function charWidth(char: string, size: number): number {
  const code = char.codePointAt(0) ?? 0;

  if (code >= 0x2e80) return size;
  if (char === " ") return size * 0.28;
  if (/[iIl1.,'!:;|]/.test(char)) return size * 0.32;
  if (/[A-Z@#%&WM]/.test(char)) return size * 0.68;

  return size * 0.54;
}

// 行首不宜出現的標點，遇到時併回上一行，避免出現孤零零的逗號句號。
const NO_LINE_START = "、。，．：；！？）」』》】…·%";

/**
 * 依可用寬度截斷單行文字，超出時以省略號收尾。
 *
 * meta 由 ReferenceBox 改寫而來，少數條目（法案摘錄、文獻出處）特別長，
 * 不截斷會直接衝出畫布右緣。SVG 的 <text>／路徑都不會自動換行，
 * 因此必須在這裡先算好寬度。
 */
function truncate(text: string, size: number, maxWidth: number): string {
  const ellipsis = charWidth("…", size);
  let width = 0;
  let kept = "";

  for (const char of text) {
    const w = charWidth(char, size);

    if (width + w > maxWidth - ellipsis) {
      return `${kept}…`;
    }

    kept += char;
    width += w;
  }

  return text;
}

/** 估算一段文字的寬度。 */
function measure(text: string, size: number): number {
  let width = 0;

  for (const char of text) width += charWidth(char, size);

  return width;
}

function wrap(text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  let width = 0;

  // 最近一個半角空格的位置。拉丁文超寬時退回這裡斷行，
  // 避免把單詞切成兩半（英文標題曾出現「preserv / e heritage」）。
  // 中文沒有空格，這個值會維持 -1，仍照原本的逐字斷行。
  let breakAt = -1;

  for (const char of text) {
    const w = charWidth(char, size);

    if (width + w > maxWidth && line) {
      const latin = /[A-Za-z]/.test(char);

      if (latin && breakAt > 0) {
        const head = line.slice(0, breakAt).trimEnd();
        const tail = line.slice(breakAt).trimStart();

        if (head) lines.push(head);

        line = tail + char;
        width = measure(tail, size) + w;
        breakAt = -1;
        continue;
      }

      if (NO_LINE_START.includes(char)) {
        lines.push(line + char);
        line = "";
        width = 0;
        breakAt = -1;
        continue;
      }

      lines.push(line);
      line = char;
      width = w;
      breakAt = -1;
      continue;
    }

    line += char;
    width += w;

    if (char === " ") {
      breakAt = line.length;
    }
  }

  if (line) lines.push(line);

  return lines;
}

export interface CardContent {
  /** 卡片主標題，通常是頁面 title */
  title: string;
  /** 標題下的次要資訊，例如「華僑日報 · 1955年8月10日 · 第2張第1頁」 */
  meta?: string;
  /** 右上角的章節名稱 */
  section?: string;
  /** 左上角刊頭，預設為站名 */
  header?: string;
  /** 左下角網址 */
  footer?: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 一段文字，依是否提供 renderer 決定輸出 <path> 還是 <text>。 */
function draw(
  renderer: GlyphRenderer | undefined,
  text: string,
  {
    x,
    y,
    size,
    weight = 400,
    fill,
    letterSpacing = 0,
    anchor,
  }: {
    x: number;
    y: number;
    size: number;
    weight?: 400 | 700;
    fill: string;
    letterSpacing?: number;
    anchor?: "start" | "end";
  },
): string {
  if (renderer) {
    return renderer.text({ text, x, y, size, weight, fill, letterSpacing, anchor });
  }

  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `font-family="${SERIF}"`,
    `font-size="${size}"`,
    weight === 700 ? `font-weight="700"` : "",
    `fill="${fill}"`,
    letterSpacing ? `letter-spacing="${letterSpacing}"` : "",
    anchor === "end" ? `text-anchor="end"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `<text ${attrs}>${escapeXml(text)}</text>`;
}

/**
 * 產生卡片 SVG。
 *
 * 傳入 renderer 時所有文字都會轉成路徑；未傳入則退回 <text>。
 */
export function buildCardSvg(
  {
    title,
    meta,
    section,
    header = "香港文獻類編",
    footer = "www.pasthk.com",
  }: CardContent,
  renderer?: GlyphRenderer,
): string {
  // 標題由大到小試，取第一個能在三行內排完的字級。
  const sizes = [78, 70, 62, 54, 46];
  let fontSize = sizes[sizes.length - 1];
  let lines: string[] = [];

  for (const size of sizes) {
    const candidate = wrap(title, size, WRAP_WIDTH);
    fontSize = size;
    lines = candidate;
    if (candidate.length <= 3) break;
  }

  if (lines.length > 4) {
    lines = lines.slice(0, 4);
    const last = lines[3];
    lines[3] = `${last.slice(0, Math.max(0, last.length - 1))}…`;
  }

  const lineHeight = Math.round(fontSize * 1.32);
  const titleBlockHeight = lines.length * lineHeight;
  const metaGap = 62;
  const metaBlockHeight = meta ? metaGap : 0;
  // 標題與次要資訊作為一個整體，在 header 底線與 footer 頂線之間垂直居中。
  const zoneTop = 132;
  const zoneBottom = 540;
  const blockHeight = titleBlockHeight + metaBlockHeight;
  const titleTop =
    (zoneTop + zoneBottom) / 2 - blockHeight / 2 + lineHeight * 0.72;

  // 先渲染所有文字，defs() 才能收集到完整字形。
  const headerMarkup = draw(renderer, header, {
    x: PAD_LEFT,
    y: 98,
    size: 30,
    weight: 700,
    fill: COLOR.accent,
    letterSpacing: 5,
  });

  const sectionMarkup = section
    ? draw(renderer, section, {
        x: CARD_WIDTH - PAD_RIGHT,
        y: 98,
        size: 26,
        fill: COLOR.muted,
        letterSpacing: 1,
        anchor: "end",
      })
    : "";

  const titleMarkup = lines
    .map((line, index) =>
      draw(renderer, line, {
        x: PAD_LEFT,
        y: Math.round(titleTop + index * lineHeight),
        size: fontSize,
        weight: 700,
        fill: COLOR.ink,
        letterSpacing: 1,
      }),
    )
    .join("");

  const metaY = Math.round(titleTop + (lines.length - 1) * lineHeight + metaGap);

  const metaMarkup = meta
    ? draw(renderer, truncate(meta, 32, CONTENT_WIDTH), {
        x: PAD_LEFT,
        y: metaY,
        size: 32,
        fill: COLOR.muted,
      })
    : "";

  const footerMarkup = draw(renderer, footer, {
    x: PAD_LEFT,
    y: 590,
    size: 24,
    fill: COLOR.muted,
    letterSpacing: 2,
  });

  const taglineMarkup = draw(renderer, "認識香港，從文獻開始", {
    x: CARD_WIDTH - PAD_RIGHT,
    y: 590,
    size: 24,
    fill: COLOR.muted,
    letterSpacing: 2,
    anchor: "end",
  });

  const defs = renderer?.defs() ?? "";

  // <title> 與 aria-label 同時服務無障礙工具與讀取 SVG 原始碼的 AI 爬蟲。
  // 這是唯一保留文字的地方——它不會被渲染成圖形，也不影響跨平台顯示。
  const accessibleTitle = escapeXml(meta ? `${title} — ${meta}` : title);

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-label="${accessibleTitle}">
<title>${accessibleTitle}</title>
${defs}
<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${COLOR.bg}"/>
<rect x="0" y="0" width="14" height="${CARD_HEIGHT}" fill="${COLOR.accent}"/>
${headerMarkup}
${sectionMarkup}
<line x1="${PAD_LEFT}" y1="132" x2="${CARD_WIDTH - PAD_RIGHT}" y2="132" stroke="${COLOR.rule}" stroke-width="1.5"/>
${titleMarkup}
${metaMarkup}
<line x1="${PAD_LEFT}" y1="540" x2="${CARD_WIDTH - PAD_RIGHT}" y2="540" stroke="${COLOR.rule}" stroke-width="1.5"/>
${footerMarkup}
${taglineMarkup}
</svg>`;
}
