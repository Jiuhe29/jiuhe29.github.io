# 简搜 (JianSou) 修复进度

> 审查日期: 2026-05-01
> 最后更新: 2026-05-01

**总进度: 16 / 16**

---

## 安全问题

- [x] **[高] JSONP 注入风险** — `js/app.js`
  迁移到 fetch + CORS，JSONP 仅作为 fallback，回调名改为 `__jiansou_cb` 避免全局冲突，超时从 5s 降至 3s
- [x] **[中] x-html 潜在 XSS** — `index.html:87`，`js/app.js:_setBgInfo`
  改用 `x-ref` + DOM API 构建链接，消除 `x-html` 使用
- [x] **[中] 右键菜单被劫持** — `js/app.js:_bindGlobalEvents`
  对 input/textarea 元素保留原生右键菜单

## 代码质量

- [x] **[中] setInterval 未清除** — `js/app.js:_startClock`
  存储 interval ID 到 `_clockTimer`，添加 `destroy()` 回调清除
- [x] **[低] var/const 声明不一致** — `js/app.js`
  `ICON_SERVICES` 改为 `const`
- [x] **[低] function/箭头函数混用** — `js/app.js:_parseSuggestions`
  统一为箭头函数
- [x] **[低] handleIconError 依赖 DOM 顺序** — `js/app.js:handleIconError`
  改用 `.icon-fallback` class 选择器查找 fallback 元素

## 性能

- [x] **[中] Tailwind CSS 运行时编译** — `index.html:26`
  保持现状（CDN 方案对零构建项目合理），标记为已知限制
- [x] **[中] 壁纸每次请求 API** — `js/app.js:initBackground`
  增加 `date` 字段，同一天内跳过 API 请求
- [x] **[低] JSONP 超时过长** — `js/app.js`
  `FETCH_TIMEOUT` 和 `JSONP_TIMEOUT` 均改为 3000ms
- [x] **[低] JSONP 请求无法取消** — `js/app.js`
  fetch 优先 + AbortController 超时取消，JSONP 仅作 fallback

## PWA / Service Worker

- [x] **[中] SW 缓存版本硬编码** — `sw.js`
  改为日期格式 `jiansou-YYYYMMDD`，每次部署更新
- [x] **[中] SW 未缓存 CDN 资源** — `sw.js`
  新增 `CDN_ASSETS` 预缓存 Alpine.js 和 Tailwind CSS
- [x] **[低] SW 跳过非同源请求** — `sw.js`
  CDN 资源启用 network-first 策略，离线时回退缓存

## 可访问性

- [x] **[中] 搜索建议缺少 live region** — `index.html:138`
  添加 `aria-live="polite" aria-atomic="true"`
- [x] **[中] 拖拽无键盘替代** — `js/app.js:_handlePanelKeyboard`
  添加 Shift+Arrow 键重排站点

---

## 已排除

| 项目 | 原因 |
|------|------|
| favicon.ico 缺失 | 误报 — 文件已存在 |
| sanitizeText 不完整 | 已覆盖 `& < > " '` 五个关键字符，实际风险有限 |
