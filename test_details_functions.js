// 详情功能快速测试脚本
// 在浏览器控制台中运行此脚本来测试各种功能

console.log('=== 详情功能测试脚本 ===');

// 测试环境检测
function testEnvironment() {
    console.log('\n--- 环境检测 ---');
    console.log('Location:', window.location.href);
    console.log('UserAgent:', navigator.userAgent);
    console.log('navigator.clipboard:', navigator.clipboard ? '✅' : '❌');
    console.log('navigator.clipboard.writeText:', navigator.clipboard && navigator.clipboard.writeText ? '✅' : '❌');
    console.log('document.execCommand:', document.execCommand ? '✅' : '❌');
    console.log('Blob:', typeof Blob !== 'undefined' ? '✅' : '❌');
    console.log('URL.createObjectURL:', typeof URL !== 'undefined' && URL.createObjectURL ? '✅' : '❌');
    console.log('window.open:', window.open ? '✅' : '❌');
}

// 测试剪贴板功能
async function testClipboard(text = 'test clipboard') {
    console.log('\n--- 剪贴板测试 ---');
    console.log('测试文本:', text);
    
    // 方法1: Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('✅ Clipboard API 成功');
            return true;
        } catch (err) {
            console.log('❌ Clipboard API 失败:', err.message);
        }
    } else {
        console.log('❌ Clipboard API 不支持');
    }
    
    // 方法2: execCommand
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (successful) {
            console.log('✅ execCommand 成功');
            return true;
        } else {
            console.log('❌ execCommand 失败');
        }
    } catch (err) {
        console.log('❌ execCommand 异常:', err.message);
    }
    
    return false;
}

// 测试下载功能
function testDownload(content = 'test file content', filename = 'test.txt') {
    console.log('\n--- 下载测试 ---');
    console.log('文件名:', filename);
    console.log('内容:', content);
    
    try {
        if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
            
            console.log('✅ 下载功能成功');
            return true;
        } else {
            console.log('❌ Blob/URL API 不支持');
        }
    } catch (err) {
        console.log('❌ 下载功能异常:', err.message);
    }
    
    return false;
}

// 测试新窗口功能
function testNewWindow() {
    console.log('\n--- 新窗口测试 ---');
    
    try {
        const newWindow = window.open('', 'testWindow', 'width=400,height=300');
        
        if (newWindow) {
            newWindow.document.write(`
                <html>
                <head><title>测试窗口</title></head>
                <body style="padding: 20px;">
                    <h3>测试窗口</h3>
                    <p>这是一个测试窗口</p>
                    <button onclick="testWindowClipboard()">测试窗口内剪贴板</button>
                    <button onclick="window.close()">关闭</button>
                    <script>
                        function testWindowClipboard() {
                            const text = 'test from new window';
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(text).then(() => {
                                    alert('✅ 新窗口剪贴板成功');
                                }).catch(err => {
                                    alert('❌ 新窗口剪贴板失败: ' + err.message);
                                });
                            } else {
                                alert('❌ 新窗口不支持剪贴板API');
                            }
                        }
                    </script>
                </body>
                </html>
            `);
            
            console.log('✅ 新窗口创建成功');
            return true;
        } else {
            console.log('❌ 新窗口创建失败（可能被浏览器拦截）');
        }
    } catch (err) {
        console.log('❌ 新窗口异常:', err.message);
    }
    
    return false;
}

// 运行所有测试
async function runAllTests() {
    console.log('开始运行所有测试...\n');
    
    testEnvironment();
    
    const clipboardResult = await testClipboard('测试剪贴板功能');
    const downloadResult = testDownload('测试下载内容\n第二行\n第三行', 'test_download.txt');
    const windowResult = testNewWindow();
    
    console.log('\n=== 测试总结 ===');
    console.log('剪贴板:', clipboardResult ? '✅' : '❌');
    console.log('下载功能:', downloadResult ? '✅' : '❌');
    console.log('新窗口:', windowResult ? '✅' : '❌');
    
    if (!clipboardResult && !downloadResult) {
        console.log('\n⚠️ 关键功能都不可用，可能需要在HTTPS环境下测试');
    }
}

// 自动运行测试
runAllTests();

// 提供手动测试函数
window.testDetailsFunctions = {
    testEnvironment,
    testClipboard,
    testDownload,
    testNewWindow,
    runAllTests
};

console.log('\n可以通过以下方式手动测试：');
console.log('testDetailsFunctions.testClipboard("你的文本")');
console.log('testDetailsFunctions.testDownload("文件内容", "文件名.txt")');
console.log('testDetailsFunctions.testNewWindow()');
console.log('testDetailsFunctions.runAllTests()');
