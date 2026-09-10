import * as THREE from 'three';

/**
 * 模型暴露给动画控制器的可动部件。
 */
export interface PetModelParts {
  /** 整体根 Group（所有子部件的父） */
  group: THREE.Group;
  /** 头部 */
  head: THREE.Group;
  /** 身体 */
  body: THREE.Mesh;
  /** 左臂 */
  leftArm: THREE.Group;
  /** 右臂 */
  rightArm: THREE.Group;
  /** 左眼（外层，用于眨眼时缩放） */
  leftEye: THREE.Group;
  /** 右眼 */
  rightEye: THREE.Group;
  /** 眼睛的瞳孔（可切换几何体做"开心表情"） */
  leftPupil: THREE.Mesh;
  rightPupil: THREE.Mesh;
  /** 天线顶部小球 */
  antennaTip: THREE.Mesh;
}

export interface PetModelPalette {
  /** 主色（hex 数字） */
  primary: number;
  /** 辅色（hex 数字） */
  secondary: number;
  /** 深色细节（瞳孔等） */
  detail: number;
}

/** 把颜色字符串转为 THREE.Color */
function toColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

/**
 * 参数化构建一个 3D 卡通机器人模型。
 *
 * 使用 SphereGeometry + CylinderGeometry + CapsuleGeometry 组合，
 * 零外部资源依赖。返回 THREE.Group 及其可动子部件引用。
 *
 * @param palette 颜色方案
 */
export function createPetModel(palette: PetModelPalette): PetModelParts {
  const group = new THREE.Group();

  const primaryColor = toColor(('#' + palette.primary.toString(16).padStart(6, '0')));
  const secondaryColor = toColor(('#' + palette.secondary.toString(16).padStart(6, '0')));
  const detailColor = toColor(('#' + palette.detail.toString(16).padStart(6, '0')));

  // 主色材质（金属质感偏卡通，粗糙度中等）
  const primaryMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: 0.55,
    metalness: 0.15,
    flatShading: false
  });
  // 辅色材质（白色机身）
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: secondaryColor,
    roughness: 0.6,
    metalness: 0.1
  });
  // 深色细节材质
  const detailMat = new THREE.MeshStandardMaterial({
    color: detailColor,
    roughness: 0.4,
    metalness: 0.2
  });
  // 眼睛白球材质
  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xffffff),
    roughness: 0.3,
    metalness: 0.0
  });
  // 高光材质
  const highlightMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xffffff),
    transparent: true,
    opacity: 0.9
  });

  // ============= 头部 =============
  const head = new THREE.Group();
  head.position.set(0, 0.85, 0);

  // 头壳（略微压扁的球）
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.62, 40, 32), primaryMat);
  headMesh.scale.set(1, 0.88, 0.92);
  head.add(headMesh);

  // 面部面板（稍微凸起，白色）
  const facePlate = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.55),
    secondaryMat
  );
  facePlate.position.set(0, -0.05, 0.15);
  facePlate.scale.set(1, 1, 0.4);
  head.add(facePlate);

  // 眼睛：外圈白色 + 内圈瞳孔 + 高光
  const makeEye = (side: -1 | 1): { container: THREE.Group; pupil: THREE.Mesh } => {
    const container = new THREE.Group();
    container.position.set(side * 0.22, 0.05, 0.42);

    // 眼白
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 16), eyeWhiteMat);
    container.add(eyeWhite);

    // 瞳孔（稍后可能替换几何体做表情）
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), detailMat);
    pupil.position.z = 0.08;
    container.add(pupil);

    // 高光小点
    const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), highlightMat);
    highlight.position.set(0.025, 0.025, 0.115);
    container.add(highlight);

    return { container, pupil };
  };

  const leftEyeGroup = makeEye(-1);
  const rightEyeGroup = makeEye(1);
  head.add(leftEyeGroup.container);
  head.add(rightEyeGroup.container);

  // 嘴巴（小胶囊形）
  const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.12, 6, 10), detailMat);
  mouth.position.set(0, -0.22, 0.44);
  mouth.rotation.z = Math.PI / 2;
  head.add(mouth);

  // 天线（顶部小圆柱 + 小球）
  const antennaBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 12), detailMat);
  antennaBase.position.set(0, 0.6, 0);
  head.add(antennaBase);

  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), primaryMat);
  antennaTip.position.set(0, 0.78, 0);
  head.add(antennaTip);

  // 腮红（可选，柔和小球）
  const blushMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xff9fb0),
    transparent: true,
    opacity: 0.55
  });
  const leftBlush = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), blushMat);
  leftBlush.position.set(-0.32, -0.08, 0.42);
  leftBlush.scale.set(1, 0.6, 0.3);
  head.add(leftBlush);
  const rightBlush = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), blushMat);
  rightBlush.position.set(0.32, -0.08, 0.42);
  rightBlush.scale.set(1, 0.6, 0.3);
  head.add(rightBlush);

  group.add(head);

  // ============= 身体 =============
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.5, 8, 20), secondaryMat);
  body.position.set(0, -0.05, 0);
  body.scale.set(1, 1, 0.85);
  group.add(body);

  // 胸口装饰圆环（主色）
  const chestRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.035, 12, 32),
    primaryMat
  );
  chestRing.position.set(0, -0.05, 0.38);
  group.add(chestRing);
  // 胸口核心小球（发光感）
  const chestCore = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), primaryMat);
  chestCore.position.set(0, -0.05, 0.4);
  group.add(chestCore);

  // ============= 手臂 =============
  const makeArm = (side: -1 | 1): THREE.Group => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.48, 0.15, 0);

    // 上臂（胶囊）
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.28, 6, 12), primaryMat);
    upper.position.set(side * 0.03, -0.18, 0);
    upper.rotation.z = side * -0.25;
    arm.add(upper);

    // 手（球）
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), secondaryMat);
    hand.position.set(side * 0.14, -0.42, 0);
    arm.add(hand);

    return arm;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  group.add(leftArm);
  group.add(rightArm);

  // ============= 腿 =============
  const makeLeg = (side: -1 | 1): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.18, -0.55, 0);

    const shaft = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.18, 6, 12), primaryMat);
    shaft.position.y = -0.05;
    leg.add(shaft);

    // 脚（略扁球）
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), detailMat);
    foot.position.set(0, -0.28, 0.04);
    foot.scale.set(1, 0.7, 1.1);
    leg.add(foot);

    return leg;
  };
  group.add(makeLeg(-1));
  group.add(makeLeg(1));

  // ============= 阴影投射（视觉锚定）============
  // 用一个半透明圆盘作为地面阴影，增强立体感
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 24),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
      depthWrite: false
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.set(0, -0.95, 0);
  group.add(shadowDisc);

  return {
    group,
    head,
    body,
    leftArm,
    rightArm,
    leftEye: leftEyeGroup.container,
    rightEye: rightEyeGroup.container,
    leftPupil: leftEyeGroup.pupil,
    rightPupil: rightEyeGroup.pupil,
    antennaTip
  };
}

/**
 * 释放模型内所有几何体与材质，避免显存泄漏。
 */
export function disposePetModel(parts: PetModelParts): void {
  parts.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
  });
}
