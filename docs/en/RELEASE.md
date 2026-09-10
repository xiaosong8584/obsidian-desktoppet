# Release Guide

> **Scope**: Publishing the Desktop Pet for Obsidian plugin
>
> Chinese version: [`docs/zh-cn/RELEASE.md`](../zh-cn/RELEASE.md). Keep both in sync.

---

## Quick Start

For a standard release, just remember these three steps:

```bash
# 1. Run pre-publish checks (make sure everything is good)
bash check_before_publish.sh

# 2. Update version numbers + CHANGELOG (see detailed steps below)
# ... edit manifest.json / package.json / CHANGELOG.md ...

# 3. Tag and push (triggers release.yml)
git tag v1.0.0
git push origin v1.0.0
```

---

## Complete Release Process

### Step 1: Run Pre-Publish Checks

```bash
bash check_before_publish.sh
```

The script runs **26 checks** across three parts:

- **Part 1 — Open Source Essentials** (required files, JSON validity, version sync, manifest fields, no console.log, no hardcoded secrets, .gitignore, LICENSE)
- **Part 2 — GitHub Automation Files** (workflow existence, action versions, build.yml / release.yml config, docs structure, Markdown dead-link & git-tracking validation, README info)
- **Part 3 — Build & Git Status** (lock-file consistency, npm audit, npm run build, build artifacts, main.js size, zip packaging, working tree, branch, sync status, tag status)

> **The script is read-only.** It never runs a command that rewrites the working tree or `node_modules` — dependency/lock consistency is verified with `npm ci --dry-run`, which only resolves the tree without installing it.

**Only proceed with the release when all critical checks pass (exit code 0).**

---

### Step 2: Update Version Numbers

The version number must appear in **three places** and must be consistent:

#### 2.1 manifest.json (read by Obsidian, the authoritative source)

```json
{
  "version": "1.1.0"
}
```

#### 2.2 package.json (npm package version, keep in sync with manifest)

```json
{
  "version": "1.1.0"
}
```

#### 2.3 CHANGELOG.md (move [Unreleased] content under the new version)

```markdown
## [1.1.0] - 2026-09-10

### Added
- New feature A
- New feature B

---

## [Unreleased]

(Record changes for the next version here)
```

> **Tip**: `check_before_publish.sh` automatically verifies that manifest.json / package.json / CHANGELOG.md all have the same version. Keep `## [Unreleased]` at the top of the changelog (Keep a Changelog convention) — the checker reads the first versioned `## [x.y.z]` heading, so an `[Unreleased]` section above it is fine.

---

### Step 3: Commit Changes

```bash
# Check all changes
git status

# Add all changes
git add .

# Commit (use Conventional Commits format)
git commit -m "chore: release v1.1.0"

# Push to main branch
git push origin main
```

> **Note**: `git push origin main` triggers `build.yml` (build verification). Confirm it passes before tagging.

---

### Step 4: Tag and Push (Triggers release.yml)

```bash
# Create tag (version matches manifest.json)
git tag v1.1.0

# Push tag to remote
git push origin v1.1.0
```

After pushing the tag, GitHub Actions' `release.yml` automatically triggers and performs:

1. Checkout code
2. `npm ci` to install dependencies
3. `npm run build` for production build
4. Package `obsidian-desktoppet.zip` (contains main.js / styles.css / manifest.json)
5. Create GitHub Release with 4 files:
   - `main.js`
   - `styles.css`
   - `manifest.json`
   - `obsidian-desktoppet.zip`
6. Auto-generate Release Notes

> Note the difference: the **workflow** intentionally uses `npm ci` (a real, clean install — that is correct in CI). The **local check script** deliberately does not.

---

### Step 5: Verify Release

#### 5.1 Check GitHub Actions

Open your GitHub repo → Actions tab:

| Workflow | Trigger | Expected |
|---|---|---|
| `build.yml` | push main / PR | ✅ Green check (build passed) |
| `release.yml` | push tag `v*` | ✅ Green check (release succeeded) |

#### 5.2 Check GitHub Releases

Open your GitHub repo → Releases tab:

- Confirm the new version (e.g. `v1.1.0`) was created
- Confirm it contains 4 files: `main.js` / `styles.css` / `manifest.json` / `obsidian-desktoppet.zip`
- Confirm Release Notes were auto-generated (based on commit messages)

#### 5.3 Local Verification (Optional)

```bash
# Download the release artifacts, then unpack into a scratch directory
# (use a real absolute path — on Windows/Git Bash, native tools may not
# understand MSYS-style /tmp paths)
unzip obsidian-desktoppet.zip -d "$HOME/desktoppet-test"

# Copy into a test vault
cp -r "$HOME/desktoppet-test" "<your-vault>/.obsidian/plugins/desktoppet/"
```

---

## Versioning Rules

Follow [Semantic Versioning](https://semver.org/):

| Scenario | Version Rule | Example |
|---|---|---|
| New feature, backward compatible | **minor** | 1.0.0 → 1.1.0 |
| Bug fix, no feature changes | **patch** | 1.0.0 → 1.0.1 |
| Breaking change | **major** | 1.0.0 → 2.0.0 |

### What Counts as a "Breaking Change"?

- Settings names or structure changes (users need to reconfigure)
- API changes (code interfaces other plugins depend on)
- Removal of existing features
- Default behavior changes (e.g. default position moves from top-left to bottom-right)

### What Doesn't Count as a "Breaking Change"?

- Bug fixes
- New optional settings (with defaults)
- Performance improvements
- Documentation improvements

---

## Special Scenarios

### Scenario 1: Emergency Fix (Hotfix)

When a released version has a critical bug that needs urgent fixing:

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/fix-critical-bug

# 2. Fix + test
# ... fix code ...
npm run build

# 3. Update patch version (e.g. 1.0.0 → 1.0.1)
# ... edit manifest.json / package.json / CHANGELOG.md ...

# 4. Commit and push
git add .
git commit -m "fix: critical bug fix"
git push origin main

# 5. Tag
git tag v1.0.1
git push origin v1.0.1
```

### Scenario 2: Prerelease

If you want to test before the official release:

```bash
# Create a prerelease tag (with -rc suffix)
git tag v1.1.0-rc.1
git push origin v1.1.0-rc.1

# Mark as Pre-release on the GitHub Release page
```

> **Note**: `release.yml` matches all `v*` tags, including prereleases.
>
> The version check **strips the prerelease suffix and compares the base version**: `v1.1.0-rc.1` → base version `1.1.0`, which passes as long as `manifest.json` is `1.1.0`. In other words — **when releasing a prerelease, set `manifest.json` / `package.json` to the base version (e.g. `1.1.0`), not `1.1.0-rc.1`**, otherwise the check fails and the Release is rejected.
>
> If you also want GitHub to tick "Pre-release" automatically, add a `prerelease: true` condition to `release.yml` (not implemented yet).

### Scenario 3: Rollback Release

If you need to withdraw a published version:

```bash
# Method 1: Delete the GitHub Release (recommended)
# Click Delete on the GitHub Releases page

# Method 2: Delete the tag (local + remote)
git tag -d v1.1.0
git push origin :refs/tags/v1.1.0

# Method 3: Mark as deprecated (not recommended, release is still visible)
# Manually mark on the GitHub Release page
```

> **Warning**: After deleting a tag, users who already downloaded that version won't auto-update. It's better to fix the issue in the next version.

---

## FAQ

### Q: check_before_publish.sh has warnings (!), can I still release?

Warnings don't block the release, but review them first. The script prints its messages in Chinese; the common ones mean:

- `有未提交的更改：` (uncommitted changes) → Confirm whether these changes should be committed; if not, use `git stash`
- `当前在 xxx 分支（发布前建议切回 main）` (currently on branch xxx, not main) → If not on main, switch back to main before releasing
- `落后远程 N commits，建议先 pull` (N commits behind the remote) → Run `git pull` first
- `CHANGELOG.md 未找到版本号` (no version heading found) → Confirm CHANGELOG.md contains a `## [x.y.z]` heading

### Q: What to do if npm audit has vulnerabilities?

**Don't release with vulnerabilities.** Fix them first:

```bash
# View vulnerability details
npm audit

# Try auto-fix
npm audit fix

# If auto-fix fails, manually check the dependency
npm ls <vulnerable-package>
```

### Q: What to do if npm run build fails?

Common causes:

1. **TypeScript type errors** → Check the error message, fix the type issue
2. **Missing dependency** → `npm install <package>` or `npm install --save-dev <package>`
3. **Outdated lock file** → When `npm ci --dry-run` reports a mismatch, run `npm install` to refresh `package-lock.json`, then commit it

### Q: What to do if release.yml fails?

Common causes:

1. **zip command unavailable** → Check GitHub Actions logs; ubuntu-latest should have zip built in
2. **Missing files** → Confirm `main.js` / `styles.css` / `manifest.json` are generated
3. **Permission issues** → Confirm release.yml has `permissions: contents: write`

### Q: How to create a Release manually (without GitHub Actions)?

```bash
# 1. Build
npm run build

# 2. Package
zip -r obsidian-desktoppet.zip main.js styles.css manifest.json

# 3. Open the GitHub Release page to create manually
# https://github.com/xiaosong8584/obsidian-desktoppet/releases/new
```

### Q: How do Obsidian users get the release?

Two installation methods:

1. **Community plugin browser** (if published to the Obsidian community plugin marketplace)
2. **Manual install** → Download `obsidian-desktoppet.zip` from GitHub Releases, extract to:
   ```
   <your-vault>/.obsidian/plugins/desktoppet/
   ```

---

## Related Documentation

| Document | Path | Description |
|---|---|---|
| Pre-publish check script | `check_before_publish.sh` | Automated 26 checks (read-only) |
| Build workflow | `.github/workflows/build.yml` | Auto build verification on push/PR |
| Release workflow | `.github/workflows/release.yml` | Auto release on tag push |
| Version changelog | `CHANGELOG.md` | Change records for all versions |
| User Guide (Chinese) | `docs/zh-cn/UserGuide.md` | How users install and use |
| User Guide (English) | `docs/en/UserGuide.md` | English User Guide |
| Release Guide (Chinese) | `docs/zh-cn/RELEASE.md` | 发布指南（中文） |
