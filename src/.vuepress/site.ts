export const HOSTNAME = "https://www.pasthk.com";

export const HOST = HOSTNAME.replace(/^https?:\/\//, "");

export const absoluteUrl = (path: string): string => `${HOSTNAME}${path}`;

export const SITE_NAME = "香港文獻類編";

export const SITE_TAGLINE = "認識香港，從文獻開始";

export const SITE_NAME_EN = "Thematic Compilation of Hong Kong Archives";

/** 編者：theme author 設定與各頁 JSON-LD 的 Person 節點共用 */
export const AUTHOR_NAME = "NG, KIN CHUNG";
export const AUTHOR_URL = `${HOSTNAME}/about.html`;
export const PERSON_ID = `${HOSTNAME}/#person`;

/** JSON-LD author 節點：自帶 url，毋須解析 @graph 也能取得 */
export const AUTHOR_NODE = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: AUTHOR_NAME,
  url: AUTHOR_URL,
} as const;
