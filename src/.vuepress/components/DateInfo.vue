<script setup>
import { computed } from "vue";
import { useFrontmatter, useLang } from "vuepress/client";

defineOptions({ inheritAttrs: false });

const props = defineProps({
  date: {
    type: Date,
    default: null,
  },
});

const lang = useLang();
const frontmatter = useFrontmatter();

const formatSourceDate = (value) => {
  if (!value) return null;

  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(String(value));
  if (!match) return String(value);

  const [, year, month, day] = match;
  if (day) return `${year}年${Number(month)}月${Number(day)}日`;
  if (month) return `${year}年${Number(month)}月`;
  return `${year}年`;
};

/** 同時產生顯示文字與原始值，避免兩者各自計算而不同步 */
const sourceDate = (property, label) => {
  const value = frontmatter.value[property];
  if (typeof value !== "string" || !value) return null;

  return { property, label, raw: value, text: formatSourceDate(value) };
};

const datePublished = computed(() => sourceDate("datePublished", "報刊："));
const dateCreated = computed(() => sourceDate("dateCreated", "收錄："));
const sourceDates = computed(() =>
  [datePublished.value, dateCreated.value].filter(Boolean),
);

const formattedDate = computed(() => {
  if (!props.date) return null;

  const parts = new Intl.DateTimeFormat(lang.value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    calendar: "gregory",
    numberingSystem: "latn",
  }).formatToParts(props.date);
  const part = (type) => parts.find((item) => item.type === type)?.value;

  return `${part("year")}年${part("month")}月${part("day")}日`;
});
</script>

<template>
  <span
    v-if="sourceDates.length || date"
    class="page-date-info"
    :aria-label="sourceDates.length ? '報刊日期及收錄日期' : '寫作日期'"
  >
    <span v-if="sourceDates.length" class="page-source-dates">
      <span
        v-for="item in sourceDates"
        :key="item.property"
        class="page-source-date"
      >
        <span class="page-source-date-label">{{ item.label }}</span>{{ item.text }}
      </span>
    </span>
    <span v-else data-allow-mismatch="text">{{ formattedDate }}</span>
    <meta
      property="datePublished"
      :content="datePublished?.raw || date?.toISOString() || ''"
    />
    <meta v-if="dateCreated" property="dateCreated" :content="dateCreated.raw" />
  </span>
</template>
