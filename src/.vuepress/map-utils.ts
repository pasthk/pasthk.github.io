import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export const pushTo = <K, V>(map: Map<K, V[]>, key: K, value: V): void => {
  const list = map.get(key);

  if (list) list.push(value);
  else map.set(key, [value]);
};

/**
 * 分批併發處理大量檔案。一次 Promise.all 會同時開啟數百個 fd，
 * 在 fd 上限較低的環境容易 EMFILE；分批可兼顧速度與穩定性。
 * 回傳陣列順序與輸入一致。
 */
export const mapInBatches = async <T, R>(
  items: readonly T[],
  worker: (item: T, index: number) => Promise<R>,
  batchSize = 16,
): Promise<R[]> => {
  const results = new Array<R>(items.length);

  for (let start = 0; start < items.length; start += batchSize) {
    const end = Math.min(start + batchSize, items.length);
    const batch = await Promise.all(
      items.slice(start, end).map(async (item, offset) => ({
        index: start + offset,
        value: await worker(item, start + offset),
      })),
    );

    for (const { index, value } of batch) results[index] = value;
  }

  return results;
};

/** 遞迴收集輸出目錄下指定副檔名的檔案；目錄本身不論名稱都會往下走 */
export const walkFiles = async (
  dir: string,
  extension: string,
): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const groups = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const full = join(dir, entry.name);

      if (entry.isDirectory()) return walkFiles(full, extension);

      return entry.isFile() && entry.name.endsWith(extension) ? [full] : [];
    }),
  );

  return groups.flat();
};

/** 讀取可選檔案：不存在時回 undefined，其他錯誤照常拋出 */
export const readOptional = async (
  path: string,
): Promise<string | undefined> => {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;

    throw error;
  }
};
