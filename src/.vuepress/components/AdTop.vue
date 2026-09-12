<template>
  <div class="ad-top">
    <ins
      class="adsbygoogle"
      style="display:block; width:100%; max-width:100%;"
      data-ad-client="ca-pub-5478065514436039"
      data-ad-slot="1832821331"
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  </div>
</template>

<script setup>
import { onMounted } from "vue";

onMounted(() => {
  if (typeof window === "undefined") return;

  if (!document.querySelector('script[src*="googlesyndication.com/pagead/js/adsbygoogle.js"]')) {
    const script = document.createElement("script");
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }

  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.push({});
});
</script>

<style scoped>
.ad-top {
  margin: 1rem 0 1.5rem;
  text-align: center;
  width: 100%;
}

.adsbygoogle {
  display: block;
  width: 100%;
  min-height: 90px;
}
</style>
