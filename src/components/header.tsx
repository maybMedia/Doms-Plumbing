"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { Brand } from "./brand";
import { Icon } from "./icon";

const links = [
  { id: "home", label: "Home" },
  { id: "services", label: "Services" },
  { id: "how-it-works", label: "How it works" },
  { id: "quote", label: "Contact" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("home");

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
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand priority />
        <div className="nav-panel">
          <nav
            id="primary-navigation"
            aria-label="Main navigation"
            className={menuOpen ? "main-nav is-open" : "main-nav"}
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
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name={menuOpen ? "close" : "menu"} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
