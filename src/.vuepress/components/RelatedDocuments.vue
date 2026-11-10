<script setup>
import { computed } from "vue";
import { RouteLink, usePageData } from "vuepress/client";

/**
 * 由 related-documents.ts 在 onInitialized 寫入 page.data.related。
 * 放在 Layout 的 contentAfter，因此 SSR 產出的靜態 HTML 就含有這些 <a>：
 * 爬蟲不必執行 JavaScript 也能沿同一主題找到其他史料。
 */
const page = usePageData();
const items = computed(() => page.value.related?.items ?? []);
</script>

<template>
  <nav v-if="items.length" class="related-docs" aria-labelledby="related-docs-title">
    <h2 id="related-docs-title">相關文獻</h2>
    <p class="related-docs-note">
      同一主題優先，並補入同章節年代相近者；以下為本站導覽連結，不屬原文內容。
    </p>
    <ul>
      <li v-for="item in items" :key="item.path">
        <RouteLink :to="item.path">{{ item.title }}</RouteLink>
        <span v-if="item.date" class="related-docs-date">{{ item.date }}</span>
      </li>
    </ul>
  </nav>
</template>

<style>
.related-docs {
  margin: 2rem 0 1rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--vp-c-border);
}

.related-docs h2 {
  margin: 0 0 0.35rem;
  padding: 0;
  border: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.related-docs-note {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--vp-c-text-mute);
}

.related-docs ul {
  margin: 0;
  padding-left: 1.25rem;
  list-style: disc;
}

.related-docs li {
  margin: 0.3rem 0;
  line-height: 1.7;
}

.related-docs-date {
  margin-left: 0.5rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-mute);
  white-space: nowrap;
}
</style>
