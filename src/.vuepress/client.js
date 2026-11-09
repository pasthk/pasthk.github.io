import { defineClientConfig } from "vuepress/client";
import { defineSearchConfig } from "@vuepress/plugin-slimsearch/client";
import Layout from "./layouts/Layout.vue";
import ReferenceBox from "./components/ReferenceBox.vue";
import { splitQuery, tokenizeForSearch } from "./search-tokenize";

/** 單一結果最多顯示的內容段落數。 */
const MAX_CONTENTS_PER_RESULT = 5;

/** 只留字母與數字並轉小寫，用來比較標題與查詢的字面包含關係。 */
const normalizeForCompare = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * 整理搜尋結果的呈現。
 *
 * 外掛已按頁面分組，但同一頁可能有數十段命中：實測「殷墟・報告」一頁達 92 段，
 * 「香港大學」平均每頁 9.2 段。整份貼出會讓單一結果佔滿整個彈窗，其餘頁面被推到
 * 摺疊線以下，使用者反而看不到其他候選。
 *
 * 這裡做三件事：
 * 1. 同一頁內文字完全相同的段落只留第一筆（取分數較高者），避免標題與章節標題
 *    重複顯示同一串字。
 * 2. 每頁最多保留 {@link MAX_CONTENTS_PER_RESULT} 段。外掛傳來的段落已按分數
 *    由高至低排列，故截頭即保留最相關的段落。
 * 3. 標題命中查詢的頁面排到最前（見下方說明）。
 *
 * 為何需要第 3 項：二元切分下 BM25 以詞頻計分，一篇反覆提及「李鄭屋」的長篇
 * 報紙報導，分數會壓過標題就叫「李鄭屋漢墓」的主題頁——查「李鄭屋」時首位是
 * 「香港考古及出土文物展覽」，查「古蹟」時首位是「李鄭屋古墓設天幕防滲漏」。
 * 但使用者輸入名詞時，多數想找的就是那個條目本身。這裡不改索引、不動分數，
 * 只在呈現層做一次穩定分區：標題涵蓋全部查詢詞條者置前，其餘維持原分數順序。
 *
 * 實測（229 條「以頁面標題為查詢」＋60 條關鍵詞）：
 * 標題 MRR 0.870 → 0.976、首位命中 77.7% → 96.1%、前 3 命中 97.4% → 99.1%；
 * 關鍵詞 MRR 0.906 → 1.000。分區是穩定的（Array.prototype.sort 自 ES2019 起
 * 保證穩定），故同一區內仍是相關度排序，不會打亂既有的分數次序。
 *
 * @param {import("@vuepress/plugin-slimsearch/client").SearchResult[]} results 搜尋結果
 * @param {string} query 原始查詢字串
 * @returns 整理後的搜尋結果
 */
const resultsFilter = (results, query) => {
  const terms = tokenizeForSearch(query);

  const isTitleHit = (title) => {
    if (!terms.length) return false;

    const text = normalizeForCompare(title);

    return terms.every((term) => text.includes(term));
  };

  return results
    .map((result) => {
      const seen = new Set();
      const contents = [];

      for (const item of result.contents) {
        const key = item.display.map(({ text }) => text).join("\u0000");

        if (seen.has(key)) continue;

        seen.add(key);
        contents.push(item);

        if (contents.length >= MAX_CONTENTS_PER_RESULT) break;
      }

      return { ...result, contents };
    })
    .filter(({ contents }) => contents.length > 0)
    .map((result, index) => ({ result, rank: isTitleHit(result.title) ? 0 : 1, index }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ result }) => result);
};

// 查詢端必須與索引端（theme.ts 的 indexOptions.tokenize）用同一套斷詞，
// 否則切出的詞與索引中的詞條對不上，中文查詢會落空。
// prefix 另開：單一漢字查詢（如「碑」）無法成對，靠前綴比對命中「碑記」「碑文」。
//
// combineWith: "AND" 是中文精確度的關鍵。一個三字詞會拆成兩個、四字詞拆成三個
// 二元詞條，預設的 OR 只要命中任一片段就回傳，於是「香港大學」命中 127 頁
// （多數只含「香港」），「太平紳士」39 頁。改為 AND（所有片段都須命中）後，
// 隨機抽取 200 條三至六字片語實測：P@10 由 0.320 升至 0.927，R@10 不變
// （0.926 → 0.930），且無一題變成空結果。代價是查不到的字串不再回傳近似結果，
// 對文獻檢索而言這是可接受的取捨。
//
// boost 調高標題權重（外掛預設 c4 h2 t1）。二元切分下，一篇反覆提到「香港大學」的
// 長文，BM25 分數會壓過標題就叫「香港大學」的主題頁；把 h 提到 8 之後，229 條
// 「以頁面標題為查詢」的題目中，首位命中率 73.4% → 77.7%、MRR 0.844 → 0.870，
// 而 60 條關鍵詞查詢的 MRR（0.906）與首位率（83%）完全不變。
//
// 另註：外掛另有 sortStrategy（max／total）可選，但 rc.137 的 worker 以
// `buildSearchResults(options, sortStrategy)` 呼叫，而該函式簽名是單一物件參數
// `buildSearchResults({ ..., sortStrategy })`，第二個引數被忽略——此選項實際無效。
// 實測把 total 正確接上後反而更差（標題 MRR 0.844 → 0.716），故不採用。
//
// 選項物件必須 Object.freeze：外掛把選項原樣 postMessage 給 worker，而它會先存進
// 一個 ref，ref 會把物件轉成 reactive proxy，巢狀的 boost 也跟著變成 proxy；
// Proxy 無法被結構化複製，送出時會拋 DataCloneError，整個搜尋靜默失敗。
// 凍結後的物件不是 extensible，Vue 的 reactive() 會原樣回傳，不會包 proxy。
defineSearchConfig(
  Object.freeze({
    prefix: true,
    combineWith: "AND",
    boost: { c: 4, h: 8, t: 1 },
    querySplitter: splitQuery,
    resultsFilter,
  }),
);

export default defineClientConfig({
  layouts: {
    Layout,
  },
  enhance: ({ app }) => {
    app.component("ReferenceBox", ReferenceBox);
  },
});
