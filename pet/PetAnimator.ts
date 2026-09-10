import { PetModelParts } from './PetModel';

/**
 * 动画控制器：管理 idle / 眨眼 / 点击反馈 / 拖动状态。
 */
export class PetAnimator {
  private model: PetModelParts;

  /** 基准 Y 值（idle 浮动的起点） */
  private baseY: number = 0;

  /**
   * 最近一帧的 elapsed（由 update() 写入）。
   *
   * 点击反馈是在外部的指针事件里触发的，那里拿不到渲染循环的 elapsed。
   * 早期实现传的是 `performance.now() / 1000`（**页面加载**至今的秒数），
   * 而本类的 elapsed 来自 `THREE.Clock`（**场景创建**至今的秒数）——
   * 两个时间基准不同源，`elapsed - clickStartAt` 恒为负数，
   * 于是点击脉冲 / 开心表情 / 天线弹跳全都不收敛（天线小球会被甩到视野外）。
   * 现在统一以本字段为准，触发方法不再接收时间参数。
   */
  private lastElapsed: number = 0;

  /** 眨眼相关 */
  private nextBlinkAt: number = 2;
  private blinkProgress: number = -1; // -1 表示当前未在眨眼
  private blinkDuration: number = 0.28; // 单次眨眼总时长（秒）

  /** 点击反馈相关 */
  private clickStartAt: number = -1;
  private clickDuration: number = 0.45; // 450ms
  private happyModeUntil: number = -1;
  private happyModeDuration: number = 1.2;

  /** 拖动状态 */
  private dragging: boolean = false;
  /** 拖动时倾角（根据拖动速度） */
  private tiltTarget: number = 0;
  private tiltCurrent: number = 0;

  /** 手臂自然摆动的相位 */
  private armPhase: number = 0;

  /** 台词（点击时随机） */
  private static readonly PHRASES: readonly string[] = [
    '你好~', '嗨!', '今天也要加油哦~', '嘿嘿，被你发现啦~',
    '我在呢~', '想我了吗?', '陪我玩一会儿嘛~', '✨ 有灵感了吗?',
    '休息一下眼睛吧~', '继续写下去，我陪你~'
  ];

  /** 点击回调（由外部设置，用于显示气泡文字） */
  onPhrase: ((phrase: string) => void) | null = null;

  constructor(model: PetModelParts) {
    this.model = model;
    this.baseY = model.group.position.y;
  }

  /** 设置拖动状态 */
  setDragging(dragging: boolean): void {
    this.dragging = dragging;
  }

  /** 更新拖动时的倾斜目标（值域 [-1, 1]） */
  setDragTilt(t: number): void {
    this.tiltTarget = Math.max(-0.3, Math.min(0.3, t));
  }

  /**
   * 触发点击反馈。
   *
   * 时间基准取 `lastElapsed`（最近一帧的渲染循环 elapsed），
   * 不要传 `performance.now()`，两者不同源会导致反馈动画永不收敛。
   */
  triggerClickFeedback(): string {
    const now = this.lastElapsed;
    this.clickStartAt = now;
    this.happyModeUntil = now + this.happyModeDuration;

    // 随机台词
    const idx = Math.floor(Math.random() * PetAnimator.PHRASES.length);
    const phrase = PetAnimator.PHRASES[idx];
    if (this.onPhrase) this.onPhrase(phrase);
    return phrase;
  }

  /** 每帧调用 */
  update(delta: number, elapsed: number): void {
    this.lastElapsed = elapsed;

    const { group, head, leftArm, rightArm, leftEye, rightEye, leftPupil, rightPupil, antennaTip } = this.model;

    // --- 眨眼逻辑 ---
    if (this.blinkProgress < 0 && elapsed > this.nextBlinkAt) {
      this.blinkProgress = 0;
      this.nextBlinkAt = elapsed + 2.5 + Math.random() * 3.5; // 2.5~6 秒后下一次
    }
    if (this.blinkProgress >= 0) {
      this.blinkProgress += delta / this.blinkDuration;
      let scaleY: number;
      if (this.blinkProgress >= 1) {
        scaleY = 1;
        this.blinkProgress = -1;
      } else {
        // 前 60% 收缩，后 40% 恢复
        const t = this.blinkProgress;
        scaleY = t < 0.6 ? Math.max(0.08, 1 - t / 0.6) : Math.min(1, 0.08 + (t - 0.6) / 0.4 * 0.92);
      }
      leftEye.scale.y = scaleY;
      rightEye.scale.y = scaleY;
    }

    // --- 开心表情（点击后） ---
    const isHappy = elapsed < this.happyModeUntil;
    if (isHappy) {
      // 用 scale 把瞳孔压扁做出"弯眼"∪ 形
      leftPupil.scale.set(1, 0.35, 1);
      rightPupil.scale.set(1, 0.35, 1);
    } else {
      leftPupil.scale.set(1, 1, 1);
      rightPupil.scale.set(1, 1, 1);
    }

    // --- 拖动倾角：每帧都朝目标平滑趋近 ---
    // 松手后 setDragTilt(0) 会把目标置 0，这里持续收敛即可自动回正，
    // 不能再把赋值写在 dragging 分支里，否则倾角会永久残留。
    this.tiltCurrent += (this.tiltTarget - this.tiltCurrent) * Math.min(1, delta * 8);
    group.rotation.z = this.tiltCurrent;

    // --- idle 动画：整体浮动 + 左右摇摆 ---
    if (!this.dragging) {
      group.position.y = this.baseY + Math.sin(elapsed * 1.5) * 0.1;
      group.rotation.y = Math.sin(elapsed * 0.8) * 0.15;
      // 头部轻微摆动（叠加残余倾角，使松手后平滑过渡回正）
      head.rotation.z = Math.sin(elapsed * 1.2) * 0.05 + this.tiltCurrent * 0.5;
      head.rotation.x = Math.sin(elapsed * 0.7) * 0.04;
      // 手臂自然摆动
      this.armPhase += delta;
      leftArm.rotation.z = Math.sin(this.armPhase * 1.3) * 0.15 - 0.05;
      rightArm.rotation.z = -Math.sin(this.armPhase * 1.3) * 0.15 + 0.05;
      // 天线小球轻微晃动
      antennaTip.rotation.z = Math.sin(elapsed * 2) * 0.08;
    } else {
      // 拖动中：暂停摇摆，头部跟随倾角
      head.rotation.z = this.tiltCurrent * 0.5;
    }

    // --- 点击反馈：缩放脉冲 ---
    let scalePulse = 1;
    if (this.clickStartAt >= 0 && elapsed - this.clickStartAt < this.clickDuration) {
      const t = (elapsed - this.clickStartAt) / this.clickDuration;
      // 1 -> 1.3 -> 1（正弦脉冲）
      scalePulse = 1 + Math.sin(t * Math.PI) * 0.3;
    } else {
      this.clickStartAt = -1;
    }

    // 应用点击脉冲缩放（宠物整体尺寸由容器 / canvas 尺寸控制，模型保持 1:1）
    group.scale.setScalar(scalePulse);

    // 点击反馈时天线弹跳
    if (this.clickStartAt >= 0) {
      antennaTip.position.y = 0.78 + Math.sin((elapsed - this.clickStartAt) * 20) * 0.05 * Math.max(0, 1 - (elapsed - this.clickStartAt));
    } else {
      antennaTip.position.y = 0.78;
    }
  }
}
