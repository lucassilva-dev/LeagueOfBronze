/**
 * Motor do draft ao vivo.
 *
 * Funções PURAS, sem banco e sem relógio próprio: o "agora" entra por parâmetro. É o
 * que permite simular um draft inteiro num teste, incluindo estouro de cronômetro,
 * sem esperar tempo real — e é o que garante que servidor e transmissão cheguem
 * exatamente ao mesmo estado a partir dos mesmos eventos.
 *
 * Três coisas que este arquivo NÃO faz:
 *  1. não decide de quem é a vez pelo que o cliente diz — quem chama informa o time,
 *     e `podeEscolher` confere contra a ordem;
 *  2. não conhece o número 6. O design entregue tinha seis times cravados; aqui o
 *     número sai dos aprovados;
 *  3. não guarda pontuação vinda do cliente. Os pontos chegam prontos do banco, já
 *     derivados do elo.
 */

// ---------------------------------------------------------------- tipos

export type TimeDoDraft = {
  id: string;
  nome: string;
  cor: string;
  /** Id do jogador que é o capitão. Ele já ocupa uma vaga e já custa os pontos dele. */
  capitaoId: string;
};

export type JogadorDoDraft = {
  id: string;
  riotId: string;
  pontos: number;
  rota1: string;
  rota2: string;
  elo: string;
  /** null enquanto não foi escolhido. */
  timeId: string | null;
};

export type EventoDraft = {
  escolha: number;
  timeId: string;
  jogadorId: string;
  /** true quando o cronômetro estourou e o motor escolheu sozinho. */
  automatica: boolean;
  emISO: string;
};

export type FaseDraft = "preparando" | "rodando" | "pausado" | "encerrado";

export type EstadoDraft = {
  versao: 1;
  fase: FaseDraft;
  times: TimeDoDraft[];
  jogadores: JogadorDoDraft[];
  /** Um timeId por escolha, na ordem serpentina. O tamanho é o total de escolhas. */
  ordem: string[];
  /** Índice em `ordem`. Igual a `ordem.length` significa draft terminado. */
  escolhaAtual: number;
  /** Instante ABSOLUTO em que a escolha atual vence. Nulo quando não está rodando. */
  prazoISO: string | null;
  jogadoresPorTime: number;
  orcamentoPorTime: number;
  segundosPorEscolha: number;
  historico: EventoDraft[];
};

export type Recusa = { ok: false; motivo: string };
export type Aprovacao = { ok: true };

// ---------------------------------------------------------------- ordem

/**
 * Ordem serpentina: 1→N na primeira rodada, N→1 na segunda, e assim por diante.
 *
 * Sem a inversão, o primeiro time escolheria primeiro em todas as rodadas e teria
 * vantagem composta. Com ela, quem escolhe por último numa rodada abre a seguinte.
 */
export function ordemSerpentina(timeIds: readonly string[], rodadas: number): string[] {
  const ordem: string[] = [];
  for (let r = 0; r < rodadas; r++) {
    const daVez = r % 2 === 0 ? timeIds : [...timeIds].reverse();
    ordem.push(...daVez);
  }
  return ordem;
}

/** Rodadas = vagas por time menos o capitão, que já está no elenco. */
export function rodadasDoDraft(jogadoresPorTime: number): number {
  return Math.max(0, jogadoresPorTime - 1);
}

// ---------------------------------------------------------------- contas por time

export function elencoDoTime(estado: EstadoDraft, timeId: string): JogadorDoDraft[] {
  return estado.jogadores.filter((j) => j.timeId === timeId);
}

/** Pontos já comprometidos, INCLUINDO o capitão — ele sai do mesmo bolo. */
export function gastoDoTime(estado: EstadoDraft, timeId: string): number {
  return elencoDoTime(estado, timeId).reduce((soma, j) => soma + j.pontos, 0);
}

export function vagasAbertasDoTime(estado: EstadoDraft, timeId: string): number {
  return Math.max(0, estado.jogadoresPorTime - elencoDoTime(estado, timeId).length);
}

/**
 * O máximo que este time pode gastar NESTA escolha.
 *
 * A subtração das vagas restantes é o que impede o time de gastar tudo num jogador
 * caro e depois não conseguir completar o elenco: cada vaga que sobrar depois desta
 * precisa de pelo menos 1 ponto, então esse mínimo fica reservado.
 *
 *   teto = orçamento − gasto − (vagas abertas − 1)
 */
export function tetoDaEscolha(estado: EstadoDraft, timeId: string): number {
  const abertas = vagasAbertasDoTime(estado, timeId);
  if (abertas === 0) return 0;
  return estado.orcamentoPorTime - gastoDoTime(estado, timeId) - (abertas - 1);
}

export function timeDaVez(estado: EstadoDraft): string | null {
  if (estado.fase !== "rodando" && estado.fase !== "pausado") return null;
  return estado.ordem[estado.escolhaAtual] ?? null;
}

export function jogadoresDisponiveis(estado: EstadoDraft): JogadorDoDraft[] {
  return estado.jogadores.filter((j) => j.timeId === null);
}

// ---------------------------------------------------------------- validação

/**
 * A escolha vale?
 *
 * Esta é a função que o servidor chama antes de gravar. Ela confere de quem é a vez
 * contra `ordem`, e NÃO contra o que veio na requisição — é a diferença entre um
 * draft e um formulário em que qualquer um escolhe pelos outros.
 */
export function podeEscolher(
  estado: EstadoDraft,
  timeId: string,
  jogadorId: string,
): Aprovacao | Recusa {
  if (estado.fase === "encerrado") return { ok: false, motivo: "O draft já terminou." };
  if (estado.fase === "preparando") return { ok: false, motivo: "O draft ainda não começou." };
  if (estado.fase === "pausado") return { ok: false, motivo: "O draft está pausado." };

  const daVez = timeDaVez(estado);
  if (daVez === null) return { ok: false, motivo: "Não há escolha em andamento." };
  if (daVez !== timeId) return { ok: false, motivo: "Não é a vez do seu time." };

  const jogador = estado.jogadores.find((j) => j.id === jogadorId);
  if (!jogador) return { ok: false, motivo: "Jogador não está no pool." };
  if (jogador.timeId !== null) return { ok: false, motivo: "Esse jogador já foi escolhido." };

  if (vagasAbertasDoTime(estado, timeId) === 0) {
    return { ok: false, motivo: "Seu elenco já está completo." };
  }

  const teto = tetoDaEscolha(estado, timeId);
  if (jogador.pontos > teto) {
    return {
      ok: false,
      motivo: `Esse jogador custa ${jogador.pontos} e você só pode gastar ${teto} nesta escolha — o resto está reservado para as vagas que faltam.`,
    };
  }

  return { ok: true };
}

/**
 * O mais barato que o time ainda pode pegar. Usado pelo auto-pick.
 *
 * Desempate por pontos, depois por Riot ID: precisa ser DETERMINÍSTICO, senão dois
 * cálculos do mesmo estado (o do servidor e o de uma reexecução) escolheriam pessoas
 * diferentes.
 */
export function maisBaratoValido(estado: EstadoDraft, timeId: string): JogadorDoDraft | null {
  const teto = tetoDaEscolha(estado, timeId);
  const candidatos = jogadoresDisponiveis(estado)
    .filter((j) => j.pontos <= teto)
    .sort((a, b) => a.pontos - b.pontos || a.riotId.localeCompare(b.riotId));

  return candidatos[0] ?? null;
}

// ---------------------------------------------------------------- transições

/**
 * O prazo da próxima escolha.
 *
 * `baseMs` é de onde a contagem parte. Numa escolha feita por gente, parte de agora.
 * Num estouro de cronômetro, parte do prazo que venceu — e essa diferença importa:
 * se partisse de "agora", o calendário do draft dependeria de QUANDO alguém sondou o
 * servidor, e dois espectadores consultando em momentos diferentes chegariam a
 * estados diferentes. Com a corrente de prazos, o mesmo histórico sempre produz o
 * mesmo resultado, independente de quem olhou e quando.
 */
function proximoPrazo(estado: EstadoDraft, baseMs: number): string | null {
  if (estado.escolhaAtual >= estado.ordem.length) return null;
  return new Date(baseMs + estado.segundosPorEscolha * 1000).toISOString();
}

/**
 * Aplica uma escolha e devolve um estado NOVO (não muda o recebido).
 *
 * Quem chama já passou por `podeEscolher`; aqui repetimos a checagem porque esta
 * função também é usada pelo auto-pick, e um motor que confia em quem chama é um
 * motor que grava estado inválido no dia em que alguém esquecer a validação.
 */
export function aplicarEscolha(
  estado: EstadoDraft,
  timeId: string,
  jogadorId: string,
  agoraMs: number,
  automatica = false,
  /** De onde parte o prazo seguinte. Ver `proximoPrazo`. Padrão: agora. */
  baseDoProximoPrazoMs?: number,
): EstadoDraft {
  const veredito = podeEscolher(estado, timeId, jogadorId);
  if (!veredito.ok) throw new Error(veredito.motivo);

  const jogadores = estado.jogadores.map((j) => (j.id === jogadorId ? { ...j, timeId } : j));
  const escolhaAtual = estado.escolhaAtual + 1;
  const terminou = escolhaAtual >= estado.ordem.length;

  const novo: EstadoDraft = {
    ...estado,
    jogadores,
    escolhaAtual,
    fase: terminou ? "encerrado" : estado.fase,
    historico: [
      ...estado.historico,
      {
        escolha: estado.escolhaAtual,
        timeId,
        jogadorId,
        automatica,
        emISO: new Date(agoraMs).toISOString(),
      },
    ],
    prazoISO: null,
  };

  novo.prazoISO = terminou ? null : proximoPrazo(novo, baseDoProximoPrazoMs ?? agoraMs);
  return novo;
}

/**
 * O cronômetro estourou: escolhe o mais barato válido pelo time da vez.
 *
 * Devolve o estado inalterado quando ainda há tempo — quem chama pode invocar sem
 * conferir antes. Se não houver ninguém válido (orçamento apertado demais), o draft
 * PAUSA em vez de travar em silêncio: é caso de a organização intervir.
 */
export function avancarPorTempo(estado: EstadoDraft, agoraMs: number): EstadoDraft {
  if (estado.fase !== "rodando") return estado;
  if (!estado.prazoISO) return estado;

  const venceuEm = Date.parse(estado.prazoISO);
  if (venceuEm > agoraMs) return estado;

  const timeId = timeDaVez(estado);
  if (!timeId) return estado;

  const escolhido = maisBaratoValido(estado, timeId);
  if (!escolhido) {
    return { ...estado, fase: "pausado", prazoISO: null };
  }

  // A escolha automática é datada no instante em que o prazo venceu, não em quando
  // alguém percebeu — e o prazo seguinte parte dali. É o que faz o histórico ser o
  // mesmo para todo mundo.
  return aplicarEscolha(estado, timeId, escolhido.id, venceuEm, true, venceuEm);
}

/**
 * Roda todos os estouros pendentes de uma vez.
 *
 * Necessário porque ninguém garante que o servidor foi acordado a cada 60 segundos:
 * em serverless, entre uma sondagem e outra pode ter passado tempo suficiente para
 * vencerem várias escolhas. Sem isto, o draft "voltaria no tempo" ao acordar.
 */
/** Atraso a partir do qual paramos de escolher sozinhos e pedimos gente. */
const ESCOLHAS_DE_ATRASO_ATE_PAUSAR = 10;

export function alcancarORelogio(estado: EstadoDraft, agoraMs: number, maxPassos = 200): EstadoDraft {
  if (estado.fase !== "rodando" || !estado.prazoISO) return estado;

  // Freio contra o cenário "ninguém abriu a página desde ontem". A corrente de prazos
  // é determinística, então sem isto um draft abandonado à noite acordaria sorteado
  // inteiro por auto-pick. Atraso grande não é um draft atrasado — é um draft que
  // parou de acontecer, e aí quem decide é a organização.
  const atrasoMs = agoraMs - Date.parse(estado.prazoISO);
  const limiteMs = ESCOLHAS_DE_ATRASO_ATE_PAUSAR * estado.segundosPorEscolha * 1000;
  if (atrasoMs > limiteMs) {
    return { ...estado, fase: "pausado", prazoISO: null };
  }

  let atual = estado;
  for (let i = 0; i < maxPassos; i++) {
    const proximo = avancarPorTempo(atual, agoraMs);
    if (proximo === atual) break;
    atual = proximo;
  }
  return atual;
}

// ---------------------------------------------------------------- montagem

export function montarDraft(params: {
  times: readonly TimeDoDraft[];
  jogadores: readonly JogadorDoDraft[];
  jogadoresPorTime: number;
  orcamentoPorTime: number;
  segundosPorEscolha: number;
}): EstadoDraft {
  const { times, jogadores, jogadoresPorTime, orcamentoPorTime, segundosPorEscolha } = params;

  if (times.length === 0) throw new Error("Não há times para o draft.");

  // O capitão já entra no elenco do time dele: ocupa vaga e custa pontos. Se isso não
  // acontecesse aqui, o teto de gasto sairia errado desde a primeira escolha.
  const comCapitaes = jogadores.map((j) => {
    const time = times.find((t) => t.capitaoId === j.id);
    return time ? { ...j, timeId: time.id } : { ...j, timeId: null };
  });

  for (const time of times) {
    if (!comCapitaes.some((j) => j.id === time.capitaoId)) {
      throw new Error(`O capitão do time ${time.nome} não está no pool.`);
    }
  }

  return {
    versao: 1,
    fase: "preparando",
    times: [...times],
    jogadores: comCapitaes,
    ordem: ordemSerpentina(
      times.map((t) => t.id),
      rodadasDoDraft(jogadoresPorTime),
    ),
    escolhaAtual: 0,
    prazoISO: null,
    jogadoresPorTime,
    orcamentoPorTime,
    segundosPorEscolha,
    historico: [],
  };
}

export function iniciarDraft(estado: EstadoDraft, agoraMs: number): EstadoDraft {
  if (estado.fase === "encerrado") throw new Error("O draft já terminou.");
  const novo: EstadoDraft = { ...estado, fase: "rodando", prazoISO: null };
  novo.prazoISO = proximoPrazo(novo, agoraMs);
  return novo;
}

export function pausarDraft(estado: EstadoDraft): EstadoDraft {
  if (estado.fase !== "rodando") return estado;
  return { ...estado, fase: "pausado", prazoISO: null };
}

export function retomarDraft(estado: EstadoDraft, agoraMs: number): EstadoDraft {
  if (estado.fase !== "pausado") return estado;
  return iniciarDraft(estado, agoraMs);
}
