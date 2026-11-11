import { success } from "vuepress/utils";
import type { App, Plugin } from "vuepress/core";

import {
  isIndexablePage,
  pageDataExtras,
  visibleContentLength,
} from "./page-meta.js";

/**
 * 廣告投放範圍的單一來源。
 *
 * Google 發布商政策不允許在「內容不足」或沒有實質內容的頁面投放廣告；
 * AdSense 網站審核也常以「低價值內容／網站仍在建設中」退件。本站是史料
 * 檔案，部分索引頁只有一行書目、部分轉錄頁只有數十字短訊，頁面本身有
 * 保存價值，但不適合附上廣告單元。審核爬蟲若在這些頁面看到廣告，容易
 * 據此判定全站內容不足。
 *
 * 因此把「是否為空殼頁」與「可見正文是否達門檻」合併成一個建置期旗標，
 * 寫入 page.data（會序列化進頁面 chunk，SSR 與客戶端都讀得到），
 * Layout.vue 只需讀取這個旗標，不再各自重寫判斷。
 *
 * 門檻刻意保守：只排除明顯過短的頁面，不要求史料轉錄補字或加入編者評論
 * （見 content-guard.ts 的編輯原則）。帳號通過審核後可調低或移除本外掛。
 */

/** 投放廣告所需的最小可見正文字數（與 content-guard.ts 同一計算口徑） */
export const MIN_AD_CONTENT_CHARS = 150;

export const adEligibilityPlugin = (): Plugin => ({
  name: "ad-eligibility",

  // 必須排在 pageIndexPlugin 之後：/browse.html 是在 onInitialized 動態建立，
  // 這裡要看到完整頁面清單才能逐頁標記。
  onInitialized(app: App): void {
    let eligible = 0;

    for (const page of app.pages) {
      const allowed =
        isIndexablePage(page) &&
        page.frontmatter.index !== false &&
        visibleContentLength(page.content) >= MIN_AD_CONTENT_CHARS;

      pageDataExtras(page.data).adEligible = allowed;
      if (allowed) eligible += 1;
    }

    success(
      `廣告投放範圍：${eligible}/${app.pages.length} 頁（可見正文 ≥ ${MIN_AD_CONTENT_CHARS} 字且非 404／空殼／導覽頁）`,
    );
  },
});
