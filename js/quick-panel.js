// 快捷网站面板功能
let quickLayoutVisible = false;
let isFormProcessing = false;

const quickSitesPanel = document.getElementById('quickSitesPanel');
const addSiteBtn = document.getElementById('addSiteBtn');
const addSiteForm = document.getElementById('addSiteForm');

// 默认网站配置
const defaultSites = [
    { name: '哔哩哔哩', url: 'https://www.bilibili.com', icon: '' },
    { name: '知乎', url: 'https://www.zhihu.com', icon: '' },
    { name: 'GitHub', url: 'https://github.com', icon: '' },
    { name: '抖音', url: 'https://www.douyin.com', icon: '' },
    { name: '淘宝', url: 'https://www.taobao.com', icon: '' },
    { name: 'QQ邮箱', url: 'https://mail.qq.com', icon: '' },
    { name: '百度网盘', url: 'https://pan.baidu.com', icon: '' },
    { name: '阿里云盘', url: 'https://www.aliyundrive.com', icon: '' }
];

// 安全的存储访问方法
function safeGetStorage(key, defaultValue = '[]') {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : JSON.parse(defaultValue);
    } catch (error) {
        console.warn('Failed to read from localStorage:', error);
        return JSON.parse(defaultValue);
    }
}

function safeSetStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn('Failed to write to localStorage:', error);
        return false;
    }
}

// 右键事件处理
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    toggleQuickPanel(!quickLayoutVisible);
});

// 点击其他区域关闭面板
document.addEventListener('click', function (e) {
    // 确保不是在面板内部、表单内部、或删除按钮点击
    if (quickLayoutVisible && 
        !quickSitesPanel.contains(e.target) && 
        (!addSiteForm || !addSiteForm.contains(e.target)) &&
        !e.target.classList.contains('delete-btn')) {
        toggleQuickPanel(false);
    }
});

// ESC键关闭面板
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && quickLayoutVisible) {
        toggleQuickPanel(false);
    }
});

// 显示/隐藏快捷面板
function toggleQuickPanel(show) {
    if (quickLayoutVisible === show) return; // 避免重复触发
    
    quickLayoutVisible = show;
    document.body.style.overflow = show ? 'hidden' : '';
    
    requestAnimationFrame(() => {
        if (show) {
            document.body.classList.add('quick-layout');
            quickSitesPanel.classList.add('show');
            
            // 网站图标逐个显示动画
            const siteItems = document.querySelectorAll('.site-item');
            siteItems.forEach((item, index) => {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 50);
            });
        } else {
            quickSitesPanel.classList.remove('show');
            document.body.classList.remove('quick-layout');
            
            // 重置所有动画状态
            document.querySelectorAll('.site-item').forEach(item => {
                item.style.opacity = '';
                item.style.transform = '';
            });
            
            // 关闭添加网站表单
            if (addSiteForm && addSiteForm.classList.contains('show')) {
                addSiteForm.classList.remove('show');
                document.getElementById('siteName').value = '';
                document.getElementById('siteUrl').value = '';
            }
        }
    });
}

// 表单状态管理

// 处理网站表单提交
addSiteForm?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (isFormProcessing) return;

    const name = document.getElementById('siteName').value.trim();
    const url = document.getElementById('siteUrl').value.trim();
    const iconUrl = document.getElementById('siteIcon').value.trim();

    const { isValid, validUrl } = validateForm(name, url);
    if (!isValid) return;

    try {
        isFormProcessing = true;
        const submitBtn = addSiteForm.querySelector('button[type="submit"]');
        submitBtn.classList.add('processing');

        const quickSitesGrid = document.querySelector('.quick-sites-grid');
        const customSites = safeGetStorage('customSites');
        const siteElement = createSiteElement(name, validUrl, iconUrl);
        
        const editingUrl = addSiteForm.dataset.editingUrl;
        if (editingUrl) {
            const oldElement = quickSitesGrid.querySelector(`a[href="${editingUrl}"]`);
            if (oldElement) {
                const index = customSites.findIndex(site => site.url === editingUrl);
                if (index !== -1) {
                    customSites[index] = { name, url: validUrl, icon: iconUrl };
                    oldElement.parentNode.replaceChild(siteElement, oldElement);
                }
            }
        } else {
            const existingButton = quickSitesGrid.querySelector('.add-site-btn');
            if (existingButton) {
                quickSitesGrid.insertBefore(siteElement, existingButton);
            } else {
                quickSitesGrid.appendChild(siteElement);
            }
            customSites.push({ name, url: validUrl, icon: iconUrl });
        }

        safeSetStorage('customSites', customSites);
        
        // 添加显示动画
        siteElement.style.opacity = '0';
        siteElement.style.transform = 'translateY(20px)';
        requestAnimationFrame(() => {
            siteElement.style.opacity = '1';
            siteElement.style.transform = 'translateY(0)';
        });

        resetForm();
    } catch (error) {
        console.error('Error processing form:', error);
        showError('siteUrl', '添加网站失败，请重试');
    } finally {
        isFormProcessing = false;
        const submitBtn = addSiteForm.querySelector('button[type="submit"]');
        submitBtn.classList.remove('processing');
    }
});

// 重置表单
function resetForm() {
    if (addSiteForm) {
        // 重置所有输入
        document.getElementById('siteName').value = '';
        document.getElementById('siteUrl').value = '';
        document.getElementById('siteIcon').value = '';
        document.getElementById('dialogTitle').textContent = '添加快捷网站';
        
        // 清除编辑状态
        delete addSiteForm.dataset.editingUrl;
        
        // 重置处理状态
        isFormProcessing = false;
        
        // 关闭表单
        addSiteForm.classList.remove('show');
        
        // 移除所有可能的验证样式
        addSiteForm.querySelectorAll('input').forEach(input => {
            input.classList.remove('error');
            const errorMsg = input.nextElementSibling;
            if (errorMsg && errorMsg.classList.contains('error-message')) {
                errorMsg.remove();
            }
        });
    }
}

// 验证表单数据
function validateForm(name, url) {
    let isValid = true;
    
    // 验证名称
    if (!name || name.length < 1 || name.length > 20) {
        showError('siteName', '请输入1-20个字符的网站名称');
        isValid = false;
    }
    
    // 验证URL
    const validUrl = formatAndValidateUrl(url);
    if (!validUrl) {
        showError('siteUrl', '请输入有效的网址');
        isValid = false;
    }
    
    return { isValid, validUrl };
}

// 显示错误消息
function showError(inputId, message) {
    const input = document.getElementById(inputId);
    input.classList.add('error');
    
    // 移除已存在的错误消息
    const existingError = input.nextElementSibling;
    if (existingError && existingError.classList.contains('error-message')) {
        existingError.remove();
    }
    
    // 添加新的错误消息
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    input.parentNode.insertBefore(errorDiv, input.nextSibling);
}

// 添加网站按钮点击事件
if (addSiteBtn) {
    addSiteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (addSiteForm) {
            resetForm();
            addSiteForm.classList.add('show');
        }
    });
}

// 取消按钮点击事件
const cancelAddBtn = document.querySelector('#cancelAdd');
if (cancelAddBtn) {
    cancelAddBtn.addEventListener('click', resetForm);
}

// 编辑网站
function editSite(element) {
    const name = element.dataset.name;
    const url = element.dataset.url;
    const icon = element.dataset.icon || '';

    // 更新表单标题和内容
    document.getElementById('dialogTitle').textContent = '编辑快捷网站';
    document.getElementById('siteName').value = name;
    document.getElementById('siteUrl').value = url.replace(/^https?:\/\//, '');
    document.getElementById('siteIcon').value = icon;

    // 保存当前编辑的URL用于后续更新
    addSiteForm.dataset.editingUrl = url;

    // 显示表单
    addSiteForm.classList.add('show');
}

// 创建网站元素
function createSiteElement(name, url, iconUrl = '') {
    const a = document.createElement('a');
    a.href = url;
    a.className = 'site-item';
    a.target = '_blank';
    a.dataset.name = name;
    a.dataset.url = url;
    a.dataset.icon = iconUrl;

    const img = document.createElement('img');
    
    // 如果提供了自定义图标，优先使用
    if (iconUrl) {
        img.src = iconUrl;
        img.onerror = () => {
            loadDefaultIcon(img, url);
        };
    } else {
        loadDefaultIcon(img, url);
    }

    const span = document.createElement('span');
    span.textContent = name;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    deleteBtn.title = '删除网站';
    
    // 删除按钮的点击处理
    deleteBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const deleteDialog = document.getElementById('deleteConfirmDialog');
        const confirmDeleteBtn = document.getElementById('confirmDelete');
        const cancelDeleteBtn = document.getElementById('cancelDelete');
        
        // 清理所有事件监听器的函数
        const cleanupListeners = () => {
            confirmDeleteBtn.removeEventListener('click', handleConfirm);
            cancelDeleteBtn.removeEventListener('click', handleCancel);
            deleteDialog.removeEventListener('click', handleOverlayClick);
            document.removeEventListener('keydown', handleKeydown);
        };

        // 删除确认处理
        const handleConfirm = () => {
            const customSites = safeGetStorage('customSites');
            const updatedSites = customSites.filter(site => site.url !== url);
            safeSetStorage('customSites', updatedSites);

            // 添加删除动画
            a.style.transition = 'all 0.3s ease';
            a.style.opacity = '0';
            a.style.transform = 'scale(0.8) translateY(20px)';
            setTimeout(() => {
                a.style.height = '0';
                a.style.margin = '0';
                a.style.padding = '0';
                setTimeout(() => {
                    a.remove();
                }, 300);
            }, 200);

            // 清理事件监听并隐藏对话框
            cleanupListeners();
            deleteDialog.classList.remove('show');
        };

        // 取消删除处理
        const handleCancel = () => {
            cleanupListeners();
            deleteDialog.classList.remove('show');
        };

        // 点击遮罩层关闭处理
        const handleOverlayClick = (event) => {
            if (event.target === deleteDialog) {
                handleCancel();
            }
        };

        // ESC键关闭处理
        const handleKeydown = (event) => {
            if (event.key === 'Escape') {
                handleCancel();
            }
        };

        // 添加事件监听
        confirmDeleteBtn.addEventListener('click', handleConfirm);
        cancelDeleteBtn.addEventListener('click', handleCancel);
        deleteDialog.addEventListener('click', handleOverlayClick);
        document.addEventListener('keydown', handleKeydown);

        // 显示删除确认对话框
        deleteDialog.classList.add('show');
    };

    // 添加编辑按钮
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
    editBtn.title = '编辑网站';
    editBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        editSite(a);
    };

    a.appendChild(img);
    a.appendChild(span);
    a.appendChild(deleteBtn);
    a.appendChild(editBtn);
    return a;
}

// URL格式化和验证
function formatAndValidateUrl(url) {
    if (!url) return null;
    
    // 添加协议如果没有
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    try {
        const urlObj = new URL(url);
        // 确保域名是有效的
        if (!urlObj.hostname.includes('.')) {
            return null;
        }
        return url;
    } catch (error) {
        return null;
    }
}

// 验证网站数据完整性
function validateSiteData(site) {
    if (!site || typeof site !== 'object') return false;
    if (!site.name || typeof site.name !== 'string' || site.name.trim().length === 0) return false;
    
    const validUrl = formatAndValidateUrl(site.url);
    if (!validUrl) return false;
    
    site.url = validUrl; // 更新为格式化后的URL
    return true;
}

// 初始化面板
function initQuickPanel() {
    const quickSitesGrid = document.querySelector('.quick-sites-grid');
    if (!quickSitesGrid) return;

    // 清空现有内容
    while (quickSitesGrid.firstChild) {
        quickSitesGrid.removeChild(quickSitesGrid.firstChild);
    }    // 从本地存储获取网站列表
    let sites = safeGetStorage('customSites');
    
    // 如果本地存储为空，则使用默认网站列表初始化
    if (!Array.isArray(sites) || sites.length === 0) {
        sites = [...defaultSites];
        safeSetStorage('customSites', sites);
    }

    // 创建网站元素
    sites.forEach(site => {
        if (validateSiteData(site)) {
            const siteElement = createSiteElement(site.name, site.url);
            quickSitesGrid.appendChild(siteElement);
        }
    });

    // 添加"添加"按钮
    if (addSiteBtn) {
        quickSitesGrid.appendChild(addSiteBtn);
    }
}

// 启动时初始化面板
document.addEventListener('DOMContentLoaded', initQuickPanel);

// 加载自定义网站
function loadCustomSites() {
    const customSites = safeGetStorage('customSites');
    const quickSitesGrid = document.querySelector('.quick-sites-grid');
    const addButton = document.querySelector('.add-site-btn');
    
    if (quickSitesGrid) {
        // 确保customSites是数组
        if (Array.isArray(customSites)) {
            customSites.forEach((site, index) => {
                // 验证站点数据的完整性
                if (site && site.name && site.url) {
                    try {
                        const siteElement = createSiteElement(site.name, site.url);
                        if (addButton) {
                            quickSitesGrid.insertBefore(siteElement, addButton);
                        } else {
                            quickSitesGrid.appendChild(siteElement);
                        }
                    } catch (error) {
                        console.warn('Failed to create site element:', error);
                    }
                }
            });
        }
    }
}

// 移除重复的初始化代码，因为initQuickPanel已经包含了所需功能

// 加载默认图标
async function loadDefaultIcon(img, url) {
    try {
        const urlObj = new URL(url);
        const iconSources = [
            `${urlObj.origin}/favicon.ico`,
            `https://icons.duckduckgo.com/ip3/${urlObj.hostname}.ico`,
            './favicon.ico'
        ];

        // 尝试从页面中获取图标链接
        try {
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const iconLink = doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
            if (iconLink?.href) {
                iconSources.unshift(iconLink.href);
            }
        } catch (error) {
            console.warn('Failed to fetch icon from page:', error);
        }

        // 依次尝试加载图标
        img.onerror = async function() {
            if (iconSources.length > 0) {
                img.src = iconSources.shift();
            } else {
                // 使用内联SVG作为最后的备选方案
                img.src = 'data:image/svg+xml,' + encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path fill="#666" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                    </svg>
                `);
                img.onerror = null;
            }
        };

        // 开始尝试加载第一个图标
        img.src = iconSources.shift();
    } catch (error) {
        console.warn('Invalid URL:', error);
        img.src = './favicon.ico';
    }
}
