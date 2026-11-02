// OG 圖片路徑規則。
// 這裡只做純字串運算，不引入任何渲染器，方便在 config / theme 中安全引用。

/**
 * 由頁面路徑推導出圖片檔名。
 *
 * 例如 /archaeology/lei-cheng-uk-han-tomb.html
 * → archaeology--lei-cheng-uk-han-tomb.png
 *
 * 用 PNG 而非 SVG：Facebook、X、LinkedIn、Slack 等平台都不接受 SVG 作 og:image。
 */
export function ogFileName(pagePath: string): string {
  const slug = pagePath
    .replace(/^\//, "")
    .replace(/\.html$/, "")
    .replace(/\/$/, "")
    .replace(/\//g, "--");

  return `${slug || "index"}.png`;
}

/** 站內絕對路徑，供 meta 標籤使用 */
export function ogImagePath(pagePath: string): string {
  return `/og/${ogFileName(pagePath)}`;
}

/** 完整網址，供 og:image 與 JSON-LD 使用 */
export function ogImageUrl(hostname: string, pagePath: string): string {
  return `${hostname.replace(/\/$/, "")}${ogImagePath(pagePath)}`;
}
