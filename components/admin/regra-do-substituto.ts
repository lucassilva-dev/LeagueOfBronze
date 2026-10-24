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
 * Quem não tem preço — o capitão sem preço (23/10/2026) e o time definido pela organização
 * (24/10/2026), que não passou pelo draft — não tem valor para comparar: a troca dele é decisão
 * da organização, e o aviso pede a conferência à mão. Para isso a leitura do draft traz os
 * capitães e o elenco do time definido junto com os preços (`tabelaDoSorteioDoDraft`).
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

/**
 * O que a regra 6 precisa do draft sorteado: o retrato da tabela, o preço de cada um e quem
 * não tem preço — os capitães (com o capitão sem preço) e o elenco do time definido pela
 * organização, todos pelo Riot ID.
 */
export type TabelaDoSorteio = {
  retrato: RetratoDaTabela;
  pontos: ReadonlyMap<string, number>;
  capitaes: ReadonlySet<string>;
  capitaoGratis: boolean;
  timeDefinido: ReadonlySet<string>;
};

/**
 * A tabela do sorteio tirada da visão pública do draft — a mesma leitura na aba Times e vagas
 * e no painel de séries, para as duas compararem o substituto pelos mesmos preços. Nula sem a
 * tabela (draft montado antes dela). Draft montado antes do time definido não tem time com
 * `definido`: o conjunto sai vazio, e tudo segue como antes.
 */
export function tabelaDoSorteioDoDraft(draft: DraftPublico): TabelaDoSorteio | null {
  if (!draft.tabelaDePontos) return null;
  const elencos = Object.values(draft.elencos ?? {}).flat();
  const pontos = new Map<string, number>();
  for (const jogador of [...elencos, ...(draft.disponiveis ?? [])]) pontos.set(jogador.riotId, jogador.pontos);
  const timeDefinido = new Set<string>();
  for (const time of draft.times ?? []) {
    if (time.definido !== true) continue;
    for (const jogador of draft.elencos?.[time.id] ?? []) timeDefinido.add(jogador.riotId);
  }
  return {
    retrato: draft.tabelaDePontos,
    pontos,
    capitaes: new Set(elencos.filter((j) => j.capitao).map((j) => j.riotId)),
    capitaoGratis: draft.capitaoGratis === true,
    timeDefinido,
  };
}

/** A tabela do draft sorteado; nula sem draft ou sem a tabela (draft antigo). */
async function lerTabelaDoSorteio(): Promise<TabelaDoSorteio | null> {
  try {
    const resposta = await fetch("/api/draft/estado", { cache: "no-store" });
    if (!resposta.ok) return null;
    const corpo = (await resposta.json().catch(() => ({}))) as { draft?: DraftPublico | null };
    return corpo.draft ? tabelaDoSorteioDoDraft(corpo.draft) : null;
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

  // As inscrições vêm inteiras (`select *`): a marca do time definido (`time_definido`) e a de
  // capitão chegam à prévia junto com o resto — a mesma conta da aba Times e vagas.
  const sorteio = await lerTabelaDoSorteio();
  const precos = sorteio
    ? precosDoSorteio({
        retrato: sorteio.retrato,
        pontosDoDraft: sorteio.pontos,
        inscritos,
        capitaesDoDraft: sorteio.capitaes,
        capitaoGratis: sorteio.capitaoGratis,
        timeDefinidoDoDraft: sorteio.timeDefinido,
      })
    : previaDosPrecos({
        inscritos,
        jogadoresPorTime: config.jogadores_por_time,
        orcamentoPorTime: config.orcamento_por_time,
        maxTimes: config.max_times ?? null,
        capitaoComPreco: config.capitao_com_preco ?? null,
      });
  return regraDoSubstitutoPelosPrecos(precos, inscritos);
}
