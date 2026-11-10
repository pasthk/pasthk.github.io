import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Plugin } from "vite";
import type { App, Plugin as VuePressPlugin } from "vuepress/core";

/**
 * 在建置期丟棄本站永遠用不到的元件樣式。
 *
 * 緣起：vuepress-theme-hope 的 home／blog 版型樣式是由各元件 JS 以
 * `import ".../*.scss"` 直接引入，即使 `pure: true`、全站沒有任何
 * `home: true` 頁面，這些模組仍被打包進唯一的 CSS 檔（實測約 23 KB，
 * 佔 19%）。同理，plugin-markdown-ext 的 tasklist、highlighter-helper
 * 的 code-block-title、plugin-git 的 changelog／contributors 樣式也無條件
 * 載入，而本站 309 篇 Markdown 完全沒有程式碼區塊、工作清單、Badge／VPCard，
 * 也未啟用 changelog 與 contributors。
 *
 * 做法：用 Vite 的 pre-transform 把這些「自足、沒有 @use 依賴」的樣式模組
 * 換成空字串，讓它們從源頭就不進 bundle。相較於產出後用正則剪 CSS，
 * 這不會動到其他規則的位元組，內容雜湊也自然反映結果。
 *
 * 兩道守衛：
 * 1. `assertNoUsage`：若來源 Markdown 出現任何一種對應語法，整組放棄剝除，
 *    回退成原樣的完整樣式表（效能優化失效，但絕不破版）。
 * 2. `verifyDroppedStyles`：onGenerated 時掃描所有輸出 HTML，若仍有被剝除
 *    的類別名稱就直接讓建置失敗，避免「站台改了、這支外掛沒跟著改」的沉默破版。
 *
 * 相容性：比對對象是套件內的相對路徑。日後升級主題／外掛若改了目錄結構，
 * 比對不到就不會剝除，行為自動退回完整樣式表，不需手動維護白名單。
 */

const SRC_DIR = fileURLToPath(new URL("../", import.meta.url));

/** 只要命中任一模組，就把該檔案的內容清空。 */
const DROP_PATHS = [
  /\/vuepress-theme-hope\/dist\/client\/styles\/home\/[^/]+\.scss$/u,
  /\/vuepress-theme-hope\/dist\/client\/styles\/blog\/[^/]+\.scss$/u,
  /\/@vuepress\/plugin-markdown-ext\/dist\/client\/styles\/tasklist\.css$/u,
  /\/@vuepress\/highlighter-helper\/dist\/client\/styles\/code-block-title\.css$/u,
  /\/@vuepress\/plugin-git\/dist\/Git(?:Changelog|Contributors)-[^/]+\.css$/u,
];

/** 若來源出現這些語法，代表對應樣式其實有用，必須整組保留。 */
const USAGE_MARKERS: RegExp[] = [
  /^home:\s*true/mu,
  /^portfolio:\s*true/mu,
  /^blog:\s*true/mu,
  /^hero(?:Text|Image|FullScreen):/mu,
  /^features:/mu,
  /^changelog:\s*true/mu,
  /^contributors:\s*true/mu,
  /^```/mu,
  /^-\s+\[[ xX]\]/mu,
  /<GitChangelog\b/u,
];

/** 剝除後不該出現在輸出 HTML 的類別前綴。 */
const DROPPED_CLASS_TOKENS = [
  "vp-hero",
  "vp-feature",
  "vp-highlight",
  "vp-home",
  "vp-portfolio",
  "vp-blog",
  "vp-article",
  "page-category",
  "page-tag",
  "vp-blogger",
  "vp-timeline",
  "task-list-",
  "code-block-title",
  "code-block-with-title",
  "vp-changelog",
  "vp-git-contributors",
];

async function listMarkdown(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    // .vuepress 內只有設定檔，dist/.temp/.cache 是建置產物，都不是內容來源。
    if (entry.name.startsWith(".")) continue;

    const path = join(dir, entry.name);

    if (entry.isDirectory()) files.push(...(await listMarkdown(path)));
    else if (extname(entry.name) === ".md") files.push(path);
  }

  return files;
}

async function shouldDrop(): Promise<boolean> {
  const files = await listMarkdown(SRC_DIR);

  for (const file of files) {
    const text = await readFile(file, "utf8");

    if (USAGE_MARKERS.some((marker) => marker.test(text))) return false;
  }

  return true;
}

export function dropUnusedStyles(): Plugin {
  // configureVite 會被 client／SSR 兩次建置呼叫，兩邊共用同一個判斷結果。
  const enabled = shouldDrop();

  return {
    name: "pasthk:drop-unused-styles",
    enforce: "pre",
    async transform(_code, id) {
      if (!(await enabled)) return null;

      const path = id.split("?", 1)[0].replaceAll("\\", "/");

      return DROP_PATHS.some((pattern) => pattern.test(path))
        ? { code: "", map: null }
        : null;
    },
  };
}

/**
 * 建置完成後的最後一道檢查。唯有確實執行過剝除才需要驗證，
 * 否則（來源出現對應語法、或套件路徑已改）本就保留完整樣式表。
 */
export function verifyDroppedStyles(): VuePressPlugin {
  return {
    name: "pasthk:verify-dropped-styles",

    async onGenerated(app: App): Promise<void> {
      if (!(await shouldDrop())) return;

      const offenders: string[] = [];

      const walk = async (dir: string): Promise<void> => {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
          const path = join(dir, entry.name);

          if (entry.isDirectory()) {
            await walk(path);
          } else if (entry.name.endsWith(".html")) {
            const html = await readFile(path, "utf8");
            const found = DROPPED_CLASS_TOKENS.filter((token) =>
              html.includes(token),
            );

            if (found.length) offenders.push(`${path}: ${found.join(", ")}`);
          }
        }
      };

      await walk(app.dir.dest());

      if (offenders.length) {
        throw new Error(
          `drop-unused-styles 已剝除樣式，但輸出 HTML 仍使用相關類別：\n${offenders
            .slice(0, 10)
            .join("\n")}\n請更新 drop-unused-styles.ts 的守衛或停用該外掛。`,
        );
      }
    },
  };
}
