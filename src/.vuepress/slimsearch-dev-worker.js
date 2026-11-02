/**
 * 開發模式的搜尋工作線程。
 *
 * 為何需要這個檔案：`@vuepress/plugin-slimsearch@2.0.0-rc.137` 的客戶端設定把
 * 開發模式的 worker 指向 `dist/client/worker/dev.js`，但官方發佈的套件裡並沒有
 * 這個檔案（rc.135 以前放在 `dist/worker/dev.js`，rc.136 起改路徑時漏了打包）。
 * 開發伺服器對這個路徑查無檔案，會回傳 SPA 的 index.html；Worker 載入 HTML 後
 * 直接失敗，而客戶端只把錯誤印成警告、不會 reject，於是搜尋框永遠停在「搜尋中」。
 *
 * 這裡按 rc.137 的公開 API 重寫一份等價的 worker：
 * - `createWorkerResponse` 組出客戶端期待的回應（`[type, id, result]` 元組）
 * - `buildSearchResults` 組出 `{ title, contents }` 結果，與建置版輸出一致
 * - 索引來源改用暫存模組 `@temp/slimsearch/*`，開發時才能即時反映內容變更
 *
 * 只在開發模式生效，且僅在上游檔案確實不存在時由 config.ts 的 Vite 中介層接手
 * （見 slimsearchDevWorkerPlugin）。正式建置仍使用插件自己產生的
 * `slimsearch.worker.js`，不經此檔。
 */

import { decodeData } from "@vuepress/helper/shared";
import {
  buildSearchResults,
  createWorkerResponse,
} from "@vuepress/search-helper/shared";
import { autoSuggest, getStoredFields, loadJSONIndex, search } from "slimsearch";
import indexLoaders from "@temp/slimsearch/index.js";
import { sortStrategy } from "@temp/slimsearch/worker-options.js";

/** 與插件建置版 worker 相同的索引欄位設定。 */
const INDEX_OPTIONS = {
  fields: ["h", "t", "c"],
  storeFields: ["h", "t", "c"],
};

/** 已載入的索引，依語言環境快取；`null` 表示該語言環境沒有索引。 */
const indexes = new Map();

/**
 * 取得指定語言環境的索引。
 *
 * 暫存模組匯出的是「語言環境 → 動態 import」的對照表，值再包一層
 * `export default`，故取 `.default` 後才是編碼過的索引字串。
 *
 * @param {string} locale 語言環境，例如 "/"
 * @returns {Promise<object | null>} slimsearch 索引
 */
async function getIndex(locale) {
  if (indexes.has(locale)) return indexes.get(locale);

  const loader = Object.hasOwn(indexLoaders, locale)
    ? indexLoaders[locale]
    : undefined;
  const index = loader
    ? loadJSONIndex(decodeData((await loader()).default), INDEX_OPTIONS)
    : null;

  indexes.set(locale, index);
  return index;
}

/**
 * 去除被其他詞條包含的短詞，只保留最長者。
 * 與插件建置版 worker 的處理相同，避免「熱」「熱帶」「熱帶氣旋」重複計分。
 *
 * @param {string[]} terms 命中詞條
 * @returns {string[]} 去重後的詞條
 */
function dedupeTerms(terms) {
  return terms
    .sort((a, b) => a.length - b.length)
    .filter((term, index) =>
      terms.slice(index + 1).every((other) => !other.includes(term)),
    );
}

/**
 * 搜尋並組成結果。
 *
 * @param {string} query 查詢字串（客戶端已切詞並以空白串接）
 * @param {object} index 語言環境索引
 * @param {object} options 客戶端傳來的搜尋選項
 * @param {"max" | "total"} sort 排序策略
 * @returns {Array<{ title: string, contents: object[] }>} 搜尋結果
 */
function getSearchResults(query, index, options = {}, sort = "max") {
  const hits = search(index, query, {
    boost: { c: 4, h: 2, t: 1 },
    prefix: true,
    ...options,
  }).map(({ id, score, terms, ...document }) => ({
    id,
    score,
    terms: dedupeTerms(terms),
    document: { ...document, id },
  }));

  return buildSearchResults(
    {
      hits,
      displayTerms: [],
      getPageTitle: (id) => getStoredFields(index, String(id))?.["h"] ?? "",
    },
    sort,
  );
}

/**
 * 產生自動補全建議。含空白的查詢視為片語，不再過濾帶空白的建議。
 *
 * @param {string} query 查詢字串
 * @param {object} index 語言環境索引
 * @param {object} options 客戶端傳來的搜尋選項
 * @returns {string[]} 建議詞
 */
function getSuggestions(query, index, options = {}) {
  const suggestions = autoSuggest(index, query, {
    fuzzy: 0.2,
    maxFuzzy: 3,
    ...options,
  }).map(({ suggestion }) => suggestion);

  return query.includes(" ") ? suggestions : suggestions.filter((item) => !item.includes(" "));
}

self.addEventListener("message", async ({ data }) => {
  const index = await getIndex(data.locale);

  self.postMessage(
    createWorkerResponse(
      data,
      index,
      { getSearchResults, getSuggestions },
      sortStrategy,
    ),
  );
});
