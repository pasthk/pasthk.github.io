/**
 * 評估「標題命中優先」重排對結果順位的影響。
 * 用法：node bench-title-first.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { decodeData } from "@vuepress/helper";
import { createIndex, addAll, search } from "slimsearch";
import { buildSearchResults } from "@vuepress/search-helper/shared";

const TEMP = "src/.vuepress/.temp/slimsearch";
const SRC = "src";

const CJK_RUN =
  /[\u3005-\u3007\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF\u{20000}-\u{323AF}]+/gu;
const NON_WORD = /[^\p{L}\p{N}]+/u;
const tokenize = (text) => {
  const t = [];
  let c = 0;
  for (const m of text.matchAll(CJK_RUN)) {
    const s = m.index ?? 0;
    for (const w of text.slice(c, s).split(NON_WORD)) if (w) t.push(w.toLowerCase());
    const ch = [...m[0]];
    if (ch.length === 1) t.push(ch[0]);
    else for (let i = 0; i < ch.length - 1; i += 1) t.push(ch[i] + ch[i + 1]);
    c = s + m[0].length;
  }
  for (const w of text.slice(c).split(NON_WORD)) if (w) t.push(w.toLowerCase());
  return t;
};

const raw = fs.readFileSync(`${TEMP}/root.js`, "utf8");
const serialized = JSON.parse(decodeData(JSON.parse(raw.match(/export default (".*")\s*$/s)[1])));
const docs = Object.entries(serialized.documentIds).map(([s, id]) => ({ id, ...serialized.storedFields[s] }));
const byId = new Map(docs.map((d) => [d.id, d]));
const store = JSON.parse(
  fs.readFileSync(`${TEMP}/store.js`, "utf8").replace(/^export const store = /, "").trim(),
);
const index = createIndex({
  tokenize: (text, field) => (field === "id" ? [text] : tokenize(text)),
  fields: ["h", "t", "c"],
  storeFields: ["h", "t", "c"],
});
addAll(index, docs);

const dedupe = (terms) =>
  terms.sort((a, b) => a.length - b.length).filter((t, i) => terms.slice(i + 1).every((o) => !o.includes(t)));

const BOOST = { c: 4, h: 8, t: 1 };

/** 原始順序（頁面分組後，依 max 分數排序）。 */
const ranked = (query) => {
  const hits = search(index, tokenize(query).join(" "), { boost: BOOST, prefix: true, combineWith: "AND" }).map(
    ({ id, score, terms, ...document }) => ({ id, score, terms: dedupe(terms), document: { ...document, id } }),
  );
  return buildSearchResults({
    hits,
    displayTerms: [],
    getPageTitle: (id) => byId.get(String(id))?.h ?? "",
    sortStrategy: "max",
  })
    .map((r) => store[String(r.contents[0]?.id)])
    .filter(Boolean);
};

const normalize = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** 標題命中優先的穩定分區重排。 */
const titleFirst = (list, query) => {
  const terms = tokenize(query);
  const titleOf = (page) => {
    const heading = byId.get(String(store[String(page)] ?? ""));
    return heading;
  };
  void titleOf;
  const key = (page) => {
    const title = normalize(titles.get(page) ?? "");
    return terms.length && terms.every((term) => title.includes(term)) ? 0 : 1;
  };
  return [...list].sort((a, b) => key(a) - key(b));
};

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

const titleQueries = [...titles].filter(([, t]) => t.length >= 2 && t.length <= 12);
const KEYWORDS = [
  "丁屋", "徙置區", "熱帶氣旋", "颱風", "九廣鐵路", "李鄭屋", "古蹟", "碑文", "天后廟", "香港大學",
  "木屋區", "艇戶", "圍村", "太平紳士", "水務", "啟德機場", "避風塘", "東華醫院", "保良局", "鼠疫",
  "船塢", "徙置大廈", "熱帶風暴", "石碑", "天后", "客家", "義莊", "祠堂", "考古", "出土文物",
  "東華三院", "九龍寨城", "宋皇臺", "侯王廟", "屏山", "大埔", "元朗", "深水埗", "西貢", "離島",
  "銅鑼灣", "中環", "尖沙咀", "油蔴地", "山廈村", "龍躍頭", "粉嶺", "沙田", "荃灣", "錦田",
  "義勇軍", "防衛軍", "義大利", "葡國", "日本", "英國", "美國", "清朝", "民國", "殖民地",
];

const evaluate = (label, reorder) => {
  let mrr = 0;
  let top1 = 0;
  let top3 = 0;
  for (const [page, title] of titleQueries) {
    const list = reorder(ranked(title), title);
    const pos = list.indexOf(page);
    if (pos === 0) top1 += 1;
    if (pos >= 0 && pos < 3) top3 += 1;
    if (pos >= 0) mrr += 1 / (pos + 1);
  }
  let kwMrr = 0;
  let kwTop1 = 0;
  let kwN = 0;
  for (const kw of KEYWORDS) {
    const list = reorder(ranked(kw), kw);
    const gold = list.filter((p) => (titles.get(p) ?? "").includes(kw));
    if (!gold.length) continue;
    kwN += 1;
    const pos = list.indexOf(gold[0]);
    if (pos === 0) kwTop1 += 1;
    kwMrr += 1 / (pos + 1);
  }
  const n = titleQueries.length;
  console.log(
    `${label.padEnd(14)} 標題MRR ${(mrr / n).toFixed(3)} 首位 ${((top1 / n) * 100).toFixed(1)}% 前3 ${(
      (top3 / n) * 100
    ).toFixed(1)}% ｜關鍵詞MRR ${(kwMrr / kwN).toFixed(3)} 首位 ${((kwTop1 / kwN) * 100).toFixed(0)}%`,
  );
};

console.log("標題查詢", titleQueries.length, "｜關鍵詞", KEYWORDS.length, "\n");
evaluate("原始順序", (list) => list);
evaluate("標題優先", titleFirst);

console.log("\n--- 個別查詢首位 ---");
for (const kw of ["李鄭屋", "古蹟", "考古", "香港大學", "避風塘", "丁屋", "碑文"]) {
  const list = ranked(kw);
  const before = titles.get(list[0]) ?? "(無)";
  const after = titles.get(titleFirst(list, kw)[0]) ?? "(無)";
  console.log(`${kw.padEnd(5)} 原 ${before.padEnd(16)} → 新 ${after}`);
}
