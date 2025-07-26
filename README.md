# 🎯 批量URL提取器 Chrome插件

> 一个功能强大的Chrome浏览器插件，专门用于根据自定义XPath规则批量提取网页中的URL链接

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 核心特性

### 🔍 智能URL提取
- **XPath规则支持**: 使用强大的XPath表达式精确定位目标链接
- **相对路径智能补全**: 自动处理相对路径、协议相对路径等
- **URL去重和规范化**: 智能去除重复链接，输出清洁结果
- **实时提取预览**: 即时查看匹配数量和提取效果

### 🎨 现代化界面
- **精美UI设计**: 紫色渐变主题，现代化卡片布局
- **流畅动画效果**: 悬停动画、加载状态、通知提示
- **详情页面优化**: 绿色编号徽章 + 橙色胶囊复制按钮
- **响应式布局**: 适配各种屏幕尺寸

### 📋 管理功能
- **自定义规则保存**: 保存常用XPath规则，支持命名和分类
- **使用统计**: 追踪规则使用频率，智能排序
- **内置规则库**: 预设常用提取规则，一键应用
- **批量操作**: 支持多种分隔符的批量复制

### 🔒 安全可靠
- **Manifest V3兼容**: 符合最新Chrome扩展标准
- **CSP安全合规**: 完全符合内容安全策略
- **权限最小化**: 仅请求必要的浏览器权限
- **双重存储**: Chrome Storage + LocalStorage降级策略

## 安装方法

1. 下载或克隆此项目
2. 打开Chrome浏览器，进入 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

## 使用说明

### 基本使用

1. 点击浏览器工具栏中的插件图标
2. 在XPath输入框中输入规则（默认为 `//a/@href`）
3. 点击"提取URL"按钮
4. 使用"复制全部"按钮将URL复制到剪贴板
5. 使用"查看详情"按钮在新窗口中查看所有URL

### XPath规则管理

#### 保存自定义规则
1. 在XPath输入框中输入自定义规则
2. 点击"💾 保存"按钮
3. 输入规则名称（如："商品链接"、"新闻标题"等）
4. 规则将永久保存，可重复使用

#### 管理已保存规则
1. 点击"📋 管理"按钮打开管理界面
2. 查看所有已保存的规则及其统计信息
3. 使用"使用"按钮快速应用规则
4. 使用"删除"按钮移除不需要的规则
5. 规则按创建时间排序，显示使用次数

#### 预设规则增强
- 预设规则现在包含内置规则和自定义规则
- 自定义规则按使用频率排序
- 显示每个规则的使用统计

### XPath规则示例

| 用途 | XPath规则 | 说明 |
|------|-----------|------|
| 所有链接 | `//a/@href` | 提取所有a标签的href属性 |
| 所有图片 | `//img/@src` | 提取所有img标签的src属性 |
| 外部链接 | `//a[starts-with(@href, "http")]/@href` | 只提取外部链接 |
| 站内链接 | `//a[starts-with(@href, "/")]/@href` | 只提取站内相对链接 |
| CSS文件 | `//link[@rel="stylesheet"]/@href` | 提取所有CSS文件链接 |
| JS文件 | `//script/@src` | 提取所有JavaScript文件链接 |

### 高级功能

- **预设规则**: 点击输入框右侧的"预设"按钮选择常用规则
- **路径补全**: 插件会自动将相对路径转换为完整URL
- **去重处理**: 自动去除重复的URL，保证结果唯一性
- **批量复制**: 所有URL用空格分隔，方便粘贴到其他工具

## 技术特点

- 使用Manifest V3标准
- 支持所有网站（`<all_urls>`权限）
- 智能的URL规范化处理
- 现代化的用户界面设计
- 完善的错误处理机制

## 文件结构

```
batchGetUrl/
├── manifest.json          # 插件配置文件
├── popup.html            # 弹窗界面
├── popup.js              # 弹窗逻辑
├── content.js            # 内容脚本
├── background.js         # 后台脚本
├── icons/                # 图标文件夹
└── README.md            # 说明文档
```

## 权限说明

- `activeTab`: 访问当前活动标签页
- `scripting`: 在页面中执行脚本
- `clipboardWrite`: 写入剪贴板

## 兼容性

- Chrome 88+
- Edge 88+
- 其他基于Chromium的浏览器

## 更新日志

### v1.1.0 (2025-07-26)
- 🔧 **修复存储兼容性问题** - 解决了"Cannot read properties of undefined (reading 'local')"错误
- 🔄 **增强存储降级机制** - Chrome Storage API不可用时自动降级到localStorage
- 🛡️ **改进错误处理** - 所有存储操作都有完整的兼容性检查和错误处理
- 📋 **优化API检测** - 增强Chrome Storage API可用性检测逻辑
- � **修复详情弹窗按钮** - 解决复制全部URL、导出为文本、单个复制按钮不工作问题
- 🔄 **多重降级机制** - 剪贴板功能和下载功能都有完整的降级方案
- �📖 **完善故障排除文档** - 添加详细的问题诊断和解决方案
- 🧪 **新增测试页面** - details_test.html 用于测试详情功能兼容性

### v1.0.0
- 初始版本发布
- 基本的URL提取功能
- XPath规则支持
- 路径补全功能
- 复制和查看功能

## 常见问题

**Q: 保存XPath规则时提示"保存失败: Cannot read properties of undefined (reading 'local')"怎么办？**
A: 这是存储API兼容性问题，插件已内置自动降级机制：
- 确保插件权限正确配置
- 重新加载插件尝试修复
- 插件会自动使用localStorage作为备用存储
- 详细解决方案请查看TROUBLESHOOTING.md文档

**Q: 详情弹窗中的复制和导出按钮不工作怎么办？**
A: 这通常是浏览器安全策略导致的，插件已内置多重降级机制：
- 使用HTTPS环境或localhost进行测试
- 检查浏览器剪贴板和下载权限设置
- 插件会自动降级到execCommand或手动复制方案
- 使用debug_details.html页面进行详细测试和诊断
- 详细排查步骤请查看DETAILS_TROUBLESHOOTING.md文档

**Q: XPath规则不工作怎么办？**
A: 请检查XPath语法是否正确，可以使用浏览器开发者工具的控制台测试。

**Q: 为什么有些相对路径没有被正确补全？**
A: 插件会尽力补全相对路径，但某些复杂的路径可能需要手动调整XPath规则。

**Q: 如何提取特定区域的链接？**
A: 使用更精确的XPath规则，例如 `//div[@class="content"]//a/@href`。

## 技术支持

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- 邮件支持

## 许可证

MIT License
