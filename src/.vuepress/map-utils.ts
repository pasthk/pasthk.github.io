/**
 * 建置期只用的小工具：往 `Map<K, V[]>` 累加一項。
 *
 * 先前各處寫成 `map.set(key, [...(map.get(key) ?? []), value])`，每加一項就
 * 複製一次整個陣列；頁面數上百時是 O(n²)。改為原地 push 後語義完全相同
 * （找不到鍵才新建陣列），但不再反覆配置記憶體。
 */
export const pushTo = <K, V>(map: Map<K, V[]>, key: K, value: V): void => {
  const list = map.get(key);

  if (list) list.push(value);
  else map.set(key, [value]);
};
