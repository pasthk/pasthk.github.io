<script setup>
import { computed } from "vue";
import { useLang } from "vuepress/client";

defineOptions({ inheritAttrs: false });

const props = defineProps({
  date: {
    type: Date,
    default: null,
  },
});

const lang = useLang();

const formattedDate = computed(() => {
  if (!props.date) return null;

  const parts = new Intl.DateTimeFormat(lang.value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    calendar: "gregory",
    numberingSystem: "latn",
  }).formatToParts(props.date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}年${month}月${day}日`;
});
</script>

<template>
  <span
    v-if="date"
    class="page-date-info"
    aria-label="寫作日期"
  >
    <span data-allow-mismatch="text">{{ formattedDate }}</span>
    <meta property="datePublished" :content="date.toISOString() || ''" />
  </span>
</template>
