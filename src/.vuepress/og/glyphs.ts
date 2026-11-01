// 把文字轉成 SVG 路徑。
//
// 為什麼要轉路徑：OG 卡片是純 SVG，社群平台抓取時由各自的伺服器渲染。
// 只要 SVG 裡還有 <text>，就會受「該環境有沒有這套中文字型」影響——
// 沒有字型就畫成方框，有些平台甚至把 XML 原始碼當文字顯示（看起來像亂碼）。
// 全部改寫成 <path> 後，輸出檔不含任何文字節點，也不依賴系統字型，
// 在任何裝置、任何平台上都是一模一樣的圖形。
//
// 字形輪廓由 fontkit 從子集字型讀出，座標為 font units（unitsPerEm = 1000），
// y 軸向上；SVG 的 y 軸向下，因此每個 <g> 都用 scale(s, -s) 翻轉。

import * as fontkit from "fontkit";
import type { Font } from "fontkit";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type FontWeight = 400 | 700;

export interface TextOptions {
  /** 要渲染的文字 */
  text: string;
  /** 文字起點或終點的 x（依 anchor 決定） */
  x: number;
  /** 基線 y */
  y: number;
  /** 字級（px） */
  size: number;
  /** 字重，預設 400 */
  weight?: FontWeight;
  /** 填色 */
  fill: string;
  /** 字距（px） */
  letterSpacing?: number;
  /** 對齊方式，end 表示 x 是文字的右緣 */
  anchor?: "start" | "end";
}

interface GlyphData {
  /** SVG path 的 d 屬性；空白字元為空字串 */
  d: string;
  /** 水平前進量（font units） */
  advance: number;
}

/**
 * 文字 → SVG 路徑的渲染器。
 *
 * 同一個實例會快取已解析的字形，產生多張卡片時重複字元不必重新計算。
 * 每張卡片開始前呼叫 reset() 清空 defs，避免跨卡片累積。
 */
export class GlyphRenderer {
  private readonly fonts: Record<FontWeight, Font>;

  /** 字形快取：`${weight}:${char}` → 輪廓與前進量 */
  private readonly cache = new Map<string, GlyphData>();

  /** 本張卡片用到的字形：id → d */
  private readonly used = new Map<string, string>();

  private constructor(fonts: Record<FontWeight, Font>) {
    this.fonts = fonts;
  }

  /**
   * 載入字型子集。
   *
   * 讀不到字型時回傳 undefined，呼叫端應退回 <text> 輸出——
   * 雖然社群平台可能顯示異常，至少網站本身仍可正常建置。
   */
  static async load(fontDir: string): Promise<GlyphRenderer | undefined> {
    try {
      const [bold, regular] = await Promise.all([
        readFile(join(fontDir, "noto-serif-tc-700.ttf")),
        readFile(join(fontDir, "noto-serif-tc-400.ttf")),
      ]);

      // 子集字型是單一字型檔而非 TTC 集合，型別上仍宣告為聯合型別，
      // 這裡以斷言收窄；若真的是集合，後面取字形時會直接失敗並降級。
      return new GlyphRenderer({
        700: fontkit.create(bold) as Font,
        400: fontkit.create(regular) as Font,
      });
    } catch {
      return undefined;
    }
  }

  /** 開始新的一張卡片。 */
  reset(): void {
    this.used.clear();
  }

  /** 本張卡片累積的 <defs>，需在所有 text() 呼叫之後取得。 */
  defs(): string {
    if (this.used.size === 0) return "";

    const paths = [...this.used]
      .map(([id, d]) => `<path id="${id}" d="${d}"/>`)
      .join("");

    return `<defs>${paths}</defs>`;
  }

  /**
   * 把一段文字渲染成 <g>，內部以 <use> 引用 <defs> 中的字形。
   *
   * 重複字元只定義一次輪廓，出現多次時只是多一行 <use>，
   * 這是控制檔案大小的關鍵——單一中文字的輪廓約 1 KB，
   * 若每個字都內聯，一張卡片會膨脹到數百 KB。
   */
  text({
    text,
    x,
    y,
    size,
    weight = 400,
    fill,
    letterSpacing = 0,
    anchor = "start",
  }: TextOptions): string {
    const font = this.fonts[weight];
    const scale = size / font.unitsPerEm;

    // 字距以 px 給定，換算成 font units 才能與字形前進量相加。
    const spacing = letterSpacing / scale;

    const runs = [...text].map((char) => ({
      char,
      ...this.glyph(font, weight, char),
    }));

    if (runs.length === 0) return "";

    // 右對齊需要先知道整段寬度；最後一個字後面的字距不計入。
    const total =
      runs.reduce((sum, run) => sum + run.advance, 0) +
      spacing * (runs.length - 1);
    const startX = anchor === "end" ? x - total * scale : x;

    const uses: string[] = [];
    let offset = 0;

    for (const run of runs) {
      if (run.d) {
        const id = this.register(weight, run.char, run.d);
        // 同時輸出 href（SVG 2）與 xlink:href（SVG 1.1）。社群平台的抓取
        // 與快取服務版本新舊不一，只寫 href 的話舊渲染器會整張空白。
        uses.push(
          `<use href="#${id}" xlink:href="#${id}" x="${Math.round(offset)}"/>`,
        );
      }

      offset += run.advance + spacing;
    }

    const transform =
      `translate(${round(startX)} ${round(y)}) ` +
      `scale(${round(scale, 5)} ${round(-scale, 5)})`;

    return `<g transform="${transform}" fill="${fill}">${uses.join("")}</g>`;
  }

  /** 取得單一字元的輪廓，優先使用快取。 */
  private glyph(font: Font, weight: FontWeight, char: string): GlyphData {
    const key = `${weight}:${char}`;
    const cached = this.cache.get(key);

    if (cached) return cached;

    const codePoint = char.codePointAt(0) ?? 0;
    let data: GlyphData;

    if (!font.hasGlyphForCodePoint(codePoint)) {
      // 字型缺字時畫 .notdef（空心方框），讓問題看得見而不是靜默消失。
      // 卡片文字已由建置腳本保證覆蓋，這裡只是最後一道防線。
      const fallback = font.getGlyph(0);

      data = {
        d: simplify(fallback.path.toSVG()),
        advance: Math.round(font.unitsPerEm / 2),
      };
    } else {
      const glyph = font.layout(char).glyphs[0];

      data = {
        d: simplify(glyph.path.toSVG()),
        advance: glyph.advanceWidth,
      };
    }

    this.cache.set(key, data);

    return data;
  }

  /** 登記字形並回傳 defs 用的 id。 */
  private register(weight: FontWeight, char: string, d: string): string {
    const id = `${weight === 700 ? "b" : "r"}${(char.codePointAt(0) ?? 0).toString(36)}`;

    if (!this.used.has(id)) this.used.set(id, d);

    return id;
  }
}

/**
 * 把路徑座標的小數捨入成整數。
 *
 * 字型的 unitsPerEm 是 1000，換算到 78px 的標題時 1 unit 只有 0.078px，
 * 捨入誤差遠低於一個像素，肉眼不可見，卻能明顯縮小檔案。
 */
function simplify(d: string): string {
  return d.replace(/-?\d+\.\d+/g, (match) => String(Math.round(Number(match))));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}
