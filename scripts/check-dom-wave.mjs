import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const bytes = await readFile(
  new URL("../public/models/dom.glb", import.meta.url),
);
const { scene: model, animations } = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
const shoulder = model.getObjectByName("Dom_UpperArm_L");
const elbow = model.getObjectByName("Dom_Forearm_L");
const hand = model.getObjectByName("Dom_Hand_L");
const body = model.getObjectByName("Dom_UpperBody");
const root = model.getObjectByName("Dom");
const mixer = new THREE.AnimationMixer(model);
const clip = THREE.AnimationClip.findByName(animations, "Wave");
assert(shoulder && elbow && hand && body && root && clip, "Missing wave rig");
mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1).play();
const start = body.quaternion.clone();
const startRoot = root.quaternion.clone();
const elbowPosition = new THREE.Vector3(),
  handPosition = new THREE.Vector3();
const inverseShoulder = new THREE.Quaternion();
let maxBodyMotion = 0,
  maxRootMotion = 0;
for (let i = 0; i <= 120; i++) {
  mixer.setTime((i / 120) * (clip.duration - 0.001));
  model.updateMatrixWorld(true);
  elbow.getWorldPosition(elbowPosition);
  hand.getWorldPosition(handPosition);
  shoulder.getWorldQuaternion(inverseShoulder).invert();
  const forearm = handPosition
    .sub(elbowPosition)
    .normalize()
    .applyQuaternion(inverseShoulder);
  assert(
    Math.abs(forearm.x) < 0.01,
    "Elbow bends sideways outside its hinge plane",
  );
  assert(forearm.z >= 0, "Elbow bends backward instead of toward the front");
  maxBodyMotion = Math.max(maxBodyMotion, body.quaternion.angleTo(start));
  maxRootMotion = Math.max(maxRootMotion, root.quaternion.angleTo(startRoot));
}
assert(maxBodyMotion > 0.04, "Torso stays rigid during the greeting");
assert(maxRootMotion > 0.01, "Weight shift is missing");
assert(body.quaternion.angleTo(start) < 0.001, "Torso does not return to rest");
console.log(
  "Wave check passed: elbow flexes forward through 121 poses; torso and whole-body motion return smoothly to rest.",
);
