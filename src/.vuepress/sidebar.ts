import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    {
      text: "風俗",
      collapsible: true,
      children: [
        {
          text: "節慶",
          collapsible: true,
          children: [
            "/festival/mid-autumn-festival.md",
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