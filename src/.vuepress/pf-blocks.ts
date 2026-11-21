import type MarkdownIt from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";
import type Token from "markdown-it/lib/token.mjs";
import type { Plugin } from "vuepress/core";

/**
 * Portfolio 版式的 Markdown 容器。
 *
 * 目的：讓 `team.md` 與 `team/*.md` 用 Markdown 撰寫，而輸出的 HTML 與原本手寫
 * 的 `<div class="pf-…">` 完全相同，樣式（index.scss 的 pf- 版式基元）不必改動。
 *
 * 語法一律是 `::: 名稱` 開頭、`:::` 結尾，內層寫普通 Markdown：
 *
 * ```md
 * ::: hero
 * role: 中國社會科學院研究生院歷史學碩士
 * lede: 以報刊為經、專題為緯…
 * aside: 聯繫
 * aside-text: 電郵：[pasthk@outlook.com](mailto:pasthk@outlook.com)
 * - 關注：夏商周考古
 * :::
 *
 * ::: entries
 * - **2015—2018** 中國社會科學院研究生院考古研究所
 *   *歷史哲學碩士*
 *   夏商周考古學
 * :::
 * ```
 *
 * 各容器的規則：
 *
 * - `hero`：`role:`／`name:`／`lede:`／`aside:`／`aside-text:` 五行鍵值，其餘
 *   `- 標籤：內容` 為事實列。有 `aside-text` 時自動排成左右兩欄。
 * - `entries`：清單每一項為一個條目。**一行一段**：首行 `**年份** 標題`，
 *   斜體段落為副註（pf-entry-meta），其餘為正文，只含連結的段落為連結列。
 * - `cards`：清單每一項為一張卡，首行粗體為卡名（h3），其餘段落為說明。
 * - `members`：同上，但首行粗體須為連結 `**[姓名](/team/頁面.html)** 職務`，
 *   姓名即該頁入口（卡片其他部分不可點）。
 * - `now`／`tags`／`steps`：清單原樣輸出，只補上 `pf-now`／`pf-tags`／`tm-steps`
 *   類名，清單項內照常寫 `**標題**說明`。
 * - `lang`：`::: lang zh` 與 `::: lang en` 各包一份全文，內層照常寫上述容器與標題。
 *   兩份都會輸出，由 CSS 依 <html data-pf-lang> 只顯示一份（見 index.scss 的
 *   .pf-lang）。包裝層只影響直屬選擇器，故 h2 分割線另補一條 .pf-lang 版。
 *
 * 之所以自行解析而不引入 markdown-it-container：本專案的容器都不需要嵌套，
 * 內層另外交給 `md.parse` 處理即可，省一個相依套件，也便於逐個容器自訂輸出。
 */

/** `:::` 的冒號字元碼 */
const COLON = 0x3a;

/** 開頭行：容器名（必填）＋可選的一個參數 */
const OPEN_FENCE = /^([a-z][a-z0-9-]*)(?:\s+(.+))?$/iu;

/** `- 標籤：內容` 的標籤部分：不含冒號、最多十二字 */
const FACT_LABEL = /^([^：:]{1,12})[：:]\s*([\s\S]*)$/u;

interface Context {
  /** 容器內文的原始 Markdown */
  body: string;
  /** 容器名後的參數（可空） */
  info: string;
  md: MarkdownIt;
  env: Record<string, unknown>;
}

const renderInline = (ctx: Context, tokens: Token[]): string =>
  ctx.md.renderer.renderInline(tokens, ctx.md.options, ctx.env);

const escapeAttr = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const isBlankText = (token: Token): boolean =>
  token.type === "text" && token.content.trim() === "";

/**
 * 去掉段首段尾的空文字 token。
 *
 * CJK 斷行外掛會在段首插入空字串 token，留著會讓「首個 token 是粗體」之類的
 * 判斷失準；段內的空文字（粗體與標題之間那個空格）則要保留。
 */
const normalize = (segment: Token[]): Token[] => {
  let start = 0;
  let end = segment.length;

  while (start < end && isBlankText(segment[start])) start++;
  while (end > start && isBlankText(segment[end - 1])) end--;

  return segment.slice(start, end);
};

/**
 * 把容器內文解析成「清單項 → 段落」兩層。
 *
 * 段落以行內 token 的 `softbreak` 切開：條目寫成一行一段，換行即換段，
 * 不必在清單項之間插入空行（那會讓清單變成 loose list，徒增 `<p>` 包裹）。
 */
const itemsOf = (ctx: Context): Token[][][] => {
  const tokens = ctx.md.parse(ctx.body, ctx.env);
  const items: Token[][][] = [];

  let segments: Token[][] | null = null;
  let buffer: Token[] = [];

  for (const token of tokens) {
    if (token.type === "list_item_open") {
      segments = [];
      continue;
    }

    if (token.type === "list_item_close") {
      if (segments) {
        if (buffer.length > 0) segments.push(buffer);
        buffer = [];
        items.push(segments);
        segments = null;
      }

      continue;
    }

    if (!segments || token.type !== "inline") continue;

    for (const child of token.children ?? []) {
      if (child.type === "softbreak" || child.type === "hardbreak") {
        if (buffer.length > 0) segments.push(normalize(buffer));
        buffer = [];
        continue;
      }

      buffer.push(child);
    }

    // 一個 inline token 就是一段，段與段之間必定切開
    if (buffer.length > 0) segments.push(normalize(buffer));
    buffer = [];
  }

  return items;
};

/** 首段的粗體部分作標籤（年份、卡名、姓名），其餘為標題 */
const splitLead = (
  ctx: Context,
  segment: Token[],
): { label: string; rest: Token[] } => {
  if (segment[0]?.type !== "strong_open") return { label: "", rest: segment };

  const close = segment.findIndex(
    (token, index) => index > 0 && token.type === "strong_close",
  );

  if (close < 0) return { label: "", rest: segment };

  return {
    label: renderInline(ctx, segment.slice(1, close)),
    rest: segment.slice(close + 1),
  };
};

const isMeta = (segment: Token[]): boolean =>
  segment[0]?.type === "em_open" &&
  segment.at(-1)?.type === "em_close" &&
  segment.length > 1;

/**
 * 只含連結的段落 → 條目底部的連結列。
 *
 * 逐個 token 走：遇到連結就整段跳過（連結文字本身是 text token，不能當成普通
 * 文字），其餘只准許空白。站內連結可能已被 VuePress 改寫成 html_inline 的
 * `<a>`／`<RouterLink>`，同樣以開合標籤成對處理。
 */
const isLinksOnly = (segment: Token[]): boolean => {
  let index = 0;
  let sawLink = false;

  while (index < segment.length) {
    const token = segment[index];

    if (token.type === "link_open") {
      sawLink = true;
      index++;

      while (
        index < segment.length &&
        segment[index].type !== "link_close"
      ) {
        index++;
      }

      if (index >= segment.length) return false;

      index++;
      continue;
    }

    if (token.type === "html_inline" && /^<(?!\/)/u.test(token.content)) {
      sawLink = true;
      index++;

      while (
        index < segment.length &&
        !(
          segment[index].type === "html_inline" &&
          /^<\//u.test(segment[index].content)
        )
      ) {
        index++;
      }

      if (index >= segment.length) return false;

      index++;
      continue;
    }

    if (isBlankText(token)) {
      index++;
      continue;
    }

    return false;
  }

  return sawLink;
};

const renderHero = (ctx: Context): string => {
  const fields = new Map<string, string>();
  const facts: string[] = [];

  for (const raw of ctx.body.split("\n")) {
    const line = raw.trim();

    if (!line) continue;

    const bullet = /^[-*]\s+([\s\S]*)$/u.exec(line);

    if (bullet) {
      facts.push(bullet[1]);
      continue;
    }

    const pair = /^([a-z][a-z-]*)\s*[:：]\s*([\s\S]*)$/iu.exec(line);

    if (pair) fields.set(pair[1].toLowerCase(), pair[2]);
  }

  const inline = (value?: string): string =>
    value ? ctx.md.renderInline(value, ctx.env) : "";

  const role = inline(fields.get("role"));
  const name = inline(fields.get("name"));
  const lede = inline(fields.get("lede"));
  const aside = inline(fields.get("aside"));
  const asideText = inline(fields.get("aside-text"));

  const main: string[] = [];

  if (role) main.push(`<p class="pf-role">${role}</p>`);
  if (name) main.push(`<h2 class="tm-name">${name}</h2>`);
  if (lede) main.push(`<p class="pf-lede">${lede}</p>`);

  const columns = asideText
    ? `<div class="pf-hero-main"><div class="pf-hero-text">${main.join("")}</div>` +
      `<div class="pf-aside">${aside ? `<p class="pf-role">${aside}</p>` : ""}` +
      `<div class="pf-aside-body"><p class="pf-lede">${asideText}</p></div></div></div>`
    : main.join("");

  const list = facts
    .map((fact) => {
      const pair = FACT_LABEL.exec(fact);

      return pair
        ? `<li><span>${inline(pair[1])}</span>${inline(pair[2])}</li>`
        : `<li>${inline(fact)}</li>`;
    })
    .join("");

  return `<div class="pf-hero">${columns}${
    list ? `<ul class="pf-facts">${list}</ul>` : ""
  }</div>`;
};

const renderEntries = (ctx: Context): string => {
  const entries = itemsOf(ctx)
    .map((segments) => {
      const [head = [], ...rest] = segments;
      const { label, rest: title } = splitLead(ctx, head);
      const body = rest
        .map((segment) => {
          if (isMeta(segment)) {
            return `<p class="pf-entry-meta">${renderInline(
              ctx,
              segment.slice(1, -1),
            )}</p>`;
          }

          if (isLinksOnly(segment)) {
            return `<p class="pf-entry-links">${renderInline(
              ctx,
              segment.filter((token) => !isBlankText(token)),
            )}</p>`;
          }

          return `<p>${renderInline(ctx, segment)}</p>`;
        })
        .join("");

      return (
        `<div class="pf-entry"><p class="pf-entry-label">${label}</p>` +
        `<div class="pf-entry-body"><h3>${renderInline(ctx, title).trim()}</h3>${body}</div></div>`
      );
    })
    .join("");

  return `<div class="pf-entries">${entries}</div>`;
};

const renderCards = (ctx: Context): string => {
  const cards = itemsOf(ctx)
    .map((segments) => {
      const [head = [], ...rest] = segments;
      const { label, rest: title } = splitLead(ctx, head);
      const text = [renderInline(ctx, title), ...rest.map((s) => renderInline(ctx, s))]
        .map((line) => line.trim())
        .filter((line) => line)
        .map((line) => `<p>${line}</p>`)
        .join("");

      return `<div class="pf-card"><h3>${label}</h3>${text}</div>`;
    })
    .join("");

  return `<div class="pf-grid">${cards}</div>`;
};

/**
 * 成員卡：姓名本身是通往個人檔案的連結，卡片其餘部分不可點。
 *
 * 早期做法是把整張卡包成 `<a>`，但這樣無法在卡內再放其他連結，
 * 且游標移過空白處也會觸發跳轉；改為卡片用 `<div>`、姓名用 `<a>`。
 */
const renderMembers = (ctx: Context): string => {
  const cards = itemsOf(ctx)
    .map((segments) => {
      const [head = [], ...rest] = segments;
      const open = head.findIndex((token) => token.type === "link_open");
      const close = head.findIndex((token) => token.type === "link_close");
      const href = open >= 0 ? (head[open].attrGet("href") ?? "") : "";
      const inner =
        open >= 0 && close > open
          ? renderInline(ctx, head.slice(open + 1, close)).trim()
          : renderInline(ctx, head).trim();
      const name = href
        ? `<a href="${escapeAttr(href)}">${inner}</a>`
        : inner;
      const after = head.findIndex((token) => token.type === "strong_close");
      const role = renderInline(ctx, head.slice(after + 1)).trim();
      const duty = rest
        .map((segment) => `<p class="tm-duty">${renderInline(ctx, segment)}</p>`)
        .join("");

      return (
        `<div class="pf-card tm-card">` +
        `<h3>${name}</h3>` +
        `${role ? `<p class="tm-role">${role}</p>` : ""}${duty}</div>`
      );
    })
    .join("");

  return `<div class="pf-grid tm-grid">${cards}</div>`;
};

/**
 * 語言分區：整份譯文包一層，前端只切換 <html data-pf-lang>，不重繪內容。
 *
 * 內文照常交給 markdown 處理（與其他容器不同，這裡要的是整段輸出而非逐項解析），
 * 故直接 `md.render`：標題錨點、站內連結改寫、外連 target 都由同一套規則產生，
 * 兩份譯文的結構才會完全一致。
 */
const renderLang = (ctx: Context): string => {
  const code = ctx.info.trim().toLowerCase() === "en" ? "en" : "zh";
  const tag = code === "en" ? "en" : "zh-Hant";

  return (
    `<div class="pf-lang" data-lang="${code}" lang="${tag}">` +
    `${ctx.md.render(ctx.body, ctx.env).trimEnd()}</div>`
  );
};

/** `now`／`tags`／`steps`：清單原樣輸出，只補類名 */
const listRenderer =
  (ordered: boolean, className: string) =>
  (ctx: Context): string => {
    const tokens = ctx.md.parse(ctx.body, ctx.env);
    const open = tokens.find(
      (token) =>
        token.type ===
        (ordered ? "ordered_list_open" : "bullet_list_open"),
    );

    if (open) open.attrSet("class", className);

    return ctx.md.renderer.render(tokens, ctx.md.options, ctx.env).trimEnd();
  };

const RENDERERS: Record<string, (ctx: Context) => string> = {
  hero: renderHero,
  entries: renderEntries,
  cards: renderCards,
  members: renderMembers,
  now: listRenderer(false, "pf-now"),
  tags: listRenderer(false, "pf-tags"),
  steps: listRenderer(true, "tm-steps"),
  lang: renderLang,
};

const containerRule = (
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean => {
  const { src } = state;
  const pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];

  if (state.sCount[startLine] - state.blkIndent >= 4) return false;
  if (pos + 3 > max) return false;
  if (src.charCodeAt(pos) !== COLON) return false;

  let fence = 0;

  while (pos + fence < max && src.charCodeAt(pos + fence) === COLON) fence++;
  if (fence < 3) return false;

  const info = src.slice(pos + fence, max).trim();
  const matched = OPEN_FENCE.exec(info);

  if (!matched) return false;

  const name = matched[1].toLowerCase();

  if (!Object.hasOwn(RENDERERS, name)) return false;
  if (silent) return true;

  let closing = -1;

  for (let line = startLine + 1; line < endLine; line++) {
    if (state.sCount[line] < state.blkIndent) break;

    const start = state.bMarks[line] + state.tShift[line];
    const stop = state.eMarks[line];

    if (start >= stop) continue;
    if (src.charCodeAt(start) !== COLON) continue;
    if (state.sCount[line] - state.blkIndent >= 4) continue;

    let count = 0;

    while (start + count < stop && src.charCodeAt(start + count) === COLON) {
      count++;
    }

    if (count < fence) continue;
    if (src.slice(start + count, stop).trim()) continue;

    closing = line;
    break;
  }

  if (closing < 0) {
    // 少了結尾的 :::，整段會按原文輸出。與其靜靜破版，不如在建置時叫一聲。
    console.warn(`[pf-blocks] 「::: ${name}」沒有對應的結尾 :::。`);

    return false;
  }

  const body =
    closing > startLine + 1
      ? src.slice(state.bMarks[startLine + 1], state.eMarks[closing - 1])
      : "";

  const token = state.push("html_block", "", 0);

  token.map = [startLine, closing + 1];
  token.content = `${RENDERERS[name]({
    body,
    info: matched[2] ?? "",
    md: state.md,
    env: state.env,
  })}\n`;
  state.line = closing + 1;

  return true;
};

export const pfBlocksPlugin = (): Plugin => ({
  name: "pf-blocks",

  extendsMarkdown: (md) => {
    md.block.ruler.before("fence", "pf-blocks", containerRule, {
      alt: ["paragraph", "reference", "blockquote", "list"],
    });

    /**
     * 信箱連結維持純錨點。
     *
     * VuePress 對外連一律補上 target／rel，主題再據此加上外連箭頭；但 mailto
     * 不是「另一個網頁」，加了箭頭與新視窗反而與站內其他手寫信箱連結不一致，
     * 故只讓 mailto 走預設渲染器。
     */
    const linkOpen =
      md.renderer.rules.link_open ??
      ((tokens, idx, options, _env, self) =>
        self.renderToken(tokens, idx, options));

    md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const href = tokens[idx].attrGet("href") ?? "";

      return href.startsWith("mailto:")
        ? self.renderToken(tokens, idx, options)
        : linkOpen(tokens, idx, options, env, self);
    };
  },
});
