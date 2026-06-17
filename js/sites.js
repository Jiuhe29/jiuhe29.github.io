/**
 * 简搜 - 网站管理
 */
(function(ns) {
  'use strict';

  var C = ns.C;
  var U = ns.U;

  ns.sitesMixin = {

    // --- 导航管理状态 ---
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
    siteFilter: '',
    _filteredCache: null,
    _filteredCacheKey: '',

    // --- 筛选 ---

    getFilteredSites() {
      var q = this.siteFilter.trim().toLowerCase();
      var key = q + '\0' + this.sites.map(s => s.id).join(',');
      if (this._filteredCacheKey === key && this._filteredCache) return this._filteredCache;
      var list = this.sites.map((s, i) => ({ site: s, index: i }));
      if (q) {
        list = list.filter(({ site }) =>
          (site.name && site.name.toLowerCase().includes(q)) ||
          (site.url && site.url.toLowerCase().includes(q))
        );
      }
      this._filteredCacheKey = key;
      this._filteredCache = list;
      return list;
    },

    // --- 面板控制 ---

    openPanel() {
      this.blurSearch();
      this.siteFilter = '';
      this.panelOpen = true;
      this.panelFocusIndex = -1;
      this.shortcutsOpen = false;
      this.$nextTick(() => this.$refs.siteFilterInput?.focus());
    },

    closePanel() {
      this.panelOpen = false;
      this.siteFilter = '';
      this.panelFocusIndex = -1;
      this.longPressIndex = -1;
      this.touchDragIndex = -1;
      this.dragIndex = -1;
      this.dragOverIndex = -1;
      if (this.batchMode) {
        this.batchMode = false;
        this.selectedSites = [];
      }
    },

    // --- 网站数据 ---

    initSites() {
      try {
        var saved = U.storageGet('sites', null);
        if (Array.isArray(saved) && saved.length) {
          this.sites = saved.filter(s => s && typeof s.url === 'string' && s.url.trim());
          if (!this.sites.length) {
            this.sites = C.DEFAULT_SITES.map(s => ({ ...s }));
            this._saveSites();
          }
        } else {
          this.sites = C.DEFAULT_SITES.map(s => ({ ...s }));
          this._saveSites();
        }
      } catch (e) {
        console.warn('[简搜] 加载网站数据失败，使用默认值', e);
        this.sites = C.DEFAULT_SITES.map(s => ({ ...s }));
        this._saveSites();
      }
      this._ensureIds();
    },

    _ensureIds() {
      var changed = false;
      for (var i = 0; i < this.sites.length; i++) {
        if (!this.sites[i].id) { this.sites[i].id = U.generateId(); changed = true; }
      }
      if (changed) this._saveSites();
    },

    _saveSites() {
      if (!U.storageSet('sites', this.sites)) {
        this.showToast('保存失败，请检查浏览器存储空间', 'error');
      }
    },

    // --- 排序 ---

    _reorderSite(from, over, side) {
      if (from === -1 || over === -1 || from === over) return;
      var toIndex = side === 'right' ? over + 1 : over;
      var item = this.sites.splice(from, 1)[0];
      if (from < toIndex) toIndex--;
      this.sites.splice(toIndex, 0, item);
      this._saveSites();
    },

    _moveSiteTo(from, to) {
      if (from === to || from < 0 || to < 0 || from >= this.sites.length || to >= this.sites.length) return;
      var item = this.sites.splice(from, 1)[0];
      this.sites.splice(to, 0, item);
      this._saveSites();
    },

    _getPanelCols() {
      var grid = this.$refs.siteGrid;
      if (!grid) return 4;
      var cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
      return cols || 4;
    },

    // --- 触摸交互 ---

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
      }, C.LONG_PRESS_DELAY);
    },

    onSiteTouchEnd(index, e) {
      clearTimeout(this._longPressTimer);
      if (this.touchDragIndex !== -1 && this.dragOverIndex !== -1 && this.touchDragIndex !== this.dragOverIndex) {
        this._reorderSite(this.touchDragIndex, this.dragOverIndex, this.dragOverSide);
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
        if (Math.abs(dx) > C.TOUCH_DEADZONE || Math.abs(dy) > C.TOUCH_DEADZONE) {
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

    // --- 打开网站 ---

    openSite(index) {
      if (index < 0 || index >= this.sites.length) return;
      if (this.longPressIndex !== -1 || this.touchDragIndex !== -1) return;
      U.openUrl(this.sites[index].url);
    },

    // --- 表单操作 ---

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
      if (!U.isValidUrl(url)) {
        this.showToast('网址格式不正确', 'error');
        return;
      }

      var name = this.formData.name.trim();
      var icon = U.safeHttpUrl(this.formData.icon.trim(), '');
      if (this.formData.icon.trim() && !icon) {
        this.showToast('图标地址须为 http 或 https 链接', 'error');
        return;
      }
      var site = {
        id: this.editingIndex >= 0 && this.editingIndex < this.sites.length
          ? this.sites[this.editingIndex].id : U.generateId(),
        name: name || (function() { try { return new URL(url).hostname; } catch { return url; } })(),
        url: url,
        icon: icon
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

    // --- 删除操作 ---

    deleteSite(index) {
      if (index < 0 || index >= this.sites.length) return;
      this.deleteIndex = index;
      this.isBatchDelete = false;
      this.confirmOpen = true;
    },

    confirmDelete() {
      if (this.isBatchDelete) {
        var count = this.selectedSites.length;
        this.sites = this.sites.filter(s => !this.selectedSites.includes(s.id));
        this._saveSites();
        this.showToast('已删除 ' + count + ' 个网站', 'success');
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

    // --- 批量操作 ---

    toggleBatchMode() {
      this.batchMode = !this.batchMode;
      this.selectedSites = [];
    },

    toggleSelectSite(index) {
      if (index < 0 || index >= this.sites.length) return;
      var id = this.sites[index].id;
      var idx = this.selectedSites.indexOf(id);
      if (idx === -1) {
        this.selectedSites.push(id);
      } else {
        this.selectedSites.splice(idx, 1);
      }
    },

    selectAllSites() {
      if (this.selectedSites.length === this.sites.length) {
        this.selectedSites = [];
      } else {
        this.selectedSites = this.sites.map(s => s.id);
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

    // --- 拖拽排序 ---

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
        this._reorderSite(this.dragIndex, this.dragOverIndex, this.dragOverSide);
      }
      this.dragIndex = -1;
      this.dragOverIndex = -1;
      this.dragOverSide = 'left';
    },

    // --- 导入导出 ---

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
          return U.isValidUrl(url);
        });
        if (!valid.length) {
          this.showToast('没有有效的网站数据', 'error');
          return;
        }
        var existingUrls = new Set(this.sites.map(s => s.url));
        var merged = valid.filter(s => {
          var url = s.url;
          if (!/^https?:\/\//.test(url)) url = 'https://' + url;
          return !existingUrls.has(url);
        }).map(s => {
          var url = s.url;
          if (!/^https?:\/\//.test(url)) url = 'https://' + url;
          return {
            id: s.id || U.generateId(),
            name: s.name || '',
            url: url,
            icon: U.safeHttpUrl(s.icon || '', '') || ''
          };
        });
        if (!merged.length) {
          this.showToast('没有新网站需要导入', 'success');
          this.importExportOpen = false;
          return;
        }
        this.sites = [...this.sites, ...merged];
        this._saveSites();
        this.importExportOpen = false;
        this.showToast('已合并 ' + merged.length + ' 个网站', 'success');
      } catch (e) {
        console.warn('[简搜] 导入数据解析失败', e);
        this.showToast('数据格式错误', 'error');
      }
    },

    importBookmarkFile(e) {
      var file = e.target.files[0];
      if (!file) return;
      var self = this;
      var reader = new FileReader();
      reader.onload = function(ev) {
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
          newSites.push({ id: U.generateId(), name: name, url: href, icon: '' });
        }
        if (!newSites.length) {
          self.showToast('未找到有效书签', 'error');
          return;
        }
        // 合并：保留现有站点，追加不重复的新书签
        var existingUrls = new Set(self.sites.map(s => s.url));
        var merged = newSites.filter(s => !existingUrls.has(s.url));
        self.sites = [...self.sites, ...merged];
        self._saveSites();
        self.importExportOpen = false;
        self.showToast(merged.length ? '已合并 ' + merged.length + ' 个书签' : '没有新书签需要导入', 'success');
      };
      reader.readAsText(file);
      e.target.value = '';
    },

    // --- 恢复默认 ---

    resetToDefault() {
      this.sites = C.DEFAULT_SITES.map(s => ({ ...s }));
      this._saveSites();
      this.selectedSites = [];
      this.batchMode = false;
      this.showToast('已恢复默认', 'success');
    }
  };

})(window.JianSou);
