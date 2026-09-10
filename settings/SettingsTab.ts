import { App, Notice, PluginSettingTab, Setting } from 'obsidian';

/**
 * 用户设置数据结构。
 */
export interface PetSettings {
  /** 是否显示 */
  enabled: boolean;
  /** 宠物大小（0.5 - 2.0） */
  petSize: number;
  /** 主色（hex 字符串，含 #） */
  color: string;
  /** 悬浮位置 X（px） */
  positionX: number;
  /** 悬浮位置 Y（px） */
  positionY: number;
}

/** 默认设置 */
export const DEFAULT_SETTINGS: PetSettings = {
  enabled: true,
  petSize: 1.0,
  color: '#4A90D9',
  positionX: 20,
  positionY: 200
};

/** 预设主色方案（柔和、简约） */
const COLOR_PRESETS: Array<{ label: string; value: string }> = [
  { label: '柔和蓝', value: '#4A90D9' },
  { label: '薄荷绿', value: '#4ECDC4' },
  { label: '珊瑚粉', value: '#F28B82' },
  { label: '薰衣草', value: '#9B8CE5' },
  { label: '暖橙', value: '#F2B263' }
];

/**
 * 插件设置面板。
 *
 * 约定：这里只负责「改 this.plugin.settings 的值」+ 调用
 * `plugin.updateSettings()`，由主插件负责生效与（防抖）落盘。
 * 不要在这里直接 `saveSettings()`，否则每次改动都会写盘两次。
 */
export class SettingsTab extends PluginSettingTab {
  /** 主插件实例引用 */
  plugin: import('../main').default;

  constructor(app: App, plugin: import('../main').default) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName('Desktop Pet').setDesc('悬浮宠物总设置');

    // ---- 显示/隐藏 ----
    new Setting(containerEl)
      .setName('显示宠物')
      .setDesc('是否显示悬浮宠物（可通过状态栏图标切换）')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.enabled)
          .onChange((v) => {
            this.plugin.settings.enabled = v;
            this.plugin.updateSettings(this.plugin.settings);
          })
      );

    // ---- 宠物大小 ----
    // 不要在 onChange 里调 this.display()：Obsidian 的滑块是连续的 input 事件，
    // 重建整个面板会让滑块在拖动途中被销毁重建，表现为「拖一格就断」。
    // 需要刷新文案时就地改 setDesc 即可。
    const sizeSetting = new Setting(containerEl)
      .setName('宠物大小')
      .setDesc(`当前倍率：${this.plugin.settings.petSize.toFixed(2)}x`);

    sizeSetting.addSlider((s) =>
      s.setLimits(0.5, 2.0, 0.05)
        .setValue(this.plugin.settings.petSize)
        // 不调 setDynamicTooltip()：该 API 自 Obsidian 0.9.7 起废弃，
        // 官方说明「数值现在总是内联显示」，调用它没有任何效果。
        .onChange((v: number) => {
          this.plugin.settings.petSize = v;
          this.plugin.updateSettings(this.plugin.settings);
          sizeSetting.setDesc(`当前倍率：${v.toFixed(2)}x`);
        })
    );

    // ---- 主色选择 ----
    new Setting(containerEl)
      .setName('主色')
      .setDesc('选择宠物主色调（辅色固定为白色）')
      .addDropdown((d) => {
        COLOR_PRESETS.forEach((preset) => d.addOption(preset.value, preset.label));
        // 确保当前颜色在列表中
        if (!COLOR_PRESETS.some((p) => p.value === this.plugin.settings.color)) {
          d.addOption(this.plugin.settings.color, `当前 ${this.plugin.settings.color}`);
        }
        d.setValue(this.plugin.settings.color).onChange((v) => {
          this.plugin.settings.color = v;
          this.plugin.updateSettings(this.plugin.settings);
        });
      });

    // ---- 位置 X ----
    new Setting(containerEl)
      .setName('位置 X（像素）')
      .setDesc('宠物左上角相对窗口左侧的距离（超出窗口会自动收敛到可视区内）')
      .addText((t) =>
        t.setPlaceholder('0')
          .setValue(String(this.plugin.settings.positionX))
          .onChange((v) => {
            const n = Number.parseInt(v, 10);
            if (Number.isNaN(n)) return;
            this.plugin.settings.positionX = n;
            this.plugin.updateSettings(this.plugin.settings);
          })
      );

    // ---- 位置 Y ----
    new Setting(containerEl)
      .setName('位置 Y（像素）')
      .setDesc('宠物左上角相对窗口顶部的距离（超出窗口会自动收敛到可视区内）')
      .addText((t) =>
        t.setPlaceholder('0')
          .setValue(String(this.plugin.settings.positionY))
          .onChange((v) => {
            const n = Number.parseInt(v, 10);
            if (Number.isNaN(n)) return;
            this.plugin.settings.positionY = n;
            this.plugin.updateSettings(this.plugin.settings);
          })
      );

    // ---- 恢复默认 ----
    new Setting(containerEl)
      .setName('恢复默认设置')
      .setDesc('把宠物恢复到默认的大小、颜色与位置')
      .addButton((b) => {
        b.setButtonText('恢复默认').onClick(() => {
          this.plugin.settings = { ...DEFAULT_SETTINGS };
          this.plugin.updateSettings(this.plugin.settings);
          new Notice('已恢复默认设置');
          // 一次性按钮，重建面板无副作用（这里不受滑块连续事件影响）
          this.display();
        });

        // 样式：setWarning() 自 Obsidian 0.11.0 起废弃，官方替代是 setDestructive()，
        // 但后者需要 Obsidian ≥ 1.13.0，而本插件 minAppVersion 是 1.0.0。
        // 不为一个按钮配色抬高最低版本要求，所以做能力探测：新版本用新 API，
        // 老版本退回旧 API。
        const modern = b as { setDestructive?: () => unknown };
        if (typeof modern.setDestructive === 'function') {
          modern.setDestructive();
        } else {
          b.setWarning();
        }
      });
  }
}
