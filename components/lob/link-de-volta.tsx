import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/**
 * O «voltar» da ficha do jogador (lib/voltar-da-ficha.ts).
 *
 * Para o time, um `Link` do Next. Para a LISTA (`/jogadores#jogador-<slug>`), uma navegação
 * comum: a do Next troca a URL por `pushState`, que não atualiza o `:target` — e é o `:target`
 * que marca o card de onde a pessoa saiu (`.lob-card-alvo:target`, globals.css), com o
 * `scroll-margin-top` que o pousa abaixo do cabeçalho fixo.
 */
export function LinkDeVolta({
  href,
  className,
  style,
  children,
}: Readonly<{ href: string; className?: string; style?: CSSProperties; children: ReactNode }>) {
  if (href.includes("#")) {
    return (
      <a href={href} className={className} style={style}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}
