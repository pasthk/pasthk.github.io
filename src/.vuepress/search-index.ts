import { writeFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import type { App, Plugin } from "vuepress/core";
import { success, warn } from "vuepress/utils";

import { readOptional } from "./map-utils.js";

/**
 * 把搜尋索引從 worker 檔裡拆出來。
 *
 * slimsearch 產生 worker 時，會把整個索引先 deflate、再 base64，然後當成
 * 一個 JavaScript 字串常值內嵌進 slimsearch.worker.js：
 *
 *   rt=re(F(JSON.parse("{\"/\":\"eJy...\"}")).map(([e,t])=>[e,Qe(JSON.parse(P(t)),$e)]));
 *
 * 這個做法有兩個代價：
 *   1. base64 讓負載膨脹 33%（實測 deflate 後 983 KB → 內嵌字串 1,310 KB），
 *      而 base64 內容接近隨機，gzip 幾乎壓不動，最終仍要送出約 1.0 MB；
 *   2. 瀏覽器得先解析 1.3 MB 的 JS 字串，再由 worker 逐位元組解 base64、
 *      跑一次 inflate，全部卡在 worker 啟動時，也就是第一次搜尋之前。
 *
 * 這裡改為：索引寫成獨立的 JSON 檔（3.6 MB 原文），worker 用同步 XHR 取回後
 * 直接交給原本的還原函式。傳輸交給 HTTP 壓縮（GitHub Pages 的 gzip 實測
 * 930 KB），省掉 base64 的 33%、整段 inflate 與 1.3 MB 的 JS 字串解析，
 * worker 檔也從 1.3 MB 降到約 21 KB。
 *
 * 為何用同步 XHR：worker 啟動時就必須拿到索引才能回應查詢；改成非同步就得
 * 連訊息處理器一起改寫，對 minified 程式碼做那種字串手術風險太高。同步 XHR
 * 在 worker 內是規格允許的（只有主執行緒被廢棄），且它只阻塞這個專用 worker，
 * 不影響頁面。請求失敗時回傳空物件，查詢得到零結果，而不是永遠卡在載入中。
 *
 * worker 檔是外掛預先編譯好的固定樣板（dist/worker/build.js），只有外掛版本
 * 升級才會變動；下方以「定位字串 + 捕獲識別名」改寫，不硬編 minify 後的變數
 * 名，找不到樣式或改寫後語法不合法時只警告、不改寫。
 */

const WORKER_FILE = "slimsearch.worker.js";
const INDEX_FILE = "slimsearch.index.json";

const PARSE_CALL = "JSON.parse(";
const PAYLOAD_ANCHOR = `${PARSE_CALL}"`;
/** 緊接在 JSON 字串常值結尾之後：`"` `)` `)` `.map(([` */
const MAP_ANCHOR = '"' + ")" + ")" + ".map(([";

/** `…,rt=re(F(` —— 捕獲 rt、re、F 三個識別名 */
const LOADER_HEAD = /([\w$]+)=([\w$]+)\(([\w$]+)\($/u;

/** `")).map(([e,t])=>[e,Qe(JSON.parse(P(t)),$e)]);` —— 捕獲 e、t、Qe、P、$e */
const LOADER_TAIL =
  /^"\)\)\.map\(\(\[([\w$]+),([\w$]+)\]\)=>\[\1,([\w$]+)\(JSON\.parse\(([\w$]+)\(\2\)\),([\w$]+)\)\]\)\);/u;

interface Payload {
  readonly literal: string;
  /** `rt=…` 整個述句的起點 */
  readonly start: number;
  readonly end: number;
  readonly head: RegExpExecArray;
  readonly tail: RegExpExecArray;
}

const locatePayload = (source: string): Payload | undefined => {
  const anchor = source.indexOf(PAYLOAD_ANCHOR);

  if (anchor < 0) return undefined;

  /* 只接受唯一一處，避免誤改其他 JSON.parse 呼叫 */
  if (source.indexOf(PAYLOAD_ANCHOR, anchor + 1) >= 0) return undefined;

  const literalStart = anchor + PARSE_CALL.length;
  const mapIndex = source.indexOf(MAP_ANCHOR, literalStart);

  if (mapIndex < 0) return undefined;

  const windowStart = Math.max(0, anchor - 200);
  const head = LOADER_HEAD.exec(source.slice(windowStart, anchor));

  if (!head) return undefined;

  const tail = LOADER_TAIL.exec(source.slice(mapIndex));

  if (!tail) return undefined;

  return {
    /* 含首尾引號，可直接 JSON.parse */
    literal: source.slice(literalStart, mapIndex + 1),
    start: windowStart + head.index,
    end: mapIndex + tail[0].length,
    head,
    tail,
  };
};

/**
 * 內嵌負載在 worker 裡是 `JSON.parse("<跳脫後的 JSON 文字>")`，
 * 外層是 JS 字串常值、內容才是 JSON，因此要解兩層。
 * 解壓後直接串接各 locale 的 JSON 原文，不重新序列化，
 * 輸出與原索引逐位元組一致。
 */
const payloadToJson = (payload: Payload): string => {
  const text = JSON.parse(payload.literal) as string;
  const encoded = JSON.parse(text) as Record<string, string>;

  const entries = Object.entries(encoded).map(([locale, base64]) => {
    const json = inflateSync(Buffer.from(base64, "base64")).toString("utf8");

    return `${JSON.stringify(locale)}:${json}`;
  });

  return `{${entries.join(",")}}`;
};

const buildLoader = (payload: Payload, url: string): string => {
  /* head: 1=rt, 2=re, 3=F；tail: 1=e, 2=t, 3=Qe, 4=P, 5=$e */
  const [, index, store, entries] = payload.head;
  const [, left, right, deserialize, , fieldConfig] = payload.tail;

  const request =
    `(()=>{try{const x=new XMLHttpRequest();` +
    `x.open("GET",${JSON.stringify(url)},false);x.send();` +
    `if(x.status>=400)throw 0;return JSON.parse(x.responseText)` +
    `}catch(e){return{}}})()`;

  return (
    `${index}=${store}(${entries}(${request})` +
    `.map(([${left},${right}])=>[${left},${deserialize}(${right},${fieldConfig})]));`
  );
};

async function splitSearchIndex(app: App): Promise<void> {
  const workerPath = app.dir.dest(WORKER_FILE);
  const source = await readOptional(workerPath);

  /* 沒有 worker（例如外掛未產生）時無事可做 */
  if (source === undefined) return;

  const payload = locatePayload(source);

  if (!payload) {
    /* 沒有內嵌負載：要嘛已改寫過，要嘛外掛樣板變了 */
    if (source.includes(INDEX_FILE)) return;

    warn(
      `找不到 ${WORKER_FILE} 的內嵌索引樣式，未拆分索引。` +
        `請更新 search-index.ts 的定位字串（外掛版本可能已升級）。`,
    );

    return;
  }

  const loader = buildLoader(payload, `${app.options.base}${INDEX_FILE}`);
  const next =
    source.slice(0, payload.start) + loader + source.slice(payload.end);

  /* 改寫是字串手術，先確認結果仍可解析，避免產出壞掉的 worker */
  try {
    new Function(next);
  } catch (error) {
    warn(
      `${WORKER_FILE} 改寫後無法通過語法檢查，已放棄拆分：${(error as Error).message}`,
    );

    return;
  }

  await Promise.all([
    writeFile(app.dir.dest(INDEX_FILE), payloadToJson(payload), "utf8"),
    writeFile(workerPath, next, "utf8"),
  ]);

  success(
    `已將搜尋索引拆出為 ${INDEX_FILE}（worker ${Math.round(source.length / 1024)} KB → ` +
      `${Math.round(next.length / 1024)} KB）`,
  );
}

export const searchIndexPlugin = (): Plugin => ({
  name: "search-index-split",

  async onGenerated(app: App): Promise<void> {
    /* 開發模式用外掛自帶的 worker，沒有可拆分的產物 */
    if (!app.env.isBuild) return;

    await splitSearchIndex(app);
  },
});
