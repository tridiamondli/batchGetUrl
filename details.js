// details.js
document.addEventListener('DOMContentLoaded', function() {
    // 最终修复方案：使用 chrome.storage.local 进行数据传递
    const urlParams = new URLSearchParams(window.location.search);
    const storageKey = urlParams.get('dataKey');

    if (!storageKey) {
        renderError('错误：未提供数据标识符。');
        return;
    }

    // 异步从 chrome.storage.local 获取数据
    chrome.storage.local.get(storageKey, function(result) {
        if (chrome.runtime.lastError) {
            renderError('读取数据时出错: ' + chrome.runtime.lastError.message);
            return;
        }

        const urls = result[storageKey];

        // 数据使用后立即清理，避免存储膨胀
        chrome.storage.local.remove(storageKey);

        if (!urls || urls.length === 0) {
            renderError('未能加载URL数据或数据为空。');
            return;
        }

        renderPage(urls);
    });
});

function renderError(message) {
    const root = document.getElementById('root');
    root.innerHTML = '<div class="loading-container"><p>' + message + '</p></div>';
}

function renderPage(urls) {
    const root = document.getElementById('root');
    root.innerHTML = ''; // 清空加载提示
    document.title = '提取的URL列表 - ' + urls.length + '个';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'header';
    headerDiv.innerHTML = '<h1>🔗 提取的URL列表</h1><p>共找到 ' + urls.length + ' 个URL</p>';
    
    const containerDiv = document.createElement('div');
    containerDiv.className = 'container';
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions';
    actionsDiv.innerHTML = 
        '<div class="separator-control">' +
            '<label for="separatorSelect">分隔符:</label>' +
            '<select id="separatorSelect">' +
                '<option value="\\n">换行符 (\\n)</option>' +
                '<option value=" ">空格</option>' +
                '<option value=", ">逗号+空格</option>' +
                '<option value="; ">分号+空格</option>' +
                '<option value="\\t">制表符 (\\t)</option>' +
                '<option value="|">竖线 (|)</option>' +
                '<option value="custom">自定义...</option>' +
            '</select>' +
            '<input type="text" id="customSeparator" placeholder="输入自定义分隔符" style="display:none; margin-left:5px; width:120px;">' +
        '</div>' +
        '<div class="action-buttons">' +
            '<button class="btn btn-success" id="copyAllBtn">📋 复制全部</button>' +
            '<button class="btn btn-primary" id="exportBtn">💾 导出文本</button>' +
            '<button class="btn btn-secondary" id="closeBtn">❌ 关闭</button>' +
        '</div>';
    
    const urlListDiv = document.createElement('div');
    urlListDiv.className = 'url-list';

    const escapeHtml = function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    urls.forEach(function(url, index) {
        const item = document.createElement('div');
        item.className = 'url-item';
        item.innerHTML = 
            '<span class="url-index">' + (index + 1) + '</span>' +
            '<a href="' + escapeHtml(url) + '" class="url-link" target="_blank">' + escapeHtml(url) + '</a>' +
            '<button class="copy-btn" data-url="' + escapeHtml(url) + '">复制</button>';
        urlListDiv.appendChild(item);
    });

    containerDiv.appendChild(actionsDiv);
    containerDiv.appendChild(urlListDiv);
    root.appendChild(headerDiv);
    root.appendChild(containerDiv);

    // --- 分隔符处理函数 ---
    const getCurrentSeparator = function() {
        const select = document.getElementById('separatorSelect');
        const customInput = document.getElementById('customSeparator');
        
        if (select.value === 'custom') {
            return customInput.value || '\n'; // 如果自定义为空，默认使用换行符
        } else if (select.value === '\\n') {
            return '\n';
        } else if (select.value === '\\t') {
            return '\t';
        } else {
            return select.value;
        }
    };

    // --- 通知系统 ---
    const showNotification = function(message) {
        let notification = document.querySelector('.notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(function() {
            notification.classList.remove('show');
        }, 2000);
    };

    // --- 事件处理 ---
    const copyText = function(text, successMessage) {
        navigator.clipboard.writeText(text).then(function() {
            showNotification(successMessage);
        }).catch(function(err) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showNotification('内容已复制到剪贴板');
            } catch (e) {
                prompt('自动复制失败，请手动复制:', text);
            }
            document.body.removeChild(textarea);
        });
    };

    const exportUrlsAsFile = function(urlsToExport, separator) {
        const text = urlsToExport.join(separator);
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'extracted_urls_' + new Date().toISOString().slice(0,10) + '.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    };

    // --- 事件绑定 ---
    
    // 分隔符选择器事件
    document.getElementById('separatorSelect').addEventListener('change', function() {
        const customInput = document.getElementById('customSeparator');
        if (this.value === 'custom') {
            customInput.style.display = 'inline';
            customInput.focus();
        } else {
            customInput.style.display = 'none';
        }
    });
    
    // 复制全部按钮
    document.getElementById('copyAllBtn').addEventListener('click', function() {
        const separator = getCurrentSeparator();
        const text = urls.join(separator);
        copyText(text, '✅ ' + urls.length + '个URL已全部复制');
    });
    
    // 导出按钮
    document.getElementById('exportBtn').addEventListener('click', function() {
        const separator = getCurrentSeparator();
        exportUrlsAsFile(urls, separator);
    });
    
    // 关闭按钮
    document.getElementById('closeBtn').addEventListener('click', function() {
        window.close();
    });
    
    // URL项目点击事件
    urlListDiv.addEventListener('click', function(e) {
        if (e.target.classList.contains('copy-btn')) {
            copyText(e.target.dataset.url, '✅ URL已复制');
        }
    });
}
