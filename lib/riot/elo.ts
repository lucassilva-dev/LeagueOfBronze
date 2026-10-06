/**
 * O tier que a Riot devolve, em inglês, traduzido para o rótulo do site.
 *
 * Mapa explícito, e não `resolveElo`: aquele resolve por apelido em português e por
 * prefixo de 4 letras, e por isso devolve `null` para IRON, SILVER, EMERALD,
 * GRANDMASTER e CHALLENGER ("GRAN" não é "GRAO", "EMER" não casa com nada). Um `null`
 * ali fazia a ficha recusar e o congelamento parar no meio. Mexer no `resolveElo` mudaria
 * a leitura do site inteiro — aqui o problema fica contido no robô.
 *
 * Os rótulos são exatamente os de `ELO_TABLE` em `lib/design.ts`, e é por eles que
 * `pontosDoElo` chega ao preço do jogador.
 */
const TIER_PARA_ROTULO: Record<string, string> = {
  IRON: "Ferro",
  BRONZE: "Bronze",
  SILVER: "Prata",
  GOLD: "Ouro",
  PLATINUM: "Platina",
  EMERALD: "Esmeralda",
  DIAMOND: "Diamante",
  MASTER: "Mestre",
  GRANDMASTER: "Grão-Mestre",
  CHALLENGER: "Desafiante",
};

/** Rótulo do site para um tier da Riot, ou `null` para um tier que não conhecemos. */
export function eloDaRiot(tier: string | null | undefined): string | null {
  if (!tier) return null;
  return TIER_PARA_ROTULO[tier.trim().toUpperCase()] ?? null;
}

/** Fila ranqueada solo/duo. A flex (`RANKED_FLEX_SR`) não conta nesta edição. */
export const FILA_SOLO_DUO = "RANKED_SOLO_5x5";

/** Código da fila solo/duo no histórico de partidas (match-v5). */
export const FILA_SOLO_DUO_PARTIDAS = 420;

/** Plataforma do campeonato. Conta em outro servidor não serve. */
export const PLATAFORMA_DO_CAMPEONATO = "br1";
