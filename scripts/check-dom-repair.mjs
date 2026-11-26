import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createDomRepair } from "../src/lib/dom-repair.ts";

const bytes = await readFile(
  new URL("../public/models/dom.glb", import.meta.url),
);
const { scene: model } = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
model.rotation.y = -0.12;
model.updateMatrixWorld(true);
const target = new THREE.Vector3(2.7, 4.25, 0.45);
const wrench = model.getObjectByName("Dom_PipeWrench");
const pouch = wrench.parent;
const hand = model.getObjectByName("Dom_Hand_L");
const neutralWrist = hand.quaternion.clone();
const arm = model.getObjectByName("Dom_ContinuousArm_L");
const gripTarget = arm.morphTargetDictionary.Grip;
assert.notEqual(gripTarget, undefined, "Missing finger grip");
const boot = model.getObjectByName("Dom_Boot_L");
const restTool = wrench.position.clone();
const initialFoot = boot.getWorldPosition(new THREE.Vector3());
const stages = [];
let flow = 1;
const repair = createDomRepair(
  model,
  (value) => {
    flow = value;
  },
  (stage) => stages.push(stage),
);
repair.setTarget(target);
assert(repair.start(), "Repair did not start");
let maxTravel = 0,
  footMotion = 0,
  contactChecks = 0;
const tighteningHands = [];
const outwardPoses = new Map();
const carryingJoints = ["Dom_UpperArm_L", "Dom_Forearm_L", "Dom_Hand_L"].map(
  (name) => model.getObjectByName(name),
);
for (let frame = 1; frame <= 660; frame++) {
  repair.update(1 / 60);
  const time = frame / 60;
  assert(
    hand.quaternion.angleTo(neutralWrist) < 0.000001,
    "Hand rotates away from the single fixed grip",
  );
  if (time > 1.3 && time < 10) {
    assert.equal(wrench.parent, hand, "Wrench is not fixed in the hand");
    const shaft = new THREE.Vector3(0, 1, 0).applyQuaternion(
      wrench.getWorldQuaternion(new THREE.Quaternion()),
    );
    assert(Math.abs(shaft.y) < 0.0001, "Wrench stops being horizontal");
    assert(
      wrench.position.distanceTo(new THREE.Vector3(0, -0.1, -0.105)) < 0.000001,
      "Wrench moves within the palm",
    );
    assert(
      wrench.quaternion.angleTo(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          Math.PI / 2,
        ),
      ) < 0.000001,
      "Wrench rotates within the grip",
    );
  }
  maxTravel = Math.max(maxTravel, model.position.x);
  footMotion = Math.max(
    footMotion,
    boot.getWorldPosition(new THREE.Vector3()).distanceTo(initialFoot),
  );
  if (time > 1.4 && time < 3.4) {
    outwardPoses.set(
      Math.round((time - 1.3) * 60),
      carryingJoints.map((joint) => joint.quaternion.clone()),
    );
    const carryShaft = new THREE.Vector3(0, 1, 0).applyQuaternion(
      wrench.getWorldQuaternion(new THREE.Quaternion()),
    );
    assert(
      carryShaft.x > 0.5,
      "Carried wrench does not run horizontally across the screen",
    );
  }
  if ((time > 1.4 && time < 3.4) || (time > 7.7 && time < 8.9)) {
    const wristRoll =
      2 * Math.atan2(Math.abs(hand.quaternion.y), Math.abs(hand.quaternion.w));
    assert(
      wristRoll <= Math.PI / 2 + 0.001,
      "Wrist twists too far instead of sharing rotation with the forearm",
    );
  }
  if (time > 7.7 && time < 8.9) {
    const shaft = new THREE.Vector3(0, 1, 0).applyQuaternion(
      wrench.getWorldQuaternion(new THREE.Quaternion()),
    );
    assert(
      shaft.x < -0.5,
      "Return wrench is not the opposite of the outward grip",
    );
    const outward = outwardPoses.get(Math.round((time - 7.2) * 60));
    assert(outward, "Missing matching outward pose");
    carryingJoints.forEach((joint, index) =>
      assert(
        joint.quaternion.angleTo(outward[index]) < 0.0001,
        `${joint.name} twists into a different pose on the walk back`,
      ),
    );
    assert.equal(wrench.parent, hand, "Wrench left the hand during the turn");
  }
  if (time > 4.3 && time < 6.4) {
    assert.equal(wrench.parent, hand, "Dom is not holding the belt wrench");
    const jaw = wrench.localToWorld(new THREE.Vector3(0.035, 0.515, 0));
    assert(
      jaw.distanceTo(target) < 0.04,
      `Wrench missed pipe by ${jaw.distanceTo(target)} at ${time}s`,
    );
    const handleInHand = hand.worldToLocal(
      wrench.localToWorld(new THREE.Vector3(0, 0, 0)),
    );
    assert(
      handleInHand.z < -0.07,
      "Handle is on the back of the hand instead of in the palm",
    );
    assert(
      Math.abs(handleInHand.y + 0.1) < 0.001,
      "Handle is not centred across the palm",
    );
    assert.equal(
      arm.morphTargetInfluences[gripTarget],
      1,
      "Fingers are not wrapped around the handle",
    );
    const handRotation = hand.getWorldQuaternion(new THREE.Quaternion());
    const thumb = new THREE.Vector3(-1, 0, 0).applyQuaternion(handRotation);
    const outward = new THREE.Vector3(1, 0, 0).transformDirection(
      model.matrixWorld,
    );
    assert(thumb.dot(outward) > 0.85, "Thumb points toward Dom's body");
    const facing = new THREE.Vector3(0, 0, 1).transformDirection(
      model.matrixWorld,
    );
    const toPipe = target.clone().sub(model.position).setY(0).normalize();
    assert(
      facing.dot(toPipe) > 0.65,
      "Dom's shoulders are turned away from the pipe",
    );
    const head = model.getObjectByName("Dom_HeadLook");
    const gaze = new THREE.Vector3(0, 0, 1).applyQuaternion(
      head.getWorldQuaternion(new THREE.Quaternion()),
    );
    const toOutlet = target
      .clone()
      .sub(head.getWorldPosition(new THREE.Vector3()))
      .normalize();
    assert(gaze.dot(toOutlet) > 0.97, "Dom is not looking at the pipe");
    const shaft = new THREE.Vector3(0, 1, 0).applyQuaternion(
      wrench.getWorldQuaternion(new THREE.Quaternion()),
    );
    assert(
      Math.abs(shaft.y) < 0.0001,
      "Wrench handle is not horizontal across the screen",
    );
    tighteningHands.push(hand.getWorldPosition(new THREE.Vector3()));
    contactChecks++;
  }
}
assert(
  tighteningHands.some((point) => point.distanceTo(tighteningHands[0]) > 0.04),
  "Hand and wrench stay still while fixing the pipe",
);
assert(maxTravel > 1, "Dom did not walk to the pipe");
assert(footMotion > 1, "Boots did not follow the walk");
assert.deepEqual(stages, [
  "collecting",
  "walking",
  "fixing",
  "returning",
  "fixed",
]);
assert.equal(flow, 0, "Leak is still running");
assert.equal(wrench.parent, pouch, "Wrench was not returned to the belt");
assert(
  wrench.position.distanceTo(restTool) < 1e-6,
  "Wrench returned to wrong belt position",
);
assert(model.position.length() < 1e-6, "Dom did not return home");
assert.equal(repair.active, false);
assert.equal(
  arm.morphTargetInfluences[gripTarget],
  0,
  "Fingers did not relax after returning the tool",
);
assert.equal(repair.start(), false, "Already fixed pipe restarted repair");

const second = createDomRepair(
  model,
  (value) => {
    flow = value;
  },
  () => {},
);
second.setTarget(target);
second.start();
second.update(2);
second.cancel();
assert.equal(wrench.parent, pouch, "Cancelling left the tool in his hand");
assert.equal(
  flow,
  1,
  "Cancelling an unfinished repair did not restore the leak",
);
assert(model.position.length() < 1e-6, "Cancelling left Dom away from home");
second.start(true);
assert.equal(flow, 0, "Reduced-motion repair did not stop the leak");
assert.equal(second.active, false, "Reduced-motion repair is still animating");
console.log(
  `Repair passed: ${contactChecks} wrench-to-pipe contacts, walking, belt return, cancellation and reduced motion.`,
);
