import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    {
      text: "前言",
      link: "/",
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
      text: "考古",
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