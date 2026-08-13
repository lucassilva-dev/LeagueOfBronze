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

export type AcaoEdicao = "config" | "conferencia" | "ficha" | "pagamento" | "congelar";

/** O que toda seção recebe. */
export type PropsSecao = Readonly<{
  dados: DadosEdicao;
  executar: (acao: AcaoEdicao, dados?: unknown) => Promise<boolean>;
  ocupado: boolean;
  podeConferir: boolean;
  podeFinanceiro: boolean;
  podeConfigurar: boolean;
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

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/admin/edicao", { cache: "no-store" });
      const corpo = (await r.json().catch(() => ({}))) as DadosEdicao & { error?: string };
      if (!r.ok) throw new Error(corpo.error ?? `Falha ${r.status}`);
      setDados(corpo);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar a edição.");
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
      try {
        const r = await fetch("/api/admin/edicao", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao, dados: corpo }),
        });
        const resposta = (await r.json().catch(() => ({}))) as { error?: string; missing?: string[] };

        if (!r.ok) {
          const falta = resposta.missing?.length ? ` (falta: ${resposta.missing.join(", ")})` : "";
          onAlert("erro", `${resposta.error ?? "Não foi possível salvar."}${falta}`);
          return false;
        }

        await carregar();
        onAlert("ok", "Salvo.");
        return true;
      } catch {
        onAlert("erro", "Não foi possível falar com o servidor.");
        return false;
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
      {render({ dados, executar, ocupado, podeConferir, podeFinanceiro, podeConfigurar })}
    </div>
  );
}
