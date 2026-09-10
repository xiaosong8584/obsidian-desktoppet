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
    this.clock.start();
    const loop = (): void => {
      if (this.disposed) return;
      this.rafId = requestAnimationFrame(loop);
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();
      this.animator.update(delta, elapsed);
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
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = `${width}px`;
    this.renderer.domElement.style.height = `${height}px`;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** 调整宠物整体缩放（不改相机与容器） */
  setPetScale(scale: number): void {
    // 通过 animator 同步 baseScale 到 userData，避免脉冲动画覆盖基准缩放
    this.animator.setBaseScale(scale);
  }

  /** 应用新颜色方案 */
  applyColor(primaryHex: string): void {
    const palette: PetModelPalette = {
      primary: parseInt(primaryHex.replace('#', ''), 16),
      secondary: 0xffffff,
      detail: 0x2c3e50
    };

    const primaryColor = new THREE.Color(palette.primary);

    // 遍历模型，替换主色材质（通过检查 mesh 是否用了主色）
    this.model.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          // 简化策略：把不是黑色、白色、深色的都视为"主色"
          const currentHex = mat.color.getHex();
          if (
            currentHex !== 0xffffff &&
            currentHex !== 0x2c3e50 &&
            currentHex !== 0xff9fb0
          ) {
            mat.color.copy(primaryColor);
            mat.needsUpdate = true;
          }
        }
      }
    });
  }

  /** 完整释放资源（renderer / geometry / material / rAF） */
  dispose(): void {
    this.disposed = true;
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    disposePetModel(this.model);
    this.scene.clear();

    // 清理 renderer
    this.renderer.dispose();
    if (this.canvas.parentElement === this.container) {
      this.container.removeChild(this.canvas);
    }
  }
}
