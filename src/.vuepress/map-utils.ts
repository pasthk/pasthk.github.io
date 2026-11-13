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
