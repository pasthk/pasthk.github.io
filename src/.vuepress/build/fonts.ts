import type { Plugin } from "vite";

export function stripUnusedFontsPlugin(): Plugin {
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

const FONT_FACE = /@font-face\s*\{[^}]*\}/gu;
const FAMILY = /font-family\s*:\s*["']?([^;"'}]+)["']?\s*[;}]/;

function removeUnusedFontFaces(css: string): string {
  /* 本站以 serif 系統字型排版，正常情況下沒有 @font-face，先短路省去整趟掃描 */
  if (!css.includes("@font-face")) return css;

  /* 先抽掉所有 @font-face，剩下的才是頁面真正引用到的 font-family 宣告 */
  const withoutFaces = css.replace(FONT_FACE, "");

  return css.replace(FONT_FACE, (rule) => {
    const family = FAMILY.exec(rule)?.[1]?.trim();

    /* 無法判定字族時保留，寧可多留也不誤刪 */
    if (!family) return rule;

    const usage = new RegExp(
      `font-family\\s*:\\s*[^;{}]*?["']?${escapeRegExp(family)}["']?\\s*[,;}]`,
    );

    return usage.test(withoutFaces) ? rule : "";
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
