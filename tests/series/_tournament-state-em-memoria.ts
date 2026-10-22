/**
 * A linha `tournament_state` do Supabase, FALSA e em memória, para os testes de
 * concorrência do dataset.
 *
 * Roda o `lib/data-store.ts` de verdade: só o cliente do Supabase é trocado. Cobre o que o
 * data-store usa dessa tabela — `select ... eq(id) maybeSingle`, a gravação condicionada
 * `update ... eq(id) eq(version) select(version)` e o `insert` da semeadura.
 *
 * Os ganchos deixam o teste injetar a gravação de OUTRA requisição num ponto exato (antes
 * da N-ésima leitura, depois da N-ésima gravação): é assim que se monta uma corrida sem
 * depender de relógio.
 *
 * Uso (o `vi.mock` precisa ficar no arquivo de teste):
 *   vi.mock("@supabase/supabase-js", async () => {
 *     const m = await import("./_tournament-state-em-memoria");
 *     return { createClient: () => m.clienteFalso };
 *   });
 */
import type { NextRequest } from "next/server";

import { tournamentDatasetSchema, type TournamentDataset } from "@/lib/schema";

type Linha = { id: string; payload: unknown; updated_at?: string; version: number };

export const banco = {
  linha: null as Linha | null,
  leituras: 0,
  gravacoes: 0,
  tentativasDeGravar: 0,
  /** n-ésima leitura (1-based) → roda ANTES de a leitura devolver. */
  antesDaLeitura: new Map<number, () => void>(),
  /** n-ésima gravação bem-sucedida (1-based) → roda logo DEPOIS dela. */
  depoisDaGravacao: new Map<number, () => void>(),
  /** n-ésima TENTATIVA de `update` (1-based) → roda antes de o banco conferir a versão. */
  antesDeGravar: new Map<number, () => void>(),
};

export function zerarBanco(dataset: TournamentDataset, versao = 7) {
  banco.linha = { id: "leagueofbronze", payload: structuredClone(dataset), version: versao };
  banco.leituras = 0;
  banco.gravacoes = 0;
  banco.tentativasDeGravar = 0;
  banco.antesDaLeitura.clear();
  banco.depoisDaGravacao.clear();
  banco.antesDeGravar.clear();
}

/** O que está gravado agora, já validado. */
export function gravado(): TournamentDataset {
  return tournamentDatasetSchema.parse(structuredClone(banco.linha!.payload));
}

/** OUTRA requisição gravando por fora (ex.: o sorteio ao vivo no PC da transmissão). */
export function gravarPorFora(mudar: (dataset: TournamentDataset) => void) {
  const dataset = gravado();
  mudar(dataset);
  banco.linha = { ...banco.linha!, payload: dataset, version: banco.linha!.version + 1 };
}

function from() {
  return {
    select() {
      const filtros: Record<string, unknown> = {};
      const consulta = {
        eq(campo: string, valor: unknown) {
          filtros[campo] = valor;
          return consulta;
        },
        async maybeSingle() {
          banco.leituras += 1;
          banco.antesDaLeitura.get(banco.leituras)?.();
          const linha = banco.linha;
          if (!linha || linha.id !== filtros.id) return { data: null, error: null };
          return { data: structuredClone(linha), error: null };
        },
      };
      return consulta;
    },
    update(valores: Partial<Linha>) {
      const filtros: Record<string, unknown> = {};
      const consulta = {
        eq(campo: string, valor: unknown) {
          filtros[campo] = valor;
          return consulta;
        },
        async select() {
          banco.tentativasDeGravar += 1;
          banco.antesDeGravar.get(banco.tentativasDeGravar)?.();
          const linha = banco.linha;
          if (!linha || linha.id !== filtros.id) return { data: [], error: null };
          if (filtros.version !== undefined && linha.version !== filtros.version) return { data: [], error: null };
          banco.linha = { ...linha, ...structuredClone(valores) } as Linha;
          banco.gravacoes += 1;
          banco.depoisDaGravacao.get(banco.gravacoes)?.();
          return { data: [{ version: valores.version }], error: null };
        },
      };
      return consulta;
    },
    async insert(valores: Linha) {
      if (banco.linha) return { error: { message: "duplicate key" } };
      banco.linha = structuredClone(valores);
      return { error: null };
    },
  };
}

export const clienteFalso = { from };

export function ligarSupabaseFalso() {
  process.env.DATA_PROVIDER = "supabase";
  process.env.SUPABASE_URL = "https://falso.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "chave-falsa-de-teste";
  delete process.env.SUPABASE_DB_SCHEMA;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
}

export type Identidade = {
  id: string;
  username: string;
  displayName: string;
  isMaster: boolean;
  scopes: string[];
  mustChangePassword: boolean;
  legacy: boolean;
};

export const MASTER: Identidade = {
  id: "u-lucas",
  username: "lucas",
  displayName: "Lucas",
  isMaster: true,
  scopes: [],
  mustChangePassword: false,
  legacy: false,
};

/** Quem o `requireAdmin` falso devolve. */
export const sessao = { identity: { ...MASTER } as Identidade };

export function req(corpo: unknown, method = "PUT"): NextRequest {
  const texto = JSON.stringify(corpo);
  return {
    method,
    headers: new Headers({ "content-length": String(texto.length), origin: "http://localhost" }),
    json: async () => JSON.parse(texto),
    text: async () => texto,
    formData: async () => {
      const form = new FormData();
      for (const [chave, valor] of Object.entries(corpo as Record<string, string>)) form.append(chave, valor);
      return form;
    },
  } as unknown as NextRequest;
}

/** Dia de jogo da 4ª: 4 times, 1 jogador por time, séries 4 e 5 ainda sem nada. */
export function datasetDoDia(): TournamentDataset {
  const jogador = (id: string, teamId: string) => ({ id, nick: id, slug: id, teamId, role1: "MID", elo: "Ouro" });
  return tournamentDatasetSchema.parse({
    tournament: {
      name: "4ª Edição",
      lastUpdatedISO: "2026-11-21T00:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      status: "active",
      seasonId: "s4",
      startedAtISO: "2026-11-01T00:00:00.000Z",
    },
    teams: ["a", "b", "c", "d"].map((t) => ({ id: t, name: t.toUpperCase(), slug: t })),
    players: [jogador("a1", "a"), jogador("b1", "b"), jogador("c1", "c"), jogador("d1", "d")],
    seriesMatches: [
      { id: "4a-jogo-04", date: "2026-11-21T13:30:00-03:00", teamAId: "a", teamBId: "b", games: [] },
      { id: "4a-jogo-05", date: "2026-11-21T15:30:00-03:00", teamAId: "c", teamBId: "d", games: [] },
    ],
    standingsSeed: [],
    archivedSeasons: [],
  });
}

/** Um jogo da série A x B, vencido por `vencedor`, com o K/D/A dos dois. */
export function jogoAB(vencedor: "a" | "b") {
  return {
    winnerTeamId: vencedor,
    mvpPlayerId: `${vencedor}1`,
    statsByPlayer: [
      { playerId: "a1", kills: 5, deaths: 1, assists: 4 },
      { playerId: "b1", kills: 1, deaths: 5, assists: 1 },
    ],
  };
}
