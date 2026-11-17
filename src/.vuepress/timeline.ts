/**
 * 文獻綜覽時間軸的 DOM 契約。
 *
 * 這個結構有兩個生產者：`chronicles.ts` 把 Markdown 的 `::: timeline` 區塊
 * 轉成它，`page-index.ts` 為虛擬頁直接生成它。原本兩邊各自拼字串，class
 * 名稱與巢狀層級各寫一次；只要 `styles/` 的 `.browse-timeline` 系列調整，
 * 就得記得同時改兩處，漏一處就會出現對不齊的軸線。集中在這裡之後，
 * 兩個生產者只負責決定「放什麼」，不再決定「長什麼樣」。
 */

export const TIMELINE_OPEN = '<div class="browse-timeline">';
export const TIMELINE_CLOSE = "</div>";
export const YEAR_OPEN = '<section class="browse-year">';
export const YEAR_CLOSE = "</section>";

/** 年份標題；`label` 需已轉義，可含括號註記等行內標記 */
export const yearHeading = (id: string, label: string): string =>
  `<h2 id="${id}" class="browse-year-title"><span class="browse-year-label">${label}</span></h2>`;

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
      ? `<span class="browse-timeline-date">${date}</span> `
      : "";

  return (
    `- ${dateCell}${title}` +
    `${source ? ` <span class="browse-timeline-source">${source}</span>` : ""}`
  );
};
