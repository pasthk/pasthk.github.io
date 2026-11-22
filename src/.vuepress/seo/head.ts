import type { HeadConfig } from "vuepress/core";

import { CARD_HEIGHT, CARD_WIDTH } from "../og/card.js";
import { AUTHOR_NODE, SITE_NAME } from "../site.js";
import {
  jsonLdGraph,
  ORGANIZATION_ID,
  WEBSITE_ID,
  itemListNode,
  type ListItem,
} from "./graph.js";

interface CollectionMeta {
  url: string;
  title: string;
  description: string;
  image: string;
  items?: ListItem[];
  /** 中文以「字」計的可見內文長度，供 JSON-LD wordCount 使用 */
  wordCount?: number;
}

/**
 * OG／Twitter 卡片標籤。逐頁 head（theme）與虛擬頁 head（collectionHead）
 * 共用同一份尺寸宣告，避免卡片比例與 og/card.ts 的實際畫布脫節。
 */
export const socialTags = (
  image: string,
  alt: string,
): Record<string, string> => ({
  "og:image": image,
  "og:image:type": "image/png",
  "og:image:width": String(CARD_WIDTH),
  "og:image:height": String(CARD_HEIGHT),
  "og:image:alt": alt,
  "twitter:card": "summary",
  "twitter:image:src": image,
  "twitter:image:alt": alt,
});

/**
 * 虛擬頁（如文獻綜覽）的完整 head：canonical、JSON-LD 與 OG 標籤。
 * 與主題逐頁產生的 head 共用同一個圖譜建構器與站級節點。
 */
export const collectionHead = ({
  url,
  title,
  description,
  image,
  items = [],
  wordCount,
}: CollectionMeta): HeadConfig[] => {
  const tags: Record<string, string> = {
    "og:type": "website",
    "og:url": url,
    "og:site_name": SITE_NAME,
    "og:title": title,
    "og:description": description,
    ...socialTags(image, title),
  };

  const jsonLd = jsonLdGraph({
    "@type": "CollectionPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: "zh-Hant",
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
    author: AUTHOR_NODE,
    ...(wordCount === undefined ? {} : { wordCount }),
    ...(items.length ? { mainEntity: itemListNode(url, items) } : {}),
  });

  return [
    ["link", { rel: "canonical", href: url }],
    ["script", { type: "application/ld+json" }, JSON.stringify(jsonLd)],
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
