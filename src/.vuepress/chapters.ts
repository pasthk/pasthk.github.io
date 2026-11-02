/**
 * 章節定義：src 下的頂層目錄 → 中文名稱與簡介。
 *
 * 這裡是唯一來源。OG 卡片右上角的章節標籤（og/plugin.ts）與 llms.txt 的
 * 目錄分組（llms.ts）都從這裡取值，避免同一章節在兩處出現不同措辭——
 * 先前兩份各自維護，`custom` 在一處叫「傳統節慶與打醮」、另一處叫
 * 「香港傳統節慶與打醮」，`tropical-cyclone` 同樣不一致。
 *
 * `name` 取短式，因為它同時要放進卡片右上角與左側刊頭共處的固定寬度位置；
 * 較長的說明放在 `note`，由 llms.txt 在分組標題下使用。
 *
 * 陣列順序即 llms.txt 的章節順序，未列於此的目錄會自動附在最後。
 */
export interface Chapter {
  /** src 下的頂層目錄名，也是頁面路徑的第一段 */
  dir: string;
  /** 章節中文名 */
  name: string;
  /** 章節簡介，僅 llms.txt 使用 */
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
];

const byDir = new Map(chapters.map((chapter) => [chapter.dir, chapter]));

/** 由頁面路徑的第一段取得章節名稱；未知目錄回傳 undefined */
export const chapterName = (dir: string): string | undefined =>
  byDir.get(dir)?.name;
