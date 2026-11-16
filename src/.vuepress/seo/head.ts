import type { HeadConfig } from "vuepress/core";

import { AUTHOR_NODE, SITE_NAME } from "../site.js";
import { jsonLdGraph, ORGANIZATION_ID, WEBSITE_ID } from "./graph.js";
import { itemListNode, type ListItem } from "./items.js";
import { socialTags } from "./social.js";

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
