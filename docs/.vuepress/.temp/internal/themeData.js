export const themeData = JSON.parse("{\"encrypt\":{},\"darkmode\":\"disable\",\"locales\":{\"/\":{\"lang\":\"zh-TW\",\"navbarLocales\":{\"langName\":\"繁體中文\",\"selectLangAriaLabel\":\"選擇語言\"},\"metaLocales\":{\"author\":\"作者\",\"date\":\"寫作日期\",\"origin\":\"原創\",\"views\":\"訪問量\",\"category\":\"分類\",\"tag\":\"標籤\",\"readingTime\":\"閱讀時間\",\"words\":\"字數\",\"toc\":\"此頁內容\",\"prev\":\"上一頁\",\"next\":\"下一頁\",\"lastUpdated\":\"上次編輯於\",\"contributors\":\"貢獻者\",\"editLink\":\"Edit this page on GitHub\"},\"outlookLocales\":{\"themeColor\":\"主題色\",\"darkmode\":\"主題模式\",\"fullscreen\":\"全屏\"},\"encryptLocales\":{\"iconLabel\":\"頁面已加密\",\"placeholder\":\"輸入密碼\",\"remember\":\"記憶密碼\",\"errorHint\":\"請輸入正確密碼\"},\"routeLocales\":{\"skipToContent\":\"跳至主要內容\",\"notFoundMsg\":[\"這裡什麼也沒有\",\"我們是怎麼來到這兒的？\",\"這 是 四 零 四 !\",\"看起来你訪問了一個失效的鏈結\"],\"back\":\"返回上一頁\",\"home\":\"帶我回家\",\"openInNewWindow\":\"Open in new window\"},\"author\":{\"name\":\"NG, Kin-chung\",\"url\":\"https://pasthk.github.io\"},\"logo\":\"/logo.svg\",\"navbar\":[\"/\",{\"text\":\"Demo\",\"icon\":\"discover\",\"link\":\"/demo/\"},{\"text\":\"Guide\",\"icon\":\"creative\",\"prefix\":\"/guide/\",\"children\":[{\"text\":\"Bar\",\"icon\":\"creative\",\"prefix\":\"bar/\",\"children\":[\"baz\",{\"text\":\"...\",\"icon\":\"more\",\"link\":\"\"}]},{\"text\":\"Foo\",\"icon\":\"config\",\"prefix\":\"foo/\",\"children\":[\"ray\",{\"text\":\"...\",\"icon\":\"more\",\"link\":\"\"}]}]},{\"text\":\"V2 Docs\",\"icon\":\"note\",\"link\":\"https://theme-hope.vuejs.press/\"}],\"sidebar\":{\"/\":[\"\",{\"icon\":\"discover\",\"text\":\"Demo\",\"prefix\":\"demo/\",\"link\":\"demo/\",\"children\":\"structure\"},{\"text\":\"Docs\",\"icon\":\"note\",\"prefix\":\"guide/\",\"children\":\"structure\"},\"slides\"]},\"footer\":\"香港歷史研究資料集\",\"displayFooter\":true}}}")

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updateThemeData) {
    __VUE_HMR_RUNTIME__.updateThemeData(themeData)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ themeData }) => {
    __VUE_HMR_RUNTIME__.updateThemeData(themeData)
  })
}
