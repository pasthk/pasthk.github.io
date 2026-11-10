import { appendFileSync } from "node:fs";

/**
 * 兩個 URL 提交步驟（IndexNow／百度）共用的結果紀錄。
 *
 * 每一步都寫入同一份 JSONL 狀態檔，再由 deploy job 的彙總步驟產出表格。
 * 先前兩個 inline Node 腳本各自維護一份 report() 與環境變數讀取，
 * 任一邊改格式就會讓彙總表少一列；集中在此後只須改一處。
 */
export const SUBMISSION_STATUS_FILE =
  process.env.SUBMISSION_STATUS_FILE ?? "";

/** engine：顯示名稱；status：ok／skipped／failed；count：本次處理的 URL 數 */
export const reportSubmission = (engine, { status, count, detail }) => {
  if (!SUBMISSION_STATUS_FILE) return;

  appendFileSync(
    SUBMISSION_STATUS_FILE,
    `${JSON.stringify({ engine, status, count, detail })}\n`,
  );
};
