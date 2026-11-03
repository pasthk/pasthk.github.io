import type { Plugin } from "vuepress/core";

/**
 * 「參考信息」塊在 Markdown 中寫成 `<ReferenceBox>…</ReferenceBox>`，
 * 由 @mdit-vue/plugin-component 收成 html_block。
 * 塊內若夾有空行（例如出處與「按：」註記之間），會被拆成數個 token，
 * 故搬移時須以開合標籤界定整個範圍，而非只看單一 token。
 */
const OPEN_TAG = "<ReferenceBox";
const CLOSE_TAG = "</ReferenceBox>";

interface TokenLike {
  type: string;
  content?: string;
  children?: TokenLike[] | null;
}

/** 收合標籤可能自成一個 html_block，也可能落在段落的 inline 子節點中 */
const closesBox = (token: TokenLike): boolean =>
  Boolean(token.content?.includes(CLOSE_TAG)) ||
  (token.children ?? []).some((child) => child.content?.includes(CLOSE_TAG));

/**
 * 把「參考信息」移到注釋之後。
 *
 * 頁面的注釋以 `[^1]: …` 寫在正文末尾，但 @mdit/plugin-footnote 的 `footnoteTail`
 * 是在 core 階段才把整份注釋清單附加到 token 末端，因此緊接在定義之後的
 * <ReferenceBox> 反而排在注釋之前。本規則排在 `footnoteTail` 之後執行，
 * 把該區塊挪到最末，使閱讀順序為「正文 → 注釋 → 參考信息」。
 */
export const referenceBoxPlugin = (): Plugin => ({
  name: "reference-box-order",

  extendsMarkdown(md) {
    const moveToEnd = (state: { tokens: TokenLike[] }): void => {
      const { tokens } = state;

      // 先以開合標籤圈出每個參考信息塊的 token 範圍
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

        // 找不到收合標籤表示區塊不完整，寧可原樣保留，也不要搬出半截標籤
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

    // markdown-it 的 Ruler 沒有查詢規則名稱的公開介面，`after` 在規則不存在時會拋錯；
    // 未啟用注腳（footnoteTail 不存在）時退回附加到最後，效果相同。
    try {
      md.core.ruler.after("footnoteTail", "referenceBoxLast", moveToEnd);
    } catch {
      md.core.ruler.push("referenceBoxLast", moveToEnd);
    }
  },
});
