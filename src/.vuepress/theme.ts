import type { Page } from "vuepress/core";
import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";
import { breadcrumbTrails, type TrailItem } from "./breadcrumb.js";
import { chapterOfPath, pathSegments } from "./chapters.js";
import {
  canonicalUrl,
  createdDate,
  isSourceDocument,
  publishedDate,
  sourceOfPage,
  visibleLengthOf,
  LEGACY_INDEX_PATH,
  TIMELINE_PATH,
} from "./page-meta.js";
import { searchKeywords } from "./search/keywords.js";
import { tokenizeForIndex } from "./search/tokenize.js";
import { collectionItems } from "./seo/items.js";
import { jsonLdGraph, ORGANIZATION_ID, WEBSITE_ID } from "./seo/graph.js";
import { socialTags } from "./seo/social.js";
import { sitemapModifiedTime } from "./sitemap.js";
import {
  absoluteUrl,
  AUTHOR_NAME,
  AUTHOR_NODE,
  AUTHOR_URL,
  HOSTNAME as hostname,
  ogImageUrl,
  SITE_NAME,
  SITE_TAGLINE,
} from "./site.js";

const cardUrl = (page: Page): string =>
  page.frontmatter.sitemap === false
    ? ogImageUrl(hostname, "/")
    : ogImageUrl(hostname, page.path);

/** 麵包屑只取有實際連結的層級（首頁另計，不重複放入） */
const linkedTrail = (trail: TrailItem[] = []): TrailItem[] =>
  trail.filter((entry) => entry.link && entry.link !== "/");

function buildBreadcrumb(page: Page, url: string, trail: TrailItem[]) {
  if (page.path === "/" || !page.title) return null;

  const items = [
    { name: "首頁", item: `${hostname}/` },
    ...linkedTrail(trail).map((entry) => ({
      name: entry.text,
      item: absoluteUrl(entry.link as string),
    })),
    { name: page.title, item: url },
  ];

  return {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: items.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  };
}

export default hopeTheme(
  {
    docsDir: "src",
    hostname,
    navbar,
    sidebar,
    pure: true,
    focus: false,
    darkmode: "disable",
    favicon: "/favicon.png",
    displayFooter: true,
    footer:
      `${SITE_TAGLINE}。<br><a href="/about.html">關於本站</a> ・ <a href="/privacy.html">私隱政策</a> ・ <a href="/support.html">支持本站</a>`,
    lastUpdated: false,
    contributors: false,
    pageInfo: ["Date", "ReadingTime"],
    breadcrumb: true,
    copyright: false,
    author: {
      name: AUTHOR_NAME,
      url: AUTHOR_URL,
    },
    markdown: {
      footnote: true,
      attrs: true,
      component: true,
      gfm: true,
      mark: true,
    },
    plugins: {
      slimsearch: {
        // 只排除 404；其餘頁面（含 noindex 年度索引頁）維持原本的搜尋結果
        filter: (page) => page.path !== "/404.html",
        // 全文檢索：標題、各級標題與整篇史料正文都進索引（主題預設）。
        // 體積較大但 worker 只在「開啟搜尋」時才建立；search-prefetch 亦只在
        // hover／focus／Ctrl-K 等明確意圖出現時才預抓，不用搜尋的訪客完全不載。
        indexOptions: { tokenize: tokenizeForIndex },
        // 章節／報刊／出版日／description 作為高權重關鍵詞；正文已全文索引，
        // 不再重複塞入摘要，避免雙倍 postings。
        customFields: [{ getter: searchKeywords }],
        suggestion: false,
        searchDelay: 200,
        hotKeys: [
          { key: "k", ctrl: true },
          { key: "k", meta: true },
          { key: "/", ctrl: true },
        ],
        locales: {
          "/": {
            placeholder: "搜尋文獻內容",
            search: "搜尋",
            cancel: "取消",
            clear: "清除搜尋內容",
            remove: "移除記錄",
            searching: "搜尋中",
            defaultTitle: "文獻",
            select: "選擇",
            navigate: "切換",
            autocomplete: "自動補全",
            exit: "關閉",
            queryHistory: "搜尋記錄",
            resultHistory: "結果記錄",
            emptyHistory: "暫無搜尋記錄",
            emptyResult: "找不到相符內容",
            loading: "正在載入搜尋索引",
          },
        },
      },
      seo: {
        canonical: canonicalUrl,
        fallBackImage: `${hostname}/favicon.png`,

        isArticle: isSourceDocument,

        ogp: (ogp, page) => {
          const image = cardUrl(page);
          const alt = page.path === "/" ? SITE_NAME : page.title;

          const tags = ogp as unknown as Record<string, string>;

          Object.assign(tags, socialTags(image, alt));

          const published = publishedDate(page);

          if (published) {
            tags["article:published_time"] = published;
          } else {
            for (const key of Object.keys(tags)) {
              if (key.startsWith("article:")) delete tags[key];
            }
          }

          return ogp;
        },
        jsonLd: (jsonLd, page, app) => {
          const article = isSourceDocument(page);
          const url = canonicalUrl(page);
          const published = publishedDate(page);
          const created = createdDate(page);
          const source = article ? sourceOfPage(page) : undefined;
          const citation = source?.citation;
          const collection = article ? undefined : collectionItems(page, app);

          const main = {
            ...jsonLd,
            "@type": article
              ? "Article"
              : collection
                ? "CollectionPage"
                : "WebPage",
            "@id": `${url}#${article ? "article" : "webpage"}`,
            url,
            inLanguage: "zh-Hant",
            isPartOf: { "@id": WEBSITE_ID },
            publisher: { "@id": ORGANIZATION_ID },
            // 自帶 url，不解析 @graph 也能取得作者個人頁
            author: AUTHOR_NODE,
            // 中文以「字」計：沿用全站統一的可見內文長度（已排除 frontmatter／標題／標記）
            wordCount: visibleLengthOf(page),
            image: [cardUrl(page)],
          } as Record<string, unknown>;

          delete main["@context"];
          delete main.datePublished;
          delete main.dateCreated;

          if (published) main.datePublished = published;
          if (created) main.dateCreated = created;

          const description = page.frontmatter.description;

          if (typeof description === "string" && description.trim()) {
            main.description = description.trim();
          }

          if (citation) main.citation = citation;

          const trails = breadcrumbTrails(app);
          const [dir] = pathSegments(page.path);
          const chapter = chapterOfPath(page.path);
          const topic = linkedTrail(trails.get(page.path)).at(-1)?.text;
          const about = [...new Set([chapter, topic].filter(Boolean))] as string[];

          if (about.length) {
            main.about = about.map((name) => ({ "@type": "Thing", name }));
            main.keywords = about.join("、");
          }

          if (chapter && dir !== "project") {
            main.spatialCoverage = { "@type": "Place", name: "香港" };
          }

          if (article) {
            if (chapter) main.articleSection = chapter;
            if (published) main.temporalCoverage = published;

            if (source?.publication) {
              main.isBasedOn = {
                "@type": "CreativeWork",
                name: page.title,
                ...(published ? { datePublished: published } : {}),
                ...(source.pagination ? { pagination: source.pagination } : {}),
                isPartOf: {
                  "@type": "Periodical",
                  name: source.publication,
                },
              };
            }
          }

          const breadcrumb = buildBreadcrumb(
            page,
            url,
            trails.get(page.path) ?? [],
          );

          if (breadcrumb) main.breadcrumb = { "@id": breadcrumb["@id"] };
          if (collection) main.mainEntity = collection;

          return jsonLdGraph(main, [breadcrumb]) as unknown as typeof jsonLd;
        },
      },
      sitemap: {
        modifyTimeGetter: sitemapModifiedTime,
      },
      redirect: {
        // 沿用主題預設的地區切換行為，只補上舊網址的靜態導向
        switchLocale: "modal",
        config: { [LEGACY_INDEX_PATH]: TIMELINE_PATH },
      },
      icon: false,
      catalog: false,
      photoSwipe: false,
      components: false,
    },
  },
  { custom: true },
);
