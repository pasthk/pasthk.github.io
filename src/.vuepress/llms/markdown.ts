import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import type { App, Plugin } from "vuepress/core";
import { success } from "vuepress/utils";

import { chapterName } from "../chapters.js";
import { insertBeforeHeadClose } from "../build/html.js";
import { mapInBatches, pushTo, readOptional, walkFiles } from "../utils.js";
import {
  OVERVIEW_KEY,
  VOLUME_DIR,
  volumeKey,
} from "./volumes.js";
import { canonicalUrl, isListedPage } from "../page-meta.js";
import { HOSTNAME, SITE_NAME } from "../site.js";

const URL_LINE = /^url:[^\n]*(?:\n[ \t]+[^\n]*)?/gm;
const FRONTMATTER = /^---\n[\s\S]*?\n---\n/u;

const rewriteUrlLines = (
  text: string,
  canonicalFor: (markdownUrl: string) => string | undefined,
): string =>
  text.replace(URL_LINE, (line) => {
    const found = /https?:\/\/[^\s'"<>]+?\.md/u.exec(line);
    const canonical = found ? canonicalFor(found[0]) : undefined;

    return canonical ? `url: ${canonical}` : line;
  });

const SECTION_START = /^---\nurl: /gmu;

const splitSections = (text: string): { key: string; body: string }[] => {
  const starts = [...text.matchAll(SECTION_START)].map(
    (match) => match.index as number,
  );

  return starts.map((start, index) => {
    const body = text
      .slice(start, starts[index + 1] ?? text.length)
      .replace(/\n---\n\s*$/u, "\n");
    const url = /^url:[ \t]*(\S+)/mu.exec(body)?.[1] ?? "";

    return { key: volumeKey(url), body };
  });
};

async function writeVolumes(dest: string, full: string): Promise<void> {
  const groups = new Map<string, string[]>();

  for (const section of splitSections(full)) {
    pushTo(groups, section.key, section.body);
  }

  const dir = join(dest, VOLUME_DIR);

  await mkdir(dir, { recursive: true });

  await mapInBatches([...groups], async ([key, bodies]) => {
    const label =
      key === OVERVIEW_KEY ? "總覽與說明" : (chapterName(key) ?? key);
    const header = [
      `# ${SITE_NAME}｜${label}（全站全文分冊）`,
      "",
      `> 本冊收錄 ${bodies.length} 個頁面，摘自 [全站全文](${HOSTNAME}/llms-full.txt)。`,
      `> 完整索引見 [llms.txt](${HOSTNAME}/llms.txt)；引用請使用各節「規範網址」的 .html 網址。`,
      "",
      "",
    ].join("\n");

    await writeFile(
      join(dir, `${key}.txt`),
      `${header}${bodies.join("\n---\n\n")}\n`,
      "utf8",
    );
  });
}

/**
 * 把 Markdown 鏡像的 alternate 連結補進 HTML 的 <head>。
 *
 * 原先是 onInitialized 把 link 推進 page.frontmatter.head，代價是這條只有
 * 爬蟲會讀的連結被內嵌進每頁的客戶端 chunk（page data 的 head 欄位）。
 * 改在輸出階段補上：page data 保持乾淨，HTML 結果與原本一致。
 */
const alternateLink = (href: string): string =>
  `<link rel="alternate" type="text/markdown" href="${href}">`;

async function addAlternateLink(
  htmlPath: string,
  href: string,
): Promise<boolean> {
  const html = await readOptional(htmlPath);

  if (html === undefined || html.includes(`href="${href}"`)) return false;

  const next = insertBeforeHeadClose(html, alternateLink(href));

  if (next === undefined) return false;

  await writeFile(htmlPath, next, "utf8");

  return true;
}

export const llmsCanonicalPlugin = (): Plugin => ({
  name: "llms-canonical",

  async onGenerated(app: App): Promise<void> {
    const canonicals = new Map<string, string>();

    for (const page of app.pages) {
      if (!isListedPage(page)) continue;

      const html = page.htmlFilePathRelative;

      if (html) canonicals.set(html.replace(/\.html$/u, ".md"), canonicalUrl(page));
    }

    const canonicalFor = (value: string): string | undefined => {
      try {
        const key = decodeURIComponent(new URL(value).pathname).replace(
          /^\//u,
          "",
        );

        return canonicals.get(key);
      } catch {
        return undefined;
      }
    };

    const dest = dirname(app.dir.dest("llms-full.txt"));
    let linked = 0;

    /* 每個 .md 鏡像都有一個同名的 .html，逐頁補上 alternate 連結 */
    await mapInBatches(await walkFiles(dest, ".md"), async (file) => {
      const href = `/${relative(dest, file).split(sep).join("/")}`;

      if (await addAlternateLink(file.replace(/\.md$/u, ".html"), href)) {
        linked += 1;
      }

      const content = await readFile(file, "utf8");

      if (!content.startsWith("---\n")) return;

      const next = content.replace(FRONTMATTER, (block) =>
        rewriteUrlLines(block, canonicalFor),
      );

      if (next !== content) await writeFile(file, next, "utf8");
    });

    if (linked) success(`已在 ${linked} 頁補上 Markdown 鏡像的 alternate 連結`);

    const fullPath = app.dir.dest("llms-full.txt");
    const full = await readFile(fullPath, "utf8");
    const next = rewriteUrlLines(full, canonicalFor);

    if (next !== full) await writeFile(fullPath, next, "utf8");

    await writeVolumes(dest, next);
  },
});
