#!/usr/bin/env node
/**
 * 檢查全站 frontmatter.description 的覆蓋率與風格一致性。
 *
 * 用法：
 *   node scripts/check-descriptions.mjs          # 檢查，有錯誤時 exit 1
 *   node scripts/check-descriptions.mjs --json   # 輸出 JSON（供其他腳本使用）
 *
 * 風格規格見 scripts/description-style.md。
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = "src";

/** 站務頁：允許出現「本站」等自稱 */
const SITE_PAGES = new Set([
  "src/README.md",
  "src/about.md",
  "src/privacy.md",
  "src/support.md",
  "src/404.md",
]);

const walk = (dir, out) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else if (entry.name.endsWith(".md")) out.push(file);
  }
  return out;
};

const field = (frontmatter, key) => {
  const matched = new RegExp(`^${key}:[ \\t]*(.*)$`, "mu").exec(frontmatter);

  return matched ? matched[1].trim().replace(/^["']|["']$/gu, "") : undefined;
};

const readPage = (file) => {
  const raw = fs.readFileSync(file, "utf8");
  const matched = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u.exec(raw);
  const frontmatter = matched ? matched[1] : "";

  return {
    file,
    title: field(frontmatter, "title"),
    datePublished: field(frontmatter, "datePublished"),
    sitemap: field(frontmatter, "sitemap"),
    description: field(frontmatter, "description"),
    body: (matched ? raw.slice(matched[0].length) : raw).replace(/\s+/gu, ""),
  };
};

const charCount = (text) => [...text].length;

/** 半角標點：數字千分位、英文縮寫、時間（10:30）不算違規 */
const HALF_WIDTH = /(?<![\dA-Za-z])[,;:?!](?![\dA-Za-z])|,\s|;|:/gu;

const check = (page, duplicates) => {
  const issues = [];
  const add = (level, rule, message) => issues.push({ level, rule, message });
  const { description: text } = page;

  if (!text) {
    add("error", "missing", "缺少 description");
    return issues;
  }

  const length = charCount(text);

  if (!text.endsWith("。")) add("error", "period", "未以「。」結尾");
  if (length < 35) add("warn", "short", `過短（${length} 字）`);
  if (length > 160) add("warn", "long", `過長（${length} 字）`);
  if (length > 155) add("warn", "serp", `或被搜尋結果截斷（${length} 字）`);

  const halfWidth = HALF_WIDTH.exec(text);

  if (halfWidth) {
    add("error", "half-width", `半角標點「${halfWidth[0]}」`);
  }

  if (/ {2,}|　/u.test(text)) add("warn", "space", "含連續空白或全角空格");
  if (/^[，、；：]/u.test(text)) add("warn", "lead-punct", "以標點開頭");

  const pairs = [
    ["《", "》"],
    ["〈", "〉"],
    ["「", "」"],
  ];

  for (const [open, close] of pairs) {
    const opens = text.split(open).length - 1;
    const closes = text.split(close).length - 1;

    if (opens !== closes) {
      add("warn", "quote-pair", `「${open}${close}」不成對`);
    }
  }

  if (page.datePublished && !/^《[^》]+》\d{4}年/u.test(text)) {
    add("error", "doc-head", "史料頁未以「《刊名》YYYY年…」開頭");
  }

  if (
    !page.datePublished &&
    !SITE_PAGES.has(page.file) &&
    /^(本頁|本文|這頁|本站)/u.test(text)
  ) {
    add("warn", "self-ref", "以「本頁／本文」自稱開頭");
  }

  /* 以主題名開頭是本索引站的主要句式，僅在整句只是標題的重述時提醒 */
  if (
    page.title &&
    charCount(page.title) > 3 &&
    new RegExp(`^${page.title}[，。]`, "u").test(text)
  ) {
    add("warn", "repeat-title", "開頭僅重述標題");
  }

  const same = duplicates.get(text);

  if (same && same.length > 1) {
    add("warn", "duplicate", `與 ${same.filter((f) => f !== page.file).join("、")} 完全相同`);
  }

  return issues;
};

const main = () => {
  const pages = walk(ROOT, []).map(readPage);
  const listed = pages.filter(
    (page) => page.sitemap !== "false" && page.file !== "src/404.md",
  );

  const duplicates = new Map();

  for (const page of listed) {
    if (!page.description) continue;
    if (!duplicates.has(page.description)) duplicates.set(page.description, []);
    duplicates.get(page.description).push(page.file);
  }

  const report = listed.map((page) => ({
    file: page.file,
    title: page.title,
    datePublished: page.datePublished,
    description: page.description,
    length: page.description ? charCount(page.description) : 0,
    issues: check(page, duplicates),
  }));

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const broken = report.filter((item) => item.issues.some((i) => i.level === "error"));
  const warned = report.filter(
    (item) =>
      item.issues.some((i) => i.level === "warn") &&
      !item.issues.some((i) => i.level === "error"),
  );
  const lengths = report
    .filter((item) => item.length)
    .map((item) => item.length)
    .sort((a, b) => a - b);
  const quantile = (q) => lengths[Math.floor((lengths.length - 1) * q)];

  console.log(
    `共 ${report.length} 頁；有 description ${report.filter((i) => i.length).length} 頁` +
      `（${quantile(0.5)} 字中位數，${lengths[0]}–${lengths.at(-1)} 字）`,
  );

  const grouped = new Map();

  for (const item of report) {
    for (const issue of item.issues) {
      if (!grouped.has(issue.rule)) grouped.set(issue.rule, []);
      grouped.get(issue.rule).push(`${item.file}：${issue.message}`);
    }
  }

  for (const [rule, entries] of [...grouped.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    console.log(`\n[${rule}] ${entries.length} 項`);

    for (const entry of entries.slice(0, 8)) console.log(`  ${entry}`);
    if (entries.length > 8) console.log(`  …其餘 ${entries.length - 8} 項`);
  }

  console.log(
    `\n結果：${broken.length} 頁有錯誤、${warned.length} 頁有提醒。`,
  );

  if (broken.length) process.exitCode = 1;
};

main();
