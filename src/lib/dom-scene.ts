import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createDomHoverTest } from "@/lib/dom-hover";
import { createPipeScene } from "@/lib/pipe-scene";
import { fitDomCamera } from "@/lib/dom-framing";
import { createDomRepair } from "@/lib/dom-repair";
import { domModelVersion } from "@/lib/dom-model-version";

export type DomScene = {
  setPaused: (paused: boolean) => void;
  wave: (instant?: boolean) => void;
  hitTest: (clientX: number, clientY: number) => boolean;
  hoverTest: (clientX: number, clientY: number) => boolean;
  pipeHitTest: (clientX: number, clientY: number) => boolean;
  repairPipe: () => void;
  dispose: () => void;
};
type Options = {
  signal: AbortSignal;
  paused: boolean;
  onWaveChange: (waving: boolean) => void;
  onUnavailable: () => void;
};

export async function mountDomScene(
  host: HTMLElement,
  options: Options,
): Promise<DomScene> {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.autoClear = false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  const pipe = createPipeScene();
  const camera = new THREE.OrthographicCamera(-2, 2, 3.05, -3.05, 0.1, 30);
  camera.position.set(0, 3.45, 9);
  camera.lookAt(0, 2.95, 0);
  const heroCamera = camera.clone();

  const hemisphere = new THREE.HemisphereLight(0xe5f3ff, 0x6a7180, 2);
  scene.add(hemisphere);
  const key = new THREE.DirectionalLight(0xfff3e7, 3.1);
  key.position.set(-3, 7, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -1;
  key.shadow.normalBias = 0.035;
  key.shadow.bias = -0.0002;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd3eaff, 1.8);
  fill.position.set(3, 4, 2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 2);
  rim.position.set(0, 6, -4);
  scene.add(rim);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.ShadowMaterial({ color: 0x183b50, opacity: 0.15 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.005;
  floor.receiveShadow = true;
  scene.add(floor);

  let disposed = false;
  let frame: number | null = null;
  let lastTime = performance.now();
  let lastRender = 0;
  let paused = options.paused;
  let visible = true;
  let waving = false;
  let staticGreeting = false;
  const raycaster = new THREE.Raycaster();
  const pickPosition = new THREE.Vector2();
  let poseTimer: ReturnType<typeof setTimeout> | undefined;
  let mixer: THREE.AnimationMixer | undefined;
  let idle: THREE.AnimationAction | undefined;
  let waveAction: THREE.AnimationAction | undefined;
  let model: THREE.Group | undefined;
  let modelBounds: THREE.Box3 | undefined;
  let look: THREE.Object3D | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let visibilityObserver: IntersectionObserver | undefined;
  let themeObserver: MutationObserver | undefined;
  const hero = host.closest("#home");
  const sceneRoot = hero ?? host;
  const layer = document.createElement("div");
  layer.className = "hero-three-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.appendChild(canvas);
  const pipeSpace = hero?.querySelector<HTMLElement>(".hero-pipe-space");
  type Viewport = { left: number; top: number; width: number; height: number };
  let fullWidth = 0,
    fullHeight = 0;
  let bodyViewport: Viewport = { left: 0, top: 0, width: 0, height: 0 };
  let pipeViewport: Viewport = { left: 0, top: 0, width: 0, height: 0 };
  const target = { x: 0, y: 0 };
  const pointer = { x: 0, y: 0 };
  let pointerInside = false;
  let gazeDirty = false;
  let pointerBounds: { canvas: DOMRect; hero: DOMRect | null } | undefined;
  let intersectsHover: ReturnType<typeof createDomHoverTest> | undefined;
  let repair: ReturnType<typeof createDomRepair> | undefined;
  const desktop = window.matchMedia("(min-width: 901px) and (pointer: fine)");
  const repairButton = document.createElement("button");
  repairButton.className = "pipe-interaction";
  repairButton.type = "button";
  repairButton.setAttribute("aria-label", "Ask Dom to fix the leaking pipe");
  repairButton.onclick = (event) => {
    event.stopPropagation();
    repairPipe();
  };
  const repairStatus = document.createElement("span");
  repairStatus.className = "sr-only";
  repairStatus.setAttribute("role", "status");
  repairStatus.setAttribute("aria-live", "polite");

  function invalidatePointerBounds() {
    pointerBounds = undefined;
    gazeDirty = pointerInside;
  }
  function getPointerBounds() {
    pointerBounds ??= {
      canvas: host.getBoundingClientRect(),
      hero: sceneRoot.getBoundingClientRect(),
    };
    return pointerBounds;
  }
  function setPointerRay(clientX: number, clientY: number) {
    const rect = getPointerBounds().hero;
    if (!rect) return false;
    if (
      !rect.width ||
      !rect.height ||
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    )
      return false;
    pickPosition.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pickPosition, heroCamera);
    return true;
  }
  function setPipeRay(clientX: number, clientY: number) {
    const root = getPointerBounds().hero;
    if (!root || !desktop.matches || !repair || repair.active || repair.fixed)
      return false;
    const x = clientX - root.left - pipeViewport.left;
    const y = clientY - root.top - pipeViewport.top;
    if (x < 0 || y < 0 || x > pipeViewport.width || y > pipeViewport.height)
      return false;
    pickPosition.set(
      (x / pipeViewport.width) * 2 - 1,
      1 - (y / pipeViewport.height) * 2,
    );
    raycaster.setFromCamera(pickPosition, pipe.camera);
    return true;
  }
  function pipeHitTest(clientX: number, clientY: number) {
    return setPipeRay(clientX, clientY) && pipe.hitTest(raycaster);
  }

  function viewsInWindow() {
    const bounds = getPointerBounds();
    const inView = (left: number, top: number, width: number, height: number) =>
      width > 0 &&
      height > 0 &&
      left < window.innerWidth &&
      left + width > 0 &&
      top < window.innerHeight &&
      top + height > 0;
    const body = bounds.canvas;
    const root = bounds.hero;
    return {
      body: inView(body.left, body.top, body.width, body.height),
      pipe:
        !!root &&
        inView(
          root.left + pipeViewport.left,
          root.top + pipeViewport.top,
          pipeViewport.width,
          pipeViewport.height,
        ),
    };
  }
  function applyViewport(view: Viewport) {
    renderer.setViewport(
      view.left,
      fullHeight - view.top - view.height,
      view.width,
      view.height,
    );
    renderer.setScissor(
      view.left,
      fullHeight - view.top - view.height,
      view.width,
      view.height,
    );
  }
  function render() {
    if (disposed || options.signal.aborted || !fullWidth || !fullHeight) return;
    const views = viewsInWindow();
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, fullWidth, fullHeight);
    renderer.clear();
    renderer.setScissorTest(true);
    if (views.pipe) {
      applyViewport(pipeViewport);
      renderer.render(pipe.scene, pipe.camera);
    }
    // Dom stays in front of the water wherever the two viewports overlap.
    if (views.body || repair?.active) {
      applyViewport({ left: 0, top: 0, width: fullWidth, height: fullHeight });
      renderer.clearDepth();
      renderer.render(scene, heroCamera);
    }
    renderer.setScissorTest(false);
  }
  function schedule(force = false) {
    if (
      frame === null &&
      !disposed &&
      visible &&
      !document.hidden &&
      (force || !paused)
    )
      frame = requestAnimationFrame(tick);
  }
  function tick(now: number) {
    frame = null;
    if (disposed || !visible || document.hidden) return;
    const views = viewsInWindow();
    if (!views.body && !views.pipe) return;
    if (paused) {
      render();
      return;
    }
    if (now - lastRender < 1000 / (views.body ? 60 : 30) - 0.5) {
      schedule();
      return;
    }
    // A queued RAF timestamp can precede a click that restarted the clock.
    // Never run a one-shot action backwards past its first frame.
    const delta = Math.max(0, Math.min((now - lastTime) / 1000, 0.1));
    lastTime = now;
    lastRender = now;
    if (views.body || repair?.active) {
      mixer?.update(delta);
      repair?.update(delta);
    }
    if (views.pipe) pipe.update(delta);
    if (look && views.body && !repair?.active) {
      if (gazeDirty) {
        const rect = getPointerBounds().hero;
        if (rect?.width && rect.height) {
          target.x = THREE.MathUtils.clamp(
            ((pointer.x - rect.left) / rect.width - 0.5) * 0.35,
            -0.17,
            0.17,
          );
          target.y = THREE.MathUtils.clamp(
            ((pointer.y - rect.top) / rect.height - 0.4) * 0.14,
            -0.06,
            0.08,
          );
        }
        gazeDirty = false;
      }
      look.rotation.y = THREE.MathUtils.damp(
        look.rotation.y,
        target.x,
        4,
        delta,
      );
      look.rotation.x = THREE.MathUtils.damp(
        look.rotation.x,
        target.y,
        4,
        delta,
      );
    }
    render();
    schedule();
  }
  function cancelFrame() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  }
  function stopWave() {
    clearTimeout(poseTimer);
    if (!waving) return;
    waving = false;
    staticGreeting = false;
    waveAction?.stop();
    mixer?.update(0);
    options.onWaveChange(false);
  }
  function setPaused(value: boolean) {
    if (disposed) return;
    paused = value;
    if (paused && repair?.active) {
      repair.cancel();
      repair.start(true);
    }
    if (idle) idle.paused = paused;
    if (waveAction) waveAction.paused = paused || staticGreeting;
    if (paused) cancelFrame();
    lastTime = performance.now();
    render();
    schedule();
  }
  function wave(instant = false) {
    if (disposed || repair?.active || waving || !waveAction || !mixer) return;
    waving = true;
    options.onWaveChange(true);
    waveAction.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.14).play();
    if (instant || paused) {
      staticGreeting = true;
      waveAction.stopFading().setEffectiveWeight(1);
      // A deliberate static greeting is available without motion.
      waveAction.time = 1.45;
      waveAction.paused = true;
      mixer.update(0);
      render();
      poseTimer = setTimeout(() => {
        stopWave();
        render();
      }, 1100);
    } else {
      lastTime = performance.now();
      schedule();
    }
  }
  function repairPipe() {
    if (
      disposed ||
      !desktop.matches ||
      !repair ||
      repair.active ||
      repair.fixed
    )
      return;
    stopWave();
    idle?.stop();
    mixer?.update(0);
    repair.start(paused);
    render();
    lastTime = performance.now();
    schedule();
  }
  function hitTest(clientX: number, clientY: number) {
    if (
      disposed ||
      repair?.active ||
      !model ||
      !setPointerRay(clientX, clientY)
    )
      return false;
    // Detailed mesh picking is reserved for deliberate clicks, never hover.
    model.updateWorldMatrix(true, true);
    model.traverse((object) => {
      if (object instanceof THREE.SkinnedMesh) object.computeBoundingSphere();
    });
    return raycaster.intersectObject(model, true).length > 0;
  }
  function hoverTest(clientX: number, clientY: number) {
    if (repair?.active) return false;
    if (setPipeRay(clientX, clientY) && pipe.hoverTest(raycaster.ray))
      return true;
    return (
      !disposed &&
      !!intersectsHover &&
      setPointerRay(clientX, clientY) &&
      intersectsHover(raycaster.ray)
    );
  }
  function onPointerMove(event: Event) {
    const eventPointer = event as PointerEvent;
    if (paused || eventPointer.pointerType === "touch" || !hero) return;
    pointer.x = eventPointer.clientX;
    pointer.y = eventPointer.clientY;
    pointerInside = true;
    gazeDirty = true;
  }
  function onPointerLeave() {
    pointerInside = false;
    gazeDirty = false;
    target.x = 0;
    target.y = 0;
  }
  function onViewportChange() {
    invalidatePointerBounds();
    if (frame === null) {
      lastTime = performance.now();
      schedule(true);
    }
  }
  function onDocumentVisibility() {
    invalidatePointerBounds();
    if (document.hidden) {
      cancelFrame();
    } else {
      lastTime = performance.now();
      render();
      schedule();
    }
  }
  function onContextLost(event: Event) {
    event.preventDefault();
    dispose();
    if (!options.signal.aborted) options.onUnavailable();
  }
  function resize() {
    if (disposed) return;
    invalidatePointerBounds();
    const body = host.getBoundingClientRect();
    const root = sceneRoot.getBoundingClientRect();
    if (!body.width || !body.height || !root.width || !root.height) return;
    if (modelBounds) fitDomCamera(camera, modelBounds, body.width, body.height);
    fullWidth = root.width;
    fullHeight = root.height;
    bodyViewport = {
      left: body.left - root.left,
      top: body.top - root.top,
      width: body.width,
      height: body.height,
    };
    const desktop = window.matchMedia("(min-width: 901px)").matches;
    const compact = window.matchMedia("(max-width: 640px)").matches;
    const nav = document.querySelector(".nav-panel")?.getBoundingClientRect();
    if (desktop && pipeSpace) {
      const space = pipeSpace.getBoundingClientRect();
      pipeViewport = {
        left: space.left - root.left,
        top: 0,
        width: space.width,
        height: root.height,
      };
      pipe.resize(pipeViewport.width, pipeViewport.height, {
        pixelsPerUnit: space.width / 4.75,
        outletX: space.width * 0.47,
        outletY: Math.min(230, space.bottom - root.top - 80),
        reach: 0.95,
      });
    } else {
      const width = compact ? 140 : 180;
      const pixelsPerUnit = compact
        ? Math.min(23, Math.max(16, root.width / 20))
        : 26;
      pipeViewport = {
        left: root.width - width,
        top: 0,
        width,
        height: root.height,
      };
      pipe.resize(width, root.height, {
        pixelsPerUnit,
        outletX: width - (compact ? pixelsPerUnit * 1.17 + 6 : 42),
        outletY: Math.max(
          105,
          (nav?.bottom ?? 95) - root.top + (compact ? 36 : 46),
        ),
        reach: compact ? 0.45 : 0.8,
      });
    }
    // Extend the body camera's frustum to the whole hero without changing Dom's
    // resting size or position. He can now walk beyond his original viewport.
    heroCamera.copy(camera);
    const perX = (camera.right - camera.left) / bodyViewport.width;
    const perY = (camera.top - camera.bottom) / bodyViewport.height;
    heroCamera.left = camera.left - bodyViewport.left * perX;
    heroCamera.right = heroCamera.left + fullWidth * perX;
    heroCamera.top = camera.top + bodyViewport.top * perY;
    heroCamera.bottom = heroCamera.top - fullHeight * perY;
    heroCamera.updateProjectionMatrix();
    heroCamera.updateMatrixWorld(true);
    const outlet = pipe.outlet.clone().project(pipe.camera);
    const outletX =
      pipeViewport.left + ((outlet.x + 1) * pipeViewport.width) / 2;
    const outletY =
      pipeViewport.top + ((1 - outlet.y) * pipeViewport.height) / 2;
    pickPosition.set(
      (outletX / fullWidth) * 2 - 1,
      1 - (outletY / fullHeight) * 2,
    );
    raycaster.setFromCamera(pickPosition, heroCamera);
    const targetPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.45),
      targetPoint,
    );
    repair?.setTarget(targetPoint);
    repairButton.hidden = !window.matchMedia(
      "(min-width: 901px) and (pointer: fine)",
    ).matches;
    if (repairButton.hidden && repair?.active) {
      repair.cancel();
      idle?.play();
    }
    Object.assign(repairButton.style, {
      left: `${outletX - 20}px`,
      top: `${Math.max(80, outletY - 80)}px`,
      width: `${Math.max(50, pipeViewport.width * 0.4)}px`,
      height: "110px",
    });
    renderer.setSize(fullWidth, fullHeight, false);
    render();
  }
  function updateLighting() {
    const dark = document.documentElement.dataset.theme === "dark";
    pipe.setTheme(dark);
    hemisphere.intensity = dark ? 1.7 : 2;
    key.intensity = dark ? 2.8 : 3.1;
    fill.intensity = dark ? 1.5 : 1.8;
    render();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelFrame();
    clearTimeout(poseTimer);
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    themeObserver?.disconnect();
    hero?.removeEventListener("pointermove", onPointerMove);
    hero?.removeEventListener("pointerleave", onPointerLeave);
    window.removeEventListener("scroll", onViewportChange, true);
    window.removeEventListener("resize", onViewportChange);
    document.removeEventListener("visibilitychange", onDocumentVisibility);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    options.signal.removeEventListener("abort", dispose);
    mixer?.stopAllAction();
    if (model) mixer?.uncacheRoot(model);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const skeletons = new Set<THREE.Skeleton>();
    for (const activeScene of [scene, pipe.scene])
      activeScene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        if (object instanceof THREE.InstancedMesh) object.dispose();
        if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material])
          materials.add(material);
      });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    skeletons.forEach((skeleton) => skeleton.dispose());
    key.shadow.dispose();
    renderer.dispose();
    canvas.remove();
    layer.remove();
    repairButton.remove();
    repairStatus.remove();
  }

  options.signal.addEventListener("abort", dispose, { once: true });
  try {
    const response = await fetch(`/models/dom.glb?v=${domModelVersion}`, {
      signal: options.signal,
      cache: "no-cache",
    });
    if (!response.ok) throw new Error("Dom model could not be loaded.");
    const gltf = await new GLTFLoader().parseAsync(
      await response.arrayBuffer(),
      "/models/",
    );
    model = gltf.scene;
    // GLTF parsing can finish after an unmount; dispose that late scene too.
    if (disposed || options.signal.aborted) {
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
          object.geometry.dispose();
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            material.dispose();
        }
      });
      throw new DOMException("Loading cancelled", "AbortError");
    }
    model.rotation.y = -0.12;
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        if (object instanceof THREE.SkinnedMesh) object.frustumCulled = false;
      }
    });
    scene.add(model);
    // Measure once on load, not on pointer movement or animation frames.
    model.updateWorldMatrix(true, true);
    modelBounds = new THREE.Box3().setFromObject(model, true);
    intersectsHover = createDomHoverTest(model);
    look = model.getObjectByName("Dom_HeadLook");
    mixer = new THREE.AnimationMixer(model);
    repair = createDomRepair(model, pipe.setFlow, (stage) => {
      sceneRoot.setAttribute("data-repair-stage", stage);
      repairButton.disabled = stage !== "idle";
      if (stage === "collecting")
        repairStatus.textContent = "Dom is on his way to fix the leak.";
      if (stage === "fixed") {
        repairStatus.textContent =
          "Leak fixed. Dom has put his wrench back on his belt.";
        repairButton.setAttribute("aria-label", "Pipe repaired");
        idle?.reset().play();
        if (idle) idle.paused = paused;
      }
    });
    const idleClip = THREE.AnimationClip.findByName(gltf.animations, "Idle");
    const waveClip = THREE.AnimationClip.findByName(gltf.animations, "Wave");
    if (idleClip) {
      idle = mixer.clipAction(idleClip).play();
      idle.paused = paused;
    }
    if (waveClip) waveAction = mixer.clipAction(waveClip);
    mixer.addEventListener("finished", (event) => {
      if (event.action === waveAction) {
        stopWave();
        render();
      }
    });
    sceneRoot.appendChild(layer);
    sceneRoot.append(repairButton, repairStatus);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resizeObserver.observe(sceneRoot);
    if (pipeSpace) resizeObserver.observe(pipeSpace);
    visibilityObserver = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? false;
        if (!visible) {
          cancelFrame();
        } else {
          lastTime = performance.now();
          render();
          schedule();
        }
      },
      { threshold: 0.05 },
    );
    visibilityObserver.observe(sceneRoot);
    themeObserver = new MutationObserver(updateLighting);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    hero?.addEventListener("pointermove", onPointerMove, { passive: true });
    hero?.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("scroll", onViewportChange, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", onViewportChange, {
      passive: true,
    });
    document.addEventListener("visibilitychange", onDocumentVisibility);
    canvas.addEventListener("webglcontextlost", onContextLost);
    updateLighting();
    resize();
    mixer.update(0);
    render();
    schedule();
    return {
      setPaused,
      wave,
      hitTest,
      hoverTest,
      pipeHitTest,
      repairPipe,
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
