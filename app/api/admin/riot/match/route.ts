import { NextResponse } from "next/server";
import { z } from "zod";
import type { NextRequest } from "next/server";

import { isAdminConfigured, isAuthorizedAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

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

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD não configurado no ambiente." },
      { status: 500 },
    );
  }
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

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
    const regionalRouting = inferRegionalRoutingFromMatchId(body.matchId);

    if (!regionalRouting) {
      return NextResponse.json(
        {
          error:
            "Não foi possível inferir a região da Riot pelo matchId. Ex.: BR1_1234567890, NA1_..., EUW1_...",
        },
        { status: 400 },
      );
    }

    const url = `https://${regionalRouting}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(
      body.matchId,
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
      const riotError =
        typeof raw === "object" &&
        raw !== null &&
        "status" in raw &&
        typeof (raw as { status?: unknown }).status === "object"
          ? (raw as { status?: { message?: string } }).status?.message
          : undefined;

      return NextResponse.json(
        {
          error:
            `Falha ao consultar Riot (${response.status}). ` +
            (riotError || "Confira o matchId e a RIOT_API_KEY."),
        },
        { status: response.status >= 400 && response.status < 600 ? response.status : 502 },
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

    const blueWins = participants.filter((participant) => participant.side === "BLUE" && participant.win).length;
    const redWins = participants.filter((participant) => participant.side === "RED" && participant.win).length;

    return NextResponse.json({
      match: {
        matchId: parsed.metadata.matchId,
        durationSec: toDurationSeconds(parsed.info.gameDuration),
        durationMin: Math.max(1, Math.round(toDurationSeconds(parsed.info.gameDuration) / 60)),
        winningSide:
          blueWins === redWins ? null : blueWins > redWins ? ("BLUE" as const) : ("RED" as const),
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

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao importar partida da Riot.",
      },
      { status: 500 },
    );
  }
}
