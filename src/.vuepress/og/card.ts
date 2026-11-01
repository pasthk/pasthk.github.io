// OG 分享卡片的 SVG 產生器。
// 只做純字串組裝，不依賴任何渲染器，也不嵌入字型檔——
// 文字交給瀏覽器以本機襯線體繪製，輸出的 SVG 只有兩三 KB。

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const COLOR = {
  bg: "#ffffff",
  ink: "#1a1a1a",
  muted: "#6b6459",
  accent: "#0f5132",
  rule: "#d8d2c4",
};

// 依序退回本機可用的襯線體：macOS 宋體 → 思源宋體 → Windows 新細明體 → 通用 serif。
const SERIF =
  "'Songti SC','Songti TC','Noto Serif TC','Noto Serif CJK TC','Source Han Serif TC',SimSun,serif";

// 內嵌字型時使用的字型名。librsvg 只認 SVG 內 @font-face 宣告的名稱，
// 不會去查系統已安裝的字型，因此兩套名稱分開處理。
const EMBEDDED_FONT = "NotoSerifTC";

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

function wrap(text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  let width = 0;

  for (const char of text) {
    const w = charWidth(char, size);

    if (width + w > maxWidth && line) {
      if (NO_LINE_START.includes(char)) {
        lines.push(line + char);
        line = "";
        width = 0;
        continue;
      }

      lines.push(line);
      line = char;
      width = w;
      continue;
    }

    line += char;
    width += w;
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

/**
 * 內嵌字型的 base64 資料。
 * 兩種字重各一段 base64 字串，由建置腳本在啟動時讀入。
 */
export interface EmbeddedFonts {
  bold: string;
  regular: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 產生 SVG。
 *
 * 傳入 `fonts` 時會把字型子集以 base64 內嵌進 <defs>，讓渲染器
 * （librvg／resvg）不依賴系統已安裝的字型——CI runner 預設沒有中文字型，
 * 不內嵌的話中文會渲染成方框。
 */
export function buildCardSvg(
  {
    title,
    meta,
    section,
    header = "香港文獻類編",
    footer = "www.pasthk.com",
  }: CardContent,
  fonts?: EmbeddedFonts,
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

  const fontFamily = fonts ? `${EMBEDDED_FONT},serif` : SERIF;

  const titleSpans = lines
    .map(
      (line, index) =>
        `<tspan x="${PAD_LEFT}" y="${Math.round(titleTop + index * lineHeight)}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  const metaY = Math.round(titleTop + (lines.length - 1) * lineHeight + metaGap);

  const metaBlock = meta
    ? `<text x="${PAD_LEFT}" y="${metaY}" font-family="${fontFamily}" font-size="32" fill="${COLOR.muted}">${escapeXml(meta)}</text>`
    : "";

  const sectionBlock = section
    ? `<text x="${CARD_WIDTH - PAD_RIGHT}" y="98" text-anchor="end" font-family="${fontFamily}" font-size="26" fill="${COLOR.muted}" letter-spacing="1">${escapeXml(section)}</text>`
    : "";

  // <title> 與 <desc> 同時服務無障礙工具與讀取 SVG 原始碼的 AI 爬蟲。
  const accessibleTitle = escapeXml(meta ? `${title} — ${meta}` : title);

  // 內嵌字型。librsvg 2.63 不支援 woff2 的 data URI（會讓整張圖只剩少數文字），
  // 必須使用 TTF／OTF，所以字型子集以 .ttf 形式存放。
  const defsBlock = fonts
    ? `<defs><style>@font-face{font-family:${EMBEDDED_FONT};font-weight:700;font-style:normal;src:url(data:font/ttf;base64,${fonts.bold}) format("truetype")}@font-face{font-family:${EMBEDDED_FONT};font-weight:400;font-style:normal;src:url(data:font/ttf;base64,${fonts.regular}) format("truetype")}</style></defs>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-label="${accessibleTitle}">
<title>${accessibleTitle}</title>
${defsBlock}<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${COLOR.bg}"/>
<rect x="0" y="0" width="14" height="${CARD_HEIGHT}" fill="${COLOR.accent}"/>
<text x="${PAD_LEFT}" y="98" font-family="${fontFamily}" font-size="30" font-weight="700" fill="${COLOR.accent}" letter-spacing="5">${escapeXml(header)}</text>
${sectionBlock}
<line x1="${PAD_LEFT}" y1="132" x2="${CARD_WIDTH - PAD_RIGHT}" y2="132" stroke="${COLOR.rule}" stroke-width="1.5"/>
<text font-family="${fontFamily}" font-size="${fontSize}" font-weight="700" fill="${COLOR.ink}" letter-spacing="1">${titleSpans}</text>
${metaBlock}
<line x1="${PAD_LEFT}" y1="540" x2="${CARD_WIDTH - PAD_RIGHT}" y2="540" stroke="${COLOR.rule}" stroke-width="1.5"/>
<text x="${PAD_LEFT}" y="590" font-family="${fontFamily}" font-size="24" fill="${COLOR.muted}" letter-spacing="2">${escapeXml(footer)}</text>
<text x="${CARD_WIDTH - PAD_RIGHT}" y="590" text-anchor="end" font-family="${fontFamily}" font-size="24" fill="${COLOR.muted}" letter-spacing="2">認識香港，從文獻開始</text>
</svg>`;
}
