import { readFileSync, readdirSync } from "node:fs";
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

function listMarkdown(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    // .vuepress 內只有設定檔，dist/.temp/.cache 是建置產物，都不是內容來源。
    if (entry.name.startsWith(".")) continue;

    const path = join(dir, entry.name);

    if (entry.isDirectory()) files.push(...listMarkdown(path));
    else if (extname(entry.name) === ".md") files.push(path);
  }

  return files;
}

/**
 * 掃描一次、全程序共用。
 *
 * 先前每次呼叫都同步讀完全部 300 餘篇 Markdown（約 10 MB），而一次建置會呼叫
 * 三到四次（client／SSR 兩次 configureVite，加上 onGenerated 的驗證）。改為
 * 快取後只掃一次；掃描結果本來就只取決於來源檔，兩次建置不會不同。
 */
let dropCache: boolean | undefined;

function shouldDrop(): boolean {
  if (dropCache !== undefined) return dropCache;

  dropCache = listMarkdown(SRC_DIR).every((file) => {
    const text = readFileSync(file, "utf8");

    return !USAGE_MARKERS.some((marker) => marker.test(text));
  });

  return dropCache;
}

export function dropUnusedStyles(): Plugin {
  return {
    name: "pasthk:drop-unused-styles",
    enforce: "pre",
    // 同步回傳：這個鉤子會對每個模組各跑一次（實測 573 次），
    // 先前的 async 版本讓每次呼叫都多一輪 microtask，純屬額外開銷。
    transform(_code, id) {
      if (!shouldDrop()) return null;

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

    onGenerated(app: App): void {
      if (!shouldDrop()) return;

      const offenders: string[] = [];

      const walk = (dir: string): void => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const path = join(dir, entry.name);

          if (entry.isDirectory()) {
            walk(path);
          } else if (entry.name.endsWith(".html")) {
            const html = readFileSync(path, "utf8");
            const found = DROPPED_CLASS_TOKENS.filter((token) =>
              html.includes(token),
            );

            if (found.length) offenders.push(`${path}: ${found.join(", ")}`);
          }
        }
      };

      walk(app.dir.dest());

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
