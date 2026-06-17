/**
 * 简搜 - 壁纸管理
 */
(function(ns) {
  'use strict';

  var C = ns.C;
  var U = ns.U;

  ns.backgroundMixin = {

    // --- 壁纸状态 ---
    bgInfo: false,

    _applyBgUrl(url) {
      if (this.$refs.bg && url) {
        this.$refs.bg.style.backgroundImage = U.cssBackgroundUrl(url);
      }
    },

    async initBackground() {
      var cached = U.storageGet('bgCache', null);
      if (cached && cached.url) {
        this._applyBgUrl(cached.url);
        this._setBgInfo(cached.info);
        try {
          await U.preloadImage(cached.url);
        } catch {
          await this._fetchAndUpdateBg();
          return;
        }
        if (cached.date !== U.todayStr()) this._fetchAndUpdateBg();
      } else {
        var ok = await this._fetchAndUpdateBg();
        if (!ok && U.isFileProtocol()) {
          this.showToast('本地文件模式壁纸不可用，请运行 npx serve . 后访问', 'error');
        } else if (!ok) {
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
        a.href = U.safeHttpUrl(info.link, 'https://bing.com');
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = info.copyright || '';
        a.textContent = info.title;
        el.appendChild(a);
      });
    },

    async _fetchAndUpdateBg() {
      var cached = U.storageGet('bgCache', null);
      var sources = U.isFileProtocol()
        ? C.CORS_PROXIES.map(p => p(C.BING_API))
        : [C.BING_API].concat(C.CORS_PROXIES.map(p => p(C.BING_API)));

      for (var i = 0; i < sources.length; i++) {
        try {
          var res = await U.fetchWithTimeout(sources[i], C.FETCH_TIMEOUT);
          if (!res.ok) continue;
          var data = await res.json();
          if (data && data.images && data.images[0]) {
            var img = data.images[0];
            var imageId = img.hsh || img.urlbase;
            if (cached && cached.id === imageId) return true;

            var url = 'https://www.bing.com' + img.url;
            try { await U.preloadImage(url); } catch { /* 图片预加载失败仍尝试显示 */ }

            var title = img.title || (img.copyright || '').split('(')[0].trim() || '';
            var copyright = img.copyright || '';
            var link = U.safeHttpUrl(img.copyrightlink, 'https://bing.com');

            this._applyBgUrl(url);
            this._setBgInfo({ title, link, copyright });
            if (!U.storageSet('bgCache', { url, info: { title, link, copyright }, id: imageId, date: U.todayStr() })) {
              this.showToast('壁纸缓存保存失败', 'error');
            }
            return true;
          }
        } catch { /* 请求失败，尝试下一个来源 */ }
      }
      return false;
    }
  };

})(window.JianSou);
