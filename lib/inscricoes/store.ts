// Trava de build: se este módulo for importado por um componente "use client",
// a compilação FALHA. Aqui trafega e-mail, WhatsApp e Discord de terceiros — nada
// disso pode ser arrastado para o navegador num refactor futuro.
import "server-only";

import { createSupabaseAdminClient } from "@/lib/data-store";
import { ErroDeRegra } from "@/lib/security/erros";
import {
  distribuirTimes,
  linhaDeInscricao,
  type EstadoPagamento,
  type InscricaoPublica,
  type ItemConferencia,
} from "@/lib/inscricoes/schema";

/**
 * Acesso às tabelas da 4ª Edição.
 *
 * Segue o mesmo padrão de `lib/data-store.ts`: só servidor, só chave de serviço,
 * nenhuma leitura direta do banco pelo navegador. As tabelas têm RLS forçado e zero
 * policies (ver supabase/schema-4a-edicao.sql), então mesmo a chave pública não
 * alcança nada — a proteção não depende só deste arquivo.
 */

/** Teto de inscrições vindas da mesma origem por hora. Ver `criarInscricao`. */
const LIMITE_POR_ORIGEM_HORA = 5;

// ---------------------------------------------------------------- tipos

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

export type Inscricao = {
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

// ---------------------------------------------------------------- configuração

export async function lerConfig(): Promise<EdicaoConfig> {
  const { data, error } = await createSupabaseAdminClient()
    .from("edicao_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle<EdicaoConfig>();

  if (error) throw new Error(`Falha ao ler a configuração da edição: ${error.message}`);
  // Erro comum, NÃO de regra: a mensagem de ErroDeRegra vai inteira para a resposta
  // HTTP, e quem chama isto primeiro é o formulário público. "Rode schema-4a-edicao.sql"
  // é recado para nós, não para o jogador — vai para o log com código de referência.
  if (!data) throw new Error("edicao_config vazia: rode supabase/schema-4a-edicao.sql.");
  return data;
}

export async function salvarConfig(patch: Partial<EdicaoConfig>): Promise<EdicaoConfig> {
  const { data, error } = await createSupabaseAdminClient()
    .from("edicao_config")
    .update({ ...patch, atualizado_em: new Date().toISOString() })
    .eq("id", 1)
    .select("*")
    .single<EdicaoConfig>();

  if (error) throw new Error(`Falha ao salvar a configuração: ${error.message}`);
  return data;
}

// ---------------------------------------------------------------- inscrição

/**
 * Cria a inscrição a partir do formulário público.
 *
 * Três coisas acontecem aqui e não podem sair daqui:
 *  1. os pontos são derivados do elo (ver `linhaDeInscricao`), nunca aceitos do cliente;
 *  2. a janela de inscrição é conferida no servidor — esconder o botão não é fechar;
 *  3. duplicidade vira mensagem que a pessoa entende, em vez de erro cru do Postgres.
 */
export async function criarInscricao(
  dados: InscricaoPublica,
  origem?: { ipHash: string; jogadorId?: string | null },
): Promise<Inscricao> {
  const config = await lerConfig();
  if (!config.inscricoes_abertas) {
    throw new ErroDeRegra("As inscrições não estão abertas no momento.");
  }

  const cliente = createSupabaseAdminClient();

  // Freio de envio em massa. O formulário é público, e sem isto uma única pessoa
  // (ou um script) enche a tabela. O teto é folgado de propósito: numa casa com
  // internet compartilhada, dois irmãos se inscrevendo em seguida é normal.
  if (origem) {
    const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: erroConta } = await cliente
      .from("inscricoes")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", origem.ipHash)
      .gte("criado_em", desde);

    if (erroConta) throw new Error(`Falha ao conferir a origem: ${erroConta.message}`);
    if ((count ?? 0) >= LIMITE_POR_ORIGEM_HORA) {
      throw new ErroDeRegra(
        "Muitas inscrições enviadas deste dispositivo na última hora. Se precisa inscrever mais alguém, fale com a organização.",
      );
    }
  }

  const linha = {
    ...linhaDeInscricao(dados),
    ip_hash: origem?.ipHash ?? null,
    jogador_id: origem?.jogadorId ?? null,
  };

  const { data, error } = await cliente
    .from("inscricoes")
    .insert(linha)
    .select("*")
    .single<Inscricao>();

  if (error) {
    // 23505 = violação de índice único. Traduzimos para o campo que a pessoa
    // consegue corrigir, em vez de devolver o nome do índice.
    if (error.code === "23505") {
      const alvo = error.message.includes("riot_id")
        ? "Esse Riot ID já está inscrito."
        : error.message.includes("discord")
          ? "Esse Discord já está inscrito."
          : "Esse e-mail já está inscrito.";
      throw new ErroDeRegra(`${alvo} Se foi você, procure a organização em vez de se inscrever de novo.`);
    }
    throw new Error(`Falha ao gravar a inscrição: ${error.message}`);
  }

  // As 6 conferências e o pagamento NÃO são abertos aqui: quem faz isso é o gatilho
  // `inscricoes_abrir_pendencias`, na mesma transação do insert. Fazer em três
  // chamadas separadas deixava a porta aberta para uma inscrição meio-criada — sem
  // linha de pagamento, invisível na fila do caixa — se a segunda falhasse. E o
  // gatilho também cobre a linha inserida à mão pelo SQL Editor.
  await registrarAuditoria({
    inscricaoId: data.id,
    autor: data.riot_id,
    acao: "inscricao_criada",
    detalhe: { elo: data.elo_declarado, pontos: data.pontos },
  });

  return data;
}

export async function listarInscricoes(): Promise<Inscricao[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("inscricoes")
    .select("*")
    .order("criado_em", { ascending: true })
    .returns<Inscricao[]>();

  if (error) throw new Error(`Falha ao listar inscrições: ${error.message}`);
  return data ?? [];
}

export async function listarConferencias(): Promise<Conferencia[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("inscricao_conferencias")
    .select("inscricao_id,item,estado,observacao,conferido_por,conferido_em")
    .returns<Conferencia[]>();

  if (error) throw new Error(`Falha ao listar conferências: ${error.message}`);
  return data ?? [];
}

export async function listarPagamentos(): Promise<Pagamento[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("inscricao_pagamentos")
    .select("inscricao_id,estado,valor_centavos,declarado_em,conferido_por,conferido_em,vence_em")
    .returns<Pagamento[]>();

  if (error) throw new Error(`Falha ao listar pagamentos: ${error.message}`);
  return data ?? [];
}

// ---------------------------------------------------------------- conferência

export async function atualizarConferencia(args: {
  inscricaoId: string;
  item: ItemConferencia;
  estado: string;
  observacao?: string;
  retrato?: Record<string, unknown>;
  autor: string;
}): Promise<void> {
  const cliente = createSupabaseAdminClient();
  const agora = new Date().toISOString();

  const { error } = await cliente
    .from("inscricao_conferencias")
    .update({
      estado: args.estado,
      observacao: args.observacao ?? null,
      // O retrato é PROVA do que foi visto na hora. Sobrescrever com nulo só porque
      // esta conferência não trouxe um apagaria a justificativa da anterior — e a
      // auditoria guarda estado e observação, não o retrato. Ausente = preserva.
      retrato: args.retrato ?? undefined,
      conferido_por: args.autor,
      conferido_em: agora,
      atualizado_em: agora,
    })
    .eq("inscricao_id", args.inscricaoId)
    .eq("item", args.item);

  if (error) throw new Error(`Falha ao gravar a conferência: ${error.message}`);

  await registrarAuditoria({
    inscricaoId: args.inscricaoId,
    autor: args.autor,
    acao: `conferencia_${args.item}`,
    detalhe: { estado: args.estado, observacao: args.observacao ?? null },
  });
}

// ---------------------------------------------------------------- pagamento

export async function atualizarPagamento(args: {
  inscricaoId: string;
  estado: EstadoPagamento;
  observacao?: string;
  autor: string;
}): Promise<void> {
  const cliente = createSupabaseAdminClient();
  const agora = new Date().toISOString();

  // "declarado" é a palavra do jogador e não carimba conferente. "pago" e
  // "estornado" são atos da organização e registram quem fez.
  const daOrganizacao = args.estado !== "declarado" && args.estado !== "aguardando";

  const { error } = await cliente
    .from("inscricao_pagamentos")
    .update({
      estado: args.estado,
      observacao: args.observacao ?? null,
      declarado_em: args.estado === "declarado" ? agora : undefined,
      estornado_em: args.estado === "estornado" ? agora : undefined,
      conferido_por: daOrganizacao ? args.autor : undefined,
      conferido_em: daOrganizacao ? agora : undefined,
      atualizado_em: agora,
    })
    .eq("inscricao_id", args.inscricaoId);

  if (error) throw new Error(`Falha ao gravar o pagamento: ${error.message}`);

  await registrarAuditoria({
    inscricaoId: args.inscricaoId,
    autor: args.autor,
    acao: "pagamento",
    detalhe: { estado: args.estado },
  });
}

/**
 * O caixa da edição.
 *
 * `arrecadado` desconta os estornos de propósito: é esse número, e não o bruto, que
 * vira premiação — e é ele que precisa bater com o que o site declara publicamente.
 * Isentos entram numa linha própria porque o dinheiro deles nunca existiu.
 */
export function fecharCaixa(pagamentos: readonly Pagamento[]) {
  const soma = (...estados: readonly EstadoPagamento[]) =>
    pagamentos.filter((p) => estados.includes(p.estado)).reduce((t, p) => t + p.valor_centavos, 0);

  // Estado é EXCLUSIVO: quem foi estornado deixou de ser "pago". Então "pago" já não
  // contém o dinheiro devolvido, e subtrair o estorno de novo descontaria duas vezes
  // o mesmo valor. `recebido` reconstrói o bruto somando tudo que um dia entrou.
  const daOrganizacao = soma("pago");
  const aDevolver = soma("estorno_devido");
  const estornado = soma("estornado");
  const recebido = daOrganizacao + aDevolver + estornado;

  return {
    recebido,
    estornado,
    // Já entrou e ainda está na conta, mas está comprometido a sair.
    aDevolver,
    // O que existe na conta agora, incluindo o que ainda será devolvido.
    emCaixa: recebido - estornado,
    // O dinheiro que é de fato da organização — é ESTE que vira premiação.
    arrecadado: daOrganizacao,
    aReceber: soma("aguardando", "declarado"),
    isento: soma("isento"),
  };
}

// ---------------------------------------------------------------- auditoria

export async function registrarAuditoria(args: {
  inscricaoId?: string | null;
  autor: string;
  acao: string;
  detalhe?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await createSupabaseAdminClient().from("inscricao_auditoria").insert({
    inscricao_id: args.inscricaoId ?? null,
    autor: args.autor,
    acao: args.acao,
    detalhe: args.detalhe ?? null,
  });

  // Auditoria que falha não pode derrubar a ação principal — mas também não pode
  // sumir em silêncio, senão perdemos justamente o rastro que ela existe para dar.
  if (error) console.error("[inscricoes] falha ao registrar auditoria", error);
}

// ---------------------------------------------------------------- draft

export async function lerDraft(): Promise<unknown> {
  const { data, error } = await createSupabaseAdminClient()
    .from("draft_estado")
    .select("estado")
    .eq("id", 1)
    .maybeSingle<{ estado: unknown }>();

  if (error) throw new Error(`Falha ao ler o estado do draft: ${error.message}`);
  return data?.estado ?? null;
}

export async function salvarDraft(estado: unknown): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("draft_estado")
    .update({ estado, atualizado_em: new Date().toISOString() })
    .eq("id", 1);

  if (error) throw new Error(`Falha ao salvar o estado do draft: ${error.message}`);
}

// ---------------------------------------------------------------- panorama

/**
 * Os números do topo do painel, calculados na leitura.
 *
 * Nada disso é armazenado: estado derivado que fica guardado é estado que
 * eventualmente diverge da verdade.
 */
export function panorama(
  inscricoes: readonly Inscricao[],
  pagamentos: readonly Pagamento[],
  config: Pick<EdicaoConfig, "jogadores_por_time">,
) {
  // "sobra" também é APROVADO — é quem passou na conferência e ficou de fora quando
  // os times fecharam. Contar só os "apto" faria a conta se mover sozinha: ao marcar
  // dois como sobra, o total de aprovados cairia e a divisão mudaria de resposta.
  const aprovados = inscricoes.filter((i) => i.situacao === "apto" || i.situacao === "sobra");
  const { times, vagas, sobra } = distribuirTimes(aprovados.length, config.jogadores_por_time);

  return {
    inscritos: inscricoes.length,
    aprovados: aprovados.length,
    pendentes: inscricoes.filter((i) => i.situacao === "pendente").length,
    recusados: inscricoes.filter((i) => i.situacao === "recusado").length,
    // Sem "X de 30": não existe teto nesta edição, o número de times é derivado.
    times,
    vagas,
    sobra,
    caixa: fecharCaixa(pagamentos),
  };
}
