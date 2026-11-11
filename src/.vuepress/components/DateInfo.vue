<script setup>
import { computed } from "vue";
import { useFrontmatter } from "vuepress/client";
import { formatChineseDate, parseDateValue } from "../format.js";

defineOptions({ inheritAttrs: false });

const props = defineProps({
  date: {
    type: Date,
    default: null,
  },
});

const frontmatter = useFrontmatter();

const sourceDate = (property, label) => {
  const date = parseDateValue(frontmatter.value[property]);
  if (!date) return null;

  return {
    property,
    label,
    raw: date.text,
    text: formatChineseDate(date.text),
  };
};

const datePublished = computed(() => sourceDate("datePublished", "報刊："));
const dateCreated = computed(() => sourceDate("dateCreated", "收錄："));
const sourceDates = computed(() =>
  [datePublished.value, dateCreated.value].filter(Boolean),
);

const dateIso = computed(() => {
  if (!props.date) return "";

  const value = props.date instanceof Date ? props.date : new Date(props.date);
  if (Number.isNaN(value.getTime())) return "";

  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${value.getFullYear()}-${month}-${day}`;
});

const formattedDate = computed(() =>
  dateIso.value ? formatChineseDate(dateIso.value) : null,
);
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
      :content="datePublished?.raw || dateIso || ''"
    />
    <meta v-if="dateCreated" property="dateCreated" :content="dateCreated.raw" />
  </span>
</template>
