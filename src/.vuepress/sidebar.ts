import { sidebar } from "vuepress-theme-hope";

import { pushTo } from "./map-utils.js";

const signalYears = [
  1897,
  1902, 1904, 1905, 1906, 1907, 1909,
  1918, 1919,
  1924, 1926, 1927, 1928,
  1930, 1931, 1932, 1935,
  1946, 1947, 1948, 1949,
  1950, 1951, 1952, 1953, 1957,
  1962,
];

type SidebarNode =
  | string
  | { text: string; link: string }
  | { text: string; collapsible: true; children: SidebarNode[] };

const group = (text: string, children: SidebarNode[]) => ({
  text,
  collapsible: true as const,
  children,
});

const link = (text: string, href: string) => ({ text, link: href });

const signalDecadeGroups = () => {
  const decades = new Map<number, string[]>();

  for (const year of signalYears) {
    pushTo(decades, Math.floor(year / 10) * 10, `/tropical-cyclone/${year}-signal.md`);
  }

  return [...decades]
    .sort(([a], [b]) => a - b)
    .map(([decade, children]) => group(`${decade}年代警告信號`, children));
};

const sidebarConfig: Record<string, SidebarNode[]> = {
  "/": [
    link("首頁", "/"),
    group("自然環境", [
      group("熱帶氣旋", signalDecadeGroups()),
    ]),
    group("古物古蹟", [
      group("考古調查", [
        "/archaeology/hong-kong-archaeological-survey-1982-1985.md",
        "/archaeology/hong-kong-archaeological-survey-1997-1998.md",
      ]),
      group("新石器時代", [
        "/archaeology/sha-ha-site.md",
        "/archaeology/lung-kwu-chau-site.md",
        "/archaeology/lung-kwu-tan-site.md",
        "/archaeology/lung-kwu-sheung-tan-site.md",
      ]),
      group("漢代", ["/archaeology/lei-cheng-uk-han-tomb.md"]),
      group("宋代", ["/archaeology/fat-tong-chau-site.md"]),
      group("明代", ["/archaeology/wun-yiu.md"]),
      group("清代", [
        "/archaeology/kowloon-walled-city.md",
        "/archaeology/tung-chung-fort.md",
      ]),
      group("碑刻", [
        "/stele-inscription/tung-wah-group-of-hospitals.md",
        "/stele-inscription/sik-sik-yuen-wang-tai-sin.md",
        "/stele-inscription/sung-wong-toi-site-kowloon.md",
        "/stele-inscription/hau-wong-temple-kowloon-city.md",
      ]),
      group("歷史建築", [
        "/historic-building/hau-ku-shek-ancestral-hall.md",
        "/historic-building/hau-mei-fung-ancestral-hall.md",
        "/historic-building/tat-tak-communal-hall.md",
      ]),
      link("考古文物展覽", "/archaeology/archaeological-exhibition.md"),
    ]),
    group("香港法例", [
      "/legislation/legislative-council.md",
      "/legislation/cap-53-antiquities-and-monuments-ordinance.md",
      "/legislation/cap-499-environmental-impact-assessment-ordinance.md",
    ]),
    group("社會民生", [
      group("教育", [
        group("中學教育", [
          "/education/heung-to-middle-school.md",
        ]),
        group("專上教育", [
          "/education/the-university-of-hong-kong.md",
          "/education/the-chinese-university-of-hong-kong.md",
          "/education/the-hong-kong-polytechnic-university.md",
          "/education/the-education-university-of-hong-kong.md",
          "/education/the-hong-kong-academy-for-performing-arts.md",
        ]),
      ]),
      group("醫療", [
        group("醫院", [
          "/hospital/tung-wah-group-of-hospitals.md",
          "/hospital/government-civil-hospital.md",
        ]),
        group("公共衛生", [
          "/public-health/influenza.md",
          "/public-health/cholera.md",
          "/public-health/plague.md",
        ]),
      ]),
    ]),
    group("傳統風俗", [
      group("節慶", [
        "/custom/lunar-new-year.md",
        "/custom/dragon-boat-festival.md",
        "/custom/yu-lan-festival.md",
      ]),
      group("打醮", [
        group("一年一屆", ["/custom/cheung-chau-jiao-festival.md"]),
        group("兩年一屆", ["/custom/high-land-jiao-festival.md"]),
        group("十年一屆", [
          "/custom/yuen-long-jiao-festival.md",
          "/custom/yuen-long-kam-tin-jiao-festival.md",
          "/custom/yuen-long-shan-ha-village-jiao-festival.md",
          "/custom/tai-po-lam-tsuen-jiao-festival.md",
          "/custom/sha-tin-kau-yeuk-jiao-festival.md",
          "/custom/sha-tin-tai-wai-village-jiao-festival.md",
          "/custom/kat-o-jiao-festival.md",
          "/custom/shek-o-jiao-festival.md",
        ]),
        group("九十年一屆", [
          "/custom/lam-tsuen-tai-hang-fanling-wai-jiao-festival.md",
        ]),
      ]),
    ]),
  ],
  "/project/ay1928": [
    link("前言", "/project/ay1928/"),
    link("新聞報道", "/project/ay1928/news.md"),
    group("甲骨", [
      "/project/ay1928/oracle/report.md",
      "/project/ay1928/oracle/catalogue.md",
      "/project/ay1928/oracle/article.md",
    ]),
    group("殷墟", [
      "/project/ay1928/yinxu/report.md",
      "/project/ay1928/yinxu/catalogue.md",
      "/project/ay1928/yinxu/article.md",
    ]),
    group("洹北商城", [
      "/project/ay1928/huanbei-shang-city/report.md",
      "/project/ay1928/huanbei-shang-city/article.md",
    ]),
    group("曹操高陵", [
      "/project/ay1928/cao-cao-mausoleum/report.md",
      "/project/ay1928/cao-cao-mausoleum/article.md",
    ]),
  ],
};

export const sidebarLinks = (): string[] => {
  const found: string[] = [];

  const visit = (nodes: SidebarNode[]): void => {
    for (const node of nodes) {
      if (typeof node === "string") found.push(node);
      else if ("link" in node) found.push(node.link);
      else visit(node.children);
    }
  };

  for (const nodes of Object.values(sidebarConfig)) visit(nodes);

  return found;
};

export default sidebar(sidebarConfig);
