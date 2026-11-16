import { success } from "vuepress/utils";
import type { Plugin } from "vite";

/**
 * 客戶端頁面資料瘦身。
 *
 * 每頁的 chunk 會內嵌整份 page data，其中兩項客戶端完全用不到：
 *   1. `frontmatter.head` 內的 JSON-LD（`application/ld+json`）——與靜態 HTML
 *      的 <head> 完全重複，只供爬蟲讀取；SPA 換頁時重貼結構化資料並無意義。
 *   2. `git` 欄位（updatedTime 等）——只由建置期的 sitemap 讀取。
 * 實測 363 頁的客戶端 chunk 由 3.90 MB 降至 2.57 MB（−34%，gzip −24%）。
 *
 * 只在客戶端建置時掛上：SSR 仍保留完整資料，靜態 HTML 的 JSON-LD、meta
 * 與 alternate 連結照舊輸出，因此 SEO／社群抓取不受影響。
 * meta 與 link 條目一律保留，SPA 換頁時的 head 同步才不會出錯。
 */
const PAGE_DATA = /_pageData = JSON\.parse\(("(?:[^"\\]|\\.)*")\)/u;

const isJsonLd = (item: unknown): boolean => {
  const [tag, attrs] = (item ?? []) as [unknown, Record<string, string>?];

  return tag === "script" && attrs?.type === "application/ld+json";
};

const isHeadList = (value: unknown): value is unknown[] =>
  Array.isArray(value) && value.every((item) => Array.isArray(item));

/** 就地剝除無用欄位，回傳省下的位元組數（0 表示沒有改動） */
const slimPageData = (data: Record<string, unknown>): number => {
  let saved = 0;

  if (data.git) {
    saved += JSON.stringify(data.git).length;
    delete data.git;
  }

  for (const holder of [data, data.frontmatter]) {
    if (!holder || typeof holder !== "object") continue;

    const record = holder as Record<string, unknown>;

    if (!isHeadList(record.head)) continue;

    const kept = record.head.filter((item) => !isJsonLd(item));

    if (kept.length === record.head.length) continue;

    saved += JSON.stringify(record.head).length - JSON.stringify(kept).length;
    record.head = kept;
  }

  return saved;
};

export const slimPageDataPlugin = (): Plugin => {
  let pages = 0;
  let saved = 0;

  return {
    name: "local:slim-page-data",
    enforce: "pre",
    /* 開發模式的 SSR 與客戶端共用同一次 transform，這裡只在建置時生效 */
    apply: "build",
    transform(code, id) {
      /* markdown 與虛擬頁（.temp 產生的 .vue）都帶 _pageData */
      if (!id.endsWith(".md") && !id.endsWith(".vue")) return null;
      if (!code.includes("_pageData")) return null;

      const match = PAGE_DATA.exec(code);

      if (!match) return null;

      let data: Record<string, unknown>;

      try {
        data = JSON.parse(JSON.parse(match[1]));
      } catch {
        return null;
      }

      if (!data || typeof data !== "object") return null;

      const delta = slimPageData(data);

      if (!delta) return null;

      pages += 1;
      saved += delta;

      /* 以函式回傳，避免資料內的 `$&` 之類字串被當成替換樣式 */
      return code.replace(match[0], () =>
        `_pageData = JSON.parse(${JSON.stringify(JSON.stringify(data))})`,
      );
    },
    closeBundle() {
      if (!pages) return;

      success(
        `頁面資料瘦身：${pages} 頁移除 JSON-LD 與 git 欄位，客戶端 bundle 減 ${Math.round(saved / 1024)} KB`,
      );
    },
  };
};
