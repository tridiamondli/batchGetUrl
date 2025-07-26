# 🚀 Live Server 调试指南

## 使用 VS Code Live Server 扩展进行调试

### 1. 安装 Live Server 扩展
如果尚未安装，请在 VS Code 中：
1. 按 `Ctrl+Shift+X` 打开扩展面板
2. 搜索 "Live Server"
3. 安装 "Live Server" by Ritwick Dey

### 2. 启动测试服务器

#### 方法一：右键启动
1. 在 VS Code 中打开任意 HTML 测试文件
2. 右键点击文件内容
3. 选择 "Open with Live Server"

#### 方法二：命令面板启动
1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "Live Server: Open with Live Server"
3. 回车执行

#### 方法三：状态栏启动
1. 打开任意 HTML 文件
2. 点击 VS Code 底部状态栏的 "Go Live" 按钮

### 3. 测试页面列表

访问以下页面进行各项功能测试：

| 测试页面 | 测试内容 | URL |
|---------|---------|-----|
| `alert_fix_test.html` | Alert重复点击修复 | http://127.0.0.1:5500/alert_fix_test.html |
| `export_fix_test.html` | 导出功能完整测试 | http://127.0.0.1:5500/export_fix_test.html |
| `csp_detail_fix_test.html` | CSP兼容性测试 | http://127.0.0.1:5500/csp_detail_fix_test.html |
| `xpath_management_test.html` | XPath管理功能 | http://127.0.0.1:5500/xpath_management_test.html |

### 4. 调试要点

#### 🎯 Alert重复点击问题测试
1. 打开 `alert_fix_test.html`
2. 分别测试三个按钮：
   - "测试导出功能 (原alert方式)" - 可能有重复点击问题
   - "测试导出功能 (修复后通知)" - 应该无重复点击
   - "直接测试下载" - 纯下载功能测试
3. 观察：
   - ✅ Alert/通知是否只需点击一次
   - ✅ 下载是否正常触发
   - ✅ 是否有浏览器卡顿
   - ✅ 控制台是否有错误

#### 🔧 导出功能完整测试
1. 打开 `export_fix_test.html`
2. 测试各个导出场景
3. 检查通知系统是否正常工作

#### 🛡️ CSP兼容性测试
1. 打开 `csp_detail_fix_test.html`
2. 测试详情弹窗的所有按钮功能
3. 检查控制台是否有CSP错误

### 5. 问题排查

#### 常见问题
- **Live Server 无法启动**: 检查端口是否被占用
- **页面无法访问**: 确认防火墙设置
- **下载不工作**: 检查浏览器下载权限

#### 调试技巧
1. **打开开发者工具**: F12
2. **查看控制台**: 检查JavaScript错误和日志
3. **网络面板**: 监控资源加载和下载请求
4. **元素面板**: 检查DOM结构和事件绑定

### 6. 预期结果

#### ✅ 修复前问题
- Alert弹窗需要点击两次才能关闭
- 浏览器可能出现短暂卡顿
- 控制台可能有CSP相关错误

#### ✅ 修复后效果
- 通知消息立即显示，只需点击一次关闭
- 浏览器响应流畅，无卡顿
- 控制台无CSP错误
- 下载功能正常工作

### 7. 测试报告

请在测试后记录以下信息：

```
🧪 测试环境:
- 浏览器: Chrome/Firefox/Edge (版本号)
- 操作系统: Windows/Mac/Linux
- Live Server端口: 5500 (默认)

📊 测试结果:
[ ] Alert重复点击问题已修复
[ ] 导出功能正常工作
[ ] 通知系统正常显示
[ ] 无浏览器卡顿
[ ] 控制台无错误
[ ] 下载功能正常

🐛 发现的问题:
(如有问题请详细描述)
```

---

**Happy Testing! 🎉**
