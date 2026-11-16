import { writeFile } from "node:fs/promises";
import type { App, Plugin } from "vuepress/core";
import { success, warn } from "vuepress/utils";

import { readOptional } from "../utils.js";
import { rewriteHtmlFiles } from "./html.js";

/**
 * vuepress-theme-hope 的 build 範本會在 <head> 內固定注入兩段程式碼：
 *   1. 一段深色模式的底色 <style>；
 *   2. 一段讀取 localStorage／matchMedia 的阻塞腳本，命中系統深色時把
 *      <html data-theme> 改為 dark。
 *
 * 本站以 `darkmode: "disable"` 固定淺色（範本已直接輸出 data-theme="light"），
 * 這兩段不但無用，還會讓每次載入都先跑一次同步的媒體查詢再被覆蓋。
 * 這裡在輸出階段把它們剝掉，每頁省下約 570 bytes 與一個 head 阻塞腳本。
 *
 * 若日後啟用深色模式，範本會輸出 data-theme="dark"，下方的守衛偵測到後
 * 會整段略過，不會誤刪必要的初始化程式碼。
 */
const DARK_STYLE =
  /\s*<style>\s*:root \{\s*--vp-c-bg: #fff;?\s*\}\s*\[data-theme="dark"\][\s\S]*?<\/style>/u;

const DARK_INIT_SCRIPT =
  /\s*<script>\s*const userMode = localStorage\.getItem\("vuepress-theme-hope-scheme"\)[\s\S]*?<\/script>/u;

const DARK_MODE_ENABLED = /<html[^>]*\sdata-theme="dark"/u;

async function stripDarkModeInit(app: App): Promise<void> {
  const missed: string[] = [];

  const stripped = await rewriteHtmlFiles(app, (html, file) => {
    /* 深色模式已啟用：保留範本注入的初始化邏輯 */
    if (DARK_MODE_ENABLED.test(html)) return undefined;

    const next = html.replace(DARK_STYLE, "").replace(DARK_INIT_SCRIPT, "");

    if (next === html) {
      if (html.includes("vuepress-theme-hope-scheme")) missed.push(file);

      return undefined;
    }

    return next;
  });

  if (missed.length) {
    warn(
      `有 ${missed.length} 頁仍含主題注入的深色模式腳本，但格式與預期不同，未剝除。` +
        `請更新 build/cleanup.ts 的 DARK_STYLE／DARK_INIT_SCRIPT（例：${missed[0]}）。`,
    );
  }

  if (stripped) {
    success(`已從 ${stripped} 頁移除主題注入的深色模式樣式與腳本`);
  }
}

export const cleanupPlugin = (): Plugin => ({
  name: "output-cleanup",

  async onGenerated(app: App): Promise<void> {
    const robots = await readOptional(app.dir.public("robots.txt"));

    if (robots === undefined) {
      warn("public/robots.txt 不存在，略過 robots.txt 的清理。");
    } else {
      await writeFile(app.dir.dest("robots.txt"), robots, "utf8");
    }

    await stripDarkModeInit(app);

    const path = app.dir.dest("sitemap.xml");
    const xml = await readOptional(path);

    if (xml === undefined) return;

    const next = xml.replace(
      /[ \t]*<(?:changefreq|priority)>[^<]*<\/(?:changefreq|priority)>\s*/gu,
      "",
    );

    if (next !== xml) await writeFile(path, next, "utf8");
  },
});
