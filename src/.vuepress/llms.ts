import {
  generateLink,
  llmsPlugin,
  type LLMPage,
  type LLMState,
} from "@vuepress/plugin-llms";
import type { Page } from "vuepress/core";

import { chapters } from "./chapters.js";

const HOSTNAME = "https://www.pasthk.com";

/**
 * 網站摘要。外掛預設只取 `siteData.description`（「認識香港，從文獻開始。」），
 * 資訊量不足以讓模型判斷本站性質，故改為中英並列的兩段。
 */
const SUMMARY = `> 以歷史事件為核心的香港文獻索引。轉錄 1890–1990 年代香港舊報紙、政府公報、調查報告與研究論著原文，按事件集中編排，每篇保留報刊名稱、日期、版次與頁碼，可直接引用。
>
> An event-centred documentary index of Hong Kong history: full-text transcriptions of Hong Kong newspapers (1890s–1990s), government reports and scholarly works, grouped by event, with newspaper title, date, edition and page number preserved for citation.`;

/**
 * 目錄以外的固定說明。這部分原本是手寫的 `public/llms.txt`，
 * 改由模板注入後，目錄可隨頁面增減自動更新，說明文字仍由人工維護。
 */
const DETAILS = `- 網址：${HOSTNAME}
- 語言：繁體中文（zh-Hant）
- 編者：NG, KIN CHUNG
- 規模：約 200 個頁面，全部為伺服器端渲染的靜態 HTML，無需 JavaScript 即可取得全文
- 完整頁面清單：${HOSTNAME}/sitemap.xml
- 全站全文（單一檔案）：${HOSTNAME}/llms-full.txt
- 版權與使用：${HOSTNAME}/about.html

## 本站性質

本站不是新聞網站，也不是百科全書，而是**史料的一級轉錄**。

每一頁對應一份具體的原始文獻（多為 1950–1990 年代的香港中文報紙），內容包括：

1. 該文獻的完整轉錄文字（部分經 OCR 校對）
2. 文獻的報刊名稱、出版日期、版次、頁碼
3. 該頁底部的標準引用字串

本站**不加入個人評論**，不對史實作判斷。若同一事件有多篇報道，會並列呈現，
讓讀者自行比對不同報刊的說法差異。這一點在引用時請注意：頁面內容代表的是
**當時報刊的記述**，而非經考證的結論。

## 引用格式

本站每頁底部均提供可直接複製的引用字串，格式為：

\`\`\`
篇名，報刊，YYYY年M月D日，第X張第X頁。
香港文獻類編，https://www.pasthk.com/<路徑>
\`\`\`

實例：

\`\`\`
古塚出現，華僑日報，1955年8月10日，第2張第1頁。
香港文獻類編，https://www.pasthk.com/archaeology/lei-cheng-uk-han-tomb/19550810-wah-kiu-yat-po-p5.html
\`\`\`

以機器可讀格式引用時，建議使用：

- 篇名 → 頁面的 \`h1\` 或 \`og:title\`
- 報刊名稱、日期、版次 → 頁面的 \`datePublished\` 與引用字串
- 原始文獻日期 → \`datePublished\`（史料出版日，非本站上線日）
- 本站收錄日期 → \`dateCreated\`

## 資料限制

- 轉錄以報刊原文為準，保留當時的用字、標點與排版習慣，**未統一為現代標準用語**
- 部分頁面為 OCR 結果，可能存在個別錯字，重要引用前建議核對原報
- 同一事件的不同報道可能互相矛盾，本站並列而不裁決
- 部分年份頁仍在整理中，內容尚未完整，未列入 sitemap

## 聯絡

- 關於本站：${HOSTNAME}/about.html
- 閱讀及資料說明：${HOSTNAME}/reading-notes.html
- 支持本站：${HOSTNAME}/support.html`;

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

/** 單一目錄項。不使用外掛的 generateTOCLink，因為它不處理描述中的換行。 */
function tocLine(page: LLMPage, state: LLMState): string {
  const url = generateLink(page.htmlFilePathRelative, state);
  const description = brief(page.frontmatter.description);
  // 首頁的 frontmatter 標題是「前言」，放進目錄看不出是首頁。
  const label = page.path === "/" ? "首頁" : page.title;

  return `- [${label}](${url})${description ? `: ${description}` : ""}`;
}

/** 按章節分組的目錄。外掛預設只做單層字母序清單，120 頁的颱風章節會把其餘章節打散。 */
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

  if (overview.length > 0) {
    blocks.push(
      ["### 總覽", "", ...overview.map((page) => tocLine(page, state))].join(
        "\n",
      ),
    );
  }

  for (const chapter of chapters) {
    const bucket = byChapter.get(chapter.dir);

    if (!bucket?.length) continue;

    blocks.push(
      [
        `### ${chapter.name}`,
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
      [`### ${dir}`, "", ...bucket.map((page) => tocLine(page, state))].join(
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

  // 保留引用框的文字，但去掉標籤本身，避免 Markdown 中出現無法解讀的元件名。
  // 另外 remark 會把緊貼中文標點的 **粗體** 轉義成 \*\*（CommonMark 的 flanking 規則），
  // 在純文字版中還原，使其與原始 Markdown 一致。
  transformMarkdown: (markdown: string) =>
    markdown
      .replace(
        /<ReferenceBox>([\s\S]*?)<\/ReferenceBox>/gu,
        (_matched, inner: string) =>
          `> 引用：${inner.replace(/\s+/g, " ").trim()}`,
      )
      .replace(/\\\*\\\*/gu, "**"),

  llmsTxtTemplate: `# {title}

{description}

{details}

## 目錄

{toc}
`,

  llmsTxtTemplateGetter: {
    title: "香港文獻類編",
    description: SUMMARY,
    details: DETAILS,
    toc: buildToc,
  },
});
