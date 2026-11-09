import { defineClientConfig } from "vuepress/client";
import { defineSearchConfig } from "@vuepress/plugin-slimsearch/client";
import Layout from "./layouts/Layout.vue";
import ReferenceBox from "./components/ReferenceBox.vue";
import { splitQuery } from "./search-tokenize";

/** 單一結果最多顯示的內容段落數。 */
const MAX_CONTENTS_PER_RESULT = 5;

/** 搜尋彈窗最多顯示的頁數，避免寬泛查詢一次產生上百張結果卡。 */
const MAX_RESULTS = 40;

/** 只留字母與數字並轉小寫，用來比較標題與查詢的字面包含關係。 */
const normalizeForCompare = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * 合併扁平的 highlight 區間 `[start, end, start, end, ...]`。
 * 外掛的 renderMatchedContent 逐成對讀取並以 text.slice 產生 <mark>，因此
 * 重疊或相鄰的區間必須先合併，否則後段會被前段的 cursor 吃掉。
 */
const mergeHighlights = (ranges) => {
  const pairs = [];

  for (let i = 0; i + 1 < ranges.length; i += 2) {
    pairs.push([ranges[i], ranges[i + 1]]);
  }

  pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const merged = [];

  for (const [start, end] of pairs) {
    const last = merged[merged.length - 1];

    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  return merged.flatMap(([start, end]) => [start, end]);
};

/**
 * 同一段文字被每個查詢詞條各產生一份 display，這裡按 text 合併，並把各詞條
 * 命中的位置聯集起來。長文字會被外掛截成不同視窗（text 不同），此時保留各筆，
 * 不強行合併，以免把不相干的兩個片段拼在一起。
 */
const packDisplay = (display) => {
  const merged = new Map();

  for (const part of display) {
    const existing = merged.get(part.text);

    if (existing) {
      existing.highlights = mergeHighlights([
        ...existing.highlights,
        ...(part.highlights ?? []),
      ]);
    } else {
      merged.set(part.text, { ...part, highlights: [...(part.highlights ?? [])] });
    }
  }

  return [...merged.values()];
};

/** 整理單一結果頁要顯示的段落。 */
const packContents = (contents) => {
  const seen = new Set();
  const packed = [];

  // 先放標題／小節／正文命中，再補章節名與 description 的分類命中。後者往往是
  // 「熱帶氣旋與風球」這類每頁都相同的固定字串，擺在最前面會擠掉真正有資訊量
  // 的內文摘要；只有分類命中的頁面（例如查「熱帶氣旋」）仍會照常顯示分類片段。
  const ordered = [
    ...contents.filter((item) => item.type !== "customField"),
    ...contents.filter((item) => item.type === "customField"),
  ];

  for (const item of ordered) {
    if (!item.display?.length) continue;

    const display = packDisplay(item.display);
    const key = display.map(({ text }) => text).join("\u0000");

    if (seen.has(key)) continue;

    seen.add(key);
    packed.push({ ...item, display });

    if (packed.length >= MAX_CONTENTS_PER_RESULT) break;
  }

  return packed;
};

/**
 * 整理搜尋結果的呈現。
 *
 * 外掛已按頁面分組，但同一頁可能有數十段命中：實測「殷墟・報告」一頁達 92 段，
 * 「香港大學」平均每頁 9.2 段。整份貼出會讓單一結果佔滿整個彈窗，其餘頁面被推到
 * 摺疊線以下，使用者反而看不到其他候選。
 *
 * 這裡做五件事：
 * 1. 丟掉沒有摘要可顯示的空段落。外掛對 customField 命中無條件建立結果項，
 *    若詞條在該欄位找不到連續原文，display 會是空陣列，畫面會多一列空白。
 * 2. 壓掉重複文字（見 packDisplay）。
 * 3. 每頁最多保留 {@link MAX_CONTENTS_PER_RESULT} 段，最多 {@link MAX_RESULTS} 頁。
 *    分區與截斷先做，只對最後留下的頁面整理段落，不浪費在註定不顯示的結果上。
 * 4. 標題命中查詢的頁面排到最前（見下方說明）。
 * 5. 單頁內以標題／小節／正文命中優先，章節名與 description 的分類命中墊後，
 *    避免每頁都相同的固定分類字串擠掉真正有資訊量的內文摘要。
 *
 * 為何需要第 4 項：二元切分下 BM25 以詞頻計分，一篇反覆提及「李鄭屋」的長篇
 * 報紙報導，分數會壓過標題就叫「李鄭屋漢墓」的主題頁——查「李鄭屋」時首位是
 * 「香港考古及出土文物展覽」，查「古蹟」時首位是「李鄭屋古墓設天幕防滲漏」。
 * 但使用者輸入名詞時，多數想找的就是那個條目本身。這裡不改索引、不動分數，
 * 只在呈現層做一次穩定分區：標題涵蓋全部查詢詞條者置前，其餘維持原分數順序。
 *
 * 實測（234 條「以頁面標題為查詢」）：標題 MRR 0.878 → 0.983、首位命中 96.6%、
 * 前 3 命中 100%。分區是穩定的（Array.prototype.sort 自 ES2019 起保證穩定），
 * 同一區內仍是相關度排序。頁數上限取 40：實測沒有任何一題的目標頁落在第 40 名
 * 之後，但寬泛查詢（「香港」246 頁、「熱帶氣旋」125 頁）不必一次渲染上百張卡。
 *
 * @param {import("@vuepress/plugin-slimsearch/client").SearchResult[]} results 搜尋結果
 * @param {string} query 切詞後以空白串接的查詢字串（外掛 useResults 傳入的格式）
 * @returns 整理後的搜尋結果
 */
const resultsFilter = (results, query) => {
  // 收到的不是使用者輸入的原文，而是 querySplitter 的輸出以空白串接後的字串。
  // 直接切開即可拿到詞條，不必再跑一次斷詞；詞條本身已不含空白或標點。
  const terms = query.split(/\s+/u).filter(Boolean);

  const isTitleHit = (title) => {
    if (!terms.length) return false;

    const text = normalizeForCompare(title ?? "");

    return terms.every((term) => text.includes(normalizeForCompare(term)));
  };

  // 先分區、排序與截斷，最後才整理段落：寬泛查詢（「港」211 頁／957 段）原本會
  // 替每一頁都做字串去重，但其中 171 頁最終根本不會顯示。改為只處理留下的 40 頁，
  // 也省去為被丟棄的頁面建立新物件。
  return results
    .filter((result) => result.contents.some((item) => item.display?.length))
    .map((result, index) => ({ result, rank: isTitleHit(result.title) ? 0 : 1, index }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, MAX_RESULTS)
    .map(({ result }) => ({ ...result, contents: packContents(result.contents) }));
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
// c 是 theme.ts 補上的章節分類詞，屬「背景提示」而非正文：設為 1，讓它不會
// 壓過標題（h8）或內文（t1）的命中，實測 c1／c2／c4 對標題 MRR 均無差異。
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
    boost: { c: 1, h: 8, t: 1 },
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
