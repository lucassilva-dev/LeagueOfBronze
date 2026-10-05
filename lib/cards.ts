import type { CardId } from "@/lib/schema";

export type CardDef = {
  id: string;
  cardId: CardId; // id tipado usado no sorteio/registro (individuais + duplas)
  letter?: string; // A–F nas individuais
  title: string;
  description: string; // regra completa
  flavor: string; // frase de "sabor" (TCG)
  emoji: string;
  imageUrl?: string; // arte (meme) da carta; sem ela a carta cai no emoji
  color: string;
  border: string;
  from: string;
  to: string;
  dupla: boolean;
  /**
   * Carta fora de circulação a partir da edição atual.
   *
   * Ela CONTINUA neste arquivo de propósito: o arquivo das edições passadas (/temporadas)
   * e o histórico de sorteios guardam o `cardId` dela, e `CARDS_BY_ID` precisa resolver
   * esse id para mostrar nome e arte. Apagar a carta quebraria o passado; marcar como
   * retirada só tira ela do que é apresentado como regra em vigor (ver `CARTAS_ATIVAS`).
   */
  retirada?: boolean;
};

// 6 Cartinhas individuais (A–F) — afetam o adversário; base do sorteio.
// A letra (`letter`) é a da 3ª Edição. A 4ª retirou a INVASÃO DA YUUMI, então as letras
// mostradas vêm de `letraDaCarta`, que conta no baralho do momento (A–E hoje).
export const CARDS: CardDef[] = [
  {
    id: "ABCDRAFT",
    cardId: "ABCDRAFT",
    letter: "A",
    title: "ABCDRAFT",
    emoji: "🔤",
    imageUrl: "/cartas/abcdraft.jpg",
    color: "#e0894a",
    border: "rgba(224,137,74,.55)",
    from: "#ff8a3d",
    to: "#0e0a05",
    flavor: "Sorteou L e M? Torce pra Lillia não estar banida — ela levou 11 bans nesta edição.",
    description:
      "Duas letras são sorteadas. O capitão adversário monta a composição só com campeões cujos nomes iniciam com essas letras. Não há banimentos nesta carta.",
    dupla: false,
  },
  {
    id: "DRAFT_SABOTADO",
    cardId: "DRAFT_SABOTADO",
    letter: "B",
    title: "DRAFT SABOTADO",
    emoji: "🎭",
    imageUrl: "/cartas/draft-sabotado.jpg",
    color: "#5aa2ff",
    border: "rgba(90,162,255,.55)",
    from: "#5aa2ff",
    to: "#0e0a05",
    flavor: "O adversário monta metade do seu time. Respeitando a rota — pelo menos foi o combinado.",
    description:
      "Quem usou a carta escolhe o campeão de dois jogadores adversários, respeitando a role de cada um (ex.: nada de Yuumi na jungle). Banimentos normais.",
    dupla: false,
  },
  {
    id: "INTER_CLASSE",
    cardId: "INTER_CLASSE",
    letter: "C",
    title: "INTER CLASSE",
    emoji: "⚔️",
    imageUrl: "/cartas/inter-classe.jpg",
    color: "#5fbf6a",
    border: "rgba(95,191,106,.55)",
    from: "#5fbf6a",
    to: "#0e0a05",
    flavor: "Saiu tanque? Boa sorte fazendo dano. Saiu assassino? Boa sorte segurando torre.",
    description:
      "Uma classe de campeões é sorteada. O time adversário só pode escolher campeões daquela classe no draft. Banimentos normais.",
    dupla: false,
  },
  {
    id: "INVASAO_YUUMI",
    cardId: "INVASAO_YUUMI",
    letter: "D",
    title: "INVASÃO DA YUUMI",
    emoji: "🐱",
    imageUrl: "/cartas/invasao-yuumi.jpg",
    color: "#e6b325",
    border: "rgba(230,179,37,.55)",
    from: "#e6b325",
    to: "#0e0a05",
    flavor: "O suporte adversário não escolhe nada: cola na Yuumi e reza. THALAO e Onigami sabem como é.",
    description: "O suporte do time adversário é obrigado a jogar de Yuumi na partida. Banimentos normais.",
    dupla: false,
    // Retirada pelo regulamento da 4ª Edição. Fica aqui pelo histórico da 3ª (ver `retirada`).
    retirada: true,
  },
  {
    id: "INVERSAO_ROTAS",
    cardId: "INVERSAO_ROTAS",
    letter: "E",
    title: "INVERSÃO DE ROTAS",
    emoji: "🔀",
    imageUrl: "/cartas/inversao-rotas.jpg",
    color: "#e85c6a",
    border: "rgba(232,92,106,.55)",
    from: "#e85c6a",
    to: "#0e0a05",
    flavor: "Seu ADC vai pro topo, seu top vai pro bot. A rota que você treinou a vida toda? Hoje não.",
    description:
      "Quem usou a carta escolhe dois jogadores adversários para trocarem de lane entre si. Banimentos normais.",
    dupla: false,
  },
  {
    id: "TUDO_LIBERADO",
    cardId: "TUDO_LIBERADO",
    letter: "F",
    title: "TUDO LIBERADO",
    emoji: "🚫",
    imageUrl: "/cartas/tudo-liberado.jpg",
    color: "#b06bd6",
    border: "rgba(176,107,214,.55)",
    from: "#b06bd6",
    to: "#0e0a05",
    flavor: "O adversário perde os bans. O Mordekaiser, banido 12 vezes no campeonato, finalmente respira.",
    description: "O time adversário fica proibido de banir qualquer campeão durante a fase de banimentos.",
    dupla: false,
  },
];

// 2 Cartinhas duplas — só entram quando os DOIS capitães usam; afetam os dois times.
export const DUPLAS: CardDef[] = [
  {
    id: "AMIGOS_NATUREZA",
    cardId: "AMIGOS_NATUREZA",
    title: "AMIGOS DA NATUREZA",
    emoji: "🌿",
    imageUrl: "/cartas/amigos-natureza.jpg",
    color: "#57d8cb",
    border: "rgba(87,216,203,.6)",
    from: "#57d8cb",
    to: "#0e0a05",
    flavor: "Sem jungler e sem Smite pros DOIS times. O vidotti agiota, 100 abates na selva, não aprovou.",
    description:
      "Nenhum dos dois times pode escolher Jungler nem levar o feitiço de invocador Smite na partida. Banimentos normais.",
    dupla: true,
  },
  {
    id: "DRAFT_INVERTIDO",
    cardId: "DRAFT_INVERTIDO",
    title: "DRAFT INVERTIDO",
    emoji: "🔃",
    imageUrl: "/cartas/draft-invertido.jpg",
    color: "#f2e2b3",
    border: "rgba(242,226,179,.6)",
    from: "#f2e2b3",
    to: "#0e0a05",
    flavor: "Você não escolhe seu campeão: o inimigo escolhe. E ele viu seu histórico.",
    description:
      "Cada time escolhe o draft do outro — os campeões precisam ser da rota de cada jogador, sem trocar campeões entre rotas diferentes. Banimentos normais.",
    dupla: true,
  },
];

export const ALL_CARDS: CardDef[] = [...CARDS, ...DUPLAS];

/**
 * Cartas em vigor na edição atual: todas menos as retiradas, na ordem do regulamento
 * (individuais primeiro, depois as duplas).
 *
 * É o que se apresenta como REGRA — /regras e a vitrine de /cartas. Estatística e
 * histórico continuam usando `ALL_CARDS`/`CARDS_BY_ID`, porque uma carta retirada
 * pode ter sido sorteada numa edição anterior.
 */
export const CARTAS_ATIVAS: CardDef[] = ALL_CARDS.filter((c) => !c.retirada);

/**
 * A partir de quando o baralho do SORTEIO deixou de ter as cartas retiradas.
 *
 * O sorteio é conferível pela semente (`conferirSorteio`): refazer a conta com outro
 * baralho dá outra carta. Então um sorteio da 3ª Edição precisa ser conferido contra o
 * baralho de seis individuais que existia quando ele aconteceu, e um de hoje em diante
 * contra o de cinco. A data separa os dois sem mexer no formato dos registros já gravados.
 */
export const BARALHO_SEM_RETIRADAS_DESDE = "2026-10-05T00:00:00.000Z";

/**
 * O baralho do sorteio num momento: só as individuais, ou todas quando os dois capitães
 * usam carta na mesma partida. Sem `emISO`, o de agora.
 */
export function baralhoDoSorteio(dupla: boolean, emISO?: string): CardDef[] {
  const antigo = emISO !== undefined && emISO < BARALHO_SEM_RETIRADAS_DESDE;
  return (dupla ? ALL_CARDS : CARDS).filter((c) => antigo || !c.retirada);
}

/**
 * A letra da carta individual no baralho daquele momento — A, B, C… na ordem do
 * regulamento. Na 3ª eram seis (A–F); na 4ª, sem a Yuumi, cinco (A–E), e é assim que
 * /regras as mostra. Duplas não têm letra. Sem `emISO`, o baralho de agora.
 */
export function letraDaCarta(cardId: CardId, emISO?: string): string | undefined {
  const individuais = baralhoDoSorteio(false, emISO);
  const i = individuais.findIndex((c) => c.cardId === cardId);
  return i < 0 ? undefined : String.fromCharCode(65 + i);
}

export const CARDS_BY_ID = Object.fromEntries(ALL_CARDS.map((c) => [c.cardId, c])) as Record<
  CardId,
  CardDef
>;

// Opções tipadas (CardId) de todas as cartas registráveis, individuais e duplas. A
// retirada continua na lista — o editor de séries precisa exibir um registro antigo
// que a use —, mas marcada, para ninguém escolhê-la numa série nova sem perceber.
export const CARD_OPTIONS: { id: CardId; title: string }[] = ALL_CARDS.map((c) => ({
  id: c.cardId,
  title: `${c.title}${c.dupla ? " (dupla)" : ""}${c.retirada ? " (retirada)" : ""}`,
}));

export function getCardTitle(id: CardId): string {
  return CARDS_BY_ID[id]?.title ?? id;
}

export function isDuplaCard(id: CardId): boolean {
  return CARDS_BY_ID[id]?.dupla === true;
}
