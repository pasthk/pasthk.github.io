// 手動預覽 OG 卡片：node src/.vuepress/og/preview.mjs
// 輸出樣本 SVG 到專案內臨時目錄，直接用瀏覽器打開即可檢視，不參與建置。
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildCardSvg } from "./card.ts";
// 這裡用 .ts 指定子而非 .js：本檔不經 Vite，Node 的型別剝除只認實際存在的檔名。
import { HOST, SITE_NAME } from "../site.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "../../../.workbuddy-ai/tmp/og-preview");

const samples = {
  "clipping.svg": {
    title: "古塚出現",
    meta: "華僑日報 · 1955年8月10日 · 第2張第1頁",
    section: "香港考古",
  },
  "event.svg": {
    title: "李鄭屋漢墓",
    meta: "收錄 13 篇文獻",
    section: "香港考古",
  },
  "long-title.svg": {
    title: "林村、泰亨、粉嶺圍三鄉太平清醮",
    meta: "1990年12月 · 十年一屆建醮",
    section: "傳統節慶與打醮",
  },
  "home.svg": {
    title: "香港文獻類編",
    meta: "1890–1990 年代香港舊報紙與歷史文獻索引",
    header: "Hong Kong Documents",
  },
};

mkdirSync(outDir, { recursive: true });

for (const [name, content] of Object.entries(samples)) {
  const svg = buildCardSvg({ header: SITE_NAME, footer: HOST, ...content });

  writeFileSync(join(outDir, name), svg, "utf8");
  console.log(join(outDir, name), svg.length, "bytes");
}
