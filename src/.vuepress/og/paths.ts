
export function ogFileName(pagePath: string): string {
  const slug = pagePath
    .replace(/^\//, "")
    .replace(/\.html$/, "")
    .replace(/\/$/, "")
    .replace(/\//g, "--");

  return `${slug || "index"}.png`;
}

export function ogImagePath(pagePath: string): string {
  return `/og/${ogFileName(pagePath)}`;
}

export function ogImageUrl(hostname: string, pagePath: string): string {
  return `${hostname.replace(/\/$/, "")}${ogImagePath(pagePath)}`;
}
