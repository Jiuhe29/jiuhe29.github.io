document.addEventListener('contextmenu', function (e) { e.preventDefault(); }, false);
    document.addEventListener('DOMContentLoaded', function () {
      const bg = document.querySelector('.bg');
      const bgLoading = document.querySelector('.bg-loading');
      const bgInfo = document.querySelector('.bg-info');
      const search = document.getElementById('search');
      const suggestions = document.querySelector('.suggestions');
      const timeEl = document.getElementById('time');
      const blurOverlay = document.querySelector('.blur-overlay');
      const container = document.querySelector('.container');
      const statusIndicator = document.querySelector('.status-indicator');
      const apiStatusText = document.querySelector('.api-status span');
      const engineSwitcher = document.getElementById('engineSwitcher');
      const engineOptions = document.getElementById('engineOptions');

      // 防抖计时器
      let debounceTimer;
      // API状态
      let apiOnline = true;
      // 当前搜索引擎
      let currentEngine = 'bing';
      // 引擎配置
      const engines = {
        baidu: {
          name: '百度',
          searchUrl: (query) => `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
          suggestUrl: (query) => `https://suggestion.baidu.com/su?wd=${encodeURIComponent(query)}&cb=handleSuggestionResponse`,
          type: 'jsonp'
        },
        bing: {
          name: 'Bing',
          searchUrl: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
          // 使用新的API端点获取JSON格式的建议
          suggestUrl: (query) => `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}`,
          type: 'cors'
        },
        google: {
          name: 'Google',
          searchUrl: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          suggestUrl: (query) => `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`,
          type: 'cors'
        },
        duckduckgo: {
          name: 'DuckDuckGo',
          searchUrl: (query) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          suggestUrl: (query) => `https://ac.duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`,
          type: 'cors'
        }
      };

      // 可靠的CORS代理列表
      const proxyList = [
        'https://api.allorigins.win/raw?url=',
      ];

      // 获取随机代理
      function getRandomProxy() {
        return proxyList[Math.floor(Math.random() * proxyList.length)];
      }

      // 加载背景图片
      function loadBackground() {
        bgLoading.classList.add('visible');
        bgLoading.textContent = '正在加载背景...';
        
        // 首先尝试使用Bing API
        const bingAPI = `https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN`;
        
        fetchWithProxy(bingAPI)
          .then(response => {
            if (!response.ok) throw new Error('网络响应异常');
            return response.json();
          })
          .then(data => {
            if (data.images && data.images.length > 0) {
              setBackgroundFromBing(data.images[0]);
            } else {
              loadFallbackBackground();
            }
          })
          .catch(error => {
            console.error('Bing API错误:', error);
            loadFallbackBackground();
          });
      }

      function setBackgroundFromBing(imageData) {
        const imgUrl = `https://www.bing.com${imageData.url}`;
        const copyright = imageData.copyright;
        const copyrightLink = imageData.copyrightlink;

        const img = new Image();
        img.onload = () => {
          bg.style.backgroundImage = `url(${imgUrl})`;
          bg.classList.add('visible');

          // 显示图片信息
          if (copyright) {
            bgInfo.innerHTML = `<a href="${copyrightLink}" target="_blank">${copyright}</a>`;
          }

          setTimeout(() => {
            bgLoading.classList.remove('visible');
          }, 800);
        };
        img.onerror = () => {
          console.error('Bing图片加载失败:', imgUrl);
          loadFallbackBackground();
        };
        img.src = imgUrl;
      }

      function loadFallbackBackground() {
        // 使用备用API
        const fallbackAPI = 'https://api.unsplash.com/photos/random?query=nature,landscape,wallpaper&orientation=landscape&client_id=SouHY7Uul-OxoMl3LL3c0N45UtraIr8f7zq7NqHv0v0';
        
        bgLoading.textContent = '使用Unsplash背景...';
        
        fetch(fallbackAPI)
          .then(response => response.json())
          .then(data => {
            if (data.urls && data.urls.full) {
              bg.style.backgroundImage = `url(${data.urls.full})`;
              bg.classList.add('visible');
              
              if (data.user && data.user.name) {
                bgInfo.innerHTML = `<a href="${data.user.links.html}?utm_source=your_app_name&utm_medium=referral" target="_blank">Photo by ${data.user.name} on Unsplash</a>`;
              }
              
              setTimeout(() => {
                bgLoading.classList.remove('visible');
              }, 800);
            } else {
              useStaticBackgrounds();
            }
          })
          .catch(error => {
            console.error('Unsplash API错误:', error);
            useStaticBackgrounds();
          });
      }

      function useStaticBackgrounds() {
        bgLoading.textContent = '使用本地背景...';
        
        // 使用高质量静态背景图片
        const staticBackgrounds = [
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
          "https://images.unsplash.com/photo-1433086966358-54859d0ed716",
          "https://images.unsplash.com/photo-1542273917363-3b1817f69a2b",
          "https://images.unsplash.com/photo-1439853949127-fa647821eba0",
          "https://images.unsplash.com/photo-1465189684280-6a8fa9b6a453"
        ];
        
        const randomIndex = Math.floor(Math.random() * staticBackgrounds.length);
        const img = new Image();
        img.onload = function() {
          bg.style.backgroundImage = `url(${this.src})`;
          bg.classList.add('visible');
          bgInfo.innerHTML = '<a href="https://unsplash.com/" target="_blank">Photo from Unsplash</a>';
          
          setTimeout(() => {
            bgLoading.classList.remove('visible');
          }, 800);
        };
        img.onerror = function() {
          console.error('静态背景加载失败');
          bgLoading.textContent = '背景加载失败';
          setTimeout(() => {
            bgLoading.classList.remove('visible');
          }, 2000);
        };
        img.src = staticBackgrounds[randomIndex] + `?auto=format&fit=crop&w=${window.innerWidth}&h=${window.innerHeight}&q=80`;
      }

      // 使用代理的通用fetch函数
      function fetchWithProxy(url, options = {}) {
        const proxy = getRandomProxy();
        const proxyUrl = proxy + encodeURIComponent(url);

        // 添加必要的请求头
        const headers = new Headers(options.headers || {});
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
        headers.set('Accept-Language', 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3');

        return fetch(proxyUrl, {
          ...options,
          headers,
          mode: 'cors'
        });
      }

      // 时间更新函数
      function updateTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        timeEl.textContent = `${hours}:${minutes}:${seconds}`;

        // 根据时间自动切换夜间模式
        const hour = now.getHours();
        const isNight = hour < 6 || hour >= 18;
        if (isNight && !document.body.classList.contains('night')) {
          document.body.classList.add('night');
          localStorage.setItem('nightMode', 'on');
        } else if (!isNight && document.body.classList.contains('night')) {
          document.body.classList.remove('night');
          localStorage.setItem('nightMode', 'off');
        }
      }

      // 切换模糊效果
      function toggleBlur(state) {
        if (state) {
          bg.classList.add('blur');
          blurOverlay.classList.add('visible');
          search.classList.add('focused');
          search.classList.remove('not-focused');

          // 容器微动画
          container.style.transform = 'translateY(-15px)';
          setTimeout(() => {
            container.style.transform = 'translateY(0)';
          }, 100);
          bgInfo.style.opacity = '0';
        } else {
          bg.classList.remove('blur');
          blurOverlay.classList.remove('visible');
          search.classList.remove('focused');
          search.classList.add('not-focused');
          container.style.transform = 'none';
          bgInfo.style.opacity = '1';
          search.value = '';
          // 隐藏建议框时添加淡出动画
          suggestions.classList.add('visible');
          setTimeout(() => {
            suggestions.style.display = 'none';
            suggestions.classList.remove('visible');
          }, 300);
        }
      }

      // 获取搜索建议
      function getSuggestions(query) {
        // 清除之前的防抖计时器
        clearTimeout(debounceTimer);

        // 显示加载状态
        suggestions.innerHTML = '';
        const loadingLi = document.createElement('li');
        loadingLi.classList.add('loading');
        loadingLi.innerHTML = '<div class="loading-spinner"></div> 正在获取建议...';
        suggestions.appendChild(loadingLi);
        suggestions.style.display = 'block';
        setTimeout(() => {
          suggestions.classList.add('visible');
        }, 10);

        const engine = engines[currentEngine];

        if (engine.type === 'jsonp') {
          // JSONP方式（百度）
          const script = document.createElement('script');
          script.src = engine.suggestUrl(query);

          // 删除之前的JSONP回调
          delete window.handleSuggestionResponse;

          // 定义全局回调函数
          window.handleSuggestionResponse = function (data) {
            handleSuggestionData(data);
            document.body.removeChild(script);
          };

          // 添加超时处理
          setTimeout(() => {
            if (suggestions.children.length === 1 &&
              suggestions.children[0].classList.contains('loading')) {
              showSuggestionError('获取建议超时');
            }
          }, 3000);

          // 执行JSONP请求
          document.body.appendChild(script);
        } else {
          // CORS方式（其他引擎）
          fetchWithProxy(engine.suggestUrl(query))
            .then(response => {
              if (!response.ok) throw new Error('网络响应异常');
              return response.json();
            })
            .then(data => {
              handleSuggestionData(data);
            })
            .catch(error => {
              showSuggestionError('获取建议失败');
              console.error('Error fetching suggestions:', error);
            });
        }
      }

      // 处理建议数据
      function handleSuggestionData(data) {
        // 清除加载状态
        suggestions.innerHTML = '';

        let suggestionsList = [];

        // 根据不同引擎解析数据
        switch (currentEngine) {
          case 'baidu':
            if (data && data.s && data.s.length > 0) {
              suggestionsList = data.s;
            }
            break;
          case 'bing':
            // 新的Bing建议API格式: [查询词, 建议数组, ...]
            if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
              suggestionsList = data[1];
            }
            break;
          case 'google':
            if (data && data[1] && data[1].length > 0) {
              suggestionsList = data[1];
            }
            break;
          case 'duckduckgo':
            if (data && data.length > 1 && data[1].length > 0) {
              suggestionsList = data[1];
            }
            break;
        }

        // 显示建议
        if (suggestionsList.length > 0) {
          suggestionsList.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            li.addEventListener('click', () => {
              search.value = item;
              performSearch(item);
            });
            suggestions.appendChild(li);
          });

          // 更新API状态
          if (!apiOnline) {
            apiOnline = true;
            statusIndicator.classList.remove('offline');
            apiStatusText.textContent = 'API 状态: 在线';
          }
        } else {
          // 没有建议时显示提示
          const noResultsLi = document.createElement('li');
          noResultsLi.textContent = '无相关建议';
          noResultsLi.style.opacity = '0.7';
          noResultsLi.style.pointerEvents = 'none';
          suggestions.appendChild(noResultsLi);
        }
      }

      // 显示建议错误
      function showSuggestionError(message) {
        suggestions.innerHTML = '';
        const errorLi = document.createElement('li');
        errorLi.classList.add('error');
        errorLi.textContent = message;
        suggestions.appendChild(errorLi);

        // 更新API状态
        apiOnline = false;
        statusIndicator.classList.add('offline');
        apiStatusText.textContent = 'API 状态: 离线';
      }

      // 执行搜索
      function performSearch(query) {
        if (!query) return;

        const engine = engines[currentEngine];
        const url = engine.searchUrl(query);

        // 添加搜索效果
        search.style.transform = 'scale(0.98)';
        bg.style.transform = 'scale(1.08)';
        setTimeout(() => {
          window.open(url, "_blank");
          search.value = '';
          toggleBlur(false);
          search.style.transform = '';
          bg.style.transform = '';
        }, 300);
      }

      // 切换搜索引擎
      function switchEngine(engine) {
        currentEngine = engine;
        const engineName = engines[engine].name;
        engineSwitcher.querySelector('span').textContent = engineName;
        
        // 更新选项激活状态
        document.querySelectorAll('.engine-option').forEach(option => {
          option.classList.remove('active');
          if (option.dataset.engine === engine) {
            option.classList.add('active');
          }
        });

        // 保存到本地存储
        localStorage.setItem('searchEngine', engine);

        // 更新搜索框提示
        search.placeholder = `在${engineName}中搜索...`;
        
        // 更新API状态文本
        apiStatusText.textContent = `API 状态: ${apiOnline ? '在线' : '离线'}`;
        
        // 如果用户正在输入内容，重新获取建议
        const query = search.value.trim();
        if (query.length > 0) {
            getSuggestions(query);
        }
      }

      // 初始化引擎选择
      function initEngine() {
        const savedEngine = localStorage.getItem('searchEngine');
        if (savedEngine && engines[savedEngine]) {
          switchEngine(savedEngine);
        } else {
          switchEngine('bing');
        }
      }

      // 初始化页面
      loadBackground();
      updateTime();
      setInterval(updateTime, 1000);
      search.focus();
      setTimeout(() => toggleBlur(true), 100);
      initEngine();

      // 每1小时更换一次背景
      setInterval(loadBackground, 60 * 60 * 1000);

      // 事件监听器
      search.addEventListener('focus', () => toggleBlur(true));

      document.addEventListener('click', (e) => {
        if (!search.contains(e.target) && !suggestions.contains(e.target)) {
          toggleBlur(false);
        }

        // 点击引擎切换器
        if (e.target === engineSwitcher || engineSwitcher.contains(e.target)) {
          engineOptions.classList.toggle('visible');
        } else if (!engineOptions.contains(e.target) && e.target !== engineSwitcher) {
          engineOptions.classList.remove('visible');
        }
      });

      // 引擎选项点击
      document.querySelectorAll('.engine-option').forEach(option => {
        option.addEventListener('click', () => {
          switchEngine(option.dataset.engine);
          engineOptions.classList.remove('visible');
        });
      });

      // 使用防抖处理输入事件
      search.addEventListener('input', function () {
        const query = this.value.trim();

        // 清除之前的防抖计时器
        clearTimeout(debounceTimer);

        // 如果查询为空，隐藏建议框
        if (!query) {
          suggestions.classList.add('visible');
          setTimeout(() => {
            suggestions.style.display = 'none';
            suggestions.classList.remove('visible');
          }, 300);
          return;
        }

        // 设置防抖计时器（300毫秒）
        debounceTimer = setTimeout(() => {
          getSuggestions(query);
        }, 300);
      });

      search.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
          performSearch(this.value.trim());
        }
      });

      // 优化后的夜间模式切换
      function toggleNightMode() {
        document.body.classList.toggle('night');
        const isNightMode = document.body.classList.contains('night');
        localStorage.setItem('nightMode', isNightMode ? 'on' : 'off');

        // 同步更新搜索框状态
        if (search.classList.contains('focused')) {
          search.classList.add('focused');
        } else {
          search.classList.add('not-focused');
        }
      }

      // 夜间模式快捷键
      document.addEventListener('keydown', function (e) {
        if (e.key === 'F9') {
          e.preventDefault();
          toggleNightMode();
        }
      });

      // 从本地存储加载夜间模式状态
      if (localStorage.getItem('nightMode') === 'on') {
        document.body.classList.add('night');
      }

      // 添加美观的初始进入效果
      setTimeout(() => {
        timeEl.style.opacity = '1';
        timeEl.style.transform = 'translateY(0)';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
      }, 300);

      // 添加键盘快捷键提示
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          toggleBlur(false);
          search.blur();
          engineOptions.classList.remove('visible');
        }
      });
    });
