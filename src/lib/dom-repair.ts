import * as THREE from "three";

export type RepairStage =
  | "idle"
  | "collecting"
  | "walking"
  | "fixing"
  | "returning"
  | "fixed";

const ease = (value: number) => {
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

// All poses use the existing rig and the actual wrench from Dom's belt.
// No new renderer, particle system, or pointer-driven mesh picking is needed.
export function createDomRepair(
  model: THREE.Object3D,
  onFlow: (flow: number) => void,
  onStage: (stage: RepairStage) => void,
) {
  const get = (name: string) => {
    const object = model.getObjectByName(name);
    if (!object) throw new Error(`Missing repair rig: ${name}`);
    return object;
  };
  const upper = get("Dom_UpperBody");
  const look = get("Dom_HeadLook");
  const shoulder = get("Dom_UpperArm_L");
  const elbow = get("Dom_Forearm_L");
  const hand = get("Dom_Hand_L");
  const arm = get("Dom_ContinuousArm_L") as THREE.SkinnedMesh;
  const gripTarget = arm.morphTargetDictionary?.Grip;
  const otherArm = get("Dom_UpperArm_R");
  const sleeve = get("Dom_Sleeve_L");
  const otherSleeve = get("Dom_Sleeve_R");
  const legs = [get("Dom_Leg_L"), get("Dom_Leg_R")];
  const wrench = get("Dom_PipeWrench");
  const pouch = wrench.parent!;
  const nodes = [
    model,
    upper,
    look,
    shoulder,
    elbow,
    hand,
    otherArm,
    sleeve,
    otherSleeve,
    ...legs,
  ];
  const rest = new Map(
    nodes.map((node) => [
      node,
      {
        position: node.position.clone(),
        quaternion: node.quaternion.clone(),
        scale: node.scale.clone(),
      },
    ]),
  );
  const toolRest = {
    position: wrench.position.clone(),
    quaternion: wrench.quaternion.clone(),
  };
  const restFacing = model.rotation.y;
  // One fixed grip for the entire sequence. Only the shoulder and elbow lift
  // the tool; the wrist never turns independently or changes on the way home.
  const wristGrip = rest.get(hand)!.quaternion.clone();
  const forearmGrip = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    Math.PI / 2,
  );
  const gripRotation = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    Math.PI / 2,
  );
  const grip = new THREE.Vector3(0, -0.1, -0.105);
  const bite = new THREE.Vector3(0.035, 0.515, 0);
  const pipe = new THREE.Vector3();
  const destination = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);
  const workingFacing = 0.65;
  const lowerEnd = new THREE.Vector3(0, -0.55, 0).add(
    bite
      .clone()
      .applyQuaternion(gripRotation)
      .add(grip)
      .applyQuaternion(forearmGrip.clone().multiply(wristGrip)),
  );
  const startTool = {
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
  };
  let elapsed = 0;
  let active = false;
  let fixed = false;
  let stage: RepairStage = "idle";
  function setStage(next: RepairStage) {
    if (next !== stage) {
      stage = next;
      onStage(next);
    }
  }
  function restorePose() {
    for (const [node, pose] of rest) {
      node.position.copy(pose.position);
      node.quaternion.copy(pose.quaternion);
      node.scale.copy(pose.scale);
    }
  }
  function stow() {
    pouch.add(wrench);
    wrench.position.copy(toolRest.position);
    wrench.quaternion.copy(toolRest.quaternion);
    setGrip(0);
  }
  function setGrip(value: number) {
    if (gripTarget !== undefined && arm.morphTargetInfluences)
      arm.morphTargetInfluences[gripTarget] = value;
  }
  function clothRotation(arm: THREE.Object3D, cloth: THREE.Object3D) {
    cloth.quaternion.setFromUnitVectors(
      down,
      down.clone().applyQuaternion(arm.quaternion),
    );
  }
  function poseArm(upperAngle: number, elbowAngle: number, blend = 1) {
    const axis = new THREE.Vector3(1, 0, 0);
    shoulder.quaternion.slerp(
      new THREE.Quaternion().setFromAxisAngle(axis, upperAngle),
      blend,
    );
    elbow.quaternion.slerp(
      new THREE.Quaternion()
        .setFromAxisAngle(axis, elbowAngle)
        .multiply(forearmGrip),
      blend,
    );
    hand.quaternion.copy(wristGrip);
    clothRotation(shoulder, sleeve);
  }
  function carry(blend = 1) {
    poseArm(-0.06, -0.65, blend);
  }
  function belt(blend = 1) {
    poseArm(-0.03, -0.2, blend);
  }
  function reachPipe(blend: number) {
    model.updateMatrixWorld(true);
    const target = shoulder
      .parent!.worldToLocal(pipe.clone())
      .sub(shoulder.position);
    const upperLength = 0.68;
    const lowerLength = Math.hypot(lowerEnd.y, lowerEnd.z);
    const distance = Math.min(
      Math.hypot(target.y, target.z),
      upperLength + lowerLength - 0.001,
    );
    const flex = Math.acos(
      THREE.MathUtils.clamp(
        (distance * distance -
          upperLength * upperLength -
          lowerLength * lowerLength) /
          (2 * upperLength * lowerLength),
        -1,
        1,
      ),
    );
    const angle =
      Math.atan2(target.z, -target.y) -
      Math.atan2(
        lowerLength * Math.sin(flex),
        upperLength + lowerLength * Math.cos(flex),
      );
    poseArm(-angle, Math.atan2(lowerEnd.z, -lowerEnd.y) - flex, blend);
  }
  function workTool(angle: number) {
    // Move the arm and held wrench as one around the jaw's contact point.
    // The hand's local pose and its grip on the wrench remain unchanged.
    model.updateMatrixWorld(true);
    const parent = shoulder.parent!;
    const pivot = parent.worldToLocal(pipe.clone());
    const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(
      parent.getWorldQuaternion(new THREE.Quaternion()).invert(),
    );
    const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    for (const joint of [shoulder, sleeve]) {
      joint.position.sub(pivot).applyQuaternion(rotation).add(pivot);
      joint.quaternion.premultiply(rotation);
    }
  }
  function walk(progress: number, returning: boolean) {
    const travel = ease(progress);
    model.position.lerpVectors(
      rest.get(model)!.position,
      destination,
      returning ? 1 - travel : travel,
    );
    const envelope = Math.sin(Math.PI * progress);
    const turn = ease(envelope * 2);
    const stride =
      Math.sin(progress * Math.PI * 8) * Math.sqrt(Math.max(0, envelope));
    model.rotation.y = restFacing + (returning ? 1.05 - Math.PI : 1.05) * turn;
    model.position.y += Math.abs(stride) * 0.035;
    for (const [index, leg] of legs.entries()) {
      const angle = stride * (index ? -0.32 : 0.32);
      const rotation = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        angle,
      );
      const hip = new THREE.Vector3(index ? -0.34 : 0.34, 1.8, 0);
      leg.position
        .copy(rest.get(leg)!.position)
        .sub(hip)
        .applyQuaternion(rotation)
        .add(hip);
      leg.quaternion.copy(rotation).multiply(rest.get(leg)!.quaternion);
    }
    otherArm.rotation.x = -0.2 * stride;
    clothRotation(otherArm, otherSleeve);
    carry();
  }
  function finish() {
    active = false;
    fixed = true;
    stow();
    restorePose();
    onFlow(0);
    setStage("fixed");
  }
  function sample(time: number) {
    elapsed = Math.min(time, 10.6);
    restorePose();
    setGrip(elapsed >= 0.8 && elapsed < 10.6 ? 1 : 0);
    if (elapsed < 0.8) {
      setStage("collecting");
      belt(ease(elapsed / 0.8));
      look.rotation.x = 0.12 * Math.sin((Math.PI * elapsed) / 0.8);
    } else {
      if (wrench.parent !== hand) {
        model.updateMatrixWorld(true);
        hand.attach(wrench);
        startTool.position.copy(wrench.position);
        startTool.quaternion.copy(wrench.quaternion);
      }
      wrench.position.copy(grip);
      wrench.quaternion.copy(gripRotation);
      if (elapsed < 1.3) {
        setStage("collecting");
        carry(ease((elapsed - 0.8) / 0.5));
        wrench.position.lerpVectors(
          startTool.position,
          grip,
          ease((elapsed - 0.8) / 0.5),
        );
        wrench.quaternion.slerpQuaternions(
          startTool.quaternion,
          gripRotation,
          ease((elapsed - 0.8) / 0.5),
        );
      } else if (elapsed < 3.5) {
        setStage("walking");
        walk((elapsed - 1.3) / 2.2, false);
      } else if (elapsed < 7.2) {
        setStage("fixing");
        model.position.copy(destination);
        const raise =
          ease((elapsed - 3.5) / 0.65) * (1 - ease((elapsed - 6.6) / 0.6));
        // Turn his shoulders toward the job while his head looks directly at
        // the outlet. This leaves room for the hand beside the horizontal tool.
        model.rotation.y = THREE.MathUtils.lerp(
          restFacing,
          workingFacing,
          raise,
        );
        // A small reach and backward lean clear his face from the handle.
        upper.position.y += 0.12 * raise;
        upper.position.z += 0.3 * raise;
        upper.rotation.x = -0.08 * raise;
        shoulder.position.y += 0.16 * raise;
        sleeve.position.y += 0.16 * raise;
        carry();
        reachPipe(raise);
        const workingTime = THREE.MathUtils.clamp(elapsed - 4.2, 0, 2.4);
        const workingEnvelope =
          ease(workingTime / 0.15) * (1 - ease((workingTime - 2.2) / 0.2));
        workTool(
          Math.sin((workingTime * Math.PI * 2) / 0.8) * 0.18 * workingEnvelope,
        );
        const gaze = pipe
          .clone()
          .sub(look.getWorldPosition(new THREE.Vector3()))
          .applyQuaternion(
            model.getWorldQuaternion(new THREE.Quaternion()).invert(),
          );
        look.rotation.x =
          -Math.atan2(gaze.y, Math.hypot(gaze.x, gaze.z)) * raise;
        look.rotation.y = Math.atan2(gaze.x, gaze.z) * raise;
        onFlow(1 - ease((elapsed - 4.6) / 1.8));
      } else if (elapsed < 9.4) {
        setStage("returning");
        walk((elapsed - 7.2) / 2.2, true);
      } else if (elapsed < 10.6) {
        setStage("returning");
        carry();
        belt(ease((elapsed - 9.4) / 0.6));
        if (elapsed > 10) {
          model.updateMatrixWorld(true);
          const target = hand.worldToLocal(
            pouch.localToWorld(toolRest.position.clone()),
          );
          const rotation = hand
            .getWorldQuaternion(new THREE.Quaternion())
            .invert()
            .multiply(pouch.getWorldQuaternion(new THREE.Quaternion()))
            .multiply(toolRest.quaternion);
          wrench.position.lerp(target, ease((elapsed - 10) / 0.6));
          wrench.quaternion.slerp(rotation, ease((elapsed - 10) / 0.6));
        }
      } else finish();
    }
    model.updateMatrixWorld(true);
  }
  return {
    get active() {
      return active;
    },
    get fixed() {
      return fixed;
    },
    get stage() {
      return stage;
    },
    setTarget(point: THREE.Vector3) {
      pipe.copy(point);
      destination.copy(rest.get(model)!.position);
      // Leave space between his face and the horizontal handle, with the
      // working hand in front of his shoulder and inside the hero on desktop.
      const offset = new THREE.Vector3(
        shoulder.position.x + lowerEnd.x,
        0,
        1,
      ).applyAxisAngle(new THREE.Vector3(0, 1, 0), workingFacing);
      destination.x = point.x - offset.x;
      destination.z = point.z - offset.z;
    },
    start(instant = false) {
      if (active || fixed) return false;
      active = true;
      elapsed = 0;
      if (instant) finish();
      else sample(0);
      return true;
    },
    update(delta: number) {
      if (active) sample(elapsed + delta);
    },
    cancel() {
      active = false;
      stow();
      restorePose();
      onFlow(fixed ? 0 : 1);
      setStage(fixed ? "fixed" : "idle");
    },
  };
}
