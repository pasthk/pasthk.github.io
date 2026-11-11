import type { Plugin } from "vite";

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

export function removeUnusedFontFaces(css: string): string {
  return css.replace(FONT_FACE, (rule) => {
    const family = FAMILY.exec(rule)?.[1]?.trim();

    if (!family) return rule;

    const usage = new RegExp(
      `font-family\\s*:\\s*[^;{}]*?["']?${escapeRegExp(family)}["']?\\s*[,;}]`,
    );

    return usage.test(css.replaceAll(rule, "")) ? rule : "";
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
