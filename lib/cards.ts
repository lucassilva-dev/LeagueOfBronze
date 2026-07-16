import type { CardId } from "@/lib/schema";

export type CardDef = {
  id: CardId;
  title: string;
  description: string;
  emoji: string; // arte placeholder (trocável por imagem depois)
  from: string;
  to: string;
};

// As 6 Cartinhas Surpresa do regulamento oficial (REGULAMENTO_OFICIAL.pdf).
export const CARDS: CardDef[] = [
  {
    id: "ABCDRAFT",
    title: "ABCDraft",
    emoji: "🔤",
    from: "#ff8a3d",
    to: "#c2410c",
    description:
      "Duas letras são sorteadas. O capitão adversário deve montar sua composição apenas com campeões cujos nomes iniciam com essas letras.",
  },
  {
    id: "DRAFT_SABOTADO",
    title: "Draft Sabotado",
    emoji: "🎭",
    from: "#c084fc",
    to: "#7c3aed",
    description:
      "O capitão que usou a cartinha escolhe o campeão de dois jogadores do time adversário (respeitando a role de cada um — ex.: não é permitido escolher Yuumi para a jungle).",
  },
  {
    id: "INTER_CLASSE",
    title: "Inter Classe",
    emoji: "⚔️",
    from: "#f6c453",
    to: "#b8860b",
    description:
      "Uma classe de campeões é sorteada. O time adversário só pode escolher campeões daquela classe durante o draft.",
  },
  {
    id: "INVASAO_YUUMI",
    title: "Invasão da Yuumi",
    emoji: "🐱",
    from: "#5eead4",
    to: "#0d9488",
    description: "O suporte do time adversário é obrigado a jogar de Yuumi na partida.",
  },
  {
    id: "INVERSAO_ROTAS",
    title: "Inversão de Rotas",
    emoji: "🔀",
    from: "#7cc0ff",
    to: "#3b7ddd",
    description:
      "O capitão que usou a cartinha escolhe dois jogadores do time adversário para trocarem de lane entre si.",
  },
  {
    id: "TUDO_LIBERADO",
    title: "Tudo Liberado",
    emoji: "🚫",
    from: "#f87171",
    to: "#b91c1c",
    description:
      "O time adversário fica proibido de banir qualquer campeão durante a fase de banimentos.",
  },
];

export const CARDS_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c])) as Record<
  CardId,
  CardDef
>;

export function getCardTitle(id: CardId): string {
  return CARDS_BY_ID[id]?.title ?? id;
}
