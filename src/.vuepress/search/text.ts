/**
 * 搜尋的文本層：建置期切分索引文本，執行期切分查詢字串。
 *
 * 兩端共用同一套分詞，確保索引與查詢切法一致。此檔由 `client.js` 直接
 * import，會進入瀏覽器端 bundle，因此**不得**引入 node 內建模組或任何
 * 建置期模組（`page-meta` 等）——否則 dev 模式下 Vite 會把 `node:path`
 * 外部化並在載入時拋錯，整頁空白。索引關鍵詞的組裝留在 `theme.ts`。
 */

const CJK_RUN =
  /[\u3005-\u3007\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF\u{20000}-\u{323AF}]+/gu;

const NON_WORD = /[^\p{L}\p{N}]+/u;

function pushLatin(tokens: string[], segment: string): void {
  for (const word of segment.split(NON_WORD)) {
    if (word) tokens.push(word.toLowerCase());
  }
}

function tokenizeForSearch(text: string): string[] {
  const tokens: string[] = [];
  let cursor = 0;

  for (const match of text.matchAll(CJK_RUN)) {
    const start = match.index ?? 0;
    pushLatin(tokens, text.slice(cursor, start));

    const run = match[0];

    const chars = [...run];

    if (chars.length === 1) {
      tokens.push(chars[0]);
    } else {
      for (let i = 0; i < chars.length - 1; i += 1) {
        tokens.push(chars[i] + chars[i + 1]);
      }
    }

    cursor = start + run.length;
  }

  pushLatin(tokens, text.slice(cursor));
  return tokens;
}

export function tokenizeForIndex(text: string, fieldName?: string): string[] {
  return fieldName === "id" ? [text] : tokenizeForSearch(text);
}

export const splitQuery = async (query: string): Promise<string[]> =>
  tokenizeForSearch(query);
