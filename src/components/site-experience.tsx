"use client";
import { useEffect, useRef, useState } from "react";
import { BrandLoader } from "./brand-loader";

export function SiteExperience({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"loading" | "leaving" | "ready">(
    "loading",
  );
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let fadeTimer: ReturnType<typeof setTimeout>;
    let limitTimer: ReturnType<typeof setTimeout>;
    const element = content.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (element) element.inert = true;
    const image = document.getElementById(
      "hero-image",
    ) as HTMLImageElement | null;
    const assets = Promise.allSettled([
      document.fonts.ready,
      image?.decode() ?? Promise.resolve(),
    ]);
    const limit = new Promise<void>((resolve) => {
      limitTimer = setTimeout(resolve, 1800);
    });
    void Promise.race([assets, limit]).then(() => {
      if (cancelled) return;
      clearTimeout(limitTimer);
      setPhase("leaving");
      document.body.style.overflow = previousOverflow;
      if (element) element.inert = false;
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      fadeTimer = setTimeout(
        () => {
          if (!cancelled) setPhase("ready");
        },
        reducedMotion ? 0 : 300,
      );
    });
    return () => {
      cancelled = true;
      clearTimeout(limitTimer);
      clearTimeout(fadeTimer);
      document.body.style.overflow = previousOverflow;
      if (element) element.inert = false;
    };
  }, []);
  return (
    <>
      {phase !== "ready" && <BrandLoader leaving={phase === "leaving"} />}
      <div id="site-content" ref={content}>
        {children}
      </div>
    </>
  );
}
