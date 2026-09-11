# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 格式。
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [1.0.2] - 2026-09-11

- 修正文档的不一致性问题.
- prepare of obsidian community release.

---

## [1.0.1] - 2026-09-11

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
- **状态栏图标丢失 Obsidian 基类**：`registerStatusBar()` 用 `className = '...'` 整体赋值，把 `addStatusBarItem()` 自带的 `status-bar-item` 一并顶掉，状态栏基础布局 / 可点击态样式失效（此前只能在 `styles.css` 手工补 `padding` / `line-height`）。现改用 `addClass()` 追加
- **指针捕获被释放后宠物再也拖不动**：`activePointerId` 只在 `pointerup` / `pointercancel` 时复位；若 `lostpointercapture` 先到且没有后续事件，该字段会一直卡住、吞掉之后所有 `pointerdown`。现补 `lostpointercapture` 兜底收尾（不误触发点击）
- **宠物上会弹出系统右键菜单**：非主键直接 `return` 而未 `preventDefault`；现于 `pointerdown` 非主键分支阻止默认行为，并监听 `contextmenu` 一并抑制
- **跨显示器后渲染分辨率不更新**：`window.resize` 回调只重裁剪位置，不重新读取 `devicePixelRatio`（换显示器 / 改系统缩放后会变）。现回调同步刷新渲染尺寸，`PetScene.resize()` 内重新 `setPixelRatio`
- **换主色触发一次着色器重编译**：`applyColor()` 每次都对材质置 `needsUpdate = true`，而只改 `color` 并不需要它
- **移动端会去调用 `addStatusBarItem()`**：该 API 官方标注 "Not available on mobile"，而插件声明 `isDesktopOnly: false`、移动端同样会执行 `onload`。现加 `Platform.isDesktop` 守卫，移动端不再尝试注册状态栏（改用命令面板 / 设置面板切换显隐）
- **阴影其实没有跟随主题**：`styles.css` 里宠物投影与气泡投影的阴影色是硬编码的 `rgba(0, 0, 0, …)`，但 `styles.css` 注释与所有文档都声称「使用 Obsidian CSS 变量跟随主题」。现改用 `var(--background-modifier-box-shadow, …)`，变量名同步更正到文档
- **设置面板用了两个已废弃 API**：`setDynamicTooltip()` 自 Obsidian 0.9.7 起废弃（官方说明「数值现在总是内联显示」，调用它没有任何效果）—— 已移除；`setWarning()` 自 0.11.0 起废弃，替代品 `setDestructive()` 需 Obsidian ≥ 1.13.0 而本插件 `minAppVersion` 为 1.0.0 —— 改为运行时能力探测，新版本走新 API、老版本退回旧 API（不为一个按钮配色抬高最低版本要求）

### Changed

- **构建脚本去掉死配置**：`esbuild.config.mjs` 里的 `process.argv.forEach` 分支永远不会命中（npm script 从不传 `dev`），`opts.watch` / `opts.serve` / `define.__DEV__` 实为死配置（`__DEV__` 源码从未引用）。现移除，并把构建模式显式化为 `production` / `development` / 缺省 watch
- **`npm run build:dev` 名副其实**：原先与 `npm run dev` 完全等价（都进入 watch、进程永不退出），现改为一次性（`rebuild` + `dispose`）的非压缩开发构建，补上了项目缺失的「一次性非压缩构建」入口
- 位置输入框改为**防抖写盘**（400ms）；拖动结束、显隐切换等离散动作仍立即保存
- 设置面板不再重复写盘（原先每次改动会走两次 `saveSettings()`）
- 生产构建启用 `minify`（`main.js` 体积显著下降，license 注释保留在文件末尾）
- **交互层从鼠标事件迁移到 Pointer Events**：`pointerdown/move/up/cancel` + `setPointerCapture`，鼠标 / 触摸 / 触控笔共用一套逻辑，配合 `touch-action: none` 支持移动端拖动；`isDesktopOnly` 相应改回 `false`
- 模型释放时对共享材质去重，避免重复 `dispose()`
- **`release.yml` 校验 tag 与 `manifest.json` 版本一致**：此前打 `v1.2.0` 而 manifest 仍是 `1.0.0` 也会照常发布 Release；现于构建前比对 `GITHUB_REF_NAME`（去掉前缀 `v`）与 manifest 的 `version`，不一致直接失败
- **`release.yml` 支持预发布 tag**：上一版的版本校验用严格相等，导致 `v1.1.0-rc.1` 这类预发布 tag 因 `1.1.0-rc.1 != 1.1.0` 被直接拒绝（而发布指南的「场景 2：预发布」恰恰在教用户这么打 tag）。现改为**先剥掉 `-rc.N` / `-beta.N` 等预发布后缀、只比对基版本**，并对预发布输出提示；正式版本号不一致时仍会失败
- **`build.yml` 的 "Comment on success" 名不副实**：该步骤只 `echo` 一行、并不会真的发表评论，`if: success()` 也是多余的（前序步骤失败时后续本就不会执行）。现改为写入 GitHub Step Summary，在产物上传之后汇总结果

### Documentation

- 新增 `docs/zh-cn/RELEASE.md`（发布指南中文版），修复两份 README 中指向该文件的死链
- `check_before_publish.sh` 的 2.6 由硬编码黑名单改为**真正的 Markdown 链接校验**：解析每个 Markdown 链接的目标路径，确认本地文件确实存在，因此能发现新增的死链（旧实现只是一次关键字搜索，对新增死链完全无效）
- `docs/en/RELEASE.md` 同步修正（`npm ci --dry-run`、检查项数量、只读说明）
- README 修正已过期的实现说明：删除已不存在的 `baseScale` 外部缩放方案，改写主色替换策略与点击脉冲说明
- GitHub Issue 模板改为 Obsidian 插件专用（原为 GitHub 默认模板，要求填 Browser / iPhone6）
- 修正文档与代码不一致处：主色 hex、默认位置 `(20, 200)`、台词所在文件与内容、`PetModelParts` 字段名、气泡 CSS 变量、几何体数量、设置面板快捷键 `Ctrl+,`
- README：修正安装步骤（只需 3 个构建产物）、`build:dev` 说明、去掉本地绝对路径；新增 `docs/` 文档索引
- 统一修正命令面板快捷键（`Ctrl+P`，Mac `Cmd+P`）与拖动交互措辞（鼠标 / 触摸 / 触控笔），同步 `README`、中英文 `UserGuide` 的跨平台说明
- `check_before_publish.sh` 的 2.6 增加**「被引用文件必须已被 git 跟踪」**校验：只判断文件是否存在会漏掉「链接指向未跟踪文件」的情况（本地全绿，push 后 404）。`SECURITY.md` / `check_before_publish.sh` / `docs/*/RELEASE.md` 已纳入 git
- `docs/*/RELEASE.md` 的 FAQ 警告文案与实际脚本输出对齐（脚本输出中文，文档原先写的是对不上的英文占位文案）；英文版补上指向中文版的反向链接
- 两份 UserGuide：修正 **`copy` 不能复制目录** 的安装命令（改为只复制 3 个构建产物）；「窗口左上角」改为「左侧、偏上位置」，与默认坐标 `(20, 200)` 一致；删除 Q1 中无依据的「全屏阅读模式」排查项；Q7 与 Q6 关于主题影响的表述统一
- 两份 README 用真实截图替换截图占位符：新增 `images/desktoppet.jpg`（设置面板 + 右下角宠物本体与气泡台词），并补上图片说明文字；`images/` 同步加入项目结构树
- 两份 README 的版本徽章由 `1.0.0` 更新为 `1.0.1`（原先落后于 `manifest.json`）
- `.github/ISSUE_TEMPLATE/feature_request.md` 改为 Obsidian 插件专用模板（原为 GitHub 默认模板）
- 两份 UserGuide 的「点击脉冲约 400ms」修正为 **450ms**（与 `PetAnimator` 的 `clickDuration = 0.45` 一致）
- `docs/en/UserGuide.md` 的 **Software 表补齐中文版已有的两行**（移动端 iOS / iPadOS / Android、输入方式），消除中英文档差异
- 阴影相关的表述按实际实现更正：气泡描边是 `--background-modifier-border`，**阴影**是 `--background-modifier-box-shadow`（此前把前者误写成阴影色）
- 中英文 UserGuide 与两份 README 明确标注**状态栏切换仅桌面端可用**（移动端请用命令面板或设置面板）
- **`CODE_OF_CONDUCT.md` 清理残留的草稿首行**：原文件第 1 行是文件名、第 3 行是一句写给自己的备注（「推荐直接使用 Contributor Covenant：」），紧接着才是 `# 行为准则` 标题；现删除草稿行并补齐适用范围 / 报告方式 / 执行条款
- **`README.zh-CN.md` 的项目结构树修正**：末行原写作 `README.md  # 本文件`，但中文版文件名为 `README.zh-CN.md`（指错了自己），且漏列自身；现改为分别列出 `README.md`（英文）与 `README.zh-CN.md`（本文件）
- **`check_before_publish.sh` 的 3.6 修复 MSYS 路径坑**：`zip.exe` 是原生 Windows 程序，会把 `/tmp/x.zip` 解释成「盘根 `\tmp\`」，而 `stat` / `rm` 走 MSYS 路径 —— 两者不是同一文件，导致大小恒为空、且每次运行都留下约 130KB 残留。现全程使用同一个经 `cygpath` 解析的路径，并统一在系统临时目录读写、用后即删
- **两份 `RELEASE.md` 补写预发布 tag 的实际行为**：明确「校验只比对基版本」，并提示发布预发布版时 `manifest.json` / `package.json` 应写基版本号（`1.1.0`），而非 `1.1.0-rc.1`

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

> 完整的发布流程见 [CHANGELOG.md#版本号约定](#版本号约定)。
