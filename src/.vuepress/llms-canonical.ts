import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { App, HeadConfig, Plugin } from "vuepress/core";

import { chapterName } from "./chapters.js";
import { mapInBatches, pushTo } from "./map-utils.js";
import {
  OVERVIEW_KEY,
  VOLUME_DIR,
  volumeKey,
} from "./llms-volumes.js";
import { canonicalUrl, isListedPage, isLlmsPage } from "./page-meta.js";
import { HOSTNAME, SITE_NAME } from "./site.js";


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

export const llmsCanonicalPlugin = (): Plugin => ({
  name: "llms-canonical",

  onInitialized(app: App): void {
    for (const page of app.pages) {
      if (!isLlmsPage(page)) continue;

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

    await mapInBatches(await markdownFiles(dest), async (file) => {
      const content = await readFile(file, "utf8");

      if (!content.startsWith("---\n")) return;

      const next = content.replace(FRONTMATTER, (block) =>
        rewriteUrlLines(block, canonicalFor),
      );

      if (next !== content) await writeFile(file, next, "utf8");
    });

    const fullPath = app.dir.dest("llms-full.txt");
    const full = await readFile(fullPath, "utf8");
    const next = rewriteUrlLines(full, canonicalFor);

    if (next !== full) await writeFile(fullPath, next, "utf8");

    await writeVolumes(dest, next);
  },
});
