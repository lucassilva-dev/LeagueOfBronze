/**
 * O TEMA de um time: a página dele com a cara do time — cores, fontes, cenário e ornamentos
 * (pedido do Lucas em 26/10/2026: "cada time a medida que forem mandando").
 *
 * Só DADOS aqui (nada de next/font nem React): o registro é importável em qualquer teste.
 * A estrutura da página temática é a mesma para todos (components/times); o que muda de um
 * time para outro mora num arquivo como lib/temas/equipe-rx.ts.
 */

import type { PaginasHomeTextos } from "@/lib/i18n/messages/paginas-home";

/** As fontes que um tema pode pedir (components/times/fontes-dos-temas.ts carrega cada uma). */
export type ChaveDeFonte = "exo2-italico" | "permanent-marker" | "bungee" | "special-elite" | "knewave" | "kalam";

/** Os cenários prontos (components/times/cenarios: um componente e um CSS module por cenário). */
export type Cenario = "tempestade" | "estacao" | "boteco";

/** Os textos que um tema troca ou acrescenta na página e na ficha (o lema, o "A BORDO"…). */
export type PapelDoTexto =
  | "lema"
  | "estrelando"
  | "aviso"
  | "capitao"
  | "emCartaz"
  | "destino"
  | "carimbo"
  | "fecho"
  | "companheiros";

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
  /** Ícone da rota nas etiquetas e chips. */
  icone: string;
}>;

/**
 * O metal do título, do nick e das molduras (cromo na RX), de cima para baixo: o gradiente do
 * título passa por luz → alto → meio → sombra (a faixa escura do bisel) → fundo → volta → luz →
 * base. `placa` é o fim do gradiente das placas claras (pontos, capitão).
 */
export type MetalDoTema = Readonly<{
  luz: string;
  alto: string;
  meio: string;
  sombra: string;
  fundo: string;
  volta: string;
  base: string;
  placa: string;
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
  metal: MetalDoTema;
  /**
   * O nome do time dividido em assinatura + marca, como no escudo ("EQUIPE" em pincel por baixo
   * do "RX" em cromo). Só vale se o nome do time começar com ele seguido de espaço.
   */
  prefixo?: string;
  /** O mesmo pelo fim do nome: "MINAS" embaixo do "QUEIJO" grande. */
  sufixo?: string;
  /**
   * A cor do time no RESTO do site (tabela, calendário, listas de times e jogadores), no lugar
   * da cor que o nome do draft dava ao id. Clara o bastante para texto sobre o fundo escuro.
   */
  cor: string;
  cenario: Cenario;
  /** A marca letra por letra (cada letra vira uma peça, e o cenário pode animar uma a uma). */
  letraPorLetra?: boolean;
  /**
   * Os textos do tema: o valor é a CHAVE em lib/i18n/messages/paginas-home.ts, para sair no
   * idioma da página. O papel que o tema não troca fica com o texto padrão (ou não aparece).
   */
  textos?: Readonly<Partial<Record<PapelDoTexto, keyof PaginasHomeTextos>>>;
  fotos: Readonly<{
    /** Enquadramento (object-position) por slug do jogador; o resto usa `focoPadrao`. */
    focoPadrao: string;
    foco?: Readonly<Record<string, string>>;
    /** Proporção do retrato da ficha por slug ("3 / 2" para foto deitada); o resto usa 4 / 5. */
    proporcao?: Readonly<Record<string, string>>;
    /**
     * "medalhao": as fotos são AVATARES REDONDOS com fundo transparente (os da 4ª Edição, saídos
     * de .sim/avatar-redondo.cjs). A página mostra o círculo inteiro, nunca cortado: carta,
     * retrato 1:1 e companheiros (tema.module.css e ficha.module.css, `[data-fotos]`). Sem o
     * campo, a foto é um retrato que preenche a moldura (object-fit: cover), como na RX e na QM.
     */
    formato?: "medalhao";
  }>;
}>;
