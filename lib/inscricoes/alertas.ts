import { pontosDoElo } from "@/lib/inscricoes/schema";
import { requisitosCumpridos } from "@/lib/inscricoes/situacao";
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

export type CodigoDoAlerta =
  | "nick_trocado"
  | "riot_id_inexistente"
  | "outro_servidor"
  | "sem_ranque_solo"
  | "erro_riot"
  | "elo_travado_diverge"
  | "declarou_diferente"
  | "apto_com_requisito"
  | "e_abaixo_do_minimo"
  | "mesma_conta"
  | "apto_sem_pagamento"
  | "organizador_cobrado"
  | "recusado_pago"
  | "recusado_declarado"
  | "desistiu_com_pagamento";

export type Alerta = {
  codigo: CodigoDoAlerta;
  texto: string;
  /** Botão de um clique no caixa (escopo financeiro). */
  acaoPagamento?: "isento" | "estorno_devido";
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

export function alertasDoInscrito(args: {
  inscrito: InscritoParaAlerta;
  conferencias: readonly { item: string; estado: string; conferido_por?: string | null }[];
  pagamento: { estado: string } | null;
  config: { inicio_campeonato: string | null; min_ranqueadas: number };
  agoraMs: number;
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
  if ((i.situacao === "apto" || i.situacao === "sobra") && !requisitosCumpridos(conferencias, config.inicio_campeonato, agoraMs)) {
    alertas.push({
      codigo: "apto_com_requisito",
      texto: "Está aprovado, mas há requisito fora de ok/exceção. Confira e ajuste a situação.",
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
  const estado = pagamento?.estado;
  // O sistema só PROMOVE: se o pagamento voltou atrás depois da promoção (o «pago» foi na
  // linha errada), ou se alguém marcou apto à mão sem pagamento, a pessoa continuava apta e
  // entrava no sorteio do draft sem nada na tela apontar. Organizador não paga — o caso dele
  // é o «organizador_cobrado».
  if ((i.situacao === "apto" || i.situacao === "sobra") && !i.organizador && estado !== "pago" && estado !== "isento") {
    alertas.push({
      codigo: "apto_sem_pagamento",
      texto: "Aprovado sem pagamento confirmado (regra 22) — confira o caixa ou ajuste a situação.",
    });
  }
  if (i.organizador && !fora && (estado === "aguardando" || estado === "declarado")) {
    alertas.push({
      codigo: "organizador_cobrado",
      texto: "Organizador desta edição sendo cobrado — organizadores não pagam.",
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
      acaoPagamento: "estorno_devido",
    });
  }
  if (recusadoOuExcluido && estado === "declarado") {
    alertas.push({
      codigo: "recusado_declarado",
      texto: `${recusadoOuExcluido}, mas disse que pagou — confira o extrato antes de devolver.`,
    });
  }
  if (i.situacao === "desistiu" && (estado === "pago" || estado === "declarado")) {
    alertas.push({
      codigo: "desistiu_com_pagamento",
      texto: "Desistiu com pagamento — o regulamento não define reembolso; decidam e registrem.",
    });
  }

  return alertas;
}
