# 贡献指南 — 分支策略

🌐 [English (US)](CONTRIBUTING.md) · [English (UK)](CONTRIBUTING.en-GB.md) · [Español](CONTRIBUTING.es.md) · **中文** · [日本語](CONTRIBUTING.ja.md) · [한국어](CONTRIBUTING.ko.md)

本仓库使用以下五种分支运作。一句话概括：

> **代码只在 `feat/*` 上写，汇集到 `dev`，`master` 只接收验证过的结果。**

## 1. `master` — 发布用

- 只能存在**完成集成 + 验证（构建·测试）的版本**。
- 不在此直接开发。提交只能来自 `dev`（或 `hotfix/*`）的合并。
- `master` 即发行版——`dist/` 的发布 zip 和 GitHub Pages（`docs/`）都以该分支为准。

## 2. `dev` — 集成用

- 名字虽是开发，实际职责是**集成**。**不要在此直接写代码。**
- 想合入单独开发的功能，请从 `feat/*` 分支**向 `dev` 提 PR**。
- `dev` 足够稳定后，再通过 PR 合入 `master`。

## 3. `feat/{功能名}` — 功能开发用

- 从 `dev` 分出，自由开发想做的东西。
- **提 PR 之前务必**：在本地合并 `dev`、解决冲突，并确认
  `npm run build && npm test` 通过。
- **禁止自己批准自己的 PR。**（禁止未经评审的合并）
- PR 批准并合并后，该分支会**自动删除**（仓库设置）。
- 做出了很酷或好玩的东西，只想炫耀不想合入？
  push 上去、不提 PR 即可。

## 4. `test/{测试名}` — 实验用

- 仅供实验与验证。**禁止 PR。**
- 结果值得保留时，移到 `feat/*` 分支正式开发。

## 5. `hotfix/{问题名}` — 紧急修复用

- `dev` 或 `master` 出现**紧急问题**时，从对应分支分出。
- 彻底修复后合并回去（若应用到 `master`，也要同步到 `dev`）。
- 其他分支（`feat/*` 等）上的问题不属于 hotfix——请在原分支解决。

---

## PR 检查清单

- [ ] 本地已合并 `dev` → 冲突已解决
- [ ] `cd plugin && npm run build` 通过（类型检查 + 打包）
- [ ] `npm test` 通过
- [ ] 影响渲染的改动已用可视化测试台（`node test/server.mjs`）确认
- [ ] 非自我批准

## 流程一览

```
feat/酷功能 ──PR──▶ dev ──PR──▶ master ──▶ dist/ 发布 + docs/ 页面
     ▲               │
     └── 从这里分支 ──┘          hotfix/紧急bug ──▶ （合并回问题所在分支）
```
