<template>
  <div class="ad-top-wrap">
    <span class="ad-label">廣告</span>
    <div class="ad-top">
      <ins
        ref="adElement"
        class="adsbygoogle"
        style="display:block;"
        data-ad-client="ca-pub-8975507583219124"
        data-ad-slot="4112129657"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";

// adsbygoogle.js 由 config.ts 的 head 靜態載入；.ad-* 樣式已併入 styles/index.scss。
// 「廣告」標示刻意寫成範本中的實體 <span>，不用 CSS ::before 的 content：
// 生成內容不存在於 HTML 原始碼，審核爬蟲與輔助技術都讀不到，無法判定
// 廣告與內文有明確區隔。相關樣式見 styles/index.scss 的 .ad-label。
const adElement = ref();

onMounted(() => {
  const element = adElement.value;
  if (!element || element.dataset.adsbygoogleStatus) return;

  // 審核爬蟲以固定視窗載入頁面且不會捲動，而廣告位位於正文末尾。
  // 若等 IntersectionObserver 觸發才送出請求，爬蟲只會看到一個從未請求
  // 廣告的空 <ins>。故依官方程式碼片段在掛載時直接 push；腳本為 async，
  // AdSense 載入後會接手處理既有陣列中的項目。
  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.push({});
});
</script>
