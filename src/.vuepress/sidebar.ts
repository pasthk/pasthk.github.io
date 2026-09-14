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
        "/nature/flooding.md",
        {
          text: "熱帶氣旋",
          collapsible: true,
          children: [
            "/nature/1946-signal.md",
            "/nature/1947-signal.md",
            "/nature/1948-signal.md",
            "/nature/1949-signal.md",
            "/nature/1950-signal.md",
            "/nature/1951-signal.md",
            "/nature/1952-signal.md",
            "/nature/1953-signal.md",
            "/nature/1954-signal.md",
            "/nature/1955-signal.md",
            "/nature/1956-signal.md",
            "/nature/1957-signal.md",
            "/nature/1958-signal.md",
            "/nature/1959-signal.md", 
            "/nature/1960-signal.md",
            "/nature/1961-signal.md",
            "/nature/1962-signal.md",
            "/nature/1963-signal.md",
            "/nature/1964-signal.md",
            "/nature/1965-signal.md",
            "/nature/1966-signal.md",
            "/nature/1967-signal.md",
            "/nature/1968-signal.md",
            "/nature/1969-signal.md",
            "/nature/1970-signal.md",
            "/nature/1971-signal.md",
            "/nature/1972-signal.md",
            "/nature/1973-signal.md",
            "/nature/1974-signal.md",
            "/nature/1975-signal.md",
            "/nature/1976-signal.md",
            "/nature/1977-signal.md",
            "/nature/1978-signal.md",
            "/nature/1979-signal.md",
            "/nature/1980-signal.md",
            "/nature/1981-signal.md",
            "/nature/1982-signal.md",
            "/nature/1983-signal.md",
            "/nature/1984-signal.md",
            "/nature/1985-signal.md",
            "/nature/1986-signal.md",
            "/nature/1987-signal.md",
            "/nature/1988-signal.md",
            "/nature/1989-signal.md",
            "/nature/1990-signal.md",
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