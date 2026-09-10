# Desktop Pet for Obsidian

> **Project**: <https://github.com/xiaosong8584/obsidian-desktoppet>

![license](https://img.shields.io/badge/license-MIT-blue.svg)
![version](https://img.shields.io/badge/version-1.0.0-brightgreen.svg)
![obsidian](https://img.shields.io/badge/Obsidian-1.0+-blueviolet.svg)
![three.js](https://img.shields.io/badge/three.js-0.160-orange.svg)

A cute **3D cartoon robot** desktop pet floating inside your Obsidian window.
Built with parametric geometry (Sphere / Cylinder / Capsule / Torus), **zero external assets**, install and play.

---

## ✨ Features

- 🎨 **3D Cartoon Robot** — Rounded head + dot eyes (with highlights) + antenna + chest core + blush, all parametric, no external assets
- 🖱️ **Drag & Click** — Mouse drag to reposition; click triggers scale pulse + happy eyes + speech bubble
- 💤 **Idle Animations** — Breathing float, gentle sway, random blinks (2.5–6s), arm swing, antenna wiggle
- 🎭 **5 Color Schemes** — Soft Blue, Mint, Coral Pink, Lavender, Warm Orange
- 📏 **Size Slider** — 0.5x to 2.0x
- 🌗 **Theme Aware** — Bubble & shadow use Obsidian CSS variables, auto-follow theme
- 🎚️ **Status Bar Toggle** — One-click show/hide, also via `Ctrl+Shift+P` command palette
- 🔌 **Fully Transparent** — Doesn't block Obsidian content (outer `pointer-events: none`, only pet is interactive)
- ♻️ **Full Lifecycle** — `onunload` releases renderer / geometry / material / rAF / listeners

## 📸 Screenshots

*(Screenshot placeholder: pet idle state, click feedback, drag state, settings panel)*

## ⚙️ Development Setup

1. **Install Node.js 18+** (20 LTS recommended)
2. **Clone or open the project**:
   ```bash
   cd I:\Users\Snoopy\desktoppet
   npm install
   ```
3. **Build commands**:
   ```bash
   npm run dev          # watch mode, auto-rebuild on save
   npm run build        # production build, outputs main.js
   npm run build:dev    # production build (alias for dev but produces main.js)
   ```

## 📦 Install to Obsidian

1. Run `npm run build` to generate `main.js`
2. Open Obsidian → Settings → Third-party plugins → Disable Restricted Mode
3. Copy this directory **entirely** to `.obsidian/plugins/desktoppet/`:
   ```
   <your-vault>/.obsidian/plugins/desktoppet/
     ├── main.js
     ├── main.ts
     ├── manifest.json
     ├── styles.css
     └── ... (other source files optional)
   ```
4. Restart Obsidian (or refresh the plugin list)
5. Search "Desktop Pet" in the plugin list and enable

## 🎮 Usage

- **Command palette** — `Ctrl+Shift+P` → search "Show/Hide Pet"
- **Status bar** — Robot icon in the bottom-right corner, click to toggle
- **Drag** — Mouse down on the pet → drag to any position
- **Click** — Click the pet body → scale pulse + happy eyes + speech bubble
- **Settings** — Settings → Community plugins → Desktop Pet
  - Visibility toggle
  - Pet size (0.5x – 2.0x)
  - Primary color (5 soft schemes)
  - Position X / Y (pixels)
  - Reset to default

## 🗂️ Project Structure

```
desktoppet/
├── main.ts              # Plugin entry (Plugin class + lifecycle + commands + status bar)
├── pet/
│   ├── PetScene.ts      # Three.js scene (renderer / scene / camera / lights / rAF loop)
│   ├── PetModel.ts      # Parametric 3D robot model (geometry composition)
│   ├── PetAnimator.ts   # Animation controller (idle / blink / click / drag tilt)
│   └── PetInteraction.ts # Interaction layer (mouse drag + click + listeners)
├── settings/
│   └── SettingsTab.ts   # Settings panel + DEFAULT_SETTINGS
├── styles.css           # Floating container / bubble / status bar styles (theme aware)
├── manifest.json        # Obsidian plugin manifest
├── package.json         # npm dependencies
├── tsconfig.json        # TypeScript config
├── esbuild.config.mjs   # Build script
└── README.md            # This file
```

## 🛠️ Tech Stack

- **Language** — TypeScript (strict mode, no `any`)
- **3D Rendering** — Three.js `0.160.x`
- **Build** — esbuild + Obsidian standard plugin template
- **Dependencies** — Only `three` at runtime; everything else is dev-only

## 🔍 Key Implementation Details

### Primary Color Replacement

`PetScene.applyColor()` walks all `MeshStandardMaterial` in the model and treats any material that isn't white (`0xffffff`), dark (`0x2c3e50`), or blush (`0xff9fb0`) as "primary". It swaps those to the target color in one pass — keeps the model structure intact while supporting live color switching.

### Click Pulse + External Scale Composition

External scale (from settings) and click pulse must coexist. Approach:
- Store external scale at `group.userData.baseScale`
- Per frame: `group.scale = baseScale * (1 + 0.3 * sin(π * t))`
- When not clicked: `scale = baseScale`

### Speed-Aware Drag Tilt

During drag, compute a tilt target from the X velocity (`-0.3 ~ +0.3` rad), then smooth it with a first-order low-pass filter:

```ts
tiltCurrent += (tiltTarget - tiltCurrent) * Math.min(1, delta * 8);
```

### Transparent Background

- `WebGLRenderer({ alpha: true })` + `setClearColor(0x000000, 0)`
- CSS container `pointer-events: none`, only inner canvas `pointer-events: auto`
- Outer layer doesn't block Obsidian content interaction

## ⚠️ Known Limitations

- No touch-drag support yet (desktop-first; touch can be added later)
- Primary color replacement uses a heuristic ("non-white, non-dark, non-blush = primary"); adding new auxiliary colors requires updating the check
- Speech bubble appears at the top of the container; may be clipped if the pet is near the window top edge
- No hover effect yet (could add slight scale + highlight boost)

## 🚀 Future Directions

- Hover effects
- Multiple robot shapes (sphere / block / humanoid)
- Emotion system (fall asleep after idle)
- Custom keyboard shortcuts
- Touch / multi-touch support
- More phrases, multi-language
- Obsidian note integration (e.g. open new note on click, show last-modified time)

## 📄 License

MIT © xiaosong8584
