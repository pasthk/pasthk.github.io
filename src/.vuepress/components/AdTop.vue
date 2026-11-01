<template>
  <div class="ad-top-wrap">
    <div class="ad-top">
      <ins
        ref="adElement"
        class="adsbygoogle"
        style="display:block;"
        data-ad-client="ca-pub-8975507583219124"
        data-ad-slot="4112129657"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  </div>
</template>

<script>
const ADSENSE_CLIENT = "ca-pub-8975507583219124";

// 跨頁共用：同一份資源只載入一次；失敗時清掉快取，讓下次掛載可以重試。
const pending = new Map();

function loadOnce(key, createElement) {
  if (!pending.has(key)) {
    pending.set(
      key,
      new Promise((resolve, reject) => {
        const element = createElement();

        element.addEventListener("load", () => resolve());
        element.addEventListener("error", () => {
          element.remove();
          pending.delete(key);
          reject(new Error(`Failed to load ${key}`));
        });
        document.head.append(element);
      }),
    );
  }

  return pending.get(key);
}

const loadAdsense = () =>
  Promise.all([
    loadOnce("/ads.css", () =>
      Object.assign(document.createElement("link"), {
        rel: "stylesheet",
        href: "/ads.css",
      }),
    ),
    loadOnce("adsbygoogle", () =>
      Object.assign(document.createElement("script"), {
        async: true,
        crossOrigin: "anonymous",
        src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`,
      }),
    ),
  ]);
</script>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const adElement = ref();
let observer;

async function requestAd() {
  try {
    await loadAdsense();

    const element = adElement.value;
    if (!element || element.dataset.adsbygoogleStatus) return;

    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({});
  } catch (error) {
    console.error(error);
  }
}

onMounted(() => {
  const element = adElement.value;
  if (!element || element.dataset.adsbygoogleStatus) return;

  if (!("IntersectionObserver" in window)) {
    requestAd();
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        requestAd();
      }
    },
    { rootMargin: "400px 0px" },
  );
  observer.observe(element);
});

onBeforeUnmount(() => observer?.disconnect());
</script>
