# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 格式。
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### Fixed

- **点击反馈的时间基准错误**：点击反馈原先传入 `performance.now() / 1000`（页面加载至今的秒数），而渲染循环的 `elapsed` 来自 `THREE.Clock`（场景创建至今的秒数）。两者不同源使 `elapsed - clickStartAt` 恒为负数，缩放脉冲 / 弯眼 / 天线弹跳永不收敛——实测「插件加载时刻距页面创建的时间」越长越离谱（天线小球会被甩到 ±180、瞳孔永久保持弯眼）。现统一由 `PetAnimator.lastElapsed` 提供时间基准
- **隐藏后仍拦截指针**：`.desktoppet-canvas` 显式声明的 `pointer-events: auto` 会覆盖从父级 `.hidden` 继承的 `none`，而 `opacity: 0` 的元素仍可被命中；隐藏后有一块与宠物等大的不可见区域吞掉点击、挡住底下内容。现补 `.desktoppet-container.hidden .desktoppet-canvas { pointer-events: none }`
- **隐藏再显示后长时间不眨眼**：`resume()` 会重新进入 `start()`，而 `clock.start()` 把 `elapsedTime` 归零，`nextBlinkAt` 却按旧的绝对时刻记录。现由 `PetScene` 自行累加 `elapsed`，保证 pause / resume 之间保持单调
- **宠物可能被拖出可视区且无法找回**：拖动无边界约束、位置输入框是自由文本、窗口 resize 也不处理。现拖动过程中实时裁剪、输入值自动收敛到可视区、窗口尺寸变化后重新裁剪
- **尺寸滑块拖动中断**：滑块 `onChange` 里调 `display()` 重建整个面板，而 Obsidian 的滑块是连续 `input` 事件，表现为「拖一格就断」。现就地更新描述文案，不再重建面板
- **设置面板改动不生效**：`updateSettings()` 原先与同一对象引用比较，导致大小 / 位置 / 主色 / 显隐开关调整后没有实时效果；改为与「已应用快照」比较
- **拖动后宠物永久倾斜**：拖动倾角只在拖动分支内写入、松手未回正；现每帧向目标收敛，松手自动回正
- **拖动位置未持久化**：拖动只改 DOM 位置、未回写设置，重启后弹回旧坐标；现拖动结束后写回 `positionX` / `positionY`
- **尺寸双重缩放**：`petSize` 同时作用于容器尺寸与模型缩放，视觉缩放约为 `petSize²`；现仅由容器 / canvas 尺寸控制
- **隐藏时仍在渲染**：隐藏状态下 rAF 循环未暂停、持续占用 GPU；现接入 `pause()` / `resume()`
- **主色替换的启发式失效**：原先按「非白非深非腮红即主色」判断——其中的腮红分支是死代码（腮红是 `MeshBasicMaterial`，本就不在遍历范围内），且主色一旦被设成深色 `0x2c3e50` 就再也改不回来。现改为 `material.userData.isPrimary` 显式标记
- **WebGL context 泄漏**：`dispose()` 只调 `renderer.dispose()`，未真正释放 context；频繁重载插件会累积到浏览器约 16 个 context 的上限。现补 `forceContextLoss()`

### Changed

- 位置输入框改为**防抖写盘**（400ms）；拖动结束、显隐切换等离散动作仍立即保存
- 设置面板不再重复写盘（原先每次改动会走两次 `saveSettings()`）
- 生产构建启用 `minify`（`main.js` 体积显著下降，license 注释保留在文件末尾）
- **交互层从鼠标事件迁移到 Pointer Events**：`pointerdown/move/up/cancel` + `setPointerCapture`，鼠标 / 触摸 / 触控笔共用一套逻辑，配合 `touch-action: none` 支持移动端拖动；`isDesktopOnly` 相应改回 `false`
- 模型释放时对共享材质去重，避免重复 `dispose()`

### Documentation

- 新增 `docs/zh-cn/RELEASE.md`（发布指南中文版），修复两份 README 中指向该文件的死链
- `check_before_publish.sh` 的 2.6 由硬编码黑名单改为**真正的 Markdown 链接校验**：解析每个 Markdown 链接的目标路径，确认本地文件确实存在，因此能发现新增的死链（旧实现只是一次关键字搜索，对新增死链完全无效）
- `docs/en/RELEASE.md` 同步修正（`npm ci --dry-run`、检查项数量、只读说明）
- README 修正已过期的实现说明：删除已不存在的 `baseScale` 外部缩放方案，改写主色替换策略与点击脉冲说明
- GitHub Issue 模板改为 Obsidian 插件专用（原为 GitHub 默认模板，要求填 Browser / iPhone6）
- 修正文档与代码不一致处：主色 hex、默认位置 `(20, 200)`、台词所在文件与内容、`PetModelParts` 字段名、气泡 CSS 变量、几何体数量、设置面板快捷键 `Ctrl+,`
- README：修正安装步骤（只需 3 个构建产物）、`build:dev` 说明、去掉本地绝对路径；新增 `docs/` 文档索引
- 统一修正命令面板快捷键（`Ctrl+P`，Mac `Cmd+P`）与拖动交互措辞（鼠标 / 触摸 / 触控笔），同步 `README`、中英文 `UserGuide` 的跨平台说明

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
- 🎚️ **状态栏图标**：一键切换显示 / 隐藏；支持命令面板 `Ctrl+P`
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

> 完整的发布流程见 [`docs/zh-cn/RELEASE.md`](docs/zh-cn/RELEASE.md)。
