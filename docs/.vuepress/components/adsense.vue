<template>
  <div class="ads">
    <ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-8975507583219124"
     data-ad-slot="9491336810"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
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