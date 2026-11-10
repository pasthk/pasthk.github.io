import { readFile, writeFile } from "node:fs/promises";
import type { App, Plugin } from "vuepress/core";

/**
 * 系統外掛寫完輸出檔後的最後一道清理，兩個動作共用同一個 onGenerated。
 *
 * 1. **robots.txt**：seo 外掛會在檔尾追加一段 `User-agent:*` / `Disallow:`，
 *    sitemap 外掛則把 `Sitemap:` 行插到檔案中間，兩者疊加後難以閱讀。
 *    以 src/.vuepress/public/robots.txt 為唯一來源寫回原樣。
 * 2. **sitemap.xml**：Google 明確忽略 `<changefreq>` 與 `<priority>`，
 *    移除這些由外掛無條件寫入的欄位。`<lastmod>` 的治理見 sitemap.ts。
 *
 * 使用者外掛的 onGenerated 晚於主題外掛執行，才能保證這是最後一寫。
 */
export const outputCleanupPlugin = (): Plugin => ({
  name: "output-cleanup",

  async onGenerated(app: App): Promise<void> {
    const robots = await readFile(app.dir.public("robots.txt"), "utf8");

    await writeFile(app.dir.dest("robots.txt"), robots, "utf8");

    const path = app.dir.dest("sitemap.xml");
    const xml = await readFile(path, "utf8");
    const next = xml.replace(
      /[ \t]*<(?:changefreq|priority)>[^<]*<\/(?:changefreq|priority)>\s*/gu,
      "",
    );

    if (next !== xml) await writeFile(path, next, "utf8");
  },
});
