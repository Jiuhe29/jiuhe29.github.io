// 定义app函数作为Alpine的数据来源
function searchApp() {
    return {
        // 所有模板中使用的变量都需要在这里定义初始值
        bgImage: '',
        bgLoading: true,
        bgInfo: '',
        searchQuery: '',
        suggestions: [],
        isLoadingSuggestions: false,
        nightMode: false,
        currentEngine: 'bing',
        engineOptionsVisible: false,
        hoveredEngine: null,
        hoveredSuggestion: -1,
        apiOnline: true,
        quickLayoutVisible: false,
        isFormOpen: false,
        isEditing: false,
        editingUrl: '',
        deleteDialogVisible: false,
        deleteDialogUrl: '',
        hoveredSite: '',
        searchFocused: false,
        currentTime: '00:00:00',
        isBlurActive: false,
        debounceTimer: null,

        // 搜索引擎配置
        engines: {
            baidu: { name: '百度', searchUrl: query => `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`, suggestUrl: query => `https://suggestion.baidu.com/su?wd=${encodeURIComponent(query)}&cb=handleSuggestionResponse`, type: 'jsonp' },
            bing: { name: 'Bing', searchUrl: query => `https://www.bing.com/search?q=${encodeURIComponent(query)}`, suggestUrl: query => `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}`, type: 'cors' },
            google: { name: 'Google', searchUrl: query => `https://www.google.com/search?q=${encodeURIComponent(query)}`, suggestUrl: query => `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`, type: 'cors' },
            duckduckgo: { name: 'DuckDuckGo', searchUrl: query => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`, suggestUrl: query => `https://ac.duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`, type: 'cors' }
        },

        // 快捷网站配置
        customSites: [],
        defaultSites: [
            { name: '哔哩哔哩', url: 'https://www.bilibili.com', icon: '' },
            { name: '知乎', url: 'https://www.zhihu.com', icon: '' },
            { name: 'GitHub', url: 'https://github.com', icon: '' },
            { name: '抖音', url: 'https://www.douyin.com', icon: '' },
            { name: '淘宝', url: 'https://www.taobao.com', icon: '' },
            { name: 'QQ邮箱', url: 'https://mail.qq.com', icon: '' },
            { name: '百度网盘', url: 'https://pan.baidu.com', icon: '' },
            { name: '阿里云盘', url: 'https://www.aliyundrive.com', icon: '' }
        ],

        proxyList: ['https://api.allorigins.win/raw?url='],

        // 应用初始化
        init() {
            this.loadBackground();
            this.updateTime();
            this.initEngine();
            this.loadCustomSites();
            this.loadNightMode();
            this.setupInterval();

            // 注册全局事件
            this.registerGlobalEvents();

            // 初始聚焦搜索框
            setTimeout(() => {
                const searchEl = document.getElementById('search');
                if (searchEl) {
                    searchEl.focus();
                    this.toggleBlur(true);
                }
            }, 100);
        },

        // 设置定时器
        setupInterval() {
            this.timeInterval = setInterval(() => this.updateTime(), 1000);
            this.backgroundInterval = setInterval(() => this.loadBackground(), 60 * 60 * 1000);
        },

        // 初始化搜索引擎设置
        initEngine() {
            const savedEngine = localStorage.getItem('searchEngine');
            if (savedEngine && this.engines[savedEngine]) {
                this.currentEngine = savedEngine;
            } else {
                this.currentEngine = 'bing';
            }
            localStorage.setItem('searchEngine', this.currentEngine);

            // 更新搜索框提示
            const searchEl = document.getElementById('search');
            if (searchEl) {
                searchEl.placeholder = `在${this.engines[this.currentEngine].name}中搜索...`;
            }
        },

        // 加载夜间模式设置
        loadNightMode() {
            const saved = localStorage.getItem('nightMode');
            this.nightMode = saved === 'on';
        },

        // 加载背景图片
        async loadBackground() {
            this.bgLoading = true;
            this.bgInfo = '';

            try {
                const bingAPI = `https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN`;

                const response = await this.fetchWithProxy(bingAPI);
                const data = await response.json();

                if (data.images && data.images.length > 0) {
                    await this.setBackgroundFromBing(data.images[0]);
                } else {
                    await this.loadFallbackBackground();
                }
            } catch (error) {
                console.error('Bing API错误:', error);
                await this.loadFallbackBackground();
            }
        },

        // 设置Bing背景
        setBackgroundFromBing(imageData) {
            return new Promise((resolve, reject) => {
                const imgUrl = `https://www.bing.com${imageData.url}`;
                const img = new Image();

                img.onload = () => {
                    const bgEl = document.querySelector('.bg');
                    if (bgEl) {
                        bgEl.style.backgroundImage = `url(${imgUrl})`;
                    }
                    this.bgImage = imgUrl;
                    this.bgInfo = imageData.copyright ?
                        `<a href="${imageData.copyrightlink}" target="_blank">${imageData.copyright}</a>` :
                        '';
                    this.bgLoading = false;
                    resolve();
                };

                img.onerror = () => {
                    reject(new Error('Bing image load failed'));
                };

                img.src = imgUrl;
            });
        },

        // 加载备用背景
        async loadFallbackBackground() {
            const staticBackgrounds = [
                "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
                "https://images.unsplash.com/photo-1433086966358-54859d0ed716",
                "https://images.unsplash.com/photo-1542273917363-3b1817f69a2b",
                "https://images.unsplash.com/photo-1439853949127-fa647821eba0",
                "https://images.unsplash.com/photo-1465189684280-6a8fa9b6a453"
            ];

            const randomIndex = Math.floor(Math.random() * staticBackgrounds.length);
            const imgSrc = staticBackgrounds[randomIndex] + `?auto=format&fit=crop&w=${window.innerWidth}&h=${window.innerHeight}&q=80`;

            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const bgEl = document.querySelector('.bg');
                    if (bgEl) {
                        bgEl.style.backgroundImage = `url(${imgSrc})`;
                    }
                    this.bgImage = imgSrc;
                    this.bgInfo = '<a href="https://unsplash.com/" target="_blank">Photo from Unsplash</a>';
                    this.bgLoading = false;
                    resolve();
                };
                img.onerror = () => {
                    this.bgLoading = false;
                    resolve();
                };
                img.src = imgSrc;
            });
        },

        // 使用代理获取资源
        fetchWithProxy(url) {
            const proxy = this.proxyList[Math.floor(Math.random() * this.proxyList.length)];
            const proxyUrl = proxy + encodeURIComponent(url);

            return fetch(proxyUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3'
                },
                mode: 'cors'
            });
        },

        // 更新时间显示
        updateTime() {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            this.currentTime = `${hours}:${minutes}:${seconds}`;

            // 自动切换夜间模式
            const hour = now.getHours();
            const isNight = hour < 6 || hour >= 18;
            if (isNight !== this.nightMode) {
                this.nightMode = isNight;
                localStorage.setItem('nightMode', this.nightMode ? 'on' : 'off');
            }
        },

        // 切换模糊效果
        toggleBlur(state) {
            this.searchFocused = state;
            if (state) {
                this.searchQueryFocused = true;
            } else {
                this.searchQueryFocused = false;
                this.searchQuery = '';
                this.suggestions = [];
            }
        },

        // 处理搜索输入（带防抖）
        handleSearchInput() {
            clearTimeout(this.debounceTimer);

            const query = this.searchQuery.trim();
            if (!query) {
                this.suggestions = [];
                return;
            }

            this.debounceTimer = setTimeout(() => {
                this.getSuggestions();
            }, 300);
        },

        // 处理键盘事件
        handleKeypress(e) {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        },

        // 获取搜索建议
        async getSuggestions() {
            if (!this.searchQuery.trim()) {
                this.suggestions = [];
                return;
            }

            this.isLoadingSuggestions = true;
            this.suggestions = [];

            try {
                const engine = this.engines[this.currentEngine];
                let data;

                if (engine.type === 'jsonp') {
                    data = await this.fetchJsonp(engine.suggestUrl(this.searchQuery));
                } else {
                    const response = await this.fetchWithProxy(engine.suggestUrl(this.searchQuery));
                    data = await response.json();
                }

                this.handleSuggestionData(data);
            } catch (error) {
                console.error('获取建议失败:', error);
                this.showSuggestionError('获取建议失败');
            }
        },

        // 处理搜索建议数据
        handleSuggestionData(data) {
            this.isLoadingSuggestions = false;
            this.suggestions = [];

            // 根据不同搜索引擎解析数据
            switch (this.currentEngine) {
                case 'baidu':
                    if (data && data.s && data.s.length > 0) this.suggestions = data.s;
                    break;
                case 'bing':
                    if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) this.suggestions = data[1];
                    break;
                case 'google':
                    if (data && data[1] && data[1].length > 0) this.suggestions = data[1];
                    break;
                case 'duckduckgo':
                    if (data && data.length > 1 && data[1].length > 0) this.suggestions = data[1];
                    break;
            }

            // 限制建议数量
            this.suggestions = this.suggestions.slice(0, 8);

            // 没有建议时显示提示
            if (this.suggestions.length === 0) {
                this.suggestions = ['无相关建议'];
            }

            // 更新API状态
            this.apiOnline = true;
        },

        // 显示建议错误
        showSuggestionError(message) {
            this.isLoadingSuggestions = false;
            this.suggestions = [message];
            this.apiOnline = false;
        },

        // 执行搜索
        performSearch() {
            if (!this.searchQuery.trim()) return;

            const engine = this.engines[this.currentEngine];
            const url = engine.searchUrl(this.searchQuery);

            // 添加搜索动画效果
            this.$nextTick(() => {
                const searchEl = document.getElementById('search');
                const bgEl = document.querySelector('.bg');

                if (searchEl) {
                    searchEl.style.transform = 'scale(0.98)';
                }
                if (bgEl) {
                    bgEl.style.transform = 'scale(1.08)';
                }

                setTimeout(() => {
                    window.open(url, "_blank");
                    this.toggleBlur(false);
                    if (searchEl) searchEl.style.transform = '';
                    if (bgEl) bgEl.style.transform = '';
                }, 300);
            });
        },

        // 切换搜索引擎
        switchEngine(engine) {
            this.currentEngine = engine;
            localStorage.setItem('searchEngine', engine);

            // 更新搜索框提示
            const searchEl = document.getElementById('search');
            if (searchEl) {
                searchEl.placeholder = `在${this.engines[engine].name}中搜索...`;
            }

            // 如果有搜索内容，重新获取建议
            if (this.searchQuery.trim()) {
                this.getSuggestions();
            }
        },

        // 切换引擎选项显示
        toggleEngineOptions() {
            this.engineOptionsVisible = !this.engineOptionsVisible;
        },

        // 切换夜间模式
        toggleNightMode() {
            this.nightMode = !this.nightMode;
            localStorage.setItem('nightMode', this.nightMode ? 'on' : 'off');
        },

        // 切换快捷面板显示
        toggleQuickPanel() {
            this.quickLayoutVisible = !this.quickLayoutVisible;
            document.body.style.overflow = this.quickLayoutVisible ? 'hidden' : '';
        },

        // 打开添加/编辑网站表单
        openAddSiteForm(editingSite = null) {
            this.isFormOpen = true;
            this.isEditing = !!editingSite;

            if (editingSite) {
                this.editingUrl = editingSite.url;
                this.$refs.siteName.value = editingSite.name;
                this.$refs.siteUrl.value = editingSite.url.replace(/^https?:\/\//, '');
                this.$refs.siteIcon.value = editingSite.icon || '';
                this.$refs.dialogTitle.textContent = '编辑快捷网站';
            } else {
                this.editingUrl = '';
                this.$refs.siteName.value = '';
                this.$refs.siteUrl.value = '';
                this.$refs.siteIcon.value = '';
                this.$refs.dialogTitle.textContent = '添加快捷网站';
            }
        },

        // 验证表单数据
        validateForm() {
            const name = this.$refs.siteName.value.trim();
            const url = this.$refs.siteUrl.value.trim();

            // 验证名称
            if (!name || name.length < 1 || name.length > 20) {
                this.showError('siteName', '请输入1-20个字符的网站名称');
                return false;
            }

            // 验证URL
            const validUrl = this.formatAndValidateUrl(url);
            if (!validUrl) {
                this.showError('siteUrl', '请输入有效的网址');
                return false;
            }

            return { name, url: validUrl, icon: this.$refs.siteIcon.value.trim() };
        },

        // 显示错误信息
        showError(inputId, message) {
            const input = this.$refs[inputId];
            if (!input) return;

            input.classList.add('error');

            // 移除已存在的错误信息
            const existingError = input.nextElementSibling;
            if (existingError && existingError.classList.contains('error-message')) {
                existingError.remove();
            }

            // 添加新的错误信息
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            input.parentNode.insertBefore(errorDiv, input.nextSibling);
        },

        // 格式化和验证URL
        formatAndValidateUrl(url) {
            if (!url) return null;

            // 添加协议如果没有
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            try {
                const urlObj = new URL(url);
                if (!urlObj.hostname.includes('.')) return null;
                return url;
            } catch (error) {
                return null;
            }
        },

        // 添加/编辑网站
        addEditSite() {
            const formData = this.validateForm();
            if (!formData) return;

            if (this.isEditing) {
                // 编辑现有网站
                const index = this.customSites.findIndex(site => site.url === this.editingUrl);
                if (index !== -1) {
                    this.customSites[index] = formData;
                }
            } else {
                // 添加新网站
                this.customSites.push(formData);
            }

            // 保存到本地存储
            this.saveCustomSites();

            // 关闭表单
            this.closeAddSiteForm();
        },

        // 关闭添加网站表单
        closeAddSiteForm() {
            this.isFormOpen = false;
            this.isEditing = false;
            this.editingUrl = '';

            // 清除表单数据
            if (this.$refs.siteName) this.$refs.siteName.value = '';
            if (this.$refs.siteUrl) this.$refs.siteUrl.value = '';
            if (this.$refs.siteIcon) this.$refs.siteIcon.value = '';
        },

        // 创建网站元素
        createSiteElement(site) {
            const a = document.createElement('a');
            a.href = site.url;
            a.className = 'site-item';
            a.target = '_blank';
            a.dataset.name = site.name;
            a.dataset.url = site.url;
            a.dataset.icon = site.icon;

            const img = document.createElement('img');
            img.className = 'site-icon';

            // 加载图标
            if (site.icon) {
                img.src = site.icon;
                img.onerror = () => this.loadDefaultIcon(img, site.url);
            } else {
                this.loadDefaultIcon(img, site.url);
            }

            const span = document.createElement('span');
            span.textContent = site.name;

            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
            deleteBtn.title = '删除网站';
            deleteBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openDeleteDialog(site.url);
            };

            // 编辑按钮
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
            editBtn.title = '编辑网站';
            editBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openAddSiteForm(site);
            };

            a.appendChild(img);
            a.appendChild(span);
            a.appendChild(deleteBtn);
            a.appendChild(editBtn);

            // 添加动画效果
            a.style.opacity = '0';
            a.style.transform = 'translateY(20px)';

            return a;
        },

        // 获取默认图标URL（用于HTML模板）
        getDefaultIcon(url) {
            try {
                const urlObj = new URL(url);
                return `https://icons.duckduckgo.com/ip3/${urlObj.hostname}.ico`;
            } catch (error) {
                return './favicon.ico';
            }
        },

        // 加载默认图标
        loadDefaultIcon(img, url) {
            try {
                const urlObj = new URL(url);
                const iconSources = [
                    `https://icons.duckduckgo.com/ip3/${urlObj.hostname}.ico`,
                    `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`,
                    `https://api.faviconkit.com/${urlObj.hostname}/32`,
                    './favicon.ico'
                ];

                img.onerror = function () {
                    if (iconSources.length > 0) {
                        img.src = iconSources.shift();
                    } else {
                        img.src = 'data:image/svg+xml,' + encodeURIComponent(`
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path fill="#666" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                            </svg>
                        `);
                        img.onerror = null;
                    }
                };

                img.src = iconSources.shift();
            } catch (error) {
                img.src = './favicon.ico';
            }
        },

        // 打开删除确认对话框
        openDeleteDialog(url) {
            this.deleteDialogUrl = url;
            this.deleteDialogVisible = true;
        },

        // 确认删除网站
        confirmDelete() {
            if (this.deleteDialogUrl) {
                const index = this.customSites.findIndex(site => site.url === this.deleteDialogUrl);
                if (index !== -1) {
                    this.customSites.splice(index, 1);
                    this.saveCustomSites();
                }
            }
            this.deleteDialogVisible = false;
            this.deleteDialogUrl = '';
        },

        // 加载自定义网站
        loadCustomSites() {
            try {
                const saved = localStorage.getItem('customSites');
                this.customSites = saved ? JSON.parse(saved) : [...this.defaultSites];
                if (!saved) {
                    this.saveCustomSites();
                }
            } catch (error) {
                console.error('加载自定义网站失败:', error);
                this.customSites = [...this.defaultSites];
            }
        },

        // 保存自定义网站
        saveCustomSites() {
            try {
                localStorage.setItem('customSites', JSON.stringify(this.customSites));
            } catch (error) {
                console.error('保存自定义网站失败:', error);
            }
        },

        // 注册全局事件
        registerGlobalEvents() {
            // 防止重复绑定
            if (window._eventsBound) return;
            window._eventsBound = true;

            // 全局点击事件
            document.addEventListener('click', (e) => {
                // 处理搜索框失焦
                const searchContainer = document.querySelector('.search-container');
                if (!searchContainer.contains(e.target)) {
                    this.toggleBlur(false);
                }

                // 处理引擎选项关闭
                const engineSwitcher = document.querySelector('.engine-switcher');
                const engineOptions = document.querySelector('.engine-options');
                if (!engineSwitcher.contains(e.target) && !engineOptions.contains(e.target)) {
                    this.engineOptionsVisible = false;
                }

                // 处理快捷面板关闭
                const quickPanel = document.querySelector('.quick-sites-panel');
                const siteForm = document.querySelector('.add-site-dialog');
                if (this.quickLayoutVisible &&
                    !quickPanel.contains(e.target) &&
                    (!siteForm || !siteForm.contains(e.target))) {
                    this.toggleQuickPanel(false);
                }
            });

            // 右键菜单事件
            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.toggleQuickPanel(!this.quickLayoutVisible);
                console.log("右键菜单事件");
            });

            // 键盘事件
            document.addEventListener('keydown', (e) => {
                if (e.key === 'F9') {
                    e.preventDefault();
                    this.toggleNightMode();
                } else if (e.key === 'Escape') {
                    this.toggleBlur(false);
                    this.engineOptionsVisible = false;
                    if (this.quickLayoutVisible) {
                        this.toggleQuickPanel(false);
                    }
                    if (this.isFormOpen) {
                        this.closeAddSiteForm();
                    }
                    if (this.deleteDialogVisible) {
                        this.deleteDialogVisible = false;
                    }
                }
            });
        },

        // 获取建议显示状态
        get showSuggestions() {
            return this.suggestions.length > 0 && this.searchFocused;
        },

        // 获取引擎选项显示状态
        get showEngineOptions() {
            return this.engineOptionsVisible;
        },

        // JSONP请求处理
        fetchJsonp(url) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                const callbackName = 'handleSuggestionResponse';

                window[callbackName] = (data) => {
                    resolve(data);
                    document.body.removeChild(script);
                    delete window[callbackName];
                };

                script.src = url;
                script.onerror = () => {
                    reject(new Error('JSONP request failed'));
                    document.body.removeChild(script);
                    delete window[callbackName];
                };

                document.body.appendChild(script);

                setTimeout(() => {
                    if (document.body.contains(script)) {
                        reject(new Error('JSONP request timeout'));
                        document.body.removeChild(script);
                        delete window[callbackName];
                    }
                }, 5000);
            });
        }
    };
}