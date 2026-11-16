/**
 * 搜尋索引的預載策略：只有「明確意圖」才抓。
 *
 * 索引約 3.6 MB 原文（gzip 後約 930 KB），只由 worker 在開啟搜尋時使用。
 * 實際會用搜尋的訪客遠少於全部訪客，因此不在頁面空閒時預載，只在下列
 * 訊號出現時才補抓，讓按下搜尋的那一刻索引已在路上：
 *   - 指標移到／聚焦搜尋按鈕（含觸控按壓）；
 *   - Ctrl/⌘+K、Ctrl+/ 快捷鍵。
 * 沒有出現這些訊號的訪客完全不產生索引流量。
 *
 * 這段邏輯原本內聯在每一頁的 <head>，會重複出現在三百多個 HTML 檔；
 * 移入客戶端 bundle 後只下載一次，且可隨 app.js 長期快取。
 */
const INDEX_URL = "/slimsearch.index.json";

export function installSearchPrefetch() {
  /* enhance 在建置期（SSR）也會被呼叫，那裡沒有 navigator / document */
  if (typeof window === "undefined") return;

  /* 開發模式下索引仍內嵌在 worker 檔裡，沒有獨立索引檔可抓 */
  if (typeof __VUEPRESS_DEV__ !== "undefined" && __VUEPRESS_DEV__) return;

  /* 同一頁只插入一次 link，避免反覆 hover 疊出多個請求 */
  let started = false;

  const prefetch = () => {
    if (started) return;

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
}
