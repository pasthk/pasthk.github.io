// OG 分享卡片的 SVG 產生器。
//
// 輸出用 <text> 直接寫字，不再把文字轉成 <path>：卡片最終是 PNG，
// 由建置時的 resvg 用 og/fonts/ 內的子集字型光柵化，字型已經被「烤」進點陣圖，
// 不需要再為「觀看端有沒有中文字型」做準備。轉路徑那套（glyphs.ts）因此移除。
//
// 前提是光柵化時必須載入同一份子集字型（見 plugin.ts 的 font 選項），
// 否則 <text> 會退回系統字型，字重與字形都會走樣。

import { HOST, SITE_NAME } from "../site.js";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 1200;

/**
 * 卡片使用的字型家族名，必須與 og/fonts/ 內子集字型的 name table 一致。
 *
 * 名稱帶 ExtraLight 是因為子集取自 Noto Serif TC 可變字型的預設實例，
 * 實際字重由 font-weight（400／700）決定，兩份檔案分別是 Regular 與 Bold。
 */
export const CARD_FONT_FAMILY = "Noto Serif TC ExtraLight";

const COLOR = {
  bg: "#ffffff",
  ink: "#1a1a1a",
  muted: "#6b6459",
  accent: "#0f5132",
  rule: "#d8d2c4",
};

const PAD_LEFT = 96;
const PAD_RIGHT = 96;
const CONTENT_WIDTH = CARD_WIDTH - PAD_LEFT - PAD_RIGHT;

// 換行時留一成餘裕，避免量測誤差讓最後一個字溢出到畫布外。
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
 * 不截斷會直接衝出畫布右緣。SVG 的 <text> 不會自動換行，
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

/** 一段文字。字型由光柵化階段的 font 選項提供，這裡只寫家族名。 */
function draw(
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
  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `font-family="${CARD_FONT_FAMILY}"`,
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

/** 產生卡片 SVG。呼叫端負責光柵化（見 plugin.ts）。 */
export function buildCardSvg({
  title,
  meta,
  section,
  header = SITE_NAME,
  footer = HOST,
}: CardContent): string {
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
  const zoneBottom = 1080;
  const blockHeight = titleBlockHeight + metaBlockHeight;
  const titleTop =
    (zoneTop + zoneBottom) / 2 - blockHeight / 2 + lineHeight * 0.72;

  const headerMarkup = draw(header, {
    x: PAD_LEFT,
    y: 98,
    size: 30,
    weight: 700,
    fill: COLOR.accent,
    letterSpacing: 5,
  });

  const sectionMarkup = section
    ? draw(section, {
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
      draw(line, {
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
    ? draw(truncate(meta, 32, CONTENT_WIDTH), {
        x: PAD_LEFT,
        y: metaY,
        size: 32,
        fill: COLOR.muted,
      })
    : "";

  const footerMarkup = draw(footer, {
    x: PAD_LEFT,
    y: 1130,
    size: 24,
    fill: COLOR.muted,
    letterSpacing: 2,
  });

  const taglineMarkup = draw("認識香港，從文獻開始", {
    x: CARD_WIDTH - PAD_RIGHT,
    y: 1130,
    size: 24,
    fill: COLOR.muted,
    letterSpacing: 2,
    anchor: "end",
  });

  // <title> 與 aria-label 同時服務無障礙工具與讀取 SVG 原始碼的 AI 爬蟲。
  // 這是唯一保留純文字的地方——它不會被渲染成圖形，也不影響版面。
  const accessibleTitle = escapeXml(meta ? `${title} — ${meta}` : title);

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-label="${accessibleTitle}">
<title>${accessibleTitle}</title>
<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${COLOR.bg}"/>
<rect x="0" y="0" width="14" height="${CARD_HEIGHT}" fill="${COLOR.accent}"/>
${headerMarkup}
${sectionMarkup}
<line x1="${PAD_LEFT}" y1="132" x2="${CARD_WIDTH - PAD_RIGHT}" y2="132" stroke="${COLOR.rule}" stroke-width="1.5"/>
${titleMarkup}
${metaMarkup}
<line x1="${PAD_LEFT}" y1="1080" x2="${CARD_WIDTH - PAD_RIGHT}" y2="1080" stroke="${COLOR.rule}" stroke-width="1.5"/>
${footerMarkup}
${taglineMarkup}
</svg>`;
}
