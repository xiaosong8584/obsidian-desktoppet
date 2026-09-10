#!/bin/bash
# ============================================================
# check_before_publish.sh — Push / Release 前完整检查清单
# ============================================================
# 用途：把文档里的"注意事项"转化为可执行的自动化检查
# 用法：bash check_before_publish.sh
# 退出码：0 = 全部通过；非 0 = 有失败项，不建议 push
# ============================================================
#
# 结构：
#   Part 1 — 开源项目必备文件检查
#   Part 2 — GitHub 自动化必须的文件检查
#   Part 3 — 发布新版本（项目文件检查 + 必须步骤）
# ============================================================

set -o pipefail

# ---------- 颜色与状态标记 ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

PASS=0
FAIL=0
WARN=0

pass() { echo -e "  ${GREEN}✓${RESET} $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}✗${RESET} $1"; FAIL=$((FAIL+1)); }
warn() { echo -e "  ${YELLOW}!${RESET} $1"; WARN=$((WARN+1)); }
info() { echo -e "  ${CYAN}·${RESET} $1"; }
step() { echo -e "\n  ${MAGENTA}${BOLD}→ $1${RESET}"; }
section() { echo -e "\n\n${BOLD}${BLUE}═══════════ $1 ═══════════${RESET}"; }

# ---------- 项目根目录 ----------
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || {
  echo "错误：必须在 git 仓库根目录运行"; exit 1;
}

echo -e "\n${BOLD}🚀 Desktop Pet — Push / Release 前检查清单${RESET}"
echo -e "项目根目录：$(pwd)"
echo -e "检查时间：$(date '+%Y-%m-%d %H:%M:%S')"
echo -e "检查脚本：$(basename "$0")"

# ============================================================
# Part 1: 开源项目必备文件检查
# ============================================================
section "Part 1: 开源项目必备文件检查"

# 1.1 必需文件存在性
step "1.1 检查开源项目必需文件"
REQUIRED_FILES=(
  "package.json"
  "package-lock.json"
  "tsconfig.json"
  "esbuild.config.mjs"
  "manifest.json"
  "main.ts"
  "styles.css"
  "README.md"
  "README.zh-CN.md"
  "CHANGELOG.md"
  "LICENSE"
  "CONTRIBUTING.md"
  "CODE_OF_CONDUCT.md"
  "SECURITY.md"
  ".gitignore"
)
missing=0
for f in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    fail "缺少：$f"
    missing=$((missing+1))
  fi
done
[ $missing -eq 0 ] && pass "所有开源必需文件存在（${#REQUIRED_FILES[@]} 个）"

# 1.2 JSON 合法性
step "1.2 检查 JSON 文件合法性"
if command -v node >/dev/null 2>&1; then
  json_ok=0
  for jf in package.json package-lock.json tsconfig.json manifest.json; do
    if node -e "JSON.parse(require('fs').readFileSync('$jf','utf8'))" 2>/dev/null; then
      json_ok=$((json_ok+1))
    else
      fail "JSON 格式错误：$jf"
    fi
  done
  pass "JSON 格式合法（$json_ok/4）"
else
  warn "node 不可用，跳过 JSON 校验"
fi

# 1.3 版本号同步
step "1.3 检查版本号同步（manifest / package / CHANGELOG）"
if command -v node >/dev/null 2>&1; then
  manifest_ver=$(node -e "console.log(require('./manifest.json').version)")
  package_ver=$(node -e "console.log(require('./package.json').version)")
  changelog_ver=$(grep -oE '^## \[[0-9]+\.[0-9]+\.[0-9]+\]' CHANGELOG.md 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

  if [ "$manifest_ver" = "$package_ver" ]; then
    pass "manifest.json ($manifest_ver) = package.json ($package_ver)"
  else
    fail "版本不一致：manifest=$manifest_ver, package=$package_ver"
  fi

  if [ -n "$changelog_ver" ] && [ "$manifest_ver" = "$changelog_ver" ]; then
    pass "CHANGELOG.md 最新版本 ($changelog_ver) = manifest.json"
  elif [ -n "$changelog_ver" ]; then
    warn "CHANGELOG.md 最新版本 ($changelog_ver) ≠ manifest.json ($manifest_ver)"
  else
    warn "CHANGELOG.md 未找到版本号"
  fi
fi

# 1.4 manifest.json 必填字段
step "1.4 检查 manifest.json 必填字段"
if command -v node >/dev/null 2>&1; then
  missing_fields=()
  for field in id name version description author; do
    if ! node -e "const m=require('./manifest.json'); process.exit(m['$field'] ? 0 : 1)" 2>/dev/null; then
      missing_fields+=("$field")
    fi
  done
  if [ ${#missing_fields[@]} -eq 0 ]; then
    pass "manifest.json 必填字段完整（id/name/version/description/author）"
  else
    fail "manifest.json 缺少字段：${missing_fields[*]}"
  fi
fi

# 1.5 无 console.log 泄露
step "1.5 检查无 console.log / console.debug 泄露"
console_hits=$(grep -rn "console\.log\|console\.debug" *.ts pet/ settings/ 2>/dev/null | wc -l)
if [ "$console_hits" -eq 0 ]; then
  pass "无 console.log / console.debug 泄露"
else
  fail "发现 $console_hits 处 console.log 泄露："
  grep -rn "console\.log\|console\.debug" *.ts pet/ settings/ 2>/dev/null | sed 's/^/      /'
fi

# 1.6 无硬编码密钥
step "1.6 检查无硬编码密钥 / token / API key"
secret_pattern="sk-[A-Za-z0-9]{10,}|Bearer\s+[A-Za-z0-9]|token=[^\s\"']+|api[_-]?key\s*[:=]\s*[\"'][^\"']+"
secret_hits=$(grep -rInE "$secret_pattern" *.ts pet/ settings/ 2>/dev/null | wc -l)
if [ "$secret_hits" -eq 0 ]; then
  pass "无硬编码密钥"
else
  fail "发现 $secret_hits 处疑似硬编码密钥："
  grep -rInE "$secret_pattern" *.ts pet/ settings/ 2>/dev/null | sed 's/^/      /'
fi

# 1.7 .gitignore 完整性
step "1.7 检查 .gitignore 完整性"
gitignore_rules=("node_modules" ".workbuddy" "dist" "*.log" ".DS_Store" "Thumbs.db" ".vscode" ".idea")
gitignore_missing=()
for rule in "${gitignore_rules[@]}"; do
  if ! grep -q "$rule" .gitignore 2>/dev/null; then
    gitignore_missing+=("$rule")
  fi
done
if [ ${#gitignore_missing[@]} -eq 0 ]; then
  pass ".gitignore 完整"
else
  warn ".gitignore 缺少规则：${gitignore_missing[*]}"
fi

# 1.8 LICENSE 存在且有内容
step "1.8 检查 LICENSE"
if [ -s LICENSE ]; then
  license_type=$(head -1 LICENSE | tr -d '\r')
  pass "LICENSE 存在（首行：$license_type）"
else
  fail "LICENSE 缺失或为空"
fi

# ============================================================
# Part 2: GitHub 自动化必须的文件检查
# ============================================================
section "Part 2: GitHub 自动化必须的文件检查"

# 2.1 workflow 文件存在性
step "2.1 检查 GitHub Actions workflow 文件"
workflow_files=(".github/workflows/build.yml" ".github/workflows/release.yml")
wf_missing=()
for wf in "${workflow_files[@]}"; do
  if [ ! -f "$wf" ]; then
    wf_missing+=("$wf")
  fi
done
if [ ${#wf_missing[@]} -eq 0 ]; then
  pass "所有 workflow 文件存在（build.yml + release.yml）"
else
  fail "缺少 workflow 文件：${wf_missing[*]}"
fi

# 2.2 GitHub Actions 版本检查
step "2.2 检查 GitHub Actions 版本（checkout / setup-node / upload-artifact ≥ v7，action-gh-release ≥ v3）"
# 设计说明：旧实现用 `@v2$|@v4$` 做「全行结尾」匹配，会把任何以 @v2 / @v4 结尾的
# 合法引用（例如 `uses: some/other-action@v4`）一并误判为过时。
# 现改为：逐行解析 `uses:` 引用 → 取 action 名与版本号 → 与各自的最低主版本比对。
wf_files=$(find .github/workflows -maxdepth 1 -type f \( -name '*.yml' -o -name '*.yaml' \) 2>/dev/null)
if [ -z "$wf_files" ]; then
  warn ".github/workflows/ 下未找到 workflow 文件，跳过 action 版本检查"
else
  # 只取「行首（允许缩进与 YAML 列表符 -）即为 uses:」的行，避免命中注释里的示例
  uses_refs=$(grep -hE '^[[:space:]]*(-[[:space:]]+)?uses:[[:space:]]*[^[:space:]#]+' $wf_files 2>/dev/null \
              | sed -E 's/^[[:space:]]*(-[[:space:]]+)?uses:[[:space:]]*([^[:space:]#]+).*/\2/' \
              | sort -u)

  ok_list=""
  old_list=""
  other_list=""

  while IFS= read -r ref; do
    [ -z "$ref" ] && continue

    # 本地 action（./path）与容器 action（docker://）不参与版本基线比对
    case "$ref" in
      ./*|../*|docker://*) continue ;;
    esac

    action="${ref%@*}"
    version="${ref##*@}"
    # 未带 @版本 的引用（同仓库 reusable workflow 等）跳过
    [ "$action" = "$ref" ] && continue

    case "$action" in
      actions/checkout|actions/setup-node|actions/upload-artifact) min_major=7 ;;
      softprops/action-gh-release)                                 min_major=3 ;;
      *) other_list="${other_list}${ref}"$'\n'; continue ;;
    esac

    major="${version#v}"
    major="${major%%.*}"
    # 非纯数字版本（分支名 / commit SHA / latest 等）无法比较，归入「仅提示」
    if ! printf '%s' "$major" | grep -qE '^[0-9]+$'; then
      other_list="${other_list}${ref}"$'\n'
      continue
    fi

    if [ "$major" -lt "$min_major" ]; then
      old_list="${old_list}${ref}"$'\n'
    else
      ok_list="${ok_list}${ref}"$'\n'
    fi
  done <<< "$uses_refs"

  if [ -n "$old_list" ]; then
    fail "发现 $(printf '%s' "$old_list" | sed '/^$/d' | wc -l | tr -d ' ') 处过时的 action 版本："
    printf '%s' "$old_list" | sed '/^$/d' | sed 's/^/      /'
  else
    pass "所有受管 action 版本均为最新（$(printf '%s' "$ok_list" | sed '/^$/d' | tr '\n' ' ' | sed 's/ $//')）"
  fi

  if [ -n "$other_list" ]; then
    info "未纳入版本基线的引用（仅提示，不判定）："
    printf '%s' "$other_list" | sed '/^$/d' | sed 's/^/      /'
  fi
fi

# 2.3 build.yml 配置检查
step "2.3 检查 build.yml 关键配置"
build_yml=".github/workflows/build.yml"
build_config_ok=0
if [ -f "$build_yml" ]; then
  grep -q "name: Build" "$build_yml" && build_config_ok=$((build_config_ok+1))
  grep -q "push:" "$build_yml" && grep -q "branches: \[ main \]" "$build_yml" && build_config_ok=$((build_config_ok+1))
  grep -q "pull_request:" "$build_yml" && build_config_ok=$((build_config_ok+1))
  grep -q "runs-on: ubuntu-latest" "$build_yml" && build_config_ok=$((build_config_ok+1))
  grep -q "npm ci" "$build_yml" && build_config_ok=$((build_config_ok+1))
  grep -q "npm run build" "$build_yml" && build_config_ok=$((build_config_ok+1))
  grep -q "upload-artifact" "$build_yml" && build_config_ok=$((build_config_ok+1))
  if [ $build_config_ok -ge 5 ]; then
    pass "build.yml 配置完整（$build_config_ok/7 项）"
  else
    warn "build.yml 配置不完整（$build_config_ok/7 项），建议检查"
  fi
fi

# 2.4 release.yml 配置检查
step "2.4 检查 release.yml 关键配置"
release_yml=".github/workflows/release.yml"
release_config_ok=0
if [ -f "$release_yml" ]; then
  grep -q "name: Release" "$release_yml" && release_config_ok=$((release_config_ok+1))
  grep -q "tags:" "$release_yml" && grep -q "'v\*'" "$release_yml" && release_config_ok=$((release_config_ok+1))
  grep -q "permissions:" "$release_yml" && grep -q "contents: write" "$release_yml" && release_config_ok=$((release_config_ok+1))
  grep -q "npm ci" "$release_yml" && release_config_ok=$((release_config_ok+1))
  grep -q "npm run build" "$release_yml" && release_config_ok=$((release_config_ok+1))
  grep -q "zip" "$release_yml" && release_config_ok=$((release_config_ok+1))
  grep -q "action-gh-release" "$release_yml" && release_config_ok=$((release_config_ok+1))
  grep -q "generate_release_notes: true" "$release_yml" && release_config_ok=$((release_config_ok+1))
  if [ $release_config_ok -ge 6 ]; then
    pass "release.yml 配置完整（$release_config_ok/8 项）"
  else
    warn "release.yml 配置不完整（$release_config_ok/8 项），建议检查"
  fi
fi

# 2.5 docs/ 目录结构
step "2.5 检查 docs/ 目录结构"
if [ -f "docs/en/UserGuide.md" ] && [ -f "docs/zh-cn/UserGuide.md" ]; then
  pass "docs/ 结构完整（en + zh-cn 双语）"
else
  missing_docs=()
  [ ! -f "docs/en/UserGuide.md" ] && missing_docs+=("docs/en/UserGuide.md")
  [ ! -f "docs/zh-cn/UserGuide.md" ] && missing_docs+=("docs/zh-cn/UserGuide.md")
  fail "docs/ 缺少文件：${missing_docs[*]}"
fi

# 2.6 文档本地链接有效性（真正的死链校验 + git 跟踪状态）
step "2.6 检查文档本地链接是否有效（死链 + git 跟踪状态）"
# 设计说明：
#  - 旧实现是硬编码黑名单（grep "doc/zh-cn|DeveloperGuide.md|PublishGuide.md"），
#    只能发现「历史上删过的那几个文件」，对新增死链（例如 README 指向一个并不存在的
#    docs/zh-cn/RELEASE.md）完全无效 —— 它压根不是链接校验，只是关键字搜索。
#  - 现改为解析 Markdown 的 [text](target) 链接，对本地相对路径逐个判断目标是否存在。
#  - 只判断「文件系统里存在」还不够：若链接指向一个存在但【未被 git 跟踪】的文件，
#    本地全绿、push 到 GitHub 之后却是 404。因此再补一层跟踪状态校验。
md_files=$(find . -maxdepth 3 -name '*.md' -not -path './node_modules/*' -not -path './.workbuddy/*' 2>/dev/null)
in_git=0
git rev-parse --git-dir >/dev/null 2>&1 && in_git=1
if [ -z "$md_files" ]; then
  warn "未找到 Markdown 文件，跳过死链检查"
else
  dead_links=""
  untracked_links=""
  md_count=0
  while IFS= read -r md; do
    [ -z "$md" ] && continue
    md_count=$((md_count+1))
    md_dir=$(dirname "$md")
    # 取出 [text](target) 里的 target，并剥掉链接标题（"..."）与锚点 / 查询串
    targets=$(grep -oE '\]\([^)]+\)' "$md" 2>/dev/null \
              | sed -E 's/^\]\(//; s/\)$//' \
              | sed -E 's/[[:space:]]+"[^"]*"$//' \
              | sed -E 's/[?#].*$//')
    while IFS= read -r target; do
      [ -z "$target" ] && continue
      # 外链 / 绝对路径 / 纯锚点 / 模板变量：不参与本地校验
      case "$target" in
        http://*|https://*|mailto:*|tel:*|data:*|/*|\#*|\<*|\{*|\$*) continue ;;
      esac
      if [ ! -e "$md_dir/$target" ]; then
        dead_links="${dead_links}${md} -> ${target}"$'\n'
        continue
      fi
      # 文件存在但未被 git 跟踪 → push 后同样是 404
      if [ "$in_git" -eq 1 ] && ! git ls-files --error-unmatch "$md_dir/$target" >/dev/null 2>&1; then
        untracked_links="${untracked_links}${md} -> ${target}"$'\n'
      fi
    done <<< "$targets"
  done <<< "$md_files"

  if [ -z "$dead_links" ] && [ -z "$untracked_links" ]; then
    pass "文档本地链接全部有效且已被 git 跟踪（已校验 $md_count 个 Markdown 文件）"
  else
    if [ -n "$dead_links" ]; then
      fail "发现 $(printf '%s' "$dead_links" | sed '/^$/d' | wc -l | tr -d ' ') 处死链（目标文件不存在）："
      printf '%s' "$dead_links" | sed '/^$/d' | sed 's/^/      /'
    fi
    if [ -n "$untracked_links" ]; then
      fail "发现 $(printf '%s' "$untracked_links" | sed '/^$/d' | wc -l | tr -d ' ') 处链接指向未被 git 跟踪的文件（本地存在，push 后会 404）："
      printf '%s' "$untracked_links" | sed '/^$/d' | sed 's/^/      /'
    fi
  fi
fi

# 2.7 ISSUE_TEMPLATE 存在（可选）
step "2.7 检查 Issue 模板（可选）"
if [ -f ".github/ISSUE_TEMPLATE/bug_report.md" ] && [ -f ".github/ISSUE_TEMPLATE/feature_request.md" ]; then
  pass "Issue 模板完整（bug_report + feature_request）"
else
  warn "Issue 模板不完整或不存在（可选，但推荐）"
fi

# 2.8 README 包含项目关键信息
step "2.8 检查 README 关键信息"
readme_ok=0
[ -f README.md ] && {
  grep -q "xiaosong8584" README.md 2>/dev/null && readme_ok=$((readme_ok+1))
  grep -qi "desktop pet" README.md 2>/dev/null && readme_ok=$((readme_ok+1))
  grep -q "MIT" README.md 2>/dev/null && readme_ok=$((readme_ok+1))
  grep -q "github.com" README.md 2>/dev/null && readme_ok=$((readme_ok+1))
}
if [ $readme_ok -ge 3 ]; then
  pass "README.md 包含项目关键信息（$readme_ok/4 项）"
else
  warn "README.md 可能缺少关键信息（$readme_ok/4 项）"
fi

# ============================================================
# Part 3: 发布新版本 — 项目文件检查与必须步骤
# ============================================================
section "Part 3: 发布新版本（项目文件检查 + 必须步骤）"

# 3.1 依赖与 lock 文件一致性（只读校验）
step "3.1 校验依赖与 lock 文件一致性（只读，不改动 node_modules）"
# 设计说明：旧实现在「检查脚本」里直接跑 `npm ci`，它会先把整个 node_modules 删掉再重装。
# 对只读检查而言副作用过重：耗时、离线必失败，且失败后会留下残缺的 node_modules 把本地
# 开发环境搞坏。改用 `npm ci --dry-run` —— 同样验证 package.json 与 lock 是否同步，
# 但只解析不落盘。（已实测：node_modules 条目数与 mtime 均不变）
if [ ! -d node_modules ]; then
  warn "node_modules 不存在，请先执行 npm ci 安装依赖后再跑本检查"
elif ! command -v npm >/dev/null 2>&1; then
  warn "npm 不可用，跳过依赖一致性校验"
else
  ci_out=$(npm ci --dry-run 2>&1)
  ci_exit=$?
  if [ $ci_exit -eq 0 ]; then
    pass "package.json 与 package-lock.json 已同步（npm ci --dry-run 通过）"
  else
    fail "lock 文件与 package.json 不同步（先本地 npm install 修复并提交 lock）："
    printf '%s\n' "$ci_out" | grep -iE "error|sync|invalid" | head -5 | sed 's/^/      /'
  fi

  # 顺带确认本地已装依赖树与 lock 一致（缺失 / 无效 / 多余）
  ls_out=$(npm ls --depth=0 2>&1)
  if printf '%s\n' "$ls_out" | grep -qE "missing|invalid|extraneous"; then
    warn "本地 node_modules 与 lock 文件存在差异（不影响发布，建议 npm install 对齐）："
    printf '%s\n' "$ls_out" | grep -E "missing|invalid|extraneous" | head -5 | sed 's/^/      /'
  else
    pass "本地 node_modules 与 lock 文件一致"
  fi
fi

# 3.2 npm audit
step "3.2 执行 npm audit（0 漏洞）"
audit_output=$(npm audit --silent 2>&1)
audit_exit=$?
if [ $audit_exit -eq 0 ] && echo "$audit_output" | grep -q "found 0 vulnerabilities"; then
  pass "npm audit 通过（0 vulnerabilities）"
else
  if echo "$audit_output" | grep -qE "vulnerabilit"; then
    fail "npm audit 发现漏洞："
    echo "$audit_output" | grep -E "vulnerabilit|Severity" | sed 's/^/      /'
  else
    warn "npm audit 返回非 0，但无明确漏洞信息（可能需要检查网络）"
  fi
fi

# 3.3 构建
step "3.3 执行 npm run build（TypeScript 类型检查 + 生产构建）"
if npm run build 2>&1 | tail -5; then
  pass "构建成功"
else
  fail "构建失败"
fi

# 3.4 构建产物检查
step "3.4 检查构建产物"
build_ok=0
for artifact in main.js styles.css manifest.json; do
  if [ -f "$artifact" ]; then
    size=$(stat -c%s "$artifact" 2>/dev/null || stat -f%z "$artifact" 2>/dev/null)
    if [ "$size" -gt 0 ]; then
      build_ok=$((build_ok+1))
      info "$artifact ($(numfmt --to=iec $size 2>/dev/null || echo "$size bytes"))"
    else
      fail "$artifact 为空"
    fi
  else
    fail "$artifact 缺失"
  fi
done
[ $build_ok -eq 3 ] && pass "所有构建产物就绪"

# 3.5 main.js 大小合理性
step "3.5 检查 main.js 大小合理性"
if [ -f main.js ]; then
  main_size=$(stat -c%s main.js 2>/dev/null || stat -f%z main.js 2>/dev/null)
  if [ "$main_size" -gt 100000 ] && [ "$main_size" -lt 2000000 ]; then
    pass "main.js 大小合理（$(numfmt --to=iec $main_size 2>/dev/null || echo "$main_size bytes")）"
  elif [ "$main_size" -le 100000 ]; then
    warn "main.js 偏小（$(numfmt --to=iec $main_size 2>/dev/null || echo "$main_size bytes")），可能构建不完整"
  else
    warn "main.js 偏大（$(numfmt --to=iec $main_size 2>/dev/null || echo "$main_size bytes")），检查是否包含多余代码"
  fi
fi

# 3.6 打包测试（验证 zip 命令可用）
step "3.6 测试 zip 打包（模拟 release.yml）"
# 设计说明（MSYS 路径坑，2026-09-11 修正；上一版修法有误，已重写）：
#   背景：zip.exe 是【原生 Windows 程序】，不认 MSYS 风格的 /tmp/x.zip —— 它会把它
#   解释成「当前盘根的 \tmp\」（例如 I:\tmp\x.zip），而 stat / rm 是 MSYS 内置，
#   操作的是 MSYS 自己的临时目录（cygpath -w /tmp → C:\Users\…\AppData\Local\Temp）。
#   两者不是同一个文件，原实现因此：
#     · stat 取不到大小 → 报「测试包大小：」（空）
#     · rm -f 删不掉真实文件 → 每次运行都留一份 130KB+ 残留
#
#   上一版修法只把【zip 的入参】换成 cygpath 后的 Windows 路径，但 stat / rm 仍在用
#   MSYS 路径 → 依然读不到大小、删不掉文件（只是把残留从盘根 \tmp\ 挪到了系统临时目录）。
#
#   本版修法：全程只用【一个】已解析的 Windows 路径（交给原生 zip.exe），
#   再把它转回 MSYS 路径供 stat / rm 使用，确保三者指向同一文件。
#   这样做还有个好处：即使脚本在纯 MSYS 环境运行，路径也落在系统临时目录（远离仓库）。
zip_dir="${TMPDIR:-/tmp}"
tmp_zip_win=""
tmp_zip_check=""
tmp_zip_name=""

if command -v cygpath >/dev/null 2>&1; then
  # zip_dir 在 MSYS 下形如 /tmp；转成 Windows 路径交给原生 zip.exe
  tmp_zip_win="$(cygpath -w "$zip_dir" 2>/dev/null)/obsidian-desktoppet-test.zip"
  # 再转回 MSYS 路径（供 stat / rm 使用），保证与 tmp_zip_win 指向同一文件
  tmp_zip_check="$(cygpath -u "$tmp_zip_win" 2>/dev/null)"
else
  tmp_zip_win="${zip_dir%/}/obsidian-desktoppet-test.zip"
  tmp_zip_check="$tmp_zip_win"
fi

if command -v zip >/dev/null 2>&1; then
  cd "$(git rev-parse --show-toplevel)"
  # 先清掉可能存在的同名旧文件，避免 stat 读到上一次的陈旧大小
  rm -f "$tmp_zip_check" "$tmp_zip_win" 2>/dev/null
  if zip -r "$tmp_zip_win" main.js styles.css manifest.json >/dev/null 2>&1; then
    test_zip_size=$(stat -c%s "$tmp_zip_check" 2>/dev/null || stat -f%z "$tmp_zip_check" 2>/dev/null)
    rm -f "$tmp_zip_check" "$tmp_zip_win" 2>/dev/null
    if [ -n "$test_zip_size" ]; then
      pass "zip 打包成功（测试包大小：$(numfmt --to=iec "$test_zip_size" 2>/dev/null || echo "$test_zip_size bytes")）"
    else
      warn "zip 打包成功，但未能读取测试包大小（路径：$tmp_zip_win）"
    fi
  else
    rm -f "$tmp_zip_check" "$tmp_zip_win" 2>/dev/null
    fail "zip 打包失败"
  fi
else
  warn "zip 命令不可用（release.yml 将失败），建议安装 zip"
fi

# 3.7 Git 工作树状态
step "3.7 检查 Git 工作树状态"
if [ -z "$(git status --porcelain 2>/dev/null)" ]; then
  pass "工作树干净（无未提交更改）"
else
  warn "有未提交的更改："
  git status --short 2>/dev/null | sed 's/^/      /'
fi

# 3.8 当前分支
step "3.8 检查当前分支"
current_branch=$(git branch --show-current 2>/dev/null)
if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
  pass "当前在 $current_branch 分支"
else
  warn "当前在 $current_branch 分支（发布前建议切回 main）"
fi

# 3.9 与远程同步状态
step "3.9 检查与远程同步状态"
if git rev-parse --verify origin/$current_branch >/dev/null 2>&1; then
  ahead=$(git rev-list --count origin/$current_branch..HEAD 2>/dev/null || echo "0")
  behind=$(git rev-list --count HEAD..origin/$current_branch 2>/dev/null || echo "0")
  info "领先 origin/$current_branch: $ahead commits"
  info "落后 origin/$current_branch: $behind commits"
  if [ "$behind" -gt 0 ]; then
    warn "落后远程 $behind commits，建议先 pull"
  elif [ "$ahead" -gt 0 ]; then
    info "准备推送 $ahead commits"
  else
    pass "与远程完全同步"
  fi
else
  info "origin/$current_branch 不存在（首次推送或新分支）"
fi

# 3.10 检查 tag 状态
step "3.10 检查 tag 状态"
last_tag=$(git describe --tags --abbrev=0 2>/dev/null)
if [ -n "$last_tag" ]; then
  commits_since_tag=$(git rev-list --count "$last_tag..HEAD" 2>/dev/null || echo "0")
  info "最后一个 tag：$last_tag（之后 $commits_since_tag 个 commits）"
else
  info "尚未打 tag（首次发布）"
fi

# ============================================================
# 总结
# ============================================================
section "检查完成"

echo -e "  ${GREEN}✓ 通过：$PASS${RESET}"
[ $FAIL -gt 0 ] && echo -e "  ${RED}✗ 失败：$FAIL${RESET}"
[ $WARN -gt 0 ] && echo -e "  ${YELLOW}! 警告：$WARN${RESET}"

echo ""
if [ $FAIL -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}✅ 所有关键检查通过，可以 push / release${RESET}"
  exit 0
else
  echo -e "  ${RED}${BOLD}❌ 有 $FAIL 个失败项，建议修复后再 push${RESET}"
  exit 1
fi
