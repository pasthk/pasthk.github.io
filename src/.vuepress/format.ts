
export interface DateValue {
  text: string;
  year: string;
  month?: string;
  day?: string;
}

const DATE_VALUE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?(?:[T\s].*)?$/u;

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

  const match = DATE_VALUE.exec(text);

  if (!match) return undefined;

  return {
    text,
    year: match[1],
    ...(match[2] ? { month: match[2] } : {}),
    ...(match[3] ? { day: match[3] } : {}),
  };
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

export interface CitationParts {
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

export const stripFrontmatter = (content: string): string =>
  content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/u, "");
