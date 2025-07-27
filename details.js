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

        const data = result[storageKey];

        // 数据使用后立即清理，避免存储膨胀
        chrome.storage.local.remove(storageKey);

        if (!data) {
            renderError('未能加载数据或数据为空。');
            return;
        }

        // 兼容旧格式数据（直接是数组）和新格式数据（包含模式信息的对象）
        let content, mode, modeDetails;
        if (Array.isArray(data)) {
            // 旧格式：直接是URL数组
            content = data;
            mode = 'url';
            modeDetails = '传统URL模式';
        } else {
            // 新格式：包含模式信息的对象
            content = data.content || [];
            mode = data.mode || 'url';
            modeDetails = data.modeDetails || '未知模式';
        }

        if (!content || content.length === 0) {
            renderError('未能加载内容数据或数据为空。');
            return;
        }

        renderPage(content, mode, modeDetails);
    });
});

function renderError(message) {
    const root = document.getElementById('root');
    root.innerHTML = '<div class="loading-container"><p>' + message + '</p></div>';
}

function renderPage(content, mode, modeDetails) {
    const root = document.getElementById('root');
    root.innerHTML = ''; // 清空加载提示
    
    const modeText = mode === 'url' ? 'URL' : '文本';
    const contentType = mode === 'url' ? 'URL' : '内容';
    
    document.title = `提取的${modeText}列表 - ${content.length}个`;

    const containerDiv = document.createElement('div');
    containerDiv.className = 'container';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'header';
    headerDiv.innerHTML = `
        <h1>🎯 提取的${modeText}列表</h1>
        <p>共找到 ${content.length} 个${contentType}</p>
        <p class="mode-info">模式详情：${modeDetails}</p>
    `;
    
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

    content.forEach(function(item, index) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'url-item';
        
        if (mode === 'url') {
            // URL模式：显示为可点击链接
            itemDiv.innerHTML = 
                '<span class="url-index">' + (index + 1) + '</span>' +
                '<a href="' + escapeHtml(item) + '" class="url-link" target="_blank">' + escapeHtml(item) + '</a>' +
                '<button class="copy-btn" data-content="' + escapeHtml(item) + '">复制</button>';
        } else {
            // 文本模式：显示为纯文本
            itemDiv.innerHTML = 
                '<span class="url-index">' + (index + 1) + '</span>' +
                '<span class="text-content">' + escapeHtml(item) + '</span>' +
                '<button class="copy-btn" data-content="' + escapeHtml(item) + '">复制</button>';
        }
        
        urlListDiv.appendChild(itemDiv);
    });

    containerDiv.appendChild(headerDiv);
    containerDiv.appendChild(actionsDiv);
    containerDiv.appendChild(urlListDiv);
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

    const exportContentAsFile = function(contentToExport, separator, mode) {
        const text = contentToExport.join(separator);
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const modePrefix = mode === 'url' ? 'urls' : 'content';
        link.download = `extracted_${modePrefix}_` + new Date().toISOString().slice(0,10) + '.txt';
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
        const text = content.join(separator);
        const modeText = mode === 'url' ? 'URL' : '内容项';
        copyText(text, `✅ ${content.length}个${modeText}已全部复制`);
    });
    
    // 导出按钮
    document.getElementById('exportBtn').addEventListener('click', function() {
        const separator = getCurrentSeparator();
        exportContentAsFile(content, separator, mode);
        const modeText = mode === 'url' ? 'URL' : '内容';
        showNotification(`✅ ${modeText}文件导出成功`);
    });
    
    // 关闭按钮
    document.getElementById('closeBtn').addEventListener('click', function() {
        window.close();
    });
    
    // 内容项目点击事件
    urlListDiv.addEventListener('click', function(e) {
        if (e.target.classList.contains('copy-btn')) {
            const modeText = mode === 'url' ? 'URL' : '内容';
            copyText(e.target.dataset.content, `✅ ${modeText}已复制`);
        }
    });
}
