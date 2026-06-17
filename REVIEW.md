# 简搜 (JianSou) 代码审查记录

> 初次审查: 2026-05-01
> 修订审查: 2026-06-17
> 问题修复: 2026-06-18

状态说明：**已修复** | **已缓解** | **已接受** | **待办** | **审查有误**

---

## 已修复（2026-06-18）

| 项目 | 说明 |
|------|------|
| 壁纸加载阻塞首屏 | 移除全屏 loading 遮罩，UI 立即可用 |
| JSON 导入全量覆盖 | 改为与书签导入一致的合并策略 |
| 建议缓存永久 JSONP | 每次请求优先 fetch，失败再 JSONP |
| 自定义图标 URL 未校验 | `saveSite` / JSON 导入使用 `safeHttpUrl` |
| Escape 关闭不完整 | 覆盖导入导出、引擎菜单等弹层 |
| 搜索引擎菜单无键盘 | 方向键 + Enter 切换引擎 |
| Tab 键拦截焦点 | 移除搜索框 `@keydown.tab.prevent` |
| 全局 `select-none` | 仅保留于 Logo 与站点网格 |
| 面板键盘列数错位 | 从 `siteGrid` 读取实际 CSS 列数 |
| 拖拽重排逻辑重复 | 提取 `_reorderSite` / `_moveSiteTo` |
| 壁纸 CSS 注入风险 | `cssBackgroundUrl()` 转义 URL |
| 缓存壁纸 URL 失效 | 预加载失败时自动重新拉取 |
| Bing API 直连 | 优先直连，代理作回退 |
| `clearHistory` 不一致 | 统一使用 `storageSet` 并 Toast |
| SW 缓存版本手动同步 | 单源 `js/version.js` → `APP_VERSION` |
| localStorage 无版本 | 添加 `schemaVersion` 迁移框架 |

---

## 已修复（2026-06-17）

| 项目 | 说明 |
|------|------|
| Service Worker 未注册 | `init()` 中调用 `navigator.serviceWorker.register()` |
| `window.open` tabnabbing | 统一使用 `openSafeUrl()`（`noopener,noreferrer`） |
| 壁纸文案 `sanitizeText` 误用 | 改用 `textContent` + `safeHttpUrl()`，避免 `&amp;` 显示错误 |
| `favicon.ico` 缺失 | 移除对不存在文件的引用，统一使用 `icon.svg` |
| `destroy()` 未接入生命周期 | `init()` 返回清理函数，并移除全局事件监听 |
| 批量删除用数组下标 | `selectedSites` 改为存储站点 `id` |
| `localStorage` 静默失败 | `storageSet` 返回布尔值，失败时 Toast 提示 |
| 空站点列表 Tab 导航 | `sites.length === 0` 时跳过 Tab 处理 |
| 搜索历史无键盘导航 | 无建议时方向键可选择历史记录 |
| 右键菜单链接不可用 | `contextmenu` 对 `<a>` 保留原生菜单 |
| JSONP 并发残留 | 新请求前取消进行中的 JSONP |
| 壁纸预加载失败阻断更新 | 预加载失败仍尝试显示壁纸 |
| README 与代码不符 | 移除未实现的日夜模式、F9 等描述 |
| SW 子路径部署 | 资源路径基于 `self.location` 动态解析 |
| manifest 子路径 | `start_url` / `scope` 改为 `./` |
| 元数据 URL | `og:url` 对齐 `awseek.github.io` |

---

## 已缓解（风险仍存在，已采取部分措施）

| 项目 | 现状 |
|------|------|
| JSONP 搜索建议 | 优先 fetch；JSONP 仅作回退，随机回调名 + 超时 + 可取消 |
| 右键打开快捷导航 | 仍劫持非链接区域右键，为产品设计取舍 |
| 第三方 CORS 代理 | 壁纸 API 直连优先，代理仍作回退 |
| 图标第三方服务 | 泄露访问域名，依赖外部可用性 |

---

## 已接受（刻意不改）

| 项目 | 原因 |
|------|------|
| Tailwind CDN 运行时编译 | 零构建静态站，接受 CDN 依赖与首屏开销 |
| 单文件 `app.js` | 规模可控，暂不拆分模块 |
| CI 仅语法检查 | 暂无 E2E 基础设施 |
| PWA 仅 SVG 图标 | 无 PNG 资源，部分设备显示可能欠佳 |
| 模态框无完整 focus trap | 已加 Esc 关闭与表单 autofocus，完整 trap 需额外插件 |

---

## 待办（未解决或需持续关注）

| 优先级 | 项目 | 说明 |
|--------|------|------|
| 低 | 搜索需弹窗 | 浏览器拦截 `window.open` 时无同页 fallback |
| 低 | 离线能力有限 | SW 不缓存壁纸/建议/favicon 等动态资源 |

---

## 部署提醒

更新 `js/version.js` 中的 `APP_VERSION` 即可同步 SW 缓存版本（`sw.js` 通过 `importScripts` 读取）。

---

## 验证清单

- [ ] 首屏无需等待壁纸即可搜索
- [ ] JSON 导入合并而非覆盖现有站点
- [ ] 引擎菜单方向键 + Enter 可切换
- [ ] Esc 关闭所有弹层
- [ ] DevTools → Application → Service Workers 显示 `sw.js` 为 activated
- [ ] 离线刷新页面可加载（CDN 已缓存后）
- [ ] 搜索与快捷导航新标签页 `window.opener` 为 `null`
- [ ] 壁纸标题中 `&` 等字符显示正常
- [ ] 批量删除后站点顺序与选中状态正确
