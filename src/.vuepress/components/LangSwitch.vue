<template>
  <!-- 掛到頁名區（.vp-page-title），由 CSS 與 h1 排成同一行的左右兩端。
       defer 讓目標在掛載後才解析，不必依賴本元件與頁名誰先渲染；
       SSR 不輸出，靜態頁裡不會留下半截節點。
       不掛進 h1：Teleport 插入時會把標題的文字節點一併清掉。 -->
  <Teleport to=".vp-page-title" defer>
    <button
      type="button"
      class="pf-langswitch"
      :title="hint"
      :aria-label="hint"
      @click="toggle"
    >
      {{ label }}
    </button>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";

/* 單頁雙語切換。
   正文的兩種語言各自成塊（Markdown 的 `:::: lang zh`／`:::: lang en`），
   兩份都在輸出裡，這裡只切換 <html data-pf-lang>，由 CSS 決定顯示哪一份：
   不必重繪頁面，伺服器端渲染的正文也照樣完整。
   刻意不改 <html lang>：瀏覽器按元素語言挑 serif 的實際字體，改了連導覽列、
   側邊欄的中文也會跟著換；語言只由正文容器的 lang 屬性決定（見 index.scss）。
   選擇記在 localStorage；帶 ?lang=en（或 ?lang=zh）進來時以網址為準。 */
const STORAGE_KEY = "pf-lang";

const LANG_ATTRIBUTE = "data-pf-lang";

const lang = ref("zh");

const label = computed(() => (lang.value === "en" ? "中文" : "EN"));

const hint = computed(() =>
  lang.value === "en" ? "切換至中文" : "Switch to English",
);

const apply = (value) => {
  lang.value = value;

  document.documentElement.setAttribute(LANG_ATTRIBUTE, value);

  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* 私密模式或停用儲存：切換照樣有效，只是記不住 */
  }
};

const toggle = () => apply(lang.value === "en" ? "zh" : "en");

onMounted(() => {
  const root = document.documentElement;

  const query = new URLSearchParams(window.location.search).get("lang");
  let saved = null;

  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }

  /* 頁首的內嵌腳本已先切過一次（避免重新載入時閃出另一種語言），
     這裡把它當成第三順位，讓按鈕的初始狀態與畫面一致 */
  const value =
    query === "en" || query === "zh"
      ? query
      : saved === "en" || saved === "zh"
        ? saved
        : root.getAttribute(LANG_ATTRIBUTE);

  if (value === "en" || value === "zh") apply(value);
});

onUnmounted(() => {
  /* 只清掉本頁的語言標記；<html lang> 從頭到尾沒動過，不必還原 */
  document.documentElement.removeAttribute(LANG_ATTRIBUTE);
});
</script>
