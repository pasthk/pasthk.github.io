import type { HeadConfig } from "vuepress/core";

import { socialTags } from "./og/meta.js";
import { HOSTNAME, SITE_NAME } from "./site.js";

/**
 * 動態建立的目錄頁共用的 head。
 *
 * `@vuepress/plugin-seo` 在主題的 onInitialized 走訪 app.pages，
 * 而 browse.html、各章節落地頁都是使用者外掛其後才建立的，趕不上那一輪，
 * 必須自行補 canonical／og:*／JSON-LD。抽成單一函式，避免兩處各自維護
 * 又再次出現 social meta 或 schema 漂移。
 *
 * 不引用 theme.ts 的 #organization／#website 節點，JSON-LD 保持自足，
 * 不會留下懸空參照。
 */
export interface CollectionMeta {
  url: string;
  title: string;
  description: string;
  image: string;
}

export const collectionHead = ({
  url,
  title,
  description,
  image,
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
