import { Plugin } from 'obsidian';
import { PetScene } from './pet/PetScene';
import { PetInteraction } from './pet/PetInteraction';
import { SettingsTab, DEFAULT_SETTINGS, PetSettings } from './settings/SettingsTab';

/**
 * Obsidian 桌面宠物插件主入口。
 *
 * 负责：
 *  - 创建悬浮容器 DOM
 *  - 初始化 Three.js 场景与动画控制器
 *  - 注册命令 / 状态栏 / 设置面板
 *  - 生命周期管理（onload / onunload 完整清理）
 */
export default class DesktopPetPlugin extends Plugin {
  /** 用户设置（持久化） */
  settings: PetSettings = { ...DEFAULT_SETTINGS };

  /** 悬浮容器 DOM */
  containerEl: HTMLElement | null = null;
  /** Three.js 场景封装 */
  scene: PetScene | null = null;
  /** 交互层 */
  interaction: PetInteraction | null = null;
  /** 状态栏图标 */
  statusBarEl: HTMLElement | null = null;

  /** 是否可见 */
  isVisible: boolean = true;

  async onload(): Promise<void> {
    // 1. 加载设置
    await this.loadSettings();

    // 2. 创建悬浮容器并挂载
    this.createContainer();

    // 3. 注册命令
    this.addCommand({
      id: 'toggle-pet',
      name: 'Show/Hide Pet',
      callback: () => this.toggleVisibility()
    });

    // 4. 注册状态栏
    this.registerStatusBar();

    // 5. 注册设置面板
    this.addSettingTab(new SettingsTab(this.app, this));
  }

  onunload(): void {
    // 完整清理：交互 → 场景 → DOM
    this.interaction?.dispose();
    this.interaction = null;

    this.scene?.dispose();
    this.scene = null;

    if (this.containerEl) {
      this.containerEl.remove();
      this.containerEl = null;
    }

    if (this.statusBarEl) {
      this.statusBarEl.remove();
      this.statusBarEl = null;
    }
  }

  /** 加载设置（含默认值合并） */
  private async loadSettings(): Promise<void> {
    this.settings = Object.assign({ ...DEFAULT_SETTINGS }, (await this.loadData()) as Partial<PetSettings>);
    // 若启用状态为 false，则初始隐藏
    if (!this.settings.enabled) {
      this.isVisible = false;
    }
  }

  /** 保存设置到 Obsidian 数据 */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /** 创建悬浮容器 */
  private createContainer(): void {
    const { petSize } = this.settings;
    const size = Math.round(180 * petSize);

    const container = document.createElement('div');
    container.className = 'desktoppet-container';
    container.style.left = `${this.settings.positionX}px`;
    container.style.top = `${this.settings.positionY}px`;
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;

    if (!this.isVisible) {
      container.classList.add('hidden');
    }

    this.containerEl = container;
    // 挂到 document.body（Obsidian 的 App 类型没有 .dom 属性）
    document.body.appendChild(container);

    // 初始化 Three.js 场景
    const scene = new PetScene(container, size, size, this.settings.color);
    scene.setPetScale(petSize);
    this.scene = scene;

    // 初始化交互层
    this.interaction = new PetInteraction(container, scene);

    // 立即应用颜色
    scene.applyColor(this.settings.color);
  }

  /** 切换显隐 */
  toggleVisibility(): void {
    if (!this.containerEl) return;
    this.isVisible = !this.isVisible;
    this.containerEl.classList.toggle('hidden', !this.isVisible);
    this.settings.enabled = this.isVisible;
    void this.saveSettings();
  }

  /** 注册状态栏图标 */
  private registerStatusBar(): void {
    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.className = 'desktoppet-statusbar';
    this.statusBarEl.setAttribute('aria-label', 'Toggle Desktop Pet');
    this.statusBarEl.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">' +
      '<path d="M12 2a1 1 0 0 1 1 1v1.06A8 8 0 0 1 20 12v3a2 2 0 0 1-2 2h-1v-4a3 3 0 0 0-3-3h-4a3 3 0 0 0-3 3v4H6a2 2 0 0 1-2-2v-3A8 8 0 0 1 11 4.06V3a1 1 0 0 1 1-1Zm-3 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/>' +
      '</svg>';
    // 使用 registerDomEvent 统一注册（会在 onunload 时自动解绑，避免重复注册）
    this.registerDomEvent(this.statusBarEl, 'click', () => this.toggleVisibility());
  }

  /** 外部更新设置时的回调（由 SettingsTab 调用） */
  updateSettings(newSettings: PetSettings): void {
    const sizeChanged = newSettings.petSize !== this.settings.petSize ||
                       newSettings.positionX !== this.settings.positionX ||
                       newSettings.positionY !== this.settings.positionY;

    const colorChanged = newSettings.color !== this.settings.color;
    const visibilityChanged = newSettings.enabled !== this.settings.enabled;

    this.settings = { ...newSettings };
    void this.saveSettings();

    if (sizeChanged && this.containerEl && this.scene) {
      // 重建容器尺寸和场景
      const newSize = Math.round(180 * this.settings.petSize);
      this.containerEl.style.width = `${newSize}px`;
      this.containerEl.style.height = `${newSize}px`;
      this.containerEl.style.left = `${this.settings.positionX}px`;
      this.containerEl.style.top = `${this.settings.positionY}px`;
      this.scene.resize(newSize, newSize);
      this.scene.setPetScale(this.settings.petSize);
    }

    if (colorChanged && this.scene) {
      this.scene.applyColor(this.settings.color);
    }

    if (visibilityChanged && this.containerEl) {
      this.isVisible = this.settings.enabled;
      this.containerEl.classList.toggle('hidden', !this.settings.enabled);
    }
  }
}
