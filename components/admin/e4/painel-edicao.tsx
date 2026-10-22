"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  /** Teto de times (6 na 4ª). Nulo/ausente = sem teto. */
  max_times?: number | null;
  orcamento_por_time: number;
  min_ranqueadas: number;
  dias_no_grupo: number;
  prazo_pagamento_dias: number;
  segundos_por_escolha: number;
  taxa_centavos: number;
  pct_campeao: number;
  chave_pix: string | null;
  responsavel_financeiro: string | null;
  /** Robô da Riot — opcionais porque um banco sem a migração ainda não tem as colunas. */
  riot_ultima_execucao?: string | null;
  riot_ultimo_resumo?: ResumoDoRobo | null;
  riot_pausa_ate?: string | null;
};

/** Só contagens: o resumo da última rodada que gravou (ver `lib/riot/sincronizar.ts`). */
export type ResumoDoRobo = {
  naFila?: number;
  processados?: number;
  elosMudados?: number;
  itensGravados?: number;
  erros?: number;
  parouPor?: string;
};

export type Inscrito = {
  id: string;
  /**
   * A conta de jogador dona da inscrição (`jogador_contas.id`). Vem no `select *` do GET;
   * nula em inscrição antiga, feita antes das contas. É por ela que a master redefine a senha.
   */
  jogador_id?: string | null;
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
  situacao: "pendente" | "apto" | "recusado" | "desistiu" | "sobra" | "excluido";
  organizador: boolean;
  observacao: string | null;
  /** `riot` = o robô atualiza; `organizacao` = travado à mão; nulo = ninguém confirmou ainda. */
  elo_fonte?: "riot" | "organizacao" | null;
  /** Falso quando a organização segurou a pessoa: o sistema não a promove a apto sozinho. */
  promocao_automatica?: boolean;
  // O que a Riot mostrou na última consulta (espelha `ColunasRiot` em lib/inscricoes/store.ts).
  puuid?: string | null;
  riot_id_atual?: string | null;
  riot_regiao?: string | null;
  elo_riot?: string | null;
  riot_divisao?: string | null;
  riot_pdl?: number | null;
  riot_vitorias?: number | null;
  riot_derrotas?: number | null;
  riot_nivel?: number | null;
  riot_partidas_janela?: number | null;
  riot_sincronizado_em?: string | null;
  riot_status?: "ok" | "sem_ranque_solo" | "riot_id_inexistente" | "outro_servidor" | "erro" | null;
  riot_erro?: string | null;
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
  /** Quem entra na conta de times e vagas: todo inscrito menos recusado, desistente e excluído. */
  elegiveis: number;
  aprovados: number;
  pendentes: number;
  recusados: number;
  /** Excluídos pela organização: fora da lista de Inscritos, só no filtro «Excluído». */
  excluidos?: number;
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

export type AcaoEdicao =
  | "config"
  | "conferencia"
  | "ficha"
  | "inscrito"
  | "pagamento"
  | "congelar"
  | "sincronizar_riot";

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
  /**
   * O que a última ação que DEU CERTO respondeu ("Salvo.", o resumo da rodada da Riot, "outra
   * atualização está rodando"…). Mesmo motivo do `ultimoErro`: quem dispara de dentro da
   * gaveta não vê o aviso do topo. Nulo enquanto uma ação corre ou se a última falhou.
   */
  ultimaMensagem?: string | null;
  /**
   * Pode gerar senha provisória de jogador (`users:manage`, só a master). Opcional e falso
   * por padrão: quem monta o painel diz se a pessoa logada é a master.
   */
  podeRedefinirSenha?: boolean;
}>;

// ---------------------------------------------------------------- contêiner

export type SecaoEdicao = "config" | "inscritos" | "pagamentos" | "times";

type Props = Readonly<{
  secao: SecaoEdicao;
  onAlert: (kind: "ok" | "erro", text: string) => void;
  podeConferir: boolean;
  podeFinanceiro: boolean;
  podeConfigurar: boolean;
  /** Só a master gera senha provisória de jogador (ver `PropsSecao`). */
  podeRedefinirSenha?: boolean;
  render: (props: PropsSecao) => React.ReactNode;
}>;

/**
 * A explicação da tela de falha, pelo status da leitura. Uma frase fixa mandando "rodar o
 * SQL" aparecia também para quem só não tinha o escopo (403) e com o Supabase pausado — e
 * levava a mexer no banco sem motivo. `0` = nem chegou ao servidor.
 */
function explicacaoDaFalha(status: number | null): string {
  if (status === 401) return "A sessão do painel expirou. Entre de novo.";
  if (status === 403) {
    return "Sua conta não tem permissão para ver as inscrições da 4ª Edição (precisa do escopo de conferência ou do financeiro).";
  }
  if (status === 0) return "Não deu para falar com o servidor. Confira a conexão e tente de novo.";
  if (status !== null && status >= 500) {
    return "Servidor ou banco indisponível. Tente de novo em instantes; se não voltar, confira no Supabase se o projeto está ativo (não pausado). Com o «ref» abaixo dá para achar o erro nos logs da Vercel.";
  }
  return "A edição não carregou. O motivo que o servidor deu está logo abaixo.";
}

export function PainelEdicao({
  secao,
  onAlert,
  podeConferir,
  podeFinanceiro,
  podeConfigurar,
  podeRedefinirSenha = false,
  render,
}: Props) {
  const [dados, setDados] = useState<DadosEdicao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  /** Status HTTP da última leitura que falhou (0 = rede). Escolhe a explicação da tela de falha. */
  const [statusDoErro, setStatusDoErro] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [ultimoErro, setUltimoErro] = useState<string | null>(null);
  const [ultimaMensagem, setUltimaMensagem] = useState<string | null>(null);

  /**
   * Número da busca mais recente. A busca da troca de aba não trava o «Salvar»: no 4G ela
   * pode voltar DEPOIS da busca que vem após a ação, com a foto de antes dela — e a resposta
   * que chegasse por último vencia, devolvendo à tela o que acabou de ser trocado. Só a
   * busca mais nova escreve na tela.
   */
  const buscaAtual = useRef(0);

  /** Devolve se a tela ficou com os dados do servidor — quem salvou precisa saber. */
  const carregar = useCallback(async (): Promise<boolean> => {
    const minha = ++buscaAtual.current;
    setCarregando(true);
    let status = 0;
    try {
      const r = await fetch("/api/admin/edicao", { cache: "no-store" });
      status = r.status;
      const corpo = (await r.json().catch(() => ({}))) as DadosEdicao & { error?: string; ref?: string };
      // Uma busca mais nova já saiu e é ela que manda na tela.
      if (minha !== buscaAtual.current) return true;
      if (!r.ok) {
        // O `ref` é o que acha o erro de verdade no log do servidor; sem ele, "não foi
        // possível carregar" não leva a lugar nenhum.
        throw new Error(`${corpo.error ?? `Falha ${r.status}`}${corpo.ref ? ` (ref ${corpo.ref})` : ""}`);
      }
      setDados(corpo);
      setErro(null);
      setStatusDoErro(null);
      return true;
    } catch (e) {
      if (minha !== buscaAtual.current) return false;
      setErro(e instanceof Error ? e.message : "Não foi possível carregar a edição.");
      setStatusDoErro(status);
      return false;
    } finally {
      if (minha === buscaAtual.current) setCarregando(false);
    }
  }, []);

  /*
   * Busca de novo a cada troca de aba da 4ª. O painel devolve este contêiner na MESMA
   * posição para as quatro abas, sem `key`: o React reaproveita a instância, e um efeito
   * que dependesse só de `carregar` (estável) rodava uma vez só — quem passava por
   * Inscritos, Pagamentos e Times via em todas a foto de quando abriu a primeira.
   */
  useEffect(() => {
    void carregar();
  }, [carregar, secao]);

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
      setUltimaMensagem(null);
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
        const resposta = (await r.json().catch(() => ({}))) as {
          error?: string;
          missing?: string[];
          mensagem?: string;
          conflito?: boolean;
        };

        if (!r.ok) {
          const falta = resposta.missing?.length ? ` (falta: ${resposta.missing.join(", ")})` : "";
          // O "Salvar tudo" da gaveta grava várias linhas e pode ter gravado parte antes de
          // falhar. Recarregar mostra o que entrou, e a gaveta tira do rascunho o que já está
          // no banco — senão o próximo clique reenviaria por cima do que outra pessoa gravou
          // depois. As outras ações tocam uma linha só: falhou, não gravou nada.
          //
          // O 409 de conflito (a tela mandou o valor que viu, e ele já mudou) recarrega em
          // qualquer ação: a mensagem manda conferir o valor ATUAL, e ele tem de estar na tela.
          if (acao === "inscrito" || (r.status === 409 && resposta.conflito)) await carregar();
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
        // A rota pode dizer algo além de "Salvo." — o resumo da rodada da Riot, ou que a
        // pessoa acabou de virar apto sozinha.
        const mensagem = resposta.mensagem ?? "Salvo.";
        onAlert("ok", mensagem);
        setUltimaMensagem(mensagem);
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
          description={explicacaoDaFalha(statusDoErro)}
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
      {render({
        dados,
        executar,
        ocupado,
        podeConferir,
        podeFinanceiro,
        podeConfigurar,
        ultimoErro,
        ultimaMensagem,
        podeRedefinirSenha,
      })}
    </div>
  );
}
