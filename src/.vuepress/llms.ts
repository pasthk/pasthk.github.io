import {
  generateLink,
  llmsPlugin,
  type LLMPage,
  type LLMState,
} from "@vuepress/plugin-llms";
import type { Page } from "vuepress/core";

import { chapters } from "./chapters.js";
import { volumesFor } from "./llms-volumes.js";
import {
  canonicalUrl,
  citationOf,
  publishedDate,
} from "./page-meta.js";
import { describeSite, siteStats, type StatsInput } from "./site-stats.js";
import { HOSTNAME, SITE_NAME } from "./site.js";

/**
 * 網站摘要。外掛預設只取 `siteData.description`（「認識香港，從文獻開始。」），
 * 資訊量不足以讓模型判斷本站性質，故改為中英並列的兩段。
 */
const SUMMARY = `> 以歷史事件為核心的香港文獻索引。轉錄十九世紀後期至二十世紀的香港舊報紙、政府公報、調查報告與研究論著原文，按事件集中編排，每篇保留報刊名稱、日期、版次與頁碼，可直接引用。
>
> An event-centred documentary index of Hong Kong history: full-text transcriptions of Hong Kong newspapers (late 19th to 20th century), government reports and scholarly works, grouped by event, with newspaper title, date, edition and page number preserved for citation.`;

/**
 * llms.txt v2 的 `## Optional`：次要、可在短脈絡下略過的檔案。
 * 目錄本身仍指向各頁的 `.md` 純文字鏡像，這是提案建議的 LLM-friendly 連結。
 * 分冊清單由 llms-volumes.ts 與切檔邏輯共用，檔名不會對不起來。
 */
function buildOptional(pages: LLMPage[]): string {
  const volumes = volumesFor(pages.map((page) => page.path));

  return [
    "## Optional",
    "",
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

/**
 * 目錄以外的固定說明。這部分原本是手寫的 `public/llms.txt`，
 * 改由模板注入後，目錄可隨頁面增減自動更新，說明文字仍由人工維護。
 *
 * 頁面數由 pages.length 帶入，不再寫死「約 200 個頁面」——那是網站只有
 * 兩百頁時留下的數字，現在目錄已有 260 餘頁，且仍會持續增加。
 *
 * 小節一律用粗體段落而非 `##`：依 llmstxt.org v2，第一個 H2 之後的內容
 * 會被當成「檔案清單」解析，說明文字若佔用 H2 會產生沒有連結的空清單。
 */
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

/**
 * 目錄摘要取第一個短句並限長。description 在 YAML 中可能是多行摺疊值，
 * 不壓平會把清單項目撐成段落；不截短則目錄會被描述淹沒。
 */
function brief(description: unknown): string {
  if (typeof description !== "string") return "";

  const [clause] = description.replace(/\s+/g, " ").trim().split(/[，。；：]/);
  const text = clause?.trim() ?? "";

  return text.length > 48 ? `${text.slice(0, 47)}…` : text;
}

/**
 * 純文字版的來源區塊。
 *
 * 外掛只為每份 .md 寫入 `url`（指向 .md 自身）與 `description`，
 * 模型讀完 llms.txt 後拿不到原始報刊、出版日與可引用的正式網址；
 * 而 GEO 實證中最能提升被引用率的正是「可驗證的出處」。
 * 這裡把出處放到全文最前面，並區分史料頁與本站整理的索引頁，
 * 避免替索引頁編造不存在的原始文獻日期。
 */
function provenance(markdown: string, page: Page): string {
  const citation = citationOf(markdown);
  const url = canonicalUrl(page);
  const published = publishedDate(page);

  const clean = markdown
    .replace(
      /<ReferenceBox>([\s\S]*?)<\/ReferenceBox>/gu,
      (_matched, inner: string) =>
        `> 引用：${inner.replace(/\s+/g, " ").trim()}`,
    )
    .replace(/\\\*\\\*/gu, "**");

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

  return `${lines.join("\n")}\n\n${clean}`;
}

/** 單一目錄項。不使用外掛的 generateTOCLink，因為它不處理描述中的換行。 */
function tocLine(page: LLMPage, state: LLMState): string {
  const url = generateLink(page.htmlFilePathRelative, state);
  const description = brief(page.frontmatter.description);
  // 首頁的 frontmatter 標題是「前言」，放進目錄看不出是首頁。
  const label = page.path === "/" ? "首頁" : page.title;

  return `- [${label}](${url})${description ? `: ${description}` : ""}`;
}

/**
 * 按章節分組的目錄。外掛預設只做單層字母序清單，120 頁的颱風章節會把其餘章節打散。
 * 每個章節用一個 H2：llmstxt.org v2 以 H2 作為「檔案清單」分節，H3 會被解析器略過。
 */
function buildToc(pages: LLMPage[], state: LLMState): string {
  const overview: LLMPage[] = [];
  const byChapter = new Map<string, LLMPage[]>();

  for (const page of pages) {
    const segments = page.path.split("/").filter(Boolean);

    // 根目錄頁面（首頁、關於本站、閱讀說明、支持本站）沒有章節歸屬。
    if (segments.length < 2) {
      overview.push(page);
      continue;
    }

    const [dir] = segments;
    const bucket = byChapter.get(dir) ?? [];

    bucket.push(page);
    byChapter.set(dir, bucket);
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
  // 連結一律帶上網域，模型在沒有 base 上下文的情況下也能直接取用。
  domain: HOSTNAME,

  // 空殼頁（只有標題、無正文）已設 sitemap: false 與 noindex，不應出現在給模型的索引裡。
  filter: (page: Page) => page.frontmatter.sitemap !== false,

  // 預設 true 會把 <ReferenceBox> 整個刪掉，而引用字串正是本站最需要被引用的內容。
  stripHTML: false,

  // 保留引用框的文字、還原被 remark 轉義的 \*\*，並在最前面補上來源區塊。
  // 第二個參數是頁面物件，用來判斷是否為史料頁並取得規範網址。
  transformMarkdown: provenance,

  // v2：H1 → 摘要引言 → 無標題的說明 → H2 檔案清單 → ## Optional。
  // 說明區不可用 H2，否則會被當成沒有連結的空清單。
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
