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
  width: min(100%, 980px);
  margin: 0 auto 1.25rem;
  text-align: center;
}

.adsbygoogle {
  display: block;
  width: 100%;
  min-height: 90px;
}
</style>
