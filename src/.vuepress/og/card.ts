
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 1200;

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

const WRAP_WIDTH = CONTENT_WIDTH * 0.9;

const NARROW_CHAR = /[iIl1.,'!:;|]/;
const WIDE_CHAR = /[A-Z@#%&WM]/;

function charWidth(char: string, size: number): number {
  const code = char.codePointAt(0) ?? 0;

  if (code >= 0x2e80) return size;
  if (char === " ") return size * 0.28;
  if (NARROW_CHAR.test(char)) return size * 0.32;
  if (WIDE_CHAR.test(char)) return size * 0.68;

  return size * 0.54;
}

const NO_LINE_START = "、。，．：；！？）」』》】…·%";

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

function measure(text: string, size: number): number {
  let width = 0;

  for (const char of text) width += charWidth(char, size);

  return width;
}

function wrap(text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  let width = 0;

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
  title: string;
  meta?: string;
  section?: string;
  header?: string;
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

export function buildCardSvg({
  title,
  meta,
  section,
  header = "",
  footer = "",
}: CardContent): string {
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
