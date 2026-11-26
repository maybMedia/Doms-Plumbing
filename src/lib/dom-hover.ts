import * as THREE from "three";

// Hover only needs a recognisable silhouette. These bone-attached ellipsoids
// avoid evaluating skin vertices or intersecting the detailed render meshes.
export function createDomHoverTest(model: THREE.Object3D) {
  const volumes: { node: THREE.Object3D; local: THREE.Matrix4 }[] = [];
  function add(
    name: string,
    position: [number, number, number],
    scale: [number, number, number],
  ) {
    const node = model.getObjectByName(name);
    if (!node) return;
    volumes.push({
      node,
      local: new THREE.Matrix4().compose(
        new THREE.Vector3(...position),
        new THREE.Quaternion(),
        new THREE.Vector3(...scale),
      ),
    });
  }
  add("Dom_HeadIdle", [0, 0, 0], [0.67, 0.85, 0.61]);
  add("Dom_HeadIdle", [0, 0.68, 0], [0.65, 0.3, 0.62]);
  add("Dom_UpperBody", [0, 0.8, 0], [0.69, 0.82, 0.4]);
  add("Dom", [0, 1.88, 0], [0.65, 0.23, 0.4]);
  add("Dom_ToolPouch", [0, -0.04, 0.05], [0.19, 0.25, 0.22]);
  add("Dom_PipeWrench", [0, 0.32, 0], [0.14, 0.3, 0.09]);
  for (const side of [-1, 1]) {
    const suffix = side === 1 ? "L" : "R";
    add("Dom_HeadIdle", [side * 0.67, 0, 0], [0.13, 0.21, 0.11]);
    add("Dom_UpperArm_" + suffix, [0, -0.2, 0], [0.24, 0.3, 0.23]);
    add("Dom_UpperArm_" + suffix, [0, -0.55, 0], [0.18, 0.21, 0.17]);
    add("Dom_Forearm_" + suffix, [0, -0.27, 0], [0.15, 0.31, 0.15]);
    add("Dom_Hand_" + suffix, [0, -0.16, 0.01], [0.17, 0.23, 0.12]);
    add("Dom_Leg_" + suffix, [0, 0.05, 0], [0.25, 0.89, 0.23]);
    add("Dom", [side * 0.36, 0.25, 0.15], [0.28, 0.25, 0.45]);
  }

  const inverse = new THREE.Matrix4();
  const localRay = new THREE.Ray();
  const unitSphere = new THREE.Sphere(new THREE.Vector3(), 1);
  return (ray: THREE.Ray) => {
    // matrixWorld is already updated by rendering, including animated bones.
    for (const volume of volumes) {
      inverse.multiplyMatrices(volume.node.matrixWorld, volume.local).invert();
      localRay.copy(ray).applyMatrix4(inverse);
      if (localRay.intersectsSphere(unitSphere)) return true;
    }
    return false;
  };
}
