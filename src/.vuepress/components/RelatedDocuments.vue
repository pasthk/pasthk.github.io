<script setup>
import { computed } from "vue";
import { RouteLink, usePageData } from "vuepress/client";
import { formatChineseDate } from "../format.js";

const page = usePageData();
const related = computed(() => page.value.related);

// 編年時間軸（建置期由 related-documents 外掛產生）
const timeline = computed(() => related.value?.timeline ?? null);
const before = computed(() => timeline.value?.before ?? []);
const after = computed(() => timeline.value?.after ?? []);
const current = computed(() => timeline.value?.current ?? null);

// 舊資料後備：沒有 timeline 時維持原本的相關度清單
const items = computed(() =>
  Array.isArray(related.value?.items) ? related.value.items : [],
);
</script>

<template>
  <nav
    v-if="(timeline && current) || items.length"
    class="related-docs"
    aria-labelledby="related-docs-title"
  >
    <h2 id="related-docs-title">相關文獻</h2>

    <ol v-if="timeline && current" class="related-timeline">
      <li v-for="item in before" :key="item.path" class="related-timeline-item">
        <RouteLink :to="item.path">{{ item.title }}</RouteLink>
        <span v-if="item.date" class="related-docs-date">{{
          formatChineseDate(item.date)
        }}</span>
      </li>

      <li
        class="related-timeline-item related-timeline-item--current"
        aria-current="page"
      >
        <span class="related-timeline-title">{{ current.title }}</span>
        <span v-if="current.date" class="related-docs-date">{{
          formatChineseDate(current.date)
        }}</span>
      </li>

      <li v-for="item in after" :key="item.path" class="related-timeline-item">
        <RouteLink :to="item.path">{{ item.title }}</RouteLink>
        <span v-if="item.date" class="related-docs-date">{{
          formatChineseDate(item.date)
        }}</span>
      </li>
    </ol>

    <ul v-else>
      <li v-for="item in items" :key="item.path">
        <RouteLink :to="item.path">{{ item.title }}</RouteLink>
        <span v-if="item.date" class="related-docs-date">{{
          formatChineseDate(item.date)
        }}</span>
      </li>
    </ul>
  </nav>
</template>

<style>
.related-docs {
  margin: 2rem 0 1rem;
}

.related-docs h2 {
  margin: 0 0 0.35rem;
  padding: 0;
  border: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.related-docs ul {
  margin: 0;
  padding-left: 1.25rem;
  list-style: disc;
}

.related-docs ul li {
  margin: 0.3rem 0;
  line-height: 1.7;
}

.related-docs-date {
  margin-left: 0.5rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-mute);
  white-space: nowrap;
}

/* 編年軸：由早到晚，當前頁置中 */
.related-timeline {
  margin: 0;
  padding: 0;
  list-style: none;
  border-left: 1px solid var(--vp-c-border, #d8d8d8);
}

.related-timeline-item {
  position: relative;
  margin: 0;
  padding: 0.3rem 0 0.3rem 1.15rem;
  line-height: 1.7;
}

/* 圓點對齊標題第一行中線：上留白 + 行高一半，再以自身高度回拉 50% */
.related-timeline-item::before {
  content: "";
  position: absolute;
  top: calc(0.3rem + 0.85em);
  transform: translateY(-50%);
  left: -4px;
  width: 7px;
  height: 7px;
  box-sizing: border-box;
  border: 1px solid var(--vp-c-text-mute, #888);
  border-radius: 50%;
  background: var(--vp-c-bg, #fff);
}

.related-timeline-item--current {
  margin: 0.15rem 0;
  background: var(--vp-c-bg-alt, #f6f6f6);
  font-weight: 600;
}

/* 當前頁圓點較大，沿用同一中線；translateY(-50%) 會按自身尺寸自動置中 */
.related-timeline-item--current::before {
  left: -6px;
  width: 11px;
  height: 11px;
  border-color: var(--vp-c-text, #000);
  background: var(--vp-c-text, #000);
}

.related-timeline-title {
  font-weight: 600;
}
</style>
