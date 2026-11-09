import { sidebar } from "vuepress-theme-hope";

/**
 * 熱帶氣旋警告信號條目（依年份，只列已有正文者）。
 * 側邊欄按年代分組，故只需維護這份年份清單，不必逐組手寫。
 *
 * 尚未收錄（補上正文後把年份加進下面的陣列即可）：
 *   1954、1955、1956、1958、1959
 *   1960、1961、1963–1969
 *   1970–1989、1990
 */
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

/** 依年代分組，產生「1890年代警告信號」等側邊欄群組 */
const signalDecadeGroups = () => {
  const decades = new Map<number, string[]>();

  for (const year of signalYears) {
    const decade = Math.floor(year / 10) * 10;
    const children = decades.get(decade) ?? [];

    children.push(`/tropical-cyclone/${year}-signal.md`);
    decades.set(decade, children);
  }

  return [...decades]
    .sort(([a], [b]) => a - b)
    .map(([decade, children]) => ({
      text: `${decade}年代警告信號`,
      collapsible: true,
      children,
    }));
};

export default sidebar({
  "/": [
    {
      text: "首頁",
      link: "/",
    },
    {
      text: "自然環境",
      collapsible: true,
      children: [
        {
          text: "熱帶氣旋",
          collapsible: true,
          children: signalDecadeGroups(),
        },
      ],
    },
    {
      text: "古物古蹟",
      collapsible: true,
      children: [
        {
          text: "考古調查",
          collapsible: true,
          children: [
            "/archaeology/hong-kong-archaeological-survey-1982-1985.md",
            "/archaeology/hong-kong-archaeological-survey-1997-1998.md",
          ],
        },
        {
          text: "新石器時代",
          collapsible: true,
          children: [
            "/archaeology/sha-ha-site.md",
            "/archaeology/lung-kwu-chau-site.md",
            "/archaeology/lung-kwu-tan-site.md",
            "/archaeology/lung-kwu-sheung-tan-site.md",
          ],
        },
        {
          text: "漢代",
          collapsible: true,
          children: ["/archaeology/lei-cheng-uk-han-tomb.md"],
        },
        {
          text: "宋代",
          collapsible: true,
          children: ["/archaeology/fat-tong-chau-site.md"],
        },
        {
          text: "明代",
          collapsible: true,
          children: ["/archaeology/wun-yiu.md"],
        },
        {
          text: "清代",
          collapsible: true,
          children: [
            "/archaeology/kowloon-walled-city.md",
            "/archaeology/tung-chung-fort.md",
          ],
        },
        {
          text: "碑刻",
          collapsible: true,
          children: [
            "/stele-inscription/tung-wah-group-of-hospitals.md",
            "/stele-inscription/sik-sik-yuen-wang-tai-sin.md",
            "/stele-inscription/sung-wong-toi-site-kowloon.md",
            "/stele-inscription/hau-wong-temple-kowloon-city.md",
          ],
        },
        {
          text: "歷史建築",
          collapsible: true,
          children: [
            "/historic-building/hau-ku-shek-ancestral-hall.md",
            "/historic-building/hau-mei-fung-ancestral-hall.md",
            "/historic-building/tat-tak-communal-hall.md",
          ],
        },
        {
          text: "考古文物展覽",
          link: "/archaeology/archaeological-exhibition.md",
        },
      ],
    },
    {
      text: "香港法例",
      collapsible: true,
      children: [
        "/legislation/legislative-council.md",
        "/legislation/cap-53-antiquities-and-monuments-ordinance.md",
        "/legislation/cap-499-environmental-impact-assessment-ordinance.md",
      ],
    },
    {
      text: "社會民生",
      collapsible: true,
      children: [
        {
          text: "教育",
          collapsible: true,
          children: [
            {
              text: "專上教育",
              collapsible: true,
              children: [
                "/education/the-university-of-hong-kong.md",
                "/education/the-chinese-university-of-hong-kong.md",
                "/education/the-hong-kong-polytechnic-university.md",
                "/education/the-education-university-of-hong-kong.md",
                "/education/the-hong-kong-academy-for-performing-arts.md",
              ],
            },
          ],
        },
        {
          text: "醫療",
          collapsible: true,
          children: [
            {
              text: "醫院",
              collapsible: true,
              children: [
                "/hospital/tung-wah-group-of-hospitals.md",
                "/hospital/government-civil-hospital.md",
              ],
            },
            {
              text: "公共衛生",
              collapsible: true,
              children: [
                "/public-health/influenza.md",
                "/public-health/cholera.md",
                "/public-health/plague.md",
              ],
            },
          ],
        },
      ],
    },
    {
      text: "傳統風俗",
      collapsible: true,
      children: [
        {
          text: "節慶",
          collapsible: true,
          children: [
            "/custom/lunar-new-year.md",
            "/custom/dragon-boat-festival.md",
            "/custom/yu-lan-festival.md",
          ],
        },
        {
          text: "打醮",
          collapsible: true,
          children: [
            {
              text: "一年一屆",
              collapsible: true,
              children: ["/custom/cheung-chau-jiao-festival.md"],
            },
            {
              text: "兩年一屆",
              collapsible: true,
              children: ["/custom/high-land-jiao-festival.md"],
            },
            {
              text: "十年一屆",
              collapsible: true,
              children: [
                "/custom/yuen-long-jiao-festival.md",
                "/custom/yuen-long-kam-tin-jiao-festival.md",
                "/custom/yuen-long-shan-ha-village-jiao-festival.md",
                "/custom/tai-po-lam-tsuen-jiao-festival.md",
                "/custom/sha-tin-kau-yeuk-jiao-festival.md",
                "/custom/sha-tin-tai-wai-village-jiao-festival.md",
                "/custom/kat-o-jiao-festival.md",
                "/custom/shek-o-jiao-festival.md",
              ],
            },
            {
              text: "九十年一屆",
              collapsible: true,
              children: [
                "/custom/lam-tsuen-tai-hang-fanling-wai-jiao-festival.md",
              ],
            },
          ],
        },
      ],
    },
  ],
  "/project/ay1928": [
    {
      text: "前言",
      link: "/project/ay1928/",
    },
    {
      text: "新聞報道",
      link: "/project/ay1928/news.md",
    },
    {
      text: "甲骨",
      collapsible: true,
      children: [
        "/project/ay1928/oracle/report.md",
        "/project/ay1928/oracle/catalogue.md",
        "/project/ay1928/oracle/article.md",
      ],
    },
    {
      text: "殷墟",
      collapsible: true,
      children: [
        "/project/ay1928/yinxu/report.md",
        "/project/ay1928/yinxu/catalogue.md",
        "/project/ay1928/yinxu/article.md",
      ],
    },
    {
      text: "洹北商城",
      collapsible: true,
      children: [
        "/project/ay1928/huanbei-shang-city/report.md",
        "/project/ay1928/huanbei-shang-city/article.md",
      ],
    },
    {
      text: "曹操高陵",
      collapsible: true,
      children: [
        "/project/ay1928/cao-cao-mausoleum/report.md",
        "/project/ay1928/cao-cao-mausoleum/article.md",
      ],
    },
  ],
});
