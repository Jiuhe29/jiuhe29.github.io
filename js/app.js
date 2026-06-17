/**
 * 简搜 - 应用入口
 * 合并所有功能模块，管理全局状态和初始化
 */
document.addEventListener('alpine:init', () => {

  var C = JianSou.C;
  var U = JianSou.U;

  Alpine.data('app', () => ({

    // 合并功能模块
    ...JianSou.searchMixin,
    ...JianSou.sitesMixin,
    ...JianSou.backgroundMixin,

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
      this._toastTimer = setTimeout(() => { this.toast = false; }, C.TOAST_DURATION);
    },

    // --- 全局交互 ---

    onContextMenu(e) {
      if (e.target.closest('a')) return;
      if (e.target.closest('[role="dialog"], [role="alertdialog"]')) return;
      e.preventDefault();
      if (this.formOpen || this.confirmOpen || this.importExportOpen) return;
      if (this.panelOpen) this.closePanel();
      else this.openPanel();
    },

    isSceneDimmed() {
      return this.panelOpen || this.searchFocused;
    },

    getIcon: U.getIcon,

    handleIconError(el) {
      var idx = parseInt(el.dataset.faviconIdx, 10) || 0;
      var url = el.dataset.siteUrl;
      if (idx + 1 < C.ICON_SERVICES.length) {
        el.dataset.faviconIdx = idx + 1;
        el.src = U.getIcon(url, idx + 1);
      } else {
        el.style.display = 'none';
        var fallback = el.parentElement && el.parentElement.querySelector('.icon-fallback');
        if (fallback) fallback.style.display = 'flex';
      }
    },

    // --- 初始化 ---

    _initialized: false,
    _onKeydown: null,

    init() {
      if (this._initialized) return;
      this._initialized = true;
      U.runMigrations();
      this._installPwaMeta();
      this._warnFileProtocol();
      this.initSearch();
      this.initSites();
      this.initBackground();
      this._startClock();
      this._bindGlobalEvents();
      this._registerServiceWorker();
    },

    destroy() {
      clearTimeout(this._debounce);
      clearTimeout(this._toastTimer);
      clearTimeout(this._longPressTimer);
      if (this._clockTimer) clearInterval(this._clockTimer);
      if (this._jsonpCleanup) this._jsonpCleanup();
      if (this._onKeydown) document.removeEventListener('keydown', this._onKeydown);
    },

    // --- PWA ---

    _installPwaMeta() {
      if (!U.isHttpContext()) return;
      if (!document.querySelector('link[rel="manifest"]')) {
        var link = document.createElement('link');
        link.rel = 'manifest';
        link.href = new URL('manifest.json', document.baseURI).href;
        document.head.appendChild(link);
      }
    },

    _warnFileProtocol() {
      if (!U.isFileProtocol()) return;
      if (sessionStorage.getItem('jiansou-file-warn')) return;
      sessionStorage.setItem('jiansou-file-warn', '1');
      console.info('[简搜] 请使用本地服务器打开：在项目目录运行 npx serve . ，然后访问 http://localhost:3000');
      this.showToast('请通过 http://localhost 打开（运行 npx serve .）', 'error');
    },

    _registerServiceWorker() {
      if (!U.isHttpContext() || !('serviceWorker' in navigator)) return;
      var version = typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'dev';
      var swUrl = new URL('sw.js', document.baseURI);
      swUrl.searchParams.set('v', version);
      navigator.serviceWorker.register(swUrl.href).catch(err => {
        console.warn('[简搜] Service Worker 注册失败', err);
      });
    },

    // --- 时钟 ---

    _startClock() {
      var update = () => {
        var now = new Date();
        this.time = [now.getHours(), now.getMinutes(), now.getSeconds()]
          .map(n => String(n).padStart(2, '0')).join(':');
      };
      update();
      this._clockTimer = setInterval(update, 1000);
    },

    // --- 全局键盘事件 ---

    _bindGlobalEvents() {
      this._onKeydown = e => {
        if (this.engineMenuOpen && this._handleEngineMenuKeyboard(e)) return;

        if (e.key === 'Escape') {
          if (this.confirmOpen) {
            this.confirmOpen = false;
          } else if (this.formOpen) {
            this.formOpen = false;
          } else if (this.importExportOpen) {
            this.importExportOpen = false;
          } else if (this.engineMenuOpen) {
            this.engineMenuOpen = false;
            this.engineMenuIndex = -1;
          } else if (this.panelOpen) {
            this.closePanel();
          } else if (this.shortcutsOpen) {
            this.shortcutsOpen = false;
          } else if (this.searchFocused) {
            this.blurSearch();
          }
        } else if (e.key === 'Backspace' && e.shiftKey && this.searchFocused) {
          e.preventDefault();
          this.query = '';
          this.suggestions = [];
          this.selectedIndex = -1;
        } else if (this.panelOpen && !this.formOpen && !this.confirmOpen && !this.importExportOpen && !this.batchMode
          && document.activeElement !== this.$refs.siteFilterInput) {
          this._handlePanelKeyboard(e);
        }
      };

      document.addEventListener('keydown', this._onKeydown);
    },

    _handleEngineMenuKeyboard(e) {
      var len = C.ENGINE_KEYS.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.engineMenuIndex = this.engineMenuIndex === -1 ? 0
          : (this.engineMenuIndex + 1) % len;
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.engineMenuIndex = this.engineMenuIndex === -1 ? len - 1
          : (this.engineMenuIndex - 1 + len) % len;
        return true;
      }
      if (e.key === 'Enter' && this.engineMenuIndex >= 0) {
        e.preventDefault();
        this.setEngine(C.ENGINE_KEYS[this.engineMenuIndex]);
        return true;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.engineMenuOpen = false;
        this.engineMenuIndex = -1;
        return true;
      }
      return false;
    },

    _handlePanelKeyboard(e) {
      var cols = this._getPanelCols();
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
          this._moveSiteTo(from, to);
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
            U.openUrl(this.sites[this.panelFocusIndex].url);
          }
          break;
        case 'Tab':
          if (!this.sites.length) return;
          e.preventDefault();
          this.panelFocusIndex = (this.panelFocusIndex + 1) % this.sites.length;
          break;
      }
    }

  }));
});
