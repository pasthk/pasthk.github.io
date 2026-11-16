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

/* 預留高度只在「等待填充」期間有意義。廣告被攔截或未填充時要收起，
   否則這些訪客會永遠看到一條空白帶；填充成功的廣告不受影響。 */
const FALLBACK_DELAY = 5000;

const adElement = ref();

onMounted(() => {
  const element = adElement.value;
  if (!element || element.dataset.adsbygoogleStatus) return;

  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.push({});

  const wrap = element.closest(".ad-top-wrap");
  const collapse = () => wrap?.classList.add("ad-top-collapsed");

  /* 廣告請求完成但沒有可投放的廣告（低流量、地區無庫存） */
  const onStatus = () => {
    if (element.dataset.adStatus === "unfilled") collapse();
  };

  new MutationObserver(onStatus).observe(element, {
    attributes: true,
    attributeFilter: ["data-ad-status"],
  });
  onStatus();

  /* 腳本被廣告攔截器擋下時會觸發 error */
  document
    .querySelector('script[src*="adsbygoogle.js"]')
    ?.addEventListener("error", collapse, { once: true });

  /* 兜底：腳本既沒載入也沒報錯（少數攔截器直接移除標籤） */
  setTimeout(() => {
    if (!element.dataset.adsbygoogleStatus && !element.dataset.adStatus) {
      collapse();
    }
  }, FALLBACK_DELAY);
});
</script>
