import * as THREE from "three";

export function createPipeScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2.5, 2.5, 2.7, -2.7, 0.1, 100);
  camera.position.set(-4, 4.4, 8);
  camera.lookAt(-0.45, 3.3, 0);
  const ambient = new THREE.HemisphereLight(0xeaf5ff, 0x395367, 2.3);
  const key = new THREE.DirectionalLight(0xfff7ee, 3.2);
  key.position.set(-3, 7, 6);
  const fill = new THREE.DirectionalLight(0xc9e6ff, 1.8);
  fill.position.set(4, 3, 2);
  scene.add(ambient, key, fill);

  const steel = new THREE.MeshStandardMaterial({
    color: 0x9aa9b1,
    metalness: 0.55,
    roughness: 0.43,
  });
  const fittings = new THREE.MeshStandardMaterial({
    color: 0xb4c2cc,
    metalness: 0.58,
    roughness: 0.38,
  });
  const inside = new THREE.MeshStandardMaterial({
    color: 0x17384c,
    roughness: 0.9,
    side: THREE.BackSide,
  });
  const fittingsToPick: THREE.Mesh[] = [];
  function mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z = 0,
  ) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    scene.add(object);
    if (material !== inside) fittingsToPick.push(object);
    return object;
  }
  // Extend beyond every viewport so the pipe always enters through the hero edge.
  mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 26.75, 24, 1, true),
    steel,
    0.65,
    16.625,
  );
  const bend = new THREE.CurvePath<THREE.Vector3>();
  bend.add(
    new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0.65, 3.25, 0),
      new THREE.Vector3(0.65, 2.75, 0),
      new THREE.Vector3(0.15, 2.75, 0),
    ),
  );
  bend.add(
    new THREE.LineCurve3(
      new THREE.Vector3(0.15, 2.75, 0),
      new THREE.Vector3(-0.62, 2.75, 0),
    ),
  );
  mesh(new THREE.TubeGeometry(bend, 32, 0.18, 20, false), steel, 0, 0);
  mesh(new THREE.TubeGeometry(bend, 32, 0.127, 16, false), inside, 0, 0);
  mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.22, 24), fittings, 0.65, 4.25);
  for (const y of [4.14, 4.36]) {
    const ring = mesh(
      new THREE.TorusGeometry(0.207, 0.018, 8, 24),
      steel,
      0.65,
      y,
    );
    ring.rotation.x = Math.PI / 2;
  }
  const lip = mesh(
    new THREE.TorusGeometry(0.18, 0.025, 8, 28),
    fittings,
    -0.62,
    2.75,
  );
  lip.rotation.y = -Math.PI / 2;
  const opening = mesh(
    new THREE.RingGeometry(0.127, 0.18, 28),
    fittings,
    -0.622,
    2.75,
  );
  opening.rotation.y = -Math.PI / 2;
  opening.name = "PipeOutlet";

  const water = new THREE.MeshStandardMaterial({
    color: 0x258eb9,
    roughness: 0.28,
    transparent: true,
    opacity: 0.64,
    depthWrite: false,
  });
  const sprayMaterial = new THREE.MeshStandardMaterial({
    color: 0x6bc8e3,
    roughness: 0.35,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const droplets = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 8, 6),
    water,
    280,
  );
  const mist = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 6, 4),
    sprayMaterial,
    80,
  );
  droplets.name = "WaterGush";
  mist.name = "WaterMist";
  droplets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mist.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  droplets.frustumCulled = false;
  mist.frustumCulled = false;
  scene.add(droplets, mist);
  const particleSets = [droplets, mist];
  const dummy = new THREE.Object3D();
  const tangent = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let time = 0;
  let lifetime = 2;
  let reach = 0.95;
  let particleScale = 1;
  let flow = 1;
  const hoverVolumes = [
    new THREE.Box3(
      new THREE.Vector3(0.39, 2.55, -0.25),
      new THREE.Vector3(0.91, 30, 0.25),
    ),
    new THREE.Box3(
      new THREE.Vector3(-0.7, 2.5, -0.25),
      new THREE.Vector3(0.7, 3.3, 0.25),
    ),
  ];
  const pressure = (t: number) => 0.86 + 0.14 * Math.sin(t * 4.2);
  function update(delta: number) {
    time += delta;
    droplets.visible = mist.visible = flow > 0.001;
    if (flow <= 0.001) return;
    for (const particles of particleSets) {
      const isMist = particles === mist;
      for (let i = 0; i < particles.count; i++) {
        const nearOutlet = !isMist && i < 72;
        const phase =
          (time * (nearOutlet ? 1.6 : 1 / lifetime) + i * 0.61803398875) % 1;
        const age = nearOutlet ? phase * 0.65 : Math.sqrt(phase) * lifetime;
        const power = pressure(time - age) * Math.pow(flow, 0.3);
        const spread = (isMist ? 0.32 : 0.16) * Math.min(age, 2);
        const lateral = Math.sin(i * 13.17) * spread;
        const depth = Math.cos(i * 7.73) * spread;
        dummy.position.set(
          -0.635 - reach * power * (1 - Math.exp(-3.1 * age)) + lateral,
          2.75 + 0.12 * age - 2.3 * age * age,
          depth,
        );
        const radius = Math.max(
          0.0001,
          particleScale *
            Math.sqrt(flow) *
            (isMist ? 0.016 : 0.032 + (i % 7) * 0.004) *
            Math.min(1, age * 20 + 0.2),
        );
        dummy.scale.set(
          radius * 0.8,
          radius * (1.2 + Math.min(age, 1.2) * 0.6),
          radius * 0.8,
        );
        tangent
          .set(
            -3.1 * reach * power * Math.exp(-3.1 * age),
            0.12 - 4.6 * age,
            depth,
          )
          .normalize();
        dummy.quaternion.setFromUnitVectors(up, tangent);
        dummy.updateMatrix();
        particles.setMatrixAt(i, dummy.matrix);
      }
      particles.instanceMatrix.needsUpdate = true;
    }
  }
  update(0);
  return {
    scene,
    camera,
    update,
    outlet: new THREE.Vector3(-0.62, 2.75, 0),
    setFlow(value: number) {
      flow = THREE.MathUtils.clamp(value, 0, 1);
      droplets.visible = mist.visible = flow > 0.001;
    },
    hitTest(ray: THREE.Raycaster) {
      scene.updateMatrixWorld(true);
      return ray.intersectObjects(fittingsToPick, false).length > 0;
    },
    hoverTest(ray: THREE.Ray) {
      // Two broad volumes cover the pipe's stem and elbow without triangle tests.
      return hoverVolumes.some((bounds) => ray.intersectsBox(bounds));
    },
    resize(
      width: number,
      height: number,
      layout = {
        pixelsPerUnit: width / 4.75,
        outletX: width * 0.47,
        outletY: Math.min(230, height * 0.28),
        reach: 0.95,
      },
    ) {
      // Keep the outlet anchored near the top while the viewport extends all
      // the way down the hero. Increasing height must not shrink the pipe.
      camera.updateMatrixWorld(true);
      const outlet = new THREE.Vector3(-0.635, 2.75, 0).applyMatrix4(
        camera.matrixWorldInverse,
      );
      camera.left = outlet.x - layout.outletX / layout.pixelsPerUnit;
      camera.right = camera.left + width / layout.pixelsPerUnit;
      camera.top = outlet.y + layout.outletY / layout.pixelsPerUnit;
      camera.bottom = camera.top - height / layout.pixelsPerUnit;
      camera.updateProjectionMatrix();
      reach = layout.reach;
      particleScale = Math.max(1, 40 / layout.pixelsPerUnit);
      // Solve particle travel time against the actual bottom of this viewport.
      // Overshoot slightly so the flow is never cut off before the hero edge.
      const point = new THREE.Vector3();
      let low = 0.1,
        high = 12;
      for (let i = 0; i < 24; i++) {
        const age = (low + high) / 2;
        point
          .set(
            -0.635 - reach * (1 - Math.exp(-3.1 * age)),
            2.75 + 0.12 * age - 2.3 * age * age,
            0,
          )
          .project(camera);
        if (point.y > -1.08) low = age;
        else high = age;
      }
      lifetime = high;
      update(0);
    },
    setTheme(dark: boolean) {
      steel.color.set(dark ? 0x6e889a : 0x9aa9b1);
      fittings.color.set(dark ? 0x9cb8c8 : 0xb4c2cc);
      water.color.set(dark ? 0x7fdaee : 0x258eb9);
      ambient.intensity = dark ? 1.9 : 2.3;
      key.intensity = dark ? 2.6 : 3.2;
    },
  };
}
