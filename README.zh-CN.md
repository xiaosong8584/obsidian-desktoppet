# Desktop Pet for Obsidian（中文）

> **项目地址**：<https://github.com/xiaosong8584/obsidian-desktoppet>

![license](https://img.shields.io/badge/license-MIT-blue.svg)

![version](https://img.shields.io/badge/version-1.0.0-brightgreen.svg)



![obsidian](https://img.shields.io/badge/Obsidian-1.0+-blueviolet.svg)

![three.js](https://img.shields.io/badge/three.js-0.160-orange.svg)

一只可爱的 **3D 卡通机器人**桌面宠物，悬浮在 Obsidian 窗口内。  
参数化几何体组合构建（Sphere / Cylinder / Capsule / Torus），**零外部资源依赖**，即装即用。

---

## ✨ 功能特点

- 🎨 **3D 卡通机器人** — 圆润头部 + 圆点眼睛（含高光）+ 天线 + 胸口核心 + 腮红，参数化建模，全部由代码生成
- 🖱️ **拖动 & 点击** — 鼠标 / 触屏拖动位置，点击触发缩放脉冲 + 弯眼表情 + 头顶气泡台词
- 💤 **Idle 动画** — 整体呼吸浮动、左右摇摆、眨眼（2.5~6 秒随机）、手臂自然摆动、天线晃动
- 🎭 **5 种配色方案** — 柔和蓝、薄荷绿、珊瑚粉、薰衣草、暖橙
- 📏 **尺寸调节** — 0.5x ~ 2.0x 滑块
- 🌗 **明暗主题适配** — 气泡与阴影使用 Obsidian CSS 变量（`--background-secondary`、`--background-modifier-box-shadow`），自动跟随主题切换
- 🎚️ **状态栏图标** — 一键切换显示 / 隐藏，也支持 `Ctrl+P` 命令面板（状态栏仅桌面端提供）
- 🔌 **完全透明背景** — 不遮挡 Obsidian 内容（外层 `pointer-events: none`，仅宠物本体可交互）
- ♻️ **完整生命周期管理** — `onunload` 时释放 renderer / geometry / material / rAF / 事件

## 📸 截图

（在此处插入截图占位：宠物 idle 状态、点击反馈、拖动状态、设置面板）

## ⚙️ 开发环境搭建

1. **安装 Node.js 18+**（推荐 20 LTS）
2. **克隆/打开项目**：
   ```bash
   cd obsidian-desktoppet
   npm install
   ```
3. **构建命令**：
   ```bash
   npm run dev          # 监听模式：保存自动重编（不压缩，内联 sourcemap）
   npm run build        # 生产构建：tsc 类型检查 + 压缩 main.js
   npm run build:dev    # 一次性开发构建（不压缩，内联 sourcemap，构建完即退出）
   ```

## 📦 安装到 Obsidian

1. 执行 `npm run build`，生成 `main.js`
2. 打开 Obsidian → 设置 → 第三方插件 → 关闭安全模式
3. 只需把 **构建产物** 复制到 `.obsidian/plugins/desktoppet/`：
   ```
   <你的 vault>/.obsidian/plugins/desktoppet/
     ├── main.js          # 必需（构建产物）
     ├── manifest.json    # 必需
     └── styles.css       # 必需
   ```
   源码 `.ts` 文件**不需要**放进插件目录。
4. 重启 Obsidian（或插件列表刷新）
5. 插件列表搜索 "Desktop Pet"，启用即可

> **说明**：桌面端与移动端均可使用（`isDesktopOnly: false`）。交互基于 **Pointer Events** 实现，鼠标、触摸、触控笔共用同一套拖动 / 点击逻辑。

## 🎮 使用指南

- **命令面板** — `Ctrl+P` → 搜索 "Show/Hide Pet"
- **状态栏** — 右下角机器人图标，单击切换显隐（仅桌面端）
- **拖动** — 按住宠物拖动（鼠标 / 触屏 / 触控笔均可）到任意位置
- **点击** — 单击宠物本体 → 缩放脉冲 + 弯眼 + 头顶气泡台词
- **设置** — 设置 → 社区插件 → Desktop Pet
  - 显示开关
  - 宠物大小（0.5x – 2.0x）
  - 主色（5 种柔和配色）
  - 位置 X / Y（像素）
  - 恢复默认

## 📚 文档

- [用户使用指南（中文）](docs/zh-cn/UserGuide.md)
- [User Guide (English)](docs/en/UserGuide.md)
- 发布指南：[中文](docs/zh-cn/RELEASE.md) / [English](docs/en/RELEASE.md)
- [变更日志](CHANGELOG.md) · [贡献指南](CONTRIBUTING.md) · [安全政策](SECURITY.md)

## 🗂️ 项目结构

```
desktoppet/
├── main.ts              # 插件主入口（Plugin 类 + 生命周期 + 命令 + 状态栏）
├── pet/
│   ├── PetScene.ts      # Three.js 场景封装（renderer / scene / camera / 灯光 / rAF 循环）
│   ├── PetModel.ts      # 参数化 3D 机器人模型构建（几何体组合）
│   ├── PetAnimator.ts   # 动画控制器（idle / 眨眼 / 点击反馈 / 拖动倾斜）
│   └── PetInteraction.ts # 交互层（Pointer Events 拖动 + 点击判定）
├── settings/
│   └── SettingsTab.ts   # 设置面板 + DEFAULT_SETTINGS
├── styles.css           # 悬浮容器 / 气泡 / 状态栏样式（明暗主题自适应）
├── manifest.json        # Obsidian 插件清单
├── package.json         # npm 依赖
├── tsconfig.json        # TypeScript 配置
├── esbuild.config.mjs   # 构建脚本
├── README.md            # 英文 README
└── README.zh-CN.md      # 本文件
```

## 🛠️ 技术栈

- **语言** — TypeScript（严格模式，无 `any`）
- **3D 渲染** — Three.js `0.160.x`
- **构建** — esbuild + Obsidian 标准插件模板
- **依赖** — 仅 `three`（运行时），其余为 dev 依赖

## 🔍 关键实现说明

### 主色替换策略

`PetModel` 构建时会给「机身 / 天线 / 四肢」用的主色材质打上 `material.userData.isPrimary = true` 标记，`PetScene.applyColor()` 遍历模型时**只替换带这个标记的材质**，其余一概不动。

不再使用颜色值启发式（"非白非深非腮红即主色"）：那种判断既会漏——主色一旦被设成深色就无法再改回来，又会多——将来新增任何其他色调的辅助材质都会被误当成主色重涂。

### 点击脉冲

点击反馈（缩放脉冲 + 弯眼 + 天线弹跳）完全由渲染循环的 `elapsed` 驱动：

```ts
scalePulse = 1 + Math.sin(t * Math.PI) * 0.3;
group.scale.setScalar(scalePulse);
```

`PetAnimator.triggerClickFeedback()` 取的是 `update()` 每帧写入的 `lastElapsed`。**不要传 `performance.now()`**——它以「页面加载」为原点，而循环里的 `elapsed` 以「场景创建」为原点；两者混用会让 `elapsed - clickStartAt` 恒为负数，点击动画永不收敛。

宠物的视觉尺寸完全由容器 / canvas 尺寸决定，模型自身始终保持 1:1。

### 拖动的速度感知倾斜

拖动鼠标时，根据 X 方向速度计算出倾角目标（`-0.3 ~ +0.3` 弧度），  
动画控制器里通过一阶低通滤波平滑过渡：

```ts
tiltCurrent += (tiltTarget - tiltCurrent) * Math.min(1, delta * 8);
```

该滤波**每帧都跑**（不只在拖动中），因此松手后倾角会自然衰减回 0，而不会停在最后一个角度。

### 透明背景

- `WebGLRenderer({ alpha: true })` + `setClearColor(0x000000, 0)`
- CSS 容器 `pointer-events: none`，仅 canvas 内层 `pointer-events: auto`
- 外层不阻挡 Obsidian 内容交互
- 隐藏状态下 canvas 额外声明 `pointer-events: none` —— 只有 `opacity: 0` 依然会被命中

## ⚠️ 已知限制

- 触屏设备上宠物区域会独占指针（`touch-action: none`），因此「从宠物身上开始」的滚动 / 缩放手势会被抑制——需要滚动页面时从宠物以外的区域操作即可
- 位置会被裁剪到可视区内，因此宠物不可能被拖出（或被配置到）屏幕之外；窗口特别小时，大尺寸宠物会贴住左上角
- 气泡台词在容器顶部显示，若宠物靠近窗口上边缘可能被裁切
- 暂未做鼠标悬停特效（可后续加入轻微缩放 + 高光增亮）

## 🚀 后续可扩展方向

- 添加鼠标悬停特效
- 多种机器人外形（球型 / 方块型 / 拟人型）
- 情绪系统（根据长时间无操作进入"打瞌睡"状态）
- 键盘快捷键自定义
- 多点触控手势（如双指捏合缩放）
- 更多台词、多语言
- 与 Obsidian 笔记交互（例如点击时打开新笔记、显示最后修改时间）

## 📄 许可

MIT © xiaosong8584
