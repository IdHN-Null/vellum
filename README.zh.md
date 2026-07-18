# Vellum

🌐 [English (US)](README.md) · [English (UK)](README.en-GB.md) · [Español](README.es.md) · **中文** · [日本語](README.ja.md) · [한국어](README.ko.md)

**把想象绘成地图。** 一款用于 Obsidian 的奇幻地图生成与编辑器，帮助你创造并打磨属于自己的世界。

无外部依赖，完全基于纯 Canvas（水墨渲染）实现，目标是让每一次渲染本身就是一幅完成度极高的古地图。地图以 `.fmap`（JSON）文件保存，版本管理与同步开箱即用。

## 仓库结构

| 文件夹 | 内容 |
|---|---|
| [`plugin/`](plugin/) | 插件**源码**（TypeScript），含构建、测试与架构文档 |
| [`docs/`](docs/) | 落地页（通过 **GitHub Pages** 提供），含下载 zip |
| [`dist/`](dist/) | 插件**发行版** — 发布 zip + 解压副本（仅安装所需文件） |

- 如何从源码构建发行版：参见 [`plugin/README.md`](plugin/README.md) 的开发章节
- 架构与实现原理：[`plugin/ARCHITECTURE.md`](plugin/ARCHITECTURE.md)（英文）
- 设计决策：[`plugin/DESIGN-DECISIONS.md`](plugin/DESIGN-DECISIONS.md)（英文）

## 安装（用户）

1. 从 [`dist/`](dist/) 获取最新的 `vellum-x.y.z.zip` 并解压
   （或使用落地页的下载按钮）。
2. 将 `main.js`、`manifest.json`、`styles.css` 复制到库的 `.obsidian/plugins/vellum/` 文件夹。
   - Windows 下可用附带的 `install.ps1 "你的库路径"` 一行完成。
3. 在设置 → 第三方插件中启用 **Vellum**。

> 目前仅支持桌面端（移动端未测试）。

## 开发（快速开始）

```powershell
cd plugin
npm install
npm run dev    # 监视构建
npm run build  # 类型检查 + 生产打包
npm test       # 纯逻辑单元测试
```

## 贡献 / 分支规则

本仓库采用 `master`（发布）/ `dev`（集成）/ `feat/*`（功能）分支策略。
提交 PR 前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT](plugin/LICENSE)
