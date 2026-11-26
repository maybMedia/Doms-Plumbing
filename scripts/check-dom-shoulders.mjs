import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Check the exported asset, including its skin bindings. A hidden arm root must
// stay behind the shirt in the actual hero view throughout the greeting.
const bytes = await readFile(
  new URL("../public/models/dom.glb", import.meta.url),
);
const { scene: model, animations } = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
model.rotation.y = -0.12;
model.updateMatrixWorld(true);
const arm = model.getObjectByName("Dom_ContinuousArm_L");
const shirt = model.getObjectByName("Dom_ContinuousShirt");
assert(arm?.isSkinnedMesh && shirt?.isSkinnedMesh, "Missing character meshes");
const shoulder = model.getObjectByName("Dom_UpperArm_L");
const toShoulder = shoulder.matrixWorld
  .clone()
  .invert()
  .multiply(arm.matrixWorld);
const point = new THREE.Vector3();
const candidates = [];
for (let i = 0; i < arm.geometry.attributes.position.count; i++) {
  point.fromBufferAttribute(arm.geometry.attributes.position, i);
  point.applyMatrix4(toShoulder);
  if (-point.y < 0.425 && point.z > -0.02) candidates.push(i);
}
assert(candidates.length > 0, "No hidden arm-root vertices to check");
const stride = Math.max(1, Math.floor(candidates.length / 36));
const samples = candidates.filter((_, index) => index % stride === 0);
const mixer = new THREE.AnimationMixer(model);
const wave = THREE.AnimationClip.findByName(animations, "Wave");
assert(wave, "Missing greeting animation");
mixer.clipAction(wave).setLoop(THREE.LoopOnce, 1).play();
const view = new THREE.Vector3(0, -0.5, -9).normalize();
const ray = new THREE.Raycaster();
let checked = 0;
const exposed = [];
for (let step = 0; step <= 20; step++) {
  const time = (step * (wave.duration - 0.01)) / 20;
  mixer.setTime(time);
  model.updateMatrixWorld(true);
  arm.computeBoundingSphere();
  shirt.computeBoundingSphere();
  for (const index of samples) {
    arm.getVertexPosition(index, point);
    point.applyMatrix4(arm.matrixWorld);
    ray.set(point.clone().addScaledVector(view, -10), view);
    const first = ray.intersectObjects([arm, shirt], false)[0];
    checked++;
    if (first?.object === arm && Math.abs(first.distance - 10) < 0.012) {
      exposed.push({ time: time.toFixed(3), vertex: index });
    }
  }
}
assert.equal(
  exposed.length,
  0,
  `Arm root breaks through the sleeve: ${JSON.stringify(exposed.slice(0, 8))}`,
);
console.log(
  `Shoulder check passed: ${checked} visibility checks across 21 wave poses.`,
);
