import type { CardId } from "@/lib/schema";

export type CardDef = {
  id: string;
  cardId: CardId; // id tipado usado no sorteio/registro (6 individuais + 2 duplas)
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
    color: "#e6b325",
    border: "rgba(230,179,37,.55)",
    from: "#e6b325",
    to: "#0e0a05",
    flavor: "O suporte adversário não escolhe nada: cola na Yuumi e reza. THALAO e Onigami sabem como é.",
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

export const CARDS_BY_ID = Object.fromEntries(ALL_CARDS.map((c) => [c.cardId, c])) as Record<
  CardId,
  CardDef
>;

// Opções tipadas (CardId) de todas as cartas registráveis (6 individuais + 2 duplas).
export const CARD_OPTIONS: { id: CardId; title: string }[] = ALL_CARDS.map((c) => ({
  id: c.cardId,
  title: c.dupla ? `${c.title} (dupla)` : c.title,
}));

export function getCardTitle(id: CardId): string {
  return CARDS_BY_ID[id]?.title ?? id;
}

export function isDuplaCard(id: CardId): boolean {
  return CARDS_BY_ID[id]?.dupla === true;
}
