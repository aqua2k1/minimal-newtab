# minimal-newtab 简洁新标签页

[English](README.en.md) | 中文

极简新标签页扩展（Chrome，MV3）：大时钟、日期、搜索（跟随浏览器默认引擎）、同步待办（Markdown 子集 + 自动识别链接）、工具栏弹窗 + 未完成角标。页面完全本地离线。

## 功能

- 新标签页：时钟 / 日期 / 搜索框 / 待办面板（折叠）
- 工具栏弹窗：同一份待办，实时双向同步
- 待办：`chrome.storage.sync` 跨设备同步；**粗体** `代码` ~~删除线~~ [链接](url)、自动识别网址
- 工具栏红色角标：未完成数量
- 深色模式：跟随系统
- 国际化：界面文案跟随浏览器语言（中文 / English）
- 版本检查：发现新版本时新标签页显示提示横幅

## 安装

- **Chrome**：`chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选择本目录

## 开发

```bash
npm ci            # 安装依赖
npm run check     # biome 代码检查
npm run build     # 打包 dist/minimal-newtab-{version}-chrome.zip
```
