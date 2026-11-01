<script setup>
import { computed } from "vue";
import { useData } from "vuepress-theme-hope/client";
import { RouteLink, useRoute } from "vuepress/client";

defineOptions({ inheritAttrs: false });

const route = useRoute();
// 與主題一致的開關：頁面 frontmatter > 主題設定 > 預設開啟
const { frontmatter, themeLocale } = useData();

// 路徑由 breadcrumbPlugin 在建置時算好並寫入路由的 meta（見 breadcrumb.ts），
// 這裡只負責呈現；換頁時 route.meta 會隨路由更新。
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
