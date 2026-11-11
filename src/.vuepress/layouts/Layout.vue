<script setup>
import { computed } from "vue";
import { usePageData } from "vuepress/client";
import { Layout as HopeLayout } from "vuepress-theme-hope/client";
import AdTop from "../components/AdTop.vue";
import RelatedDocuments from "../components/RelatedDocuments.vue";

const page = usePageData();

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
