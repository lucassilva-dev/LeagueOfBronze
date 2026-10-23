"use client";

import { useMemo, useState } from "react";

import type { DadosEdicao, Inscrito } from "@/components/admin/e4/painel-edicao";
import { Button, C, Chip } from "@/components/admin/ui";
import { lugarNaFila, montarFila, type Fila, type LugarNaFila } from "@/lib/inscricoes/fila";
import { dataDoPrazo } from "@/lib/inscricoes/pagamento";

/**
 * A fila de reserva da 4ª (decisões D1 a D5, 2026-10-22) nas abas do painel.
 *
 * A fila é UMA função pura (`montarFila`, lib/inscricoes/fila.ts): titulares = todos os
 * organizadores + os primeiros por ordem de inscrição até completar `max_times ×
 * jogadores_por_time`; o resto espera na ordem de inscrição, e quem está em «sobra» vai para o
 * fim (não é chamado sozinho). O servidor manda a fila pronta no GET; sem ela (servidor de
 * antes da fila, testes), a tela monta a MESMA com a mesma função — nunca uma conta própria.
 *
 * O que mora aqui é o que as abas Inscritos, Pagamentos e Times e vagas dividem: o lugar de
 * cada um, o chip que o mostra, o 1º da fila, o botão «Passar a vaga ao 1º da fila» e a
 * previsão de quem entra e quem desce quando a situação de alguém muda (`preverFila`).
 */

/** A fila da edição: a do servidor, ou a mesma conta sobre os mesmos dados. */
export function useFila(dados: Pick<DadosEdicao, "fila" | "inscritos" | "config">): Fila {
  const { fila, inscritos, config } = dados;
  return useMemo(() => fila ?? montarFila(inscritos, config), [fila, inscritos, config]);
}

/** A fila só existe com teto de vagas: sem `max_times`, todo ativo é titular e não há o que mostrar. */
export function temFila(fila: Fila): boolean {
  return fila.vagas !== null;
}

/**
 * O 1º da fila que pode ser chamado — quem vira titular quando alguém sair da vaga. Quem está
 * em «sobra» fica no fim e não conta: ninguém é chamado de «sobra» sozinho.
 */
export function primeiroDaFila(fila: Fila): string | null {
  return (
    fila.reservas.find((id) => {
      const lugar = fila.lugar[id];
      return lugar?.tipo === "reserva" && !lugar.manual;
    }) ?? null
  );
}

/** "titular", "fila de reserva, nº 3", "fim da fila (sobra)" ou "fora". */
export function textoDoLugar(lugar: LugarNaFila): string {
  if (lugar.tipo === "titular") return "titular";
  if (lugar.tipo === "reserva") return lugar.manual ? "fim da fila (sobra)" : `fila de reserva, nº ${lugar.posicao}`;
  return "fora";
}

const DICA_TITULAR = "Dentro das vagas da edição: paga até o prazo e entra no draft.";
const DICA_RESERVA = "Fila de reserva, na ordem de inscrição: só paga se for chamado.";
const DICA_SOBRA = "Marcado como sobra pela organização: fica no fim da fila e não é chamado sozinho.";

/** O lugar em chip. Fora da conta (recusado, desistente, excluído) não mostra nada. */
export function ChipDoLugar({ lugar }: Readonly<{ lugar: LugarNaFila }>) {
  if (lugar.tipo === "titular") {
    return (
      <Chip tone="ok" title={DICA_TITULAR}>
        titular
      </Chip>
    );
  }
  if (lugar.tipo === "reserva") {
    return lugar.manual ? (
      <Chip tone="warn" title={DICA_SOBRA}>
        fila · sobra
      </Chip>
    ) : (
      <Chip tone="warn" title={DICA_RESERVA}>
        fila nº {lugar.posicao}
      </Chip>
    );
  }
  return null;
}

/** "Fulano#BR1", para as frases de confirmação. */
export function nomeDe(inscrito: Pick<Inscrito, "nick" | "tag">): string {
  return `${inscrito.nick}#${inscrito.tag}`;
}

// ---------------------------------------------------------------- previsão de uma mudança

/** O que muda na fila se a situação/organizador de UM inscrito mudar (ver `preverFila`). */
export type PrevisaoDaFila = Readonly<{
  antes: LugarNaFila;
  depois: LugarNaFila;
  /**
   * Entra nas vagas porque, depois da mudança, é organizador fora da «sobra» — e organizador
   * sempre é titular (D1). Não é a ordem de inscrição que o põe lá.
   */
  porSerOrganizador: boolean;
  /** Quem vira titular por causa desta mudança — é chamado e ganha prazo (D4). */
  entram: readonly Inscrito[];
  /** Quem deixa de ser titular por causa dela — desce para a fila e perde o prazo (D2). */
  saem: readonly Inscrito[];
}>;

/**
 * A fila depois de mudar a situação/organizador de UM inscrito, comparada com a de agora — a
 * mesma função pura do servidor (`montarFila`), que refaz a fila na mesma ação que grava (D4).
 * É o que deixa a tela dizer ANTES de gravar quem é chamado e quem desce.
 */
export function preverFila(
  inscritos: readonly Inscrito[],
  config: Readonly<{ max_times?: number | null; jogadores_por_time?: number | null }>,
  id: string,
  mudanca: Readonly<{ situacao: Inscrito["situacao"]; organizador: boolean }>,
): PrevisaoDaFila {
  const antes = montarFila(inscritos, config);
  const depois = montarFila(
    inscritos.map((i) => (i.id === id ? { ...i, ...mudanca } : i)),
    config,
  );
  const porId = new Map(inscritos.map((i) => [i.id, i]));
  const eraTitular = new Set(antes.titulares);
  const seraTitular = new Set(depois.titulares);
  const pegar = (ids: readonly string[]) => ids.flatMap((x) => porId.get(x) ?? []);
  const lugarDepois = lugarNaFila(depois, id);
  return {
    antes: lugarNaFila(antes, id),
    depois: lugarDepois,
    porSerOrganizador: lugarDepois.tipo === "titular" && mudanca.organizador && mudanca.situacao !== "sobra",
    entram: pegar(depois.titulares.filter((x) => x !== id && !eraTitular.has(x))),
    saem: pegar(antes.titulares.filter((x) => x !== id && !seraTitular.has(x))),
  };
}

/** "Fulano#BR1", "Fulano#BR1 e Ciclano#BR1", "A#BR1, B#BR1 e C#BR1". */
export function listaDeNomes(lista: readonly Pick<Inscrito, "nick" | "tag">[]): string {
  const nomes = lista.map(nomeDe);
  return nomes.length <= 1 ? (nomes[0] ?? "") : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
}

/**
 * A frase do que o servidor vai fazer com a fila na MESMA ação que grava (D4) — quem sai das
 * vagas, quem é chamado, quem desce. Nulo quando a fila não muda. `gatilho` é o começo da frase
 * ("Ao salvar" na gaveta, "Ao voltar para apto" em Times e vagas).
 */
export function textoDaPrevisao(
  previsao: PrevisaoDaFila | null,
  inscrito: Pick<Inscrito, "nick" | "tag">,
  gatilho = "Ao salvar",
): string | null {
  if (!previsao) return null;
  const { antes, depois, entram, saem } = previsao;
  const quem = nomeDe(inscrito);
  const partes: string[] = [];

  if (antes.tipo === "titular" && depois.tipo !== "titular") {
    partes.push(
      depois.tipo === "reserva"
        ? `${gatilho}, ${quem} sai das vagas e vai para a fila de reserva (${textoDoLugar(depois)}).`
        : `${gatilho}, ${quem} sai das vagas.`,
    );
  } else if (antes.tipo !== "titular" && depois.tipo === "titular") {
    partes.push(
      previsao.porSerOrganizador
        ? `${gatilho}, ${quem} entra nas vagas: organizador sempre é titular.`
        : `${gatilho}, ${quem} entra nas vagas, pela ordem de inscrição.`,
    );
  } else if (antes.tipo !== "reserva" && depois.tipo === "reserva") {
    partes.push(`${gatilho}, ${quem} entra na fila de reserva (${textoDoLugar(depois)}) — só paga se for chamado.`);
  }

  if (entram.length > 0) {
    partes.push(
      `${listaDeNomes(entram)} ${entram.length === 1 ? "é chamado" : "são chamados"} da fila na mesma hora e ${
        entram.length === 1 ? "passa" : "passam"
      } a ter prazo de pagamento.`,
    );
  } else if (antes.tipo === "titular" && depois.tipo !== "titular") {
    partes.push("Ninguém na fila para chamar agora: a vaga fica aberta.");
  }
  if (saem.length > 0) {
    partes.push(
      `${listaDeNomes(saem)} ${saem.length === 1 ? "desce" : "descem"} para a fila de reserva — sem prazo de pagamento enquanto não for chamado.`,
    );
  }
  return partes.length > 0 ? partes.join(" ") : null;
}

/** O prazo único dos titulares escrito ("31/10/2026"), no fuso de Brasília; nulo sem ele. */
export function prazoUnicoEscrito(config: Readonly<{ prazo_pagamento_ate?: string | null }>): string | null {
  return config.prazo_pagamento_ate ? dataDoPrazo(config.prazo_pagamento_ate, "pt-BR") : null;
}

/**
 * «Passar a vaga ao 1º da fila» (D5) — em dois passos, como abrir as inscrições: tirar alguém
 * do campeonato é decisão, e o clique por reflexo não pode bastar.
 *
 * O botão só aparece para o titular que perdeu o prazo (`perdeuOPrazo`, a mesma regra do
 * servidor), e o servidor confere tudo de novo antes de gravar. Quem chama decide o que fazer
 * com o resultado: a linha some da lista quando dá certo (a pessoa virou desistente), então a
 * mensagem mora em quem a desenhou.
 */
export function PassarAVaga({
  nome,
  proximo,
  onPassar,
  desabilitado,
  motivo,
  largo = false,
}: Readonly<{
  /** Quem perde a vaga ("Fulano#BR1"). */
  nome: string;
  /** Quem é chamado ("Ciclano#BR1"); nulo = ninguém na fila para chamar. */
  proximo: string | null;
  onPassar: () => Promise<boolean>;
  desabilitado: boolean;
  /** Por que está desabilitado (sem escopo, rascunho aberto…). */
  motivo?: string;
  /** No celular: botões na largura toda, um embaixo do outro. */
  largo?: boolean;
}>) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <Button
        small={!largo}
        fullWidth={largo}
        tone="danger"
        disabled={desabilitado}
        title={motivo ?? "Pede confirmação antes de gravar."}
        onClick={() => setConfirmando(true)}
      >
        Passar a vaga ao 1º da fila
      </Button>
    );
  }

  const confirmar = async () => {
    const ok = await onPassar();
    if (ok) setConfirmando(false);
  };

  return (
    <div role="group" aria-label={`Confirmar: passar a vaga de ${nome}`} style={{ display: "grid", gap: 8 }}>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: C.warnSoft }}>
        <b style={{ color: C.ink }}>{nome}</b> perde a vaga por falta de pagamento: vira «Desistiu», com auditoria, e o
        pagamento dele não é tocado.{" "}
        {proximo ? (
          <>
            <b style={{ color: C.ink }}>{proximo}</b>, 1º da fila, é chamado na mesma hora e passa a ter prazo de
            pagamento.
          </>
        ) : (
          "Ninguém na fila para chamar agora: a vaga fica aberta."
        )}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexDirection: largo ? "column" : "row" }}>
        <Button
          small={!largo}
          fullWidth={largo}
          tone="danger"
          disabled={desabilitado}
          title={motivo}
          onClick={() => void confirmar()}
        >
          Confirmar: passar a vaga
        </Button>
        <Button small={!largo} fullWidth={largo} onClick={() => setConfirmando(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
