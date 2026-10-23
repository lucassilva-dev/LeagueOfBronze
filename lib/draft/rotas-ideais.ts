import { ELO_ORDER, resolveElo, resolveRole } from "@/lib/design";

/**
 * O "ideal" de rotas: dá para pôr N jogadores em cada rota (N = número de times) usando só
 * a rota principal e a secundária que cada um marcou? E, se der, quem fica em cada rota?
 *
 * É uma SIMULAÇÃO para a organização mostrar no grupo — o draft não trava rota nenhuma (cada
 * capitão escolhe quem quiser). Serve para responder "fecha 8 de cada?" antes do sorteio.
 *
 * A conta é um fluxo de custo mínimo (jogador → rota, N vagas por rota). Primeiro enche
 * todas as vagas que der; entre os jeitos de encher, decide em ordem lexicográfica, do mais
 * importante ao menos:
 *
 * 1. ninguém fora das duas rotas, se houver jeito;
 * 2. o máximo de gente na rota PRINCIPAL;
 * 3. sobrando gente (mais inscritos que vagas), fica sem vaga quem tem o elo mais BAIXO;
 * 4. entre os jeitos de completar as rotas com o mesmo número de mudanças, muda de rota o
 *    mais fraco: primeiro se poupa o elo mais alto, depois o seguinte, e assim por diante —
 *    mover um Mestre é pior que mover dois jogadores mais fracos.
 *
 * Os níveis 3 e 4 são lexicográficos POR ELO, não somas: somar degraus deixava "um Mestre e
 * um Ferro" empatar com "uma Esmeralda e uma Prata", e o print saía com o Mestre fora da
 * rota dele. Por isso o custo é um VETOR comparado da esquerda para a direita (o fluxo por
 * caminhos mais curtos vale em qualquer grupo ordenado), e não um número — com pesos
 * numéricos, 10 elos × 2 níveis estouram a precisão do JavaScript já com ~60 pessoas.
 * Empate total (mesmo elo, mesmas rotas) cai na ordem de entrada, que o chamador deixa fixa.
 */

export const ROTAS_IDEAIS = ["TOP", "JUNG", "MID", "ADC", "SUP"] as const;
export type RotaIdeal = (typeof ROTAS_IDEAIS)[number];

/** Onde a pessoa ficou em relação ao que marcou. */
export type Encaixe = "principal" | "secundaria" | "fora";

export type JogadorParaRotas = Readonly<{ elo: string; primaria: string; secundaria: string }>;

export type LugarNaRota<T> = Readonly<{ jogador: T; encaixe: Encaixe }>;

export type RotasIdeais<T> = {
  vagasPorRota: number;
  /** As vagas preenchidas de cada rota, do elo mais alto ao mais baixo. */
  porRota: Record<RotaIdeal, LugarNaRota<T>[]>;
  /** Quem não coube (só quando há mais gente que vagas). */
  semVaga: T[];
  contagem: Record<Encaixe, number>;
  /** Todas as rotas cheias e ninguém fora da principal ou da secundária. */
  fecha: boolean;
};

/** Degrau na escada de elos (Ferro = 0). Elo ilegível vale 0: só serve de desempate. */
function degrau(elo: string): number {
  const meta = resolveElo(elo);
  return meta ? ELO_ORDER.findIndex((e) => e.key === meta.key) : 0;
}

function chaveDaRota(rota: string): RotaIdeal | null {
  const chave = resolveRole(rota).key;
  return (ROTAS_IDEAIS as readonly string[]).includes(chave) ? (chave as RotaIdeal) : null;
}

// ---------------------------------------------------------------- custo em vetor

/**
 * Posições do vetor de custo, da mais importante à menos:
 * [fora, secundária, entrar(elo mais alto … mais baixo), mover(elo mais alto … mais baixo)].
 * Entrar custa −1 (o fluxo quer pôr dentro primeiro os de elo alto); mover custa +1.
 */
const ELOS = ELO_ORDER.length;
const FORA = 0;
const SECUNDARIA = 1;
const entrar = (d: number) => 2 + (ELOS - 1 - d);
const mover = (d: number) => 2 + ELOS + (ELOS - 1 - d);
const TAMANHO = 2 + 2 * ELOS;

type Custo = number[];

const ZERO: Custo = new Array<number>(TAMANHO).fill(0);

function custo(posicoes: ReadonlyArray<[number, number]>): Custo {
  const c = [...ZERO];
  for (const [i, valor] of posicoes) c[i] += valor;
  return c;
}

function somar(a: Custo, b: Custo): Custo {
  return a.map((x, i) => x + b[i]);
}

function negar(a: Custo): Custo {
  return a.map((x) => -x);
}

function menor(a: Custo, b: Custo): boolean {
  for (let i = 0; i < TAMANHO; i += 1) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

type Aresta = { para: number; capacidade: number; custo: Custo; volta: number };

/**
 * Fluxo de custo mínimo por caminhos mais curtos sucessivos (Bellman-Ford, que aceita o
 * custo negativo das arestas de volta e o de "entrar"). O grafo tem ~50 nós e ~250 arestas:
 * sobra folga.
 */
function fluxoDeCustoMinimo(grafo: Aresta[][], origem: number, destino: number) {
  const nos = grafo.length;
  for (;;) {
    const distancia = new Array<Custo | null>(nos).fill(null);
    const veioDe = new Array<[number, number] | null>(nos).fill(null);
    distancia[origem] = ZERO;
    for (let rodada = 0; rodada < nos - 1; rodada += 1) {
      let mudou = false;
      for (let u = 0; u < nos; u += 1) {
        const du = distancia[u];
        if (!du) continue;
        grafo[u].forEach((a, i) => {
          if (a.capacidade <= 0) return;
          const nova = somar(du, a.custo);
          const atual = distancia[a.para];
          if (!atual || menor(nova, atual)) {
            distancia[a.para] = nova;
            veioDe[a.para] = [u, i];
            mudou = true;
          }
        });
      }
      if (!mudou) break;
    }
    if (!distancia[destino]) return;
    // Toda aresta do caminho tem capacidade 1 ou mais; a da origem, exatamente 1.
    for (let v = destino; v !== origem; ) {
      const [u, i] = veioDe[v]!;
      const a = grafo[u][i];
      a.capacidade -= 1;
      grafo[v][a.volta].capacidade += 1;
      v = u;
    }
  }
}

// ---------------------------------------------------------------- simulação

export function montarRotasIdeais<T extends JogadorParaRotas>(
  jogadores: readonly T[],
  vagasPorRota: number,
): RotasIdeais<T> {
  const porRota = Object.fromEntries(ROTAS_IDEAIS.map((r) => [r, [] as LugarNaRota<T>[]])) as Record<
    RotaIdeal,
    LugarNaRota<T>[]
  >;
  const contagem: Record<Encaixe, number> = { principal: 0, secundaria: 0, fora: 0 };
  const vagas = Math.max(0, Math.floor(vagasPorRota));
  if (vagas === 0 || jogadores.length === 0) {
    return { vagasPorRota: vagas, porRota, semVaga: [...jogadores], contagem, fecha: false };
  }

  const encaixeDe = (j: T, rota: RotaIdeal): Encaixe => {
    if (chaveDaRota(j.primaria) === rota) return "principal";
    if (chaveDaRota(j.secundaria) === rota) return "secundaria";
    return "fora";
  };
  const custoDoEncaixe = (j: T, rota: RotaIdeal): Custo => {
    const e = encaixeDe(j, rota);
    if (e === "principal") return ZERO;
    return custo([
      [e === "fora" ? FORA : SECUNDARIA, 1],
      [mover(degrau(j.elo)), 1],
    ]);
  };

  // Nós: 0 = origem, 1..n = jogadores, n+1..n+5 = rotas, n+6 = destino.
  const n = jogadores.length;
  const origem = 0;
  const destino = n + ROTAS_IDEAIS.length + 1;
  const grafo: Aresta[][] = Array.from({ length: destino + 1 }, () => []);
  const ligar = (de: number, para: number, capacidade: number, c: Custo) => {
    grafo[de].push({ para, capacidade, custo: c, volta: grafo[para].length });
    grafo[para].push({ para: de, capacidade: 0, custo: negar(c), volta: grafo[de].length - 1 });
  };

  jogadores.forEach((j, i) => {
    ligar(origem, 1 + i, 1, custo([[entrar(degrau(j.elo)), -1]]));
    ROTAS_IDEAIS.forEach((rota, r) => ligar(1 + i, n + 1 + r, 1, custoDoEncaixe(j, rota)));
  });
  ROTAS_IDEAIS.forEach((_, r) => ligar(n + 1 + r, destino, vagas, ZERO));

  fluxoDeCustoMinimo(grafo, origem, destino);

  const semVaga: T[] = [];
  jogadores.forEach((j, i) => {
    // Cada jogador tem UMA aresta para cada rota; a usada é a que ficou sem capacidade.
    const usada = grafo[1 + i].find((a) => a.para > n && a.para < destino && a.capacidade === 0);
    if (!usada) {
      semVaga.push(j);
      return;
    }
    const rota = ROTAS_IDEAIS[usada.para - n - 1];
    const encaixe = encaixeDe(j, rota);
    porRota[rota].push({ jogador: j, encaixe });
    contagem[encaixe] += 1;
  });

  for (const rota of ROTAS_IDEAIS) porRota[rota].sort((a, b) => degrau(b.jogador.elo) - degrau(a.jogador.elo));

  const todasCheias = ROTAS_IDEAIS.every((r) => porRota[r].length === vagas);
  return { vagasPorRota: vagas, porRota, semVaga, contagem, fecha: todasCheias && contagem.fora === 0 };
}
