import type { CardId } from "@/lib/schema";

export type CardDef = {
  id: string;
  cardId?: CardId; // definido só nas 6 individuais (usadas no sorteio/registro)
  letter?: string; // A–F nas individuais
  title: string;
  description: string; // regra completa
  flavor: string; // frase de "sabor" (TCG)
  emoji: string;
  color: string;
  border: string;
  from: string;
  to: string;
  dupla: boolean;
};

// 6 Cartinhas individuais (A–F) — afetam o adversário; base do sorteio.
export const CARDS: CardDef[] = [
  {
    id: "ABCDRAFT",
    cardId: "ABCDRAFT",
    letter: "A",
    title: "ABCDRAFT",
    emoji: "🔤",
    color: "#e0894a",
    border: "rgba(224,137,74,.55)",
    from: "#ff8a3d",
    to: "#0e0a05",
    flavor: "Sorteou A e B? Boa sorte fechando o time só com Aatrox e Blitzcrank.",
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
    color: "#5aa2ff",
    border: "rgba(90,162,255,.55)",
    from: "#5aa2ff",
    to: "#0e0a05",
    flavor: "O inimigo escolhe os campeões de dois dos seus. Respeitando a role... teoricamente.",
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
    color: "#5fbf6a",
    border: "rgba(95,191,106,.55)",
    from: "#5fbf6a",
    to: "#0e0a05",
    flavor: "Uma classe é sorteada e é ela o jogo todo. Prepare o coração pro time de tanks.",
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
    color: "#e6b325",
    border: "rgba(230,179,37,.55)",
    from: "#e6b325",
    to: "#0e0a05",
    flavor: "O Presidente vira refém do time, sendo obrigado a entrar, pra jogar de Yuumi.",
    description: "O suporte do time adversário é obrigado a jogar de Yuumi na partida. Banimentos normais.",
    dupla: false,
  },
  {
    id: "INVERSAO_ROTAS",
    cardId: "INVERSAO_ROTAS",
    letter: "E",
    title: "INVERSÃO DE ROTAS",
    emoji: "🔀",
    color: "#e85c6a",
    border: "rgba(232,92,106,.55)",
    from: "#e85c6a",
    to: "#0e0a05",
    flavor: "Seu ADC vai pro topo, seu top vai pro bot. Que comece a bagunça.",
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
    color: "#b06bd6",
    border: "rgba(176,107,214,.55)",
    from: "#b06bd6",
    to: "#0e0a05",
    flavor: "Ninguém bane nada essa partida. Aquele one-trick de Yasuo agradece de coração.",
    description: "O time adversário fica proibido de banir qualquer campeão durante a fase de banimentos.",
    dupla: false,
  },
];

// 2 Cartinhas duplas — só entram quando os DOIS capitães usam; afetam os dois times.
export const DUPLAS: CardDef[] = [
  {
    id: "AMIGOS_NATUREZA",
    title: "AMIGOS DA NATUREZA",
    emoji: "🌿",
    color: "#57d8cb",
    border: "rgba(87,216,203,.6)",
    from: "#57d8cb",
    to: "#0e0a05",
    flavor: "Sem jungler e sem Smite pros DOIS times. A selva finalmente vai descansar.",
    description:
      "Nenhum dos dois times pode escolher Jungler nem levar o feitiço de invocador Smite na partida. Banimentos normais.",
    dupla: true,
  },
  {
    id: "DRAFT_INVERTIDO",
    title: "DRAFT INVERTIDO",
    emoji: "🔃",
    color: "#f2e2b3",
    border: "rgba(242,226,179,.6)",
    from: "#f2e2b3",
    to: "#0e0a05",
    flavor: "Cada time monta o draft do outro. Confie no inimigo — se tiver coragem.",
    description:
      "Cada time escolhe o draft do outro — os campeões precisam ser da rota de cada jogador, sem trocar campeões entre rotas diferentes. Banimentos normais.",
    dupla: true,
  },
];

export const ALL_CARDS: CardDef[] = [...CARDS, ...DUPLAS];

export const CARDS_BY_ID = Object.fromEntries(CARDS.map((c) => [c.cardId as CardId, c])) as Record<
  CardId,
  CardDef
>;

// Opções tipadas (CardId) das 6 cartas do sorteio/registro.
export const CARD_OPTIONS: { id: CardId; title: string }[] = CARDS.map((c) => ({
  id: c.cardId as CardId,
  title: c.title,
}));

export function getCardTitle(id: CardId): string {
  return CARDS_BY_ID[id]?.title ?? id;
}
