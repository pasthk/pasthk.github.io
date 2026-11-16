import { CARD_HEIGHT, CARD_WIDTH } from "../og/card.js";

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
