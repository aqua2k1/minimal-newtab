# minimal-newtab 简洁新标签页

极简新标签页扩展（Chrome / Firefox，MV3）：大时钟、日期、搜索（跟随浏览器默认引擎）、同步待办（Markdown 子集 + 自动识别链接）、工具栏弹窗 + 未完成角标。页面完全本地离线。

## 功能

- 新标签页：时钟 / 日期 / 搜索框 / 待办面板（折叠）
- 工具栏弹窗：同一份待办，实时双向同步
- 待办：`chrome.storage.sync` 跨设备同步；**粗体** `代码` ~~删除线~~ [链接](url)、自动识别网址
- 工具栏红色角标：未完成数量
- 深色模式：跟随系统
- 版本检查：发现新版本时新标签页显示提示横幅

## 安装

- **Chrome**：`chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选择本目录
- **Firefox**：`about:debugging` → 临时载入附加组件 → 选择 `manifest.json`（或安装 Release 中的签名 XPI，可自动更新）

## 开发

```bash
npm ci            # 安装依赖
npm run check     # biome 代码检查 + web-ext 浏览器兼容性校验
npm run build     # 打包 dist/minimal-newtab-{version}-chrome.zip + -fx.zip
npm run sign:firefox  # 本地 AMO 签名（需环境变量 AMO_JWT_ISSUER/AMO_JWT_SECRET）
```

## 发布（GitHub Actions）

两种方式任选：

**网页手动发布**（推荐）：
1. 修改 `manifest.json` 的 `version`（如 `1.1.0`）并推送到 main
2. GitHub 网页 → Releases → Draft a new release → 创建 tag `v1.1.0` → Publish
3. Actions 自动：版本校验 → 双平台打包 → AMO 签名（若启用）→ 资产附加到该 Release

**命令行发布**：
1. 修改 `manifest.json` 的 `version` 并推送
2. `git tag v1.1.0 && git push origin v1.1.0`

注意：tag 必须是 `v<manifest 版本>`（如 `v1.1.0`），否则版本校验会失败。

更新机制：**Firefox** 安装签名 XPI 后自动更新；**Chrome** 解压加载无自动更新——新标签页横幅提示后，下载 zip 解压覆盖目录并点"重新加载"（待办数据在浏览器侧，不丢失）。

## 仓库 Secrets（Settings → Secrets and variables → Actions）

| Secret | 用途 |
|---|---|
| `AMO_JWT_ISSUER` | Firefox 签名（addons.mozilla.org 开发者账号，免费） |
| `AMO_JWT_SECRET` | Firefox 签名密钥 |
