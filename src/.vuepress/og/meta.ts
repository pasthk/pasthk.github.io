// 分享卡 meta 標籤值的唯一來源。
//
// theme.ts 的 seo.ogp 回呼（正常頁面）與 page-index.ts（執行期才建立、
// 拿不到 seo 插件標籤的 /browse.html）都從這裡取值。先前兩處各寫一份，
// 卡片改成正方形時漏改 browse 頁，og:image:height 一度停留在 630。

import { CARD_HEIGHT, CARD_WIDTH } from "./card.js";

/**
 * 由分享卡網址與替代文字產生 OGP／Twitter 標籤值。
 *
 * 尺寸直接取 card.ts 的畫布常數，調整卡片規格時 meta 會同步更新；
 * MIME 固定為 PNG，因為 og/plugin.ts 會先把 SVG 光柵化（社群平台不接受 SVG）。
 * 正方形卡片對應 Twitter 的 `summary` 而非 `summary_large_image`。
 *
 * 回傳單一物件供兩處共用：theme.ts 直接 Object.assign 進 ogp；
 * page-index.ts 再依鍵名前綴決定要輸出 property 還是 name 屬性。
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
