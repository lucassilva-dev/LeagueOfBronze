"use client";

import { useCallback, useEffect, useState } from "react";

import { Banner, Button, C, SectionHead } from "@/components/admin/ui";
import type { EstadoPagamento, ItemConferencia } from "@/lib/inscricoes/schema";

/**
 * Contêiner das seções da 4ª Edição.
 *
 * Segue o padrão do AdminUsersPanel, e não o do resto do painel: estes dados NÃO
 * vivem no rascunho JSONB do campeonato. O rascunho tem uma trava de concorrência
 * global (`lastUpdatedISO`), e inscrição tem escrita concorrente — dois organizadores
 * conferindo itens diferentes do mesmo inscrito colidiriam sem motivo. Aqui cada ação
 * é um PATCH que toca uma linha e um campo.
 *
 * Uma busca por troca de aba, de propósito: são ~50 linhas, e com duas pessoas
 * trabalhando ao mesmo tempo dado velho é pior do que uma requisição a mais.
 */

// ---------------------------------------------------------------- tipos do payload

export type EdicaoConfig = {
  nome: string;
  abertura_inscricoes: string | null;
  fechamento_inscricoes: string | null;
  prazo_vinculo_riot: string | null;
  congelamento_elo: string | null;
  data_draft: string | null;
  inicio_campeonato: string | null;
  inscricoes_abertas: boolean;
  jogadores_por_time: number;
  orcamento_por_time: number;
  min_ranqueadas: number;
  dias_no_grupo: number;
  prazo_pagamento_dias: number;
  segundos_por_escolha: number;
  taxa_centavos: number;
  pct_campeao: number;
  chave_pix: string | null;
  responsavel_financeiro: string | null;
};

export type Inscrito = {
  id: string;
  criado_em: string;
  nick: string;
  tag: string;
  riot_id: string;
  nome_real: string | null;
  email: string;
  discord: string;
  whatsapp: string | null;
  elo_declarado: string;
  elo_verificado: string | null;
  elo_congelado: string | null;
  pontos: number;
  rota_primaria: string;
  rota_secundaria: string;
  /** Turnos (`manha`, `tarde`, `noite`). Pode vir vazio — e de banco antigo, sem a coluna. */
  disponibilidade?: string[] | null;
  quer_capitao: boolean;
  entrou_no_grupo: string | null;
  situacao: "pendente" | "apto" | "recusado" | "desistiu" | "sobra";
  organizador: boolean;
  observacao: string | null;
};

export type Conferencia = {
  inscricao_id: string;
  item: ItemConferencia;
  estado: string;
  observacao: string | null;
  conferido_por: string | null;
  conferido_em: string | null;
};

export type Pagamento = {
  inscricao_id: string;
  estado: EstadoPagamento;
  valor_centavos: number;
  declarado_em: string | null;
  conferido_por: string | null;
  conferido_em: string | null;
  vence_em: string | null;
  /** Espelha `Pagamento` em lib/inscricoes/store.ts — os dois têm de andar juntos. */
  observacao: string | null;
};

export type Caixa = {
  recebido: number;
  estornado: number;
  aDevolver: number;
  emCaixa: number;
  arrecadado: number;
  aReceber: number;
  isento: number;
};

export type Panorama = {
  inscritos: number;
  /** Quem entra na conta de times e vagas: todo inscrito menos recusado e desistente. */
  elegiveis: number;
  aprovados: number;
  pendentes: number;
  recusados: number;
  times: number;
  vagas: number;
  sobra: number;
  caixa: Caixa;
};

export type Auditoria = {
  id: number;
  ocorrido_em: string;
  inscricao_id: string | null;
  autor: string;
  acao: string;
  detalhe: unknown;
};

export type DadosEdicao = {
  config: EdicaoConfig;
  inscritos: Inscrito[];
  conferencias: Conferencia[];
  pagamentos: Pagamento[];
  panorama: Panorama;
  auditoria: Auditoria[];
};

export type AcaoEdicao = "config" | "conferencia" | "ficha" | "inscrito" | "pagamento" | "congelar";

/** O que toda seção recebe. */
export type PropsSecao = Readonly<{
  dados: DadosEdicao;
  executar: (acao: AcaoEdicao, dados?: unknown) => Promise<boolean>;
  ocupado: boolean;
  podeConferir: boolean;
  podeFinanceiro: boolean;
  podeConfigurar: boolean;
  /**
   * O motivo da última ação que falhou (nulo se a última deu certo). O aviso normal sai no
   * topo da página, e quem salva de dentro da gaveta do inscrito não o enxerga — a gaveta
   * cobre a tela. Opcional porque só ela lê.
   */
  ultimoErro?: string | null;
}>;

// ---------------------------------------------------------------- contêiner

export type SecaoEdicao = "config" | "inscritos" | "pagamentos" | "times";

type Props = Readonly<{
  secao: SecaoEdicao;
  onAlert: (kind: "ok" | "erro", text: string) => void;
  podeConferir: boolean;
  podeFinanceiro: boolean;
  podeConfigurar: boolean;
  render: (props: PropsSecao) => React.ReactNode;
}>;

export function PainelEdicao({
  secao,
  onAlert,
  podeConferir,
  podeFinanceiro,
  podeConfigurar,
  render,
}: Props) {
  const [dados, setDados] = useState<DadosEdicao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [ultimoErro, setUltimoErro] = useState<string | null>(null);

  /** Devolve se a tela ficou com os dados do servidor — quem salvou precisa saber. */
  const carregar = useCallback(async (): Promise<boolean> => {
    setCarregando(true);
    try {
      const r = await fetch("/api/admin/edicao", { cache: "no-store" });
      const corpo = (await r.json().catch(() => ({}))) as DadosEdicao & { error?: string };
      if (!r.ok) throw new Error(corpo.error ?? `Falha ${r.status}`);
      setDados(corpo);
      setErro(null);
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar a edição.");
      return false;
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /**
   * Executa uma ação e RECARREGA.
   *
   * Recarregar em vez de mexer no estado local é escolha, não preguiça: parte do que
   * a tela mostra é derivado no servidor (panorama, caixa, pontos a partir do elo).
   * Espelhar essa derivação no cliente criaria uma segunda fonte da verdade, que
   * eventualmente discorda da primeira.
   */
  const executar = useCallback(
    async (acao: AcaoEdicao, corpo?: unknown) => {
      setOcupado(true);
      setUltimoErro(null);
      const falhar = (texto: string) => {
        onAlert("erro", texto);
        setUltimoErro(texto);
        return false;
      };
      try {
        const r = await fetch("/api/admin/edicao", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao, dados: corpo }),
        });
        const resposta = (await r.json().catch(() => ({}))) as { error?: string; missing?: string[] };

        if (!r.ok) {
          const falta = resposta.missing?.length ? ` (falta: ${resposta.missing.join(", ")})` : "";
          // O "Salvar tudo" da gaveta grava várias linhas e pode ter gravado parte antes de
          // falhar. Recarregar mostra o que entrou, e a gaveta tira do rascunho o que já está
          // no banco — senão o próximo clique reenviaria por cima do que outra pessoa gravou
          // depois. As outras ações tocam uma linha só: falhou, não gravou nada.
          if (acao === "inscrito") await carregar();
          return falhar(`${resposta.error ?? "Não foi possível salvar."}${falta}`);
        }

        /*
         * Gravou, mas a tela não conseguiu buscar o resultado: devolve `false` para quem
         * chamou NÃO limpar o rascunho. Com `true`, a ficha descartava o que a pessoa
         * acabou de salvar e voltava a mostrar a foto de antes — "Nada mudou" ao lado de
         * "Salvo.", e quem olhasse concluiria que não salvou. O rascunho que fica é o
         * que já está no banco; salvar de novo só regrava o mesmo valor.
         */
        if (!(await carregar())) {
          return falhar("Salvo — mas a tela não conseguiu se atualizar. Recarregue a página antes de continuar.");
        }
        onAlert("ok", "Salvo.");
        return true;
      } catch {
        // A resposta pode ter se perdido DEPOIS de gravar; mesma razão do recarregamento acima.
        if (acao === "inscrito") await carregar();
        return falhar("Não foi possível falar com o servidor.");
      } finally {
        setOcupado(false);
      }
    },
    [carregar, onAlert],
  );

  if (carregando && !dados) {
    return <p style={{ color: C.ink3, fontSize: 13 }}>Carregando a edição…</p>;
  }

  if (erro && !dados) {
    return (
      <div>
        <SectionHead
          eyebrow="4ª Edição"
          title="Não foi possível carregar"
          description="As tabelas da 4ª Edição podem não ter sido criadas ainda. Rode supabase/schema-4a-edicao.sql."
        />
        <Banner tone="danger" title="Falha ao carregar">
          {erro}
        </Banner>
        <div style={{ marginTop: 14 }}>
          <Button onClick={() => void carregar()}>Tentar de novo</Button>
        </div>
      </div>
    );
  }

  if (!dados) return null;

  return (
    <div key={secao}>
      {render({ dados, executar, ocupado, podeConferir, podeFinanceiro, podeConfigurar, ultimoErro })}
    </div>
  );
}
