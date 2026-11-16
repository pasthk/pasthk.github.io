/**
 * 搜尋索引的預載策略。
 *
 * 索引本身約 3.6 MB 原文（gzip 後約 930 KB），只由 worker 在「開啟搜尋」時
 * 抓取，不下載就不佔首屏。這裡分兩層預載：
 *   1. 頁面空閒時低優先預載，讓首次搜尋幾乎零等待；
 *   2. hover / focus / touch / 快捷鍵等「即將搜尋」訊號立即補載。
 * 2G 與省流量模式完全不預載，只在真正開啟搜尋時才下載。
 *
 * 這段邏輯原本內聯在每一頁的 <head>，會重複出現在三百多個 HTML 檔；
 * 移入客戶端 bundle 後只下載一次，且可隨 app.js 長期快取。
 */
const INDEX_URL = "/slimsearch.index.json";

const LOW_BANDWIDTH = /^(slow-)?2g$/u;
const UNRELIABLE = /^(2g|3g)$/u;

export function installSearchPrefetch() {
  /* enhance 在建置期（SSR）也會被呼叫，那裡沒有 navigator / document */
  if (typeof window === "undefined") return;

  /* 開發模式下索引仍內嵌在 worker 檔裡，沒有獨立索引檔可抓 */
  if (typeof __VUEPRESS_DEV__ !== "undefined" && __VUEPRESS_DEV__) return;

  const connection = navigator.connection;
  const effectiveType = connection?.effectiveType ?? "";

  /* 省流量模式與 2G：任何情況都不預載 */
  const metered = Boolean(
    connection && (connection.saveData || LOW_BANDWIDTH.test(effectiveType)),
  );
  /* 3G 也略過空閒預載，只在有明確意圖時才抓 */
  const idleEligible = !connection || !UNRELIABLE.test(effectiveType);

  let started = false;

  const prefetch = () => {
    if (started || metered) return;

    started = true;

    const link = document.createElement("link");

    link.rel = "prefetch";
    link.href = INDEX_URL;
    document.head.appendChild(link);
  };

  const onIntent = (event) => {
    if (event.target?.closest?.(".vp-search-button")) prefetch();
  };

  addEventListener("pointerover", onIntent, { passive: true, capture: true });
  addEventListener("focusin", onIntent, { passive: true, capture: true });
  addEventListener("touchstart", onIntent, { passive: true, capture: true });
  addEventListener(
    "keydown",
    (event) => {
      if ((event.ctrlKey || event.metaKey) && (event.key === "k" || event.key === "/"))
        prefetch();
    },
    { passive: true, capture: true },
  );

  const idle = () => {
    if (!idleEligible) return;

    /* 同一 session 只預載一次，避免反覆插入 link */
    try {
      if (sessionStorage.getItem("pasthk-sw")) return;

      sessionStorage.setItem("pasthk-sw", "1");
    } catch {
      /* 無痕模式可能封鎖 storage，忽略即可 */
    }

    if ("requestIdleCallback" in window) requestIdleCallback(prefetch, { timeout: 5000 });
    else setTimeout(prefetch, 3000);
  };

  if (document.readyState === "complete") idle();
  else addEventListener("load", idle, { once: true });
}
