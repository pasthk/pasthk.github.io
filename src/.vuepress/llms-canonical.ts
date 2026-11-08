import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { App, HeadConfig, Page, Plugin } from "vuepress/core";

import { chapterName } from "./chapters.js";
import {
  OVERVIEW_KEY,
  VOLUME_DIR,
  volumeKey,
} from "./llms-volumes.js";
import { canonicalUrl } from "./page-meta.js";
import { HOSTNAME, SITE_NAME } from "./site.js";

/**
 * 補齊 @vuepress/plugin-llms 沒有提供的兩件事：
 *
 * 1. 外掛把每份 .md 的 frontmatter `url` 寫成「.md 自身」
 *    （generateLLMFriendlyDocs 裡寫死 linkExtension: ".md"，沒有選項可改），
 *    llms-full.txt 也一樣。模型讀完後唯一拿得到的網址是純文字鏡像，
 *    與本站對外公布的 .html 引用格式不一致。這裡在 onGenerated 統一改寫成
 *    正規網址，讓「引用」這件事從索引到全文都指向同一份文件。
 *
 * 2. 從 HTML 頁面加上 rel="alternate" type="text/markdown"，讓不是從
 *    llms.txt 進來的檢索器也能發現純文字版。
 *
 * 本外掛必須註冊在 llms 之後：兩者都用 onGenerated，外掛先寫檔、這裡再改寫。
 */

/** 外掛的 filter 會排除空殼頁；這裡用同樣的條件判斷是否真的會產生 .md */
const hasPlainText = (page: Page): boolean =>
  page.frontmatter.sitemap !== false &&
  page.frontmatter.llmstxt !== false &&
  Boolean(page.filePath?.endsWith(".md")) &&
  page.content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/u, "").trim().length > 0;

/** gray-matter 可能把 url 寫成單行，也可能摺疊成 `>-` + 縮排的下一行 */
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

async function markdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const groups = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const full = join(dir, entry.name);

      if (entry.isDirectory()) return markdownFiles(full);

      return entry.isFile() && entry.name.endsWith(".md") ? [full] : [];
    }),
  );

  return groups.flat();
}

/**
 * 把 800KB 的 llms-full.txt 依章節拆成較小的分冊。
 *
 * 外掛每一節都以 `---\nurl: ...` 的 frontmatter 起頭，節與節之間是
 * `---` 水平線，因此以「frontmatter 起點」切分最可靠，不受正文中
 * 其他水平線影響。切完後各節內容原樣保留（url 已在前面改成正規網址）。
 */
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
    const list = groups.get(section.key) ?? [];

    list.push(section.body);
    groups.set(section.key, list);
  }

  const dir = join(dest, VOLUME_DIR);

  await mkdir(dir, { recursive: true });

  for (const [key, bodies] of groups) {
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
  }
}

export const llmsCanonicalPlugin = (): Plugin => () => ({
  name: "llms-canonical",

  onInitialized(app: App): void {
    for (const page of app.pages) {
      if (!hasPlainText(page)) continue;

      const html = page.htmlFilePathRelative;

      if (!html) continue;

      const href = `/${html.replace(/\.html$/u, ".md")}`;
      const head = (page.frontmatter.head ??= []) as HeadConfig[];

      if (
        head.some(
          (item) =>
            item[0] === "link" &&
            (item[1] as Record<string, string>)?.href === href,
        )
      )
        continue;

      head.push([
        "link",
        { rel: "alternate", type: "text/markdown", href },
      ]);
    }
  },

  async onGenerated(app: App): Promise<void> {
    // .md 相對路徑 → 該頁的 canonical .html 網址
    const canonicals = new Map<string, string>();

    for (const page of app.pages) {
      if (page.frontmatter.sitemap === false) continue;

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

    for (const file of await markdownFiles(dest)) {
      const content = await readFile(file, "utf8");

      if (!content.startsWith("---\n")) continue;

      const next = content.replace(FRONTMATTER, (block) =>
        rewriteUrlLines(block, canonicalFor),
      );

      if (next !== content) await writeFile(file, next, "utf8");
    }

    const fullPath = app.dir.dest("llms-full.txt");
    const full = await readFile(fullPath, "utf8");
    const next = rewriteUrlLines(full, canonicalFor);

    if (next !== full) await writeFile(fullPath, next, "utf8");

    // 用改寫後的內容切分冊，確保分冊內的 url 與主檔一致
    await writeVolumes(dest, next);
  },
});
