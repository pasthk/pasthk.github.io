import { chapterName, chapters } from "./chapters.js";

/**
 * llms-full.txt 分冊規則的單一來源。
 *
 * 838KB 的單檔很容易被模型的上下文視窗截斷；依章節拆成較小的分冊後，
 * 檢索器可以只取需要的那一冊。llms.ts 用來產生 `## Optional` 連結，
 * llms-canonical.ts 用同一份資料切檔，兩邊不會列出對不起來的檔名。
 */
export const VOLUME_DIR = "llms-full";
export const OVERVIEW_KEY = "overview";

export interface Volume {
  key: string;
  label: string;
  file: string;
}

/** URL 或頁面路徑 → 冊別鍵；根目錄頁面（首頁、關於本站…）歸入總覽 */
export const volumeKey = (value: string): string => {
  let path = value;

  if (/^https?:\/\//u.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      // 保留原值，交由下方解析
    }
  }

  const [first] = path.replace(/^\//u, "").split("/");

  return first && !first.endsWith(".html") ? first : OVERVIEW_KEY;
};

export const volumeFile = (key: string): string =>
  `${VOLUME_DIR}/${key}.txt`;

/** 依 chapters.ts 的順序產冊；未列於章節定義的目錄補在最後 */
export const volumesFor = (paths: string[]): Volume[] => {
  const keys = new Set(paths.map(volumeKey));
  const ordered = [
    OVERVIEW_KEY,
    ...chapters.map((chapter) => chapter.dir),
    ...[...keys].filter(
      (key) =>
        key !== OVERVIEW_KEY &&
        !chapters.some((chapter) => chapter.dir === key),
    ),
  ].filter((key) => keys.has(key));

  return ordered.map((key) => ({
    key,
    label:
      key === OVERVIEW_KEY
        ? "總覽與說明"
        : (chapterName(key) ?? key),
    file: volumeFile(key),
  }));
};
