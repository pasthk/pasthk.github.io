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

/**
 * 單一條目。日期放在最前，由 CSS 定位到軸線左側；同一日期只輸出一次，
 * 後續條目省略日期，標題左緣才會對齊。來源置於條目末端。
 */
export const timelineEntry = (
  title: string,
  date?: string,
  source?: string,
): string =>
  `- ${date ? `<span class="browse-timeline-date">${date}</span> ` : ""}` +
  `${title}${source ? ` <span class="browse-timeline-source">${source}</span>` : ""}`;
