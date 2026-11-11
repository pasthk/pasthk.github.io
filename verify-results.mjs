import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:8794";
const CDP = "http://127.0.0.1:9224";
const QUERIES = [
  "李鄭屋", "古蹟", "香港大學", "熱帶氣旋", "風球", "香港", "丁屋", "碑",
  "颱風信號", "警告信號", "義莊",
];

const res = await fetch(`${CDP}/json/new?${encodeURIComponent(`${BASE}/`)}`, { method: "PUT" });
const target = await res.json();
const ws = new WebSocket(target.webSocketDebuggerUrl);

let id = 0;
const pending = new Map();
const logs = [];
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type !== "debug") {
    logs.push(`[${msg.params.type}] ` + msg.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
  } else if (msg.method === "Runtime.exceptionThrown") {
    logs.push("[exception] " + (msg.params.exceptionDetails?.exception?.description ?? ""));
  }
});
const send = (method, params = {}) =>
  new Promise((r) => {
    const mid = ++id;
    pending.set(mid, r);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
await new Promise((r) => ws.addEventListener("open", r));

await send("Runtime.enable");
await send("Page.enable");
await send("Page.navigate", { url: `${BASE}/` });
await sleep(12000);

const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: 60000,
  });
  return r.result?.exceptionDetails
    ? "EXCEPTION: " + r.result.exceptionDetails.exception?.description
    : r.result?.result?.value;
};

const out = await evaluate(`(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 30 && !document.querySelector(".vp-search-button"); i += 1) await sleep(500);
  const btn = document.querySelector(".vp-search-button");
  if (!btn) return "搜尋按鈕未出現（hydration 失敗）";
  btn.click();
  await sleep(1200);
  const input = document.querySelector(".vp-search-input");
  if (!input) return "找不到輸入框";
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  const type = (text) => {
    setter.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const read = () => {
    const records = [...document.querySelectorAll(".vp-search-record")]
      .filter((r) => r.querySelector(".vp-search-record-title"));
    const blocks = records.map((r) => r.querySelectorAll(".vp-search-record-contents > li").length);
    const titles = records.slice(0, 3)
      .map((r) => r.querySelector(".vp-search-record-title").innerText.trim().slice(0, 22));
    const firstBlocks = records.slice(0, 3).map((r) => {
      const li = r.querySelector(".vp-search-record-contents > li");
      return li ? li.innerText.trim().replace(/\\s+/g, " ").slice(0, 30) : "";
    });
    const duplicateBlocks = [...document.querySelectorAll(".vp-search-record-contents > li")]
      .filter((li) => {
        const parts = [...li.querySelectorAll(".vp-search-record-content > div > div")]
          .map((d) => d.innerText.trim());
        return parts.length > 1 && new Set(parts).size < parts.length;
      }).length;
    return { pages: records.length, blocks, titles, firstBlocks, duplicateBlocks };
  };

  type("香港大學");
  await sleep(3000);

  const rows = [];
  for (const q of ${JSON.stringify(QUERIES)}) {
    type("");
    await sleep(600);
    type(q);
    let last = -1;
    let stable = 0;
    const start = Date.now();
    while (Date.now() - start < 8000) {
      await sleep(250);
      const n = read().pages;
      const settled = n > 0 || document.body.textContent.includes("找不到相符內容");
      if (n === last && settled) stable += 1;
      else stable = 0;
      last = n;
      if (stable >= 3) break;
    }
    await sleep(400);
    const { pages, blocks, titles, firstBlocks, duplicateBlocks } = read();
    rows.push({
      q,
      value: input.value,
      pages,
      maxBlocks: blocks.length ? Math.max(...blocks) : 0,
      emptyBlocks: blocks.filter((n) => n === 0).length,
      duplicateBlocks,
      titles,
      firstBlocks,
      noResult: document.body.textContent.includes("找不到相符內容"),
      searching: document.body.textContent.includes("搜尋中"),
    });
  }
  return rows;
})()`);

if (typeof out === "string") {
  console.log(out);
} else {
  for (const r of out) {
    console.log(
      `${r.q.padEnd(6)} → ${String(r.pages).padStart(2)} 頁｜段落上限 ${r.maxBlocks}｜空結果列 ${r.emptyBlocks}｜重複段落 ${r.duplicateBlocks}` +
        `${r.noResult ? "｜找不到相符內容" : ""}${r.searching ? "｜仍在搜尋中" : ""}` +
        `${r.value !== r.q ? `｜輸入框=${JSON.stringify(r.value)}` : ""}｜前三 ${JSON.stringify(r.titles)}` +
        `｜首段 ${JSON.stringify(r.firstBlocks)}`,
    );
  }
  const bad = out.filter(
    (r) => r.pages > 40 || r.maxBlocks > 5 || r.emptyBlocks > 0 || r.duplicateBlocks > 0,
  );
  console.log(
    "\n=== 上限檢查 ===",
    bad.length
      ? `異常 ${JSON.stringify(bad.map((r) => r.q))}`
      : "全部通過（≤40 頁、每頁 ≤5 段、無空白列、無重複段落）",
  );
}

console.log("\n=== console（非 debug） ===");
console.log(logs.slice(0, 12).join("\n") || "(無)");
ws.close();
