import { appendFileSync } from "node:fs";

export const SUBMISSION_STATUS_FILE =
  process.env.SUBMISSION_STATUS_FILE ?? "";

export const reportSubmission = (engine, { status, count, detail }) => {
  if (!SUBMISSION_STATUS_FILE) return;

  appendFileSync(
    SUBMISSION_STATUS_FILE,
    `${JSON.stringify({ engine, status, count, detail })}\n`,
  );
};
