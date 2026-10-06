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
  riot_id: string;
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
}): Alerta[] {
  const { inscrito: i, conferencias, pagamento, config, agoraMs } = args;
  const alertas: Alerta[] = [];
  const fora = i.situacao === "recusado" || i.situacao === "desistiu";

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
  if (i.organizador && !fora && (estado === "aguardando" || estado === "declarado")) {
    alertas.push({
      codigo: "organizador_cobrado",
      texto: "Organizador desta edição sendo cobrado — organizadores não pagam.",
      acaoPagamento: "isento",
    });
  }
  if (i.situacao === "recusado" && estado === "pago") {
    alertas.push({
      codigo: "recusado_pago",
      texto: "Recusado com pagamento recebido — o valor precisa ser devolvido.",
      acaoPagamento: "estorno_devido",
    });
  }
  if (i.situacao === "recusado" && estado === "declarado") {
    alertas.push({
      codigo: "recusado_declarado",
      texto: "Recusado, mas disse que pagou — confira o extrato antes de devolver.",
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
