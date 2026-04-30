/**
 * 简搜 - 搜索导航页
 * 更新日期: 2026-05-01
 */

document.addEventListener('alpine:init', () => {

  // ========== 常量 ==========

  const DEFAULT_SITES = [
    { id: 'default-bilibili', name: '哔哩哔哩', url: 'https://www.bilibili.com', icon: '' },
    { id: 'default-zhihu', name: '知乎', url: 'https://www.zhihu.com', icon: '' },
    { id: 'default-github', name: 'GitHub', url: 'https://github.com', icon: '' },
    { id: 'default-douyin', name: '抖音', url: 'https://www.douyin.com', icon: '' },
    { id: 'default-taobao', name: '淘宝', url: 'https://www.taobao.com', icon: '' },
    { id: 'default-qqmail', name: 'QQ邮箱', url: 'https://mail.qq.com', icon: '' },
    { id: 'default-baidupan', name: '百度网盘', url: 'https://pan.baidu.com', icon: '' },
    { id: 'default-aliyun', name: '阿里云盘', url: 'https://www.aliyundrive.com', icon: '' },
    { id: 'default-weibo', name: '微博', url: 'https://weibo.com', icon: '' },
    { id: 'default-jd', name: '京东', url: 'https://www.jd.com', icon: '' },
    { id: 'default-netease', name: '网易云音乐', url: 'https://music.163.com', icon: '' },
    { id: 'default-douban', name: '豆瓣', url: 'https://www.douban.com', icon: '' },
    { id: 'default-youtube', name: 'YouTube', url: 'https://www.youtube.com', icon: '' },
    { id: 'default-twitter', name: 'X / Twitter', url: 'https://x.com', icon: '' },
    { id: 'default-chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com', icon: '' },
    { id: 'default-stackoverflow', name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '' }
  ];

  const ENGINE_KEYS = ['bing', 'baidu', 'google', 'duckduckgo'];

  const ENGINES = {
    bing: {
      name: 'Bing',
      icon: 'https://www.bing.com/favicon.ico',
      url: q => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
      suggest: q => `https://api.bing.com/qsonhs.aspx?type=cb&q=${encodeURIComponent(q)}&cb=__cb`
    },
    baidu: {
      name: '百度',
      icon: 'https://www.baidu.com/favicon.ico',
      url: q => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`,
      suggest: q => `https://suggestion.baidu.com/su?wd=${encodeURIComponent(q)}&cb=__cb`
    },
    google: {
      name: 'Google',
      icon: 'https://www.google.com/favicon.ico',
      url: q => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
      suggest: q => `https://suggestqueries.google.com/complete/search?client=youtube&q=${encodeURIComponent(q)}&callback=__cb`
    },
    duckduckgo: {
      name: 'DuckDuckGo',
      icon: 'https://duckduckgo.com/favicon.ico',
      url: q => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
      suggest: q => `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&callback=__cb`
    }
  };

  const BING_API = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN';

  const CORS_PROXIES = [
    url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    url => `https://corsproxy.io/?${encodeURIComponent(url)}`
  ];

  const MAX_HISTORY = 10;
  const DEBOUNCE_DELAY = 200;
  const FETCH_TIMEOUT = 3000;
  const JSONP_TIMEOUT = 3000;
  const TOAST_DURATION = 2500;
  const LONG_PRESS_DELAY = 500;
  const TOUCH_DEADZONE = 10;

  // ========== 工具函数 ==========

  function storageGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback ?? null;
      return JSON.parse(raw);
    } catch {
      return fallback ?? null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* localStorage 可能满或不可用 */ }
  }

  function storageGetRaw(key, fallback) {
    try {
      return localStorage.getItem(key) ?? (fallback ?? '');
    } catch {
      return fallback ?? '';
    }
  }

  function storageSetRaw(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch { /* localStorage 可能不可用 */ }
  }

  function preloadImage(url) {
    return new Promise((resolve, reject) => {
      if (!url) { resolve(); return; }
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
  }

  function fetchWithTimeout(url, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
  }

  const ICON_SERVICES = [
    host => `https://icons.duckduckgo.com/ip3/${host}.ico`,
    host => `https://favicon.im/${host}`,
    host => `https://icon.horse/url/${host}`,
    host => `https://favicon.io/favicon-generator?d=${host}`
  ];

  function getIcon(url, idx) {
    try {
      var host = new URL(url).hostname;
      var i = idx || 0;
      return (ICON_SERVICES[i] || ICON_SERVICES[0])(host);
    } catch {
      return '';
    }
  }

  function isValidUrl(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function sanitizeText(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  // ========== Alpine 组件 ==========

  Alpine.data('app', () => ({

    // --- 时钟 ---
    time: '00:00:00',
    _clockTimer: null,

    // --- Toast ---
    toast: false,
    toastMessage: '',
    toastType: 'success',
    _toastTimer: null,

    showToast(message, type) {
      clearTimeout(this._toastTimer);
      this.toastMessage = message;
      this.toastType = type || 'success';
      this.toast = true;
      this._toastTimer = setTimeout(() => { this.toast = false; }, TOAST_DURATION);
    },

    // --- 搜索 ---
    query: '',
    originalQuery: '',
    searchFocused: false,
    suggestions: [],
    searchHistory: [],
    selectedIndex: -1,
    engine: 'bing',
    engineMenuOpen: false,
    engines: ENGINES,
    _debounce: null,
    _fetchId: 0,
    _suggestCache: {},

    initSearch() {
      var saved = storageGetRaw('engine');
      this.engine = ENGINE_KEYS.includes(saved) ? saved : 'bing';
      this.searchHistory = storageGet('searchHistory', []);
    },

    saveHistory(query) {
      if (!query.trim()) return;
      this.searchHistory = [query, ...this.searchHistory.filter(h => h !== query)].slice(0, MAX_HISTORY);
      storageSet('searchHistory', this.searchHistory);
    },

    clearHistory() {
      this.searchHistory = [];
      localStorage.removeItem('searchHistory');
      this.showToast('历史记录已清空', 'success');
    },

    removeHistoryItem(index) {
      this.searchHistory.splice(index, 1);
      storageSet('searchHistory', this.searchHistory);
    },

    setEngine(key) {
      if (!ENGINE_KEYS.includes(key)) return;
      this.engine = key;
      this.engineMenuOpen = false;
      storageSetRaw('engine', key);
      if (this.query.trim()) this.fetchSuggestions();
    },

    onInput() {
      clearTimeout(this._debounce);
      this.selectedIndex = -1;
      this.originalQuery = this.query;
      if (!this.query.trim()) {
        this.suggestions = [];
        return;
      }
      this._debounce = setTimeout(() => this.fetchSuggestions(), DEBOUNCE_DELAY);
    },

    async fetchSuggestions() {
      var q = this.query.trim();
      if (!q) return;
      var fetchId = ++this._fetchId;
      var engine = this.engine;

      try {
        var data;
        if (this._suggestCache[engine] === 'jsonp') {
          data = await this._jsonpSuggest(q);
        } else {
          try {
            data = await this._fetchSuggest(q);
            this._suggestCache[engine] = 'fetch';
          } catch {
            data = await this._jsonpSuggest(q);
            this._suggestCache[engine] = 'jsonp';
          }
        }
        if (fetchId !== this._fetchId) return;
        this.suggestions = this._parseSuggestions(data);
      } catch {
        // 搜索建议 API 离线，静默处理
      }
    },

    _fetchSuggest(q) {
      var url = ENGINES[this.engine].suggest(q)
        .replace(/[?&](cb|callback)=__cb/, '')
        .replace(/\?&/, '?')
        .replace(/[?&]$/, '');
      return fetchWithTimeout(url, FETCH_TIMEOUT).then(r => r.json());
    },

    _jsonpSuggest(q) {
      return new Promise((resolve, reject) => {
        var cbName = '__jiansou_cb' + Date.now() + Math.random().toString(36).slice(2, 6);
        var done = false;
        var script;

        var cleanup = () => {
          done = true;
          delete window[cbName];
          if (script && script.parentNode) script.remove();
        };

        window[cbName] = data => { cleanup(); resolve(data); };

        script = document.createElement('script');
        script.src = ENGINES[this.engine].suggest(q).replace('__cb', cbName);
        script.onerror = () => { cleanup(); reject(new Error('JSONP failed')); };
        document.body.appendChild(script);

        setTimeout(() => {
          if (!done) { cleanup(); reject(new Error('JSONP timeout')); }
        }, JSONP_TIMEOUT);
      });
    },

    _parseSuggestions(data) {
      if (!data) return [];
      if (this.engine === 'baidu') {
        return Array.isArray(data.s) ? data.s : [];
      }
      if (this.engine === 'bing') {
        try {
          return (data && data.AS && data.AS.Results && data.AS.Results[0] && data.AS.Results[0].Suggests || [])
            .map(item => item.Txt);
        } catch { return []; }
      }
      if (this.engine === 'google') {
        if (!Array.isArray(data) || !Array.isArray(data[1])) return [];
        return data[1].map(item => Array.isArray(item) ? item[0] : item).filter(Boolean);
      }
      if (this.engine === 'duckduckgo') {
        if (!Array.isArray(data)) return [];
        return data.map(item => {
          if (typeof item === 'string') return item;
          return item.phrase || item[0] || '';
        }).filter(Boolean);
      }
      return [];
    },

    selectSuggestion(dir) {
      if (!this.suggestions.length) return;
      var len = this.suggestions.length;

      if (this.selectedIndex === -1 && dir === -1) {
        this.selectedIndex = len - 1;
      } else if (this.selectedIndex === -1 && dir === 1) {
        this.selectedIndex = 0;
      } else {
        var next = this.selectedIndex + dir;
        if (next < 0 || next >= len) {
          this.selectedIndex = -1;
          return;
        }
        this.selectedIndex = next;
      }
      this.$nextTick(() => {
        var el = document.querySelector('[data-suggest-index="' + this.selectedIndex + '"]');
        if (el) el.scrollIntoView({ block: 'nearest' });
      });
    },

    confirmSuggestion() {
      if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
        this.query = this.suggestions[this.selectedIndex];
        this.suggestions = [];
        this.selectedIndex = -1;
      }
    },

    search(text) {
      var q;
      if (typeof text === 'string') {
        q = text.trim();
      } else if (this.selectedIndex >= 0 && this.suggestions[this.selectedIndex]) {
        q = this.suggestions[this.selectedIndex].trim();
      } else {
        q = this.query.trim();
      }
      if (!q) return;
      this.saveHistory(q);
      var win = window.open(this.engines[this.engine].url(q), '_blank');
      if (!win || win.closed) {
        this.showToast('请允许弹窗以完成搜索', 'error');
        return;
      }
      this.query = '';
      this.blurSearch();
    },

    blurSearch() {
      this.searchFocused = false;
      this.suggestions = [];
      this.selectedIndex = -1;
      this.engineMenuOpen = false;
      this.originalQuery = '';
    },

    // --- 导航管理 ---
    panelOpen: false,
    panelFocusIndex: -1,
    sites: [],
    formOpen: false,
    editingIndex: -1,
    formData: { name: '', url: '', icon: '' },
    confirmOpen: false,
    deleteIndex: -1,
    isBatchDelete: false,
    batchMode: false,
    selectedSites: [],
    dragIndex: -1,
    dragOverIndex: -1,
    dragOverSide: 'left',
    importExportOpen: false,
    importData: '',
    longPressIndex: -1,
    _longPressTimer: null,
    touchDragIndex: -1,
    _touchStartX: 0,
    _touchStartY: 0,
    panelTouchStartY: 0,
    panelTouchMoveY: 0,

    initSites() {
      try {
        var saved = storageGet('sites', null);
        if (Array.isArray(saved) && saved.length) {
          this.sites = saved.filter(s => s && typeof s.url === 'string' && s.url.trim());
          if (!this.sites.length) {
            this.sites = DEFAULT_SITES.map(s => ({ ...s }));
            this._saveSites();
          }
        } else {
          this.sites = DEFAULT_SITES.map(s => ({ ...s }));
          this._saveSites();
        }
      } catch (e) {
        console.warn('[简搜] 加载网站数据失败，使用默认值', e);
        this.sites = DEFAULT_SITES.map(s => ({ ...s }));
        this._saveSites();
      }
      this._ensureIds();
    },

    _ensureIds() {
      var changed = false;
      for (var i = 0; i < this.sites.length; i++) {
        if (!this.sites[i].id) { this.sites[i].id = generateId(); changed = true; }
      }
      if (changed) this._saveSites();
    },

    _saveSites() {
      storageSet('sites', this.sites);
    },

    onSiteTouchStart(index, e) {
      if (this.batchMode) return;
      this.dragOverIndex = -1;
      this.dragOverSide = 'left';
      var touch = e.touches[0];
      this._touchStartX = touch.clientX;
      this._touchStartY = touch.clientY;
      this._longPressTimer = setTimeout(() => {
        this.longPressIndex = index;
        this.touchDragIndex = index;
        if (navigator.vibrate) navigator.vibrate(50);
      }, LONG_PRESS_DELAY);
    },

    onSiteTouchEnd(index, e) {
      clearTimeout(this._longPressTimer);
      if (this.touchDragIndex !== -1 && this.dragOverIndex !== -1 && this.touchDragIndex !== this.dragOverIndex) {
        var toIndex = this.dragOverSide === 'right' ? this.dragOverIndex + 1 : this.dragOverIndex;
        var item = this.sites.splice(this.touchDragIndex, 1)[0];
        if (this.touchDragIndex < toIndex) toIndex--;
        this.sites.splice(toIndex, 0, item);
        this._saveSites();
      }
      this.touchDragIndex = -1;
      this.dragOverIndex = -1;
      this.dragOverSide = 'left';
      if (this.longPressIndex === index) {
        e.preventDefault();
      }
    },

    onSiteTouchMove(e) {
      if (this.touchDragIndex === -1) {
        var touch = e.touches[0];
        var dx = touch.clientX - this._touchStartX;
        var dy = touch.clientY - this._touchStartY;
        if (Math.abs(dx) > TOUCH_DEADZONE || Math.abs(dy) > TOUCH_DEADZONE) {
          clearTimeout(this._longPressTimer);
        }
        return;
      }
      clearTimeout(this._longPressTimer);
      e.preventDefault();
      var t = e.touches[0];
      var el = document.elementFromPoint(t.clientX, t.clientY);
      if (el) {
        var card = el.closest('[data-site-index]');
        if (card) {
          var idx = parseInt(card.dataset.siteIndex, 10);
          if (!isNaN(idx) && idx !== this.touchDragIndex) {
            this.dragOverIndex = idx;
            var rect = card.getBoundingClientRect();
            this.dragOverSide = t.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
          }
        }
      }
    },

    closeLongPress() {
      this.longPressIndex = -1;
    },

    openSite(index) {
      if (index < 0 || index >= this.sites.length) return;
      if (this.longPressIndex !== -1 || this.touchDragIndex !== -1) return;
      window.open(this.sites[index].url, '_blank');
    },

    openSiteForm() {
      this.editingIndex = -1;
      this.formData = { name: '', url: '', icon: '' };
      this.formOpen = true;
    },

    editSite(index) {
      if (index < 0 || index >= this.sites.length) return;
      this.editingIndex = index;
      var site = this.sites[index];
      var match = site.url.match(/^(https?:\/\/)(.*)/);
      this.formData = {
        name: site.name,
        url: match ? match[2] : site.url,
        icon: site.icon || ''
      };
      this.formOpen = true;
    },

    saveSite() {
      var url = this.formData.url.trim();
      if (!url) return;
      if (!/^https?:\/\//.test(url)) url = 'https://' + url;
      if (!isValidUrl(url)) {
        this.showToast('网址格式不正确', 'error');
        return;
      }

      var name = this.formData.name.trim();
      var site = {
        id: this.editingIndex >= 0 && this.editingIndex < this.sites.length
          ? this.sites[this.editingIndex].id : generateId(),
        name: name || (function () { try { return new URL(url).hostname; } catch { return url; } })(),
        url: url,
        icon: this.formData.icon.trim()
      };

      var isEdit = this.editingIndex >= 0 && this.editingIndex < this.sites.length;
      if (isEdit) {
        this.sites[this.editingIndex] = site;
      } else {
        this.sites.push(site);
      }

      this._saveSites();
      this.formOpen = false;
      this.showToast(isEdit ? '修改成功' : '添加成功', 'success');
    },

    deleteSite(index) {
      if (index < 0 || index >= this.sites.length) return;
      this.deleteIndex = index;
      this.isBatchDelete = false;
      this.confirmOpen = true;
    },

    confirmDelete() {
      if (this.isBatchDelete) {
        this.sites = this.sites.filter((_, i) => !this.selectedSites.includes(i));
        this._saveSites();
        this.showToast('已删除 ' + this.selectedSites.length + ' 个网站', 'success');
        this.selectedSites = [];
        this.batchMode = false;
      } else if (this.deleteIndex >= 0 && this.deleteIndex < this.sites.length) {
        this.sites.splice(this.deleteIndex, 1);
        this._saveSites();
        this.showToast('删除成功', 'success');
      }
      this.confirmOpen = false;
      this.deleteIndex = -1;
      this.isBatchDelete = false;
    },

    toggleBatchMode() {
      this.batchMode = !this.batchMode;
      this.selectedSites = [];
    },

    toggleSelectSite(index) {
      var idx = this.selectedSites.indexOf(index);
      if (idx === -1) {
        this.selectedSites.push(index);
      } else {
        this.selectedSites.splice(idx, 1);
      }
    },

    selectAllSites() {
      if (this.selectedSites.length === this.sites.length) {
        this.selectedSites = [];
      } else {
        this.selectedSites = this.sites.map((_, i) => i);
      }
    },

    batchDelete() {
      if (!this.selectedSites.length) {
        this.showToast('请先选择要删除的网站', 'error');
        return;
      }
      this.isBatchDelete = true;
      this.confirmOpen = true;
    },

    onDragStart(index, e) {
      if (this.batchMode) return;
      this.dragIndex = index;
      this.dragOverIndex = -1;
      this.dragOverSide = 'left';
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
      var el = e.target.closest('[data-site-index]');
      if (el) e.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2);
    },

    onDragOver(index, e) {
      if (this.batchMode || this.dragIndex === -1) return;
      e.preventDefault();
      this.dragOverIndex = index;
      var el = e.target.closest('[data-site-index]');
      if (el) {
        var rect = el.getBoundingClientRect();
        this.dragOverSide = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
      }
    },

    onDragEnd() {
      if (this.dragIndex !== -1 && this.dragOverIndex !== -1 && this.dragIndex !== this.dragOverIndex) {
        var toIndex = this.dragOverSide === 'right' ? this.dragOverIndex + 1 : this.dragOverIndex;
        var item = this.sites.splice(this.dragIndex, 1)[0];
        if (this.dragIndex < toIndex) toIndex--;
        this.sites.splice(toIndex, 0, item);
        this._saveSites();
      }
      this.dragIndex = -1;
      this.dragOverIndex = -1;
      this.dragOverSide = 'left';
    },

    openImportExport() {
      this.importData = '';
      this.importExportOpen = true;
    },

    exportSites() {
      var data = JSON.stringify(this.sites, null, 2);
      navigator.clipboard.writeText(data).then(() => {
        this.showToast('已复制到剪贴板', 'success');
      }).catch(() => {
        this.importData = data;
        this.showToast('请手动复制下方文本', 'success');
      });
    },

    importSites() {
      if (!this.importData.trim()) {
        this.showToast('请输入导入数据', 'error');
        return;
      }
      try {
        var data = JSON.parse(this.importData);
        if (!Array.isArray(data)) throw new Error('Invalid format');
        var valid = data.filter(s => {
          if (!s || typeof s.url !== 'string' || !s.url.trim()) return false;
          var url = s.url;
          if (!/^https?:\/\//.test(url)) url = 'https://' + url;
          return isValidUrl(url);
        });
        if (!valid.length) {
          this.showToast('没有有效的网站数据', 'error');
          return;
        }
        this.sites = valid.map(s => {
          var url = s.url;
          if (!/^https?:\/\//.test(url)) url = 'https://' + url;
          return { id: s.id || generateId(), name: s.name || '', url: url, icon: s.icon || '' };
        });
        this._saveSites();
        this.importExportOpen = false;
        this.showToast('成功导入 ' + valid.length + ' 个网站', 'success');
      } catch (e) {
        console.warn('[简搜] 导入数据解析失败', e);
        this.showToast('数据格式错误', 'error');
      }
    },

    importBookmarkFile(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = (ev) => {
        var html = ev.target.result;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var links = doc.querySelectorAll('a[href]');
        var seen = {};
        var newSites = [];
        for (var i = 0; i < links.length; i++) {
          var a = links[i];
          var href = a.getAttribute('href');
          if (!href || !/^https?:\/\//.test(href)) continue;
          if (seen[href]) continue;
          seen[href] = true;
          var name = (a.textContent || '').trim();
          if (!name) { try { name = new URL(href).hostname; } catch { continue; } }
          newSites.push({ id: generateId(), name: name, url: href, icon: '' });
        }
        if (!newSites.length) {
          this.showToast('未找到有效书签', 'error');
          return;
        }
        // 合并：保留现有站点，追加不重复的新书签
        var existingUrls = new Set(this.sites.map(s => s.url));
        var merged = newSites.filter(s => !existingUrls.has(s.url));
        this.sites = [...this.sites, ...merged];
        this._saveSites();
        this.importExportOpen = false;
        this.showToast(merged.length ? '已合并 ' + merged.length + ' 个书签' : '没有新书签需要导入', 'success');
      };
      reader.readAsText(file);
      e.target.value = '';
    },

    resetToDefault() {
      this.sites = DEFAULT_SITES.map(s => ({ ...s }));
      this._saveSites();
      this.selectedSites = [];
      this.batchMode = false;
      this.showToast('已恢复默认', 'success');
    },

    // --- 背景 ---
    bgLoaded: false,
    bgInfo: false,

    async initBackground() {
      var cached = storageGet('bgCache', null);
      if (cached) {
        if (this.$refs.bg) this.$refs.bg.style.backgroundImage = 'url(' + cached.url + ')';
        this._setBgInfo(cached.info);
        this.bgLoaded = true;
        if (cached.date !== todayStr()) this._fetchAndUpdateBg();
      } else {
        var ok = await this._fetchAndUpdateBg();
        this.bgLoaded = true;
        if (!ok && !(this.$refs.bg && this.$refs.bg.style.backgroundImage)) {
          this.showToast('壁纸加载失败，请检查网络', 'error');
        }
      }
    },

    _setBgInfo(info) {
      if (!info || !info.title) { this.bgInfo = false; return; }
      this.bgInfo = true;
      this.$nextTick(() => {
        var el = this.$refs.bgInfo;
        if (!el) return;
        el.innerHTML = '';
        var a = document.createElement('a');
        a.href = info.link || 'https://bing.com';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = info.copyright || '';
        a.textContent = info.title;
        el.appendChild(a);
      });
    },

    async _fetchAndUpdateBg() {
      var cached = storageGet('bgCache', null);

      for (var i = 0; i < CORS_PROXIES.length; i++) {
        try {
          var res = await fetch(CORS_PROXIES[i](BING_API));
          var data = await res.json();
          if (data && data.images && data.images[0]) {
            var img = data.images[0];
            var imageId = img.hsh || img.urlbase;
            if (cached && cached.id === imageId) return true;

            var url = 'https://www.bing.com' + img.url;
            await preloadImage(url);

            var title = sanitizeText(img.title || (img.copyright || '').split('(')[0].trim() || '');
            var copyright = sanitizeText(img.copyright || '');
            var link = sanitizeText(img.copyrightlink || 'https://bing.com');

            if (this.$refs.bg) this.$refs.bg.style.backgroundImage = 'url(' + url + ')';
            this._setBgInfo({ title, link, copyright });
            storageSet('bgCache', { url, info: { title, link, copyright }, id: imageId, date: todayStr() });
            return true;
          }
        } catch { /* 代理请求失败，尝试下一个 */ }
      }
      return false;
    },

    // --- 初始化 & 全局事件 ---

    getIcon: getIcon,

    handleIconError(el) {
      var idx = parseInt(el.dataset.faviconIdx, 10) || 0;
      var url = el.dataset.siteUrl;
      if (idx + 1 < ICON_SERVICES.length) {
        el.dataset.faviconIdx = idx + 1;
        el.src = getIcon(url, idx + 1);
      } else {
        el.style.display = 'none';
        var fallback = el.parentElement && el.parentElement.querySelector('.icon-fallback');
        if (fallback) fallback.style.display = 'flex';
      }
    },

    init() {
      this.initSearch();
      this.initSites();
      this.initBackground();
      this._startClock();
      this._bindGlobalEvents();
    },

    destroy() {
      if (this._clockTimer) clearInterval(this._clockTimer);
    },

    _startClock() {
      var update = () => {
        var now = new Date();
        this.time = [now.getHours(), now.getMinutes(), now.getSeconds()]
          .map(n => String(n).padStart(2, '0')).join(':');
      };
      update();
      this._clockTimer = setInterval(update, 1000);
    },

    _bindGlobalEvents() {
      document.addEventListener('contextmenu', e => {
        if (e.target.closest('input, textarea, [contenteditable]')) return;
        e.preventDefault();
        if (this.formOpen || this.confirmOpen) return;
        this.panelOpen = !this.panelOpen;
        if (this.panelOpen) this.panelFocusIndex = -1;
      });

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          if (this.confirmOpen) {
            this.confirmOpen = false;
          } else if (this.formOpen) {
            this.formOpen = false;
          } else if (this.panelOpen) {
            this.panelOpen = false;
          } else if (this.searchFocused) {
            this.blurSearch();
          }
        } else if (e.key === 'Backspace' && e.shiftKey && this.searchFocused) {
          e.preventDefault();
          this.query = '';
          this.suggestions = [];
          this.selectedIndex = -1;
        } else if (this.panelOpen && !this.formOpen && !this.confirmOpen && !this.batchMode) {
          this._handlePanelKeyboard(e);
        }
      });
    },

    _handlePanelKeyboard(e) {
      var cols = Math.floor((window.innerWidth - 40) / 110) || 4;
      var max = this.sites.length - 1;

      if (e.shiftKey && this.panelFocusIndex >= 0) {
        // Shift+Arrow: 重排站点
        var from = this.panelFocusIndex;
        var to = -1;
        switch (e.key) {
          case 'ArrowRight': to = from + 1; break;
          case 'ArrowLeft': to = from - 1; break;
          case 'ArrowDown': to = from + cols; break;
          case 'ArrowUp': to = from - cols; break;
        }
        if (to >= 0 && to < this.sites.length) {
          e.preventDefault();
          var item = this.sites.splice(from, 1)[0];
          this.sites.splice(to, 0, item);
          this._saveSites();
          this.panelFocusIndex = to;
        }
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          this.panelFocusIndex = this.panelFocusIndex === -1 ? 0 : Math.min(this.panelFocusIndex + 1, max);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.panelFocusIndex = this.panelFocusIndex === -1 ? 0 : Math.max(this.panelFocusIndex - 1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.panelFocusIndex = this.panelFocusIndex === -1 ? 0 : Math.min(this.panelFocusIndex + cols, max);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.panelFocusIndex = this.panelFocusIndex === -1 ? max : Math.max(this.panelFocusIndex - cols, 0);
          break;
        case 'Enter':
          if (this.panelFocusIndex >= 0 && this.panelFocusIndex < this.sites.length) {
            e.preventDefault();
            window.open(this.sites[this.panelFocusIndex].url, '_blank');
          }
          break;
        case 'Tab':
          e.preventDefault();
          this.panelFocusIndex = (this.panelFocusIndex + 1) % this.sites.length;
          break;
      }
    }

  }));
});
