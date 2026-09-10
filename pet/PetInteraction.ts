import { PetScene } from './PetScene';
import { PetAnimator } from './PetAnimator';

/**
 * 交互层：负责鼠标拖动、点击识别、事件绑定与解绑。
 *
 * 拖动阈值 5px；超过阈值视为拖动，否则视为点击。
 * 射线拾取：仅当鼠标落在 canvas 上时才开始响应（canvas 本身
 * 通过 CSS `pointer-events: auto` 保证点击不到空白区域）。
 */
export class PetInteraction {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private animator: PetAnimator;

  /** 拖动起始鼠标位置 */
  private startX: number = 0;
  private startY: number = 0;
  /** 拖动起始时容器的 left/top */
  private startLeft: number = 0;
  private startTop: number = 0;
  /** 是否处于拖动中 */
  private isDragging: boolean = false;
  /** 拖动移动距离（px） */
  private moveDistance: number = 0;

  /** 上次鼠标 X 位置（计算速度 → 倾角） */
  private lastX: number = 0;
  private lastMoveTime: number = 0;

  /** 事件处理函数引用（用于解绑） */
  private onCanvasMouseDown: (e: MouseEvent) => void;
  private onWindowMouseMove: (e: MouseEvent) => void;
  private onWindowMouseUp: (e: MouseEvent) => void;

  /** 气泡元素 */
  private bubbleEl: HTMLElement | null = null;
  private bubbleTimer: number | null = null;

  constructor(container: HTMLElement, scene: PetScene) {
    this.container = container;
    this.animator = scene.animator;
    this.canvas = scene.renderer.domElement;

    // 气泡元素
    const bubble = document.createElement('div');
    bubble.className = 'desktoppet-bubble';
    this.bubbleEl = bubble;
    container.appendChild(bubble);

    // 点击时由 animator 提供台词，这里更新气泡
    this.animator.onPhrase = (phrase) => this.showBubble(phrase);

    // 绑定事件
    this.onCanvasMouseDown = this.handleMouseDown.bind(this);
    this.onWindowMouseMove = this.handleMouseMove.bind(this);
    this.onWindowMouseUp = this.handleMouseUp.bind(this);

    this.canvas.addEventListener('mousedown', this.onCanvasMouseDown);
  }

  /** 鼠标按下 */
  private handleMouseDown(e: MouseEvent): void {
    // 阻止 Obsidian 接收该事件
    e.stopPropagation();
    e.preventDefault();

    this.startX = e.clientX;
    this.startY = e.clientY;
    this.lastX = e.clientX;
    this.lastMoveTime = performance.now();
    this.moveDistance = 0;
    this.isDragging = true;

    // 记录容器当前位置
    const rect = this.container.getBoundingClientRect();
    this.startLeft = rect.left;
    this.startTop = rect.top;

    // 绑定 window 事件（保证移出 canvas 后仍能拖动）
    window.addEventListener('mousemove', this.onWindowMouseMove);
    window.addEventListener('mouseup', this.onWindowMouseUp);

    this.canvas.classList.add('dragging');
  }

  /** 鼠标移动 */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    e.stopPropagation();

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    this.moveDistance = Math.hypot(dx, dy);

    // 超过阈值 → 更新容器位置
    if (this.moveDistance > 5) {
      this.container.style.left = `${this.startLeft + dx}px`;
      this.container.style.top = `${this.startTop + dy}px`;
      this.animator.setDragging(true);

      // 计算速度 → 倾角目标
      const now = performance.now();
      const dt = now - this.lastMoveTime;
      if (dt > 0) {
        const vx = (e.clientX - this.lastX) / dt;
        // 归一化到 [-1, 1]
        const tilt = Math.max(-1, Math.min(1, vx * 30));
        this.animator.setDragTilt(tilt * 0.3);
      }
      this.lastX = e.clientX;
      this.lastMoveTime = now;
    }
  }

  /** 鼠标松开 */
  private handleMouseUp(e: MouseEvent): void {
    if (!this.isDragging) return;
    e.stopPropagation();

    this.isDragging = false;
    this.animator.setDragging(false);
    this.animator.setDragTilt(0);
    this.canvas.classList.remove('dragging');

    window.removeEventListener('mousemove', this.onWindowMouseMove);
    window.removeEventListener('mouseup', this.onWindowMouseUp);

    // 点击判定
    if (this.moveDistance < 5) {
      // 用时钟获取当前时间（近似，用 Date 也可）
      this.animator.triggerClickFeedback(performance.now() / 1000);
    }
  }

  /** 显示气泡文字 2 秒 */
  private showBubble(text: string): void {
    if (!this.bubbleEl) return;
    this.bubbleEl.textContent = text;
    this.bubbleEl.classList.add('show');

    if (this.bubbleTimer !== null) {
      window.clearTimeout(this.bubbleTimer);
    }
    this.bubbleTimer = window.setTimeout(() => {
      this.bubbleEl?.classList.remove('show');
    }, 2200);
  }

  /** 完整释放 */
  dispose(): void {
    // 先重置拖动状态，防止 dispose 后到达的 mouseup 触发后续逻辑
    this.isDragging = false;

    this.canvas.removeEventListener('mousedown', this.onCanvasMouseDown);
    window.removeEventListener('mousemove', this.onWindowMouseMove);
    window.removeEventListener('mouseup', this.onWindowMouseUp);

    if (this.bubbleTimer !== null) {
      window.clearTimeout(this.bubbleTimer);
      this.bubbleTimer = null;
    }

    if (this.bubbleEl) {
      this.bubbleEl.remove();
      this.bubbleEl = null;
    }

    this.animator.onPhrase = null;
  }
}
