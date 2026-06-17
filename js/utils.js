/**
 * 简搜 - 工具函数
 */
(function(ns) {
  'use strict';

  var C = ns.C;
  var U = ns.U = {};

  U.storageGet = function(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback ?? null;
      return JSON.parse(raw);
    } catch {
      return fallback ?? null;
    }
  };

  U.storageSet = function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };

  U.storageGetRaw = function(key, fallback) {
    try {
      return localStorage.getItem(key) ?? (fallback ?? '');
    } catch {
      return fallback ?? '';
    }
  };

  U.storageSetRaw = function(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  };

  U.openSafeUrl = function(url) {
    var win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) win.opener = null;
    return win;
  };

  /** 优先新标签页；弹窗被拦截时在当前页打开 */
  U.openUrl = function(url) {
    var win = U.openSafeUrl(url);
    if (win && !win.closed) return 'tab';
    window.location.assign(url);
    return 'same';
  };

  U.safeHttpUrl = function(url, fallback) {
    if (!url) return fallback;
    try {
      var u = new URL(url);
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
    } catch { /* 无效 URL */ }
    return fallback;
  };

  U.cssBackgroundUrl = function(url) {
    if (!url) return '';
    return 'url("' + String(url).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '")';
  };

  U.runMigrations = function() {
    var v = U.storageGetRaw('schemaVersion', '0');
    if (v === String(C.SCHEMA_VERSION)) return;
    U.storageSetRaw('schemaVersion', String(C.SCHEMA_VERSION));
  };

  U.preloadImage = function(url) {
    return new Promise(function(resolve, reject) {
      if (!url) { resolve(); return; }
      var img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
  };

  U.fetchWithTimeout = function(url, timeout) {
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, timeout);
    return fetch(url, { signal: controller.signal }).finally(function() { clearTimeout(timer); });
  };

  U.isHttpContext = function() {
    return location.protocol === 'http:' || location.protocol === 'https:';
  };

  U.isFileProtocol = function() {
    return location.protocol === 'file:';
  };

  U.getIcon = function(url, idx) {
    try {
      var host = new URL(url).hostname;
      var i = idx || 0;
      return (C.ICON_SERVICES[i] || C.ICON_SERVICES[0])(host);
    } catch {
      return '';
    }
  };

  U.isValidUrl = function(url) {
    try {
      var u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  U.generateId = function() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };

  U.todayStr = function() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  };

})(window.JianSou);
