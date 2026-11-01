// OG 圖片產生器的執行期狀態。
//
// theme 的 ogp 回呼在頁面渲染時執行，比外掛的 onGenerated 早，
// 因此需要一個模組層級的旗標，讓「og:image 指向哪個檔案」
// 與「實際產出了哪些檔案」保持一致。
//
// 若建置環境缺少 sharp 或字型子集，PNG 不會產出，
// og:image 就必須改指 SVG，否則會指向 404。

let pngAvailable = false;

/** 記錄 PNG 是否會被產出。 */
export function setPngAvailable(available: boolean): void {
  pngAvailable = available;
}

/** 目前是否會產出 PNG。 */
export function isPngAvailable(): boolean {
  return pngAvailable;
}
