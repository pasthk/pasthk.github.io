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
  position: relative;
  width: min(100%, 980px);
  box-sizing: border-box;
  padding-top: 1.1rem;
  margin: 0 auto 1.25rem;
}

.ad-top {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 1;
  box-sizing: border-box;
  overflow: hidden;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.ad-top-wrap::before {
  content: "廣告";
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
  color: #000;
  font-size: 5pt;
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
