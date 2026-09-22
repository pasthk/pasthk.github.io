import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    {
      text: "前言",
      link: "/",
    },
    {
      text: "自然環境",
      collapsible: true,
      children: [
        {
          text: "熱帶氣旋",
          collapsible: true,
          children: [
            "/tropical-cyclone/1946-signal.md",
            "/tropical-cyclone/1947-signal.md",
            "/tropical-cyclone/1948-signal.md",
            "/tropical-cyclone/1949-signal.md",
            "/tropical-cyclone/1950-signal.md",
            "/tropical-cyclone/1951-signal.md",
            "/tropical-cyclone/1952-signal.md",
            "/tropical-cyclone/1953-signal.md",
            "/tropical-cyclone/1954-signal.md",
            "/tropical-cyclone/1955-signal.md",
            "/tropical-cyclone/1956-signal.md",
            "/tropical-cyclone/1957-signal.md",
            "/tropical-cyclone/1958-signal.md",
            "/tropical-cyclone/1959-signal.md", 
            "/tropical-cyclone/1960-signal.md",
            "/tropical-cyclone/1961-signal.md",
            "/tropical-cyclone/1962-signal.md",
            "/tropical-cyclone/1963-signal.md",
            "/tropical-cyclone/1964-signal.md",
            "/tropical-cyclone/1965-signal.md",
            "/tropical-cyclone/1966-signal.md",
            "/tropical-cyclone/1967-signal.md",
            "/tropical-cyclone/1968-signal.md",
            "/tropical-cyclone/1969-signal.md",
            "/tropical-cyclone/1970-signal.md",
            "/tropical-cyclone/1971-signal.md",
            "/tropical-cyclone/1972-signal.md",
            "/tropical-cyclone/1973-signal.md",
            "/tropical-cyclone/1974-signal.md",
            "/tropical-cyclone/1975-signal.md",
            "/tropical-cyclone/1976-signal.md",
            "/tropical-cyclone/1977-signal.md",
            "/tropical-cyclone/1978-signal.md",
            "/tropical-cyclone/1979-signal.md",
            "/tropical-cyclone/1980-signal.md",
            "/tropical-cyclone/1981-signal.md",
            "/tropical-cyclone/1982-signal.md",
            "/tropical-cyclone/1983-signal.md",
            "/tropical-cyclone/1984-signal.md",
            "/tropical-cyclone/1985-signal.md",
            "/tropical-cyclone/1986-signal.md",
            "/tropical-cyclone/1987-signal.md",
            "/tropical-cyclone/1988-signal.md",
            "/tropical-cyclone/1989-signal.md",
            "/tropical-cyclone/1990-signal.md",
          ]
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
      ]
        },  
    {
      text: "社會民生",
      collapsible: true,
      children: [
        {
          text: "公共衛生",
          collapsible: true,
          children: [
            "/public-health/influenza.md",
            "/public-health/cholera.md",
            "/public-health/plague.md",
          ]
        },
      ],
    },    
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
            "/education/the-hong-kong-academy-for-performing-arts.md",
            "/education/northcote-college-of-education.md",
          ]
        },
      ],
    },
    {
      text: "風俗",
      collapsible: true,
      children: [
        {
          text: "節慶",
          collapsible: true,
          children: [
            "/custom/lunar-new-year.md",
            "/custom/dragon-boat-festival.md",
            "/custom/mid-autumn-festival.md",
            "/custom/yu-lan-festival.md",
          ]
        },
        {
          text: "打醮",
          collapsible: true,
          children: [
            "/custom/cheung-chau-jiao-festival.md",
            "/custom/high-land-jiao-festival.md",
          ]
        },
      ],
    },
    {
      text: "古物及古蹟",
      collapsible: true,
      children: [
        {
          text: "考古調查",
          collapsible: true,
          children: [
            "/archaeology/hong-kong-archaeological-survey-1982-1985.md",
            "/archaeology/hong-kong-archaeological-survey-1997-1998.md",
          ]
        },
        {
          text: "新石器時代",
          collapsible: true,
          children: [
            "/archaeology/sha-ha-site.md",
            "/archaeology/lung-kwu-chau-site.md",
            "/archaeology/lung-kwu-tan-site.md",
            "/archaeology/lung-kwu-sheung-tan-site.md",
          ]
        },
        {
          text: "漢代",
          collapsible: true,
          children: [
            "/archaeology/lei-cheng-uk-han-tomb.md",
          ]
        },
        {
          text: "明代",
          collapsible: true,
          children: [
            "/archaeology/wun-yiu.md",
          ]
        },
        {
          text: "清代",
          collapsible: true,
          children: [
            "/archaeology/kowloon-walled-city.md",
            "/archaeology/tung-chung-fort.md",
          ]
        },
        {
          text: "碑刻",
          collapsible: true,
          children: [
            "/stele-inscription/tung-wah-group-of-hospitals.md",
            "/stele-inscription/sik-sik-yuen-wang-tai-sin.md",
            "/stele-inscription/sung-wong-toi-site-kowloon.md",
            "/stele-inscription/hau-wong-temple-kowloon-city.md",
          ]
        },
        {
          text: "歷史建築",
          collapsible: true,
          children: [
            "/historic-building/hau-ku-shek-ancestral-hall.md",
            "/historic-building/hau-mei-fung-ancestral-hall.md",
            "/historic-building/tat-tak-communal-hall.md",
          ]
        },
        {
          text: "考古展覽",
          link: "/archaeology/archaeological-exhibition.md",
        },
      ],
    },
  ],
  
});