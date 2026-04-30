// 更新日期: 2026-05-01
const CACHE_NAME = 'jiansou-20260501';
const ASSETS = [
  '/index.html',
  '/favicon.ico',
  '/icon.svg',
  '/js/app.js',
  '/manifest.json'
];

const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/alpinejs@3.14.9/dist/cdn.min.js',
  'https://cdn.tailwindcss.com?plugins=forms'
];

const OFFLINE_HTML = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>简搜 - 离线</title><style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1e293b;color:#fff;font-family:system-ui,sans-serif;text-align:center}h1{font-size:1.5rem;margin-bottom:.5rem}p{opacity:.6}</style></head><body><div><h1>📡 当前处于离线状态</h1><p>请检查网络连接后刷新页面</p></div></body></html>`;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled([
        ...ASSETS.map(url => cache.add(url)),
        ...CDN_ASSETS.map(url => cache.add(url).catch(() => {}))
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  let url;
  try { url = new URL(e.request.url); } catch { return; }

  // 本地资源: stale-while-revalidate
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetched = fetch(e.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => cached || new Response(OFFLINE_HTML, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }));
        return cached || fetched;
      })
    );
    return;
  }

  // CDN 资源: network-first，缓存备用
  if (url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('cdn.tailwindcss.com')) {
    e.respondWith(
      fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match(e.request))
    );
  }
});
