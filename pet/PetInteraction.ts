import { PetScene } from './PetScene';
import { PetAnimator } from './PetAnimator';

/**
 * 交互层：负责拖动、点击识别、事件绑定与解绑。
 *
 * 统一使用 **Pointer Events**（`pointerdown/move/up/cancel`），因此鼠标、
 * 触屏、触控笔走同一套逻辑，移动端无需额外分支。
 *
 * - 指针按下后通过 `setPointerCapture` 把后续事件锁定到 canvas，
 *   手指/鼠标移出宠物范围仍能继续拖动，无需监听 window。
 * - 拖动阈值 5px；超过阈值视为拖动，否则视为点击。
 * - 只响应落在 canvas 上的指针（canvas 通过 CSS `pointer-events: auto`
 *   保证空白区域不拦截 Obsidian 的点击）。
 */
export class PetInteraction {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private animator: PetAnimator;

  /** 当前活动指针 id（多点触控时只认第一个按下的指针） */
  private activePointerId: number | null = null;

  /** 拖动起始指针位置 */
  private startX: number = 0;
  private startY: number = 0;
  /** 拖动起始时容器的 left/top */
  private startLeft: number = 0;
  private startTop: number = 0;
  /** 是否处于拖动中 */
  private isDragging: boolean = false;
  /** 拖动移动距离（px） */
  private moveDistance: number = 0;
  /** 本次指针交互是否已判定为「拖动」（用于决定松手时是否回写位置） */
  private hasMoved: boolean = false;

  /** 上次指针 X 位置（计算速度 → 倾角） */
  private lastX: number = 0;
  private lastMoveTime: number = 0;

  /** 事件处理函数引用（用于解绑） */
  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;
  private onPointerCancel: (e: PointerEvent) => void;

  /** 气泡元素 */
  private bubbleEl: HTMLElement | null = null;
  private bubbleTimer: number | null = null;

  /**
   * 拖动结束回调：把最终位置（视口坐标 / px）回写给插件用于持久化。
   * 不设置时仅移动 DOM，不保存。
   */
  onDragEnd: ((x: number, y: number) => void) | null = null;

  /**
   * 位置裁剪回调：拖动过程中每一步都会把候选坐标交给它，
   * 由外部按视口范围收敛（避免宠物被拖出可视区后抓不回来）。
   * 不设置时不裁剪。
   */
  clampPosition: ((x: number, y: number) => { x: number; y: number }) | null = null;

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
    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerMove = this.handlePointerMove.bind(this);
    this.onPointerUp = this.handlePointerUp.bind(this);
    this.onPointerCancel = this.handlePointerCancel.bind(this);

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
  }

  /** 指针按下 */
  private handlePointerDown(e: PointerEvent): void {
    // 已有活动指针（多点触控 / 多键鼠标）→ 忽略后续指针
    if (this.activePointerId !== null) return;
    // 仅响应主键（鼠标左键 / 触摸 / 笔）；右键、中键不参与拖动
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // 阻止 Obsidian 接收该事件，并抑制触摸端的兼容鼠标事件与手势
    e.stopPropagation();
    e.preventDefault();

    this.activePointerId = e.pointerId;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.lastX = e.clientX;
    this.lastMoveTime = performance.now();
    this.moveDistance = 0;
    this.hasMoved = false;
    this.isDragging = true;

    // 记录容器当前位置
    const rect = this.container.getBoundingClientRect();
    this.startLeft = rect.left;
    this.startTop = rect.top;

    // 指针捕获：move/up 即使移出 canvas 也会派发到 canvas
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // 某些环境下指针可能已失效，忽略即可（退化为普通事件流）
    }

    this.canvas.classList.add('dragging');
  }

  /** 指针移动 */
  private handlePointerMove(e: PointerEvent): void {
    if (!this.isDragging || e.pointerId !== this.activePointerId) return;
    e.stopPropagation();

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    this.moveDistance = Math.hypot(dx, dy);

    // 超过阈值 → 更新容器位置
    if (this.moveDistance > 5) {
      this.hasMoved = true;

      let left = this.startLeft + dx;
      let top = this.startTop + dy;
      // 边界裁剪：不让宠物被拖到可视区之外
      if (this.clampPosition) {
        const clamped = this.clampPosition(left, top);
        left = clamped.x;
        top = clamped.y;
      }
      this.container.style.left = `${left}px`;
      this.container.style.top = `${top}px`;
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

  /** 指针抬起：结束拖动，并按移动距离判定是拖动还是点击 */
  private handlePointerUp(e: PointerEvent): void {
    if (e.pointerId !== this.activePointerId) return;
    this.finishPointer(e, true);
  }

  /** 指针被系统取消（如手势中断、来电弹窗）：结束拖动且不触发点击 */
  private handlePointerCancel(e: PointerEvent): void {
    if (e.pointerId !== this.activePointerId) return;
    this.finishPointer(e, false);
  }

  /** 统一的收尾逻辑 */
  private finishPointer(e: PointerEvent, allowClick: boolean): void {
    e.stopPropagation();

    const moved = this.hasMoved;

    this.isDragging = false;
    this.hasMoved = false;
    this.moveDistance = 0;
    this.activePointerId = null;

    this.animator.setDragging(false);
    this.animator.setDragTilt(0);
    this.canvas.classList.remove('dragging');

    if (this.canvas.hasPointerCapture(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }

    if (!moved && allowClick) {
      // 点击判定：未超过拖动阈值。时间基准由 animator 内部取最近一帧的 elapsed，
      // 这里不能传 performance.now()（与渲染循环不同源）。
      this.animator.triggerClickFeedback();
    } else if (moved && this.onDragEnd) {
      // 真正拖动过才回写位置，避免纯点击也触发一次保存
      const rect = this.container.getBoundingClientRect();
      this.onDragEnd(Math.round(rect.left), Math.round(rect.top));
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
    // 先重置拖动状态，防止 dispose 后到达的 pointerup 触发后续逻辑
    this.isDragging = false;
    this.hasMoved = false;
    this.activePointerId = null;

    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);

    if (this.bubbleTimer !== null) {
      window.clearTimeout(this.bubbleTimer);
      this.bubbleTimer = null;
    }

    if (this.bubbleEl) {
      this.bubbleEl.remove();
      this.bubbleEl = null;
    }

    this.animator.onPhrase = null;
    this.onDragEnd = null;
    this.clampPosition = null;
  }
}
