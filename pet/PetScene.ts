import * as THREE from 'three';
import { createPetModel, disposePetModel, PetModelParts, PetModelPalette } from './PetModel';
import { PetAnimator } from './PetAnimator';

/**
 * Three.js 场景封装：负责 renderer / scene / camera / lights / 渲染循环。
 *
 * 背景完全透明，用于悬浮在 Obsidian 内容之上。
 */
export class PetScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly model: PetModelParts;
  readonly animator: PetAnimator;

  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private rafId: number = 0;
  private clock: THREE.Clock = new THREE.Clock();
  private disposed: boolean = false;

  /**
   * 累计 elapsed（秒），由本类自己维护。
   *
   * 不能直接用 `clock.getElapsedTime()`：`resume()` 会重新进入 `start()`，
   * 而 `clock.start()` 会把 elapsedTime 归零 —— 那样 PetAnimator 里按绝对
   * 时刻记录的 `nextBlinkAt` 就会落到"未来很久"，表现为隐藏再显示后长时间不眨眼。
   * 这里自己累加，保证 elapsed 在 pause / resume 之间保持单调。
   */
  private elapsed: number = 0;

  constructor(container: HTMLElement, width: number, height: number, primaryColor: string) {
    this.container = container;

    // 创建 renderer
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // renderer.domElement 样式
    this.renderer.domElement.className = 'desktoppet-canvas';
    this.renderer.domElement.style.width = `${width}px`;
    this.renderer.domElement.style.height = `${height}px`;

    this.canvas = this.renderer.domElement;
    container.appendChild(this.canvas);

    // 场景
    this.scene = new THREE.Scene();

    // 相机（ fov 45-60 之间，宠物整体在视口居中偏上）
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    this.camera.position.set(0, 0.2, 4.2);
    this.camera.lookAt(0, 0.05, 0);

    // 灯光：主光 + 补光 + 环境光
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(2, 3, 4);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xa0c4ff, 0.5);
    fillLight.position.set(-3, 1, 2);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffe4b0, 0.6, 8);
    rimLight.position.set(0, -1.5, -2);
    this.scene.add(rimLight);

    // 颜色方案
    const palette: PetModelPalette = {
      primary: parseInt(primaryColor.replace('#', ''), 16),
      secondary: 0xffffff,
      detail: 0x2c3e50
    };

    // 构建模型
    this.model = createPetModel(palette);
    this.scene.add(this.model.group);

    // 动画控制器
    this.animator = new PetAnimator(this.model);

    // 启动渲染循环
    this.start();
  }

  /** 启动 rAF 循环 */
  start(): void {
    if (this.disposed || this.rafId !== 0) return;

    // 丢弃暂停期间累积的时间，否则恢复后第一帧的 delta 会是一个巨大的跳变
    this.clock.getDelta();

    const loop = (): void => {
      if (this.disposed) return;
      this.rafId = requestAnimationFrame(loop);
      const delta = this.clock.getDelta();
      this.elapsed += delta;
      this.animator.update(delta, this.elapsed);
      this.renderer.render(this.scene, this.camera);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /** 暂停渲染循环 */
  pause(): void {
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  /** 恢复渲染循环 */
  resume(): void {
    if (this.rafId === 0 && !this.disposed) this.start();
  }

  /** 动态更新容器尺寸 */
  resize(width: number, height: number): void {
    // 重新取一次 devicePixelRatio：跨显示器拖动窗口、或系统缩放比例变化后，
    // 它可能已经变了，沿用旧值会让画面在新显示器上偏糊或过采样。
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = `${width}px`;
    this.renderer.domElement.style.height = `${height}px`;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** 应用新颜色方案 */
  applyColor(primaryHex: string): void {
    const primaryColor = new THREE.Color(parseInt(primaryHex.replace('#', ''), 16));

    // 只替换「被 PetModel 标记为主色」的材质（material.userData.isPrimary）。
    // 不再用颜色值启发式（"非白非深非腮红即主色"）：那种写法既会漏
    // （主色一旦被设成深色 0x2c3e50，之后就再也换不回来），又会多
    // （将来新增任何其他色调的辅助材质都会被误当成主色）。
    this.model.group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mat = obj.material;
      const list = Array.isArray(mat) ? mat : [mat];
      list.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial && m.userData.isPrimary === true) {
          // 只改 color 不需要 needsUpdate：那是给着色器源码/宏变更用的，
          // 每次换色都置 true 会白白触发一次着色器重编译。
          m.color.copy(primaryColor);
        }
      });
    });
  }

  /** 完整释放资源（renderer / geometry / material / rAF / WebGL context） */
  dispose(): void {
    this.disposed = true;
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    disposePetModel(this.model);
    this.scene.clear();

    // 清理 renderer：除了 dispose() 还要主动释放 WebGL context。
    // 浏览器同时存活的 context 数量有上限（约 16），频繁重载插件时
    // 只调 dispose() 会把旧 context 留在池里，最终导致新 context 创建失败。
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    if (this.canvas.parentElement === this.container) {
      this.container.removeChild(this.canvas);
    }
  }
}
