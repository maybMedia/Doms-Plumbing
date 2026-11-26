"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import type { DomScene } from "@/lib/dom-scene";
import domPoster from "../../public/models/dom-poster.png";
import { domModelVersion } from "@/lib/dom-model-version";

function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function getMotionPreference() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function DomCharacter() {
  return <DomCharacterScene key={domModelVersion} />;
}

function DomCharacterScene() {
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    getMotionPreference,
    () => true,
  );
  const paused = reducedMotion;
  const pausedRef = useRef(true);
  const host = useRef<HTMLSpanElement>(null);
  const controller = useRef<DomScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [waving, setWaving] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    const element = host.current;
    if (!element) return;
    void import("@/lib/dom-scene")
      .then((module) =>
        module.mountDomScene(element, {
          signal: abort.signal,
          paused: pausedRef.current,
          onWaveChange: (value) => {
            if (!abort.signal.aborted) setWaving(value);
          },
          onUnavailable: () => {
            if (!abort.signal.aborted) {
              setReady(false);
              setFailed(true);
            }
          },
        }),
      )
      .then((scene) => {
        if (abort.signal.aborted) {
          scene.dispose();
          return;
        }
        controller.current = scene;
        scene.setPaused(pausedRef.current);
        setReady(true);
      })
      .catch(() => {
        if (!abort.signal.aborted) setFailed(true);
      });
    return () => {
      abort.abort();
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
    controller.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    const hero = host.current?.closest<HTMLElement>("#home");
    if (!ready || failed || !hero) return;
    let hoverFrame: number | null = null;
    let pointerX = 0;
    let pointerY = 0;
    let pointerTarget: EventTarget | null = null;
    // The expanded transparent canvas must not intercept the quote or service
    // links. Delegate pointer input to the hero and only activate a mesh hit.
    function isControl(target: EventTarget | null) {
      return (
        target instanceof Element &&
        target.closest("a, button, input, textarea, select, summary")
      );
    }
    function onClick(event: globalThis.MouseEvent) {
      if (event.defaultPrevented || isControl(event.target)) return;
      if (controller.current?.pipeHitTest(event.clientX, event.clientY)) {
        controller.current.repairPipe();
      } else if (controller.current?.hitTest(event.clientX, event.clientY)) {
        controller.current.wave(reducedMotion);
      }
    }
    function updateHover() {
      hoverFrame = null;
      if (!hero) return;
      const cursor =
        !isControl(pointerTarget) &&
        controller.current?.hoverTest(pointerX, pointerY)
          ? "pointer"
          : "";
      if (hero.style.cursor !== cursor) hero.style.cursor = cursor;
    }
    function onPointerMove(event: globalThis.PointerEvent) {
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerTarget = event.target;
      if (hoverFrame === null) hoverFrame = requestAnimationFrame(updateHover);
    }
    function onPointerLeave() {
      if (hoverFrame !== null) cancelAnimationFrame(hoverFrame);
      hoverFrame = null;
      if (hero) hero.style.cursor = "";
    }
    hero.addEventListener("click", onClick);
    hero.addEventListener("pointermove", onPointerMove, { passive: true });
    hero.addEventListener("pointerleave", onPointerLeave);
    return () => {
      hero.removeEventListener("click", onClick);
      hero.removeEventListener("pointermove", onPointerMove);
      hero.removeEventListener("pointerleave", onPointerLeave);
      onPointerLeave();
    };
  }, [ready, failed, reducedMotion]);

  function greet(event: MouseEvent<HTMLButtonElement>) {
    if (!controller.current || waving) return;
    // Keyboard activation has no pointer coordinates. Mouse/touch clicks must
    // intersect the actual model, not the transparent space around it.
    if (
      event.detail === 0 ||
      controller.current.hitTest(event.clientX, event.clientY)
    ) {
      controller.current.wave(reducedMotion);
    }
  }

  return (
    <div
      className={`dom-character${ready && !failed ? " is-ready" : ""}`}
      data-model-state={failed ? "fallback" : ready ? "ready" : "loading"}
      data-motion={paused ? "paused" : "playing"}
      data-waving={waving}
    >
      <figure className="dom-figure">
        <button
          className="dom-interaction"
          type="button"
          disabled={!ready || failed}
          aria-label={
            ready && !failed
              ? "Make Dom wave"
              : "Cartoon Dom in his plumbing uniform"
          }
          aria-describedby="dom-character-description"
          aria-busy={waving}
          title={ready && !failed ? "Click Dom to wave" : undefined}
          onClick={greet}
        >
          <Image
            className="dom-poster"
            src={domPoster}
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 100vw, 45vw"
          />
          <span ref={host} className="dom-canvas" />
        </button>
        <figcaption id="dom-character-description" className="sr-only">
          A cartoon 3D Dom wearing his navy plumbing uniform and tool belt.
          Click, tap, or use Enter or Space to make him wave.
        </figcaption>
      </figure>
    </div>
  );
}
