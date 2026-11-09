/**
 * 檢視目前搜尋結果的內容結構，找出重複與噪音。
 * 用法：node inspect-results.mjs
 */
import fs from "node:fs";
import { decodeData } from "@vuepress/helper";
import { createIndex, addAll, search } from "slimsearch";
import { buildSearchResults } from "@vuepress/search-helper/shared";

const TEMP = "src/.vuepress/.temp/slimsearch";
const CJK_RUN = /[\u3005-\u3007\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF\u{20000}-\u{323AF}]+/gu;
const NON_WORD = /[^\p{L}\p{N}]+/u;
const tokenize = (text) => {
  const tokens = [];
  let cursor = 0;
  for (const match of text.matchAll(CJK_RUN)) {
    const start = match.index ?? 0;
    for (const w of text.slice(cursor, start).split(NON_WORD)) if (w) tokens.push(w.toLowerCase());
    const chars = [...match[0]];
    if (chars.length === 1) tokens.push(chars[0]);
    else for (let i = 0; i < chars.length - 1; i += 1) tokens.push(chars[i] + chars[i + 1]);
    cursor = start + match[0].length;
  }
  for (const w of text.slice(cursor).split(NON_WORD)) if (w) tokens.push(w.toLowerCase());
  return tokens;
};

const raw = fs.readFileSync(`${TEMP}/root.js`, "utf8");
const encoded = JSON.parse(raw.match(/export default (".*")\s*$/s)[1]);
const serialized = JSON.parse(decodeData(encoded));
const docs = Object.entries(serialized.documentIds).map(([shortId, id]) => ({ id, ...serialized.storedFields[shortId] }));
const index = createIndex({
  tokenize: (text, field) => (field === "id" ? [text] : tokenize(text)),
  fields: ["h", "t", "c"],
  storeFields: ["h", "t", "c"],
});
addAll(index, docs);

const dedupe = (terms) => terms.sort((a, b) => a.length - b.length).filter((t, i) => terms.slice(i + 1).every((o) => !o.includes(t)));

const results = (query, boost = { c: 4, h: 2, t: 1 }) => {
  const hits = search(index, tokenize(query).join(" "), { boost, prefix: true, combineWith: "AND" }).map(
    ({ id, score, terms, ...document }) => ({ id, score, terms: dedupe(terms), document: { ...document, id } }),
  );
  return buildSearchResults({ hits, displayTerms: [], getPageTitle: (id) => docs.find((d) => d.id === String(id))?.h ?? "" }, "max");
};

for (const query of ["香港大學", "古蹟", "避風塘", "李鄭屋", "東華醫院", "徙置區"]) {
  const items = results(query);
  console.log(`\n===== ${query}（${items.length} 頁）`);
  for (const item of items.slice(0, 3)) {
    console.log(`  【${item.title}】內容段 ${item.contents.length}`);
    for (const c of item.contents.slice(0, 6)) {
      const text = (c.display[0]?.text ?? "").replace(/\s+/g, " ").slice(0, 52);
      console.log(`    - ${c.type.padEnd(11)} ${c.anchor ? "[" + c.anchor.slice(0, 8) + "] " : ""}${text}`);
    }
  }
  // 重複統計
  let dup = 0, total = 0;
  for (const item of items) {
    const seen = new Set();
    for (const c of item.contents) {
      total += 1;
      const key = c.type + "|" + (c.display[0]?.text ?? "");
      if (seen.has(key)) dup += 1;
      seen.add(key);
    }
  }
  console.log(`  重複內容段 ${dup}/${total}`);
}
