
import { decodeData } from "@vuepress/helper/shared";
import {
  buildSearchResults,
  createWorkerResponse,
} from "@vuepress/search-helper/shared";
import { autoSuggest, getStoredFields, loadJSONIndex, search } from "slimsearch";
import indexLoaders from "@temp/slimsearch/index.js";
import { sortStrategy } from "@temp/slimsearch/worker-options.js";

const INDEX_OPTIONS = {
  fields: ["h", "t", "c"],
  storeFields: ["h", "t", "c"],
};

const indexes = new Map();

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

function dedupeTerms(terms) {
  return terms
    .sort((a, b) => a.length - b.length)
    .filter((term, index) =>
      terms.slice(index + 1).every((other) => !other.includes(term)),
    );
}

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
