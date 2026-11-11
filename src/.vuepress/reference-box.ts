import type { Plugin } from "vuepress/core";

const OPEN_TAG = "<ReferenceBox";
const CLOSE_TAG = "</ReferenceBox>";

interface TokenLike {
  type: string;
  content?: string;
  children?: TokenLike[] | null;
}

const closesBox = (token: TokenLike): boolean =>
  Boolean(token.content?.includes(CLOSE_TAG)) ||
  (token.children ?? []).some((child) => child.content?.includes(CLOSE_TAG));

export const referenceBoxPlugin = (): Plugin => ({
  name: "reference-box-order",

  extendsMarkdown(md) {
    const moveToEnd = (state: { tokens: TokenLike[] }): void => {
      const { tokens } = state;

      const moved = new Set<TokenLike>();
      let index = 0;

      while (index < tokens.length) {
        const token = tokens[index];

        if (
          token.type !== "html_block" ||
          !token.content?.trimStart().startsWith(OPEN_TAG)
        ) {
          index += 1;
          continue;
        }

        let end = index;
        while (end < tokens.length && !closesBox(tokens[end])) end += 1;

        if (end >= tokens.length) break;

        for (let cursor = index; cursor <= end; cursor += 1) {
          moved.add(tokens[cursor]);
        }

        index = end + 1;
      }

      if (!moved.size) return;

      const rest = tokens.filter((token) => !moved.has(token));
      const boxes = tokens.filter((token) => moved.has(token));

      tokens.splice(0, tokens.length, ...rest, ...boxes);
    };

    try {
      md.core.ruler.after("footnoteTail", "referenceBoxLast", moveToEnd);
    } catch {
      md.core.ruler.push("referenceBoxLast", moveToEnd);
    }
  },
});
