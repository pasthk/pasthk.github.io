import type { HeadConfig } from "vuepress/core";

import { socialTags } from "./og/meta.js";
import { HOSTNAME, SITE_NAME } from "./site.js";

/**
 * 動態建立的目錄頁共用的 head。
 *
 * `@vuepress/plugin-seo` 在主題的 onInitialized 走訪 app.pages，
 * 而 browse.html 是使用者外掛其後才建立的，趕不上那一輪，
 * 必須自行補 canonical／og:*／JSON-LD。抽成單一函式，避免 social meta
 * 與 schema 各自維護而漂移。
 *
 * 不引用 theme.ts 的 #organization／#website 節點，JSON-LD 保持自足，
 * 不會留下懸空參照。
 */
export interface CollectionMeta {
  url: string;
  title: string;
  description: string;
  image: string;
  /** 目錄收錄的頁面；有值時輸出完整的 ItemList，供機器直接讀取清單 */
  items?: { name: string; url: string }[];
}

export const collectionHead = ({
  url,
  title,
  description,
  image,
  items = [],
}: CollectionMeta): HeadConfig[] => {
  const tags: Record<string, string> = {
    "og:type": "website",
    "og:url": url,
    "og:site_name": SITE_NAME,
    "og:title": title,
    "og:description": description,
    ...socialTags(image, title),
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: "zh-Hant",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${HOSTNAME}/#website`,
      url: `${HOSTNAME}/`,
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: `${HOSTNAME}/`,
    },
    // 模型讀 HTML 還得先從導覽列中辨認哪些才是史料連結；JSON-LD 直接給
    // 一份可枚舉的清單，與 theme.ts 為主題索引頁產生的 mainEntity 同格式。
    ...(items.length
      ? {
          mainEntity: {
            "@type": "ItemList",
            "@id": `${url}#itemlist`,
            numberOfItems: items.length,
            itemListElement: items.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.name,
              url: item.url,
            })),
          },
        }
      : {}),
  };

  return [
    ["link", { rel: "canonical", href: url }],
    [
      "script",
      { type: "application/ld+json" },
      JSON.stringify(jsonLd),
    ],
    ...Object.entries(tags).map(
      ([key, content]): HeadConfig => [
        "meta",
        key.startsWith("twitter:")
          ? { name: key, content }
          : { property: key, content },
      ],
    ),
  ];
};
