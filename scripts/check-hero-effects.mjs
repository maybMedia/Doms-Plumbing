import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createPipeScene } from "../src/lib/pipe-scene.ts";

const pipe = createPipeScene();
pipe.scene.updateMatrixWorld(true);
const pipeRay = new THREE.Raycaster(
  new THREE.Vector3(0.65, 5, 8),
  new THREE.Vector3(0, 0, -1),
);
assert(pipe.hitTest(pipeRay), "Click missed the metal pipe");
pipeRay.set(new THREE.Vector3(-1.2, 0, 8), new THREE.Vector3(0, 0, -1));
assert.equal(
  pipe.hitTest(pipeRay),
  false,
  "Water or empty space triggered a repair",
);
const particles = pipe.scene.children.filter(
  (object) => object.isInstancedMesh,
);
assert(particles.length > 0, "Missing animated water");
pipe.setFlow(0);
pipe.update(1 / 60);
assert(
  particles.every((mesh) => !mesh.visible),
  "Repaired pipe is still leaking",
);
pipe.setFlow(1);
pipe.update(0);
assert(
  particles.every((mesh) => mesh.visible),
  "Cancelled repair did not restore water",
);
const snapshot = () =>
  particles.map((object) => [...object.instanceMatrix.array]);
const initial = snapshot();
const geometry = pipe.scene.children
  .filter((object) => object.isMesh)
  .map((object) => object.geometry);
pipe.update(1 / 30);
assert.notDeepEqual(snapshot(), initial, "Water does not move");
const paused = snapshot();
pipe.update(0);
assert.deepEqual(snapshot(), paused, "A still frame advances the water");
const started = performance.now();
for (let frame = 0; frame < 600; frame++) pipe.update(1 / 60);
const elapsed = performance.now() - started;
assert.deepEqual(
  pipe.scene.children
    .filter((object) => object.isMesh)
    .map((object) => object.geometry),
  geometry,
  "Water animation recreated meshes or geometry",
);
assert(
  snapshot().flat().every(Number.isFinite),
  "Water transforms are invalid",
);
for (const [width, height, layout] of [
  [
    333,
    820,
    {
      pixelsPerUnit: 333 / 4.75,
      outletX: 333 * 0.47,
      outletY: 230,
      reach: 0.95,
    },
  ],
  [180, 820, { pixelsPerUnit: 26, outletX: 138, outletY: 132, reach: 0.8 }],
  [
    140,
    1300,
    { pixelsPerUnit: 18, outletX: 112.94, outletY: 120, reach: 0.45 },
  ],
]) {
  pipe.resize(width, height, layout);
  assert(
    pipe.camera.right > pipe.camera.left &&
      pipe.camera.top > pipe.camera.bottom,
  );
  const outlet = pipe.scene
    .getObjectByName("PipeOutlet")
    .position.clone()
    .project(pipe.camera);
  assert(
    Math.abs(((1 - outlet.y) / 2) * height - layout.outletY) < 1,
    "Outlet is not anchored below the navbar",
  );
  const point = new THREE.Vector3();
  let reachesBottom = false;
  for (const particlesMesh of particles) {
    const transforms = particlesMesh.instanceMatrix.array;
    for (let i = 0; i < particlesMesh.count; i++) {
      point
        .set(
          transforms[i * 16 + 12],
          transforms[i * 16 + 13],
          transforms[i * 16 + 14],
        )
        .project(pipe.camera);
      if (point.y <= -0.98 && Math.abs(point.x) < 1) reachesBottom = true;
    }
  }
  assert(reachesBottom, "Water stops before the hero bottom");
}
assert(
  pipe.scene.children
    .filter((object) => object.name.startsWith("Water"))
    .every((object) => object.isInstancedMesh),
  "Water must use droplets, not a solid tube",
);

// The removed necklace must not reappear as bright metal across the bare neck.
const bytes = await readFile(
  new URL("../public/models/dom.glb", import.meta.url),
);
const { scene: model } = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
model.updateMatrixWorld(true);
const upper = model.getObjectByName("Dom_UpperBody");
assert(upper, "Missing character torso");
const inverse = upper.matrixWorld.clone().invert();
const point = new THREE.Vector3();
let neckMetal = 0;
model.traverse((object) => {
  if (!object.isMesh || object.material.name !== "Silver fittings") return;
  const positions = object.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    point
      .fromBufferAttribute(positions, i)
      .applyMatrix4(object.matrixWorld)
      .applyMatrix4(inverse);
    if (
      Math.abs(point.x) < 0.19 &&
      point.y > 1.59 &&
      point.y < 1.82 &&
      point.z > 0.1 &&
      point.z < 0.35
    )
      neckMetal++;
  }
});
assert.equal(neckMetal, 0, "Metal geometry protrudes across Dom's neck");
console.log(
  `Hero effects passed: moving water reuses geometry (${(elapsed / 600).toFixed(3)} ms/update); paused water stays still; no metal crosses Dom's neck.`,
);
