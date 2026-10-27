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

const datePublished = computed(() =>
  formatSourceDate(frontmatter.value.datePublished),
);
const dateCreated = computed(() =>
  formatSourceDate(frontmatter.value.dateCreated),
);

const datePublishedRaw = computed(() => {
  const value = frontmatter.value.datePublished;
  return typeof value === "string" && value ? value : null;
});
const dateCreatedRaw = computed(() => {
  const value = frontmatter.value.dateCreated;
  return typeof value === "string" && value ? value : null;
});

const hasSourceDates = computed(
  () => Boolean(datePublished.value || dateCreated.value),
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
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}年${month}月${day}日`;
});
</script>

<template>
  <span
    v-if="hasSourceDates || date"
    class="page-date-info"
    :aria-label="hasSourceDates ? '報刊日期及收錄日期' : '寫作日期'"
  >
    <span v-if="hasSourceDates" class="page-source-dates">
      <span v-if="datePublished" class="page-source-date">
        <span class="page-source-date-label">報刊：</span>{{ datePublished }}
      </span>
      <span v-if="dateCreated" class="page-source-date">
        <span class="page-source-date-label">收錄：</span>{{ dateCreated }}
      </span>
    </span>
    <span v-else data-allow-mismatch="text">{{ formattedDate }}</span>
    <meta property="datePublished" :content="datePublishedRaw || date?.toISOString() || ''" />
    <meta v-if="dateCreatedRaw" property="dateCreated" :content="dateCreatedRaw" />
  </span>
</template>
