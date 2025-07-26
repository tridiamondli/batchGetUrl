# 插件安装和使用指南

## 🚀 快速安装

### 步骤1: 准备插件文件
确保您已经下载了完整的插件文件夹，包含以下文件：
- manifest.json
- popup.html
- popup.js
- content.js
- background.js
- icons/ (图标文件夹)

### 步骤2: 生成图标文件
1. 双击打开 `icon_generator.html` 文件
2. 浏览器会自动生成并下载三个PNG图标文件
3. 将下载的图标文件放入 `icons/` 文件夹中

### 步骤3: 在Chrome中加载插件
1. 打开Chrome浏览器
2. 在地址栏输入 `chrome://extensions/`
3. 在右上角开启"开发者模式"开关
4. 点击"加载已解压的扩展程序"按钮
5. 选择插件文件夹 `batchGetUrl`
6. 插件安装完成！

## 📖 使用教程

### 基础使用流程

1. **访问目标网页** - 打开您要提取URL的网页
2. **打开插件** - 点击浏览器工具栏中的插件图标
3. **设置XPath规则** - 在输入框中输入XPath表达式
4. **提取URL** - 点击"提取URL"按钮
5. **查看结果** - 使用"查看详情"或"复制全部"功能

### XPath规则示例

#### 常用规则
```xpath
# 提取所有链接
//a/@href

# 提取所有图片
//img/@src

# 提取所有外部链接
//a[starts-with(@href, "http")]/@href

# 提取特定区域的链接
//div[@class="content"]//a/@href

# 提取包含特定文本的链接
//a[contains(text(), "下载")]/@href
```

#### 高级规则
```xpath
# 提取所有PDF文件链接
//a[contains(@href, ".pdf")]/@href

# 提取所有媒体文件
//*[@src][contains(@src, ".mp4") or contains(@src, ".mp3")]/@src

# 提取特定class的元素
//div[@class="link-container"]//a/@href

# 提取data属性
//div/@data-url
```

### 功能详解

#### 1. 自定义XPath规则
- 支持完整的XPath 1.0语法
- 可以使用预设规则快速选择
- 自动保存最后使用的规则

#### 2. 智能路径补全
插件会自动处理以下类型的URL：
- **相对路径** (`/path/to/page`) → 补全为完整URL
- **协议相对路径** (`//example.com/path`) → 补全协议
- **当前路径相对** (`page.html`) → 基于当前页面路径补全
- **完整URL** (`https://example.com`) → 保持不变

#### 3. 复制功能
- 所有URL用空格分隔
- 支持一键复制到剪贴板
- 兼容各种粘贴场景

#### 4. 查看详情
- 新窗口显示所有URL
- 支持单个URL复制
- 提供导出为文本文件功能
- 显示提取统计信息

## 🛠️ 高级技巧

### 1. XPath调试
使用浏览器开发者工具测试XPath：
```javascript
// 在控制台中测试XPath
$x('//a/@href')
```

### 2. 复杂选择器
```xpath
# 选择特定属性值的元素
//a[@class="download-link"]/@href

# 选择包含特定文本的父元素下的链接
//div[contains(text(), "相关链接")]//a/@href

# 选择第n个匹配的元素
(//a/@href)[1]  # 第一个链接
(//a/@href)[last()]  # 最后一个链接
```

### 3. 性能优化
- 使用更精确的XPath表达式
- 避免使用 `//` 开头的全局搜索（如果可能）
- 优先使用ID和class定位

## ❗ 常见问题解决

### 问题1: XPath规则不起作用
**解决方案:**
1. 检查XPath语法是否正确
2. 使用浏览器开发者工具验证
3. 确保目标元素已加载完成

### 问题2: 相对路径补全错误
**解决方案:**
1. 检查当前页面URL是否正确
2. 手动测试相对路径解析
3. 使用更具体的XPath选择器

### 问题3: 复制功能不工作
**解决方案:**
1. 确保浏览器允许剪贴板访问
2. 检查是否有其他扩展冲突
3. 刷新页面后重试

### 问题4: 插件无法加载
**解决方案:**
1. 确保所有文件都在正确位置
2. 检查manifest.json格式是否正确
3. 查看Chrome扩展页面的错误信息

## 🔧 开发者信息

### 文件结构说明
```
batchGetUrl/
├── manifest.json     # 插件配置和权限声明
├── popup.html       # 用户界面HTML
├── popup.js         # 界面逻辑和URL提取核心代码
├── content.js       # 页面内容脚本
├── background.js    # 后台服务脚本
├── icons/          # 插件图标文件
└── README.md       # 项目说明文档
```

### 权限说明
- `activeTab`: 访问当前活动标签页内容
- `scripting`: 在页面中执行JavaScript代码
- `clipboardWrite`: 写入系统剪贴板

### 兼容性
- Chrome 88+
- Microsoft Edge 88+
- 其他基于Chromium的浏览器

## 📞 技术支持

如果您在使用过程中遇到问题，请：
1. 首先查看本指南的常见问题部分
2. 检查浏览器控制台是否有错误信息
3. 尝试在不同网页上测试插件功能

祝您使用愉快！ 🎉
