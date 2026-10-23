"use client";

import { useEffect, useState } from "react";

import type { EdicaoConfig, Inscrito } from "@/components/admin/e4/painel-edicao";
import type { RetratoDaTabela } from "@/lib/draft/precos";
import { precosDoSorteio, previaDosPrecos } from "@/lib/draft/previa-de-precos";
import type { DraftPublico } from "@/lib/draft/store";
import { regraDoSubstitutoPelosPrecos, type RegraDoSubstituto } from "@/lib/roster";

/**
 * A regra 6 ("o substituto vale pontos iguais ou menores que o titular substituído") no
 * painel de SÉRIES, com os MESMOS preços da aba Times e vagas: a tabela do sorteio depois do
 * draft, a prévia antes dele (ver `regraDoSubstitutoPelosPrecos`, lib/roster.ts).
 *
 * O dataset do campeonato não tem preço — o preço é da inscrição. Então o painel de séries lê
 * as inscrições (/api/admin/edicao, que exige conferir OU financeiro) e o retrato da tabela
 * do sorteio (/api/draft/estado, público). Os pontos ficam no painel: não vão para o rascunho
 * nem para página nenhuma do jogador.
 *
 * Devolve:
 *  - `undefined` enquanto lê (ou quando `ativo` é falso): o painel não diz nada;
 *  - `null` quando não deu para montar (sem permissão, sem rede): o painel avisa que a regra
 *    6 tem de ser conferida à mão;
 *  - a regra, quando leu.
 *
 * Só AVISA — nada aqui bloqueia o salvamento, e o servidor não recusa substituto nenhum.
 */
export function useRegraDoSubstituto(ativo: boolean): RegraDoSubstituto | null | undefined {
  const [regra, setRegra] = useState<RegraDoSubstituto | null | undefined>(undefined);

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    void (async () => {
      const montada = await lerRegraDoSubstituto();
      if (vivo) setRegra(montada);
    })();
    return () => {
      vivo = false;
    };
  }, [ativo]);

  // Desligada, não vale o que foi lido antes (a permissão pode ter mudado).
  return ativo ? regra : undefined;
}

type CorpoDaEdicao = { config?: EdicaoConfig; inscritos?: Inscrito[] };

/** O retrato e o preço de cada um no draft sorteado; nulo sem draft ou sem a tabela (draft antigo). */
async function lerTabelaDoSorteio(): Promise<{ retrato: RetratoDaTabela; pontos: Map<string, number> } | null> {
  try {
    const resposta = await fetch("/api/draft/estado", { cache: "no-store" });
    if (!resposta.ok) return null;
    const corpo = (await resposta.json().catch(() => ({}))) as { draft?: DraftPublico | null };
    const draft = corpo.draft;
    if (!draft?.tabelaDePontos) return null;
    const pontos = new Map<string, number>();
    for (const jogador of [...Object.values(draft.elencos ?? {}).flat(), ...(draft.disponiveis ?? [])]) {
      pontos.set(jogador.riotId, jogador.pontos);
    }
    return { retrato: draft.tabelaDePontos, pontos };
  } catch {
    // Sem draft legível: vale a prévia, como antes do sorteio.
    return null;
  }
}

/** Monta a regra lendo as duas rotas. Nulo quando as inscrições não vêm (sem permissão ou sem rede). */
export async function lerRegraDoSubstituto(): Promise<RegraDoSubstituto | null> {
  let corpo: CorpoDaEdicao;
  try {
    const resposta = await fetch("/api/admin/edicao", { cache: "no-store" });
    if (!resposta.ok) return null;
    corpo = (await resposta.json().catch(() => ({}))) as CorpoDaEdicao;
  } catch {
    return null;
  }
  const { config, inscritos } = corpo;
  if (!config || !Array.isArray(inscritos)) return null;

  const sorteio = await lerTabelaDoSorteio();
  const precos = sorteio
    ? precosDoSorteio({ retrato: sorteio.retrato, pontosDoDraft: sorteio.pontos, inscritos })
    : previaDosPrecos({
        inscritos,
        jogadoresPorTime: config.jogadores_por_time,
        orcamentoPorTime: config.orcamento_por_time,
        maxTimes: config.max_times ?? null,
      });
  return regraDoSubstitutoPelosPrecos(precos, inscritos);
}
