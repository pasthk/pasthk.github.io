<template>
  <div class="ad-top-wrap">
    <div class="ad-top">
      <ins
        ref="adElement"
        class="adsbygoogle"
        style="display:block; width:100%; max-width:100%;"
        data-ad-client="ca-pub-8975507583219124"
        data-ad-slot="4112129657"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref } from "vue";

const adElement = ref();

onMounted(async () => {
  await nextTick();

  if (adElement.value?.dataset.adsbygoogleStatus) return;

  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.push({});
});
</script>

<style scoped>
.ad-top-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
}

.ad-top {
  position: relative;
  width: min(100%, 980px);
  margin: 0 auto 1.25rem;
  text-align: center;
}

.ad-top::before {
  content: "廣告";
  position: absolute;
  top: 0.375rem;
  right: 0.5rem;
  z-index: 1;
  padding: 0.12rem 0.42rem;
  border: 1px solid rgba(68, 68, 68, 0.35);
  background: rgba(245, 244, 239, 0.9);
  color: #5a5a5a;
  font-size: 0.68rem;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: 0.08em;
  font-family: "Source Han Serif TC", "Noto Serif TC", "PingFang TC", "Microsoft JhengHei", serif;
  pointer-events: none;
}

.adsbygoogle {
  display: block;
  width: 100%;
  min-height: 90px;
}
</style>
