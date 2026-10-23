import { motivoParaManterAVaga, reservaADevolverSeNaoJogar, type LugarNaFila } from "@/lib/inscricoes/fila";
import { dataDoPrazo } from "@/lib/inscricoes/pagamento";
import { pontosDoElo } from "@/lib/inscricoes/schema";
import { requisitosForaDeOk } from "@/lib/inscricoes/situacao";
import { AUTOR_RIOT, janelaDoItemE, mesmoRiotId } from "@/lib/riot/decidir";

/**
 * O que merece o olho da organização num inscrito, calculado na leitura.
 *
 * Alerta não grava nada e não decide nada: é o painel dizendo "olha aqui". As ações que
 * mexem em dinheiro continuam exigindo o clique de quem tem o escopo do caixa — o alerta
 * só aponta qual botão.
 *
 * Os textos são FATOS ("declarou Ouro, a Riot mostra Diamante"), nunca acusação. O painel
 * é visto por vários organizadores; rotular alguém de smurf aqui seria pior do que não
 * dizer nada.
 */

/** Todos os códigos, na ordem das seções abaixo. É a lista que a rota aceita na ciência. */
export const CODIGOS_DO_ALERTA = [
  "nick_trocado",
  "riot_id_inexistente",
  "outro_servidor",
  "sem_ranque_solo",
  "erro_riot",
  "elo_travado_diverge",
  "declarou_diferente",
  "apto_com_requisito",
  "e_abaixo_do_minimo",
  "mesma_conta",
  "apto_sem_pagamento",
  "organizador_cobrado",
  "recusado_pago",
  "recusado_declarado",
  "desistiu_com_pagamento",
  "prazo_vencido",
  "reserva_com_pagamento",
] as const;

export type CodigoDoAlerta = (typeof CODIGOS_DO_ALERTA)[number];

/**
 * Os alertas da seção «caixa» (lá embaixo): os que a aba Pagamentos lista, e os únicos cuja
 * ciência pede o escopo do financeiro. Os da fila de reserva ficam fora de propósito: o
 * «prazo vencido» leva ao «passar a vaga», que é da conferência.
 */
export const ALERTAS_DO_CAIXA: ReadonlySet<CodigoDoAlerta> = new Set<CodigoDoAlerta>([
  "apto_sem_pagamento",
  "organizador_cobrado",
  "recusado_pago",
  "recusado_declarado",
  "desistiu_com_pagamento",
]);

export type Alerta = {
  codigo: CodigoDoAlerta;
  texto: string;
  /**
   * Os fatos que disparam o alerta e que o texto NÃO diz — o estado, o valor e as datas do
   * pagamento; o prazo que venceu. Ausente: o texto já diz tudo o que o dispara (outro nick,
   * outro elo, outros itens = outro texto). Junto com o texto, é a ASSINATURA do alerta
   * (`assinaturaDoAlerta`), e é por ela que a ciência da organização vale.
   */
  fatos?: string;
  /** Botão de um clique no caixa (escopo financeiro). */
  acaoPagamento?: "isento" | "estorno_devido";
  /** Botão «Passar a vaga ao 1º da fila» (ação `passar_vaga`, D5), com confirmação. */
  acaoFila?: "passar_vaga";
};

export type InscritoParaAlerta = {
  /** Para não se achar a si mesmo na lista de `inscritos` (ver «mesma_conta»). */
  id?: string;
  riot_id: string;
  /** A conta na Riot. Duas inscrições com o mesmo = a mesma conta, com grafias diferentes. */
  puuid?: string | null;
  situacao: string;
  organizador: boolean;
  elo_declarado: string;
  elo_verificado: string | null;
  elo_fonte?: string | null;
  elo_riot?: string | null;
  riot_id_atual?: string | null;
  riot_status?: string | null;
  riot_regiao?: string | null;
  riot_erro?: string | null;
  riot_partidas_janela?: number | null;
};

/**
 * O pagamento como o alerta lê. Além do estado, os carimbos entram na assinatura dos alertas
 * de dinheiro: o «pago» desfeito volta a «aguardando» com o `conferido_em` do «pago» — o
 * mesmo estado de antes, mas OUTRO fato, que a ciência dada antes não pode cobrir. O painel e
 * o servidor (`darCienciaDoAlerta`) mandam os mesmos campos.
 */
export type PagamentoParaAlerta = {
  estado: string;
  /** Opcional: sem ele, o alerta de prazo vencido (D5) não é calculado. */
  vence_em?: string | null;
  valor_centavos?: number | null;
  declarado_em?: string | null;
  conferido_em?: string | null;
};

/** «2026-10-25T18:00:00.123456+00:00», «…T18:00:00Z», «… 18:00:00-03:00»: o que o Postgres e o JS escrevem. */
const INSTANTE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}(?::?\d{2})?)?$/i;

/**
 * Um instante como fato: ISO em UTC com milissegundos, ou o texto cru se não for data.
 *
 * Sem `Date.parse` de propósito: a assinatura é calculada no navegador (o painel) e no
 * servidor, e ela tem de sair IGUAL nos dois. O Postgres manda microssegundos e o fuso
 * («+00:00»), e nem todo navegador lê isso com `Date.parse` (o Safari do celular já devolveu
 * NaN) — aí a tela e o servidor discordariam e nenhuma ciência valeria.
 */
function instante(valor: string | null | undefined): string {
  if (!valor) return "—";
  const m = INSTANTE.exec(valor.trim());
  if (!m) return valor;
  const [, ano, mes, dia, hora, minuto, segundo = "0", fracao = "0", fuso] = m;
  let ms = Date.UTC(+ano!, +mes! - 1, +dia!, +hora!, +minuto!, +segundo, Number(`${fracao}000`.slice(0, 3)));
  if (fuso && fuso.toUpperCase() !== "Z") {
    const digitos = fuso.slice(1).replace(":", "");
    const minutos = Number(digitos.slice(0, 2)) * 60 + Number(digitos.slice(2) || "0");
    ms -= (fuso.startsWith("-") ? -1 : 1) * minutos * 60_000;
  }
  return Number.isFinite(ms) ? new Date(ms).toISOString() : valor;
}

/** Os fatos do pagamento por trás de um alerta de dinheiro (ver `Alerta.fatos`). */
function fatosDoPagamento(p: PagamentoParaAlerta | null, comPrazo = false): string {
  if (!p) return "sem pagamento";
  const partes = [
    `pagamento ${p.estado}`,
    `valor ${p.valor_centavos ?? "?"}`,
    `declarado ${instante(p.declarado_em)}`,
    `conferido ${instante(p.conferido_em)}`,
  ];
  if (comPrazo) partes.push(`prazo ${instante(p.vence_em)}`);
  return partes.join(" · ");
}

/** O estado de um requisito como o alerta escreve. */
const ESTADO_DO_ITEM: Readonly<Record<string, string>> = {
  pendente: "pendente",
  provisorio: "provisório",
  risco: "risco",
  recusado: "recusado",
  nao_avaliavel: "não avaliável",
};

export function alertasDoInscrito(args: {
  inscrito: InscritoParaAlerta;
  conferencias: readonly { item: string; estado: string; conferido_por?: string | null }[];
  /** `vence_em` opcional: sem ele, o alerta de prazo vencido (D5) não é calculado. */
  pagamento: PagamentoParaAlerta | null;
  config: { inicio_campeonato: string | null; min_ranqueadas: number };
  agoraMs: number;
  /**
   * O lugar dele na fila (`montarFila` em lib/inscricoes/fila.ts). Opcional: sem ele, os
   * alertas da fila (prazo vencido, reserva com pagamento) não são calculados, e reserva é
   * tratado como titular — o comportamento de antes da fila.
   */
  lugar?: LugarNaFila;
  /**
   * Todos os inscritos (o próprio pode estar no meio). Opcional: sem a lista, o alerta de
   * conta repetida simplesmente não é calculado.
   */
  inscritos?: readonly InscritoParaAlerta[];
}): Alerta[] {
  const { inscrito: i, conferencias, pagamento, config, agoraMs } = args;
  const alertas: Alerta[] = [];
  const fora = i.situacao === "recusado" || i.situacao === "desistiu" || i.situacao === "excluido";

  // ------------------------------------------------ Riot
  // Sem `fatos`: o texto já diz o que dispara cada um (o nick novo, a região, o erro, os
  // elos), e o «não encontrado» e o «sem ranque» são do Riot ID da inscrição, que não muda.
  if (i.riot_id_atual && !mesmoRiotId(i.riot_id_atual, i.riot_id)) {
    alertas.push({
      codigo: "nick_trocado",
      texto: `Trocou de Riot ID: a conta agora é ${i.riot_id_atual} (regra 12).`,
    });
  }
  switch (i.riot_status) {
    case "riot_id_inexistente":
      alertas.push({ codigo: "riot_id_inexistente", texto: "Riot ID não encontrado na Riot — pode ser erro de digitação." });
      break;
    case "outro_servidor":
      alertas.push({
        codigo: "outro_servidor",
        texto: `Conta em outro servidor (${(i.riot_regiao ?? "?").toUpperCase()}).`,
      });
      break;
    case "sem_ranque_solo":
      alertas.push({ codigo: "sem_ranque_solo", texto: "Sem ranque na solo/duo nesta temporada (MD5 não feita?)." });
      break;
    case "erro":
      alertas.push({ codigo: "erro_riot", texto: `A última consulta à Riot falhou${i.riot_erro ? `: ${i.riot_erro}` : ""}.` });
      break;
  }

  // A mesma conta em duas inscrições: o índice do banco compara o Riot ID escrito, e a Riot
  // acha "SAMUEL VENANCIO" e "SAMUEL VENÂNCIO" como a mesma conta. Só entre quem ainda conta.
  if (i.puuid && !fora && args.inscritos) {
    const outras = args.inscritos.filter(
      (o) =>
        o !== i &&
        (i.id === undefined || o.id !== i.id) &&
        o.puuid === i.puuid &&
        o.situacao !== "recusado" &&
        o.situacao !== "desistiu" &&
        o.situacao !== "excluido",
    );
    if (outras.length > 0) {
      alertas.push({
        codigo: "mesma_conta",
        texto: `A mesma conta da Riot está em outra inscrição: ${outras.map((o) => o.riot_id).join(", ")}. Confira se não é a mesma pessoa inscrita duas vezes.`,
      });
    }
  }

  if (i.elo_fonte === "organizacao" && i.elo_riot && i.elo_riot !== i.elo_verificado) {
    alertas.push({
      codigo: "elo_travado_diverge",
      texto: `Elo travado pela organização em ${i.elo_verificado}; a Riot mostra ${i.elo_riot}.`,
    });
  }

  if (i.elo_riot) {
    const declarado = pontosDoElo(i.elo_declarado);
    const riot = pontosDoElo(i.elo_riot);
    if (declarado !== null && riot !== null && Math.abs(declarado - riot) >= 2) {
      alertas.push({
        codigo: "declarou_diferente",
        texto: `Declarou ${i.elo_declarado}; a Riot mostra ${i.elo_riot}.`,
      });
    }
  }

  // ------------------------------------------------ requisitos
  // O texto diz QUAIS itens e em que estado: a ciência do «(A) pendente» não cobre, depois,
  // o «(F) recusado» — outro item, outro texto, e o alerta volta a contar sozinho.
  const foraDeOk =
    i.situacao === "apto" || i.situacao === "sobra" ? requisitosForaDeOk(conferencias, config.inicio_campeonato, agoraMs) : [];
  if (foraDeOk.length > 0) {
    const itens = foraDeOk
      .map((f) => `(${f.item.toUpperCase()}) ${f.estado === null ? "sem registro" : (ESTADO_DO_ITEM[f.estado] ?? f.estado)}`)
      .join(", ");
    alertas.push({
      codigo: "apto_com_requisito",
      texto: `Está aprovado, mas há requisito fora de ok/exceção: ${itens}. Confira e ajuste a situação.`,
    });
  }

  // O (e) aprovado à mão, e a Riot contando menos partidas do que o mínimo na janela.
  const e = conferencias.find((c) => c.item === "e");
  const janela = janelaDoItemE(config.inicio_campeonato);
  if (
    e &&
    e.estado === "ok" &&
    e.conferido_por !== AUTOR_RIOT &&
    janela &&
    agoraMs >= janela.fimMs &&
    i.riot_partidas_janela !== null &&
    i.riot_partidas_janela !== undefined &&
    i.riot_partidas_janela < config.min_ranqueadas
  ) {
    alertas.push({
      codigo: "e_abaixo_do_minimo",
      texto: `Item (e) aprovado, mas a Riot conta ${i.riot_partidas_janela} de ${config.min_ranqueadas} partidas na janela.`,
    });
  }

  // ------------------------------------------------ caixa
  // Todos com `fatos` do pagamento: o texto é quase fixo, e o dinheiro pode ir e voltar
  // («pago» desfeito, um Pix novo depois do estorno) sem o texto mudar uma letra.
  const estado = pagamento?.estado;
  const fatosDoDinheiro = fatosDoPagamento(pagamento);
  const reserva = args.lugar?.tipo === "reserva";
  // O sistema só PROMOVE: se o pagamento voltou atrás depois da promoção (o «pago» foi na
  // linha errada), ou se alguém marcou apto à mão sem pagamento, a pessoa continuava apta e
  // entrava no sorteio do draft sem nada na tela apontar. Organizador não paga — o caso dele
  // é o «organizador_cobrado».
  // Reserva não paga enquanto não for chamado (D2): aprovado sem pagamento, para ele, é o normal.
  if (
    (i.situacao === "apto" || i.situacao === "sobra") &&
    !i.organizador &&
    !reserva &&
    estado !== "pago" &&
    estado !== "isento"
  ) {
    alertas.push({
      codigo: "apto_sem_pagamento",
      texto: "Aprovado sem pagamento confirmado (regra 22) — confira o caixa ou ajuste a situação.",
      fatos: fatosDoDinheiro,
    });
  }
  if (i.organizador && !fora && (estado === "aguardando" || estado === "declarado")) {
    alertas.push({
      codigo: "organizador_cobrado",
      texto: "Organizador desta edição sendo cobrado — organizadores não pagam.",
      fatos: fatosDoDinheiro,
      acaoPagamento: "isento",
    });
  }
  // Excluir não apaga o dinheiro: quem foi excluído com pagamento recebe o mesmo aviso
  // de quem foi recusado.
  const recusadoOuExcluido = i.situacao === "recusado" ? "Recusado" : i.situacao === "excluido" ? "Excluído" : null;
  if (recusadoOuExcluido && estado === "pago") {
    alertas.push({
      codigo: "recusado_pago",
      texto: `${recusadoOuExcluido} com pagamento recebido — o valor precisa ser devolvido.`,
      fatos: fatosDoDinheiro,
      acaoPagamento: "estorno_devido",
    });
  }
  if (recusadoOuExcluido && estado === "declarado") {
    alertas.push({
      codigo: "recusado_declarado",
      texto: `${recusadoOuExcluido}, mas disse que pagou — confira o extrato antes de devolver.`,
      fatos: fatosDoDinheiro,
    });
  }
  // O texto separa os dois casos, como o recusado já separa em dois códigos: a ciência do
  // «só declarou» (nada a decidir ainda) não pode esconder o Pix que cai depois.
  if (i.situacao === "desistiu" && (estado === "pago" || estado === "declarado")) {
    alertas.push({
      codigo: "desistiu_com_pagamento",
      texto:
        estado === "pago"
          ? "Desistiu com pagamento recebido — o regulamento não define reembolso; decidam e registrem."
          : "Desistiu com pagamento declarado (disse que pagou; confira o extrato) — o regulamento não define reembolso; decidam e registrem.",
      fatos: fatosDoDinheiro,
    });
  }

  // ------------------------------------------------ fila de reserva
  if (args.lugar && reservaADevolverSeNaoJogar(args.lugar, estado)) {
    alertas.push({
      codigo: "reserva_com_pagamento",
      texto:
        estado === "pago"
          ? "Reserva com pagamento recebido — fora do prêmio; devolver se não for chamado até o fim."
          : "Reserva que disse ter pago — confira o extrato; se não for chamado até o fim, devolver.",
      fatos: fatosDoDinheiro,
    });
  }
  if (
    args.lugar &&
    pagamento &&
    pagamento.vence_em !== undefined &&
    motivoParaManterAVaga(
      {
        lugar: args.lugar,
        organizador: i.organizador,
        situacao: i.situacao,
        pagamento: { estado: pagamento.estado, vence_em: pagamento.vence_em },
      },
      agoraMs,
    ) === null
  ) {
    // O prazo que venceu vai no texto (com a hora, quando não é o fim do dia — as 48 h do
    // reserva chamado) e nos fatos: o titular que já perdeu um prazo, foi para a fila e foi
    // chamado de novo perde OUTRO prazo, que a ciência do primeiro não cobre.
    const venceu = pagamento.vence_em ? dataDoPrazo(pagamento.vence_em, "pt-BR", { ano: false, fuso: false }) : null;
    alertas.push({
      codigo: "prazo_vencido",
      texto: `Titular sem pagamento depois do prazo${venceu ? ` (venceu ${venceu})` : ""} — dá para passar a vaga ao 1º da fila (com confirmação).`,
      fatos: fatosDoPagamento(pagamento, true),
      acaoFila: "passar_vaga",
    });
  }

  return alertas;
}

// ---------------------------------------------------------------- ciência da organização

/**
 * «Dar ciência» de um alerta (pedido do Lucas, 2026-10-23): a organização registra que viu e
 * aceitou AQUELE alerta — "declarou Diamante; a Riot mostra Esmeralda", já validado — e ele
 * para de contar no ⚠ da lista de Inscritos e nos alertas do caixa. Antes não havia como
 * tirar a pendência: o alerta é calculado na leitura e voltava sempre.
 *
 * A ciência guarda a ASSINATURA do alerta que a organização leu: o texto e os fatos que o
 * disparam (`assinaturaDoAlerta`). Ela vale enquanto o alerta for o mesmo: outro nick, outro
 * elo, outro requisito fora de ok, outro estado ou outra data no pagamento = outra assinatura,
 * e o alerta volta a contar sozinho, sem ninguém precisar lembrar de desfazer. É o que impede
 * a ciência de "Declarou Ouro; a Riot mostra Diamante" de esconder, um mês depois, "Declarou
 * Ouro; a Riot mostra Mestre" — e a do «aprovado sem pagamento» combinado de esconder o
 * «pago» desfeito que volta a «aguardando» com o mesmo texto.
 */
export type CienciaDoAlerta = Readonly<{
  /** O texto do alerta no momento da ciência (o que a organização leu). */
  texto: string;
  /**
   * A assinatura no momento da ciência, quando ela vai além do texto (o alerta tem `fatos`).
   * Ausente = a assinatura é o próprio texto — e é assim que as ciências gravadas antes da
   * assinatura (só código + texto) são lidas: continuam valendo para o alerta cujo texto já
   * diz tudo, e deixam de valer, do lado seguro, para o que tem fatos fora do texto.
   */
  assinatura?: string;
  /** Quem deu ciência (o usuário do painel). */
  por: string;
  /** Quando (ISO). */
  em: string;
}>;

/**
 * A assinatura de um alerta: o texto e, quando há, os fatos que o texto não diz. É ela que a
 * ciência compara, letra por letra.
 */
export function assinaturaDoAlerta(alerta: Readonly<Pick<Alerta, "texto" | "fatos">>): string {
  return alerta.fatos ? `${alerta.texto}\n[${alerta.fatos}]` : alerta.texto;
}

/** A coluna `inscricoes.alertas_cientes`: código do alerta → ciência. */
export type AlertasCientes = Readonly<Partial<Record<CodigoDoAlerta, CienciaDoAlerta>>>;

/** O escopo que dar (ou desfazer) a ciência de um alerta exige. Do caixa: o financeiro. */
export function escopoDaCiencia(codigo: CodigoDoAlerta): "inscricoes:financeiro" | "inscricoes:conferir" {
  return ALERTAS_DO_CAIXA.has(codigo) ? "inscricoes:financeiro" : "inscricoes:conferir";
}

function ehObjetoSimples(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function ehCiencia(valor: unknown): valor is CienciaDoAlerta {
  return (
    ehObjetoSimples(valor) &&
    typeof valor.texto === "string" &&
    typeof valor.por === "string" &&
    typeof valor.em === "string"
  );
}

/**
 * A coluna como veio do banco, sem confiar no formato. Ausente (banco ainda sem a migração —
 * a leitura é `select *`), nula ou ilegível vira `{}`: nenhum alerta tem ciência, e o painel
 * se comporta como antes. Só entram códigos conhecidos com os três campos em texto.
 */
export function lerAlertasCientes(valor: unknown): AlertasCientes {
  if (!ehObjetoSimples(valor)) return {};
  const lidos: Partial<Record<CodigoDoAlerta, CienciaDoAlerta>> = {};
  for (const codigo of CODIGOS_DO_ALERTA) {
    // `Object.hasOwn`: um `{"constructor": …}` gravado não pode virar ciência pelo protótipo.
    if (!Object.hasOwn(valor, codigo)) continue;
    const ciencia = valor[codigo];
    if (!ehCiencia(ciencia)) continue;
    const assinatura = (ciencia as Record<string, unknown>).assinatura;
    lidos[codigo] = {
      texto: ciencia.texto,
      ...(typeof assinatura === "string" && { assinatura }),
      por: ciencia.por,
      em: ciencia.em,
    };
  }
  return lidos;
}

/**
 * A ciência que vale para ESTE alerta agora — mesmo código E mesma assinatura (texto e
 * fatos), letra por letra — ou nulo. É a regra inteira da ciência; a tela e a rota chamam
 * esta. Ciência antiga, sem assinatura, vale pelo texto: só cobre o alerta que não tem fatos
 * fora do texto (ver `CienciaDoAlerta.assinatura`).
 */
export function cienciaDoAlerta(
  alerta: Readonly<Pick<Alerta, "codigo" | "texto" | "fatos">>,
  cientes: unknown,
): CienciaDoAlerta | null {
  const ciencia = lerAlertasCientes(cientes)[alerta.codigo];
  if (!ciencia) return null;
  return (ciencia.assinatura ?? ciencia.texto) === assinaturaDoAlerta(alerta) ? ciencia : null;
}

/** O que o «Dar ciência» explica, na gaveta de Inscritos e nas Pendências do caixa. */
export const TITULO_DAR_CIENCIA =
  "Registra que a organização viu e aceitou este alerta. Se ele mudar — o texto, ou o que está por trás dele (o pagamento, o prazo, os requisitos) — volta a contar.";

/**
 * O corpo da ação `alerta_ciencia` (dar ciência) que a tela manda: o código, o texto que ela
 * mostra e, quando vai além do texto, a assinatura — o servidor recusa (409) se o alerta de
 * agora tiver outros fatos. A gaveta de Inscritos e as Pendências do caixa mandam ESTE.
 */
export function pedidoDeCiencia(
  inscricaoId: string,
  alerta: Readonly<Pick<Alerta, "codigo" | "texto" | "fatos">>,
): { inscricaoId: string; codigo: CodigoDoAlerta; texto: string; assinatura?: string } {
  const assinatura = assinaturaDoAlerta(alerta);
  return {
    inscricaoId,
    codigo: alerta.codigo,
    texto: alerta.texto,
    ...(assinatura !== alerta.texto && { assinatura }),
  };
}

/**
 * Separa os alertas que contam (sem ciência que valha) dos que a organização já aceitou.
 * A ordem de cada lista é a de `alertasDoInscrito`.
 */
export function separarPorCiencia(
  alertas: readonly Alerta[],
  cientes: unknown,
): { pendentes: Alerta[]; comCiencia: { alerta: Alerta; ciencia: CienciaDoAlerta }[] } {
  const lidos = lerAlertasCientes(cientes);
  const pendentes: Alerta[] = [];
  const comCiencia: { alerta: Alerta; ciencia: CienciaDoAlerta }[] = [];
  for (const alerta of alertas) {
    const ciencia = cienciaDoAlerta(alerta, lidos);
    if (ciencia) comCiencia.push({ alerta, ciencia });
    else pendentes.push(alerta);
  }
  return { pendentes, comCiencia };
}
