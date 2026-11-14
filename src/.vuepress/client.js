import { defineClientConfig } from "vuepress/client";
import { defineSearchConfig } from "@vuepress/plugin-slimsearch/client";
import Layout from "./layouts/Layout.vue";
import ReferenceBox from "./components/ReferenceBox.vue";
import { splitQuery } from "./search-tokenize";

const MAX_CONTENTS_PER_RESULT = 5;

const MAX_RESULTS = 40;

const normalizeForCompare = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

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

const packContents = (contents) => {
  const seen = new Set();
  const packed = [];

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

const isTitleHit = (title, terms) => {
  if (!terms.length) return false;

  const text = normalizeForCompare(title ?? "");

  return terms.every((term) => text.includes(term));
};

const resultsFilter = (results, query) => {
  const terms = query
    .split(/\s+/u)
    .filter(Boolean)
    .map((term) => normalizeForCompare(term));

  return results
    .filter((result) => result.contents.some((item) => item.display?.length))
    .map((result, index) => ({ result, rank: isTitleHit(result.title, terms) ? 0 : 1, index }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, MAX_RESULTS)
    .map(({ result }) => ({ ...result, contents: packContents(result.contents) }));
};

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
