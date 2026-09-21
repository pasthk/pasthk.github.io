<script setup>
import { Layout as HopeLayout } from "vuepress-theme-hope/client";
import AdTop from "../components/AdTop.vue";
</script>

<template>
  <HopeLayout>
    <template #contentAfter>
      <AdTop />
    </template>
  </HopeLayout>
</template>
