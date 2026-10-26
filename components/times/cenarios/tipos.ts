import type { ReactNode } from "react";

/**
 * O que um CENÁRIO entrega à página temática (lib/temas: `tema.cenario`). A estrutura da página
 * — herói, título, chips, cartas, cartela, ficha — é a mesma para todos os times; o cenário é o
 * que faz cada um ter a própria cara.
 *
 * Duas formas de mudar a página:
 *  - PEÇAS (os componentes abaixo), nos lugares marcados da estrutura;
 *  - GANCHOS: uma classe no módulo CSS do cenário com o MESMO nome de uma peça da estrutura
 *    (`casca`, `marca`, `chip`…) é somada a essa peça (components/times/util.ts, comCenario).
 *    O seletor do gancho é sempre `.raiz` + o seletor da base: um nível acima, sem depender
 *    da ordem em que os CSS chegam.
 *
 * Tudo que um cenário desenha é ENFEITE: aria-hidden, sem texto, classes `enf…` quando anima
 * opacidade ou filtro (tests/times/temas-sem-opacidade.test.ts confere os CSS da pasta).
 */
export type CenarioDoTema = Readonly<{
  /** O céu e o que se mexe no fundo, dentro da câmera do palco (components/times/palco.tsx). */
  Fundo: () => ReactNode;
  /** No padding do herói e da ficha: barras de cinema na RX, faixas de latão na Queijo Minas. */
  Moldura: () => ReactNode;
  /** Atrás do escudo: coroa, raio, lascas, aro e ondas na RX; lua, serra e vapor na QM. */
  AtrasDoEscudo: () => ReactNode;
  /** DENTRO do escudo (anda com ele na entrada): farol, fumaça e faíscas na QM. */
  NoEscudo?: () => ReactNode;
  /** Na base do escudo: o chão espelhado na RX, os trilhos na QM. */
  Chao: (props: Readonly<{ imagem: string | null }>) => ReactNode;
  /** A insígnia do capitão, grande (sobre a carta e o retrato). `id` prefixa os ids do SVG. */
  Insignia: (props: Readonly<{ className?: string; id: string }>) => ReactNode;
  /** A mesma insígnia, chapada e pequena (chips, placas, cartela). Pinta com currentColor. */
  InsigniaMini: (props: Readonly<{ className?: string }>) => ReactNode;
  /** Junto da parte pequena do nome: o pincel na RX, a faixa marinho na QM. */
  TracoDoNome?: (props: Readonly<{ className?: string }>) => ReactNode;
  /** Atrás do retrato da ficha (a lua na QM). */
  AtrasDoRetrato?: () => ReactNode;
  /** O módulo CSS do cenário: ganchos com o nome das peças de tema.module.css. */
  classes?: Readonly<Record<string, string>>;
  /** O mesmo para as peças de ficha.module.css (outro módulo: há nomes repetidos, `topo`…). */
  classesDaFicha?: Readonly<Record<string, string>>;
}>;
