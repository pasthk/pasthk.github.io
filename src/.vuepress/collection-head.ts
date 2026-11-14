import type { HeadConfig } from "vuepress/core";

import { itemListNode, type ListItem } from "./item-list.js";
import { socialTags } from "./og/meta.js";
import { HOSTNAME, SITE_NAME } from "./site.js";

interface CollectionMeta {
  url: string;
  title: string;
  description: string;
  image: string;
  items?: ListItem[];
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
