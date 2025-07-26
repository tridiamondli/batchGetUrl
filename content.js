// content.js - 内容脚本
// 这个文件在每个页面中运行，用于支持XPath提取功能

// 注入XPath工具函数到页面
(function() {
    'use strict';
    
    // 创建一个工具对象用于XPath操作
    window.xpathExtractor = {
        // 测试XPath表达式是否有效
        testXPath: function(xpath) {
            try {
                document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
                return { valid: true, error: null };
            } catch (error) {
                return { valid: false, error: error.message };
            }
        },
        
        // 获取XPath匹配的元素数量
        getMatchCount: function(xpath) {
            try {
                const result = document.evaluate(
                    xpath,
                    document,
                    null,
                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                    null
                );
                return result.snapshotLength;
            } catch (error) {
                return 0;
            }
        },
        
        // 预览XPath匹配的前几个结果
        previewMatches: function(xpath, limit = 5) {
            try {
                const result = document.evaluate(
                    xpath,
                    document,
                    null,
                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                    null
                );
                
                const matches = [];
                const maxResults = Math.min(result.snapshotLength, limit);
                
                for (let i = 0; i < maxResults; i++) {
                    const node = result.snapshotItem(i);
                    let value = '';
                    
                    if (node.nodeType === Node.ATTRIBUTE_NODE) {
                        value = node.value;
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        value = node.href || node.src || node.textContent || node.outerHTML.substring(0, 100);
                    } else if (node.nodeType === Node.TEXT_NODE) {
                        value = node.textContent;
                    }
                    
                    matches.push({
                        type: node.nodeType === Node.ATTRIBUTE_NODE ? 'attribute' : 'element',
                        value: value.trim(),
                        tagName: node.tagName || (node.ownerElement && node.ownerElement.tagName) || 'unknown'
                    });
                }
                
                return {
                    success: true,
                    totalCount: result.snapshotLength,
                    matches: matches
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    matches: []
                };
            }
        }
    };
    
    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'testXPath') {
            const result = window.xpathExtractor.testXPath(request.xpath);
            sendResponse(result);
        } else if (request.action === 'previewXPath') {
            const result = window.xpathExtractor.previewMatches(request.xpath, request.limit);
            sendResponse(result);
        }
    });
    
    console.log('URL提取器内容脚本已加载');
})();
