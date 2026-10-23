/**
 * Fila de reserva da 4ª Edição — quem é titular, quem espera e em que posição.
 *
 * Decisão do Lucas (2026-10-22, D1 a D5; vagas e «excluído» revistos em 23/10):
 *
 *  - **Ativos** = todo inscrito menos recusado, desistente e excluído (`estaFora`, a mesma
 *    regra de `contaParaTimes`).
 *  - **Titulares** = TODOS os organizadores + os primeiros não organizadores por ordem de
 *    inscrição (`criado_em`), até completar as vagas (`max_times × jogadores_por_time` — 40
 *    na 4ª Edição, 8 times de 5; nunca um número fixo).
 *  - **Fila de reserva** = o resto, na ordem de inscrição (posição 1, 2, 3…). Reserva só
 *    paga se for chamado.
 *  - A situação manual **"sobra"** continua aceita: quem está nela fica FORA dos titulares,
 *    mesmo sendo organizador (é a decisão explícita mais recente da organização). Ela entra
 *    na fila DEPOIS de quem pode ser chamado: ninguém é chamado de "sobra" sozinho, então
 *    contar quem está nela como "à frente" deixaria a posição dos outros parada para sempre.
 *
 * Função PURA e única, sem dependência de servidor nem de zod: o formulário, a Minha
 * inscrição, o painel e o draft chamam ESTA, e o SQL de alinhamento dos prazos
 * (supabase/dados-4a-fila-e-prazo.sql) reproduz a mesma ordem. Sem teto de times (`max_times`
 * nulo) não há vaga contada — todo ativo é titular e ninguém vai para a fila.
 */

import { estaFora } from "@/lib/inscricoes/pagamento";

export type InscritoDaFila = Readonly<{
  id: string;
  /** Ordem de inscrição. Ausente ou ilegível vai para o fim, sem derrubar ninguém. */
  criado_em?: string | null;
  situacao: string;
  organizador?: boolean | null;
}>;

export type LugarNaFila =
  | { tipo: "titular" }
  /** `manual` = está na fila por decisão da organização (situação "sobra"): não é chamado sozinho. */
  | { tipo: "reserva"; posicao: number; manual: boolean }
  /** Recusado, desistente, excluído ou desconhecido: fora da conta. */
  | { tipo: "fora" };

export type Fila = {
  /** `max_times × jogadores_por_time`; nulo = sem teto, todo ativo é titular. */
  vagas: number | null;
  /** Ids dos titulares, na ordem de inscrição (organizadores no meio, pela data deles). */
  titulares: string[];
  /** Ids da fila de reserva, na ordem em que são chamados (posição = índice + 1). */
  reservas: string[];
  /** Lugar de cada inscrito recebido, inclusive os de fora. */
  lugar: Record<string, LugarNaFila>;
};

/** As vagas de titular da edição, ou nulo quando não há teto de times. */
export function vagasDaEdicao(config: Readonly<{ max_times?: number | null; jogadores_por_time?: number | null }>): number | null {
  const times = config.max_times;
  const porTime = config.jogadores_por_time;
  if (typeof times !== "number" || !Number.isInteger(times) || times <= 0) return null;
  if (typeof porTime !== "number" || !Number.isInteger(porTime) || porTime <= 0) return null;
  return times * porTime;
}

/**
 * Ordem de inscrição. `Date.parse` primeiro (a mesma hora escrita com outro fuso é a mesma);
 * no empate do milissegundo, o texto (o Postgres manda microssegundos); por fim o id, como
 * o `order by criado_em, id` do SQL — comparação por código, que é a ordem do uuid.
 */
function porOrdemDeInscricao(a: InscritoDaFila, b: InscritoDaFila): number {
  const ma = a.criado_em ? Date.parse(a.criado_em) : NaN;
  const mb = b.criado_em ? Date.parse(b.criado_em) : NaN;
  const va = Number.isFinite(ma) ? ma : Number.POSITIVE_INFINITY;
  const vb = Number.isFinite(mb) ? mb : Number.POSITIVE_INFINITY;
  if (va !== vb) return va < vb ? -1 : 1;
  const ta = a.criado_em ?? "";
  const tb = b.criado_em ?? "";
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.id === b.id ? 0 : a.id < b.id ? -1 : 1;
}

export function montarFila(
  inscritos: readonly InscritoDaFila[],
  config: Readonly<{ max_times?: number | null; jogadores_por_time?: number | null }>,
): Fila {
  const vagas = vagasDaEdicao(config);
  const ativos = inscritos.filter((i) => !estaFora(i.situacao)).sort(porOrdemDeInscricao);
  const sobra = ativos.filter((i) => i.situacao === "sobra");
  const organizadores = ativos.filter((i) => i.situacao !== "sobra" && i.organizador === true);
  const candidatos = ativos.filter((i) => i.situacao !== "sobra" && i.organizador !== true);

  // Organizadores primeiro na CONTA das vagas (todos entram), e os demais pela ordem.
  const livres = vagas === null ? candidatos.length : Math.max(0, vagas - organizadores.length);
  const entram = new Set([...organizadores, ...candidatos.slice(0, livres)].map((i) => i.id));
  const titulares = ativos.filter((i) => entram.has(i.id)).map((i) => i.id);
  const reservas = [...candidatos.slice(livres), ...sobra].map((i) => i.id);

  const lugar: Record<string, LugarNaFila> = {};
  for (const i of inscritos) lugar[i.id] = { tipo: "fora" };
  for (const id of titulares) lugar[id] = { tipo: "titular" };
  const manuais = new Set(sobra.map((i) => i.id));
  reservas.forEach((id, indice) => {
    lugar[id] = { tipo: "reserva", posicao: indice + 1, manual: manuais.has(id) };
  });

  return { vagas, titulares, reservas, lugar };
}

/** O lugar de um inscrito; quem não está na fila montada é "fora". */
export function lugarNaFila(fila: Fila, id: string): LugarNaFila {
  return Object.hasOwn(fila.lugar, id) ? fila.lugar[id]! : { tipo: "fora" };
}

/**
 * Onde cairia uma inscrição enviada AGORA (é sempre a mais nova, e nunca organizadora nem
 * "sobra" ao nascer). É a previsão do formulário; o lugar de verdade sai depois do envio.
 */
export function previsaoParaNovaInscricao(fila: Fila): { tipo: "titular" } | { tipo: "reserva"; posicao: number } {
  if (fila.vagas === null || fila.titulares.length < fila.vagas) return { tipo: "titular" };
  const chamaveis = fila.reservas.filter((id) => {
    const l = fila.lugar[id];
    return l?.tipo === "reserva" && !l.manual;
  }).length;
  return { tipo: "reserva", posicao: chamaveis + 1 };
}

export const HORAS_DO_CHAMADO = 48;

/**
 * O prazo de pagamento de quem vira titular agora (D3 e D4).
 *
 *  - Com `prazo_pagamento_ate` (31/10 23:59:59 de Brasília na 4ª) ainda no futuro: ele.
 *  - Com ele já vencido: agora + 48 horas — o reserva chamado em 02/11 não nasce atrasado.
 *  - Sem ele (nulo = comportamento antigo): agora + `prazo_pagamento_dias`.
 *
 * O gatilho `abrir_pendencias_da_inscricao` aplica a MESMA regra a quem se inscreve já como
 * titular.
 */
export function prazoDoChamado(
  config: Readonly<{ prazo_pagamento_ate?: string | null; prazo_pagamento_dias?: number | null }>,
  agoraMs: number = Date.now(),
): string {
  const ate = config.prazo_pagamento_ate ? Date.parse(config.prazo_pagamento_ate) : NaN;
  if (Number.isFinite(ate)) {
    return new Date(ate > agoraMs ? ate : agoraMs + HORAS_DO_CHAMADO * 3_600_000).toISOString();
  }
  const dias =
    typeof config.prazo_pagamento_dias === "number" && config.prazo_pagamento_dias > 0 ? config.prazo_pagamento_dias : 14;
  return new Date(agoraMs + dias * 86_400_000).toISOString();
}

/**
 * O que o aviso de prazo do FORMULÁRIO diz a quem vai virar titular (D3/D4): a data única da
 * edição enquanto ela vale; depois dela, as 48 horas contadas do ENVIO (uma hora exata
 * calculada quando a página abre não seria a do envio). Sem data, nada: o aviso antigo em dias.
 */
export function prazoDoAvisoDoFormulario(
  config: Readonly<{ prazo_pagamento_ate?: string | null }> | null,
  agoraMs: number = Date.now(),
): { ate: string | null; horas: number | null } {
  const ate = config?.prazo_pagamento_ate ?? null;
  const ateMs = ate ? Date.parse(ate) : NaN;
  if (!Number.isFinite(ateMs)) return { ate: null, horas: null };
  return ateMs > agoraMs ? { ate, horas: null } : { ate: null, horas: HORAS_DO_CHAMADO };
}

/** Estados de pagamento que ainda são cobrança em aberto (D6). */
export const ESTADOS_PENDENTES: readonly string[] = ["aguardando", "declarado"];

/**
 * Por que este titular NÃO pode perder a vaga por falta de pagamento agora — ou `null`
 * quando pode (D5). A mesma regra no painel (que mostra o botão) e no servidor (que grava).
 *
 * "Declarado" não perde a vaga: o jogador disse que pagou, e alguém tem de abrir o extrato
 * antes (declarado ≠ pago). Organizador nunca perde por isso — é isento.
 */
export function motivoParaManterAVaga(
  args: Readonly<{
    lugar: LugarNaFila;
    organizador: boolean;
    situacao: string;
    pagamento: Readonly<{ estado: string; vence_em: string | null }> | null;
  }>,
  agoraMs: number,
): string | null {
  if (estaFora(args.situacao)) return "Esta inscrição já está fora (recusada, desistente ou excluída).";
  if (args.organizador) return "Organizador não perde a vaga por falta de pagamento — é isento.";
  if (args.lugar.tipo !== "titular") return "Só titular perde a vaga por falta de pagamento; quem está na fila não paga.";
  const pagamento = args.pagamento;
  if (!pagamento) return "Inscrição sem linha de pagamento.";
  if (pagamento.estado === "declarado") {
    return "O jogador declarou o pagamento: confira o extrato antes (declarado não é pago).";
  }
  if (pagamento.estado !== "aguardando") return "O pagamento não está em aberto.";
  const vence = pagamento.vence_em ? Date.parse(pagamento.vence_em) : NaN;
  if (!Number.isFinite(vence)) return "Pagamento sem prazo.";
  if (vence > agoraMs) return "O prazo de pagamento ainda não venceu.";
  return null;
}

/** Titular que perdeu o prazo de pagamento (D5): o painel oferece passar a vaga. */
export function perdeuOPrazo(args: Parameters<typeof motivoParaManterAVaga>[0], agoraMs: number): boolean {
  return motivoParaManterAVaga(args, agoraMs) === null;
}

/**
 * Reserva com dinheiro registrado (pago ou declarado): se não for chamado até o fim, a
 * organização devolve (D2). O caixa separa esse valor do prêmio.
 */
export function reservaADevolverSeNaoJogar(lugar: LugarNaFila, estadoDoPagamento: string | null | undefined): boolean {
  return lugar.tipo === "reserva" && (estadoDoPagamento === "pago" || estadoDoPagamento === "declarado");
}
