import {
  generateLink,
  llmsPlugin,
  type LLMPage,
  type LLMState,
} from "@vuepress/plugin-llms";
import type { Page } from "vuepress/core";

import { chapters, pathSegments } from "./chapters.js";
import { volumesFor } from "./llms-volumes.js";
import { pushTo } from "./map-utils.js";
import {
  canonicalUrl,
  citationOf,
  isLlmsPage,
  publishedDate,
  replaceReferenceBoxes,
} from "./page-meta.js";
import { relatedMarkdown } from "./related-documents.js";
import { describeSite, siteStats, type StatsInput } from "./site-stats.js";
import { HOSTNAME, SITE_NAME } from "./site.js";

const SUMMARY = `> 以歷史事件為核心的香港文獻索引。轉錄十九世紀後期至二十世紀的香港舊報紙、政府公報、調查報告與研究論著原文，按事件集中編排，每篇保留報刊名稱、日期、版次與頁碼，可直接引用。
>
> An event-centred documentary index of Hong Kong history: full-text transcriptions of Hong Kong newspapers (late 19th to 20th century), government reports and scholarly works, grouped by event, with newspaper title, date, edition and page number preserved for citation.`;

function buildOptional(pages: LLMPage[]): string {
  const volumes = volumesFor(pages.map((page) => page.path));

  return [
    "## Optional",
    "",
    `- [文獻綜覽](${HOSTNAME}/browse.html): 依原始出版日期由舊至新排列的事件時間軸，附每篇史料的出版日與資料來源（報刊／出版者名稱），同一日期合併顯示；本頁由建置期產生，沒有 .md 純文字鏡像`,
    `- [全站全文（單一檔案）](${HOSTNAME}/llms-full.txt): 全站頁面全文合併，檔案較大，適合需要整批檢索時取用`,
    `- [完整頁面清單](${HOSTNAME}/sitemap.xml): 搜尋引擎用的完整 URL 清單`,
    "",
    "依章節拆分的全站全文分冊，單檔較小，適合只取特定主題時使用：",
    "",
    ...volumes.map(
      (volume) => `- [全文分冊：${volume.label}](${HOSTNAME}/${volume.file})`,
    ),
  ].join("\n");
}

function buildDetails(pages: LLMPage[]): string {
  const stats = siteStats(pages as StatsInput[]);

  return `- 網址：${HOSTNAME}
- 語言：繁體中文（zh-Hant）
- 編者：NG, KIN CHUNG
- 內容：${describeSite(stats)}
- 呈現方式：全部為伺服器端渲染的靜態 HTML，無需 JavaScript 即可取得全文
- 版權與使用：${HOSTNAME}/about.html

**本站性質**

本站不是新聞網站，也不是百科全書，而是**史料的一級轉錄**。頁面分兩類，
每份純文字版開頭的「來源區塊」都會標明所屬類型：

1. **原始文獻轉錄頁**：一頁對應一份具體的原始文獻（多為 1890–1990 年代的香港
   中文報紙，另有政府公報、調查報告與研究論著），含完整轉錄文字（部分經 OCR
   校對）、報刊名稱、出版日期、版次／頁碼，以及底部可直接複製的標準引用字串。
   此類頁面才有 \`datePublished\`，其值為**原始文獻出版日**，不是本站上線日。
2. **本站整理頁面**：事件、年份、章節的索引與說明頁，彙編多篇文獻，
   沒有單一原始出版日，因此不輸出 \`datePublished\`，也不假裝自己是史料。
   引用史料請沿本頁連結進入對應的轉錄頁，使用該頁的引用字串。

本站**不加入個人評論**，不對史實作判斷。若同一事件有多篇報道，會並列呈現，
讓讀者自行比對不同報刊的說法差異。這一點在引用時請注意：轉錄頁內容代表的是
**當時報刊的記述**，而非經考證的結論。

**引用格式**

每個原始文獻轉錄頁底部均提供可直接複製的引用字串，格式為：

\`\`\`
篇名，報刊，YYYY年M月D日，第X張第X頁。
${SITE_NAME}，${HOSTNAME}/<路徑>
\`\`\`

實例：

\`\`\`
古塚出現，華僑日報，1955年8月10日，第2張第1頁。
${SITE_NAME}，${HOSTNAME}/archaeology/lei-cheng-uk-han-tomb/19550810-wah-kiu-yat-po-p5.html
\`\`\`

以機器可讀格式引用時，建議使用：

- 篇名 → 頁面的 \`h1\` 或 \`og:title\`
- 報刊名稱、日期、版次 → 頁面的 \`datePublished\` 與引用字串
- 原始文獻日期 → \`datePublished\`（史料出版日，非本站上線日）
- 本站收錄日期 → \`dateCreated\`

**純文字版的來源區塊**

每份 \`.md\` 純文字版（以及 \`llms-full.txt\` 的每一節）開頭都有一段來源區塊，
標明該頁是**原始文獻轉錄**還是**本站整理頁面**，並列出原始出版日、可直接複製的
引用字串與規範網址。只有史料頁才有 \`datePublished\`；索引與說明頁不會宣稱出版日。

\`.md\` 是對應 \`.html\` 的純文字鏡像。**引用時請使用「規範網址」的 .html 網址**，
不要引用 \`.md\` 檔名；HTML 頁面同樣可取得全文，且是可供人查核的正式版本。

**資料限制**

- 轉錄以報刊原文為準，保留當時的用字、標點與排版習慣，**未統一為現代標準用語**
- 部分頁面為 OCR 結果，可能存在個別錯字，重要引用前建議核對原報
- 同一事件的不同報道可能互相矛盾，本站並列而不裁決
- 部分年份頁仍在整理中，內容尚未完整，未列入 sitemap

**聯絡**

- 關於本站：${HOSTNAME}/about.html
- 閱讀及資料說明：${HOSTNAME}/reading-notes.html
- 支持本站：${HOSTNAME}/support.html`;
}

function brief(description: unknown): string {
  if (typeof description !== "string") return "";

  const [clause] = description.replace(/\s+/g, " ").trim().split(/[，。；：]/);
  const text = clause?.trim() ?? "";

  return text.length > 48 ? `${text.slice(0, 47)}…` : text;
}

function provenance(markdown: string, page: Page): string {
  const citation = citationOf(markdown);
  const url = canonicalUrl(page);
  const published = publishedDate(page);

  const clean = replaceReferenceBoxes(
    markdown,
    (inner) => `> 引用：${inner.replace(/\s+/g, " ").trim()}`,
  ).replace(/\\\*\\\*/gu, "**");

  const lines = published
    ? [
        `> **原始文獻轉錄**｜原始出版日：${published}`,
        ...(citation ? [`> 建議引用：${citation}`] : []),
        `> 規範網址（引用請用）：${url}`,
        "> 說明：本頁為史料一級轉錄，內容代表當時報刊的記述，非經考證的結論。",
      ]
    : [
        "> **本站整理頁面**：索引或說明，不是原始文獻，也沒有原始出版日。",
        `> 規範網址：${url}`,
        "> 引用史料請沿本頁所列連結取得原始文獻轉錄頁，並使用該頁的引用字串。",
      ];

  const links = relatedMarkdown(page.path);

  return `${lines.join("\n")}\n\n${clean}${links ? `\n${links}` : ""}`;
}

function tocLine(page: LLMPage, state: LLMState): string {
  const url = generateLink(page.htmlFilePathRelative, state);
  const description = brief(page.frontmatter.description);
  const label = page.path === "/" ? "首頁" : page.title;

  return `- [${label}](${url})${description ? `: ${description}` : ""}`;
}

function buildToc(pages: LLMPage[], state: LLMState): string {
  const overview: LLMPage[] = [];
  const byChapter = new Map<string, LLMPage[]>();

  for (const page of pages) {
    const segments = pathSegments(page.path);

    if (segments.length < 2) {
      overview.push(page);
      continue;
    }

    pushTo(byChapter, segments[0], page);
  }

  const blocks: string[] = [];

  blocks.push(
    [
      "## 總覽",
      "",
      ...overview.map((page) => tocLine(page, state)),
    ].join("\n"),
  );

  for (const chapter of chapters) {
    const bucket = byChapter.get(chapter.dir);

    if (!bucket?.length) continue;

    blocks.push(
      [
        `## ${chapter.name}`,
        "",
        chapter.note,
        "",
        ...bucket.map((page) => tocLine(page, state)),
      ].join("\n"),
    );
    byChapter.delete(chapter.dir);
  }

  for (const [dir, bucket] of byChapter) {
    blocks.push(
      [`## ${dir}`, "", ...bucket.map((page) => tocLine(page, state))].join(
        "\n",
      ),
    );
  }

  return blocks.join("\n\n");
}

export const llms = llmsPlugin({
  domain: HOSTNAME,

  filter: isLlmsPage,

  stripHTML: false,

  transformMarkdown: provenance,

  llmsTxtTemplate: `# {title}

{description}

{details}

{toc}

{optional}
`,

  llmsTxtTemplateGetter: {
    title: SITE_NAME,
    description: SUMMARY,
    details: buildDetails,
    toc: buildToc,
    optional: buildOptional,
  },
});
