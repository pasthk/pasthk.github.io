import { chapterName, chapters, pathSegments } from "../chapters.js";

export const VOLUME_DIR = "llms-full";
export const OVERVIEW_KEY = "overview";

interface Volume {
  label: string;
  file: string;
}

/** 絕對網址只取路徑部分；無法解析時退回原字串，交由 pathSegments 決定 */
const keyPath = (value: string): string => {
  if (!/^https?:\/\//u.test(value)) return value;

  try {
    return new URL(value).pathname;
  } catch {
    return value;
  }
};

export const volumeKey = (value: string): string => {
  const [first] = pathSegments(keyPath(value));

  return first && !first.endsWith(".html") ? first : OVERVIEW_KEY;
};

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
    label:
      key === OVERVIEW_KEY
        ? "總覽與說明"
        : (chapterName(key) ?? key),
    file: `${VOLUME_DIR}/${key}.txt`,
  }));
};
