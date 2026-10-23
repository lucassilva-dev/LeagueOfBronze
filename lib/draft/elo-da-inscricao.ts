import { resolveElo } from "@/lib/design";
import type { EloDoJogador } from "@/lib/draft/precos";

/**
 * O elo de uma INSCRIÇÃO do jeito que o draft o enxerga — a mesma fotografia para o preço
 * (lib/draft/precos.ts) e para o corte dos capitães (lib/draft/capitaes.ts).
 *
 * A regra que este arquivo existe para garantir: **depois do congelamento, nada do que o
 * robô da Riot lê muda o draft.** O robô segue atualizando `elo_riot`, `riot_divisao` e
 * `riot_pdl` todo dia (é o que alimenta os requisitos e os alertas), e com o preço por
 * divisão isso bastava para a tabela mudar depois de divulgada. Por isso o congelamento
 * guarda também a divisão e o PDL daquele dia (`divisao_congelada`, `pdl_congelado`), e uma
 * inscrição congelada é lida SÓ pelas colunas congeladas.
 *
 * Puro e sem `server-only`: o painel (prévia de Times e de Inscritos) chama a mesma função
 * que o servidor, com a linha de inscrição que já recebe.
 */

/** As colunas de uma inscrição que decidem o elo. As de leitura podem faltar (banco sem migração). */
export type CamposDeElo = {
  elo_declarado: string;
  elo_verificado: string | null;
  elo_congelado: string | null;
  elo_riot?: string | null;
  riot_divisao?: string | null;
  riot_pdl?: number | null;
  /** Gravadas por `congelarElos` junto com o elo; nulas quando a leitura era de outro tier. */
  divisao_congelada?: string | null;
  pdl_congelado?: number | null;
};

/** O elo que vale: o congelado; sem ele, o verificado; sem ele, o declarado. */
export function eloQueVale(i: Pick<CamposDeElo, "elo_congelado" | "elo_verificado" | "elo_declarado">): string {
  return i.elo_congelado ?? i.elo_verificado ?? i.elo_declarado;
}

/**
 * O `EloDoJogador` de uma inscrição.
 *
 * Congelada: o elo congelado e a leitura congelada com ele. A leitura vale para o mesmo
 * tier do elo (foi conferido ao congelar), então `eloRiot` é o próprio elo congelado —
 * ou nulo quando nada foi congelado junto, e aí o preço fica no meio do elo, como para
 * quem não tem leitura nenhuma.
 *
 * Não congelada: o elo que vale e a última leitura da Riot. `classeDoElo` só aproveita a
 * divisão se a leitura for do mesmo tier.
 */
export function eloDoJogadorDaInscricao(i: CamposDeElo): EloDoJogador {
  if (i.elo_congelado) {
    const divisao = i.divisao_congelada ?? null;
    const pdl = i.pdl_congelado ?? null;
    return { elo: i.elo_congelado, eloRiot: divisao !== null || pdl !== null ? i.elo_congelado : null, divisao, pdl };
  }
  return {
    elo: eloQueVale(i),
    eloRiot: i.elo_riot ?? null,
    divisao: i.riot_divisao ?? null,
    pdl: i.riot_pdl ?? null,
  };
}

/** O elo que vale é um que a tabela do site reconhece? Sem isso não há preço. */
export function temEloReconhecido(i: Pick<CamposDeElo, "elo_congelado" | "elo_verificado" | "elo_declarado">): boolean {
  return resolveElo(eloQueVale(i)) !== null;
}

const DIVISOES_VALIDAS = new Set(["I", "II", "III", "IV"]);

/**
 * O que `congelarElos` grava junto com o elo: a divisão e o PDL lidos na Riot, mas SÓ se
 * a leitura for do mesmo tier do elo que está sendo congelado. Elo travado à mão num tier
 * diferente do da Riot (conta principal em outro lugar, combinado no grupo) não leva a
 * divisão de outro elo — fica no meio do elo dele.
 */
export function leituraParaCongelar(params: {
  elo: string;
  eloRiot?: string | null;
  divisao?: string | null;
  pdl?: number | null;
}): { divisao_congelada: string | null; pdl_congelado: number | null } {
  const meta = resolveElo(params.elo);
  const metaRiot = resolveElo(params.eloRiot ?? null);
  if (!meta || !metaRiot || meta.key !== metaRiot.key) return { divisao_congelada: null, pdl_congelado: null };

  const divisao = (params.divisao ?? "").trim().toUpperCase();
  const pdl = params.pdl;
  return {
    divisao_congelada: DIVISOES_VALIDAS.has(divisao) ? divisao : null,
    pdl_congelado: typeof pdl === "number" && Number.isInteger(pdl) && pdl >= 0 ? pdl : null,
  };
}
