import type { Page } from "vuepress/core";
import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";
import { breadcrumbTrails, type TrailItem } from "./breadcrumb.js";
import { chapterOfPath, pathSegments } from "./chapters.js";
import { collectionItems } from "./item-list.js";
import { socialTags } from "./og/meta.js";
import { ogImageUrl } from "./og/paths.js";
import {
  canonicalUrl,
  createdDate,
  isSourceDocument,
  publishedDate,
  sourceOfPage,
} from "./page-meta.js";
import { tokenizeForIndex } from "./search-tokenize.js";
import { sitemapModifiedTime } from "./sitemap.js";
import {
  absoluteUrl,
  HOSTNAME as hostname,
  SITE_NAME,
  SITE_NAME_EN,
  SITE_TAGLINE,
} from "./site.js";

const ORGANIZATION_ID = `${hostname}/#organization`;
const WEBSITE_ID = `${hostname}/#website`;
const PERSON_ID = `${hostname}/#person`;

const organization = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE_NAME,
  alternateName: SITE_NAME_EN,
  url: hostname,
  logo: {
    "@type": "ImageObject",
    url: `${hostname}/favicon.png`,
    width: 268,
    height: 268,
  },
  email: "pasthk@outlook.com",
  sameAs: ["https://github.com/pasthk/pasthk.github.io"],
};

const person = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: "NG, KIN CHUNG",
  url: `${hostname}/about.html`,
  email: "pasthk@outlook.com",
};

const website = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: `${hostname}/`,
  name: SITE_NAME,
  inLanguage: "zh-Hant",
  publisher: { "@id": ORGANIZATION_ID },
};

const cardUrl = (page: Page): string =>
  page.frontmatter.sitemap === false
    ? ogImageUrl(hostname, "/")
    : ogImageUrl(hostname, page.path);

function buildBreadcrumb(page: Page, url: string, trail: TrailItem[]) {
  if (page.path === "/" || !page.title) return null;

  const items = [
    { name: "首頁", item: `${hostname}/` },
    ...trail
      .filter((entry) => entry.link && entry.link !== "/")
      .map((entry) => ({
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
      name: "NG, KIN CHUNG",
      url: `${hostname}/about.html`,
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
        indexOptions: { tokenize: tokenizeForIndex },
        customFields: [
          {
            getter: (page) =>
              [
                chapterOfPath(page.path),
                typeof page.frontmatter.description === "string"
                  ? page.frontmatter.description
                  : null,
              ].filter((value): value is string => Boolean(value)),
          },
        ],
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
            author: { "@id": PERSON_ID },
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
          const topic = trails
            .get(page.path)
            ?.filter((entry) => entry.link && entry.link !== "/")
            .at(-1)?.text;
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
          if (collection) main.mainEntity = collection.itemList;

          return {
            "@context": "https://schema.org",
            "@graph": [
              main,
              ...(breadcrumb ? [breadcrumb] : []),
              organization,
              person,
              website,
            ],
          } as unknown as typeof jsonLd;
        },
      },
      sitemap: {
        modifyTimeGetter: sitemapModifiedTime,
      },
      icon: false,
      catalog: false,
      photoSwipe: false,
      components: false,
    },
  },
  { custom: true },
);
