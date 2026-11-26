import * as THREE from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// Offline surface extraction: intersecting forms become one watertight surface,
// with no separate elbow, wrist or shoulder balls in the exported character.
export function sculptSurface(bounds, distance, resolution = 72) {
  const material = new THREE.MeshStandardMaterial();
  const field = new MarchingCubes(resolution, material, false, false, 60000);
  field.isolation = 0;
  const [min, max] = bounds;
  const size = max.map((value, axis) => value - min[axis]);
  for (let z = 0; z < resolution; z++) {
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        field.field[x + y * resolution + z * resolution ** 2] = -distance(
          min[0] + (x / resolution) * size[0],
          min[1] + (y / resolution) * size[1],
          min[2] + (z / resolution) * size[2],
        );
      }
    }
  }
  field.update();
  let geometry = new THREE.BufferGeometry();
  const positions = field.geometry.attributes.position.array.slice(
    0,
    field.count * 3,
  );
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      positions[i + axis] =
        min[axis] + ((positions[i + axis] + 1) / 2) * size[axis];
    }
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry = mergeVertices(geometry, 0.00001);
  // Surface gradients stay smooth across the irregular marching-cubes triangles.
  const points = geometry.attributes.position;
  const normals = [];
  const epsilon = 0.001;
  const normal = new THREE.Vector3();
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i),
      y = points.getY(i),
      z = points.getZ(i);
    normal
      .set(
        distance(x + epsilon, y, z) - distance(x - epsilon, y, z),
        distance(x, y + epsilon, z) - distance(x, y - epsilon, z),
        distance(x, y, z + epsilon) - distance(x, y, z - epsilon),
      )
      .normalize();
    normals.push(normal.x, normal.y, normal.z);
  }
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  field.geometry.dispose();
  material.dispose();
  return geometry;
}

export function smoothUnion(a, b, radius) {
  const blend = Math.max(radius - Math.abs(a - b), 0) / radius;
  return Math.min(a, b) - (blend * blend * radius) / 4;
}

export function ellipsoid(x, y, z, rx, ry, rz) {
  const k0 = Math.hypot(x / rx, y / ry, z / rz);
  const k1 = Math.hypot(x / rx ** 2, y / ry ** 2, z / rz ** 2);
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}

export function capsuleDistance(x, y, z, start, end, radius) {
  const dx = end[0] - start[0],
    dy = end[1] - start[1],
    dz = end[2] - start[2];
  const alpha = THREE.MathUtils.clamp(
    ((x - start[0]) * dx + (y - start[1]) * dy + (z - start[2]) * dz) /
      (dx * dx + dy * dy + dz * dz),
    0,
    1,
  );
  return (
    Math.hypot(
      x - start[0] - dx * alpha,
      y - start[1] - dy * alpha,
      z - start[2] - dz * alpha,
    ) - radius
  );
}

export function skinGeometry(geometry, weights) {
  const indices = [],
    values = [];
  const points = geometry.attributes.position;
  for (let i = 0; i < points.count; i++) {
    const [bones, amounts] = weights(
      points.getX(i),
      points.getY(i),
      points.getZ(i),
    );
    indices.push(...bones);
    values.push(...amounts);
  }
  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(indices, 4),
  );
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(values, 4),
  );
  return geometry;
}
