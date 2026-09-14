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
      text: "法例",
      collapsible: true,
      children: [
        {
          text: "第53章",
          collapsible: true,
          children: [
            "/legislation/cap-53-antiquities-and-monuments-ordinance.md",
            "/legislation/cap-53a-antiquities-excavation-and-search-regulations.md",
            "/legislation/cap-53b-antiquities-and-monuments-declaration-of-monuments-and-historical-buildings-consolidation-notice.md",
            "/legislation/cap-53c-antiquities-and-monuments-declaration-of-archaeological-site-notice-1996.md",
            "/legislation/cap-53d-antiquities-and-monuments-declaration-of-proposed-monument-notice-2003.md",
            "/legislation/cap-53e-antiquities-and-monuments-declaration-of-proposed-monument-no-128-pok-fu-lam-road-notice.md",
            "/legislation/cap-53f-antiquities-and-monuments-declaration-of-proposed-monument-no-45-stubbs-road-notice.md",
            "/legislation/cap-53g-antiquities-and-monuments-declaration-of-proposed-monument-ho-tung-gardens-notice.md",
            "/legislation/cap-53h-antiquities-and-monuments-declaration-of-proposed-monument-hung-lau-notice.md",
          ]
        },
        {
          text: "第499章",
          collapsible: true,
          children: [
            "/legislation/cap-499-environmental-impact-assessment-ordinance.md",
            "/legislation/cap-499a-environmental-impact-assessment-appeal-board-regulation.md",
            "/legislation/cap-499b-environmental-impact-assessment-fees-regulation.md",
            "/legislation/cap-499c-environmental-impact-assessment-exemption-of-shenzhen-section-of-the-shenzhen-bay-bridge-order.md",
          ]
        },        
      ],
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
          text: "大學",
          collapsible: true,
          children: [
            "/education/the-university-of-hong-kong.md",
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
          text: "清代",
          collapsible: true,
          children: [
            "/archaeology/kowloon-walled-city.md",
            "/archaeology/tung-chung-fort.md",
          ]
        },
        {
          text: "歷史建築",
          collapsible: true,
          children: [
            "/historic-building/hau-ku-shek-ancestral-hall.md",
            "/historic-building/hau-mei-fung-ancestral-hall.md",
          ]
        },
      ],
    },
  ],
  
});