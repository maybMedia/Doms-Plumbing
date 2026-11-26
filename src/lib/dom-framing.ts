import * as THREE from "three";

export function fitDomCamera(
  camera: THREE.OrthographicCamera,
  modelBounds: THREE.Box3,
  width: number,
  height: number,
) {
  camera.updateMatrixWorld(true);
  const bounds = modelBounds.clone().applyMatrix4(camera.matrixWorldInverse);
  const aspect = width / height;
  // Include the actual soles, allow for idle movement above the hair, and keep
  // enough horizontal room for the raised hand. Anchor the soles near the edge.
  const vertical = Math.max(bounds.max.y - bounds.min.y + 0.14, 4.4 / aspect);
  const centreX = (bounds.min.x + bounds.max.x) / 2;
  camera.left = centreX - (vertical * aspect) / 2;
  camera.right = centreX + (vertical * aspect) / 2;
  camera.bottom = bounds.min.y - 0.035;
  camera.top = camera.bottom + vertical;
  camera.updateProjectionMatrix();
}
