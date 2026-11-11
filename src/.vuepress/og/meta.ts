
import { CARD_HEIGHT, CARD_WIDTH } from "./card.js";

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
