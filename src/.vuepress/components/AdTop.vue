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
let adsenseScriptPromise;
let adsenseStylesheetPromise;

function loadAdsenseStylesheet() {
  if (!adsenseStylesheetPromise) {
    adsenseStylesheetPromise = new Promise((resolve, reject) => {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "/ads.css";
      stylesheet.onload = () => resolve();
      stylesheet.onerror = () => {
        stylesheet.remove();
        adsenseStylesheetPromise = undefined;
        reject(new Error("Failed to load the AdSense stylesheet."));
      };
      document.head.append(stylesheet);
    });
  }

  return adsenseStylesheetPromise;
}

function loadAdsenseScript() {
  if (!adsenseScriptPromise) {
    adsenseScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8975507583219124";
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        adsenseScriptPromise = undefined;
        reject(new Error("Failed to load the Google AdSense script."));
      };
      document.head.append(script);
    });
  }

  return adsenseScriptPromise;
}
</script>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const adElement = ref();
let observer;

function requestAd() {
  void Promise.all([loadAdsenseStylesheet(), loadAdsenseScript()])
    .then(() => {
      const element = adElement.value;
      if (!element || element.dataset.adsbygoogleStatus) return;

      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    })
    .catch((error) => {
      console.error(error);
    });
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
