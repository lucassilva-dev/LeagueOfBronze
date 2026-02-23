"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/tabela", label: "Tabela" },
  { href: "/partidas", label: "Partidas" },
  { href: "/stats", label: "Estatísticas" },
  { href: "/admin", label: "Admin" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className="w-full overflow-x-auto scrollbar-thin">
      <ul className="flex min-w-max items-center gap-2">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold tracking-wide transition",
                  active
                    ? "bg-accent/20 text-accent shadow-glow"
                    : "text-muted hover:bg-white/5 hover:text-text",
                )}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
