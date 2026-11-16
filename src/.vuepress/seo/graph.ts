import { AUTHOR_NODE, HOSTNAME, SITE_NAME, SITE_NAME_EN } from "../site.js";

/**
 * 全站 JSON-LD 圖譜。
 *
 * 每個頁面都輸出同一組站級節點（Organization／Person／WebSite），頁面本身
 * 只放參照用的 @id。這三個節點的內容只在這裡維護一次，主題的逐頁 jsonLd
 * 與虛擬頁的 collectionHead 共用同一個建構器，避免兩套寫法各自漂移。
 */
export const ORGANIZATION_ID = `${HOSTNAME}/#organization`;
export const WEBSITE_ID = `${HOSTNAME}/#website`;

export type JsonLdNode = Record<string, unknown>;

const organization: JsonLdNode = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE_NAME,
  alternateName: SITE_NAME_EN,
  url: HOSTNAME,
  logo: {
    "@type": "ImageObject",
    url: `${HOSTNAME}/favicon.png`,
    width: 268,
    height: 268,
  },
  email: "pasthk@outlook.com",
  sameAs: ["https://github.com/pasthk/pasthk.github.io"],
};

const person: JsonLdNode = {
  ...AUTHOR_NODE,
  email: "pasthk@outlook.com",
};

const website: JsonLdNode = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: `${HOSTNAME}/`,
  name: SITE_NAME,
  inLanguage: "zh-Hant",
  publisher: { "@id": ORGANIZATION_ID },
};

/** 主節點 + 附加節點（如麵包屑）+ 三個站級節點，順序固定 */
export const jsonLdGraph = (
  main: JsonLdNode,
  extras: (JsonLdNode | null | undefined)[] = [],
): JsonLdNode => ({
  "@context": "https://schema.org",
  "@graph": [
    main,
    ...extras.filter((node): node is JsonLdNode => Boolean(node)),
    organization,
    person,
    website,
  ],
});
