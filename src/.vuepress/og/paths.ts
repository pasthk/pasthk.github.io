// OG 圖片路徑規則。
// 這裡只做純字串運算，不引入任何渲染器，方便在 config / theme 中安全引用。

/**
 * 需要 PNG 版本（社群平台用）的頁面。
 *
 * Facebook、X、LinkedIn、WhatsApp 等平台不支援 SVG 格式的 og:image，
 * 遇到 SVG 會退回純文字預覽，甚至把 SVG 的 XML 原始碼當成文字顯示。
 * Google 則相反——結構化資料與圖片搜尋都接受 SVG，且體積小得多。
 *
 * 因此入口頁同時產出兩種格式：og:image 指向 PNG（社群），
 * JSON-LD 的 image 同時列出 PNG 與 SVG（Google）。
 *
 * 對象為「站外最可能被分享的頁面」：首頁與幾個頂層資訊頁。
 * 章節因停用 catalog 而沒有獨立索引頁，故不在此列。
 */
const PNG_PAGES = new Set([
  "/",
  "/about.html",
  "/reading-notes.html",
  "/support.html",
]);

/** 該頁面是否需要 PNG 版本的 OG 圖片。 */
export function needsPng(pagePath: string): boolean {
  return PNG_PAGES.has(pagePath);
}

/** 由頁面路徑推導出圖片檔名，例如 /archaeology/lei-cheng-uk-han-tomb.html → archaeology--lei-cheng-uk-han-tomb.svg */
export function ogFileName(pagePath: string, extension = "svg"): string {
  const slug = pagePath
    .replace(/^\//, "")
    .replace(/\.html$/, "")
    .replace(/\/$/, "")
    .replace(/\//g, "--");

  return `${slug || "index"}.${extension}`;
}

/** 站內絕對路徑，供 meta 標籤使用 */
export function ogImagePath(pagePath: string, extension = "svg"): string {
  return `/og/${ogFileName(pagePath, extension)}`;
}

/** 完整網址，供 og:image 與 JSON-LD 使用 */
export function ogImageUrl(
  hostname: string,
  pagePath: string,
  extension = "svg",
): string {
  return `${hostname.replace(/\/$/, "")}${ogImagePath(pagePath, extension)}`;
}

/**
 * 社群平台用的 OG 圖片網址。
 *
 * 入口頁回傳 PNG，其餘頁面沒有 PNG 版本，仍指向 SVG。
 *
 * PNG 的產生需要 sharp 與字型子集；若建置環境缺少其中之一，
 * PNG 不會產出，此時必須改指 SVG，否則 og:image 會指向 404。
 * 實際上兩者都是「必定存在」與「可能存在」的差別——SVG 永遠會產生，
 * 因此降級時指向 SVG 是安全的。
 */
export function ogSocialImageUrl(
  hostname: string,
  pagePath: string,
  pngAvailable = true,
): string {
  const extension = needsPng(pagePath) && pngAvailable ? "png" : "svg";

  return ogImageUrl(hostname, pagePath, extension);
}

/** 對應的 MIME 型別。 */
export function ogImageMime(pagePath: string, pngAvailable = true): string {
  const usePng = needsPng(pagePath) && pngAvailable;

  return usePng ? "image/png" : "image/svg+xml";
}
