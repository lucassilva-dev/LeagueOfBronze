import { NextResponse } from "next/server";

import { respostaDeErro } from "@/lib/security/resposta-erro";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/security/route-guard";

export const dynamic = "force-dynamic";

const DEFAULT_RIOT_PLATFORM = "BR1";

const importRiotMatchSchema = z.object({
  matchId: z.string().trim().min(3, "ID da partida obrigatório."),
});

const riotApiParticipantSchema = z.object({
  participantId: z.number().int(),
  teamId: z.number().int(),
  puuid: z.string(),
  championName: z.string(),
  kills: z.number().int(),
  deaths: z.number().int(),
  assists: z.number().int(),
  win: z.boolean(),
  riotIdGameName: z.string().nullable().optional(),
  riotIdTagline: z.string().nullable().optional(),
  summonerName: z.string().nullable().optional(),
});

const riotApiMatchSchema = z.object({
  metadata: z.object({
    matchId: z.string(),
  }),
  info: z.object({
    gameDuration: z.number(),
    participants: z.array(riotApiParticipantSchema).min(1),
  }),
});

type RiotRegionalRouting = "americas" | "europe" | "asia" | "sea";

function getRiotApiKey() {
  return process.env.RIOT_API_KEY?.trim() || "";
}

function getDefaultRiotPlatform() {
  return process.env.RIOT_DEFAULT_PLATFORM?.trim().toUpperCase() || DEFAULT_RIOT_PLATFORM;
}

function normalizeMatchIdInput(input: string) {
  const trimmed = input.trim().toUpperCase();
  if (/^\d+$/.test(trimmed)) {
    return `${getDefaultRiotPlatform()}_${trimmed}`;
  }
  return trimmed;
}

function inferRegionalRoutingFromMatchId(matchId: string): RiotRegionalRouting | null {
  const prefix = matchId.split("_")[0]?.toUpperCase();
  if (!prefix) return null;

  const mapping: Record<string, RiotRegionalRouting> = {
    BR1: "americas",
    LA1: "americas",
    LA2: "americas",
    NA1: "americas",
    EUN1: "europe",
    EUW1: "europe",
    TR1: "europe",
    RU: "europe",
    JP1: "asia",
    KR: "asia",
    OC1: "sea",
    PH2: "sea",
    SG2: "sea",
    TH2: "sea",
    TW2: "sea",
    VN2: "sea",
  };

  return mapping[prefix] ?? null;
}

function toDurationSeconds(value: number) {
  // Match-V5 retorna segundos; partidas antigas podem vir em ms.
  return value > 10_000 ? Math.round(value / 1000) : Math.round(value);
}

function getRiotApiErrorMessage(raw: unknown) {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "status" in raw &&
    typeof (raw as { status?: unknown }).status === "object"
  ) {
    return (raw as { status?: { message?: string } }).status?.message;
  }

  return undefined;
}

/**
 * Traduz a recusa da Riot para uma mensagem que o organizador entende, sem repassar
 * texto cru da API. O caso que mais importa é o 429: as políticas da Riot exigem que o
 * app respeite o limite de requisições, então aqui a gente PARA e diz quantos segundos
 * esperar (cabeçalho Retry-After) em vez de deixar o usuário martelar o botão e afundar
 * mais ainda a cota.
 */
function mensagemDeRecusaDaRiot(status: number, retryAfter: string | null, riotError?: string) {
  if (status === 429) {
    const segundos = Number(retryAfter);
    const espera = Number.isFinite(segundos) && segundos > 0 ? `${segundos} segundo(s)` : "alguns instantes";
    return `Limite de requisições da Riot atingido. Aguarde ${espera} antes de importar de novo.`;
  }
  if (status === 401 || status === 403) {
    return "A Riot recusou a chave de API (expirada ou sem permissão). Renove a RIOT_API_KEY.";
  }
  if (status === 404) {
    return "Partida não encontrada na Riot. Confira o ID do jogo e a região.";
  }
  if (status === 503 || status === 500) {
    return "A API da Riot está instável agora. Tente novamente em alguns minutos.";
  }
  return `Falha ao consultar Riot (${status}). ` + (riotError || "Confira o ID do jogo e a RIOT_API_KEY.");
}

function getWinningSide(blueWins: number, redWins: number) {
  if (blueWins === redWins) return null;
  return blueWins > redWins ? ("BLUE" as const) : ("RED" as const);
}

export async function POST(request: NextRequest) {
  const guarda = await requireAdmin(request, "riot:import");
  if (!guarda.ok) return guarda.response;

  const riotApiKey = getRiotApiKey();
  if (!riotApiKey) {
    return NextResponse.json(
      {
        error:
          "RIOT_API_KEY não configurada. Defina a chave no ambiente para importar partidas do LoL.",
      },
      { status: 500 },
    );
  }

  try {
    const body = importRiotMatchSchema.parse(await request.json());
    const normalizedMatchId = normalizeMatchIdInput(body.matchId);
    const regionalRouting = inferRegionalRoutingFromMatchId(normalizedMatchId);

    if (!regionalRouting) {
      return NextResponse.json(
        {
          error:
            "Não foi possível inferir a região da Riot pelo ID informado. Use `BR1_123...` ou apenas o número do jogo.",
        },
        { status: 400 },
      );
    }

    const url = `https://${regionalRouting}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(
      normalizedMatchId,
    )}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Riot-Token": riotApiKey,
      },
      cache: "no-store",
    });

    const raw = (await response.json().catch(() => ({}))) as unknown;

    if (!response.ok) {
      const riotError = getRiotApiErrorMessage(raw);
      const retryAfter = response.headers.get("retry-after");
      const status = response.status >= 400 && response.status < 600 ? response.status : 502;

      // Repassa o Retry-After para o painel poder respeitar a espera pedida pela Riot.
      const headers = retryAfter && status === 429 ? { "Retry-After": retryAfter } : undefined;

      return NextResponse.json(
        { error: mensagemDeRecusaDaRiot(response.status, retryAfter, riotError) },
        { status, headers },
      );
    }

    const parsed = riotApiMatchSchema.parse(raw);

    const participants = parsed.info.participants
      .filter((participant) => participant.teamId === 100 || participant.teamId === 200)
      .sort((a, b) => a.teamId - b.teamId || a.participantId - b.participantId)
      .map((participant) => ({
        participantId: participant.participantId,
        side: participant.teamId === 100 ? ("BLUE" as const) : ("RED" as const),
        puuid: participant.puuid,
        riotIdGameName: participant.riotIdGameName ?? null,
        riotIdTagline: participant.riotIdTagline ?? null,
        summonerName: participant.summonerName ?? null,
        riotId:
          participant.riotIdGameName && participant.riotIdTagline
            ? `${participant.riotIdGameName}#${participant.riotIdTagline}`
            : participant.riotIdGameName || participant.summonerName || participant.puuid,
        champion: participant.championName,
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
        win: participant.win,
      }));

    const blueWins = participants.filter(
      (participant) => participant.side === "BLUE" && participant.win,
    ).length;
    const redWins = participants.filter(
      (participant) => participant.side === "RED" && participant.win,
    ).length;

    return NextResponse.json({
      match: {
        matchId: parsed.metadata.matchId,
        durationSec: toDurationSeconds(parsed.info.gameDuration),
        durationMin: Math.max(1, Math.round(toDurationSeconds(parsed.info.gameDuration) / 60)),
        winningSide: getWinningSide(blueWins, redWins),
        participants,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: error.issues.map((issue) => issue.message).join(" | ") || "Payload inválido.",
        },
        { status: 400 },
      );
    }

    return respostaDeErro("admin/riot/match", error, "Falha ao importar partida da Riot.");
  }
}
