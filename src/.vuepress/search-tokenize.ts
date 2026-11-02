/**
 * 全文檢索的斷詞規則，索引（建置期，theme.ts）與查詢（瀏覽器，client.js）共用同一套。
 *
 * 插件預設以 `Intl.Segmenter` 按語言斷詞，但 ICU 對中文的切分不穩定，且常把
 * 兩字以上的詞拆成單字：實測「丁屋」切成「丁」「屋」、「徙置區」切成
 * 「徙」「置」「區」。查詢端把各詞以 OR 串接，於是查「丁屋」命中 61 頁、
 * 查「徙置區」36 頁，多數頁面只含其中一個字，精確度極低。
 *
 * 改為對中日韓文字取二元切分（bigram）：索引與查詢兩端規則一致，且與上下文
 * 無關；上述兩例分別收斂到 1 頁與 4 頁，而整詞查詢（熱帶氣旋、颱風）的命中
 * 數與改動前相同，未犧牲召回。也能命中詞典外的專名（如「李鄭屋」「姬蒂」）。
 *
 * 二元切分的代價是索引變大（每個漢字約產生一個詞條），換取中文的召回率；
 * 拉丁文字仍按空白與標點切分並轉小寫。
 */

/** 連續的中日韓文字（含擴充 A、相容表意文字、假名、諺文）。 */
const CJK_RUN =
  /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF]+/gu;

/** 非字母、非數字的字元，用來切開拉丁文字。 */
const NON_WORD = /[^\p{L}\p{N}]+/u;

/** 把一段拉丁文字切成小寫詞條。 */
function pushLatin(tokens: string[], segment: string): void {
  for (const word of segment.split(NON_WORD)) {
    if (word) tokens.push(word.toLowerCase());
  }
}

/**
 * 斷詞：中日韓文字取相鄰兩字的組合，其餘文字按空白與標點切分。
 *
 * 單獨一個漢字（如「碑」）無法成對，故直接保留該字；配合查詢端開啟前綴比對，
 * 仍可命中「碑記」「碑文」等詞條。
 */
export function tokenizeForSearch(text: string): string[] {
  const tokens: string[] = [];
  let cursor = 0;

  for (const match of text.matchAll(CJK_RUN)) {
    const start = match.index ?? 0;
    pushLatin(tokens, text.slice(cursor, start));

    const run = match[0];

    if (run.length === 1) {
      tokens.push(run);
    } else {
      for (let i = 0; i < run.length - 1; i += 1) {
        tokens.push(run.slice(i, i + 2));
      }
    }

    cursor = start + run.length;
  }

  pushLatin(tokens, text.slice(cursor));
  return tokens;
}

/**
 * 索引端斷詞。文件 id（如「185#警告港海小型船艇…」）由插件約定整串保留，
 * 若拆成二元詞條，等於把標題再索引一次，只會虛增索引體積。
 */
export function tokenizeForIndex(text: string, fieldName?: string): string[] {
  return fieldName === "id" ? [text] : tokenizeForSearch(text);
}

/** 查詢端斷詞，須與 {@link tokenizeForIndex} 的規則一致，否則查不到索引中的詞條。 */
export const splitQuery = async (query: string): Promise<string[]> =>
  tokenizeForSearch(query);
