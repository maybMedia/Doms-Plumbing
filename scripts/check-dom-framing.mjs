import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { fitDomCamera } from "../src/lib/dom-framing.ts";

const bytes = await readFile(
  new URL("../public/models/dom.glb", import.meta.url),
);
const { scene: model, animations } = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
model.rotation.y = -0.12;
model.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(model, true);
const camera = new THREE.OrthographicCamera(-2, 2, 3, -3, 0.1, 30);
camera.position.set(0, 3.45, 9);
camera.lookAt(0, 2.95, 0);
const mixer = new THREE.AnimationMixer(model);
for (const clip of animations) mixer.clipAction(clip).play();
const point = new THREE.Vector3();
let checked = 0;
for (const [width, height] of [
  [750, 680],
  [600, 476],
  [363, 416],
  [330, 440],
  [280, 440],
]) {
  fitDomCamera(camera, bounds, width, height);
  for (const time of [0, 1.45, 3, 4.5]) {
    mixer.setTime(time);
    model.updateMatrixWorld(true);
    model.traverse((object) => {
      if (!object.isMesh) return;
      for (let i = 0; i < object.geometry.attributes.position.count; i++) {
        object.getVertexPosition(i, point);
        point.applyMatrix4(object.matrixWorld).project(camera);
        assert(
          Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1,
          `${object.name} clips at ${width}×${height}, time ${time}: ${point.toArray()}`,
        );
        checked++;
      }
    });
  }
}
console.log(
  `Full-body framing passed: ${checked} vertex checks, including complete boots and animated poses.`,
);
