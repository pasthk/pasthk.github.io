<script setup>
import { computed } from "vue";
import { usePageData } from "vuepress/client";
import { Layout as HopeLayout } from "vuepress-theme-hope/client";
import AdTop from "../components/AdTop.vue";
import RelatedDocuments from "../components/RelatedDocuments.vue";

const page = usePageData();

// 投放範圍由 ad-eligibility.ts 在建置期統一計算並寫入 page.data
// （與 related-documents 的 page.data.related 同一序列化機制）。
// 排除 404、空殼頁、導覽頁，以及可見正文未達門檻的頁面；這些頁面仍會
// 載入 head 的 AdSense 程式碼，但不會有廣告位與 push({})，避免審核爬蟲
// 在內容不足的頁面看到廣告單元。判斷標準集中在外掛，不在這裡重寫。
const showAd = computed(() => page.value.adEligible === true);
</script>

<template>
  <HopeLayout>
    <template #contentAfter>
      <RelatedDocuments />
      <AdTop v-if="showAd" />
    </template>
  </HopeLayout>
</template>
