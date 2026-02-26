const DEFAULT_OPGG_REGION = "br";

type ParsedRiotId = {
  gameName: string;
  tagLine: string;
};

export type MultiOpGgResult =
  | {
      ok: true;
      url: string;
      riotIds: string[];
    }
  | {
      ok: false;
      error: string;
      invalidNicks: string[];
    };

export function parseRiotId(input: string): ParsedRiotId | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const hashIndex = trimmed.lastIndexOf("#");
  if (hashIndex <= 0 || hashIndex === trimmed.length - 1) {
    return null;
  }

  const gameName = trimmed.slice(0, hashIndex).trim();
  const tagLine = trimmed.slice(hashIndex + 1).trim();

  if (!gameName || !tagLine) return null;

  return { gameName, tagLine };
}

export function getOpGgSummonerUrlFromNick(
  nick: string,
  region = DEFAULT_OPGG_REGION,
) {
  const parsed = parseRiotId(nick);
  if (!parsed) return null;

  const path = `${encodeURIComponent(parsed.gameName)}-${encodeURIComponent(parsed.tagLine)}`;
  return `https://www.op.gg/lol/summoners/${region}/${path}`;
}

export function getOpGgMultiSearchUrlFromNicks(
  nicks: string[],
  region = DEFAULT_OPGG_REGION,
): MultiOpGgResult {
  if (nicks.length !== 5) {
    return {
      ok: false,
      error:
        "O Multi OP.GG exige exatamente 5 jogadores no elenco. Ajuste o time no admin para continuar.",
      invalidNicks: [],
    };
  }

  const invalidNicks: string[] = [];
  const riotIds: string[] = [];

  for (const nick of nicks) {
    const parsed = parseRiotId(nick);
    if (!parsed) {
      invalidNicks.push(nick);
      continue;
    }
    riotIds.push(`${parsed.gameName}#${parsed.tagLine}`);
  }

  if (invalidNicks.length > 0) {
    return {
      ok: false,
      error:
        "Não foi possível gerar o Multi OP.GG. Ajuste no admin os nicks para o formato válido `Nome#TAG`.",
      invalidNicks,
    };
  }

  const query = encodeURIComponent(riotIds.join(","));
  return {
    ok: true,
    riotIds,
    url: `https://www.op.gg/multisearch/${region}?summoners=${query}`,
  };
}
