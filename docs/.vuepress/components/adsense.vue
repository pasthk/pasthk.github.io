<template>
  <div class="ads">
    <ins class="adsbygoogle"
         style="display:block;"
         data-ad-layout="in-article"
         data-ad-format="auto"
          data-full-width-responsive="true"
         data-ad-client="ca-pub-8975507583219124"
         data-ad-slot="6653711098"></ins>
  </div>
</template>

<script>
export default {
  name: "adsense-inline",
  mounted() {
    this.adsenseAddLoad();
  },
  methods: {
    adsenseAddLoad() {
      let inlineScript = document.createElement("script");
      inlineScript.type = "text/javascript";
      inlineScript.text = '(adsbygoogle = window.adsbygoogle || []).push({});'
      document.getElementsByTagName('body')[0].appendChild(inlineScript);
    }
  }
}
</script>