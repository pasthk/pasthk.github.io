<script setup>
import { onBeforeUnmount, onMounted } from "vue";

let viewport;

const updateViewportSize = () => {
  if (!viewport) return;

  document.documentElement.style.setProperty(
    "--pasthk-search-viewport-height",
    `${viewport.height}px`,
  );
  document.documentElement.style.setProperty(
    "--pasthk-search-viewport-top",
    `${viewport.offsetTop}px`,
  );
};

onMounted(() => {
  viewport = window.visualViewport;
  if (!viewport) return;

  updateViewportSize();
  viewport.addEventListener("resize", updateViewportSize);
  viewport.addEventListener("scroll", updateViewportSize);
});

onBeforeUnmount(() => {
  if (!viewport) return;

  viewport.removeEventListener("resize", updateViewportSize);
  viewport.removeEventListener("scroll", updateViewportSize);
});
</script>

<template></template>
