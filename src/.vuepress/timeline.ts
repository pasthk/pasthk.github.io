import type { Plugin } from "vuepress/core";
import { warn } from "vuepress/utils";

import { headingAnchorId } from "./format.js";

/**
 * 文獻綜覽時間軸：DOM 契約與 `::: timeline` 解析器。
 *
 * 這個結構有兩個生產者：`transform()` 把 Markdown 的 `::: timeline` 區塊
 * 轉成它，`page-index.ts` 為虛擬頁直接生成它。原本兩邊各自拼字串，class
 * 名稱與巢狀層級各寫一次；集中在這裡之後，兩個生產者只負責決定「放什麼」，
 * 不再決定「長什麼樣」。
 */

export const TIMELINE_OPEN = '<div class="browse-timeline">';
export const TIMELINE_CLOSE = "</div>";
export const YEAR_OPEN = '<section class="browse-year">';
export const YEAR_CLOSE = "</section>";

/** 時段標題的連接詞（如「公元前5000年 至 公元前4000年」），前後至少一個空白才算 */
const RANGE_JOINER = /\s+至\s+/u;

/**
 * 年份標題；`date`、`side` 需已轉義。
 *
 * Markdown 以 `|` 分欄（`## 公元前214年 | 秦始皇三十三年`），這裡只負責把
 * 兩欄排成同一行的 DOM：左欄日期，右欄備註；兩欄字級相同，在 CSS 裡分居
 * 軸線左右，實心圓點落在中間。時段寫成「起年／至 止年」兩行，與事件日期
 * 欄同構。`side` 已由呼叫方切走，故日期內的「至元」這類年號不會被拆。
 */
export const yearHeading = (id: string, date: string, side?: string): string => {
  const [start, end] = date.split(RANGE_JOINER);
  const body =
    end === undefined
      ? date
      : `${start}<span class="browse-year-end"><span class="browse-year-sep">至</span>${end}</span>`;

  return (
    `<h2 id="${id}" class="browse-year-title">` +
    `<span class="browse-year-label">${body}</span>` +
    (side ? `<span class="browse-year-side">${side}</span>` : "") +
    `</h2>`
  );
};

export interface TimelineEntryParts {
  /** 條目標題，可含行內標記 */
  title: string;
  /** 已轉義的日期標籤；省略則不出現日期欄 */
  date?: string;
  /**
   * 已轉義的結束日期標籤。有值時條目視為「跨期事件」：日期欄改為
   * 「起始／至／結束」，軸線節點由圓點換成短豎條。
   */
  endDate?: string;
  /** 已轉義的資料來源 */
  source?: string;
}

/** 窄屏日期欄寬 5rem；超過這個估計寬度的日期標籤改由 CSS 另起一行 */
const LONG_DATE_EM = 4.6;

/**
 * 粗估標籤寬度（漢字、全形標點計 1em，數字與拉丁字母計 0.55em）。
 * 標籤可能含 `<span class="browse-note">` 等行內標記，先去掉標籤再算。
 */
const visualWidth = (html: string): number =>
  [...html.replace(/<[^>]*>/gu, "")].reduce(
    (sum, char) => sum + (/[\u2E80-\u9FFF\uFF00-\uFFEF]/u.test(char) ? 1 : 0.55),
    0,
  );

const isLongDate = (date: string): boolean => visualWidth(date) > LONG_DATE_EM;

/**
 * 單一條目。日期放在最前，由 CSS 定位到軸線左側；同一日期只輸出一次，
 * 後續條目省略日期，標題左緣才會對齊。來源置於條目末端。
 *
 * 跨期事件若與上一條同日起始（`date` 省略、只給 `endDate`），日期欄僅
 * 保留「至 結束日期」一行 —— 起點由上一個條目的日期欄提供。省略與否
 * 由呼叫方判斷，這裡只負責把已有的部分排成同一個欄位。
 */
export const timelineEntry = ({
  title,
  date,
  endDate,
  source,
}: TimelineEntryParts): string => {
  const dateCell = endDate
    ? `<span class="browse-timeline-date browse-timeline-range">` +
      (date ? `<span class="browse-range-start">${date}</span>` : "") +
      `<span class="browse-range-end"><span class="browse-range-sep">至</span>${endDate}</span>` +
      `</span> `
    : date
      ? `<span class="browse-timeline-date${isLongDate(date) ? " browse-timeline-long" : ""}">${date}</span> `
      : "";

  return (
    `- ${dateCell}${title}` +
    `${source ? ` <span class="browse-timeline-source">${source}</span>` : ""}`
  );
};

/* ---- `::: timeline` 解析 ---- */

/** 編年頁時間軸容器：以純 Markdown 輸入，轉成與 page-index.ts 相同的 DOM */
const OPEN = "::: timeline";
const CLOSE = ":::";
const YEAR_HEADING = /^#{2,4}\s+(.+?)\s*#*\s*$/u;
const EVENT_ITEM = /^[-*]\s+(.+)$/u;
const FENCE = /^(`{3,}|~{3,})/u;

/**
 * 年份標題的左右欄分隔符：`## 公元前214年 | 秦始皇三十三年`。左欄是日期，
 * 右欄是備註（年號、朝代、考古分期），兩欄字級相同、分居軸線左右。分隔符
 * 明寫在 Markdown 裡，不必再從括號猜哪一段是備註。
 */
const COLUMN_SEP = /\s*\|\s*/u;

/**
 * 日期欄的區間分隔符。事件若持續一段時間，起訖日期之間用波浪線或箭頭隔開
 * （`1946年4月3日 ~ 1950年1月5日`）。只認這幾種符號，避免正文裡的破折號、
 * 「至」字被誤判成日期區間。
 */
const RANGE_SEP = /\s*(?:~|～|→)\s*/u;

interface TimelineEvent {
  date: string;
  endDate: string;
  title: string;
  source: string;
}

const escapeText = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

/** 末尾括號註記（年份「1842年（道光二十二年）」、日期「8月29日（八月二十九日）」） */
const NOTE_PATTERN = /^(.+?)\s*([（(][\s\S]*[）)])\s*$/u;

/** 把括號段包成獨立元素，讓 CSS 能整組換行而不從中折斷 */
const renderWithNote = (text: string): string => {
  const matched = NOTE_PATTERN.exec(text);

  return matched
    ? `${escapeText(matched[1])}<span class="browse-note">${escapeText(matched[2])}</span>`
    : escapeText(text);
};

/** 「日期 | 標題 | 來源」；只有一段時視為不帶日期的標題 */
const parseEvent = (body: string): TimelineEvent => {
  const parts = body.split("|").map((part) => part.trim());

  if (parts.length === 1)
    return { date: "", endDate: "", title: parts[0], source: "" };

  const [date, endDate = ""] = parts[0].split(RANGE_SEP);
  const title = parts[1] ?? "";
  const source = parts.length > 2 ? parts.slice(2).join(" | ") : "";

  return { date: date.trim(), endDate: endDate.trim(), title, source };
};

const renderTimeline = (lines: string[], filePath: string): string => {
  const out = [TIMELINE_OPEN, ""];
  const ignored: string[] = [];
  const badRange: string[] = [];
  let inYear = false;
  let lastDate = "";

  const closeYear = (): void => {
    if (!inYear) return;

    out.push("", YEAR_CLOSE);
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) continue;

    const heading = YEAR_HEADING.exec(line);

    if (heading) {
      closeYear();
      const label = heading[1].trim();
      /* 左欄日期／右欄備註；備註再含「|」時原樣接回右欄 */
      const [datePart, ...sideParts] = label.split(COLUMN_SEP);
      const date = datePart.trim();
      const side = sideParts.join(" | ").trim();

      lastDate = "";
      inYear = true;
      out.push(
        YEAR_OPEN,
        "",
        yearHeading(
          escapeText(headingAnchorId(date)),
          escapeText(date),
          side ? escapeText(side) : undefined,
        ),
        "",
      );
      continue;
    }

    const item = EVENT_ITEM.exec(line);

    if (!item) {
      /* 容器內只放年份標題與事件清單；其餘文字移到容器外才不會被吃掉 */
      if (!line.startsWith("<!--") && !line.includes("-->"))
        ignored.push(line);
      continue;
    }

    if (!inYear) continue;

    const { date, endDate, title, source } = parseEvent(item[1]);

    if (!title) continue;

    /* 起日與上一條相同（或本來就沒寫）時省略，日期欄只留「至 結束日期」；
       單點事件沿用「同一日期只顯示一次」 */
    const showStart = Boolean(date) && date !== lastDate;
    /* 起日省略、上一條又沒有日期，跨期無從參照，退回無日期條目 */
    const dangling = Boolean(endDate) && !date && !lastDate;

    if (dangling) badRange.push(item[1]);

    out.push(
      timelineEntry({
        title,
        date: showStart ? renderWithNote(date) : undefined,
        endDate: endDate && !dangling ? renderWithNote(endDate) : undefined,
        source: source || undefined,
      }),
    );

    if (date) lastDate = date;
  }

  closeYear();
  out.push("", TIMELINE_CLOSE);

  if (ignored.length)
    warn(
      `timeline：${filePath || "頁面"} 的 ::: timeline 內有 ${ignored.length} 行不是年份標題或事件清單，已忽略（例：${ignored[0]}）。請移到容器外。`,
    );

  if (badRange.length)
    warn(
      `timeline：${filePath || "頁面"} 有 ${badRange.length} 條跨期事件省略了起始日期，但上一條也沒有日期，無從參照，已按無日期處理（例：${badRange[0]}）。請補上起始日期。`,
    );

  return out.join("\n");
};

/** 把 ::: timeline 區塊換成既有版型的 Markdown；其餘內容原樣保留 */
const transform = (src: string, filePath: string): string => {
  const lines = src.split("\n");
  const out: string[] = [];
  let fence = "";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const marker = FENCE.exec(line.trim());

    /* 程式碼區塊內的 ::: timeline 只是範例文字，不轉換 */
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (fence === marker[1][0]) fence = "";
    }

    if (fence || line.trim() !== OPEN) {
      out.push(line);
      continue;
    }

    const body: string[] = [];
    let end = -1;

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (lines[cursor].trim() === CLOSE) {
        end = cursor;
        break;
      }
      body.push(lines[cursor]);
    }

    if (end < 0) {
      warn(
        `timeline：${filePath || "頁面"} 的 ::: timeline 缺少結束標記，已略過轉換。`,
      );
      out.push(line, ...body);
      break;
    }

    const start = out.length;

    out.push(...renderTimeline(body, filePath).split("\n"));
    /* 補回空行，讓後續 token 的行號盡量不偏移 */
    while (out.length - start < end - index + 1) out.push("");
    index = end;
  }

  return out.join("\n");
};

export const timelinePlugin = (): Plugin => ({
  name: "timeline",

  extendsMarkdown(md) {
    md.core.ruler.before("block", "timeline", (state) => {
      state.src = transform(state.src, String(state.env?.filePathRelative ?? ""));

      return true;
    });
  },
});
