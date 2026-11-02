import type { Plugin } from "vite";

/**
 * 移除產物 CSS 中「沒有任何規則引用」的 `@font-face`。
 *
 * 緣起：主題的 `_normalize.scss` 會 `@use "fonts/crimson.css"`，該檔把一個
 * 4.3 KB 的 TTF 以 base64 內嵌。本站 `--vp-font` 設為 `serif`，全站沒有任何
 * 元素使用 `Crimson`，這段資料卻隨每次載入的 CSS 一起下載（gzip 後約 2.4 KB）。
 *
 * 安全性：採「守衛式」處理——只有在整份 CSS 中找不到其他 `font-family: <該字族>`
 * 宣告時才移除。日後若主題改用 Crimson 排正文，這裡會自動保留原樣，不會破版。
 *
 * 注意：此鉤子跑在檔名雜湊計算之後，所以剝除不會改變 asset 檔名。一般情況無妨
 * （來源 CSS 一改，雜湊就跟著變），但若日後只調整本檔的剝除邏輯、未動任何樣式，
 * 檔名不會更新，CDN／瀏覽器可能沿用舊快取；屆時需一併改動樣式以觸發換名。
 */
export function stripUnusedFonts(): Plugin {
  return {
    name: "pasthk:strip-unused-fonts",
    enforce: "post",
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        for (const file of Object.values(bundle)) {
          if (file.type !== "asset" || !file.fileName.endsWith(".css")) continue;

          const source =
            typeof file.source === "string"
              ? file.source
              : new TextDecoder().decode(file.source);

          const stripped = removeUnusedFontFaces(source);

          if (stripped !== source) file.source = stripped;
        }
      },
    },
  };
}

const FONT_FACE = /@font-face\s*\{[^}]*\}/g;
const FAMILY = /font-family\s*:\s*["']?([^;"'}]+)["']?\s*[;}]/;

function removeUnusedFontFaces(css: string): string {
  return css.replace(FONT_FACE, (rule) => {
    const family = FAMILY.exec(rule)?.[1]?.trim();

    if (!family) return rule;

    const usage = new RegExp(
      `font-family\\s*:\\s*["']?${escapeRegExp(family)}["']?\\s*[;}]`,
    );

    // 把自己排除後再找一次；仍有引用就保留。
    return usage.test(css.replace(rule, "")) ? rule : "";
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
