/**
 * 排序品質評估：比較不同 boost 與 sortStrategy 下，標題命中頁面是否排在前面。
 * 用法：node bench-rank.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { decodeData } from "@vuepress/helper";
import { createIndex, addAll, search } from "slimsearch";

const TEMP = "src/.vuepress/.temp/slimsearch";
const SRC = "src";

/* ---------- 斷詞（與 search-tokenize.ts 一致） ---------- */
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

/* ---------- 索引與 store ---------- */
const raw = fs.readFileSync(`${TEMP}/root.js`, "utf8");
const encoded = JSON.parse(raw.match(/export default (".*")\s*$/s)[1]);
const serialized = JSON.parse(decodeData(encoded));
const docs = Object.entries(serialized.documentIds).map(([shortId, id]) => ({ id, ...serialized.storedFields[shortId] }));
const store = JSON.parse(fs.readFileSync(`${TEMP}/store.js`, "utf8").replace(/^export const store = /, "").trim());
const index = createIndex({
  tokenize: (text, field) => (field === "id" ? [text] : tokenize(text)),
  fields: ["h", "t", "c"],
  storeFields: ["h", "t", "c"],
});
addAll(index, docs);

/* ---------- 頁面標題 ---------- */
const titles = new Map();
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || ["public", "dist"].includes(entry.name)) continue;
      walk(full);
    } else if (entry.name.endsWith(".md")) {
      const text = fs.readFileSync(full, "utf8");
      const fm = (text.match(/^---\n([\s\S]*?)\n---\n?/) ?? [, ""])[1];
      const title = (fm.match(/^title:\s*(.+)$/m) ?? [, ""])[1].trim().replace(/^["']|["']$/g, "");
      const rel = full.slice(SRC.length).replace(/\.md$/, "").replace(/\/index$/, "");
      titles.set((rel === "" ? "/" : rel) + ".html", title);
    }
  }
};

walk(SRC);

/* ---------- 排序（複製 buildSearchResults 的分組與排序） ---------- */
const rankedPages = (query, boost, strategy) => {
  const hits = search(index, tokenize(query).join(" "), { boost, prefix: true, combineWith: "AND" });
  const groups = new Map();
  for (const hit of hits) {
    const pageId = String(hit.id).split(/[#@]/u)[0];
    const g = groups.get(pageId) ?? { max: -Infinity, total: 0 };
    g.max = Math.max(g.max, hit.score);
    g.total += hit.score;
    groups.set(pageId, g);
  }
  return [...groups]
    .sort((a, b) => (strategy === "total" ? b[1].total - a[1].total : b[1].max - a[1].max))
    .map(([id]) => store[id])
    .filter(Boolean);
};

/* ---------- 查詢集 ---------- */
const KEYWORDS = [
  "丁屋", "徙置區", "熱帶氣旋", "颱風", "九廣鐵路", "李鄭屋", "古蹟", "碑文",
  "天后廟", "香港大學", "木屋區", "艇戶", "圍村", "太平紳士", "水務", "啟德機場",
  "避風塘", "東華醫院", "保良局", "鼠疫", "船塢", "徙置大廈", "熱帶風暴", "石碑",
  "天后", "客家", "義莊", "祠堂", "考古", "出土文物",
];
// 標題即查詢：該頁應排第一
const titleQueries = [...titles].filter(([, t]) => t.length >= 2 && t.length <= 12);

const evaluate = (label, boost, strategy) => {
  let mrr = 0, top1 = 0, top3 = 0, n = 0, empty = 0;
  for (const [page, title] of titleQueries) {
    const ranked = rankedPages(title, boost, strategy);
    if (!ranked.length) { empty += 1; n += 1; continue; }
    const pos = ranked.indexOf(page);
    if (pos === 0) top1 += 1;
    if (pos >= 0 && pos < 3) top3 += 1;
    if (pos >= 0) mrr += 1 / (pos + 1);
    n += 1;
  }
  // 關鍵詞：標題含該詞的頁面，其最佳名次
  let kwMrr = 0, kwTop1 = 0, kwN = 0;
  for (const kw of KEYWORDS) {
    const ranked = rankedPages(kw, boost, strategy);
    const gold = ranked.filter((page) => (titles.get(page) ?? "").includes(kw));
    if (!gold.length) continue;
    kwN += 1;
    const pos = ranked.indexOf(gold[0]);
    if (pos === 0) kwTop1 += 1;
    kwMrr += 1 / (pos + 1);
  }
  console.log(
    `${label.padEnd(30)} 標題查詢 首位 ${(top1 / n * 100).toFixed(1)}%  前3 ${(top3 / n * 100).toFixed(1)}%  MRR ${(mrr / n).toFixed(3)}  ` +
      `｜關鍵詞 首位 ${(kwTop1 / kwN * 100).toFixed(0)}%  MRR ${(kwMrr / kwN).toFixed(3)}  空 ${empty}`,
  );
};

if(0)console.log("titles.size", titles.size, "樣本", [...titles].slice(0,2));
console.log("標題查詢", titleQueries.length, "｜關鍵詞", KEYWORDS.length, "\n");
for (const [label, boost] of [
  ["c4 h2 t1（目前）", { c: 4, h: 2, t: 1 }],
  ["c4 h4 t1", { c: 4, h: 4, t: 1 }],
  ["c4 h6 t1", { c: 4, h: 6, t: 1 }],
  ["c2 h8 t1", { c: 2, h: 8, t: 1 }],
  ["c1 h10 t1", { c: 1, h: 10, t: 1 }],
  ["h only（h1 t0.5）", { h: 1, t: 0.5 }],
]) {
  for (const strategy of ["max", "total"]) {
    evaluate(`${label} / ${strategy}`, boost, strategy);
  }
}

console.log('\n=== 抽樣對照（前 3 名頁面標題）===');
const SHOW = ['香港大學', '避風塘', '東華醫院', '古蹟', '丁屋', '徙置區', '颱風', '保良局'];
for (const q of SHOW) {
  console.log('\n' + q);
  for (const [label, boost, strategy] of [['目前', {c:4,h:2,t:1}, 'max'], ['c4h6t1/total', {c:4,h:6,t:1}, 'total'], ['c2h8t1/total', {c:2,h:8,t:1}, 'total']]) {
    const top = rankedPages(q, boost, strategy).slice(0,3).map((p) => titles.get(p) ?? p);
    console.log('  ' + label.padEnd(14) + top.join(' ｜ '));
  }
}
