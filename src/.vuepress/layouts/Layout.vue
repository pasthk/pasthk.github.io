<script setup>
import { computed } from "vue";
import { usePageData, usePageFrontmatter } from "vuepress/client";
import { Layout as HopeLayout } from "vuepress-theme-hope/client";
import AdTop from "../components/AdTop.vue";

const page = usePageData();
const frontmatter = usePageFrontmatter();

// 空殼頁（index:false / sitemap:false）只有標題、正文不足，Google 會判定為
// 「內容不足／網站仍在建設中」；404 等錯誤頁依發布商政策亦不得投放廣告。
// 這些頁面仍會載入 head 的 AdSense 程式碼，但不會有廣告位與 push({})。
const showAd = computed(
  () =>
    page.value.path !== "/404.html" &&
    frontmatter.value.index !== false &&
    frontmatter.value.sitemap !== false,
);
</script>

<template>
  <HopeLayout>
    <template #contentAfter>
      <AdTop v-if="showAd" />
    </template>
  </HopeLayout>
</template>
