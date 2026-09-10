import { Plugin } from 'obsidian';
import { PetScene } from './pet/PetScene';
import { PetInteraction } from './pet/PetInteraction';
import { SettingsTab, DEFAULT_SETTINGS, PetSettings } from './settings/SettingsTab';

/** 容器基准边长（petSize = 1.0 时），px */
const BASE_SIZE = 180;

/** 设置写盘防抖时长（ms）——位置输入框每敲一个字符都会触发 updateSettings */
const SAVE_DEBOUNCE_MS = 400;

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

  /**
   * 上一次「已真正应用到场景」的设置快照。
   *
   * 用来判断哪些项发生了变化 —— 不能拿 this.settings 比较：
   * SettingsTab 会先原地修改 this.settings，再把同一个对象引用传进来，
   * 那样所有比较都会恒为 false，设置改动将永远不生效。
   */
  private appliedSettings: PetSettings = { ...DEFAULT_SETTINGS };

  /** 防抖写盘计时器 */
  private saveTimer: number | null = null;

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

    // 6. 窗口尺寸变化后重新裁剪位置：窗口变小 / 换显示器后，
    //    原本的坐标可能已经在可视区之外，宠物会"消失"且无法抓回
    this.registerDomEvent(window, 'resize', () => this.applyClampedPosition());
  }

  onunload(): void {
    // 把防抖中的设置立即落盘，避免最后几次改动丢失
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
      void this.saveSettings();
    }

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

    // 载入时先裁剪一次位置（窗口比上次小的时候，旧坐标可能已落在屏幕外）
    const size = this.currentSize();
    const clamped = this.clampPosition(this.settings.positionX, this.settings.positionY, size);
    this.settings.positionX = clamped.x;
    this.settings.positionY = clamped.y;

    // 记录已应用快照（独立副本，后续 SettingsTab 的原地修改不会污染它）
    this.appliedSettings = { ...this.settings };
    // 若启用状态为 false，则初始隐藏
    if (!this.settings.enabled) {
      this.isVisible = false;
    }
  }

  /** 保存设置到 Obsidian 数据 */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /**
   * 防抖保存。
   *
   * 设置面板的位置输入框是逐字符触发的，每次写盘毫无必要；
   * 拖动结束、显隐切换这类离散动作仍走 saveSettings() 立即落盘。
   */
  private scheduleSave(): void {
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
    }
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.saveSettings();
    }, SAVE_DEBOUNCE_MS);
  }

  /** 当前 petSize 对应的容器边长（px） */
  currentSize(): number {
    return Math.round(BASE_SIZE * this.settings.petSize);
  }

  /**
   * 把坐标裁剪到可视区内。
   *
   * 规则简单可预期：宠物完整可见（窗口比宠物还小时贴住左上角，绝不越界），
   * 这样就不存在"拖出去再也抓不回来"的状态。
   */
  private clampPosition(x: number, y: number, size: number): { x: number; y: number } {
    const maxX = Math.max(0, window.innerWidth - size);
    const maxY = Math.max(0, window.innerHeight - size);
    return {
      x: Math.round(Math.min(Math.max(0, x), maxX)),
      y: Math.round(Math.min(Math.max(0, y), maxY))
    };
  }

  /** 按当前设置重新裁剪一次位置并应用（窗口尺寸变化时调用） */
  private applyClampedPosition(): void {
    if (!this.containerEl) return;
    const size = this.currentSize();
    const { x, y } = this.clampPosition(this.settings.positionX, this.settings.positionY, size);

    this.settings.positionX = x;
    this.settings.positionY = y;
    this.appliedSettings.positionX = x;
    this.appliedSettings.positionY = y;

    this.containerEl.style.left = `${x}px`;
    this.containerEl.style.top = `${y}px`;
    this.scheduleSave();
  }

  /** 创建悬浮容器 */
  private createContainer(): void {
    const size = this.currentSize();
    const { x, y } = this.clampPosition(this.settings.positionX, this.settings.positionY, size);
    this.settings.positionX = x;
    this.settings.positionY = y;

    const container = document.createElement('div');
    container.className = 'desktoppet-container';
    container.style.left = `${x}px`;
    container.style.top = `${y}px`;
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;

    if (!this.isVisible) {
      container.classList.add('hidden');
    }

    this.containerEl = container;
    // 挂到 document.body（Obsidian 的 App 类型没有 .dom 属性）
    document.body.appendChild(container);

    // 初始化 Three.js 场景
    // 注意：宠物视觉尺寸完全由「容器 / canvas 尺寸」决定（新建时传入 + resize），
    // 不再额外放大模型，否则 petSize 会被平方放大（2.0x 实际约 4 倍大）。
    const scene = new PetScene(container, size, size, this.settings.color);
    this.scene = scene;
    // 初始不可见时不要空跑渲染循环
    if (!this.isVisible) scene.pause();

    // 初始化交互层；拖动过程中实时裁剪，结束后回写设置（避免重启后弹回旧位置）
    this.interaction = new PetInteraction(container, scene);
    this.interaction.clampPosition = (px, py) => this.clampPosition(px, py, this.currentSize());
    this.interaction.onDragEnd = (dx, dy) => {
      const c = this.clampPosition(dx, dy, this.currentSize());
      this.settings.positionX = c.x;
      this.settings.positionY = c.y;
      this.appliedSettings.positionX = c.x;
      this.appliedSettings.positionY = c.y;
      void this.saveSettings();
    };

    // 立即应用颜色
    scene.applyColor(this.settings.color);
    this.appliedSettings = { ...this.settings };
  }

  /** 切换显隐 */
  toggleVisibility(): void {
    if (!this.containerEl) return;
    this.isVisible = !this.isVisible;
    this.containerEl.classList.toggle('hidden', !this.isVisible);
    this.settings.enabled = this.isVisible;
    // 隐藏时暂停渲染循环，避免不可见状态下仍在全速跑 rAF（省电、降 GPU 占用）
    if (this.isVisible) {
      this.scene?.resume();
    } else {
      this.scene?.pause();
    }
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

  /** 外部更新设置时的回调（由 SettingsTab 调用，内部负责防抖落盘） */
  updateSettings(newSettings: PetSettings): void {
    // 必须与「已应用快照」比较：SettingsTab 传入的往往就是 this.settings 本身，
    // 与自身比较会让 changed 标志恒为 false，改动就不会生效。
    const sizeChanged = newSettings.petSize !== this.appliedSettings.petSize;
    const positionChanged =
      newSettings.positionX !== this.appliedSettings.positionX ||
      newSettings.positionY !== this.appliedSettings.positionY;
    const layoutChanged = sizeChanged || positionChanged;

    const colorChanged = newSettings.color !== this.appliedSettings.color;
    // 可见性以真实状态 isVisible（而非快照）为准，兼容状态栏切换后的场景
    const visibilityChanged = newSettings.enabled !== this.isVisible;

    this.settings = { ...newSettings };
    this.appliedSettings = { ...newSettings };
    this.scheduleSave();

    if (layoutChanged && this.containerEl && this.scene) {
      // 只改容器尺寸 + canvas 尺寸（视觉尺寸线性于 petSize），不动模型缩放
      const size = this.currentSize();
      const { x, y } = this.clampPosition(this.settings.positionX, this.settings.positionY, size);
      // 输入框可能填了越界值，这里把裁剪结果回写到设置
      this.settings.positionX = x;
      this.settings.positionY = y;
      this.appliedSettings.positionX = x;
      this.appliedSettings.positionY = y;

      this.containerEl.style.width = `${size}px`;
      this.containerEl.style.height = `${size}px`;
      this.containerEl.style.left = `${x}px`;
      this.containerEl.style.top = `${y}px`;
      if (sizeChanged) {
        this.scene.resize(size, size);
      }
    }

    if (colorChanged && this.scene) {
      this.scene.applyColor(this.settings.color);
    }

    if (visibilityChanged && this.containerEl) {
      this.isVisible = this.settings.enabled;
      this.containerEl.classList.toggle('hidden', !this.settings.enabled);
      if (this.isVisible) {
        this.scene?.resume();
      } else {
        this.scene?.pause();
      }
    }
  }
}
