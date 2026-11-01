import { readFile, writeFile } from "node:fs/promises";
import type { App, Plugin } from "vuepress/core";

/**
 * 以 src/.vuepress/public/robots.txt 為唯一來源重寫輸出檔。
 *
 * seo 外掛會在檔尾追加一段 `User-agent:*` / `Disallow:`，
 * sitemap 外掛則把 `Sitemap:` 行插到檔案中間，
 * 兩者疊加後檔案結構會變得難以閱讀。
 * 使用者外掛的 onGenerated 晚於主題外掛執行，因此能在最後把檔案寫回原樣。
 */
export const robotsPlugin = (): Plugin => (app: App) => ({
  name: "robots-txt",

  async onGenerated(app: App): Promise<void> {
    const content = await readFile(app.dir.public("robots.txt"), "utf8");

    await writeFile(app.dir.dest("robots.txt"), content, "utf8");
  },
});
