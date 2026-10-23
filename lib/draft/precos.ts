import { ELO_ORDER, resolveElo } from "@/lib/design";

/**
 * A TABELA DE PONTOS DO DRAFT, CALCULADA A PARTIR DE QUEM VAI JOGAR.
 *
 * Até a 3ª Edição o preço de cada elo era fixo (Prata 3, Ouro 4 … Mestre 10, em
 * lib/design.ts) e o orçamento por time era "a média + 15%". Com o orçamento fixo em 30 e
 * um pool que muda a cada edição, isso deixava a conta solta: na 4ª (40 jogadores, 8 times)
 * a tabela fixa soma 231 para um teto de 240, e os 9 pontos de folga são justamente o que
 * permite um time terminar o draft mais forte que outro.
 *
 * A ideia que governa este arquivo, em uma frase: **se a soma dos preços de quem joga é
 * exatamente `times × orçamento`, todo time termina o draft gastando o orçamento inteiro —
 * e times com o mesmo gasto têm a mesma soma de VALOR, a menos do arredondamento.**
 *
 *  1. FORÇA. Cada jogador vira um número de "degraus" contados a partir do Ferro IV: cada
 *     divisão é um degrau (Ferro IV = 0 … Diamante I = 27), e do Mestre em diante, onde não
 *     há divisão, cada 100 PDL é um degrau (Mestre 0 PDL = 28). É a escada da própria Riot,
 *     a mesma régua que a tabela da 3ª seguia de perto (ela crescia ~1 ponto por elo).
 *
 *  2. VALOR. Os degraus de cima valem mais que os de baixo: `valor = (e^(c·força) − 1) / c`,
 *     com a CURVATURA `c` por degrau (c = 0 seria a escada reta). Não é gosto: nas 76
 *     partidas da 2ª e da 3ª Edição, Diamante e Mestre renderam mais do que a escada reta
 *     prevê, e a tabela fixa da 3ª — que já era curvada no topo (Esmeralda 6, Diamante 8,
 *     Mestre 10) — explicou os resultados melhor que uma reta em todos os recortes. Ver
 *     `CURVATURA_PADRAO`.
 *
 *  3. PREÇO IDEAL. Uma reta sobre o VALOR: o jogador mais fraco do pool custa 1 ponto, e o
 *     jogador médio custa `orçamento ÷ jogadores por time` (30 ÷ 5 = 6). Com essas duas
 *     âncoras a soma dos preços ideais de quem joga é exatamente `times × orçamento` — e,
 *     como todo time tem o mesmo número de jogadores, gastar o orçamento inteiro significa
 *     ter a mesma soma de valor que qualquer outro time. A inclinação é a maior possível sem
 *     ninguém custar menos de 1: quanto mais pontos separam um degrau do outro, menor o erro
 *     que o arredondamento introduz.
 *
 *  4. ARREDONDAMENTO. Preço é inteiro. Arredondar cada um para o mais próximo quase nunca
 *     fecha a soma, então a tabela inteira é escolhida de uma vez (programação dinâmica):
 *     o conjunto de preços inteiros mais perto dos ideais, com a soma EXATA e sem nunca
 *     um elo mais alto custar menos que um mais baixo.
 *
 * ⚠ A soma exata tem um preço: como todo time termina com o orçamento INTEIRO, os elencos
 * precisam se repartir em somas exatas, e há pools em que isso não existe com os capitães
 * da regra. O motor do draft confere isso na montagem (`estadoFecha`); a prévia do draft
 * avisa antes; e quem calcula a tabela com os capitães (lib/draft/tabela-que-fecha.ts) desce
 * a curvatura e, no limite, a soma, até achar uma que feche. Medido com a granularidade
 * "divisao" e os capitães da regra: o pool real da 4ª (40 jogadores) fecha direto com 0,1,
 * e 105 de 105 pools parecidos também; com 30 jogadores, 165 das 180 trocas de um titular
 * por um reserva fechavam direto com 0,1 (todas com 0,075). Com "elo", que tem poucos
 * preços distintos, mais da metade das trocas não fechava — por isso o padrão é "divisao".
 * Pools estreitos (todos Platina) quase nunca fecham a soma exata, em qualquer curvatura.
 *
 * O preço é por CLASSE (elo + divisão, ou só o elo), nunca por pessoa: dois jogadores na
 * mesma divisão custam o mesmo. A tabela sai inteira dos elos — ninguém digita pontos.
 *
 * Funções PURAS: a lista entra pronta, nada de banco nem relógio. O servidor (prévia e
 * sorteio do draft) e o painel (prévia de Times) chamam a mesma função, e um teste refaz a
 * conta sem rede.
 */

/** "divisao": Prata III e Prata I têm preços próprios. "elo": todo Prata custa o mesmo. */
export type Granularidade = "elo" | "divisao";

export const GRANULARIDADE_PADRAO: Granularidade = "divisao";

/**
 * A CURVATURA da régua, por degrau (divisão): 0,1 por divisão, 0,4 por elo.
 *
 * A direção é firme no histórico (2ª e 3ª, 76 partidas: em nenhuma reamostragem a escada
 * reta foi a melhor), mas o tamanho não. Com o formato da 4ª — 40 jogadores, 8 times — e a
 * busca de viabilidade atual, 0,1 é o maior valor que mantém o draft seguro na simulação:
 * monta direto no pool real e em 105 de 105 pools parecidos, 0 travamentos em 26 mil drafts,
 * ~11 escolhíveis por vez; e deixa os times mais próximos que 0,075 em 92% das reamostragens
 * do histórico. (Com 30 jogadores escolhemos 0,075 porque 0,1 travava 8% dos drafts — culpa
 * da busca antiga, que estourava o limite de passos; a busca atual não estoura.) 0,1125 já
 * falha em 1/3 dos pools parecidos. Se a soma exata não fechar com os capitães, quem calcula
 * a tabela desce a curvatura sozinho (ver lib/draft/tabela-que-fecha.ts).
 */
export const CURVATURA_PADRAO = 0.1;

/** O valor de uma força na régua curvada. Ferro IV (força 0) vale 0. */
export function valorDaForca(forca: number, curvatura: number = CURVATURA_PADRAO): number {
  return curvatura > 0 ? Math.expm1(curvatura * forca) / curvatura : forca;
}

/** Quanto vale um degrau a mais nesta força (a derivada do valor). */
function valorPorDegrau(forca: number, curvatura: number): number {
  return curvatura > 0 ? Math.exp(curvatura * forca) : 1;
}

/** O elo de um jogador como o draft o enxerga. */
export type EloDoJogador = {
  /** O elo que VALE (congelado ?? verificado ?? declarado). É ele que decide o tier. */
  elo: string;
  /** O tier que a Riot mostrou na leitura cuja divisão/PDL estão abaixo. */
  eloRiot?: string | null;
  divisao?: string | null;
  pdl?: number | null;
};

export type Classe = {
  /** Identificador estável ("prata-3", "mestre-200", "ouro"). */
  chave: string;
  /** Como aparece na tabela publicada ("Prata III", "Mestre · 200–299 PDL", "Ouro"). */
  rotulo: string;
  /** Degraus a partir do Ferro IV. */
  forca: number;
  /** Índice do elo em ELO_ORDER (Ferro = 0). */
  tier: number;
  /** false quando a divisão não pôde ser lida e a classe é o meio do elo. */
  divisaoLida: boolean;
};

/** Degraus por elo abaixo do Mestre (as quatro divisões). */
const DEGRAUS_POR_ELO = 4;
/** Índice do Mestre em ELO_ORDER: daqui em diante não há divisão, há PDL. */
const TIER_MESTRE = 7;
/** Força do Mestre 0 PDL = logo acima do Diamante I. */
const FORCA_DO_MESTRE = TIER_MESTRE * DEGRAUS_POR_ELO;

/**
 * Força dos elos do topo quando não há PDL lido (ou na granularidade "elo"): o meio da
 * faixa em que esses elos costumam ficar no servidor brasileiro. Nenhum jogador da 4ª está
 * acima do Mestre; os valores existem para a função nunca ficar sem resposta.
 */
const FORCA_SEM_PDL: Record<string, number> = {
  mestre: FORCA_DO_MESTRE + 1, // ~100 PDL
  "grao-mestre": FORCA_DO_MESTRE + 4, // ~400 PDL
  desafiante: FORCA_DO_MESTRE + 8, // ~800 PDL
};

const DIVISOES: Record<string, number> = { IV: 0, III: 1, II: 2, I: 3 };
const ROMANOS = ["IV", "III", "II", "I"];

/**
 * A classe de preço de um jogador.
 *
 * A divisão e o PDL só valem quando a leitura da Riot é do MESMO elo que vale — a
 * organização pode ter travado o elo à mão num tier diferente do da Riot, e aí a divisão
 * lida não diz nada sobre ele (a mesma regra de `forcaDoElo`, em capitaes.ts). Sem leitura
 * que valha, o jogador fica no MEIO do elo: nem premiado nem punido pela falta do dado.
 */
export function classeDoElo(jogador: EloDoJogador, granularidade: Granularidade = GRANULARIDADE_PADRAO): Classe {
  const meta = resolveElo(jogador.elo);
  if (!meta) throw new Error(`Elo não reconhecido: ${jogador.elo}`);
  const tier = ELO_ORDER.findIndex((e) => e.key === meta.key);

  const metaRiot = resolveElo(jogador.eloRiot ?? null);
  const leituraBate = granularidade === "divisao" && metaRiot !== null && metaRiot.key === meta.key;

  if (tier >= TIER_MESTRE) {
    const pdl = jogador.pdl;
    if (leituraBate && typeof pdl === "number" && Number.isFinite(pdl) && pdl >= 0) {
      const faixa = Math.floor(pdl / 100);
      return {
        chave: `${meta.key}-${faixa * 100}`,
        rotulo: `${meta.label} · ${faixa * 100}–${faixa * 100 + 99} PDL`,
        forca: FORCA_DO_MESTRE + faixa + 0.5,
        tier,
        divisaoLida: true,
      };
    }
    return {
      chave: meta.key,
      rotulo: meta.label,
      forca: FORCA_SEM_PDL[meta.key] ?? FORCA_DO_MESTRE + 1,
      tier,
      divisaoLida: granularidade === "elo",
    };
  }

  const base = tier * DEGRAUS_POR_ELO;
  const divisao = DIVISOES[(jogador.divisao ?? "").trim().toUpperCase()];
  if (leituraBate && divisao !== undefined) {
    return {
      chave: `${meta.key}-${ROMANOS[divisao]!.toLowerCase()}`,
      rotulo: `${meta.label} ${ROMANOS[divisao]}`,
      forca: base + divisao + 0.5,
      tier,
      divisaoLida: true,
    };
  }
  return {
    chave: meta.key,
    rotulo: meta.label,
    // O meio do elo: entre a divisão III e a II.
    forca: base + DEGRAUS_POR_ELO / 2,
    tier,
    divisaoLida: granularidade === "elo",
  };
}

export type LinhaDaTabela = {
  classe: Classe;
  /** Quantos jogadores do pool estão nesta classe. */
  quantos: number;
  /** O preço da reta, antes de arredondar. */
  ideal: number;
  /** O preço que vale no draft. */
  pontos: number;
};

export type TabelaDePontos = {
  granularidade: Granularidade;
  curvatura: number;
  times: number;
  jogadoresPorTime: number;
  orcamentoPorTime: number;
  /** Só as classes que existem no pool, do elo mais baixo para o mais alto. */
  linhas: LinhaDaTabela[];
  /** `times × orçamento`: o que a soma de quem joga precisa dar. */
  alvo: number;
  /** A soma dos preços de quem joga. Igual ao alvo, salvo quando é impossível (ver `folga`). */
  soma: number;
  /**
   * `alvo − soma`. Zero é o normal. Passa de zero quando não existe tabela inteira com a
   * soma exata — por exemplo, 30 jogadores todos do mesmo elo com orçamento 31 (cada um
   * teria de custar 6,2) — ou quando a soma foi baixada de propósito (`somaMaxima`) porque
   * a exata não fechava os elencos. Aí a tabela fica o mais perto possível, por baixo.
   */
  folga: number;
  /**
   * A reta do preço ideal sobre o valor: `pontos = 1 + inclinacao × (valor − valorDoMaisFraco)`.
   * `inclinacao` é zero quando todo mundo está na mesma classe (aí todos custam `precoMedio`).
   */
  reta: {
    curvatura: number;
    forcaDoMaisFraco: number;
    forcaMedia: number;
    valorDoMaisFraco: number;
    valorMedio: number;
    inclinacao: number;
    precoMedio: number;
  };
  /**
   * O maior erro de preço de um jogador, convertido em divisões NA ALTURA DELE: o
   * `|pontos − ideal|` de cada classe dividido pelo quanto um degrau vale em pontos naquele
   * ponto da régua curvada (no topo um degrau vale mais pontos, então o mesmo meio ponto é
   * uma fração menor de divisão). Um jogador com erro 0,8 custa o que valeria alguém 0,8
   * divisão acima ou abaixo dele.
   *
   * Não é a diferença de força entre os times. Com a soma exata, o que fica igual entre os
   * times é a soma de VALOR (a régua curvada), a menos do arredondamento: dois times de 5 com
   * o mesmo gasto diferem em valor no máximo `10 × max|pontos − ideal| ÷ inclinacao`. Somada
   * em divisões (força), a diferença pode ser maior, porque a régua é curva.
   */
  erroMaximoEmDegraus: number;
};

/**
 * A tabela de pontos para um pool.
 *
 * `pool` são os jogadores que VÃO jogar — exatamente `times × jogadoresPorTime`, com os
 * capitães (eles custam pontos como qualquer um). Quem está na sobra ou na fila de reserva
 * NÃO entra: o preço deles sai da mesma reta (`precoNaTabela`), mas eles não podem mexer
 * na conta de quem joga.
 *
 * `somaMaxima` (opcional) baixa a soma pedida abaixo de `times × orçamento`: é a última
 * saída de quem calcula a tabela quando a soma exata não deixa os elencos fecharem (ver
 * lib/draft/tabela-que-fecha.ts). O `alvo` continua `times × orçamento` e a diferença
 * aparece na `folga`.
 */
export function calcularTabela(params: {
  pool: readonly EloDoJogador[];
  times: number;
  jogadoresPorTime: number;
  orcamentoPorTime: number;
  granularidade?: Granularidade;
  curvatura?: number;
  somaMaxima?: number;
}): TabelaDePontos {
  const { pool, times, jogadoresPorTime, orcamentoPorTime } = params;
  const granularidade = params.granularidade ?? GRANULARIDADE_PADRAO;
  const curvatura = Math.max(0, params.curvatura ?? CURVATURA_PADRAO);
  const alvo = Math.max(0, times) * orcamentoPorTime;
  const somaPedida =
    params.somaMaxima !== undefined && Number.isFinite(params.somaMaxima) ? Math.min(alvo, params.somaMaxima) : alvo;

  // Agrupa por FORÇA, não por chave: duas classes com a mesma força têm de custar o mesmo.
  // Quando são de elos diferentes (Mestre 400–499 e Grão-Mestre 400–499 têm a mesma força),
  // a linha fica com a do MAIOR elo — e, no mesmo elo, com a menor chave —, para a tabela
  // não depender da ordem da lista.
  const porForca = new Map<number, { classe: Classe; quantos: number }>();
  for (const jogador of pool) {
    const classe = classeDoElo(jogador, granularidade);
    const atual = porForca.get(classe.forca);
    if (!atual) {
      porForca.set(classe.forca, { classe, quantos: 1 });
      continue;
    }
    atual.quantos += 1;
    if (classe.tier > atual.classe.tier || (classe.tier === atual.classe.tier && classe.chave < atual.classe.chave)) {
      atual.classe = classe;
    }
  }
  const grupos = [...porForca.values()].sort((a, b) => a.classe.forca - b.classe.forca);

  const n = pool.length;
  if (n === 0 || times <= 0 || jogadoresPorTime <= 0) {
    return {
      granularidade,
      curvatura,
      times,
      jogadoresPorTime,
      orcamentoPorTime,
      linhas: [],
      alvo,
      soma: 0,
      folga: alvo,
      reta: { curvatura, forcaDoMaisFraco: 0, forcaMedia: 0, valorDoMaisFraco: 0, valorMedio: 0, inclinacao: 0, precoMedio: 0 },
      erroMaximoEmDegraus: 0,
    };
  }

  const reta = retaDoPool(grupos, n, orcamentoPorTime / jogadoresPorTime, curvatura);
  const ideais = grupos.map((g) => idealNaReta(reta, g.classe.forca));
  const pontos = arredondarComSomaExata(
    grupos.map((g) => g.quantos),
    ideais,
    somaPedida,
  );

  const linhas: LinhaDaTabela[] = grupos.map((g, k) => ({
    classe: g.classe,
    quantos: g.quantos,
    ideal: ideais[k]!,
    pontos: pontos[k]!,
  }));
  const soma = linhas.reduce((s, l) => s + l.pontos * l.quantos, 0);
  // O erro em pontos vira degraus pela inclinação NAQUELA altura da régua: no topo, onde um
  // degrau vale mais pontos, o mesmo meio ponto de erro é uma fração menor de divisão.
  const erroMaximoEmDegraus =
    reta.inclinacao > 0
      ? Math.max(
          0,
          ...linhas.map(
            (l) => Math.abs(l.pontos - l.ideal) / (reta.inclinacao * valorPorDegrau(l.classe.forca, curvatura)),
          ),
        )
      : 0;

  return {
    granularidade,
    curvatura,
    times,
    jogadoresPorTime,
    orcamentoPorTime,
    linhas,
    alvo,
    soma,
    folga: alvo - soma,
    reta,
    erroMaximoEmDegraus,
  };
}

/**
 * O preço de qualquer jogador na tabela — de quem joga e de quem está fora do pool.
 *
 * Quem joga cai numa linha da tabela. Quem está fora (sobra, fila de reserva) recebe o
 * preço da reta, arredondado e PRESO entre as linhas vizinhas: um reserva nunca custa menos
 * que alguém mais fraco do pool nem mais que alguém mais forte. É esse número que a regra
 * do substituto ("valor igual ou menor ao do substituído") compara.
 */
export function precoNaTabela(tabela: TabelaDePontos, jogador: EloDoJogador): number {
  const classe = classeDoElo(jogador, tabela.granularidade);
  const linha = tabela.linhas.find((l) => l.classe.forca === classe.forca);
  if (linha) return linha.pontos;
  if (tabela.linhas.length === 0) return 1;

  const ideal = Math.max(1, Math.round(idealNaReta(tabela.reta, classe.forca)));
  const abaixo = [...tabela.linhas].reverse().find((l) => l.classe.forca < classe.forca);
  const acima = tabela.linhas.find((l) => l.classe.forca > classe.forca);
  let preco = ideal;
  if (abaixo) preco = Math.max(preco, abaixo.pontos);
  if (acima) preco = Math.min(preco, acima.pontos);
  return Math.max(1, preco);
}

// ---------------------------------------------------------------- o retrato

/**
 * A tabela em forma de dado puro, para sair do servidor (prévia do painel) e ficar
 * gravada no estado do draft. Só elo, divisão e números — nada de quem é quem, porque a
 * mesma tabela pode ir para a transmissão e para o grupo.
 */
export type RetratoDaTabela = {
  granularidade: Granularidade;
  /** A curvatura USADA (pode ser menor que a padrão: ver `queda`). */
  curvatura: number;
  times: number;
  jogadoresPorTime: number;
  orcamentoPorTime: number;
  /** `elo` é o nome do elo da classe ("Prata" em "Prata III"): o emblema que a tela mostra. */
  linhas: { chave: string; rotulo: string; elo: string; forca: number; quantos: number; ideal: number; pontos: number }[];
  alvo: number;
  soma: number;
  folga: number;
  reta: TabelaDePontos["reta"];
  erroMaximoEmDegraus: number;
  /**
   * Quando a tabela pedida (curvatura padrão, soma exata) não deixava os elencos fecharem
   * com os capitães e a conta desceu sozinha (lib/draft/tabela-que-fecha.ts): de qual
   * curvatura partiu e por quê, em português. Ausente ou nulo quando valeu a pedida — e em
   * retratos gravados antes deste campo existir.
   */
  queda?: { curvaturaPedida: number; motivo: string } | null;
  /**
   * A tabela foi calculada sobre um pool que NÃO é o do sorteio (aptos ≠ vagas): serve para
   * ter ideia dos preços, mas não fecha nada — a tela não a mostra como fechada.
   */
  poolIncompleto?: boolean;
};

export function retratoDaTabela(tabela: TabelaDePontos): RetratoDaTabela {
  return {
    granularidade: tabela.granularidade,
    curvatura: tabela.curvatura,
    times: tabela.times,
    jogadoresPorTime: tabela.jogadoresPorTime,
    orcamentoPorTime: tabela.orcamentoPorTime,
    linhas: tabela.linhas.map((l) => ({
      chave: l.classe.chave,
      rotulo: l.classe.rotulo,
      elo: ELO_ORDER[l.classe.tier]?.label ?? l.classe.rotulo,
      forca: l.classe.forca,
      quantos: l.quantos,
      ideal: l.ideal,
      pontos: l.pontos,
    })),
    alvo: tabela.alvo,
    soma: tabela.soma,
    folga: tabela.folga,
    reta: { ...tabela.reta },
    erroMaximoEmDegraus: tabela.erroMaximoEmDegraus,
  };
}

/**
 * O caminho de volta: a tabela a partir do retrato gravado no estado do draft.
 *
 * Serve para precificar quem está FORA do pool (reservas) com a tabela do SORTEIO, e não
 * com uma prévia recalculada sobre o pool de hoje: depois do draft, a regra do substituto
 * compara com os preços que valeram. `precoNaTabela` só olha a força das linhas, os preços
 * e a reta — tudo isso está no retrato.
 */
export function tabelaDoRetrato(retrato: RetratoDaTabela): TabelaDePontos {
  return {
    granularidade: retrato.granularidade,
    curvatura: retrato.curvatura,
    times: retrato.times,
    jogadoresPorTime: retrato.jogadoresPorTime,
    orcamentoPorTime: retrato.orcamentoPorTime,
    linhas: [...retrato.linhas]
      .sort((a, b) => a.forca - b.forca)
      .map((l) => {
        const tier = ELO_ORDER.findIndex((e) => e.label === l.elo);
        return {
          classe: { chave: l.chave, rotulo: l.rotulo, forca: l.forca, tier, divisaoLida: l.rotulo !== l.elo },
          quantos: l.quantos,
          ideal: l.ideal,
          pontos: l.pontos,
        };
      }),
    alvo: retrato.alvo,
    soma: retrato.soma,
    folga: retrato.folga,
    reta: { ...retrato.reta },
    erroMaximoEmDegraus: retrato.erroMaximoEmDegraus,
  };
}

/** "Ouro II", "Mestre · 200–299 PDL": o rótulo da classe de um jogador, para as telas do draft. */
export function rotuloDaClasse(jogador: EloDoJogador, granularidade: Granularidade = GRANULARIDADE_PADRAO): string {
  return classeDoElo(jogador, granularidade).rotulo;
}

// ---------------------------------------------------------------- a reta

type Reta = TabelaDePontos["reta"];

function retaDoPool(
  grupos: readonly { classe: Classe; quantos: number }[],
  n: number,
  precoMedio: number,
  curvatura: number,
): Reta {
  const forcaDoMaisFraco = grupos[0]!.classe.forca;
  const forcaMedia = grupos.reduce((s, g) => s + g.classe.forca * g.quantos, 0) / n;
  const valorDoMaisFraco = valorDaForca(forcaDoMaisFraco, curvatura);
  const valorMedio = grupos.reduce((s, g) => s + valorDaForca(g.classe.forca, curvatura) * g.quantos, 0) / n;
  // Todos iguais (ou orçamento que não passa de 1 por jogador): não há reta, todo mundo
  // custa a média.
  const vao = valorMedio - valorDoMaisFraco;
  const inclinacao = vao > 1e-9 && precoMedio > 1 ? (precoMedio - 1) / vao : 0;
  return { curvatura, forcaDoMaisFraco, forcaMedia, valorDoMaisFraco, valorMedio, inclinacao, precoMedio };
}

function idealNaReta(reta: Reta, forca: number): number {
  if (reta.inclinacao === 0) return reta.precoMedio;
  return 1 + reta.inclinacao * (valorDaForca(forca, reta.curvatura) - reta.valorDoMaisFraco);
}

// ---------------------------------------------------------------- o arredondamento

/**
 * Preços inteiros para cada classe, o mais perto possível dos ideais, com:
 *  - soma `Σ quantos × preço` igual ao alvo (ou o mais perto POR BAIXO, se igual for
 *    impossível — por cima o draft não fecharia);
 *  - preço nunca diminuindo quando a força aumenta;
 *  - ninguém abaixo de 1.
 *
 * "Mais perto" = menor soma de `quantos × (preço − ideal)²`: errar o preço de uma classe com
 * seis jogadores pesa seis vezes, porque afeta seis escolhas. A soma vem ANTES da
 * proximidade: entre uma tabela com a soma exata e outra mais colada à reta com folga, fica
 * a exata — é ela que iguala os times. (Os ideais já somam o alvo, então a exata quase
 * sempre está a menos de um ponto de cada ideal.)
 *
 * Programação dinâmica sobre (classe, preço da classe, soma até aqui). A restrição "não
 * diminui" entra como o mínimo acumulado sobre os preços da classe anterior. Para o custo não
 * crescer com o orçamento (o campo aceita até 999, e a conta roda no navegador e a cada
 * sondagem do painel), a busca não olha todos os preços de 1 ao alvo:
 *
 *  1. TETO POR MONOTONIA. Toda classe acima de `i` custa pelo menos `p_i` e toda abaixo pelo
 *     menos 1, então `p_i ≤ (alvo − jogadores antes de i) ÷ (jogadores de i em diante)`.
 *     Nenhuma tabela possível fica de fora.
 *  2. A SOMA ALCANÇÁVEL. Com `p_i = 1 + d_0 + … + d_i` (cada `d ≥ 0`), a soma é
 *     `jogadores + Σ d_j × (jogadores de j em diante)`: um problema de troco, resolvido numa
 *     linha. Dá a maior soma ≤ alvo que alguma tabela alcança (o alvo, quase sempre).
 *  3. DUAS PASSADAS COM JANELA. A 1ª olha só os inteiros a até 1 ponto do ideal (alarga se
 *     não alcançar aquela soma) e acha uma tabela de custo C. Qualquer tabela de custo ≤ C
 *     tem cada preço a no máximo `√(C ÷ quantos)` do ideal — então a 2ª passada, só com essa
 *     janela, acha o MESMO ótimo (e o mesmo desempate) que a busca em todos os preços.
 *
 * Determinística: em empate de custo fica o menor preço na classe mais alta e, voltando
 * dela, o menor preço possível em cada classe anterior.
 *
 * Entrada inválida (quantos que não é inteiro ≥ 1, alvo ou ideal que não é número finito,
 * listas de tamanhos diferentes) é erro: antes ela laçava até estourar a memória ou
 * devolvia tudo a 1 em silêncio.
 */
export function arredondarComSomaExata(
  quantos: readonly number[],
  ideais: readonly number[],
  alvo: number,
): number[] {
  validarEntrada(quantos, ideais, alvo);
  const k = quantos.length;
  if (k === 0) return [];

  const total = Math.max(0, Math.floor(alvo));
  const jogadores = quantos.reduce((s, q) => s + q, 0);
  const minimos = quantos.map(() => 1);
  // Nem com todo mundo a 1 ponto cabe: devolve o mínimo, e quem chama acusa a folga negativa.
  if (jogadores > total) return minimos;

  // 1. Teto por monotonia.
  const teto: number[] = [];
  let antes = 0;
  for (const q of quantos) {
    teto.push(Math.max(1, Math.floor((total - antes) / (jogadores - antes))));
    antes += q;
  }

  // 2. A maior soma que alguma tabela alcança sem passar do alvo.
  const somaAlcancavel = maiorSomaAlcancavel(quantos, jogadores, total);

  // 3a. Uma tabela de soma `somaAlcancavel`, olhando perto dos ideais (alarga até achar).
  const cheia = (): Janela[] => teto.map((t) => ({ de: 1, ate: t }));
  const ehCheia = (janelas: readonly Janela[]) => janelas.every((j, i) => j.de === 1 && j.ate === teto[i]);
  let raio = 1;
  let achada: ResultadoDaDP | null = null;
  let janelas: Janela[] = [];
  for (;;) {
    janelas = quantos.map((_, i) => {
      const de = Math.max(1, Math.min(teto[i]!, Math.floor(ideais[i]!) - raio));
      const ate = Math.max(de, Math.min(teto[i]!, Math.ceil(ideais[i]!) + raio));
      return { de, ate };
    });
    if (ehCheia(janelas)) janelas = cheia();
    achada = programacaoDinamica(quantos, ideais, total, janelas);
    if (achada && achada.soma === somaAlcancavel) break;
    if (ehCheia(janelas)) break;
    raio *= 4;
  }
  // Com jogadores ≤ alvo, todo mundo a 1 ponto sempre é alcançável; isto é só rede.
  const primeira = achada;
  if (!primeira) return minimos;
  if (ehCheia(janelas)) return primeira.precos;

  // 3b. A janela que garante o ótimo: toda tabela de custo ≤ C (com folga para o empate
  // numérico) está dentro dela.
  const limite = primeira.custo * (1 + 1e-9) + 1e-9;
  const exatas = quantos.map((q, i) => {
    const raioDoCusto = Math.sqrt(limite / q);
    const de = Math.max(1, Math.ceil(ideais[i]! - raioDoCusto));
    const ate = Math.min(teto[i]!, Math.floor(ideais[i]! + raioDoCusto));
    // A tabela da 1ª passada está aqui dentro; a guarda é só contra arredondamento.
    const p = primeira.precos[i]!;
    return { de: Math.min(de, p), ate: Math.max(ate, p) };
  });
  // A 2ª janela já cabe na 1ª: a 1ª passada viu todas as tabelas que importam.
  if (exatas.every((j, i) => j.de >= janelas[i]!.de && j.ate <= janelas[i]!.ate)) return primeira.precos;
  return programacaoDinamica(quantos, ideais, total, exatas)?.precos ?? primeira.precos;
}

function validarEntrada(quantos: readonly number[], ideais: readonly number[], alvo: number): void {
  if (quantos.length !== ideais.length) {
    throw new Error(`arredondarComSomaExata: ${quantos.length} quantidades para ${ideais.length} ideais.`);
  }
  if (!Number.isFinite(alvo)) throw new Error(`arredondarComSomaExata: alvo inválido (${alvo}).`);
  for (let i = 0; i < quantos.length; i++) {
    if (!Number.isInteger(quantos[i]) || quantos[i]! < 1) {
      throw new Error(`arredondarComSomaExata: quantos[${i}] = ${quantos[i]} (precisa ser inteiro ≥ 1).`);
    }
    if (!Number.isFinite(ideais[i])) throw new Error(`arredondarComSomaExata: ideal[${i}] inválido (${ideais[i]}).`);
  }
}

/**
 * A maior soma ≤ `total` que uma tabela monótona de preços ≥ 1 alcança. Com
 * `p_i = 1 + d_0 + … + d_i`, a soma é `jogadores + Σ d_j × Q_j` (Q_j = jogadores da classe j
 * em diante): só os valores `Q_j`, repetidos à vontade — troco.
 */
function maiorSomaAlcancavel(quantos: readonly number[], jogadores: number, total: number): number {
  const espaco = total - jogadores;
  const da = new Uint8Array(espaco + 1);
  da[0] = 1;
  let depois = jogadores;
  for (const q of quantos) {
    const moeda = depois;
    for (let x = moeda; x <= espaco; x++) if (da[x - moeda] === 1) da[x] = 1;
    depois -= q;
  }
  let x = espaco;
  while (x > 0 && da[x] !== 1) x--;
  return jogadores + x;
}

type Janela = { de: number; ate: number };
type ResultadoDaDP = { soma: number; custo: number; precos: number[] };

/**
 * A programação dinâmica, com os preços de cada classe limitados a uma janela. Com a janela
 * cheia (1 até o teto), é a busca completa.
 *
 * Só a linha de custos da classe anterior fica na memória; o caminho de volta é guardado em
 * inteiros de 16 bits (o preço da classe anterior; 0 = nenhum) quando cabe.
 */
function programacaoDinamica(
  quantos: readonly number[],
  ideais: readonly number[],
  total: number,
  janelas: readonly Janela[],
): ResultadoDaDP | null {
  const k = quantos.length;
  const largura = total + 1;
  const maiorPreco = janelas.reduce((m, j) => Math.max(m, j.ate), 0);
  const novaVolta = (tamanho: number): Uint16Array | Uint32Array =>
    maiorPreco < 0xffff ? new Uint16Array(tamanho) : new Uint32Array(tamanho);

  const volta: (Uint16Array | Uint32Array)[] = [];
  const melhor = new Float64Array(largura);
  const deOnde = novaVolta(largura);
  let custoAnterior = new Float64Array(0);
  let janelaAnterior: Janela = { de: 1, ate: 0 };

  for (let i = 0; i < k; i++) {
    const q = quantos[i]!;
    const ideal = ideais[i]!;
    const { de, ate } = janelas[i]!;
    const custoAtual = new Float64Array((ate - de + 1) * largura).fill(Infinity);
    const voltaAtual = novaVolta((ate - de + 1) * largura);

    // Mínimo acumulado da classe anterior sobre os preços ≤ p (a regra "não diminui").
    melhor.fill(Infinity);
    deOnde.fill(0);
    let proximo = janelaAnterior.de;

    for (let p = de; p <= ate; p++) {
      if (i > 0) {
        for (; proximo <= janelaAnterior.ate && proximo <= p; proximo++) {
          const base = (proximo - janelaAnterior.de) * largura;
          for (let s = 0; s < largura; s++) {
            // Estrito: no empate fica o preço anterior menor, que entrou primeiro.
            if (custoAnterior[base + s]! < melhor[s]! - 1e-12) {
              melhor[s] = custoAnterior[base + s]!;
              deOnde[s] = proximo;
            }
          }
        }
      }

      const passo = q * p;
      const erro = q * (p - ideal) ** 2;
      const base = (p - de) * largura;

      if (i === 0) {
        if (passo <= total) custoAtual[base + passo] = erro;
      } else {
        for (let s = 0; s + passo <= total; s++) {
          if (melhor[s] === Infinity) continue;
          custoAtual[base + s + passo] = melhor[s]! + erro;
          voltaAtual[base + s + passo] = deOnde[s]!;
        }
      }
    }

    custoAnterior = custoAtual;
    janelaAnterior = { de, ate };
    volta.push(voltaAtual);
  }

  // A maior soma alcançável que não passa do alvo (o alvo, quase sempre); nela, o menor custo.
  let escolha: { soma: number; p: number; custo: number } | null = null;
  for (let s = total; s >= 0 && escolha === null; s--) {
    for (let p = janelaAnterior.de; p <= janelaAnterior.ate; p++) {
      const c = custoAnterior[(p - janelaAnterior.de) * largura + s]!;
      if (c === Infinity) continue;
      if (escolha === null || c < escolha.custo - 1e-12) escolha = { soma: s, p, custo: c };
    }
  }
  if (escolha === null) return null;

  const precos = new Array<number>(k);
  let soma = escolha.soma;
  let p = escolha.p;
  for (let i = k - 1; i >= 0; i--) {
    precos[i] = p;
    const anterior = volta[i]![(p - janelas[i]!.de) * largura + soma]!;
    soma -= quantos[i]! * p;
    p = anterior;
  }
  return { soma: escolha.soma, custo: escolha.custo, precos };
}
