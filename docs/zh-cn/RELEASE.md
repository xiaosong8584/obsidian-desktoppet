# 发布指南

> **适用范围**：发布 Desktop Pet for Obsidian 插件
>
> 英文版见 [`docs/en/RELEASE.md`](../en/RELEASE.md)。两份内容需保持同步。

---

## 快速开始

标准发布只需记住三步：

```bash
# 1. 跑发布前检查（确认一切正常）
bash check_before_publish.sh

# 2. 更新版本号 + CHANGELOG（详见下文）
# ... 编辑 manifest.json / package.json / CHANGELOG.md ...

# 3. 打 tag 并推送（自动触发 release.yml）
git tag v1.0.0
git push origin v1.0.0
```

---

## 完整发布流程

### 第 1 步：跑发布前检查

```bash
bash check_before_publish.sh
```

脚本共执行 **26 项检查**，分为三部分：

- **Part 1 — 开源必备文件**：必需文件、JSON 合法性、版本号同步、manifest 必填字段、无 `console.log`、无硬编码密钥、`.gitignore`、LICENSE
- **Part 2 — GitHub 自动化文件**：workflow 存在性、action 版本、`build.yml` / `release.yml` 关键配置、`docs/` 结构、Markdown 死链与 git 跟踪校验、README 关键信息
- **Part 3 — 构建与 Git 状态**：lock 文件一致性、`npm audit`、构建、构建产物、`main.js` 体积、zip 打包、工作树、分支、与远程同步、tag 状态

> **脚本是只读的。** 它不会执行任何会改写工作树或 `node_modules` 的命令——依赖一致性用 `npm ci --dry-run` 校验，只解析依赖树、不真正安装。

**只有在关键项全部通过（退出码 0）时才继续发布。**

---

### 第 2 步：更新版本号

版本号必须出现在 **3 个地方**，且保持一致：

#### 2.1 manifest.json（Obsidian 读取，权威来源）

```json
{
  "version": "1.1.0"
}
```

#### 2.2 package.json（npm 包版本，与 manifest 保持同步）

```json
{
  "version": "1.1.0"
}
```

#### 2.3 CHANGELOG.md（把 `[Unreleased]` 的内容移到新版本下）

```markdown
## [1.1.0] - 2026-09-10

### Added
- 新功能 A
- 新功能 B

---

## [Unreleased]

（在此记录下一个版本的变更）
```

> **提示**：`check_before_publish.sh` 会自动校验 manifest.json / package.json / CHANGELOG.md 三者的版本号是否一致。`## [Unreleased]` 应保持在文件顶部（Keep a Changelog 约定）——检查脚本读取的是第一个形如 `## [x.y.z]` 的标题，前面有 `[Unreleased]` 段不影响结果。

---

### 第 3 步：提交变更

```bash
# 查看所有改动
git status

# 暂存全部改动
git add .

# 提交（使用 Conventional Commits 格式）
git commit -m "chore: release v1.1.0"

# 推送到 main 分支
git push origin main
```

> **注意**：`git push origin main` 会触发 `build.yml`（构建验证）。确认它通过后再打 tag。

---

### 第 4 步：打 tag 并推送（触发 release.yml）

```bash
# 创建 tag（版本号与 manifest.json 一致）
git tag v1.1.0

# 推送 tag 到远程
git push origin v1.1.0
```

推送 tag 后，GitHub Actions 的 `release.yml` 会自动触发并执行：

1. 拉取代码
2. `npm ci` 安装依赖
3. `npm run build` 生产构建
4. 打包 `obsidian-desktoppet.zip`（含 main.js / styles.css / manifest.json）
5. 创建 GitHub Release，附带 4 个文件：
   - `main.js`
   - `styles.css`
   - `manifest.json`
   - `obsidian-desktoppet.zip`
6. 自动生成 Release Notes

> 注意区别：**workflow** 里用的是 `npm ci`（真正的干净安装——这在 CI 里是正确的）；**本地检查脚本**则刻意不这么做。

---

### 第 5 步：验证发布

#### 5.1 检查 GitHub Actions

打开仓库 → Actions 标签页：

| Workflow | 触发条件 | 预期 |
|---|---|---|
| `build.yml` | push main / PR | ✅ 绿色对勾（构建通过） |
| `release.yml` | 推送 `v*` tag | ✅ 绿色对勾（发布成功） |

#### 5.2 检查 GitHub Releases

打开仓库 → Releases 标签页：

- 确认新版本（如 `v1.1.0`）已创建
- 确认包含 4 个文件：`main.js` / `styles.css` / `manifest.json` / `obsidian-desktoppet.zip`
- 确认 Release Notes 已自动生成（基于 commit 信息）

#### 5.3 本地验证（可选）

```bash
# 下载发布产物后解压到临时目录
# （请使用真实的绝对路径 —— Windows / Git Bash 下原生工具往往不认 MSYS 风格的 /tmp 路径）
unzip obsidian-desktoppet.zip -d "$HOME/desktoppet-test"

# 复制到测试 vault
cp -r "$HOME/desktoppet-test" "<你的 vault>/.obsidian/plugins/desktoppet/"
```

---

## 版本号约定

遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)：

| 场景 | 版本规则 | 示例 |
|---|---|---|
| 新增功能，向后兼容 | **minor** | 1.0.0 → 1.1.0 |
| 修复 Bug，无功能变化 | **patch** | 1.0.0 → 1.0.1 |
| 破坏性变更 | **major** | 1.0.0 → 2.0.0 |

### 什么算「破坏性变更」？

- 设置项名称或结构变化（用户需要重新配置）
- API 变化（其他插件依赖的代码接口）
- 移除已有功能
- 默认行为变化（例如默认位置从左上角改到右下角）

### 什么**不算**「破坏性变更」？

- Bug 修复
- 新增可选设置（带默认值）
- 性能优化
- 文档改进

---

## 特殊场景

### 场景 1：紧急修复（Hotfix）

已发布版本存在必须立刻修的关键 Bug 时：

```bash
# 1. 从 main 切出 hotfix 分支
git checkout main
git pull origin main
git checkout -b hotfix/fix-critical-bug

# 2. 修复 + 测试
# ... 修改代码 ...
npm run build

# 3. 更新 patch 版本号（如 1.0.0 → 1.0.1）
# ... 编辑 manifest.json / package.json / CHANGELOG.md ...

# 4. 提交并推送
git add .
git commit -m "fix: critical bug fix"
git push origin main

# 5. 打 tag
git tag v1.0.1
git push origin v1.0.1
```

### 场景 2：预发布（Prerelease）

正式发布前想先测试：

```bash
# 创建带 -rc 后缀的预发布 tag
git tag v1.1.0-rc.1
git push origin v1.1.0-rc.1

# 在 GitHub Release 页面勾选 Pre-release
```

> **注意**：`release.yml` 匹配所有 `v*` tag，包含预发布。
>
> 版本校验会**先剥掉预发布后缀再比对基版本**：`v1.1.0-rc.1` → 基版本 `1.1.0`，只要 `manifest.json` 是 `1.1.0` 就能通过。也就是说 —— **发布预发布版时，`manifest.json` / `package.json` 要写成基版本号（如 `1.1.0`），而不是 `1.1.0-rc.1`**，否则校验会失败、Release 被拒绝。
>
> 若还想在 Release 页自动勾选 Pre-release，需要给 `release.yml` 增加 `prerelease: true` 的条件判断（当前未做）。

### 场景 3：回滚发布

需要撤回已发布的版本时：

```bash
# 方式 1：删除 GitHub Release（推荐）
# 在 GitHub Releases 页面点击 Delete

# 方式 2：删除 tag（本地 + 远程）
git tag -d v1.1.0
git push origin :refs/tags/v1.1.0

# 方式 3：标记为废弃（不推荐，Release 仍然可见）
# 在 GitHub Release 页面手动标记
```

> **警告**：删除 tag 后，已经下载过该版本的用户不会自动更新。更稳妥的做法是在下一个版本里修掉问题。

---

## 常见问题

### Q：check_before_publish.sh 报了警告（!），还能发布吗？

警告不阻塞发布，但请先逐条确认。常见警告（引号内为脚本的实际输出）：

- `有未提交的更改：` → 确认这些改动是否应该提交；如果不应提交，用 `git stash`
- `当前在 xxx 分支（发布前建议切回 main）` → 若不在 main，发布前先切回 main
- `落后远程 N commits，建议先 pull` → 先执行 `git pull`
- `CHANGELOG.md 未找到版本号` → 确认 CHANGELOG.md 里存在形如 `## [x.y.z]` 的标题

### Q：npm audit 报漏洞怎么办？

**不要带着漏洞发布。** 先修掉：

```bash
# 查看漏洞详情
npm audit

# 尝试自动修复
npm audit fix

# 自动修复失败时，手动检查依赖
npm ls <有漏洞的包名>
```

### Q：npm run build 失败了怎么办？

常见原因：

1. **TypeScript 类型错误** → 根据报错信息修类型
2. **缺少依赖** → `npm install <package>` 或 `npm install --save-dev <package>`
3. **lock 文件过期** → `npm ci --dry-run` 报不一致时，执行 `npm install` 刷新 `package-lock.json` 并提交

### Q：release.yml 失败了怎么办？

常见原因：

1. **zip 命令不可用** → 查看 GitHub Actions 日志；ubuntu-latest 自带 zip
2. **缺少文件** → 确认 `main.js` / `styles.css` / `manifest.json` 都已生成
3. **权限问题** → 确认 release.yml 里有 `permissions: contents: write`

### Q：如何手动创建 Release（不用 GitHub Actions）？

```bash
# 1. 构建
npm run build

# 2. 打包
zip -r obsidian-desktoppet.zip main.js styles.css manifest.json

# 3. 打开 GitHub Release 页面手动创建
# https://github.com/xiaosong8584/obsidian-desktoppet/releases/new
```

### Q：Obsidian 用户怎么拿到发布版本？

两种安装方式：

1. **社区插件市场**（若已上架 Obsidian 社区插件）
2. **手动安装** → 从 GitHub Releases 下载 `obsidian-desktoppet.zip`，解压到：
   ```
   <你的 vault>/.obsidian/plugins/desktoppet/
   ```

---

## 相关文档

| 文档 | 路径 | 说明 |
|---|---|---|
| 发布前检查脚本 | `check_before_publish.sh` | 26 项自动检查（只读） |
| 构建 workflow | `.github/workflows/build.yml` | push / PR 时自动构建验证 |
| 发布 workflow | `.github/workflows/release.yml` | 推送 tag 时自动发布 |
| 变更日志 | `CHANGELOG.md` | 所有版本的变更记录 |
| 用户使用指南（中文） | `docs/zh-cn/UserGuide.md` | 用户如何安装与使用 |
| User Guide（英文） | `docs/en/UserGuide.md` | English User Guide |
| Release Guide (English) | `docs/en/RELEASE.md` | Release guide (English) |
