import { readdirSync } from "node:fs";
import type { App, Plugin } from "vuepress/core";
import { warn } from "vuepress/utils";

export interface Chapter {
  dir: string;
  name: string;
  note: string;
}

export const chapters: Chapter[] = [
  {
    dir: "tropical-cyclone",
    name: "熱帶氣旋與風球",
    note: "1897–1962 年香港的風球（熱帶氣旋警告信號）紀錄，按年份與事件編排，收錄《士蔑西報》《華僑日報》《工商日報》等報刊的颱風報道。",
  },
  {
    dir: "archaeology",
    name: "香港考古",
    note: "戰後香港的考古調查、發掘與展覽紀錄，含李鄭屋漢墓、九龍寨城、龍津石橋、佛頭洲與深灣等遺址。",
  },
  {
    dir: "custom",
    name: "傳統節慶與打醮",
    note: "太平清醮、盂蘭勝會、天后誕等節慶的報刊紀錄，重點在十年一屆或五年一屆的鄉村建醮活動。",
  },
  {
    dir: "education",
    name: "香港教育史",
    note: "香港大學、中文大學、崇基書院、羅富國教育學院、理工大學與演藝學院的創校與發展紀錄。",
  },
  {
    dir: "legislation",
    name: "香港法例",
    note: "條例草案與立法過程的報刊紀錄，以及條例本身的整理。",
  },
  {
    dir: "public-health",
    name: "公共衛生史",
    note: "霍亂、鼠疫、流行性感冒等疫症的報刊與官方紀錄。",
  },
  {
    dir: "stele-inscription",
    name: "碑刻",
    note: "廟宇與建築碑記的釋文與背景。",
  },
  {
    dir: "historic-building",
    name: "歷史建築",
    note: "祠堂、公所等歷史建築的調查與報道。",
  },
  {
    dir: "project",
    name: "專題研究",
    note: "不屬香港主題的獨立研究項目，如 1928 年安陽殷墟第一次發掘。",
  },
  {
    dir: "hospital",
    name: "醫院",
    note: "東華三院、國家醫院等醫院的創設、院務、籌款、擴建與醫療服務紀錄，主要收錄 1874–1935 年《循環日報》《工商日報》《香港華字日報》等報刊史料。",
  },
];

const byDir = new Map(chapters.map((chapter) => [chapter.dir, chapter]));

export const chapterMeta = (dir: string): Chapter | undefined =>
  byDir.get(dir);

export const chapterName = (dir: string): string | undefined =>
  chapterMeta(dir)?.name;

const segmentCache = new Map<string, string[]>();

/** 回傳共享陣列，呼叫方只讀不改；頁面路徑重複使用時省去反覆 split */
export const pathSegments = (path: string): string[] => {
  const cached = segmentCache.get(path);

  if (cached) return cached;

  const segments = path.split("/").filter(Boolean);

  segmentCache.set(path, segments);

  return segments;
};

export const chapterOfPath = (path: string): string | undefined =>
  chapterName(pathSegments(path)[0] ?? "");

export const chaptersGuardPlugin = (): Plugin => ({
  name: "chapters-guard",

  onInitialized(app: App): void {
    const actual = readdirSync(app.dir.source(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name);

    const unlisted = actual.filter((dir) => !byDir.has(dir));
    const missing = chapters
      .map((chapter) => chapter.dir)
      .filter((dir) => !actual.includes(dir));
    const duplicated = chapters
      .map((chapter) => chapter.dir)
      .filter((dir, index, all) => all.indexOf(dir) !== index);

    if (unlisted.length) {
      warn(
        `chapters.ts 未登記這些頂層目錄：${unlisted.join("、")}。` +
          `它們會以目錄名出現在 llms.txt 與分冊檔頭，OG 卡也沒有章節標籤。`,
      );
    }

    if (missing.length) {
      warn(
        `chapters.ts 登記了不存在的目錄：${missing.join("、")}。` +
          `對外文案的章節數會多算。`,
      );
    }

    if (duplicated.length) {
      warn(`chapters.ts 有重複的 dir：${duplicated.join("、")}，後者會被忽略。`);
    }
  },
});
