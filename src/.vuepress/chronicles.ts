import type { Plugin } from "vuepress/core";
import { warn } from "vuepress/utils";

import { headingAnchorId } from "./format.js";
import {
  TIMELINE_CLOSE,
  TIMELINE_OPEN,
  YEAR_CLOSE,
  YEAR_OPEN,
  timelineEntry,
  yearHeading,
} from "./timeline.js";

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

/**
 * 條目標題裡的任期注記（「（任期至 1844 年 5 月 8 日）。」）。整段連同句號包成
 * 不可斷的行內元素：括注內以空格分隔年月日，窄屏時會從空格處折行，把「（任」
 * 留在行尾；括注本身放不進行尾時，句號又會孤零零掉到下一行。
 */
const TENURE_NOTE = /（任期至[^）]*）[。]?/gu;

const renderTitle = (title: string): string =>
  title.replace(TENURE_NOTE, (note) => `<span class="browse-tenure">${note}</span>`);

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
        title: renderTitle(title),
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
      `chronicles：${filePath || "頁面"} 的 ::: timeline 內有 ${ignored.length} 行不是年份標題或事件清單，已忽略（例：${ignored[0]}）。請移到容器外。`,
    );

  if (badRange.length)
    warn(
      `chronicles：${filePath || "頁面"} 有 ${badRange.length} 條跨期事件省略了起始日期，但上一條也沒有日期，無從參照，已按無日期處理（例：${badRange[0]}）。請補上起始日期。`,
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
        `chronicles：${filePath || "頁面"} 的 ::: timeline 缺少結束標記，已略過轉換。`,
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

export const chroniclesPlugin = (): Plugin => ({
  name: "chronicles",

  extendsMarkdown(md) {
    md.core.ruler.before("block", "chronicles", (state) => {
      state.src = transform(state.src, String(state.env?.filePathRelative ?? ""));

      return true;
    });
  },
});
