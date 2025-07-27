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
        // 存储提取到的内容数组
        this.extractedUrls = [];
        // 存储内容模式信息
        this.extractedMode = null;
        this.extractedModeDetails = null;
        
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
            
            // 注入脚本到页面
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (xpathRule, currentPageUrl) => {
                    // 内容模式检测函数
                    window.detectContentMode = function(contentArray, baseUrl, currentDir) {
                        if (!contentArray || contentArray.length === 0) {
                            return { mode: 'text', processedContent: [], details: '无内容' };
                        }

                        // 检查是否所有内容都符合URL格式
                        let urlCount = 0;
                        let relativeCount = 0;
                        let absoluteCount = 0;
                        const processedUrls = [];

                        for (const content of contentArray) {
                            const trimmed = content.trim();
                            if (window.isValidUrl(trimmed)) {
                                urlCount++;
                                if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                                    absoluteCount++;
                                    processedUrls.push(trimmed);
                                } else {
                                    relativeCount++;
                                    const absoluteUrl = window.convertToAbsoluteUrl(trimmed, baseUrl, currentDir);
                                    processedUrls.push(absoluteUrl);
                                }
                            } else {
                                // 有一个不符合URL格式，直接判定为文本模式
                                return { 
                                    mode: 'text', 
                                    processedContent: contentArray,
                                    details: '文本模式'
                                };
                            }
                        }

                        // 所有内容都符合URL格式
                        return {
                            mode: 'url',
                            processedContent: processedUrls,
                            details: 'URL模式'
                        };
                    };

                    // URL有效性验证函数
                    window.isValidUrl = function(str) {
                        const trimmed = str.trim();
                        
                        // 检查是否为绝对URL
                        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                            try {
                                new URL(trimmed);
                                return true;
                            } catch {
                                return false;
                            }
                        }
                        
                        // 检查是否为相对路径
                        return window.isValidRelativePath(trimmed);
                    };

                    // 相对路径有效性验证
                    window.isValidRelativePath = function(path) {
                        const trimmed = path.trim();
                        
                        // 排除明显不是URL的内容
                        if (trimmed === '' || 
                            trimmed.includes('\n') || 
                            trimmed.includes('\t') ||
                            trimmed.length > 2000 ||
                            /[<>"|*]/.test(trimmed)) {
                            return false;
                        }
                        
                        // 支持以下格式的相对路径：
                        if (trimmed.startsWith('//')) {
                            // 协议相对路径
                            return true;
                        } else if (trimmed.startsWith('/')) {
                            // 根目录路径（站内相对路径）
                            // 检查是否是有效的路径格式（包含路径字符、参数等）
                            return /^\/[a-zA-Z0-9\/._~:?#[\]@!$&'()*+,;=%=-]*$/.test(trimmed);
                        }
                        
                        return false;
                    };

                    // 相对路径转绝对路径
                    window.convertToAbsoluteUrl = function(relativePath, baseUrl, currentDir) {
                        const trimmed = relativePath.trim();
                        
                        try {
                            if (trimmed.startsWith('//')) {
                                // 协议相对URL
                                return window.location.protocol + trimmed;
                            } else if (trimmed.startsWith('/')) {
                                // 根相对URL（站内相对路径）
                                return baseUrl + trimmed;
                            } else {
                                // 其他情况直接返回原始路径（不应该到达这里，因为已在验证中过滤）
                                return trimmed;
                            }
                        } catch (e) {
                            return trimmed;
                        }
                    };
                    
                    try {
                        // 执行XPath查询
                        const result = document.evaluate(
                            xpathRule,
                            document,
                            null,
                            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                            null
                        );

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

                        // 第一步：提取原始内容
                        const rawContent = [];
                        for (let i = 0; i < result.snapshotLength; i++) {
                            const node = result.snapshotItem(i);
                            let content = '';

                            // 获取内容值
                            if (node.nodeType === Node.ATTRIBUTE_NODE) {
                                content = node.value;
                            } else if (node.nodeType === Node.ELEMENT_NODE) {
                                content = node.href || node.src || node.textContent;
                            } else if (node.nodeType === Node.TEXT_NODE) {
                                content = node.textContent;
                            }

                            if (!content || !content.trim) continue;
                            content = content.trim();
                            if (!content) continue;

                            rawContent.push(content);
                        }

                        // 第二步：检测内容模式
                        const modeResult = window.detectContentMode(rawContent, baseUrl, currentDir);

                        // 第三步：根据模式处理内容
                        const finalResults = [];
                        const seenItems = new Set();

                        if (modeResult.mode === 'url') {
                            // URL模式：处理相对路径补全和去重
                            modeResult.processedContent.forEach(url => {
                                if (!seenItems.has(url)) {
                                    seenItems.add(url);
                                    finalResults.push(url);
                                }
                            });
                        } else {
                            // 文本模式：保持原样，仅去重
                            rawContent.forEach(text => {
                                if (!seenItems.has(text)) {
                                    seenItems.add(text);
                                    finalResults.push(text);
                                }
                            });
                        }

                        return { 
                            urls: finalResults, 
                            error: null, 
                            mode: modeResult.mode,
                            modeDetails: modeResult.details 
                        };
                        
                    } catch (error) {
                        return { urls: [], error: error.message };
                    }
                },
                args: [xpath, tab.url]
            });

            if (results && results[0] && results[0].result) {
                const { urls, error, mode, modeDetails } = results[0].result;
                
                if (error) {
                    this.showStatus(`XPath错误: ${error}`, 'error');
                } else {
                    this.extractedUrls = urls;
                    // 更新属性以存储模式信息
                    this.extractedMode = mode;
                    this.extractedModeDetails = modeDetails;
                    
                    if (urls.length > 0) {
                        const modeText = mode === 'url' ? 'URL' : '文本项';
                        const modePrefix = mode === 'url' ? 'URL模式' : '文本模式';
                        this.showStatus(`${modePrefix}：成功提取 ${urls.length} 个${modeText}`, 'success');
                    } else {
                        this.showStatus(`未找到匹配的内容，请检查XPath规则或页面内容`, 'info');
                    }
                    this.updateUrlCount();
                    this.enableButtons();
                }
            } else {
                this.showStatus('提取失败，请检查XPath规则', 'error');
            }
        } catch (error) {
            this.showStatus('提取失败: ' + error.message, 'error');
        } finally {
            this.extractBtn.disabled = false;
            this.extractBtn.textContent = '🔍 提取内容';
        }
    }

    async copyUrls() {
        if (this.extractedUrls.length === 0) {
            this.showStatus('没有可复制的内容', 'error');
            return;
        }

        try {
            const contentText = this.extractedUrls.join('\n');
            await navigator.clipboard.writeText(contentText);
            const modeText = this.extractedMode === 'url' ? 'URL' : '文本';
            this.showStatus(`已复制 ${this.extractedUrls.length} 个${modeText}项到剪贴板`, 'success');
        } catch (error) {
            console.error('复制失败:', error);
            this.showStatus('复制失败: ' + error.message, 'error');
        }
    }

    async viewUrls() {
        if (this.extractedUrls.length === 0) {
            this.showStatus('没有可查看的内容', 'error');
            return;
        }

        try {
            // 1. 将数据存储到 chrome.storage.local（与 details.js 保持一致）
            const dataKey = 'extracted_content_' + Date.now();
            const dataToStore = {
                content: this.extractedUrls,
                mode: this.extractedMode,
                modeDetails: this.extractedModeDetails,
                timestamp: new Date().toISOString()
            };
            await chrome.storage.local.set({ [dataKey]: dataToStore });

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
        this.extractedMode = null;
        this.extractedModeDetails = null;
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

        let presetHtml = '';
        
        // 内置规则
        presetHtml += '<h4>📚 内置规则</h4>';
        presets.filter(p => p.type === 'builtin').forEach(function(preset) {
            presetHtml += '<div class="preset-item" onclick="selectPreset(\'' + preset.value.replace(/'/g, "\\'") + '\')">' +
                '<div class="preset-name">' + preset.name + '</div>' +
                '<div class="preset-xpath">' + preset.value + '</div>' +
            '</div>';
        });

        // 自定义规则
        const customPresets = presets.filter(p => p.type === 'custom');
        if (customPresets.length > 0) {
            presetHtml += '<h4>⭐ 自定义规则</h4>';
            customPresets.forEach(function(preset) {
                presetHtml += '<div class="preset-item" onclick="selectPreset(\'' + preset.value.replace(/'/g, "\\'") + '\')">' +
                    '<div class="preset-name">' + preset.name + '<span class="usage-count">使用' + preset.useCount + '次</span></div>' +
                    '<div class="preset-xpath">' + preset.value + '</div>' +
                '</div>';
            });
        }

        const presetWindow = window.open('', 'PresetRules', 'width=' + screen.availWidth + ',height=' + screen.availHeight + ',left=0,top=0,scrollbars=yes,resizable=yes');
        presetWindow.document.write(
            '<!DOCTYPE html>' +
            '<html>' +
            '<head>' +
            '    <meta charset="utf-8">' +
            '    <title>预设XPath规则</title>' +
            '    <style>' +
            '        body {' +
            '            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;' +
            '            margin: 0;' +
            '            padding: 20px;' +
            '            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);' +
            '            min-height: 100vh;' +
            '            color: #333;' +
            '            -webkit-font-smoothing: antialiased;' +
            '            -moz-osx-font-smoothing: grayscale;' +
            '        }' +
            '        .container {' +
            '            background: white;' +
            '            padding: 40px;' +
            '            border-radius: 20px;' +
            '            box-shadow: 0 12px 40px rgba(0,0,0,0.25);' +
            '            backdrop-filter: blur(10px);' +
            '            max-width: 1200px;' +
            '            width: 90%;' +
            '            margin: 40px auto;' +
            '            min-height: calc(100vh - 120px);' +
            '        }' +
            '        h2 {' +
            '            text-align: center;' +
            '            color: #2c3e50;' +
            '            margin-bottom: 15px;' +
            '            font-size: 2.8em;' +
            '            font-weight: 700;' +
            '        }' +
            '        .subtitle {' +
            '            text-align: center;' +
            '            color: #7f8c8d;' +
            '            margin-bottom: 40px;' +
            '            font-style: italic;' +
            '            font-size: 1.2em;' +
            '        }' +
            '        .rules-container {' +
            '            max-height: calc(100vh - 300px);' +
            '            min-height: 500px;' +
            '            overflow-y: auto;' +
            '            border: 1px solid #e2e8f0;' +
            '            border-radius: 12px;' +
            '            background: #ffffff;' +
            '            box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);' +
            '        }' +
            '        h4 {' +
            '            margin: 20px 0 15px 0;' +
            '            font-size: 1.4em;' +
            '            font-weight: 700;' +
            '            padding: 12px 18px;' +
            '            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);' +
            '            color: white;' +
            '            border-radius: 10px;' +
            '            text-shadow: 0 1px 2px rgba(0,0,0,0.1);' +
            '            letter-spacing: 0.5px;' +
            '        }' +
            '        h4:first-child { margin-top: 0; }' +
            '        .preset-item {' +
            '            padding: 24px 28px;' +
            '            border-bottom: 1px solid #e2e8f0;' +
            '            cursor: pointer;' +
            '            transition: all 0.3s ease;' +
            '            background: white;' +
            '            border-radius: 0;' +
            '        }' +
            '        .preset-item:last-child { border-bottom: none; }' +
            '        .preset-item:hover {' +
            '            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);' +
            '            transform: translateX(4px);' +
            '            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);' +
            '            border-left: 4px solid #667eea;' +
            '        }' +
            '        .preset-item:hover .preset-name {' +
            '            color: #667eea;' +
            '        }' +
            '        .preset-item:hover .preset-xpath {' +
            '            background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%);' +
            '            border-color: #667eea;' +
            '            color: #1a202c;' +
            '        }' +
            '        .preset-name {' +
            '            font-weight: 600;' +
            '            color: #1a202c;' +
            '            font-size: 16px;' +
            '            margin-bottom: 10px;' +
            '            line-height: 1.4;' +
            '        }' +
            '        .preset-xpath {' +
            '            background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);' +
            '            padding: 12px 16px;' +
            '            border-radius: 8px;' +
            '            font-family: "Hack", "Roboto Mono", monospace;' +
            '            font-size: 14px;' +
            '            color: #ea580c;' +
            '            border: 1px solid #fdba74;' +
            '            word-break: break-all;' +
            '            line-height: 1.5;' +
            '            font-weight: 600;' +
            '            border-left: 4px solid #ea580c;' +
            '        }' +
            '        .usage-count {' +
            '            color: #718096;' +
            '            font-size: 12px;' +
            '            font-weight: 500;' +
            '            background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%);' +
            '            padding: 3px 8px;' +
            '            border-radius: 12px;' +
            '            margin-left: 10px;' +
            '            display: inline-block;' +
            '        }' +
            '    </style>' +
            '</head>' +
            '<body>' +
            '    <div class="container">' +
            '        <h2>🎯 XPath规则选择器</h2>' +
            '        <div class="subtitle">选择预设规则或自定义规则快速开始提取</div>' +
            '        <div class="rules-container">' +
            presetHtml +
            '        </div>' +
            '    </div>' +
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
            const modeText = this.extractedMode === 'url' ? 'URL' : '内容项';
            this.urlCount.textContent = `✅ 已提取 ${this.extractedUrls.length} 个${modeText}`;
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
        // 确保设置XPath输入框的值
        if (!this.xpathInput) {
            this.showStatus('输入框元素未找到', 'error');
            return;
        }
        
        // 直接设置值
        this.xpathInput.value = xpath;
        
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
