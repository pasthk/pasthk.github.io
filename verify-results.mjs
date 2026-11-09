import { setTimeout as sleep } from "node:timers/promises";

const BASE = "http://localhost:8794";
const res = await fetch(`http://127.0.0.1:9224/json/new?${encodeURIComponent(BASE + "/")}`, { method: "PUT" });
const target = await res.json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const logs = [];
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type !== "debug") {
    logs.push(`[${msg.params.type}] ` + msg.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
  } else if (msg.method === "Runtime.exceptionThrown") {
    logs.push("[exception] " + (msg.params.exceptionDetails?.exception?.description ?? ""));
  }
});
const send = (method, params = {}) => new Promise((r) => { const mid = ++id; pending.set(mid, r); ws.send(JSON.stringify({ id: mid, method, params })); });
await new Promise((r) => ws.addEventListener("open", r));
await send("Runtime.enable");
await send("Page.enable");
await send("Page.navigate", { url: BASE + "/" });
await sleep(12000);
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, timeout: 60000 });
  return r.result?.exceptionDetails ? "EXCEPTION: " + r.result.exceptionDetails.exception?.description : r.result?.result?.value;
};

console.log(await evaluate(`(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 20 && !document.querySelector(".vp-search-button"); i += 1) await sleep(500);
  document.querySelector(".vp-search-button").click();
  await sleep(1500);
  const input = document.querySelector(".vp-search-input");
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  const out = [];
  for (const q of ["香港大學", "李鄭屋", "古蹟", "考古", "香港", "避風塘", "丁屋"]) {
    setter.call(input, q);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(2800);
    const records = [...document.querySelectorAll(".vp-search-record")];
    const real = records.filter((r) => r.querySelector(".vp-search-record-title"));
    const first = real[0];
    const title = first?.querySelector(".vp-search-record-title")?.innerText.trim() ?? "—";
    const blocks = real.map((r) => r.querySelectorAll(".vp-search-record-contents > li").length);
    out.push(
      q.padEnd(5) + " → " + real.length + " 頁｜首筆「" + title.slice(0, 22) + "」" +
      "｜內容段 最多 " + (blocks.length ? Math.max(...blocks) : 0) + " 平均 " +
      (blocks.length ? (blocks.reduce((a, b) => a + b, 0) / blocks.length).toFixed(1) : 0)
    );
  }
  return out.join("\\n");
})()`));

console.log("\n=== console（非 debug） ===");
console.log(logs.slice(0, 12).join("\n") || "(無)");
ws.close();
