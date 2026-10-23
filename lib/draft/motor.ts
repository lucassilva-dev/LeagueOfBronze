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

import { elencosFecham } from "@/lib/draft/viabilidade";

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
  /**
   * A classe de preço na tabela do sorteio ("Ouro II", "Mestre · 200–299 PDL"): o preço varia
   * por divisão, e as telas mostram a classe ao lado do elo. Opcional: estados gravados antes
   * da tabela por divisão não têm, e o motor não olha para ela.
   */
  classe?: string;
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

/**
 * Por que o draft parou. A transmissão dizia sempre "a organização interrompeu o relógio",
 * inclusive quando foi o motor que pausou sozinho — e na TV isso vira acusação.
 */
export type MotivoDaPausa = "organizacao" | "atraso" | "sem_jogador";

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
  /**
   * O sorteio da ordem (quem capitaneia qual time e quem escolhe primeiro): a semente e
   * a lista de capitães ANTES de embaralhar. Com os dois, `embaralhar(semente,
   * "capitaes", capitaes)` refaz a ordem de `times` — o sorteio pode ser conferido.
   * Opcional porque drafts montados antes do sorteio não têm.
   */
  sorteio?: { semente: string; capitaes: string[]; emISO: string };
  /** Só com `fase === "pausado"`. Ausente em estados gravados antes deste campo existir. */
  motivoDaPausa?: MotivoDaPausa;
};

/**
 * Por que a escolha não vale. `motivo` é o recado em português (o painel da mesa e o log
 * leem ele); `codigo` e `params` deixam a tela do capitão dizer a mesma coisa no idioma
 * dela (lib/i18n/messages/draft.ts, `erros`).
 */
export type CodigoDaRecusa =
  | "encerrado"
  | "nao_comecou"
  | "pausado"
  | "sem_escolha"
  | "nao_e_a_vez"
  | "fora_do_pool"
  | "ja_escolhido"
  | "elenco_completo"
  | "acima_do_teto"
  | "nao_fecha_o_seu"
  | "falta_para_outro";
export type Recusa = {
  ok: false;
  motivo: string;
  codigo: CodigoDaRecusa;
  params?: Readonly<Record<string, string | number>>;
};
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
  if (estado.fase === "encerrado") return { ok: false, codigo: "encerrado", motivo: "O draft já terminou." };
  if (estado.fase === "preparando") return { ok: false, codigo: "nao_comecou", motivo: "O draft ainda não começou." };
  if (estado.fase === "pausado") return { ok: false, codigo: "pausado", motivo: "O draft está pausado." };

  const daVez = timeDaVez(estado);
  if (daVez === null) return { ok: false, codigo: "sem_escolha", motivo: "Não há escolha em andamento." };
  if (daVez !== timeId) return { ok: false, codigo: "nao_e_a_vez", motivo: "Não é a vez do seu time." };

  const jogador = estado.jogadores.find((j) => j.id === jogadorId);
  if (!jogador) return { ok: false, codigo: "fora_do_pool", motivo: "Jogador não está no pool." };
  if (jogador.timeId !== null) return { ok: false, codigo: "ja_escolhido", motivo: "Esse jogador já foi escolhido." };

  if (vagasAbertasDoTime(estado, timeId) === 0) {
    return { ok: false, codigo: "elenco_completo", motivo: "Seu elenco já está completo." };
  }

  const teto = tetoDaEscolha(estado, timeId);
  if (jogador.pontos > teto) {
    return {
      ok: false,
      codigo: "acima_do_teto",
      params: { pontos: jogador.pontos, teto },
      motivo: `Esse jogador custa ${jogador.pontos} e você só pode gastar ${teto} nesta escolha — o resto está reservado para as vagas que faltam.`,
    };
  }

  // O teto acima reserva 1 ponto por vaga; a conta de verdade é com os jogadores que
  // existem (ver lib/draft/viabilidade.ts). Separa os dois recados: o próprio elenco não
  // fecharia, ou é OUTRO time que ficaria sem como completar.
  if (!fechaDepoisDe(estado, timeId, jogador)) {
    const soEuFecho = elencosFecham([situacaoDoTime(estado, timeId, jogador)], custosRestantes(estado, jogador.id));
    return {
      ok: false,
      codigo: soEuFecho === "nao_fecha" ? "nao_fecha_o_seu" : "falta_para_outro",
      params: { riotId: jogador.riotId, pontos: jogador.pontos },
      motivo:
        soEuFecho === "nao_fecha"
          ? `Com ${jogador.riotId} (${jogador.pontos} pts) o seu elenco não fecha: não sobraria jogador barato o bastante para as vagas que faltam. Escolha alguém mais barato.`
          : `${jogador.riotId} é o que falta para outro time conseguir fechar o elenco dentro do orçamento. Escolha outro jogador.`,
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------- viabilidade

function custosRestantes(estado: EstadoDraft, semJogadorId?: string): number[] {
  return estado.jogadores.filter((j) => j.timeId === null && j.id !== semJogadorId).map((j) => j.pontos);
}

/** Vagas e folga de um time, opcionalmente depois de levar `levando`. */
function situacaoDoTime(estado: EstadoDraft, timeId: string, levando?: JogadorDoDraft) {
  const vagas = vagasAbertasDoTime(estado, timeId) - (levando ? 1 : 0);
  const folga = estado.orcamentoPorTime - gastoDoTime(estado, timeId) - (levando ? levando.pontos : 0);
  return { vagas, folga };
}

/**
 * Os elencos ainda fecham depois de `timeId` levar `jogador`?
 *
 * "indeterminado" (busca grande demais, edição com muito mais times) conta como "fecha":
 * é o comportamento de antes, que nunca recusava por isso.
 */
function fechaDepoisDe(estado: EstadoDraft, timeId: string, jogador: JogadorDoDraft): boolean {
  const times = estado.times.map((t) =>
    t.id === timeId ? situacaoDoTime(estado, t.id, jogador) : situacaoDoTime(estado, t.id),
  );
  return elencosFecham(times, custosRestantes(estado, jogador.id)) !== "nao_fecha";
}

/**
 * O estado, do jeito que está, ainda fecha todos os elencos?
 *
 * Conferido na montagem: um sorteio que já nasce sem saída (capitães caros demais para o
 * orçamento e para o pool) não pode ir ao ar.
 */
export function estadoFecha(estado: EstadoDraft, orcamentoDePassos?: number): boolean {
  const times = estado.times.map((t) => situacaoDoTime(estado, t.id));
  return elencosFecham(times, custosRestantes(estado), orcamentoDePassos) !== "nao_fecha";
}

/**
 * Quem o time da vez pode escolher AGORA — a lista que as telas usam para apagar o resto.
 *
 * Antes cada tela recalculava "cabe" com a fórmula do teto, e mostrava como escolhível um
 * jogador que o servidor recusaria. Agora a resposta é a do motor. A conta é feita uma vez
 * por VALOR de pontos (jogadores do mesmo preço dão a mesma resposta), então custa poucas
 * buscas por sondagem.
 */
export function escolhiveisDaVez(estado: EstadoDraft): string[] {
  const timeId =
    estado.fase === "rodando" || estado.fase === "pausado" ? estado.ordem[estado.escolhaAtual] : undefined;
  if (!timeId || vagasAbertasDoTime(estado, timeId) === 0) return [];
  const teto = tetoDaEscolha(estado, timeId);
  const porValor = new Map<number, boolean>();
  return jogadoresDisponiveis(estado)
    .filter((j) => {
      if (j.pontos > teto) return false;
      if (!porValor.has(j.pontos)) porValor.set(j.pontos, fechaDepoisDe(estado, timeId, j));
      return porValor.get(j.pontos)!;
    })
    .map((j) => j.id);
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

  // O mais barato quase sempre mantém tudo viável; a checagem existe para o caso em que
  // ele é justamente o que outro time precisa.
  return candidatos.find((j) => fechaDepoisDe(estado, timeId, j)) ?? null;
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
    return { ...estado, fase: "pausado", prazoISO: null, motivoDaPausa: "sem_jogador" };
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
    return { ...estado, fase: "pausado", prazoISO: null, motivoDaPausa: "atraso" };
  }

  let atual = estado;
  for (let i = 0; i < maxPassos; i++) {
    const proximo = avancarPorTempo(atual, agoraMs);
    if (proximo === atual) break;
    atual = proximo;
  }
  return atual;
}

// ---------------------------------------------------------------- antes de sortear

/**
 * O sorteio pode acontecer com esta lista?
 *
 * Função pura, separada de `montarDraftDosAprovados` (que lê o banco) para que estas
 * duas regras — as que já falharam — sejam verificáveis num teste:
 *
 *  1. quem joga são os "apto", e eles têm de ser EXATAMENTE as vagas. Antes o pool era
 *     cortado por ordem de inscrição, então quem a organização marcou como sobra
 *     entrava se tivesse se inscrito cedo — a decisão dela era apagada em silêncio;
 *  2. a soma dos pontos tem de caber no teto total. Sem isto, um draft podia entrar ao
 *     vivo já condenado a travar numa escolha em que ninguém cabe.
 *
 * Devolve a lista de impedimentos, vazia quando está tudo certo.
 */
export function impedimentosDoSorteio(params: {
  pontosDosQueJogam: readonly number[];
  vagas: number;
  times: number;
  orcamentoPorTime: number;
  totalDeAprovados: number;
}): string[] {
  const { pontosDosQueJogam, vagas, times, orcamentoPorTime, totalDeAprovados } = params;
  const problemas: string[] = [];
  const quantos = pontosDosQueJogam.length;

  if (times === 0) {
    problemas.push(`Não há aprovados suficientes para fechar um time: ${totalDeAprovados}.`);
    return problemas;
  }

  if (quantos > vagas) {
    problemas.push(
      `Há ${quantos} aprovados para ${vagas} vagas. Marque ${quantos - vagas} como "sobra" antes de sortear — quem fica de fora é decisão da organização, não da ordem de inscrição.`,
    );
  } else if (quantos < vagas) {
    problemas.push(
      `Há ${quantos} aprovados para ${vagas} vagas. Faltam ${vagas - quantos}: aprove mais alguém ou tire da sobra.`,
    );
  }

  const total = pontosDosQueJogam.reduce((soma, p) => soma + p, 0);
  const teto = times * orcamentoPorTime;
  if (total > teto) {
    problemas.push(
      `Os ${quantos} sorteados somam ${total} pontos para um teto de ${teto} (${times} times × ${orcamentoPorTime}). Não há como fechar os elencos: troque quem entra, suba o orçamento por time, ou deixe alguém de elo alto na sobra.`,
    );
  }

  return problemas;
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

  // Unicidade ANTES de presença: dois times com o mesmo capitão passariam na checagem
  // de presença e só quebrariam mais tarde, com um time de elenco vazio.
  if (new Set(times.map((t) => t.capitaoId)).size !== times.length) {
    throw new Error("O mesmo jogador foi indicado como capitão de mais de um time.");
  }

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

  // Ordem esgotada = draft terminado (a mesma regra que o resto do arquivo já segue:
  // `escolhaAtual` igual a `ordem.length` significa acabou). Sem isto, uma ordem vazia
  // — que acontece com `jogadores_por_time = 1`, em que os capitães já preenchem os
  // times — entrava em "rodando" sem nenhuma escolha a fazer e nunca mais saía: o
  // cronômetro não tinha o que virar e a transmissão ficava presa para sempre.
  if (estado.escolhaAtual >= estado.ordem.length) {
    return { ...estado, fase: "encerrado", prazoISO: null };
  }

  const novo: EstadoDraft = { ...estado, fase: "rodando", prazoISO: null };
  delete novo.motivoDaPausa;
  novo.prazoISO = proximoPrazo(novo, agoraMs);
  return novo;
}

export function pausarDraft(estado: EstadoDraft): EstadoDraft {
  if (estado.fase !== "rodando") return estado;
  return { ...estado, fase: "pausado", prazoISO: null, motivoDaPausa: "organizacao" };
}

export function retomarDraft(estado: EstadoDraft, agoraMs: number): EstadoDraft {
  if (estado.fase !== "pausado") return estado;
  return iniciarDraft(estado, agoraMs);
}

/**
 * Para que um time sem jogador possível volte a andar.
 *
 * `avancarPorTempo` PAUSA quando o time da vez não cabe ninguém no teto — e `retomar`
 * sozinho só reabre o mesmo beco: o prazo vence de novo e pausa de novo. Esta função é
 * o diagnóstico que o painel mostra: de quem é a vez e qual o teto, para a organização
 * decidir (subir o orçamento não muda um draft já montado; o caminho é remontar).
 */
export function vezSemSaida(estado: EstadoDraft): { timeId: string; teto: number } | null {
  const timeId = estado.ordem[estado.escolhaAtual];
  if (!timeId || estado.fase === "encerrado") return null;
  return maisBaratoValido(estado, timeId) ? null : { timeId, teto: tetoDaEscolha(estado, timeId) };
}
