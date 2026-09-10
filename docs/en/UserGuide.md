# Desktop Pet for Obsidian — User Guide

> **TL;DR**: A cute 3D cartoon robot floats inside your Obsidian window. Draggable, clickable, blinks, and pops up speech bubbles.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Usage Guide](#usage-guide)
- [Settings Reference](#settings-reference)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Contributing & Feedback](#contributing--feedback)
- [License](#license)

---

## Project Overview

**Desktop Pet for Obsidian** is a community plugin that places a cute **3D cartoon robot** inside your note-taking editor.

- Floats anywhere inside the Obsidian window with a **fully transparent background** — never blocks your notes
- **Zero external assets**: the robot is generated procedurally from code (Sphere / Cylinder / Capsule / Torus geometry combinations) — no images or model files to download
- **Fully open source**: MIT license, free to modify and redistribute

### Design Principles

- **Minimalist**: at most 2 primary colors, soft palette, never overpowers your content
- **Non-intrusive**: outer container uses `pointer-events: none`; only the pet body is interactive, everything else lets pointer events pass through
- **Effortless**: install and use immediately — no manual model, texture, or animation file configuration

---

## Features

| Feature | Description |
|---|---|
| 🎨 **3D Cartoon Robot** | Rounded head + dot eyes (with highlights) + antenna + chest core + blush, 25 procedurally generated geometry pieces |
| 🖱️ **Drag & Click** | Drag to reposition; click to trigger a scale pulse + happy squint + speech bubble with a random line |
| 💤 **Idle Animation** | Breathing float, side sway, blinking (random 2.5~6s), arm sway, antenna wiggle |
| 🎭 **5 Color Themes** | Soft Blue, Mint Green, Coral Pink, Lavender, Warm Orange — one-click switch |
| 📏 **Size Adjustment** | 0.5x ~ 2.0x slider with live preview |
| 🌗 **Light/Dark Theme** | Speech bubble & shadow use Obsidian CSS variables, auto-adapt to theme |
| 🎚️ **Status Bar Icon** | One-click show/hide from the bottom-right status bar, or use the Command Palette |
| 🔌 **Fully Transparent Background** | Outer container `pointer-events: none`; never blocks Obsidian content |
| ♻️ **Full Lifecycle Management** | Releases renderer / geometry / material / rAF / events on unload — no memory leaks |
| 💬 **10 Random Phrases** | Chinese one-liners such as "你好~" (Hi~) and "想我了吗?" (Missed me?) — triggered on click |

---

## System Requirements

### Hardware

| Component | Minimum | Recommended |
|---|---|---|
| **CPU** | Any modern CPU with WebGL 2.0 support | Intel Core i3+ / AMD Ryzen 3+ |
| **GPU** | OpenGL 3.2+ or WebGL 2.0 | Integrated GPU is fine (Intel UHD 630+ / AMD Vega 8+ / NVIDIA GTX 1050+) |
| **RAM** | 4 GB | 8 GB+ |
| **Disk** | 5 MB (plugin only) | — |
| **Screen** | Any resolution | 1366x768+ |

> **Note**: The pet uses Three.js to render WebGL inside Obsidian (Electron-based). Hardware requirements are extremely low — virtually any computer bought in the last 5 years can run it smoothly.

### Software

| Software | Version |
|---|---|
| **OS** | Windows 10+ / macOS 11+ / Ubuntu 20.04+ (Linux requires Electron ≥ 20) |
| **Obsidian** | 1.0.0+ (latest recommended) |
| **GPU Drivers** | System drivers are fine (keep updated) |

---

## Installation

### Option 1: Build from Source (Recommended for developers)

If you already have Node.js installed, you can clone and build from GitHub:

```bash
# 1. Clone the repo
git clone https://github.com/xiaosong8584/obsidian-desktoppet.git
cd desktoppet

# 2. Install dependencies and build
npm install
npm run build

# 3. Copy artifacts to your Obsidian vault
#    (Windows example; adjust path for other OS)
copy . C:\Users\YOUR_USERNAME\AppData\Roaming\Obsidian\<your-vault>\.obsidian\plugins\desktoppet\
```

### Option 2: Manual Copy (Simplest)

If you already have the built `main.js` / `styles.css` / `manifest.json`:

1. **Open Obsidian Settings** → Third-party plugins → **Disable Restricted Mode** (toggle on "Community plugins")
2. **Open your vault directory** (Settings → About → Current Vault location)
3. **Create the plugin directory**:
   ```
   <your-vault>/.obsidian/plugins/desktoppet/
     ├── main.js          # required (build artifact)
     ├── manifest.json    # required
     └── styles.css       # required
   ```
4. **Restart Obsidian** (or Settings → Third-party plugins → Reload)
5. **Search for "Desktop Pet"** in the plugin list and click Enable

> **Tip**: Source `.ts` files don't need to be placed in the plugin directory — only the build artifacts (`.js`, `.json`, `.css`) are required.

### Option 3: Community Plugin Browser (Future)

Once the project is published to the Obsidian community plugin marketplace, you'll be able to install it directly inside Obsidian. Not yet available — use Option 1 or 2 for now.

---

## Usage Guide

### Enabling the Plugin

1. Obsidian Settings → Third-party plugins → find **Desktop Pet** → toggle on
2. Once enabled, a 3D cartoon robot appears in the **top-left corner** of your window immediately
3. If you don't see it, the "show" toggle might be off by default — enable it in the settings panel

### Dragging the Pet

- **Hold** on the pet body (left mouse button or finger; don't press on empty space)
- **Drag to any position** — the pet stays where you release
- During dragging, the pet **tilts slightly** (following pointer velocity) and straightens when released

> **Tip**: A drag distance < 5px is treated as a "click" rather than a "drag".

### Clicking the Pet

- **Single click** on the pet body triggers:
  1. A **pulse** (scale 1.0 → 1.3 → 1.0, ~400ms)
  2. **Eyes become crescent-shaped** (happy squint)
  3. A **speech bubble** appears above the head with a random phrase (10 options)

The bubble auto-dismisses after 2.2 seconds.

### Toggling Visibility

Three ways — pick any:

1. **Status bar**: a small robot icon in the bottom-right corner of Obsidian — click to toggle
2. **Command Palette**: `Ctrl+P` (Mac: `Cmd+P`) → search `Show/Hide Pet`
3. **Settings panel**: Settings → Community plugins → Desktop Pet → "Enabled" toggle

### Adjusting Pet Position (Without Dragging)

Settings panel → Desktop Pet:

- **Position X**: pixels from the window's left edge to the pet's top-left corner
- **Position Y**: pixels from the window's top edge to the pet's top-left corner

Default: `(20, 200)` (left side, upper area).

---

## Settings Reference

Open **Settings → Community plugins → Desktop Pet**:

### Basic Toggle

| Setting | Type | Description |
|---|---|---|
| **Enabled** | Toggle | Whether the pet is shown. When off, the pet is fully hidden and the render loop is paused (no GPU usage) |

### Appearance

| Setting | Type | Range | Description |
|---|---|---|---|
| **Pet Size** | Slider | 0.5x ~ 2.0x | Overall scale. Default 1.0x (180x180px) |
| **Primary Color** | Dropdown | 5 presets | Robot body color. Eyes, blush, and dark details remain unchanged |

**5 preset primary colors**:

| Name | Color | Hex |
|---|---|---|
| Soft Blue | 🔵 | `#4A90D9` |
| Mint Green | 🟢 | `#4ECDC4` |
| Coral Pink | 🩷 | `#F28B82` |
| Lavender | 🟣 | `#9B8CE5` |
| Warm Orange | 🟠 | `#F2B263` |

### Position

| Setting | Type | Description |
|---|---|---|
| **Position X** | Number | Pixels from the window's left edge. Values outside the window are clamped back into view |
| **Position Y** | Number | Pixels from the window's top edge. Values outside the window are clamped back into view |

### Reset to Defaults

Click **Reset to Defaults** to restore all settings:

- Show: Enabled
- Size: 1.0x
- Color: Soft Blue
- Position: (20, 200)

---

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Show / Hide Pet | `Ctrl+P` → search `Show/Hide Pet` |
| Open Settings | `Ctrl+,` → search `Desktop Pet` |
| Toggle Plugin | Click the small robot icon in the status bar |

> **Note**: The project doesn't bind a direct shortcut (like `Ctrl+D`) to avoid conflicts with other plugins. To customize, go to Obsidian's **Hotkeys** settings and search `Show/Hide Pet`.

---

## FAQ

### Q1: I enabled the plugin but don't see the pet?

**Troubleshooting steps**:

1. Settings → Desktop Pet → is the **Enabled** toggle on?
2. Are you in **Reading View / Full-screen mode**? The pet may not show in reader tabs — switch back to edit mode
3. Is the position pinned against a window edge? It is clamped into view automatically, so it shouldn't end up off-screen — click **Reset to Defaults** in the settings panel to restore it
4. Open Obsidian's dev tools (`Ctrl+Shift+I`) and check the Console for red errors

### Q2: The pet blocks my content?

- **Shrink**: Settings → Pet Size → drag to 0.5x
- **Move it**: Just drag the pet to a non-blocking position
- **Hide it**: Status bar icon or `Ctrl+P` → `Show/Hide Pet`

### Q3: The pet doesn't follow the pointer accurately when dragging?

While dragging the button must **stay held** (left mouse button down, or finger on the screen). If you release and press again, it becomes a "click" instead of "continuing to drag". Drag distance < 5px is treated as a click.

### Q4: The speech bubble is cut off at the top of the window?

The bubble displays above the pet container. If the pet's Position Y is too small (e.g. 0), the bubble gets clipped. Set Position Y to 100+.

### Q5: The pet doesn't change color after switching the primary color?

Color replacement only touches the materials the model has **tagged as primary** (`material.userData.isPrimary`); the white shell, dark details and blush are never affected. Switching the dropdown takes effect **immediately** — no plugin reload needed.

If nothing happens, you probably edited the pet code without rebuilding — run `npm run build` again and reload the plugin.

### Q6: The pet looks weird after switching light/dark theme?

Theme switching affects:

- Speech bubble background (`--background-secondary` CSS variable)
- Shadow color (`--background-modifier-border`)
- The pet body color **does not** change with theme (controlled by primary color)

If the pet body looks "jarring" after a theme switch, try a more neutral primary color (e.g. Soft Blue, Lavender).

### Q7: The plugin conflicts with some themes?

The pet uses an **independent DOM layer** (attached to `document.body`), unaffected by theme CSS. If there's still a conflict:

1. Disable your custom theme
2. Check if another plugin modifies the `body` z-index
3. File an Issue with reproduction steps

### Q8: Can I make the pet show a different character?

Currently only one robot model exists (procedural geometry combination). **Future expansion directions** include multiple robot shapes (sphere / cube / humanoid). To modify the code:

- Edit the `createPetModel()` function in `pet/PetModel.ts`
- Keep the `PetModelParts` interface unchanged (must expose `group`, `head`, `body`, `leftArm`, `rightArm`, `leftEye`, `rightEye`, `leftPupil`, `rightPupil`, `antennaTip`)
- Rebuild with `npm run build`

### Q9: Can I customize the speech phrases?

Yes. Phrases are hardcoded in the `PHRASES` field of the `PetAnimator` class in `pet/PetAnimator.ts` (`private static readonly`). They are currently **Chinese only**:

```typescript
private static readonly PHRASES: readonly string[] = [
  '你好~',               // Hi~
  '嗨!',                 // Hello!
  '今天也要加油哦~',       // Keep going today~
  '嘿嘿，被你发现啦~',     // Hehe, you found me~
  '我在呢~',              // I'm here~
  '想我了吗?',            // Missed me?
  '陪我玩一会儿嘛~',       // Play with me for a while~
  '✨ 有灵感了吗?',        // ✨ Got any inspiration?
  '休息一下眼睛吧~',       // Give your eyes a rest~
  '继续写下去，我陪你~'    // Keep writing, I'll stay with you~
];
```

Edit the array directly, add your phrases, and rebuild. To localize the pet, simply replace the strings.

### Q10: Why isn't my pet blinking?

Blinking is random, every 2.5~6 seconds. If it never blinks:

1. Is Obsidian in the foreground? (rAF loop pauses when backgrounded)
2. Open Dev Tools → Performance tab → check if the animation is still running
3. File an Issue with reproduction steps

---

## Troubleshooting

### Method 1: Check Plugin Console Output

1. Obsidian → Settings → Developer → Open Developer Tools (`Ctrl+Shift+I`)
2. Switch to the **Console** tab
3. Enable / disable the plugin and observe for red errors
4. Copy the error message to your Issue

### Method 2: Check Plugin Status

1. Settings → Community plugins → Desktop Pet
2. If it's **grayed out / can't enable**: `manifest.json` may be corrupted — re-copy the plugin directory
3. If it **crashes on enable**: `main.js` version mismatch — rerun `npm run build`
4. If it **does nothing on enable**: check the Console output

### Method 3: Reset Plugin Data

The plugin stores settings in Obsidian's `data.json`:

```
<your-vault>/.obsidian/plugins/desktoppet/data.json
```

Delete this file and restart Obsidian — the plugin will reset to default settings.

### Method 4: Full Uninstall

1. Obsidian Settings → Community plugins → disable Desktop Pet
2. Delete the `<your-vault>/.obsidian/plugins/desktoppet/` directory
3. Restart Obsidian

---

## Contributing & Feedback

If you encounter issues or want to suggest something:

- **Bug Reports**: GitHub Issues → describe the problem, attach a Console screenshot
- **Feature Requests**: GitHub Issues → add the `feature` label
- **Code Contributions**: Fork → open a PR (see `CONTRIBUTING.md`)

---

## License

**MIT License** © xiaosong8584

This project is open source under the MIT License, free for commercial and personal use. See the `LICENSE` file in the repository root for full terms.
