/**
 * 简搜 - 搜索功能
 */
(function(ns) {
  'use strict';

  var C = ns.C;
  var U = ns.U;

  ns.searchMixin = {

    // --- 搜索状态 ---
    query: '',
    originalQuery: '',
    searchFocused: false,
    suggestions: [],
    searchHistory: [],
    selectedIndex: -1,
    engine: 'bing',
    engineMenuOpen: false,
    engineMenuIndex: -1,
    engines: C.ENGINES,
    engineKeys: C.ENGINE_KEYS,
    shortcutsOpen: false,
    _debounce: null,
    _fetchId: 0,
    _jsonpCleanup: null,

    // --- 初始化 ---

    initSearch() {
      var saved = U.storageGetRaw('engine');
      this.engine = C.ENGINE_KEYS.includes(saved) ? saved : 'bing';
      this.searchHistory = U.storageGet('searchHistory', []);
    },

    // --- 搜索历史 ---

    saveHistory(query) {
      if (!query.trim()) return;
      this.searchHistory = [query, ...this.searchHistory.filter(h => h !== query)].slice(0, C.MAX_HISTORY);
      if (!U.storageSet('searchHistory', this.searchHistory)) {
        this.showToast('历史记录保存失败，请检查浏览器存储', 'error');
      }
    },

    clearHistory() {
      this.searchHistory = [];
      if (!U.storageSet('searchHistory', [])) {
        this.showToast('历史记录清空失败，请检查浏览器存储', 'error');
      } else {
        this.showToast('历史记录已清空', 'success');
      }
    },

    removeHistoryItem(index) {
      this.searchHistory.splice(index, 1);
      if (!U.storageSet('searchHistory', this.searchHistory)) {
        this.showToast('历史记录保存失败', 'error');
      }
    },

    // --- 搜索引擎 ---

    setEngine(key) {
      if (!C.ENGINE_KEYS.includes(key)) return;
      this.engine = key;
      this.engineMenuOpen = false;
      this.engineMenuIndex = -1;
      if (!U.storageSetRaw('engine', key)) {
        this.showToast('设置保存失败', 'error');
      }
      if (this.query.trim()) this.fetchSuggestions();
    },

    cycleEngine(dir) {
      var idx = C.ENGINE_KEYS.indexOf(this.engine);
      if (idx === -1) idx = 0;
      var next = (idx + dir + C.ENGINE_KEYS.length) % C.ENGINE_KEYS.length;
      this.setEngine(C.ENGINE_KEYS[next]);
    },

    toggleEngineMenu() {
      this.engineMenuOpen = !this.engineMenuOpen;
      if (this.engineMenuOpen) {
        this.engineMenuIndex = C.ENGINE_KEYS.indexOf(this.engine);
      } else {
        this.engineMenuIndex = -1;
      }
    },

    // --- 搜索建议 ---

    onInput() {
      clearTimeout(this._debounce);
      this.selectedIndex = -1;
      this.originalQuery = this.query;
      if (!this.query.trim()) {
        this.suggestions = [];
        return;
      }
      this._debounce = setTimeout(() => this.fetchSuggestions(), C.DEBOUNCE_DELAY);
    },

    async fetchSuggestions() {
      var q = this.query.trim();
      if (!q) return;
      if (this._jsonpCleanup) {
        this._jsonpCleanup();
        this._jsonpCleanup = null;
      }
      var fetchId = ++this._fetchId;

      try {
        var data;
        try {
          data = await this._fetchSuggest(q);
        } catch {
          data = await this._jsonpSuggest(q);
        }
        if (fetchId !== this._fetchId) return;
        this.suggestions = this._parseSuggestions(data);
      } catch {
        // 搜索建议 API 离线，静默处理
      }
    },

    _fetchSuggest(q) {
      var url = C.ENGINES[this.engine].suggest(q)
        .replace(/[?&](cb|callback)=__cb/, '')
        .replace(/\?&/, '?')
        .replace(/[?&]$/, '');
      return U.fetchWithTimeout(url, C.FETCH_TIMEOUT).then(r => {
        if (!r.ok) throw new Error('Suggest fetch failed');
        return r.json();
      });
    },

    _jsonpSuggest(q) {
      var self = this;
      return new Promise(function(resolve, reject) {
        var cbName = '__jiansou_cb' + Date.now() + Math.random().toString(36).slice(2, 6);
        var done = false;
        var script;

        var cleanup = function() {
          if (done) return;
          done = true;
          delete window[cbName];
          if (script && script.parentNode) script.remove();
          if (self._jsonpCleanup === cleanup) self._jsonpCleanup = null;
        };

        self._jsonpCleanup = cleanup;
        window[cbName] = function(data) { cleanup(); resolve(data); };

        script = document.createElement('script');
        script.src = C.ENGINES[self.engine].suggest(q).replace('__cb', cbName);
        script.onerror = function() { cleanup(); reject(new Error('JSONP failed')); };
        document.body.appendChild(script);

        setTimeout(function() {
          if (!done) { cleanup(); reject(new Error('JSONP timeout')); }
        }, C.JSONP_TIMEOUT);
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

    // --- 建议选择 ---

    selectSuggestion(dir) {
      if (this.suggestions.length) {
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
        return;
      }

      if (!this.query && this.searchHistory.length) {
        var hlen = this.searchHistory.length;
        if (this.selectedIndex === -1 && dir === -1) {
          this.selectedIndex = hlen - 1;
        } else if (this.selectedIndex === -1 && dir === 1) {
          this.selectedIndex = 0;
        } else {
          var hnext = this.selectedIndex + dir;
          if (hnext < 0 || hnext >= hlen) {
            this.selectedIndex = -1;
            return;
          }
          this.selectedIndex = hnext;
        }
        this.query = this.searchHistory[this.selectedIndex];
        this.$nextTick(() => {
          var el = document.querySelector('[data-history-index="' + this.selectedIndex + '"]');
          if (el) el.scrollIntoView({ block: 'nearest' });
        });
      }
    },

    confirmSuggestion() {
      if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
        this.query = this.suggestions[this.selectedIndex];
        this.suggestions = [];
        this.selectedIndex = -1;
      }
    },

    // --- 执行搜索 ---

    search(text) {
      var q;
      if (typeof text === 'string') {
        q = text.trim();
      } else if (this.selectedIndex >= 0 && this.suggestions[this.selectedIndex]) {
        q = this.suggestions[this.selectedIndex].trim();
      } else if (this.selectedIndex >= 0 && !this.suggestions.length && this.searchHistory[this.selectedIndex]) {
        q = this.searchHistory[this.selectedIndex].trim();
      } else {
        q = this.query.trim();
      }
      if (!q) return;
      this.saveHistory(q);
      var url = this.engines[this.engine].url(q);
      if (U.openUrl(url) === 'tab') {
        this.query = '';
        this.blurSearch();
      } else {
        this.showToast('弹窗被拦截，正在当前页打开…', 'success');
      }
    },

    blurSearch() {
      this.searchFocused = false;
      this.suggestions = [];
      this.selectedIndex = -1;
      this.engineMenuOpen = false;
      this.engineMenuIndex = -1;
      this.originalQuery = '';
      if (this.$refs.searchInput) this.$refs.searchInput.blur();
    }
  };

})(window.JianSou);
