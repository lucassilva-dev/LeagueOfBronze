import Image from "next/image";
import Link from "next/link";

import { MainNav } from "@/components/main-nav";
import { StarsCanvas } from "@/components/stars-canvas";

type SiteFrameProps = Readonly<{ children: React.ReactNode }>;

export function SiteFrame({ children }: SiteFrameProps) {
  return (
    <div className="relative min-h-screen">
      <StarsCanvas />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid opacity-20" />

      <header className="sticky top-0 z-30 border-b border-white/5 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="group inline-flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 shadow-glow">
                <Image
                  src="/lol-icon.svg"
                  alt="Ícone do campeonato"
                  width={24}
                  height={24}
                  className="h-6 w-6"
                  priority
                />
              </span>
              <div>
                <p className="font-display text-sm font-bold tracking-[0.18em] text-text">
                  LEAGUE OF BRONZE
                </p>
                <p className="text-xs text-muted">Campeonato amador</p>
              </div>
            </Link>
          </div>
          <MainNav />
        </div>
      </header>

      {children}
    </div>
  );
}
