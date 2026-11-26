import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { TessellateModifier } from "three/addons/modifiers/TessellateModifier.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import {
  sculptSurface,
  smoothUnion,
  ellipsoid,
  capsuleDistance,
  skinGeometry,
} from "./dom-sculpt.mjs";

// A locally authored, articulated cartoon likeness of the supplied photograph.
// Front is +Z. The character's left side is +X when viewed from the front.
export function createDomModel() {
  const root = new THREE.Group();
  root.name = "Dom";
  root.userData.description =
    "Cartoon Dom: short dark textured hair, moustache and goatee, navy work shirt, silver stud and plumbing tool belt.";
  const sphereGeometry = new THREE.SphereGeometry(1, 32, 20);
  const materials = {};
  const material = (name, color, roughness = 0.8, metalness = 0) => {
    const result = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
    });
    result.name = name;
    materials[name] = result;
    return result;
  };
  const skin = material("Warm tan skin", "#b98161", 0.84);
  const earSkin = material("Ear inner", "#b8755b", 0.9);
  const shirt = material("Navy cotton work shirt", "#183557", 0.95);
  const shirtDetail = material("Pocket and collar fabric", "#234365", 0.96);
  const shirtSeam = material("Blue stitching", "#456382", 1);
  const trousers = material("Navy work trousers", "#1c3044", 0.98);
  const trouserDetail = material("Knee fabric", "#293f53", 1);
  const leather = material("Leather belt and boots", "#302a26", 0.92);
  const sole = material("Boot soles", "#20242a", 0.98);
  const hair = material("Dark hair", "#24211d", 0.94);
  const mouth = material("Smile interior", "#652c29", 1);
  const teeth = material("Smile", "#fff3dc", 0.75);
  const white = material("Eye white", "#fff8ef", 0.6);
  const pupil = material("Pupils", "#171b1e", 0.6);
  const iris = material("Brown irises", "#694734", 0.7);
  const eyelid = material("Eyelid creases", "#9d6d54", 0.95);
  const lip = material("Natural lip", "#a9614f", 0.95);
  const metal = material("Silver fittings", "#becbd0", 0.32, 0.75);
  const red = material("Pipe wrench red", "#c84232", 0.72);
  const badge = material("Shirt badge", "#12263c", 0.95);

  let index = 0;
  const group = (name, parent, position = [0, 0, 0]) => {
    const result = new THREE.Group();
    result.name = name;
    result.position.set(...position);
    parent.add(result);
    return result;
  };
  const mesh = (
    geometry,
    mat,
    parent,
    position = [0, 0, 0],
    scale = [1, 1, 1],
  ) => {
    const result = new THREE.Mesh(geometry, mat);
    result.name = "Dom_detail_" + index++;
    result.position.set(...position);
    result.scale.set(...scale);
    result.castShadow = true;
    result.receiveShadow = true;
    parent.add(result);
    return result;
  };
  const sphere = (parent, mat, position, scale) =>
    mesh(sphereGeometry, mat, parent, position, scale);
  const box = (parent, mat, position, size, radius = 0.04) =>
    mesh(new RoundedBoxGeometry(...size, 3, radius), mat, parent, position);
  const capsule = (parent, mat, position, radius, length, scale = [1, 1, 1]) =>
    mesh(
      new THREE.CapsuleGeometry(radius, length, 6, 16),
      mat,
      parent,
      position,
      scale,
    );
  const tube = (parent, mat, points, radius = 0.015) =>
    mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        20,
        radius,
        7,
        false,
      ),
      mat,
      parent,
    );
  const shape = (parent, mat, points, z, depth = 0.025) => {
    const outline = new THREE.Shape();
    outline.moveTo(...points[0]);
    for (const point of points.slice(1)) outline.lineTo(...point);
    outline.closePath();
    return mesh(
      new THREE.ExtrudeGeometry(outline, {
        depth,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.012,
        bevelThickness: 0.012,
      }),
      mat,
      parent,
      [0, 0, z],
    );
  };

  // Legs, work boots and a relaxed stance.
  for (const side of [-1, 1]) {
    const leg = group(side === 1 ? "Dom_Leg_L" : "Dom_Leg_R", root, [
      side * 0.34,
      1.03,
      0,
    ]);
    leg.rotation.z = -side * 0.025;
    capsule(leg, trousers, [0, 0.07, 0], 0.245, 1.28, [1, 1, 0.91]);
    box(leg, trouserDetail, [0, -0.13, 0.19], [0.34, 0.43, 0.075], 0.055);
    tube(
      leg,
      shirtSeam,
      [
        [side * 0.18, 0.58, 0.12],
        [side * 0.18, -0.26, 0.12],
        [side * 0.16, -0.54, 0.12],
      ],
      0.008,
    );
    const boots = group("Dom_Boot_" + (side === 1 ? "L" : "R"), root);
    const boot = box(
      boots,
      leather,
      [side * 0.36, 0.25, 0.135],
      [0.52, 0.43, 0.83],
      0.11,
    );
    boot.rotation.y = -side * 0.045;
    box(boots, sole, [side * 0.36, 0.075, 0.15], [0.54, 0.135, 0.85], 0.045);
    box(boots, leather, [side * 0.36, 0.43, -0.04], [0.44, 0.32, 0.47], 0.065);
    for (let lace = 0; lace < 3; lace++) {
      tube(
        boots,
        sole,
        [
          [side * 0.36 - 0.12, 0.39 - lace * 0.028, 0.32 + lace * 0.075],
          [side * 0.36 + 0.12, 0.39 - lace * 0.028, 0.32 + lace * 0.075],
        ],
        0.009,
      );
    }
    root.updateMatrixWorld(true);
    leg.attach(boots);
  }

  const upper = group("Dom_UpperBody", root, [0, 1.85, 0]);
  // A continuous elliptical shirt surface replaces the flat-fronted box.
  const torsoCurve = new THREE.CatmullRomCurve3(
    [
      [0, -0.81],
      [0.41, -0.79],
      [0.54, -0.7],
      [0.57, -0.49],
      [0.63, -0.12],
      [0.69, 0.26],
      [0.69, 0.45],
      [0.6, 0.64],
      [0.42, 0.77],
      [0.24, 0.82],
      [0, 0.82],
    ].map(([radius, y]) => new THREE.Vector3(radius, y, 0)),
    false,
    "catmullrom",
    0.25,
  );
  const profile = torsoCurve
    .getPoints(72)
    .map((point) => new THREE.Vector2(Math.max(0, point.x), point.y));
  const surface = [...profile].sort((a, b) => a.y - b.y);
  function frontZ(x, y) {
    const height = y - 0.8;
    const next = surface.findIndex((point) => point.y >= height);
    const a = surface[Math.max(0, next - 1)];
    const b = surface[next < 0 ? surface.length - 1 : next];
    const alpha =
      b.y === a.y
        ? 0
        : THREE.MathUtils.clamp((height - a.y) / (b.y - a.y), 0, 1);
    const radius = THREE.MathUtils.lerp(a.x, b.x, alpha);
    return 0.56 * Math.sqrt(Math.max(0, radius * radius - x * x));
  }
  function roundedOutline(width, height, radius) {
    const outline = new THREE.Shape();
    const x = -width / 2,
      y = -height / 2;
    outline.moveTo(x + radius, y);
    outline.lineTo(x + width - radius, y);
    outline.quadraticCurveTo(x + width, y, x + width, y + radius);
    outline.lineTo(x + width, y + height - radius);
    outline.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height,
    );
    outline.lineTo(x + radius, y + height);
    outline.quadraticCurveTo(x, y + height, x, y + height - radius);
    outline.lineTo(x, y + radius);
    outline.quadraticCurveTo(x, y, x + radius, y);
    return outline;
  }
  function panel(mat, x, y, width, height, radius, offset = 0.012) {
    let geometry = new THREE.ExtrudeGeometry(
      roundedOutline(width, height, radius),
      {
        depth: 0.014,
        bevelEnabled: true,
        bevelSize: 0.006,
        bevelThickness: 0.006,
        bevelSegments: 2,
        curveSegments: 8,
      },
    );
    // Subdivide before bending so broad pocket faces follow the shirt instead
    // of cutting through its curved surface.
    geometry = new TessellateModifier(0.065, 6).modify(geometry);
    geometry = mergeVertices(geometry);
    const points = geometry.attributes.position;
    for (let i = 0; i < points.count; i++) {
      const px = points.getX(i) + x,
        py = points.getY(i) + y;
      points.setXYZ(i, px, py, frontZ(px, py) + points.getZ(i) + offset);
    }
    geometry.computeVertexNormals();
    return mesh(geometry, mat, upper);
  }
  panel(shirtDetail, 0, 0.75, 0.07, 1.31, 0.025, 0.006);
  for (let button = 0; button < 6; button++) {
    const y = 0.14 + button * 0.23;
    sphere(upper, sole, [0, y, frontZ(0, y) + 0.035], [0.033, 0.033, 0.014]);
    sphere(
      upper,
      shirtSeam,
      [0.008, y + 0.008, frontZ(0, y) + 0.05],
      [0.007, 0.007, 0.003],
    );
  }
  for (const side of [-1, 1]) {
    const x = side * 0.34;
    panel(shirtDetail, x, 0.81, 0.4, 0.39, 0.055);
    panel(shirt, x, 0.99, 0.405, 0.11, 0.03, 0.033);
    sphere(
      upper,
      sole,
      [x, 0.966, frontZ(x, 0.966) + 0.067],
      [0.023, 0.023, 0.01],
    );
    tube(
      upper,
      shirtSeam,
      [
        [x - 0.165, 0.955],
        [x - 0.165, 0.66],
        [x + 0.165, 0.66],
        [x + 0.165, 0.955],
      ].map(([px, py]) => [px, py, frontZ(px, py) + 0.033]),
      0.005,
    );
  }
  // A short neck sits into the collar and jaw, rather than a tall exposed tube.
  capsule(upper, skin, [0, 1.67, 0], 0.18, 0.12, [1, 1, 0.96]);
  function collar(points, mat) {
    const collarMesh = shape(upper, mat, points, 0, 0.018);
    const positions = collarMesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        y = positions.getY(i);
      const surfaceZ = y > 1.51 ? Math.max(0.17, frontZ(x, y)) : frontZ(x, y);
      positions.setZ(i, positions.getZ(i) + surfaceZ + 0.022);
    }
    collarMesh.geometry.computeVertexNormals();
    return collarMesh;
  }
  collar(
    [
      [-0.18, 1.65],
      [0.18, 1.65],
      [0, 1.33],
    ],
    skin,
  );
  collar(
    [
      [-0.2, 1.65],
      [-0.36, 1.49],
      [-0.2, 1.25],
      [-0.055, 1.38],
    ],
    shirtDetail,
  );
  collar(
    [
      [0.2, 1.65],
      [0.36, 1.49],
      [0.2, 1.25],
      [0.055, 1.38],
    ],
    shirtDetail,
  );
  panel(metal, 0.35, 1.245, 0.39, 0.2, 0.035, 0.015);
  panel(badge, 0.35, 1.245, 0.365, 0.175, 0.027, 0.032);
  box(
    upper,
    red,
    [0.34, 1.275, frontZ(0.34, 1.275) + 0.066],
    [0.18, 0.032, 0.016],
    0.008,
  ).rotation.z = 0.32;
  box(
    upper,
    metal,
    [0.42, 1.305, frontZ(0.42, 1.305) + 0.069],
    [0.057, 0.063, 0.018],
    0.009,
  );
  for (let mark = 0; mark < 5; mark++) {
    const x = 0.23 + mark * 0.058;
    box(
      upper,
      teeth,
      [x, 1.21, frontZ(x, 1.21) + 0.065],
      [0.034, 0.014, 0.007],
      0.003,
    );
  }

  // Leather tool belt, buckle and a compact red pipe wrench.
  box(root, leather, [0, 1.92, 0.01], [1.27, 0.19, 0.76], 0.055);
  box(root, metal, [0, 1.91, 0.415], [0.28, 0.19, 0.055], 0.025);
  box(root, leather, [0, 1.91, 0.449], [0.19, 0.105, 0.013], 0.009);
  box(root, metal, [0.02, 1.91, 0.466], [0.15, 0.016, 0.012], 0.003);
  for (const side of [-1, 1]) {
    box(
      root,
      shirtDetail,
      [side * 0.43, 1.92, 0.399],
      [0.07, 0.25, 0.028],
      0.012,
    );
  }
  const pouch = group("Dom_ToolPouch", root, [0.65, 1.66, 0.12]);
  pouch.rotation.z = -0.1;
  box(pouch, leather, [0, -0.04, 0], [0.28, 0.44, 0.35], 0.05);
  box(pouch, sole, [0, -0.06, 0.19], [0.29, 0.29, 0.075], 0.02);
  box(pouch, metal, [-0.09, 0.1, 0.237], [0.026, 0.026, 0.012], 0.006);
  box(pouch, metal, [0.09, 0.1, 0.237], [0.026, 0.026, 0.012], 0.006);
  const wrench = group("Dom_PipeWrench", pouch, [0, 0.16, -0.012]);
  wrench.rotation.z = -0.12;
  box(wrench, red, [0, 0.17, 0], [0.095, 0.57, 0.075], 0.02);
  box(wrench, metal, [0.032, 0.46, 0], [0.25, 0.095, 0.11], 0.02);
  box(wrench, metal, [-0.064, 0.51, 0], [0.065, 0.2, 0.11], 0.012);
  box(wrench, metal, [0.08, 0.56, 0], [0.21, 0.064, 0.11], 0.014);
  box(wrench, sole, [0.035, 0.39, 0.061], [0.12, 0.085, 0.028], 0.012);
  for (let tooth = 0; tooth < 4; tooth++) {
    box(
      wrench,
      sole,
      [-0.035 + tooth * 0.038, 0.5, 0.057],
      [0.014, 0.025, 0.014],
      0.002,
    );
  }

  // A single shirt surface flows into both sleeves. Each bare arm is also a
  // single surface from its sleeve to its fingertips, deformed by a bone rig.
  const armature = new THREE.Bone();
  armature.name = "Dom_BodyRig";
  upper.add(armature);
  const sleeves = [];
  for (const side of [-1, 1]) {
    const suffix = side === 1 ? "L" : "R";
    const shoulder = new THREE.Bone();
    shoulder.name = "Dom_UpperArm_" + suffix;
    shoulder.position.set(side * 0.65, 1.4, 0);
    shoulder.rotation.z = side * 0.12;
    armature.add(shoulder);
    // Cloth follows the arm's swing, without the upper arm's axial twist.
    // Twisting the entire joined sleeve pulls its inner wall through the skin.
    const sleeve = new THREE.Bone();
    sleeve.name = "Dom_Sleeve_" + suffix;
    sleeve.position.copy(shoulder.position);
    sleeve.quaternion.copy(shoulder.quaternion);
    armature.add(sleeve);
    sleeves.push(sleeve);
    const elbow = new THREE.Bone();
    elbow.name = "Dom_Forearm_" + suffix;
    elbow.position.set(0, -0.68, 0);
    elbow.rotation.x = -0.11;
    shoulder.add(elbow);
    const wrist = new THREE.Bone();
    wrist.name = "Dom_Hand_" + suffix;
    wrist.position.set(0, -0.55, 0);
    elbow.add(wrist);

    let geometry = sculptSurface(
      [
        [-0.35, -1.74, -0.26],
        [0.35, 0.12, 0.26],
      ],
      (x, y, z) => {
        const d = -y;
        const radius =
          d < 0.69
            ? THREE.MathUtils.lerp(
                0.18,
                0.15,
                THREE.MathUtils.smoothstep(d, 0.35, 0.69),
              )
            : THREE.MathUtils.lerp(
                0.15,
                0.105,
                THREE.MathUtils.smoothstep(d, 0.85, 1.17),
              );
        let distance = Math.max(
          (Math.hypot(x, z / 0.92) - radius) * 0.92,
          0.38 - d,
          d - 1.2,
        );
        distance = smoothUnion(
          distance,
          ellipsoid(x, y + 1.33, z - 0.006, 0.146, 0.18, 0.099),
          0.09,
        );
        for (let finger = 0; finger < 4; finger++) {
          const fx = -0.092 + finger * 0.061;
          distance = smoothUnion(
            distance,
            capsuleDistance(
              x,
              y,
              z,
              [fx, -1.4, 0.014],
              [fx, -1.55 + Math.abs(finger - 1.5) * 0.024, 0.014],
              0.034,
            ),
            0.025,
          );
        }
        return smoothUnion(
          distance,
          capsuleDistance(
            x,
            y,
            z,
            [-side * 0.105, -1.27, 0.012],
            [-side * 0.196, -1.39, 0.033],
            0.055,
          ),
          0.065,
        );
      },
    );
    geometry = skinGeometry(geometry, (_x, y) => {
      const d = -y;
      const elbowWeight = THREE.MathUtils.smoothstep(d, 0.49, 0.89);
      const wristWeight = THREE.MathUtils.smoothstep(d, 1.04, 1.27);
      return [
        [0, 1, 2, 0],
        [1 - elbowWeight, elbowWeight * (1 - wristWeight), wristWeight, 0],
      ];
    });
    const armTransform = new THREE.Matrix4().compose(
      shoulder.position,
      shoulder.quaternion,
      new THREE.Vector3(1, 1, 1),
    );
    // Curl the fingers into the palm (-Z) when gripping the belt wrench.
    // Keep the open hand as the base shape for standing and waving.
    let gripGeometry;
    if (side === 1) {
      gripGeometry = geometry.clone();
      const points = gripGeometry.attributes.position;
      for (let i = 0; i < points.count; i++) {
        const x = points.getX(i),
          y = points.getY(i),
          z = points.getZ(i);
        const curl = THREE.MathUtils.smoothstep(-y, 1.39, 1.52);
        let gx = x,
          gy = y,
          gz = z;
        if (x > -0.135 && -y > 1.39) {
          const angle = Math.min(1.9, (-y - 1.39) / 0.085);
          gy = -1.39 - 0.085 * Math.sin(angle);
          gz -= 0.085 * (1 - Math.cos(angle));
        } else if (x < -0.12 && -y > 1.29) {
          const pinch =
            THREE.MathUtils.smoothstep(-x, 0.12, 0.2) *
            THREE.MathUtils.smoothstep(-y, 1.29, 1.38);
          gx = THREE.MathUtils.lerp(x, -0.08, pinch * 0.7);
          gz = THREE.MathUtils.lerp(z, -0.075, pinch);
        }
        points.setXYZ(i, gx, gy + curl * 0.008, gz);
      }
      gripGeometry.applyMatrix4(armTransform);
      gripGeometry.computeVertexNormals();
    }
    geometry.applyMatrix4(armTransform);
    if (gripGeometry) {
      const delta = new Float32Array(geometry.attributes.position.count * 3);
      const normalDelta = new Float32Array(delta.length);
      for (let i = 0; i < delta.length; i++) {
        delta[i] =
          gripGeometry.attributes.position.array[i] -
          geometry.attributes.position.array[i];
        normalDelta[i] =
          gripGeometry.attributes.normal.array[i] -
          geometry.attributes.normal.array[i];
      }
      const gripTarget = new THREE.Float32BufferAttribute(delta, 3);
      gripTarget.name = "Grip";
      geometry.morphTargetsRelative = true;
      geometry.morphAttributes.position = [gripTarget];
      geometry.morphAttributes.normal = [
        new THREE.Float32BufferAttribute(normalDelta, 3),
      ];
      gripGeometry.dispose();
    }
    const arm = new THREE.SkinnedMesh(geometry, skin);
    arm.name = "Dom_ContinuousArm_" + suffix;
    arm.castShadow = true;
    arm.receiveShadow = true;
    upper.add(arm);
    root.updateMatrixWorld(true);
    arm.bind(new THREE.Skeleton([shoulder, elbow, wrist]));
    // Apply after binding so the skin turns too: palms inward, thumbs forward.
    wrist.rotation.y = (side * Math.PI) / 2;
  }
  const shirtGeometry = sculptSurface(
    [
      [-1.1, -0.08, -0.49],
      [1.1, 1.81, 0.49],
    ],
    (x, y, z) => {
      const radius = frontZ(0, THREE.MathUtils.clamp(y, 0.04, 1.61)) / 0.56;
      let distance = Math.max(
        (Math.hypot(x, z / 0.56) - radius) * 0.56,
        0.02 - y,
        y - 1.63,
      );
      for (const side of [-1, 1]) {
        const angle = side * 0.12,
          dx = x - side * 0.65,
          dy = y - 1.4;
        const sx = Math.cos(angle) * dx + Math.sin(angle) * dy;
        const sy = -Math.sin(angle) * dx + Math.cos(angle) * dy;
        const sleeve = Math.max(
          capsuleDistance(
            sx,
            sy,
            z / 0.96,
            [0, -0.19, 0],
            [0, -0.34, 0],
            0.235,
          ),
          // Leave enough overlap to hide the arm cap as the shoulder turns.
          -0.46 - sy,
        );
        distance = smoothUnion(distance, sleeve, 0.15);
      }
      return distance;
    },
    88,
  );
  skinGeometry(shirtGeometry, (x, y, z) => {
    const side = x < 0 ? -1 : 1;
    const angle = side * 0.12,
      dx = x - side * 0.65,
      dy = y - 1.4;
    const sx = Math.cos(angle) * dx + Math.sin(angle) * dy;
    const sy = -Math.sin(angle) * dx + Math.cos(angle) * dy;
    const d = -sy;
    const shoulderBlend =
      THREE.MathUtils.smoothstep(Math.abs(x), 0.45, 0.87) *
      THREE.MathUtils.smoothstep(y, 0.82, 1.1);
    // The whole cuff follows the same bone as the skin underneath it. Blend
    // toward the chest above it, instead of anchoring its inner edge to the torso.
    const cuff =
      THREE.MathUtils.smoothstep(d, 0.16, 0.29) *
      (1 - THREE.MathUtils.smoothstep(d, 0.48, 0.6)) *
      (1 - THREE.MathUtils.smoothstep(Math.hypot(sx, z / 0.96), 0.27, 0.39));
    const weight = Math.max(shoulderBlend, cuff);
    return [
      [0, side < 0 ? 1 : 2, 0, 0],
      [1 - weight, weight, 0, 0],
    ];
  });
  const shirtMesh = new THREE.SkinnedMesh(shirtGeometry, shirt);
  shirtMesh.name = "Dom_ContinuousShirt";
  shirtMesh.castShadow = true;
  shirtMesh.receiveShadow = true;
  upper.add(shirtMesh);
  root.updateMatrixWorld(true);
  shirtMesh.bind(new THREE.Skeleton([armature, ...sleeves]));

  const look = group("Dom_HeadLook", upper, [0, 2.4, 0.005]);
  const head = group("Dom_HeadIdle", look);
  head.scale.setScalar(0.84);
  function jawTaper(y) {
    return 1 - 0.1 * THREE.MathUtils.smoothstep(-y, 0.18, 0.82);
  }
  function faceZ(x, y) {
    return (
      0.61 *
      Math.sqrt(
        Math.max(0.005, 1 - (x / (0.67 * jawTaper(y))) ** 2 - (y / 0.85) ** 2),
      )
    );
  }
  // A broader jaw and blended nose retain the softness of the body while
  // giving the face the structure in Dom's portrait.
  const headGeometry = sculptSurface(
    [
      [-0.75, -0.94, -0.69],
      [0.75, 0.94, 0.81],
    ],
    (x, y, z) => {
      let distance = ellipsoid(x / jawTaper(y), y, z, 0.67, 0.85, 0.61);
      distance = smoothUnion(
        distance,
        ellipsoid(x, y + 0.025, z - 0.597, 0.075, 0.16, 0.083),
        0.045,
      );
      distance = smoothUnion(
        distance,
        ellipsoid(x, y + 0.133, z - 0.66, 0.105, 0.067, 0.083),
        0.045,
      );
      return distance;
    },
    64,
  );
  mesh(headGeometry, skin, head);
  for (const side of [-1, 1]) {
    sphere(head, skin, [side * 0.65, -0.015, -0.015], [0.14, 0.205, 0.11]);
    sphere(head, earSkin, [side * 0.704, -0.018, 0.078], [0.065, 0.12, 0.025]);
    sphere(head, earSkin, [side * 0.064, -0.164, 0.704], [0.021, 0.012, 0.009]);
  }
  sphere(head, metal, [0.707, -0.135, 0.103], [0.032, 0.032, 0.024]);
  function facePatch(outline, mat, offset = 0.012, depth = 0.008) {
    if (Array.isArray(outline)) {
      const points = outline;
      outline = new THREE.Shape();
      outline.moveTo(...points[0]);
      for (const point of points.slice(1)) outline.lineTo(...point);
      outline.closePath();
    }
    let geometry = new THREE.ExtrudeGeometry(outline, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.007,
      bevelThickness: 0.004,
      bevelSegments: 2,
      curveSegments: 12,
    });
    geometry = new TessellateModifier(0.045, 6).modify(geometry);
    geometry = mergeVertices(geometry);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        y = positions.getY(i);
      positions.setZ(i, positions.getZ(i) + faceZ(x, y) + offset);
    }
    geometry.computeVertexNormals();
    return mesh(geometry, mat, head);
  }
  // Brown almond-shaped eyes and thick brows replace the generic dot eyes.
  for (const side of [-1, 1]) {
    const cx = side * 0.247,
      cy = 0.12,
      cz = faceZ(cx, cy);
    const eye = group(side === 1 ? "Dom_Eye_L" : "Dom_Eye_R", head, [
      cx,
      cy,
      cz,
    ]);
    const eyeGeometry = sphereGeometry.clone();
    const positions = eyeGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i) * 0.122,
        y = positions.getY(i) * 0.058;
      positions.setXYZ(
        i,
        x,
        y,
        faceZ(cx + x, cy + y) - cz + 0.008 + positions.getZ(i) * 0.027,
      );
    }
    eyeGeometry.computeVertexNormals();
    mesh(eyeGeometry, white, eye);
    sphere(eye, iris, [-side * 0.005, -0.002, 0.038], [0.046, 0.044, 0.013]);
    sphere(eye, pupil, [-side * 0.005, -0.002, 0.05], [0.022, 0.029, 0.007]);
    sphere(
      eye,
      white,
      [-side * 0.005 + 0.012, 0.013, 0.057],
      [0.009, 0.009, 0.004],
    );
    const lid = Array.from({ length: 7 }, (_, i) => {
      const angle = (i * Math.PI) / 6;
      const x = 0.122 * Math.cos(angle),
        y = 0.058 * Math.sin(angle);
      return [x, y, faceZ(cx + x, cy + y) - cz + 0.012];
    });
    tube(eye, eyelid, lid, 0.009);
    const brow = new THREE.Shape();
    brow.moveTo(side * 0.105, 0.295);
    brow.quadraticCurveTo(side * 0.245, 0.366, side * 0.39, 0.285);
    brow.lineTo(side * 0.384, 0.26);
    brow.quadraticCurveTo(side * 0.25, 0.315, side * 0.112, 0.27);
    brow.quadraticCurveTo(side * 0.1, 0.277, side * 0.105, 0.295);
    facePatch(brow, hair, 0.012, 0.01);
  }
  const smile = new THREE.Shape();
  smile.moveTo(-0.215, -0.29);
  smile.quadraticCurveTo(0, -0.32, 0.215, -0.29);
  smile.quadraticCurveTo(0.14, -0.42, 0, -0.425);
  smile.quadraticCurveTo(-0.14, -0.42, -0.215, -0.29);
  facePatch(smile, mouth, 0.013);
  const toothLine = new THREE.Shape();
  toothLine.moveTo(-0.18, -0.311);
  toothLine.quadraticCurveTo(0, -0.341, 0.18, -0.311);
  toothLine.lineTo(0.143, -0.366);
  toothLine.quadraticCurveTo(0, -0.398, -0.143, -0.366);
  toothLine.closePath();
  facePatch(toothLine, teeth, 0.03, 0.006);
  tube(
    head,
    lip,
    [
      [-0.15, -0.4],
      [0, -0.434],
      [0.15, -0.4],
    ].map(([x, y]) => [x, y, faceZ(x, y) + 0.026]),
    0.012,
  );
  // Dom's narrow moustache and shaped goatee follow the face surface.
  for (const side of [-1, 1]) {
    facePatch(
      [
        [0.03, -0.226],
        [0.085, -0.21],
        [0.17, -0.235],
        [0.216, -0.273],
        [0.211, -0.286],
        [0.16, -0.257],
        [0.085, -0.242],
        [0.033, -0.253],
      ].map(([x, y]) => [side * x, y]),
      hair,
      0.017,
      0.007,
    );
  }
  const soulPatch = new THREE.Shape();
  soulPatch.absellipse(0, -0.483, 0.038, 0.018, 0, Math.PI * 2, false, 0);
  facePatch(soulPatch, hair, 0.013, 0.006);
  const goatee = new THREE.Shape();
  goatee.moveTo(-0.082, -0.552);
  goatee.quadraticCurveTo(-0.143, -0.58, -0.125, -0.65);
  goatee.quadraticCurveTo(0, -0.735, 0.125, -0.65);
  goatee.quadraticCurveTo(0.143, -0.58, 0.082, -0.552);
  goatee.quadraticCurveTo(0, -0.58, -0.082, -0.552);
  facePatch(goatee, hair, 0.013, 0.006);

  // A continuous short quiff, with fine irregular ridges rather than separate
  // locks, follows Dom's cropped sides and textured, swept-up hair.
  const hairGeometry = sculptSurface(
    [
      [-0.79, -0.25, -0.73],
      [0.79, 1.12, 0.76],
    ],
    (x, y, z) => {
      const hairline =
        THREE.MathUtils.lerp(
          -0.11,
          0.54,
          THREE.MathUtils.smoothstep(z, -0.06, 0.44),
        ) +
        0.012 * Math.sin(x * 19);
      const lift =
        0.055 *
        Math.exp(-(((z - 0.25) / 0.32) ** 2)) *
        THREE.MathUtils.smoothstep(y, 0.38, 0.8);
      const distance = ellipsoid(
        x,
        y - 0.012 - lift,
        z + 0.025,
        0.7,
        0.89,
        0.66,
      );
      const texture =
        (0.014 * Math.sin(x * 41 + z * 7) * Math.sin(z * 37 - x * 5) +
          0.008 * Math.sin(x * 64 - z * 19) +
          0.006 * Math.sin(z * 57 + x * 12)) *
        THREE.MathUtils.smoothstep(y, 0.43, 0.73);
      return Math.max(distance + texture, hairline - y);
    },
    80,
  );
  mesh(hairGeometry, hair, head);

  root.updateMatrixWorld(true);
  const quaternionValues = (angles, order = "XYZ") =>
    angles.flatMap(([x, y, z]) =>
      new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(x, y, z, order))
        .toArray(),
    );
  const idleTimes = [0, 1.5, 3, 4.5, 6];
  const idle = new THREE.AnimationClip("Idle", 6, [
    new THREE.VectorKeyframeTrack(
      "Dom_UpperBody.scale",
      idleTimes,
      [1, 1, 1, 1.008, 1.014, 1.008, 1, 1, 1, 1.008, 1.014, 1.008, 1, 1, 1],
    ),
    new THREE.QuaternionKeyframeTrack(
      "Dom_HeadIdle.quaternion",
      idleTimes,
      quaternionValues([
        [0.015, -0.025, 0.012],
        [0, 0.025, -0.012],
        [-0.012, 0.015, 0.008],
        [0, -0.02, -0.008],
        [0.015, -0.025, 0.012],
      ]),
    ),
    ...["Dom_Eye_L", "Dom_Eye_R"].map(
      (name) =>
        new THREE.VectorKeyframeTrack(
          name + ".scale",
          [0, 4.05, 4.15, 4.26, 6],
          [1, 1, 1, 1, 1, 1, 1, 0.09, 1, 1, 1, 1, 1, 1, 1],
        ),
    ),
  ]);
  // Sample a C2-continuous lift/return and a gently enveloped wrist wave.
  // Dense quaternion samples retain the easing in the exported GLB.
  const duration = 3.4;
  const waveTimes = Array.from({ length: 205 }, (_, i) => (i * duration) / 204);
  const clamp01 = (value) => THREE.MathUtils.clamp(value, 0, 1);
  const smoother = (value) => {
    const x = clamp01(value);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };
  const poses = waveTimes.map((time) => {
    const lift = smoother(time / 0.9) * (1 - smoother((time - 2.45) / 0.95));
    const progress = clamp01((time - 0.9) / 1.55);
    const envelope = Math.sin(Math.PI * progress);
    const sway = Math.sin(progress * Math.PI * 4) * envelope * envelope;
    const bodyLift = smoother(time / 0.7) * (1 - smoother((time - 2.5) / 0.9));
    return {
      // Abduct and externally rotate at the shoulder. The elbow then flexes
      // forward around its local X hinge instead of folding sideways in Z.
      shoulder: [-0.06 * lift, 1.35 * lift, 0.12 + 1.28 * lift],
      elbow: [-0.11 - 1.8 * lift + 0.025 * sway, 0, 0],
      hand: [
        0.035 * sway,
        THREE.MathUtils.lerp(Math.PI / 2, Math.PI - 1.5, lift),
        0.2 * sway,
      ],
      body: [
        -0.015 * bodyLift,
        -0.065 * bodyLift,
        0.028 * bodyLift + 0.008 * sway,
      ],
      root: [0, -0.025 * bodyLift, 0.006 * bodyLift],
      head: [-0.025 * bodyLift, 0.02 * bodyLift, -0.015 * bodyLift],
      otherArm: [-0.03 * bodyLift, -0.04 * bodyLift, -0.12 - 0.04 * bodyLift],
    };
  });
  const wave = new THREE.AnimationClip("Wave", duration, [
    new THREE.QuaternionKeyframeTrack(
      "Dom_UpperArm_L.quaternion",
      waveTimes,
      quaternionValues(
        poses.map((pose) => pose.shoulder),
        "ZYX",
      ),
    ),
    new THREE.QuaternionKeyframeTrack(
      "Dom_Forearm_L.quaternion",
      waveTimes,
      quaternionValues(poses.map((pose) => pose.elbow)),
    ),
    new THREE.QuaternionKeyframeTrack(
      "Dom_Hand_L.quaternion",
      waveTimes,
      quaternionValues(
        poses.map((pose) => pose.hand),
        "YZX",
      ),
    ),
  ]);
  wave.tracks.push(
    ...["L", "R"].map(
      (side) =>
        new THREE.QuaternionKeyframeTrack(
          "Dom_Sleeve_" + side + ".quaternion",
          waveTimes,
          poses.flatMap((pose) => {
            const angles = side === "L" ? pose.shoulder : pose.otherArm;
            const rotation = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(...angles, side === "L" ? "ZYX" : "XYZ"),
            );
            const axis = new THREE.Vector3(0, -1, 0);
            return new THREE.Quaternion()
              .setFromUnitVectors(axis, axis.clone().applyQuaternion(rotation))
              .toArray();
          }),
        ),
    ),
    new THREE.QuaternionKeyframeTrack(
      "Dom_UpperBody.quaternion",
      waveTimes,
      quaternionValues(poses.map((pose) => pose.body)),
    ),
    new THREE.QuaternionKeyframeTrack(
      "Dom.quaternion",
      waveTimes,
      quaternionValues(poses.map((pose) => pose.root)),
    ),
    new THREE.QuaternionKeyframeTrack(
      "Dom_HeadIdle.quaternion",
      waveTimes,
      quaternionValues(poses.map((pose) => pose.head)),
    ),
    new THREE.QuaternionKeyframeTrack(
      "Dom_UpperArm_R.quaternion",
      waveTimes,
      quaternionValues(poses.map((pose) => pose.otherArm)),
    ),
  );
  return { root, animations: [idle, wave] };
}
