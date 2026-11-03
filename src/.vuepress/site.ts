/**
 * 站台基本資料的單一來源。
 *
 * 網址原本在 theme.ts、llms.ts、og/card.ts、ReferenceBox.vue 各寫一份，
 * 換網域或改站名時容易漏改其中一處；集中在此，其餘模組一律引用。
 *
 * 注意：apex（pasthk.com）會 301 轉向 www，因此一律使用含 www 的版本，
 * 否則 canonical、og:image、IndexNow 的 host 會與實際主機不一致。
 */
export const HOSTNAME = "https://www.pasthk.com";

/** 不含協定的主機名，用於卡片頁腳等處顯示 */
export const HOST = HOSTNAME.replace(/^https?:\/\//, "");

export const SITE_NAME = "香港文獻類編";

export const SITE_TAGLINE = "認識香港，從文獻開始";

/** 英文站名，用於卡片刊頭與結構化資料的 alternateName */
export const SITE_NAME_EN = "Thematic Compilation of Hong Kong Archives";
