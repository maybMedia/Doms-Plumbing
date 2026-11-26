import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createDomHoverTest } from "../src/lib/dom-hover.ts";

const bytes = await readFile(
  new URL("../public/models/dom.glb", import.meta.url),
);
const { scene: model, animations } = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
model.rotation.y = -0.12;
model.updateMatrixWorld(true);
// Hover must not regress to CPU skinning or triangle picking, even while waving.
model.traverse((object) => {
  if (!object.isMesh) return;
  object.raycast = () => assert.fail("Hover raycast a render mesh");
  if (object.isSkinnedMesh) {
    object.getVertexPosition = () => assert.fail("Hover sampled a skin vertex");
    object.computeBoundingSphere = () =>
      assert.fail("Hover recalculated skin bounds");
  }
});
const hover = createDomHoverTest(model);
const view = new THREE.Vector3(0, -0.5, -9).normalize();
function rayTo(point) {
  return new THREE.Ray(point.clone().addScaledVector(view, -10), view.clone());
}
for (const [name, point] of [
  ["Dom_HeadIdle", [0, 0, 0]],
  ["Dom_UpperBody", [0, 0.8, 0]],
  ["Dom_Leg_L", [0, 0, 0]],
]) {
  const node = model.getObjectByName(name);
  assert(node, `Missing hover target ${name}`);
  const ray = rayTo(node.localToWorld(new THREE.Vector3(...point)));
  const original = ray.clone();
  assert(hover(ray), `Hover missed ${name}`);
  assert(ray.equals(original), "Hover mutated the caller's ray");
}
const mixer = new THREE.AnimationMixer(model);
const wave = THREE.AnimationClip.findByName(animations, "Wave");
assert(wave, "Missing wave clip");
mixer.clipAction(wave).play();
const hand = model.getObjectByName("Dom_Hand_L");
assert(hand, "Missing waving hand");
for (const time of [0, 0.65, 1.45, 2.8, 3.39]) {
  mixer.setTime(time);
  model.updateMatrixWorld(true);
  assert(
    hover(rayTo(hand.localToWorld(new THREE.Vector3(0, -0.16, 0)))),
    `Hover lost the waving hand at ${time}s`,
  );
}
const empty = rayTo(new THREE.Vector3(-4, 4, 0));
assert.equal(hover(empty), false, "Hover activates in empty hero space");
const started = performance.now();
for (let i = 0; i < 10000; i++) hover(empty);
console.log(
  `Hover check passed: animated targets follow their bones; no skinning or mesh raycasts. 10,000 checks took ${(performance.now() - started).toFixed(1)} ms.`,
);
