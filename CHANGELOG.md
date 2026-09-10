# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 格式。
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [1.0.0] - 2026-09-10

首版发布。

### Added

- 🎨 **3D 卡通机器人桌面宠物**：参数化几何体组合（Sphere / Cylinder / Capsule / Torus），零外部资源依赖
- 🖱️ **交互能力**：鼠标拖动 + 点击触发缩放脉冲 / 弯眼表情 / 头顶气泡台词
- 💤 **Idle 动画**：呼吸浮动、左右摇摆、随机眨眼（2.5~6s）、手臂摆动、天线晃动
- 🎭 **5 种配色方案**：柔和蓝、薄荷绿、珊瑚粉、薰衣草、暖橙
- 📏 **尺寸调节**：0.5x ~ 2.0x 滑块
- 🌗 **明暗主题适配**：气泡 & 阴影使用 Obsidian CSS 变量，自动跟随主题
- 🎚️ **状态栏图标**：一键切换显示 / 隐藏；支持命令面板 `Ctrl+Shift+P`
- 🔌 **完全透明背景**：外层 `pointer-events: none`，仅宠物本体可交互
- ♻️ **完整生命周期管理**：`onunload` 时释放 renderer / geometry / material / rAF / 事件

### Documentation

- 双语 README：`README.md`（英文默认）+ `README.zh-CN.md`（中文），使用 GitHub 官方多语言后缀方案
- 使用指南（中英双语）：
  - `docs/en/UserGuide.md` — User Guide (English)
  - `docs/zh-cn/UserGuide.md` — 用户使用指南（中文）
- 项目规范：`CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`、`SECURITY.md`、`LICENSE`（MIT）

### CI/CD

- `.github/workflows/build.yml` — 构建验证（push / PR 触发）
- `.github/workflows/release.yml` — 发布 Release（`v*` tag 触发，自动打包 zip + 生成 Release Notes）

### Security

- `npm audit` → 0 vulnerabilities ✅
- 移除冗余 dev 依赖 `vitepress`，消除整条传递依赖链上的 3 个漏洞

---

## [Unreleased]

（下一个版本的变更在此记录）

---

## 版本号约定

| 场景 | 版本规则 |
|---|---|
| 新增功能，向后兼容 | `0.x.0` → `1.0.0` → `1.1.0`（minor） |
| 修复 Bug，无功能变化 | patch：`1.0.0` → `1.0.1` |
| 破坏性变更 | major：`1.0.0` → `2.0.0` |

**与 `manifest.json` 保持同步**：发布前确保两者版本号一致。

## 发布流程

```bash
# 1. 更新版本号
$EDITOR manifest.json
$EDITOR package.json

# 2. 更新 CHANGELOG.md（把 [Unreleased] 内容移到新版本下）
$EDITOR CHANGELOG.md

# 3. 打 tag 并推送（自动触发 release.yml）
git tag v1.0.0
git push origin v1.0.0
```
