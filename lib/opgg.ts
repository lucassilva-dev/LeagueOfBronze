const DEFAULT_OPGG_REGION = "br";

function normalizeRiotId(input: string) {
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
  const parsed = normalizeRiotId(nick);
  if (!parsed) return null;

  const path = `${encodeURIComponent(parsed.gameName)}-${encodeURIComponent(parsed.tagLine)}`;
  return `https://www.op.gg/lol/summoners/${region}/${path}`;
}
