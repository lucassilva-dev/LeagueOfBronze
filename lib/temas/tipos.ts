/**
 * O TEMA de um time: a página dele com a cara do time — cores, fontes, cenário e ornamentos
 * (pedido do Lucas em 26/10/2026: "cada time a medida que forem mandando").
 *
 * Só DADOS aqui (nada de next/font nem React): o registro é importável em qualquer teste.
 * A estrutura da página temática é a mesma para todos (components/times); o que muda de um
 * time para outro mora num arquivo como lib/temas/equipe-rx.ts.
 */

/** As fontes que um tema pode pedir (components/times/fontes-dos-temas.ts carrega cada uma). */
export type ChaveDeFonte = "exo2-italico" | "permanent-marker";

/** Os cenários prontos (um CSS module por cenário em components/times/cenarios). */
export type Cenario = "tempestade";

export type CoresDoTema = Readonly<{
  /** Fundo base, letreiro, véu das fotos. */
  breu: string;
  /** Céu, topo do palco. */
  ceu: string;
  /** Sombras coloridas, miolo das cartas. */
  abismo: string;
  /** Poças de luz, hover dos botões. */
  royal: string;
  /** Aro, horizonte, bordas. Nunca em texto pequeno. */
  primaria: string;
  /** Corpo do raio, contornos, lascas. */
  neon: string;
  /** Anel de foco, aresta do metal, núcleo das ondas. */
  arco: string;
  /** Núcleo branco do raio e do flare. */
  nucleo: string;
  /** Texto principal. */
  texto: string;
  /** Texto de apoio forte (nome real). */
  prata: string;
  /** Rótulos e créditos miúdos. */
  apoio: string;
  /** Links e destaques pequenos. */
  acento: string;
  /** Texto sobre as placas de metal. */
  tinta: string;
}>;

export type TemaDoTime = Readonly<{
  /**
   * A chave do registro: o SLUG do time, nunca o id. O id sai do nome do draft (CHAMA,
   * CARMESIM…) e volta na edição seguinte para outro time; o slug acompanha o nome do time.
   * Se o slug mudar, a página volta ao visual padrão sem quebrar.
   */
  slug: string;
  fontes: Readonly<{ titulo: ChaveDeFonte; assinatura?: ChaveDeFonte }>;
  cores: CoresDoTema;
  /**
   * O nome do time dividido em assinatura + marca, como no escudo ("EQUIPE" em pincel por baixo
   * do "RX" em cromo). Só vale se o nome do time começar com ele seguido de espaço.
   */
  prefixo?: string;
  /**
   * A cor do time no RESTO do site (tabela, calendário, listas de times e jogadores), no lugar
   * da cor que o nome do draft dava ao id. Clara o bastante para texto sobre o fundo escuro.
   */
  cor: string;
  cenario: Cenario;
  /** Enquadramento das fotos (object-position) por slug do jogador; o resto usa `focoPadrao`. */
  fotos: Readonly<{ focoPadrao: string; foco?: Readonly<Record<string, string>> }>;
}>;
