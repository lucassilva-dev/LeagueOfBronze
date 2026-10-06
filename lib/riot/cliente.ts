import "server-only";

import { z } from "zod";

/**
 * Cliente da API da Riot usado pelo robô de elo e pela inscrição.
 *
 * Três decisões governam este arquivo:
 *
 * 1. **Nenhuma chamada lança.** Toda resposta vira um caso nomeado (`ok`, `nao_encontrado`,
 *    `limite`…). Quem chama decide o que cada um significa — para a inscrição, a Riot fora do
 *    ar é "segue sem conferir"; para o robô, é "para e tenta amanhã". Exceção solta aqui
 *    derrubaria a inscrição de alguém por causa de um 503 da Riot.
 *
 * 2. **O limite de taxa é respeitado ANTES de estourar.** A chave pessoal tem 100 chamadas a
 *    cada 2 minutos por região (br1 e americas contam separado). Cada resposta da Riot traz a
 *    contagem da janela (`X-App-Rate-Limit-Count`); quando ela chega perto do teto, o cliente
 *    espera a janela virar (se ainda houver tempo no prazo de quem chamou) ou para. A
 *    contagem vem da Riot, então vale mesmo entre duas execuções diferentes do servidor.
 *
 * 3. **Um 429 de verdade para tudo.** As políticas da Riot exigem parar e respeitar o
 *    `Retry-After`; insistir pode render bloqueio da chave. Depois do primeiro 429 (ou de uma
 *    chave recusada), toda chamada seguinte devolve o mesmo caso sem tocar na rede.
 */

export type RespostaRiot<T> =
  | { tipo: "ok"; dados: T }
  | { tipo: "nao_encontrado" }
  /** A Riot não conseguiu decifrar o PUUID — acontece quando a chave da API muda. */
  | { tipo: "puuid_invalido" }
  /** `proprio`: fomos nós que paramos antes do teto, não a Riot que recusou. */
  | { tipo: "limite"; esperarSegundos: number; proprio: boolean }
  | { tipo: "chave_recusada" }
  | { tipo: "erro"; status: number; mensagem: string }
  | { tipo: "sem_chave" };

export type ContaRiot = { puuid: string; gameName: string; tagLine: string };
export type EntradaDaLiga = {
  queueType: string;
  tier: string | null;
  rank: string | null;
  leaguePoints: number | null;
  wins: number | null;
  losses: number | null;
};

type Rota = "americas" | "br1";

const contaSchema = z.object({
  puuid: z.string().min(1),
  gameName: z.string().nullish(),
  tagLine: z.string().nullish(),
});

const regiaoSchema = z.object({ region: z.string().min(1) });

const ligaSchema = z.array(
  z.object({
    queueType: z.string(),
    tier: z.string().nullish(),
    rank: z.string().nullish(),
    leaguePoints: z.number().nullish(),
    wins: z.number().nullish(),
    losses: z.number().nullish(),
  }),
);

const invocadorSchema = z.object({ summonerLevel: z.number() });

const idsDePartidaSchema = z.array(z.string());

export type OpcoesDoCliente = {
  /** Sem chave, nenhuma chamada sai: tudo devolve `sem_chave`. */
  chave?: string;
  fetch?: typeof fetch;
  /** Intervalo mínimo entre duas chamadas à MESMA região. */
  intervaloMs?: number;
  timeoutMs?: number;
  /** Até quando (epoch ms) vale a pena esperar a janela da cota virar. Sem prazo, não espera. */
  prazoMs?: number;
  dormir?: (ms: number) => Promise<void>;
  agora?: () => number;
};

export type ClienteRiot = {
  contaPorRiotId(nome: string, tag: string): Promise<RespostaRiot<ContaRiot>>;
  contaPorPuuid(puuid: string): Promise<RespostaRiot<ContaRiot>>;
  /** Servidor onde a conta joga LoL, em minúsculas ("br1", "na1"…). */
  regiaoDaConta(puuid: string): Promise<RespostaRiot<string>>;
  entradasDaLiga(puuid: string): Promise<RespostaRiot<EntradaDaLiga[]>>;
  nivelDoInvocador(puuid: string): Promise<RespostaRiot<number>>;
  /** Ids das partidas da fila informada no intervalo (segundos), até 100. */
  idsDePartidas(
    puuid: string,
    filtro: { fila: number; inicioS: number; fimS: number },
  ): Promise<RespostaRiot<string[]>>;
  /** Preenchido depois de um 429 ou de chave recusada: nada mais sai para a rede. */
  readonly parado: RespostaRiot<never> | null;
  readonly chamadas: number;
};

/** A chave da Riot deste ambiente, ou string vazia. Mesmo nome que a importação de partida usa. */
export function chaveDaRiot(): string {
  return process.env.RIOT_API_KEY?.trim() || "";
}

/**
 * Lê `"20:1,100:120"` (limite) e `"3:1,45:120"` (contagem) e diz se alguma janela longa
 * chegou a 90% do teto. A de 1 segundo fica de fora: o intervalo mínimo já a respeita.
 */
export function janelaQuaseCheia(limites: string | null, contagens: string | null): number | null {
  if (!limites || !contagens) return null;
  const teto = new Map<number, number>();
  for (const par of limites.split(",")) {
    const [quantos, segundos] = par.split(":").map(Number);
    if (Number.isFinite(quantos) && Number.isFinite(segundos)) teto.set(segundos, quantos);
  }
  let espera: number | null = null;
  for (const par of contagens.split(",")) {
    const [usados, segundos] = par.split(":").map(Number);
    const limite = teto.get(segundos);
    if (!limite || segundos < 10) continue;
    if (usados >= Math.floor(limite * 0.9)) espera = Math.max(espera ?? 0, segundos);
  }
  return espera;
}

export function criarClienteRiot(opcoes: OpcoesDoCliente = {}): ClienteRiot {
  const chave = opcoes.chave ?? chaveDaRiot();
  const executar = opcoes.fetch ?? fetch;
  const intervaloMs = opcoes.intervaloMs ?? 120;
  const timeoutMs = opcoes.timeoutMs ?? 8000;
  const dormir = opcoes.dormir ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const agora = opcoes.agora ?? Date.now;

  const ultimaChamada: Record<Rota, number> = { americas: 0, br1: 0 };
  const esperarJanela: Record<Rota, number | null> = { americas: null, br1: null };
  let parado: RespostaRiot<never> | null = null;
  let chamadas = 0;

  async function chamar<T>(rota: Rota, caminho: string, ler: (bruto: unknown) => T): Promise<RespostaRiot<T>> {
    if (!chave) return { tipo: "sem_chave" };
    if (parado) return parado;

    // A janela longa está quase cheia: espera ela virar se ainda couber no prazo; senão para.
    const janela = esperarJanela[rota];
    if (janela !== null) {
      const esperaMs = janela * 1000;
      if (opcoes.prazoMs !== undefined && agora() + esperaMs < opcoes.prazoMs) {
        await dormir(esperaMs);
        esperarJanela[rota] = null;
      } else {
        return { tipo: "limite", esperarSegundos: janela, proprio: true };
      }
    }

    const desde = agora() - ultimaChamada[rota];
    if (ultimaChamada[rota] > 0 && desde < intervaloMs) await dormir(intervaloMs - desde);
    ultimaChamada[rota] = agora();
    chamadas += 1;

    let resposta: Response;
    try {
      resposta = await executar(`https://${rota}.api.riotgames.com${caminho}`, {
        method: "GET",
        headers: { "X-Riot-Token": chave },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (erro) {
      const nome = erro instanceof Error ? erro.name : "";
      return {
        tipo: "erro",
        status: 0,
        mensagem: nome === "TimeoutError" || nome === "AbortError" ? "tempo esgotado" : "falha de rede",
      };
    }

    const quase =
      janelaQuaseCheia(resposta.headers.get("x-app-rate-limit"), resposta.headers.get("x-app-rate-limit-count")) ??
      janelaQuaseCheia(resposta.headers.get("x-method-rate-limit"), resposta.headers.get("x-method-rate-limit-count"));
    if (quase !== null) esperarJanela[rota] = quase;

    if (resposta.status === 429) {
      const segundos = Number(resposta.headers.get("retry-after"));
      parado = { tipo: "limite", esperarSegundos: Number.isFinite(segundos) && segundos > 0 ? segundos : 60, proprio: false };
      return parado;
    }
    if (resposta.status === 401 || resposta.status === 403) {
      parado = { tipo: "chave_recusada" };
      return parado;
    }
    if (resposta.status === 404) return { tipo: "nao_encontrado" };

    const bruto = (await resposta.json().catch(() => null)) as unknown;

    if (resposta.status === 400) {
      const mensagem = String((bruto as { status?: { message?: unknown } } | null)?.status?.message ?? "");
      if (/decrypt/i.test(mensagem)) return { tipo: "puuid_invalido" };
      return { tipo: "erro", status: 400, mensagem: "requisição recusada pela Riot" };
    }
    if (!resposta.ok) return { tipo: "erro", status: resposta.status, mensagem: `Riot respondeu ${resposta.status}` };

    try {
      return { tipo: "ok", dados: ler(bruto) };
    } catch {
      return { tipo: "erro", status: resposta.status, mensagem: "resposta da Riot em formato inesperado" };
    }
  }

  const lerConta = (bruto: unknown): ContaRiot => {
    const c = contaSchema.parse(bruto);
    return { puuid: c.puuid, gameName: c.gameName ?? "", tagLine: c.tagLine ?? "" };
  };
  const p = encodeURIComponent;

  return {
    contaPorRiotId: (nome, tag) =>
      chamar("americas", `/riot/account/v1/accounts/by-riot-id/${p(nome)}/${p(tag)}`, lerConta),
    contaPorPuuid: (puuid) => chamar("americas", `/riot/account/v1/accounts/by-puuid/${p(puuid)}`, lerConta),
    regiaoDaConta: (puuid) =>
      chamar("americas", `/riot/account/v1/region/by-game/lol/by-puuid/${p(puuid)}`, (b) =>
        regiaoSchema.parse(b).region.toLowerCase(),
      ),
    entradasDaLiga: (puuid) =>
      chamar("br1", `/lol/league/v4/entries/by-puuid/${p(puuid)}`, (b) =>
        ligaSchema.parse(b).map((e) => ({
          queueType: e.queueType,
          tier: e.tier ?? null,
          rank: e.rank ?? null,
          leaguePoints: e.leaguePoints ?? null,
          wins: e.wins ?? null,
          losses: e.losses ?? null,
        })),
      ),
    nivelDoInvocador: (puuid) =>
      chamar("br1", `/lol/summoner/v4/summoners/by-puuid/${p(puuid)}`, (b) => invocadorSchema.parse(b).summonerLevel),
    idsDePartidas: (puuid, f) =>
      chamar(
        "americas",
        `/lol/match/v5/matches/by-puuid/${p(puuid)}/ids?queue=${f.fila}&startTime=${Math.floor(f.inicioS)}&endTime=${Math.floor(f.fimS)}&start=0&count=100`,
        (b) => idsDePartidaSchema.parse(b),
      ),
    get parado() {
      return parado;
    },
    get chamadas() {
      return chamadas;
    },
  };
}
