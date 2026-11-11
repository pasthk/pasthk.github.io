<script setup>
import { computed } from "vue";
import { useData } from "vuepress-theme-hope/client";
import { RouteLink, useRoute } from "vuepress/client";

defineOptions({ inheritAttrs: false });

const route = useRoute();
const { frontmatter, themeLocale } = useData();

const trail = computed(() => {
  const enabled =
    frontmatter.value.breadcrumb ?? themeLocale.value.breadcrumb ?? true;
  if (!enabled) return [];

  const items = route.meta?.breadcrumbTrail;
  return Array.isArray(items) ? items : [];
});
</script>

<template>
  <nav
    class="vp-breadcrumb"
    :class="{ disable: !trail.length }"
    aria-label="路徑導航"
  >
    <ol v-if="trail.length">
      <li v-for="(item, index) in trail" :key="index">
        <RouteLink v-if="item.link" :to="item.link">{{ item.text }}</RouteLink>
        <span v-else>{{ item.text }}</span>
      </li>
    </ol>
  </nav>
</template>
