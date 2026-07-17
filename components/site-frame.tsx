import Link from "next/link";

import { MainNav } from "@/components/main-nav";

type SiteFrameProps = Readonly<{ children: React.ReactNode }>;

const NOISE =
  "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22140%22 height=%22140%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')";

export function SiteFrame({ children }: SiteFrameProps) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", color: "#b8ab97", overflowX: "hidden" }}>
      {/* Camada de glows bronze + teal + listras diagonais */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundColor: "#100d07",
          backgroundImage:
            "radial-gradient(1100px 640px at 8% -8%,rgba(201,138,75,.20),transparent 62%),radial-gradient(920px 720px at 108% 114%,rgba(70,214,200,.07),transparent 55%),repeating-linear-gradient(135deg,rgba(201,138,75,.035) 0 2px,transparent 2px 26px)",
        }}
      />
      {/* Ruído fininho */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.05,
          mixBlendMode: "overlay",
          backgroundImage: NOISE,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            background: "linear-gradient(180deg,rgba(16,13,7,.95),rgba(16,13,7,.80))",
            borderBottom: "1px solid rgba(201,138,75,.22)",
          }}
        >
          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              padding: "12px clamp(16px,4vw,24px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <Link
              href="/"
              style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Os Bronzes"
                width={44}
                height={44}
                style={{
                  width: 44,
                  height: 44,
                  objectFit: "contain",
                  borderRadius: 6,
                  flexShrink: 0,
                  filter: "drop-shadow(0 0 14px rgba(232,184,120,.4))",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                <span
                  className="lob-display"
                  style={{ fontSize: 16, letterSpacing: ".05em", color: "#f3ece0" }}
                >
                  OS BRONZES
                </span>
                <span style={{ fontSize: 9, letterSpacing: ".34em", color: "#a98a5f", marginTop: 4 }}>
                  3ª EDIÇÃO
                </span>
              </div>
            </Link>
            <MainNav />
          </div>
          <div
            style={{
              height: 1,
              background: "linear-gradient(90deg,transparent,rgba(232,184,120,.35),transparent)",
            }}
          />
        </header>

        <div style={{ flex: 1 }}>{children}</div>

        <footer style={{ position: "relative", borderTop: "1px solid rgba(201,138,75,.16)" }}>
          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              padding: "22px clamp(16px,4vw,24px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              fontSize: 11,
              letterSpacing: ".10em",
              color: "#6f6656",
            }}
          >
            <span>OS BRONZES · 3ª EDIÇÃO · 2026</span>
            <span>MECÂNICA DUVIDOSA · ENTRETENIMENTO IMACULADO</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
