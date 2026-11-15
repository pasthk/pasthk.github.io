import type { HeadConfig } from "vuepress/core";

import { itemListNode, type ListItem } from "./item-list.js";
import { socialTags } from "./og/meta.js";
import { AUTHOR_NODE, HOSTNAME, SITE_NAME } from "./site.js";

interface CollectionMeta {
  url: string;
  title: string;
  description: string;
  image: string;
  items?: ListItem[];
  /** 中文以「字」計的可見內文長度，供 JSON-LD wordCount 使用 */
  wordCount?: number;
}

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
    author: AUTHOR_NODE,
    ...(wordCount === undefined ? {} : { wordCount }),
    ...(items.length ? { mainEntity: itemListNode(url, items) } : {}),
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
