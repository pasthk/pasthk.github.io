import { readFile, writeFile } from "node:fs/promises";
import type { App } from "vuepress/core";

import { mapInBatches, walkFiles } from "../utils.js";

/**
 * 輸出階段改寫 HTML 的共用工具。
 *
 * 「走訪全站 HTML → 逐頁讀入 → 有變化才寫回」原本在清理外掛與 llms 外掛
 * 各寫一次，兩份實作的批次大小、寫檔條件與計數方式都得各自維護。
 * 集中在這裡後，兩者只描述「改什麼」，不再重複處理 I/O。
 */

/** `rewriter` 回傳 undefined 表示不改；回傳新字串才寫檔。回傳值為改寫頁數 */
export const rewriteHtmlFiles = async (
  app: App,
  rewriter: (html: string, file: string) => string | undefined,
): Promise<number> => {
  const files = await walkFiles(app.dir.dest(), ".html");
  let changed = 0;

  await mapInBatches(files, async (file) => {
    const html = await readFile(file, "utf8");
    const next = rewriter(html, file);

    if (next === undefined || next === html) return;

    await writeFile(file, next, "utf8");
    changed += 1;
  });

  return changed;
};

/** 在 `</head>` 之前插入片段；片段不存在時回 undefined，交由呼叫方略過 */
export const insertBeforeHeadClose = (
  html: string,
  snippet: string,
): string | undefined => {
  const at = html.lastIndexOf("</head>");

  return at < 0 ? undefined : `${html.slice(0, at)}${snippet}${html.slice(at)}`;
};
