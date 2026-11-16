/**
 * 站點標識與 URL／路徑構造的單一入口。
 *
 * 這裡集中三類東西，避免同樣的字串拼接散落各處：
 *   1. 站點常量（名稱、作者、主機名）；
 *   2. 絕對網址與頁面路徑的正規化；
 *   3. OG 卡片的檔名與網址。
 */

export const HOSTNAME = "https://www.pasthk.com";

export const HOST = HOSTNAME.replace(/^https?:\/\//, "");

export const absoluteUrl = (path: string): string => `${HOSTNAME}${path}`;

export const SITE_NAME = "香港文獻類編";

export const SITE_TAGLINE = "認識香港，從文獻開始";

export const SITE_NAME_EN = "Thematic Compilation of Hong Kong Archives";

/** 編者：theme author 設定與各頁 JSON-LD 的 Person 節點共用 */
export const AUTHOR_NAME = "NG, KIN CHUNG";
export const AUTHOR_URL = `${HOSTNAME}/about.html`;
const PERSON_ID = `${HOSTNAME}/#person`;

/** JSON-LD author 節點：自帶 url，毋須解析 @graph 也能取得 */
export const AUTHOR_NODE = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: AUTHOR_NAME,
  url: AUTHOR_URL,
} as const;

/* ---- 頁面路徑 ---- */

/**
 * 側邊欄／導覽連結轉為頁面路徑：`.md` 收斂為 `.html`，
 * 目錄索引（README／index）收斂為結尾斜線，與 VuePress 的 page.path 一致。
 */
export const pagePathOfLink = (link: string): string => {
  let path = link.replace(/\.md$/, ".html");

  if (path.endsWith("/README.html")) path = path.slice(0, -"README.html".length);
  else if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length);

  return path;
};

/* ---- OG 卡片 ---- */

/** 由頁面路徑推出卡片檔名：`/a/b.html` → `a--b.png` */
export const ogFileName = (pagePath: string): string => {
  const slug = pagePath
    .replace(/^\//, "")
    .replace(/\.html$/, "")
    .replace(/\/$/, "")
    .replace(/\//g, "--");

  return `${slug || "index"}.png`;
};

export const ogImageUrl = (hostname: string, pagePath: string): string =>
  `${hostname.replace(/\/$/, "")}/og/${ogFileName(pagePath)}`;
