import { readFile, writeFile } from "node:fs/promises";
import type { App, Plugin } from "vuepress/core";
import { warn } from "vuepress/utils";

const readOptional = async (path: string): Promise<string | undefined> => {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;

    throw error;
  }
};

export const outputCleanupPlugin = (): Plugin => ({
  name: "output-cleanup",

  async onGenerated(app: App): Promise<void> {
    const robots = await readOptional(app.dir.public("robots.txt"));

    if (robots === undefined) {
      warn("public/robots.txt 不存在，略過 robots.txt 的清理。");
    } else {
      await writeFile(app.dir.dest("robots.txt"), robots, "utf8");
    }

    const path = app.dir.dest("sitemap.xml");
    const xml = await readOptional(path);

    if (xml === undefined) return;

    const next = xml.replace(
      /[ \t]*<(?:changefreq|priority)>[^<]*<\/(?:changefreq|priority)>\s*/gu,
      "",
    );

    if (next !== xml) await writeFile(path, next, "utf8");
  },
});
