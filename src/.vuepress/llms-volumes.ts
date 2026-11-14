import { chapterName, chapters, pathSegments } from "./chapters.js";

export const VOLUME_DIR = "llms-full";
export const OVERVIEW_KEY = "overview";

interface Volume {
  label: string;
  file: string;
}

export const volumeKey = (value: string): string => {
  let path = value;

  if (/^https?:\/\//u.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
    }
  }

  const [first] = pathSegments(path);

  return first && !first.endsWith(".html") ? first : OVERVIEW_KEY;
};

const volumeFile = (key: string): string =>
  `${VOLUME_DIR}/${key}.txt`;

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
    file: volumeFile(key),
  }));
};
