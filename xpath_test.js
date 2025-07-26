// 简化版的测试脚本，用于调试XPath提取问题

function simpleXPathTest(xpath) {
    console.log('=== 开始XPath测试 ===');
    console.log('XPath规则:', xpath);
    console.log('当前页面URL:', window.location.href);
    
    try {
        // 执行XPath查询
        const result = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );
        
        console.log('匹配到的节点数量:', result.snapshotLength);
        
        const extractedValues = [];
        
        for (let i = 0; i < result.snapshotLength; i++) {
            const node = result.snapshotItem(i);
            let value = '';
            
            if (node.nodeType === Node.ATTRIBUTE_NODE) {
                value = node.value;
                console.log(`节点 ${i} (属性): ${node.name} = ${value}`);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                value = node.href || node.src || node.textContent;
                console.log(`节点 ${i} (元素): ${node.tagName}, 值: ${value}`);
            } else if (node.nodeType === Node.TEXT_NODE) {
                value = node.textContent;
                console.log(`节点 ${i} (文本): ${value}`);
            }
            
            if (value && value.trim()) {
                extractedValues.push(value.trim());
            }
        }
        
        console.log('提取到的值:', extractedValues);
        console.log('=== XPath测试结束 ===');
        
        return {
            success: true,
            count: result.snapshotLength,
            values: extractedValues
        };
        
    } catch (error) {
        console.error('XPath测试出错:', error);
        return {
            success: false,
            error: error.message,
            values: []
        };
    }
}

// 在浏览器控制台中运行以下命令来测试：
// simpleXPathTest('//a/@href')
// simpleXPathTest('//img/@src')

console.log('简化XPath测试函数已加载，使用 simpleXPathTest("xpath规则") 进行测试');
