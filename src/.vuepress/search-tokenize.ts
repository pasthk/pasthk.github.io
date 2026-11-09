/**
 * 全文檢索的斷詞規則，索引（建置期，theme.ts）與查詢（瀏覽器，client.js）共用同一套。
 *
 * 為何不用插件預設的 `Intl.Segmenter`：ICU 對中文的切分不穩定，常把兩字以上的詞
 * 拆成單字（「丁屋」→「丁」「屋」、「徙置區」→「徙」「置」「區」），查詢端以 OR
 * 串接後精確度極低。改為對中日韓文字取二元切分（bigram）後，切分結果與上下文無關，
 * 也能命中詞典外的專名（「李鄭屋」「姬蒂」）。
 *
 * 一個必須守住的限制：詞條必須是原文的**連續子串**。插件用命中詞條在原文中找位置
 * 產生摘要片段（getMatchedContent），若詞條經過改寫（正規化、繁簡轉換、異體字折疊），
 * 摘要就對不上原文，該筆結果會被當成「無相符內容」丟棄。因此這裡不做任何字面改寫，
 * 只做切分與大小寫折疊。
 *
 * 精確度主要不是靠斷詞，而是靠查詢端的 `combineWith: "AND"`（見 client.js）：
 * 二元詞條以 OR 串接時，長詞會被拆成多個片段各自命中，召回高但精確度低。
 */

/**
 * 連續的中日韓文字：
 * - U+3005–U+3007：々（同字疊符）、〆、〇（如「一九〇〇年」）
 * - U+3040–U+30FF：平假名、片假名
 * - U+3400–U+4DBF：擴充 A
 * - U+4E00–U+9FFF：基本區
 * - U+F900–U+FAFF：相容表意文字
 * - U+AC00–U+D7AF：諺文音節
 * - U+20000–U+323AF：擴充 B–H（香港地名偶有罕用字，如「𠝹」）
 */
const CJK_RUN =
  /[\u3005-\u3007\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF\u{20000}-\u{323AF}]+/gu;

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
 *
 * 重複出現的詞條刻意保留（不去重）：插件以詞頻計算 BM25 分數，去重會讓
 * 「香港」出現十次的段落與出現一次的段落同分。
 */
export function tokenizeForSearch(text: string): string[] {
  const tokens: string[] = [];
  let cursor = 0;

  for (const match of text.matchAll(CJK_RUN)) {
    const start = match.index ?? 0;
    pushLatin(tokens, text.slice(cursor, start));

    const run = match[0];

    // 以碼點切分而非 UTF-16 碼元：擴充 B 區的字（如「𠝹」）佔兩個碼元，
    // 直接 slice 會把代理對切成兩半，產生無法比對的孤立代理字元。
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
