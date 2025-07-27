/**
 * popup.js - 批量URL提取器主控制器
 * 
 * 这是Chrome插件的核心控制器类，负责处理用户界面交互、
 * XPath规则管理、URL提取逻辑和存储管理等主要功能。
 * 
 * @author Chrome插件开发团队
 * @version 1.0
 * @since 2025-07-26
 */

/**
 * URL提取器主控制器类
 * 采用模块化设计，集成了用户界面控制、数据处理、存储管理等功能
 */
class URLExtractor {
    /**
     * 构造函数 - 初始化插件核心功能
     */
    constructor() {
        // 存储提取到的URL数组
        this.extractedUrls = [];
        
        // 检查Chrome扩展API的可用性
        // 支持Chrome Storage API和LocalStorage的双重降级策略
        this.chromeApiAvailable = this.checkChromeApiAvailability();
        
        // 执行初始化流程
        this.initializeElements();  // 初始化DOM元素引用
        this.bindEvents();          // 绑定事件监听器
        this.loadSavedXPath();      // 加载用户保存的XPath规则
    }
    
    /**
     * 检查Chrome扩展API的可用性
     * 这是一个关键的兼容性检查，确保插件能在不同环境下正常工作
     * 
     * @returns {boolean} API是否可用
     */
    checkChromeApiAvailability() {
        try {
            // 第一层检查：chrome对象是否存在
            if (typeof chrome === 'undefined' || !chrome) {
                console.warn('Chrome API不可用: chrome对象未定义或为null');
                return false;
            }
            
            // 第二层检查：storage API是否存在
            if (!chrome.storage) {
                console.warn('Chrome API不可用: storage API未定义');
                return false;
            }
            
            // 第三层检查：storage.local API是否存在
            if (!chrome.storage.local) {
                console.warn('Chrome API不可用: storage.local API未定义');
                return false;
            }
            
            // 测试API是否真的可用
            if (typeof chrome.storage.local.get !== 'function') {
                console.warn('Chrome API不可用: storage.local.get不是函数');
                return false;
            }
            
            if (typeof chrome.storage.local.set !== 'function') {
                console.warn('Chrome API不可用: storage.local.set不是函数');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('检查Chrome API时出错:', error);
            return false;
        }
    }

    isLocalStorageAvailable() {
        try {
            if (typeof localStorage === 'undefined') {
                return false;
            }
            
            // 测试写入和读取
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            const testValue = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            return testValue === 'test';
        } catch (error) {
            console.error('检查localStorage时出错:', error);
            return false;
        }
    }

    initializeElements() {
        this.xpathInput = document.getElementById('xpathInput');
        this.extractBtn = document.getElementById('extractBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.viewBtn = document.getElementById('viewBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.presetBtn = document.getElementById('presetBtn');
        this.saveXpathBtn = document.getElementById('saveXpathBtn');
        this.manageXpathBtn = document.getElementById('manageXpathBtn');
        this.status = document.getElementById('status');
        this.urlCount = document.getElementById('urlCount');
        
        // 添加调试信息
        console.log('初始化元素 - xpathInput:', this.xpathInput);
    }

    bindEvents() {
        this.extractBtn.addEventListener('click', () => this.extractUrls());
        this.copyBtn.addEventListener('click', () => this.copyUrls());
        this.viewBtn.addEventListener('click', () => this.viewUrls());
        this.clearBtn.addEventListener('click', () => this.clearResults());
        this.presetBtn.addEventListener('click', () => this.showPresetRules());
        this.saveXpathBtn.addEventListener('click', () => this.showSaveXpathDialog());
        this.manageXpathBtn.addEventListener('click', () => this.showManageXpathDialog());
        this.xpathInput.addEventListener('input', () => this.saveXPath());
    }

    async extractUrls() {
        const xpath = this.xpathInput.value.trim();
        if (!xpath) {
            this.showStatus('请输入XPath规则', 'error');
            return;
        }

        this.extractBtn.disabled = true;
        this.extractBtn.textContent = '提取中...';
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            console.log('开始提取URL，XPath:', xpath, '当前标签页:', tab.url);
            
            // 注入脚本到页面
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (xpathRule, currentPageUrl) => {
                    console.log('在页面中执行提取，XPath:', xpathRule);
                    
                    try {
                        // 执行XPath查询
                        const result = document.evaluate(
                            xpathRule,
                            document,
                            null,
                            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                            null
                        );

                        console.log('匹配到节点数量:', result.snapshotLength);

                        const urls = [];
                        const seenUrls = new Set();

                        // 获取基础URL信息
                        let baseUrl = '';
                        let currentDir = '';
                        
                        try {
                            const urlObj = new URL(currentPageUrl || window.location.href);
                            baseUrl = `${urlObj.protocol}//${urlObj.host}`;
                            currentDir = currentPageUrl.substring(0, currentPageUrl.lastIndexOf('/') + 1);
                        } catch (e) {
                            const urlObj = new URL(window.location.href);
                            baseUrl = `${urlObj.protocol}//${urlObj.host}`;
                            currentDir = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
                        }

                        console.log('baseUrl:', baseUrl, 'currentDir:', currentDir);

                        for (let i = 0; i < result.snapshotLength; i++) {
                            const node = result.snapshotItem(i);
                            let url = '';

                            // 获取URL值
                            if (node.nodeType === Node.ATTRIBUTE_NODE) {
                                url = node.value;
                            } else if (node.nodeType === Node.ELEMENT_NODE) {
                                url = node.href || node.src || node.textContent;
                            } else if (node.nodeType === Node.TEXT_NODE) {
                                url = node.textContent;
                            }

                            if (!url || !url.trim) continue;
                            url = url.trim();
                            if (!url) continue;

                            console.log(`处理节点 ${i}: ${url}`);

                            // 处理相对路径
                            let finalUrl = url;
                            
                            try {
                                if (url.startsWith('//')) {
                                    // 协议相对URL
                                    finalUrl = window.location.protocol + url;
                                } else if (url.startsWith('/')) {
                                    // 根相对URL
                                    finalUrl = baseUrl + url;
                                } else if (!url.startsWith('http://') && !url.startsWith('https://') && 
                                           !url.startsWith('mailto:') && !url.startsWith('tel:') && 
                                           !url.startsWith('javascript:') && !url.startsWith('#')) {
                                    // 相对URL
                                    finalUrl = currentDir + url;
                                }

                                // 尝试规范化URL
                                try {
                                    const normalizedUrl = new URL(finalUrl).href;
                                    if (!seenUrls.has(normalizedUrl)) {
                                        seenUrls.add(normalizedUrl);
                                        urls.push(normalizedUrl);
                                        console.log(`添加URL: ${normalizedUrl}`);
                                    }
                                } catch (urlError) {
                                    // 无法规范化的URL直接添加
                                    if (!seenUrls.has(finalUrl)) {
                                        seenUrls.add(finalUrl);
                                        urls.push(finalUrl);
                                        console.log(`添加原始URL: ${finalUrl}`);
                                    }
                                }
                            } catch (e) {
                                console.warn('处理URL时出错:', url, e);
                            }
                        }

                        console.log('最终提取结果:', urls.length, '个URL');
                        return { urls, error: null };
                        
                    } catch (error) {
                        console.error('XPath提取出错:', error);
                        return { urls: [], error: error.message };
                    }
                },
                args: [xpath, tab.url]
            });

            console.log('提取脚本执行结果:', results);

            if (results && results[0] && results[0].result) {
                const { urls, error } = results[0].result;
                
                console.log('提取到的URLs:', urls, '错误:', error);
                
                if (error) {
                    this.showStatus(`XPath错误: ${error}`, 'error');
                } else {
                    this.extractedUrls = urls;
                    if (urls.length > 0) {
                        this.showStatus(`成功提取 ${urls.length} 个URL`, 'success');
                    } else {
                        this.showStatus(`未找到匹配的URL，请检查XPath规则或页面内容`, 'info');
                    }
                    this.updateUrlCount();
                    this.enableButtons();
                }
            } else {
                console.error('提取结果为空或格式错误:', results);
                this.showStatus('提取失败，请检查XPath规则', 'error');
            }
        } catch (error) {
            console.error('提取URL时出错:', error);
            this.showStatus('提取失败: ' + error.message, 'error');
        } finally {
            this.extractBtn.disabled = false;
            this.extractBtn.textContent = '🔍 提取URL';
        }
    }

    async copyUrls() {
        if (this.extractedUrls.length === 0) {
            this.showStatus('没有可复制的URL', 'error');
            return;
        }

        try {
            const urlsText = this.extractedUrls.join('\n');
            await navigator.clipboard.writeText(urlsText);
            this.showStatus(`已复制 ${this.extractedUrls.length} 个URL到剪贴板`, 'success');
        } catch (error) {
            console.error('复制失败:', error);
            this.showStatus('复制失败: ' + error.message, 'error');
        }
    }

    async viewUrls() {
        if (this.extractedUrls.length === 0) {
            this.showStatus('没有可查看的URL', 'error');
            return;
        }

        try {
            // 1. 将数据存储到 chrome.storage.local（与 details.js 保持一致）
            const dataKey = 'urls_' + Date.now();
            await chrome.storage.local.set({ [dataKey]: this.extractedUrls });

            // 2. 打开新的详情页面，并通过URL参数传递数据键
            const detailsPageUrl = chrome.runtime.getURL('details.html?dataKey=' + dataKey);
            
            const viewWindow = window.open(detailsPageUrl, 'URLViewer', 'width=' + screen.availWidth + ',height=' + screen.availHeight + ',left=0,top=0,scrollbars=yes,resizable=yes');
            
            if (!viewWindow) {
                this.showStatus('弹窗被阻止，请检查浏览器设置', 'error');
                // 清理已存储的数据
                chrome.storage.local.remove(dataKey);
                this.fallbackDownload('extracted_urls.txt', this.extractedUrls.join('\n'));
            }

        } catch (error) {
            console.error('打开详情窗口失败:', error);
            this.showStatus('创建详情窗口失败: ' + error.message, 'error');
        }
    }

    fallbackDownload(filename, content) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.showStatus('已启动备用下载', 'info');
    }

    clearResults() {
        this.extractedUrls = [];
        this.disableButtons();
        this.hideStatus();
        this.updateUrlCount();
        this.showStatus('结果已清空', 'info');
    }

    async showPresetRules() {
        let customXPaths = {};
        
        // 尝试获取自定义保存的XPath规则
        try {
            if (this.chromeApiAvailable) {
                try {
                    const result = await chrome.storage.local.get(['customXPaths']);
                    customXPaths = result.customXPaths || {};
                } catch (chromeError) {
                    console.warn('Chrome Storage API失败，尝试localStorage:', chromeError);
                    this.chromeApiAvailable = false;
                }
            }
            
            if (!this.chromeApiAvailable) {
                try {
                    const stored = localStorage.getItem('customXPaths');
                    customXPaths = stored ? JSON.parse(stored) : {};
                } catch (localError) {
                    console.error('localStorage读取失败:', localError);
                    // 继续执行，只是没有自定义规则
                }
            }
        } catch (error) {
            console.error('获取自定义XPath失败:', error);
            // 继续执行，只是没有自定义规则
        }

        const presets = [
            { name: '所有链接', value: '//a/@href', type: 'builtin' },
            { name: '所有图片', value: '//img/@src', type: 'builtin' },
            { name: '所有脚本', value: '//script/@src', type: 'builtin' },
            { name: '所有样式表', value: '//link[@rel="stylesheet"]/@href', type: 'builtin' },
            { name: '所有媒体文件', value: '//*[@src or @href][contains(@src, ".mp4") or contains(@src, ".mp3") or contains(@href, ".pdf")]/@*[name()="src" or name()="href"]', type: 'builtin' },
            { name: '外链URL', value: '//a[starts-with(@href, "http")]/@href', type: 'builtin' },
            { name: '站内链接', value: '//a[starts-with(@href, "/") or not(starts-with(@href, "http"))]/@href', type: 'builtin' }
        ];

        // 添加自定义规则
        Object.values(customXPaths)
            .sort((a, b) => (b.useCount || 0) - (a.useCount || 0)) // 按使用次数排序
            .forEach(xpath => {
                presets.push({
                    name: `${xpath.name} (自定义)`,
                    value: xpath.xpath,
                    type: 'custom',
                    useCount: xpath.useCount || 0
                });
            });

        let presetHtml = '<div style="max-height: 400px; overflow-y: auto;">';
        
        // 内置规则
        presetHtml += '<h4 style="margin: 0 0 10px 0; color: #007bff;">内置规则</h4>';
        presets.filter(p => p.type === 'builtin').forEach(function(preset) {
            presetHtml += '<div class="preset-item" onclick="selectPreset(\'' + preset.value.replace(/'/g, "\\'") + '\')">' +
                '<strong>' + preset.name + '</strong><br>' +
                '<code style="color:#666; font-size: 11px;">' + preset.value + '</code>' +
            '</div>';
        });

        // 自定义规则
        const customPresets = presets.filter(p => p.type === 'custom');
        if (customPresets.length > 0) {
            presetHtml += '<h4 style="margin: 15px 0 10px 0; color: #28a745;">自定义规则</h4>';
            customPresets.forEach(function(preset) {
                presetHtml += '<div class="preset-item" onclick="selectPreset(\'' + preset.value.replace(/'/g, "\\'") + '\')">' +
                    '<strong>' + preset.name + '</strong> <span style="color: #999; font-size: 11px;">(使用' + preset.useCount + '次)</span><br>' +
                    '<code style="color:#666; font-size: 11px;">' + preset.value + '</code>' +
                '</div>';
            });
        }

        presetHtml += '</div>';

        const presetWindow = window.open('', 'PresetRules', 'width=600,height=500,scrollbars=yes');
        presetWindow.document.write(
            '<!DOCTYPE html>' +
            '<html>' +
            '<head>' +
            '    <meta charset="utf-8">' +
            '    <title>预设XPath规则</title>' +
            '    <style>' +
            '        body { font-family: Arial, sans-serif; margin: 20px; }' +
            '        .preset-item { padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; margin-bottom: 5px; }' +
            '        .preset-item:hover { background: #f0f0f0; border-radius: 4px; }' +
            '        code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }' +
            '        h4 { border-bottom: 2px solid currentColor; padding-bottom: 5px; }' +
            '    </style>' +
            '</head>' +
            '<body>' +
            '    <h2>选择XPath规则</h2>' +
            presetHtml +
            '    <script>' +
            '        function selectPreset(value) {' +
            '            window.opener.document.getElementById(\'xpathInput\').value = value;' +
            '            window.opener.document.getElementById(\'xpathInput\').dispatchEvent(new Event(\'input\'));' +
            '            window.close();' +
            '        }' +
            '    </script>' +
            '</body>' +
            '</html>'
        );
    }

    enableButtons() {
        this.copyBtn.disabled = false;
        this.viewBtn.disabled = false;
    }

    disableButtons() {
        this.copyBtn.disabled = true;
        this.viewBtn.disabled = true;
    }

    showStatus(message, type) {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
        this.status.classList.remove('hidden');
        
        // 自动隐藏成功和信息消息
        if (type === 'success' || type === 'info') {
            setTimeout(() => this.hideStatus(), 3000);
        }
    }

    hideStatus() {
        this.status.classList.add('hidden');
    }

    updateUrlCount() {
        if (this.extractedUrls.length > 0) {
            this.urlCount.textContent = `✅ 已提取 ${this.extractedUrls.length} 个URL`;
        } else {
            this.urlCount.textContent = '';
        }
    }

    saveXPath() {
        try {
            const xpath = this.xpathInput.value;
            
            if (this.chromeApiAvailable && chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ 'savedXPath': xpath });
            } else {
                // 降级到localStorage
                try {
                    localStorage.setItem('savedXPath', xpath);
                } catch (localError) {
                    console.warn('localStorage不可用，无法保存当前XPath:', localError);
                }
            }
        } catch (error) {
            console.error('保存当前XPath失败:', error);
        }
    }

    loadSavedXPath() {
        try {
            if (this.chromeApiAvailable && chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['savedXPath'], (result) => {
                    if (result.savedXPath) {
                        this.xpathInput.value = result.savedXPath;
                    }
                });
            } else {
                // 降级到localStorage
                try {
                    const savedXPath = localStorage.getItem('savedXPath');
                    if (savedXPath) {
                        this.xpathInput.value = savedXPath;
                    }
                } catch (localError) {
                    console.warn('localStorage不可用，无法加载保存的XPath:', localError);
                }
            }
        } catch (error) {
            console.error('加载保存的XPath失败:', error);
        }
    }

    // XPath管理功能
    async showSaveXpathDialog() {
        const xpath = this.xpathInput.value.trim();
        if (!xpath) {
            this.showStatus('请先输入XPath规则', 'error');
            return;
        }

        // 检查存储是否可用（Chrome Storage或localStorage）
        if (!this.chromeApiAvailable && !this.isLocalStorageAvailable()) {
            this.showStatus('存储功能不可用，请检查浏览器权限', 'error');
            return;
        }

        // 先检查是否已存在相同的XPath规则
        try {
            let customXPaths = {};
            
            // 获取现有规则
            if (this.chromeApiAvailable) {
                try {
                    const result = await chrome.storage.local.get(['customXPaths']);
                    customXPaths = result.customXPaths || {};
                } catch (chromeError) {
                    const stored = localStorage.getItem('customXPaths');
                    customXPaths = stored ? JSON.parse(stored) : {};
                }
            } else {
                const stored = localStorage.getItem('customXPaths');
                customXPaths = stored ? JSON.parse(stored) : {};
            }
            
            // 检查是否已存在相同的XPath
            const existingEntry = Object.entries(customXPaths).find(([key, rule]) => rule.xpath === xpath);
            
            if (existingEntry) {
                const [existingName] = existingEntry;
                this.showStatus(`该XPath规则已存在，名称为 "${existingName}"`, 'info');
                const action = confirm(`该XPath规则已存在，名称为 "${existingName}"。\n\n是否要为其设置新的名称？`);
                if (!action) {
                    return;
                }
            }
        } catch (error) {
            console.warn('检查现有规则时出错:', error);
        }

        const name = prompt('请输入XPath规则的名称:', '');
        if (name && name.trim()) {
            const trimmedName = name.trim();
            
            // 验证名称长度
            if (trimmedName.length > 50) {
                this.showStatus('规则名称不能超过50个字符', 'error');
                return;
            }
            
            // 验证名称是否包含特殊字符
            if (!/^[a-zA-Z0-9\u4e00-\u9fa5_\-\s]+$/.test(trimmedName)) {
                this.showStatus('规则名称只能包含字母、数字、中文、下划线、连字符和空格', 'error');
                return;
            }
            
            await this.saveCustomXPath(trimmedName, xpath);
        }
    }

    async saveCustomXPath(name, xpath) {
        try {
            let customXPaths = {};
            
            // 重新检查Chrome API可用性（可能在运行时发生变化）
            const chromeApiCurrentlyAvailable = this.chromeApiAvailable && 
                typeof chrome !== 'undefined' && 
                chrome && 
                chrome.storage && 
                chrome.storage.local;
            
            // 尝试使用Chrome Storage API
            if (chromeApiCurrentlyAvailable) {
                try {
                    const result = await chrome.storage.local.get(['customXPaths']);
                    customXPaths = result.customXPaths || {};
                } catch (chromeError) {
                    console.warn('Chrome Storage API失败，尝试localStorage:', chromeError);
                    this.chromeApiAvailable = false;
                }
            }
            
            // 降级到localStorage
            if (!chromeApiCurrentlyAvailable || !this.chromeApiAvailable) {
                try {
                    const stored = localStorage.getItem('customXPaths');
                    customXPaths = stored ? JSON.parse(stored) : {};
                } catch (localError) {
                    console.error('localStorage也不可用:', localError);
                    throw new Error('无法访问存储，请检查浏览器权限');
                }
            }
            
            // 检查是否已存在相同的XPath规则
            const existingEntry = Object.entries(customXPaths).find(([key, rule]) => rule.xpath === xpath);
            
            if (existingEntry) {
                const [existingName, existingRule] = existingEntry;
                if (existingName === name) {
                    // 名称和XPath都相同，询问是否覆盖
                    const overwrite = confirm(`XPath规则 "${name}" 已存在。是否覆盖？`);
                    if (!overwrite) {
                        this.showStatus('取消保存', 'info');
                        return;
                    }
                } else {
                    // XPath相同但名称不同，询问如何处理
                    const action = confirm(
                        `相同的XPath规则已存在，名称为 "${existingName}"。\n\n` +
                        `点击"确定"覆盖现有规则，点击"取消"使用新名称保存副本。`
                    );
                    if (action) {
                        // 用户选择覆盖，删除旧的并用新名称保存
                        delete customXPaths[existingName];
                        this.showStatus(`已覆盖原有规则 "${existingName}"`, 'info');
                    } else {
                        // 用户选择保存副本，继续使用新名称
                        this.showStatus(`保存为新规则 "${name}"`, 'info');
                    }
                }
            }

            customXPaths[name] = {
                name: name,
                xpath: xpath,
                createTime: Date.now(),
                useCount: customXPaths[name] ? customXPaths[name].useCount || 0 : 0
            };

            // 保存数据
            if (chromeApiCurrentlyAvailable && this.chromeApiAvailable) {
                try {
                    await chrome.storage.local.set({ customXPaths });
                } catch (saveError) {
                    console.warn('Chrome Storage保存失败，使用localStorage:', saveError);
                    localStorage.setItem('customXPaths', JSON.stringify(customXPaths));
                }
            } else {
                localStorage.setItem('customXPaths', JSON.stringify(customXPaths));
            }
            
            this.showStatus(`XPath规则 "${name}" 已保存`, 'success');
        } catch (error) {
            console.error('保存XPath失败:', error);
            this.showStatus('保存失败: ' + error.message, 'error');
        }
    }

    async showManageXpathDialog() {
        try {
            let customXPaths = {};
            
            // 重新检查Chrome API可用性
            const chromeApiCurrentlyAvailable = this.chromeApiAvailable && 
                typeof chrome !== 'undefined' && 
                chrome && 
                chrome.storage && 
                chrome.storage.local;
            
            // 尝试使用Chrome Storage API
            if (chromeApiCurrentlyAvailable) {
                try {
                    const result = await chrome.storage.local.get(['customXPaths']);
                    customXPaths = result.customXPaths || {};
                } catch (chromeError) {
                    console.warn('Chrome Storage API失败，尝试localStorage:', chromeError);
                    this.chromeApiAvailable = false;
                }
            }
            
            // 降级到localStorage
            if (!chromeApiCurrentlyAvailable || !this.chromeApiAvailable) {
                try {
                    const stored = localStorage.getItem('customXPaths');
                    customXPaths = stored ? JSON.parse(stored) : {};
                } catch (localError) {
                    console.error('localStorage读取失败:', localError);
                    this.showStatus('无法读取保存的规则', 'error');
                    return;
                }
            }
            
            this.createManageXPathModal(customXPaths);
        } catch (error) {
            console.error('获取XPath规则失败:', error);
            this.showStatus('获取规则失败: ' + error.message, 'error');
        }
    }

    createManageXPathModal(customXPaths) {
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML =
            '<div class="modal-content">' +
                '<div class="modal-header">' +
                    '<h3 class="modal-title">管理已保存的XPath规则</h3>' +
                    '<button class="close-btn" id="closeModal">&times;</button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<div id="xpathList"></div>' +
                    (Object.keys(customXPaths).length === 0 ?
                        '<div class="empty-state">暂无已保存的XPath规则</div>' :
                        '') +
                '</div>' +
            '</div>';

        document.body.appendChild(modal);

        // 填充XPath列表
        this.populateXPathList(customXPaths);

        // 绑定事件
        modal.querySelector('#closeModal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    populateXPathList(customXPaths) {
        const listContainer = document.getElementById('xpathList');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        Object.entries(customXPaths)
            .sort(([,a], [,b]) => b.createTime - a.createTime) // 按创建时间排序
            .forEach(([key, xpath]) => {
                const item = document.createElement('div');
                item.className = 'saved-xpath-item';
                item.innerHTML =
                    '<div class="saved-xpath-info">' +
                        '<div class="saved-xpath-name">' + this.escapeHtml(xpath.name) + '</div>' +
                        '<div class="saved-xpath-rule">' + this.escapeHtml(xpath.xpath) + '</div>' +
                        '<div style="font-size: 10px; color: #999; margin-top: 2px;">' +
                            '创建: ' + new Date(xpath.createTime).toLocaleString() + ' | 使用次数: ' + xpath.useCount +
                        '</div>' +
                    '</div>' +
                    '<div class="saved-xpath-actions">' +
                        '<button class="btn-tiny btn-use">使用</button>' +
                        '<button class="btn-tiny btn-delete">删除</button>' +
                    '</div>';

                // 绑定使用按钮事件 - 使用闭包保存原始数据
                const self = this;
                const originalXPath = xpath.xpath; // 保存原始XPath，不进行转义
                const originalName = xpath.name;
                const originalKey = key;
                
                item.querySelector('.btn-use').addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log('点击使用按钮:', originalXPath, originalName);
                    
                    // 先执行XPath应用逻辑
                    await self.useCustomXPath(originalXPath, originalName);
                    
                    // 然后关闭模态框
                    const modal = document.querySelector('.modal');
                    if (modal) {
                        modal.remove();
                    }
                });

                // 绑定删除按钮事件
                item.querySelector('.btn-delete').addEventListener('click', (e) => {
                    const key = originalKey;
                    self.deleteCustomXPath(key);
                });

                listContainer.appendChild(item);
            });
    }

    async useCustomXPath(xpath, name) {
        console.log('使用自定义XPath - 输入参数:', { xpath, name });
        
        // 确保设置XPath输入框的值
        if (!this.xpathInput) {
            console.error('XPath输入框元素未找到');
            this.showStatus('输入框元素未找到', 'error');
            return;
        }
        
        console.log('更新前输入框值:', this.xpathInput.value);
        
        // 直接设置值
        this.xpathInput.value = xpath;
        
        console.log('更新后输入框值:', this.xpathInput.value);
        
        // 触发input事件以确保保存
        this.xpathInput.dispatchEvent(new Event('input', { bubbles: true }));
        this.xpathInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // 立即保存XPath
        this.saveXPath();
        
        // 显示成功状态
        this.showStatus(`已应用XPath规则 "${name}"`, 'success');
    }

    async deleteCustomXPath(key) {
        if (confirm(`确定要删除XPath规则 "${key}" 吗？`)) {
            try {
                let customXPaths = {};
                
                // 重新检查Chrome API可用性
                const chromeApiCurrentlyAvailable = this.chromeApiAvailable && 
                    typeof chrome !== 'undefined' && 
                    chrome && 
                    chrome.storage && 
                    chrome.storage.local;
                
                if (chromeApiCurrentlyAvailable) {
                    try {
                        const result = await chrome.storage.local.get(['customXPaths']);
                        customXPaths = result.customXPaths || {};
                    } catch (chromeError) {
                        console.warn('Chrome Storage API失败，尝试localStorage:', chromeError);
                        this.chromeApiAvailable = false;
                    }
                }
                
                // 降级到localStorage
                if (!chromeApiCurrentlyAvailable || !this.chromeApiAvailable) {
                    try {
                        const stored = localStorage.getItem('customXPaths');
                        customXPaths = stored ? JSON.parse(stored) : {};
                    } catch (localError) {
                        console.error('localStorage读取失败:', localError);
                        this.showStatus('无法读取保存的规则', 'error');
                        return;
                    }
                }

                delete customXPaths[key];
                
                // 保存更新后的数据
                if (chromeApiCurrentlyAvailable && this.chromeApiAvailable) {
                    try {
                        await chrome.storage.local.set({ customXPaths });
                    } catch (saveError) {
                        console.warn('Chrome Storage保存失败，使用localStorage:', saveError);
                        localStorage.setItem('customXPaths', JSON.stringify(customXPaths));
                    }
                } else {
                    localStorage.setItem('customXPaths', JSON.stringify(customXPaths));
                }
                
                this.showStatus(`已删除XPath规则 "${key}"`, 'success');
                
                // 刷新列表
                this.populateXPathList(customXPaths);
            } catch (error) {
                console.error('删除XPath失败:', error);
                this.showStatus('删除失败: ' + error.message, 'error');
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new URLExtractor();
});
