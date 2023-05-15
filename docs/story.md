---
title: 逸事
index: false
date: 2023-05-15
---

## 2023-05-08
5月上旬遇到Error Code: 525問題，搞得一頭霧水。

資料集使用GitHub+Godaddy Economy Plan+Cloudflare CDN/SSL方案，在Godaddy改好Cloudflare的DNS後，順利訪問資料集。後來遇到SSL Handshake Failure問題（代號525），即使參考網上常見的5個步驟也沒能解決問題，也把 SSL/TLS 加密模式改為Flexible或Full都無補於事，結果導致Search Console無法訪問Sitemap，一度減少了Search Engine收錄的頁面。

無奈之下，只好查看Godaddy cPanel裡的設定，在網域（Domain）欄內看到一段提示文字：

> HTTPS Redirect is not available because your server is not configured to support it.

Force HTTPS Redirect的選項也是灰色，無法開啟。突然想起來，Cloudflare SSL/TLS的邊緣憑證（Edge Certificates）中有一項已開啟的Automatic HTTPS Rewrites，本著嘗試的態度把該選項關閉，竟解決了525問題，至今不再出現SSL Handshake Failure。