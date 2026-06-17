/**
 * 简搜 - 常量定义
 */
(function(ns) {
  'use strict';

  ns.C = {

    SCHEMA_VERSION: 1,

    DEFAULT_SITES: [
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
    ],

    ENGINE_KEYS: ['bing', 'baidu', 'google', 'duckduckgo'],

    ENGINES: {
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

    BING_API: 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN',

    CORS_PROXIES: [
      url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      url => `https://corsproxy.io/?${encodeURIComponent(url)}`
    ],

    MAX_HISTORY: 10,
    DEBOUNCE_DELAY: 200,
    FETCH_TIMEOUT: 3000,
    JSONP_TIMEOUT: 3000,
    TOAST_DURATION: 2500,
    LONG_PRESS_DELAY: 500,
    TOUCH_DEADZONE: 10,

    ICON_SERVICES: [
      host => `https://icons.duckduckgo.com/ip3/${host}.ico`,
      host => `https://favicon.im/${host}`,
      host => `https://icon.horse/url/${host}`,
      host => `https://www.google.com/s2/favicons?domain=${host}&sz=64`
    ]
  };

})(window.JianSou = window.JianSou || {});
