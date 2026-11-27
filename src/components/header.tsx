"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ThemeToggle } from "./theme-toggle";
import { Brand } from "./brand";

const links = [
  { id: "home", label: "Home" },
  { id: "services", label: "Services" },
  { id: "how-it-works", label: "How it works" },
  { id: "quote", label: "Contact" },
];

function subscribeMobile(callback: () => void) {
  const media = window.matchMedia("(max-width: 900px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function getMobile() {
  return window.matchMedia("(max-width: 900px)").matches;
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("home");
  const panel = useRef<HTMLDivElement>(null);
  const mobile = useSyncExternalStore(subscribeMobile, getMobile, () => false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-10% 0px -65% 0px" },
    );
    for (const { id } of links) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        document.getElementById("menu-toggle")?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target)
      )
        setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const closeOnDesktop = () => {
      if (!media.matches) setMenuOpen(false);
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand priority />
        <div className="nav-panel" ref={panel}>
          <nav
            id="primary-navigation"
            aria-label="Main navigation"
            className={menuOpen ? "main-nav is-open" : "main-nav"}
            inert={mobile && !menuOpen}
            aria-hidden={mobile && !menuOpen ? true : undefined}
          >
            {links.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={active === id ? "location" : undefined}
                onClick={() => {
                  setActive(id);
                  setMenuOpen(false);
                }}
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="header-controls">
            <ThemeToggle />
            <button
              className="icon-button menu-toggle"
              type="button"
              id="menu-toggle"
              aria-controls="primary-navigation"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={(event) => {
                const opening = !menuOpen;
                setMenuOpen(opening);
                if (opening && event.detail === 0) {
                  requestAnimationFrame(() => {
                    if (
                      document
                        .getElementById("menu-toggle")
                        ?.getAttribute("aria-expanded") === "true"
                    )
                      panel.current
                        ?.querySelector<HTMLAnchorElement>("nav a")
                        ?.focus();
                  });
                }
              }}
            >
              <svg
                className="menu-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.65"
                strokeLinecap="round"
                aria-hidden="true"
                focusable="false"
              >
                <path className="menu-line menu-line-top" d="M4 6h16" />
                <path className="menu-line menu-line-middle" d="M4 12h16" />
                <path className="menu-line menu-line-bottom" d="M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
