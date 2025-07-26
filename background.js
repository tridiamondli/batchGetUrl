// background.js - 服务工作进程
chrome.runtime.onInstalled.addListener(() => {
    console.log('批量URL提取器插件已安装');
    
    // 设置默认的XPath规则
    chrome.storage.local.set({
        'savedXPath': '//a/@href',
        'extractHistory': [],
        'customXPaths': {}
    });
});

// 处理来自popup和content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveExtractHistory') {
        // 保存提取历史
        chrome.storage.local.get(['extractHistory'], (result) => {
            const history = result.extractHistory || [];
            const newRecord = {
                timestamp: Date.now(),
                xpath: request.xpath,
                urlCount: request.urlCount,
                domain: request.domain
            };
            
            // 保留最近10条记录
            history.unshift(newRecord);
            if (history.length > 10) {
                history.splice(10);
            }
            
            chrome.storage.local.set({ 'extractHistory': history });
        });
    } else if (request.action === 'getExtractHistory') {
        chrome.storage.local.get(['extractHistory'], (result) => {
            sendResponse(result.extractHistory || []);
        });
        return true; // 保持消息通道开放
    }
});

// 处理插件图标点击事件
chrome.action.onClicked.addListener((tab) => {
    // 这里可以添加额外的逻辑，比如检查页面是否支持等
    console.log('插件图标被点击，当前标签页:', tab.url);
});

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // 页面加载完成，可以进行一些初始化操作
        console.log('页面加载完成:', tab.url);
    }
});

// 插件右键菜单（可选功能）
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'extractUrls',
        title: '提取页面URL',
        contexts: ['page']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'extractUrls') {
        // 打开popup或直接执行提取操作
        chrome.action.openPopup();
    }
});
