"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  { href: "/", label: "INÍCIO" },
  { href: "/times", label: "TIMES" },
  { href: "/jogadores", label: "JOGADORES" },
  { href: "/calendario", label: "CALENDÁRIO" },
  { href: "/tabela", label: "TABELA" },
  { href: "/stats", label: "ESTATÍSTICAS" },
  { href: "/cartas", label: "CARTAS" },
  { href: "/regras", label: "REGRAS" },
  { href: "/temporadas", label: "TEMPORADAS" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav() {
  const pathname = usePathname();
  const [collapse, setCollapse] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onResize = () => setCollapse(window.innerWidth < 1060);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!collapse) {
    return (
      <nav aria-label="Navegação principal" style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              style={{
                position: "relative",
                padding: "9px 11px",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: ".11em",
                color: active ? "#f3ece0" : "#d9cbb0",
                whiteSpace: "nowrap",
                textDecoration: "none",
              }}
            >
              {item.label}
              {active ? (
                <span
                  style={{
                    position: "absolute",
                    left: 11,
                    right: 11,
                    bottom: -1,
                    height: 2,
                    background: "linear-gradient(90deg,#f0c88a,#b97e40)",
                    boxShadow: "0 0 10px rgba(232,184,120,.75)",
                  }}
                />
              ) : null}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 5,
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(201,138,75,.08)",
          border: "1px solid rgba(201,138,75,.3)",
          borderRadius: 3,
          cursor: "pointer",
        }}
      >
        <span style={{ width: 20, height: 2, background: "#e6c592" }} />
        <span style={{ width: 20, height: 2, background: "#e6c592" }} />
        <span style={{ width: 20, height: 2, background: "#e6c592" }} />
      </button>
      {menuOpen ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            borderTop: "1px solid rgba(201,138,75,.18)",
            background: "rgba(14,11,6,.98)",
            zIndex: 50,
          }}
        >
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "15px clamp(16px,4vw,24px)",
                  borderTop: "1px solid rgba(201,138,75,.10)",
                  color: active ? "#f0d9ac" : "#e6d8bf",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: ".10em",
                  textDecoration: "none",
                }}
              >
                {item.label}
                {active ? (
                  <span style={{ width: 9, height: 9, background: "#d79a55", transform: "rotate(45deg)" }} />
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
