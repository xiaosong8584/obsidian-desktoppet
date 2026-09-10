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
- 🖱️ **拖动 & 点击** — 鼠标拖动位置，点击触发缩放脉冲 + 弯眼表情 + 头顶气泡台词
- 💤 **Idle 动画** — 整体呼吸浮动、左右摇摆、眨眼（2.5~6 秒随机）、手臂自然摆动、天线晃动
- 🎭 **5 种配色方案** — 柔和蓝、薄荷绿、珊瑚粉、薰衣草、暖橙
- 📏 **尺寸调节** — 0.5x ~ 2.0x 滑块
- 🌗 **明暗主题适配** — 气泡 & 阴影使用 Obsidian CSS 变量，自动跟随主题切换
- 🎚️ **状态栏图标** — 一键切换显示 / 隐藏，也支持 `Ctrl+Shift+P` 命令面板
- 🔌 **完全透明背景** — 不遮挡 Obsidian 内容（外层 `pointer-events: none`，仅宠物本体可交互）
- ♻️ **完整生命周期管理** — `onunload` 时释放 renderer / geometry / material / rAF / 事件

## 📸 截图

（在此处插入截图占位：宠物 idle 状态、点击反馈、拖动状态、设置面板）

## ⚙️ 开发环境搭建

1. **安装 Node.js 18+**（推荐 20 LTS）
2. **克隆/打开项目**：
   ```bash
   cd I:\Users\Snoopy\desktoppet
   npm install
   ```
3. **构建命令**：
   ```bash
   npm run dev          # 监听模式，保存自动重编
   npm run build        # 生产构建，输出 main.js
   npm run build:dev    # 生产构建（等同 dev 但产出 main.js）
   ```

## 📦 安装到 Obsidian

1. 执行 `npm run build`，生成 `main.js`
2. 打开 Obsidian → 设置 → 第三方插件 → 关闭安全模式
3. 将本目录 **整体** 复制到 `.obsidian/plugins/desktoppet/`：
   ```
   <你的 vault>/.obsidian/plugins/desktoppet/
     ├── main.js
     ├── main.ts
     ├── manifest.json
     ├── styles.css
     └── ...（其他源文件可选保留）
   ```
4. 重启 Obsidian（或插件列表刷新）
5. 插件列表搜索 "Desktop Pet"，启用即可

## 🎮 使用指南

- **命令面板** — `Ctrl+Shift+P` → 搜索 "Show/Hide Pet"
- **状态栏** — 右下角机器人图标，单击切换显隐
- **拖动** — 鼠标按住宠物 → 拖到任意位置
- **点击** — 单击宠物本体 → 缩放脉冲 + 弯眼 + 头顶气泡台词
- **设置** — 设置 → 社区插件 → Desktop Pet
  - 显示开关
  - 宠物大小（0.5x – 2.0x）
  - 主色（5 种柔和配色）
  - 位置 X / Y（像素）
  - 恢复默认

## 🗂️ 项目结构

```
desktoppet/
├── main.ts              # 插件主入口（Plugin 类 + 生命周期 + 命令 + 状态栏）
├── pet/
│   ├── PetScene.ts      # Three.js 场景封装（renderer / scene / camera / 灯光 / rAF 循环）
│   ├── PetModel.ts      # 参数化 3D 机器人模型构建（几何体组合）
│   ├── PetAnimator.ts   # 动画控制器（idle / 眨眼 / 点击反馈 / 拖动倾斜）
│   └── PetInteraction.ts # 交互层（鼠标拖动 + 点击判定 + 事件绑定）
├── settings/
│   └── SettingsTab.ts   # 设置面板 + DEFAULT_SETTINGS
├── styles.css           # 悬浮容器 / 气泡 / 状态栏样式（明暗主题自适应）
├── manifest.json        # Obsidian 插件清单
├── package.json         # npm 依赖
├── tsconfig.json        # TypeScript 配置
├── esbuild.config.mjs   # 构建脚本
└── README.md            # 本文件
```

## 🛠️ 技术栈

- **语言** — TypeScript（严格模式，无 `any`）
- **3D 渲染** — Three.js `0.160.x`
- **构建** — esbuild + Obsidian 标准插件模板
- **依赖** — 仅 `three`（运行时），其余为 dev 依赖

## 🔍 关键实现说明

### 主色替换策略

`PetScene.applyColor()` 遍历模型所有 `MeshStandardMaterial`，把不是白色（`0xffffff`）、深色（`0x2c3e50`）、腮红（`0xff9fb0`）的材质视为"主色材质"，一次性替换为目标色。这样既保持模型结构不变，又能实时切换配色。

### 点击脉冲与外部缩放的组合

宠物外部缩放（设置面板调节）与点击脉冲动画需要并存。实现方式：

- 外部缩存放 `group.userData.baseScale`
- 每帧：`group.scale = baseScale * (1 + 0.3 * sin(π * t))`
- 未点击时 `scale = baseScale`

### 拖动的速度感知倾斜

拖动鼠标时，根据 X 方向速度计算出倾角目标（`-0.3 ~ +0.3` 弧度），
动画控制器里通过一阶低通滤波平滑过渡：

```ts
tiltCurrent += (tiltTarget - tiltCurrent) * Math.min(1, delta * 8);
```

### 透明背景

- `WebGLRenderer({ alpha: true })` + `setClearColor(0x000000, 0)`
- CSS 容器 `pointer-events: none`，仅 canvas 内层 `pointer-events: auto`
- 外层不阻挡 Obsidian 内容交互

## ⚠️ 已知限制

- 目前不支持触摸拖动（桌面端优先，触屏可后续扩展）
- 主色替换采用"非白非深非腮红即为主色"启发式策略，若将来引入新的辅助色材质需手动更新判断
- 气泡台词在容器顶部显示，若宠物靠近窗口上边缘可能被裁切
- 暂未做鼠标悬停特效（可后续加入轻微缩放 + 高光增亮）

## 🚀 后续可扩展方向

- 添加鼠标悬停特效
- 多种机器人外形（球型 / 方块型 / 拟人型）
- 情绪系统（根据长时间无操作进入"打瞌睡"状态）
- 键盘快捷键自定义
- 触屏 / 多点触控支持
- 更多台词、多语言
- 与 Obsidian 笔记交互（例如点击时打开新笔记、显示最后修改时间）

## 📄 许可

MIT © xiaosong8584
