
interface DateValue {
  text: string;
  year: string;
  month?: string;
  day?: string;
}

const DATE_VALUE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?(?:[T\s].*)?$/u;

/**
 * 同一個日期會被 seo、sitemap、時間軸、統計等多個外掛反覆解析。
 * 以正規化後的文字快取結果，省去重複的正則比對與物件配置。
 * 回傳物件僅供讀取，呼叫方不應修改。
 */
const dateCache = new Map<string, DateValue | undefined>();

export const parseDateValue = (value: unknown): DateValue | undefined => {
  let text: string;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;

    text = value.toISOString().slice(0, 10);
  } else if (typeof value === "string") {
    text = value.trim();
  } else {
    return undefined;
  }

  if (dateCache.has(text)) return dateCache.get(text);

  const match = DATE_VALUE.exec(text);
  const result: DateValue | undefined = match
    ? {
        text,
        year: match[1],
        ...(match[2] ? { month: match[2] } : {}),
        ...(match[3] ? { day: match[3] } : {}),
      }
    : undefined;

  dateCache.set(text, result);

  return result;
};

/** 以 YYYYMMDD 數值作排序鍵；缺月日補 0，同日再按路徑排序 */
export const dateOrderOf = (date: DateValue): number =>
  Number(`${date.year}${date.month ?? "00"}${date.day ?? "00"}`);

/** 便捷包裝：字串或 Date 直接取排序鍵，無法解析時回 0 */
export const dateOrder = (value: unknown): number => {
  const date = parseDateValue(value);

  return date ? dateOrderOf(date) : 0;
};

export const formatChineseDate = (value: string): string => {
  const date = parseDateValue(value);

  if (!date) return value;
  if (date.day) {
    return `${date.year}年${Number(date.month)}月${Number(date.day)}日`;
  }
  if (date.month) return `${date.year}年${Number(date.month)}月`;

  return `${date.year}年`;
};

/**
 * 供已按年份分組的時間軸使用：有月日只留月日、只有年月留月，
 * 只有年份的文獻則保留年份（否則標籤會空白）。
 */
export const formatMonthDay = (value: string): string => {
  const date = parseDateValue(value);

  if (!date) return value;
  if (date.day) return `${Number(date.month)}月${Number(date.day)}日`;
  if (date.month) return `${Number(date.month)}月`;

  return `${date.year}年`;
};

interface CitationParts {
  source: string;
  note: string;
}

const NOTE = /^([\s\S]*?)\s*[（(]?按[：:]\s*([\s\S]*)$/u;

export const splitCitation = (raw: string): CitationParts => {
  const text = raw.replace(/^文獻出處[：:]\s*/u, "").trim();

  if (!text) return { source: "", note: "" };

  const match = NOTE.exec(text);

  if (!match) return { source: text, note: "" };

  const note = match[2]
    .trim()
    .replace(/[）)]+\s*[。.]?\s*$/u, "")
    .trim();

  return {
    source: match[1].trim().replace(/[（(]\s*$/u, "").trim(),
    note: note ? `按：${note}` : "",
  };
};

/* 模組層級共用：避免每次呼叫都建立新的 RegExp 物件 */
const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/u;

export const stripFrontmatter = (content: string): string =>
  content.replace(FRONTMATTER, "");

/* ---- 以下為跨外掛共用的文字工具 ---- */

const WHITESPACE = /\s+/gu;

/** 連續空白收斂為單一半形空格：HTML meta、OG 卡片、純文字鏡像共用 */
export const normalizeSpace = (text: string): string =>
  text.replace(WHITESPACE, " ").trim();

const CLAUSE_END = /[，。；：]/u;

/**
 * 取第一分句並在超長時截斷成 `maxLength - 1` 字加省略號。
 * SEO description、OG 卡片摘要、llms.txt 條目簡述共用同一套規則。
 */
export const firstClause = (text: string, maxLength: number): string => {
  const clause = normalizeSpace(text).split(CLAUSE_END)[0]?.trim() ?? "";

  return clause.length > maxLength
    ? `${clause.slice(0, maxLength - 1)}…`
    : clause;
};

/** 依中文逗號切分引用字串，去掉空白與空段 */
export const splitCitationParts = (text: string): string[] =>
  text
    .split(/[，,]/u)
    .map((part) => part.trim())
    .filter(Boolean);

/**
 * 標題錨點 id：沿用 VuePress slugify 的規則（開頭為數字時補底線），
 * 讓 `#_1874年` 這類既有深層連結在虛擬頁與 Markdown 頁之間保持一致。
 */
export const headingAnchorId = (label: string): string => {
  const slug = normalizeSpace(label).replace(WHITESPACE, "-");

  return /^\d/u.test(slug) ? `_${slug}` : slug;
};

/** 供 sitemap 等處使用的完整 ISO 時間戳；無法解析時回空字串 */
export const toIsoTimestamp = (value: unknown): string => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  if (typeof value !== "string" || !value.trim()) return "";

  const date = new Date(value.trim());

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};
