"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type NavLabel = { href: string; label: string };

type MainNavProps = Readonly<{
  /** Itens já traduzidos, montados no Server Component (o cliente não lê mensagens). */
  labels: NavLabel[];
  ariaLabel: string;
  abrirMenu: string;
}>;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav({ labels, ariaLabel, abrirMenu }: MainNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [rotaAnterior, setRotaAnterior] = useState(pathname);

  // Fecha o menu ao mudar de rota. Ajustar o estado durante a renderização (em vez de num
  // useEffect) é o padrão recomendado pelo React para reagir a uma prop/valor que mudou:
  // evita o flash do menu aberto no primeiro frame da página nova e não dispara o aviso
  // react-hooks/set-state-in-effect.
  if (rotaAnterior !== pathname) {
    setRotaAnterior(pathname);
    setMenuOpen(false);
  }

  /*
   * QUAL NAVEGAÇÃO APARECE É DECIDIDO POR CSS, não por JavaScript.
   *
   * Antes isto era `useState(false)` + um efeito medindo `window.innerWidth`: o HTML do
   * SERVIDOR saía sempre com a navegação de desktop, e no celular o menu só aparecia
   * depois que o efeito rodava — quem estava sem JavaScript (ou antes da hidratação)
   * recebia uma barra larga demais para a tela, sem nenhum caminho para as outras páginas.
   *
   * É a mesma regra que vale para as animações deste projeto: o estado de repouso, o que
   * sai do servidor, tem de ser o CERTO. Com media query, o navegador acerta na primeira
   * pintura e sem script nenhum.
   */
  return (
    <>
      <nav
        aria-label={ariaLabel}
        className="hidden min-[1060px]:flex"
        style={{ alignItems: "center", gap: 2 }}
      >
        {labels.map((item) => {
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

      <div className="min-[1060px]:hidden">
      <button
        type="button"
        aria-label={abrirMenu}
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
          {labels.map((item) => {
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
      </div>
    </>
  );
}
