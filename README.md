# 简搜

一个简洁优雅的个人搜索导航页面。

## 功能特性

### 搜索
- 多搜索引擎支持（Bing、百度、Google、DuckDuckGo）
- 搜索引擎图标显示
- 实时搜索建议（优先 fetch，JSONP 作为回退）
- 搜索历史记录（最多 10 条，支持单条删除和清空）
- 键盘导航（上下键选择建议或历史、Enter 搜索、Tab 切换引擎、Esc 退出）
- 弹窗被拦截时自动在当前页打开搜索结果

### 快捷导航
- 自定义快捷网站管理（增删改）
- 拖拽排序（桌面端 + 移动端触屏）
- 批量管理（全选、批量删除、恢复默认）
- 导入/导出配置（JSON 合并导入、HTML 书签合并导入）
- 自动获取网站图标
- 键盘导航（方向键选择、Enter 打开、Tab 循环、Shift+方向键重排）

### 背景
- Bing 每日壁纸
- 本地缓存（秒开）
- 无痛更新（跨日后台检查新图）
- 显示图片标题和版权信息

### PWA
- Service Worker 离线支持
- 可添加到主屏幕

### UI/UX
- Tailwind CSS 样式（CDN 运行时编译，见下方说明）
- 毛玻璃效果
- 弹性动画
- Toast 操作提示
- 页面内操作提示（Tab / 右键等）
- focus-visible 无障碍支持
- 响应式设计

## 技术栈

- **框架**: Alpine.js 3
- **样式**: Tailwind CSS（CDN）
- **图标**: SVG（Heroicons 风格）
- **存储**: localStorage

## 快捷键

### 搜索框

| 按键 | 功能 |
|------|------|
| `Enter` | 执行搜索（优先新标签页，弹窗被拦截则在当前页打开） |
| `↑` `↓` | 选择搜索建议或历史记录 |
| `Tab` / `Shift + Tab` | 切换搜索引擎（上/下一个） |
| `Esc` | 退出搜索状态 |
| `Shift + Backspace` | 清空搜索内容 |

### 全局 / 快捷导航

| 按键 | 功能 |
|------|------|
| 右键（非链接/输入框区域） | 打开 / 关闭快捷导航 |
| `Esc` | 关闭当前弹层（确认框 → 表单 → 导入导出 → 引擎菜单 → 导航面板 → 搜索） |
| `← → ↑ ↓` | 快捷导航面板中选择网站 |
| `Shift + ← → ↑ ↓` | 快捷导航面板中重排网站 |
| `Tab` | 快捷导航面板中循环选择网站 |
| `Enter` | 打开选中的网站 |

## 文件结构

```
Awseek.github.io/
├── index.html      # 主页面
├── js/
│   ├── version.js  # 应用版本（SW 缓存同步）
│   └── app.js      # 应用逻辑
├── sw.js           # Service Worker
├── manifest.json   # PWA 配置
├── icon.svg        # 网站图标
└── README.md       # 项目说明
```

## 本地开发

**不要直接双击打开 `index.html`（`file://`）**，浏览器会阻止 manifest、Service Worker、壁纸 API 等请求。

在项目目录运行：

```bash
npm start
# 或：npx serve . -p 3000
```

然后访问 [http://localhost:3000](http://localhost:3000)。

## 部署

直接部署到 GitHub Pages 或任何静态托管服务即可。

部署新版本时，更新 `js/version.js` 中的 `APP_VERSION` 即可同步 Service Worker 缓存版本（`sw.js` 通过 `importScripts` 读取）。

## 已知限制

- Tailwind 通过 CDN 运行时编译，首屏依赖外网 CDN
- 搜索建议、壁纸 API 依赖第三方服务，部分网络环境可能不可用
- 壁纸 API 优先直连 Bing，失败时使用 CORS 代理回退
- 搜索框内 `Tab` 用于切换引擎，需点击其他区域或使用鼠标切换焦点

---

*开发者: Jiuhe29*
