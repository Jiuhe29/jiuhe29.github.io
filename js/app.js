const DEFAULT_SITES = [
  { name: '哔哩哔哩', url: 'https://www.bilibili.com', icon: '' },
  { name: '知乎', url: 'https://www.zhihu.com', icon: '' },
  { name: 'GitHub', url: 'https://github.com', icon: '' },
  { name: '抖音', url: 'https://www.douyin.com', icon: '' },
  { name: '淘宝', url: 'https://www.taobao.com', icon: '' },
  { name: 'QQ邮箱', url: 'https://mail.qq.com', icon: '' },
  { name: '百度网盘', url: 'https://pan.baidu.com', icon: '' },
  { name: '阿里云盘', url: 'https://www.aliyundrive.com', icon: '' }
];

const ENGINES = ['bing', 'baidu', 'google', 'duckduckgo'];

document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    time: '00:00:00',
    nightMode: false,
    autoNightMode: true,
    sunTimes: { sunrise: 6, sunset: 18 },
    bgLoaded: false,
    bgInfo: '',

    query: '',
    originalQuery: '',
    searchFocused: false,
    suggestions: [],
    searchHistory: [],
    showHistory: false,
    selectedIndex: -1,
    apiOnline: true,

    engine: 'bing',
    engineMenuOpen: false,
    engines: {
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
    },

    panelOpen: false,
    panelFocusIndex: -1,
    sites: [],

    formOpen: false,
    editingIndex: -1,
    formData: { name: '', url: '', icon: '' },

    confirmOpen: false,
    deleteIndex: -1,

    batchMode: false,
    selectedSites: [],
    dragIndex: -1,
    dragOverIndex: -1,
    importExportOpen: false,
    importData: '',

    longPressIndex: -1,
    _longPressTimer: null,

    _debounce: null,
    _jsonpId: 0,
    _fetchId: 0,

    touchStartY: 0,
    touchMoveY: 0,

    touchDragIndex: -1,
    touchDragEl: null,
    touchStartX: 0,
    touchStartYDrag: 0,

    onSiteTouchStart(index, e) {
      if (this.batchMode) return;
      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartYDrag = touch.clientY;
      this._longPressTimer = setTimeout(() => {
        this.longPressIndex = index;
        this.touchDragIndex = index;
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    },

    onSiteTouchEnd(index, e) {
      clearTimeout(this._longPressTimer);
      if (this.touchDragIndex !== -1 && this.dragOverIndex !== -1 && this.touchDragIndex !== this.dragOverIndex) {
        const item = this.sites.splice(this.touchDragIndex, 1)[0];
        this.sites.splice(this.dragOverIndex, 0, item);
        this.saveSites();
      }
      this.touchDragIndex = -1;
      this.dragOverIndex = -1;
      if (this.longPressIndex === index) {
        e.preventDefault();
      }
    },

    onSiteTouchMove(e) {
      clearTimeout(this._longPressTimer);
      if (this.touchDragIndex === -1) return;

      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el) {
        const card = el.closest('[data-site-index]');
        if (card) {
          const idx = parseInt(card.dataset.siteIndex, 10);
          if (!isNaN(idx) && idx !== this.touchDragIndex) {
            this.dragOverIndex = idx;
          }
        }
      }
    },

    closeLongPress() {
      this.longPressIndex = -1;
    },

    toast: false,
    toastMessage: '',
    toastType: 'success',
    _toastTimer: null,

    init() {
      this.loadSettings();
      this.loadSites();
      this.loadHistory();
      this.loadBackground();
      this.startClock();
      this.bindEvents();
      this.initAutoNightMode();
    },

    loadSettings() {
      const saved = localStorage.getItem('engine');
      this.engine = ENGINES.includes(saved) ? saved : 'bing';

      const nightModeSetting = localStorage.getItem('nightMode');
      if (nightModeSetting === 'auto' || nightModeSetting === null) {
        this.nightMode = this.shouldBeNight();
        this.autoNightMode = true;
      } else {
        this.nightMode = nightModeSetting === 'true';
        this.autoNightMode = false;
      }
    },

    loadSites() {
      try {
        const saved = localStorage.getItem('sites');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length) {
            this.sites = parsed.filter(s => s && typeof s.url === 'string' && s.url.trim());
            if (!this.sites.length) {
              this.sites = [...DEFAULT_SITES];
              this.saveSites();
            }
          } else {
            this.sites = [...DEFAULT_SITES];
            this.saveSites();
          }
        } else {
          this.sites = [...DEFAULT_SITES];
          this.saveSites();
        }
      } catch (e) {
        console.warn('[简搜] 加载网站数据失败，使用默认值', e);
        this.sites = [...DEFAULT_SITES];
        this.saveSites();
      }
    },

    saveSites() {
      localStorage.setItem('sites', JSON.stringify(this.sites));
    },

    loadHistory() {
      try {
        const saved = localStorage.getItem('searchHistory');
        this.searchHistory = saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.warn('[简搜] 加载搜索历史失败', e);
        this.searchHistory = [];
      }
    },

    saveHistory(query) {
      if (!query.trim()) return;
      this.searchHistory = [query, ...this.searchHistory.filter(h => h !== query)].slice(0, 10);
      localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    },

    clearHistory() {
      this.searchHistory = [];
      localStorage.removeItem('searchHistory');
      this.showToast('历史记录已清空', 'success');
    },

    removeHistoryItem(index) {
      this.searchHistory.splice(index, 1);
      localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    },

    showToast(message, type = 'success') {
      clearTimeout(this._toastTimer);
      this.toastMessage = message;
      this.toastType = type;
      this.toast = true;
      this._toastTimer = setTimeout(() => {
        this.toast = false;
      }, 2500);
    },

    async loadBackground() {
      const cached = this.getCachedBg();
      if (cached) {
        this.$refs.bg.style.backgroundImage = `url(${cached.url})`;
        this.bgInfo = cached.info;
        this.bgLoaded = true;
        this.fetchAndUpdateBg();
      } else {
        await this.fetchAndUpdateBg();
        this.bgLoaded = true;
      }
    },

    getCachedBg() {
      try {
        const data = localStorage.getItem('bgCache');
        return data ? JSON.parse(data) : null;
      } catch {
        return null; // localStorage 解析失败，返回 null 触发重新获取
      }
    },

    saveBgCache(url, info, id) {
      try {
        localStorage.setItem('bgCache', JSON.stringify({ url, info, id }));
      } catch { /* localStorage 可能满或不可用，静默忽略 */ }
    },

    async fetchAndUpdateBg() {
      const bingApi = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN';
      const proxies = [
        url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      ];

      const cached = this.getCachedBg();

      for (const proxy of proxies) {
        try {
          const res = await fetch(proxy(bingApi));
          const data = await res.json();
          if (data?.images?.[0]) {
            const img = data.images[0];
            const imageId = img.hsh || img.urlbase;

            if (cached?.id === imageId) return;

            const url = `https://www.bing.com${img.url}`;
            await this.preloadImage(url);

            const title = img.title || img.copyright?.split('(')[0]?.trim() || '';
            const copyright = img.copyright || '';
            const info = title
              ? `<a href="${img.copyrightlink || 'https://bing.com'}" target="_blank" title="${copyright}">${title}</a>`
              : '';

            this.$refs.bg.style.backgroundImage = `url(${url})`;
            this.bgInfo = info;
            this.saveBgCache(url, info, imageId);
            break;
          }
        } catch { /* 代理请求失败，尝试下一个 */ }
      }
    },

    preloadImage(url) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
    },

    startClock() {
      const update = () => {
        const now = new Date();
        this.time = [now.getHours(), now.getMinutes(), now.getSeconds()]
          .map(n => String(n).padStart(2, '0')).join(':');
      };
      update();
      setInterval(update, 1000);
    },

    bindEvents() {
      document.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (this.formOpen || this.confirmOpen) return;
        this.panelOpen = !this.panelOpen;
        if (this.panelOpen) this.panelFocusIndex = -1;
      });

      document.addEventListener('keydown', e => {
        if (e.key === 'F9') {
          e.preventDefault();
          this.toggleNight();
        } else if (e.key === 'Escape') {
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
          const cols = Math.floor((window.innerWidth - 40) / 110) || 4;
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.panelFocusIndex = Math.min(this.panelFocusIndex + 1, this.sites.length - 1);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.panelFocusIndex = Math.max(this.panelFocusIndex - 1, 0);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.panelFocusIndex = Math.min(this.panelFocusIndex + cols, this.sites.length - 1);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.panelFocusIndex = Math.max(this.panelFocusIndex - cols, 0);
          } else if (e.key === 'Enter' && this.panelFocusIndex >= 0) {
            e.preventDefault();
            window.open(this.sites[this.panelFocusIndex].url, '_blank');
          } else if (e.key === 'Tab') {
            e.preventDefault();
            this.panelFocusIndex = (this.panelFocusIndex + 1) % this.sites.length;
          }
        }
      });
    },

    toggleNight() {
      this.nightMode = !this.nightMode;
      this.autoNightMode = false;
      localStorage.setItem('nightMode', String(this.nightMode));
    },

    shouldBeNight() {
      const hour = new Date().getHours();
      return hour < this.sunTimes.sunrise || hour >= this.sunTimes.sunset;
    },

    initAutoNightMode() {
      this.fetchLocationByIP();

      setInterval(() => {
        if (this.autoNightMode) {
          const shouldBe = this.shouldBeNight();
          if (this.nightMode !== shouldBe) {
            this.nightMode = shouldBe;
          }
        }
      }, 60000);
    },

    async fetchLocationByIP() {
      const apis = [
        { url: 'https://ipapi.co/json/', parse: d => ({ lat: d.latitude, lng: d.longitude }) },
        { url: 'https://ip-api.com/json/', parse: d => ({ lat: d.lat, lng: d.lon }) },
        { url: 'https://ipwho.is/', parse: d => ({ lat: d.latitude, lng: d.longitude }) }
      ];

      for (const api of apis) {
        try {
          const res = await fetch(api.url);
          const data = await res.json();
          const { lat, lng } = api.parse(data);
          if (lat && lng) {
            this.calculateSunTimes(lat, lng);
            return;
          }
        } catch { /* IP 定位 API 失败，尝试下一个 */ }
      }
    },

    calculateSunTimes(lat, lng) {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const diff = now - start;
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);

      const zenith = 90.833;
      const D2R = Math.PI / 180;
      const R2D = 180 / Math.PI;

      const lngHour = lng / 15;

      const calcSunTime = (rising) => {
        const t = dayOfYear + ((rising ? 6 : 18) - lngHour) / 24;
        const M = (0.9856 * t) - 3.289;
        let L = M + (1.916 * Math.sin(M * D2R)) + (0.020 * Math.sin(2 * M * D2R)) + 282.634;
        L = L % 360;

        let RA = R2D * Math.atan(0.91764 * Math.tan(L * D2R));
        RA = RA % 360;

        const Lquadrant = Math.floor(L / 90) * 90;
        const RAquadrant = Math.floor(RA / 90) * 90;
        RA = RA + (Lquadrant - RAquadrant);
        RA = RA / 15;

        const sinDec = 0.39782 * Math.sin(L * D2R);
        const cosDec = Math.cos(Math.asin(sinDec));

        const cosH = (Math.cos(zenith * D2R) - (sinDec * Math.sin(lat * D2R))) / (cosDec * Math.cos(lat * D2R));
        if (cosH > 1 || cosH < -1) return rising ? 6 : 18;

        let H = R2D * Math.acos(cosH);
        H = rising ? 360 - H : H;
        H = H / 15;

        let T = H + RA - (0.06571 * t) - 6.622;
        let UT = T - lngHour;
        UT = UT % 24;
        if (UT < 0) UT += 24;

        const offset = now.getTimezoneOffset() / -60;
        return Math.round(UT + offset);
      };

      this.sunTimes.sunrise = calcSunTime(true);
      this.sunTimes.sunset = calcSunTime(false);

      if (this.autoNightMode) {
        this.nightMode = this.shouldBeNight();
      }
    },

    blurSearch() {
      this.searchFocused = false;
      this.suggestions = [];
      this.selectedIndex = -1;
      this.engineMenuOpen = false;
      this.originalQuery = '';
    },

    closeSearch() {
      this.blurSearch();
    },

    setEngine(key) {
      if (!ENGINES.includes(key)) return;
      this.engine = key;
      this.engineMenuOpen = false;
      localStorage.setItem('engine', key);
      if (this.query.trim()) this.fetchSuggestions();
    },

    onInput() {
      clearTimeout(this._debounce);
      this.selectedIndex = -1;
      this.originalQuery = this.query;
      this.showHistory = false;
      if (!this.query.trim()) {
        this.suggestions = [];
        return;
      }
      this._debounce = setTimeout(() => this.fetchSuggestions(), 200);
    },

    async fetchSuggestions() {
      const q = this.query.trim();
      if (!q) return;

      const fetchId = ++this._fetchId;

      try {
        const engine = this.engines[this.engine];
        const data = await this.jsonp(engine.suggest(q));

        if (fetchId !== this._fetchId) return;

        const results = this.parseSuggestions(data);
        this.suggestions = results.slice(0, 8);
        this.apiOnline = true;
      } catch {
        if (fetchId !== this._fetchId) return;
        this.apiOnline = false; // 搜索建议 API 离线
      }
    },

    parseSuggestions(data) {
      if (!data) return [];

      if (this.engine === 'baidu') {
        return Array.isArray(data.s) ? data.s : [];
      }

      if (this.engine === 'bing') {
        try {
          const items = data?.AS?.Results?.[0]?.Suggests || [];
          return items.map(item => item.Txt);
        } catch {
          return []; // Bing 建议解析失败
        }
      }

      if (this.engine === 'google') {
        return Array.isArray(data?.[1]) ? data[1] : [];
      }

      if (this.engine === 'duckduckgo') {
        if (Array.isArray(data)) {
          return data.map(item => item.phrase || item).filter(Boolean);
        }
        return [];
      }

      return [];
    },

    jsonp(url) {
      return new Promise((resolve, reject) => {
        const id = ++this._jsonpId;
        const cbName = `__jsonp${id}`;
        let done = false;

        const cleanup = () => {
          done = true;
          delete window[cbName];
          if (script.parentNode) script.remove();
        };

        window[cbName] = data => {
          cleanup();
          resolve(data);
        };

        const script = document.createElement('script');
        script.src = url.replace('__cb', cbName);
        script.onerror = () => {
          cleanup();
          reject(new Error('JSONP failed'));
        };

        document.body.appendChild(script);

        setTimeout(() => {
          if (!done) {
            cleanup();
            reject(new Error('JSONP timeout'));
          }
        }, 5000);
      });
    },

    selectSuggestion(dir) {
      if (!this.suggestions.length) return;

      const len = this.suggestions.length;
      if (this.selectedIndex === -1 && dir === -1) {
        this.selectedIndex = len - 1;
      } else if (this.selectedIndex === -1 && dir === 1) {
        this.selectedIndex = 0;
      } else {
        const next = this.selectedIndex + dir;
        if (next < 0 || next >= len) {
          this.selectedIndex = -1;
          this.query = this.originalQuery;
          return;
        }
        this.selectedIndex = next;
      }
      this.query = this.suggestions[this.selectedIndex];
    },

    search(text) {
      const q = (typeof text === 'string' ? text : this.query).trim();
      if (!q) return;
      this.saveHistory(q);
      window.open(this.engines[this.engine].url(q), '_blank');
      this.query = '';
      this.blurSearch();
    },

    getIcon(url) {
      try {
        const host = new URL(url).hostname;
        return `https://icons.duckduckgo.com/ip3/${host}.ico`;
      } catch {
        return 'favicon.ico'; // URL 解析失败，使用默认图标
      }
    },

    openSiteForm() {
      this.editingIndex = -1;
      this.formData = { name: '', url: '', icon: '' };
      this.formOpen = true;
    },

    editSite(index) {
      if (index < 0 || index >= this.sites.length) return;
      this.editingIndex = index;
      const site = this.sites[index];
      this.formData = {
        name: site.name,
        url: site.url.replace(/^https?:\/\//, ''),
        icon: site.icon || ''
      };
      this.formOpen = true;
    },

    saveSite() {
      let url = this.formData.url.trim();
      if (!url) return;

      if (!/^https?:\/\//.test(url)) url = 'https://' + url;

      try {
        new URL(url);
      } catch {
        this.showToast('网址格式不正确', 'error');
        return;
      }

      const name = this.formData.name.trim();
      const site = {
        name: name || (() => { try { return new URL(url).hostname; } catch { return url; } })(),
        url,
        icon: this.formData.icon.trim()
      };

      const isEdit = this.editingIndex >= 0 && this.editingIndex < this.sites.length;
      if (isEdit) {
        this.sites[this.editingIndex] = site;
      } else {
        this.sites.push(site);
      }

      this.saveSites();
      this.formOpen = false;
      this.showToast(isEdit ? '修改成功' : '添加成功', 'success');
    },

    deleteSite(index) {
      if (index < 0 || index >= this.sites.length) return;
      this.deleteIndex = index;
      this.confirmOpen = true;
    },

    confirmDelete() {
      if (this.deleteIndex >= 0 && this.deleteIndex < this.sites.length) {
        this.sites.splice(this.deleteIndex, 1);
        this.saveSites();
        this.showToast('删除成功', 'success');
      } else if (this.deleteIndex === -999) {
        this.sites = this.sites.filter((_, i) => !this.selectedSites.includes(i));
        this.saveSites();
        this.showToast(`已删除 ${this.selectedSites.length} 个网站`, 'success');
        this.selectedSites = [];
        this.batchMode = false;
      }
      this.confirmOpen = false;
      this.deleteIndex = -1;
    },

    toggleBatchMode() {
      this.batchMode = !this.batchMode;
      this.selectedSites = [];
    },

    toggleSelectSite(index) {
      const idx = this.selectedSites.indexOf(index);
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
      this.deleteIndex = -999;
      this.confirmOpen = true;
    },

    onDragStart(index, e) {
      if (this.batchMode) return;
      this.dragIndex = index;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
    },

    onDragOver(index, e) {
      if (this.batchMode || this.dragIndex === -1) return;
      e.preventDefault();
      this.dragOverIndex = index;
    },

    onDragEnd() {
      if (this.dragIndex !== -1 && this.dragOverIndex !== -1 && this.dragIndex !== this.dragOverIndex) {
        const item = this.sites.splice(this.dragIndex, 1)[0];
        this.sites.splice(this.dragOverIndex, 0, item);
        this.saveSites();
      }
      this.dragIndex = -1;
      this.dragOverIndex = -1;
    },

    openImportExport() {
      this.importData = '';
      this.importExportOpen = true;
    },

    exportSites() {
      const data = JSON.stringify(this.sites, null, 2);
      navigator.clipboard.writeText(data).then(() => {
        this.showToast('已复制到剪贴板', 'success');
      }).catch(() => {
        this.importData = data;
        this.showToast('请手动复制', 'error');
      });
    },

    importSites() {
      if (!this.importData.trim()) {
        this.showToast('请输入导入数据', 'error');
        return;
      }
      try {
        const data = JSON.parse(this.importData);
        if (!Array.isArray(data)) throw new Error();
        const valid = data.filter(s => s && typeof s.url === 'string' && s.url.trim());
        if (!valid.length) {
          this.showToast('没有有效的网站数据', 'error');
          return;
        }
        this.sites = valid.map(s => ({
          name: s.name || '',
          url: s.url,
          icon: s.icon || ''
        }));
        this.saveSites();
        this.importExportOpen = false;
        this.showToast(`成功导入 ${valid.length} 个网站`, 'success');
      } catch (e) {
        console.warn('[简搜] 导入数据解析失败', e);
        this.showToast('数据格式错误', 'error');
      }
    },

    resetToDefault() {
      this.sites = [...DEFAULT_SITES];
      this.saveSites();
      this.selectedSites = [];
      this.batchMode = false;
      this.showToast('已恢复默认', 'success');
    }
  }));
});
