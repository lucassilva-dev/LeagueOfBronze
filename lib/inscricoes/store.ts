// Trava de build: se este módulo for importado por um componente "use client",
// a compilação FALHA. Aqui trafega e-mail, WhatsApp e Discord de terceiros — nada
// disso pode ser arrastado para o navegador num refactor futuro.
import "server-only";

import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/data-store";
import { foraDaCobranca } from "@/lib/inscricoes/pagamento";
import {
  contaParaTimes,
  distribuirTimes,
  estadoDaJanela,
  linhaDeInscricao,
  pontosDoElo,
  type EstadoPagamento,
  type InscricaoPublica,
  type ItemConferencia,
} from "@/lib/inscricoes/schema";
import { AUTOR_SISTEMA, situacaoSugerida } from "@/lib/inscricoes/situacao";
import { criarClienteRiot } from "@/lib/riot/cliente";
import { AUTOR_RIOT, type DecisaoDoRobo } from "@/lib/riot/decidir";
import { ErroDeRegra } from "@/lib/security/erros";

export { AUTOR_RIOT, AUTOR_SISTEMA };

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

/**
 * Teto de consultas à Riot pelo formulário, por conta OU por origem, por hora.
 *
 * O freio acima conta só inscrições GRAVADAS — e uma consulta que dá "Riot ID não existe"
 * não grava nada. Sem este teto, alguém com sessão podia mandar o formulário em loop, gastar
 * a cota da chave da Riot do campeonato (100 a cada 2 min) e manter o robô diário pausado.
 * Passou do teto: a inscrição segue sem conferir, como quando a Riot está fora do ar.
 */
const CONSULTAS_RIOT_POR_HORA = 6;

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
  /** Robô da Riot: última rodada que GRAVOU e o resumo dela (só contagens). */
  riot_ultima_execucao?: string | null;
  riot_ultimo_resumo?: Record<string, unknown> | null;
  /** Trava contra duas rodadas ao mesmo tempo (cron duplicado, cron e botão). */
  riot_trava_ate?: string | null;
  /** Depois de um 429 da Riot, ninguém consulta até esta hora. */
  riot_pausa_ate?: string | null;
};

/** O que o robô da Riot guarda de cada inscrito. Só a organização vê; o jogador, nunca. */
export type ColunasRiot = {
  puuid?: string | null;
  /** O Riot ID que a conta tem HOJE na Riot — diferente de `riot_id` = trocou de nick. */
  riot_id_atual?: string | null;
  riot_regiao?: string | null;
  /** O elo da solo/duo na Riot, já em português. Não é o elo que vale: ver `elo_verificado`. */
  elo_riot?: string | null;
  riot_divisao?: string | null;
  riot_pdl?: number | null;
  riot_vitorias?: number | null;
  riot_derrotas?: number | null;
  riot_nivel?: number | null;
  riot_nivel_em?: string | null;
  riot_partidas_janela?: number | null;
  riot_sincronizado_em?: string | null;
  riot_status?: "ok" | "sem_ranque_solo" | "riot_id_inexistente" | "outro_servidor" | "erro" | null;
  riot_erro?: string | null;
};

export type Inscricao = ColunasRiot & {
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
  /** Turnos (`manha`, `tarde`, `noite`) — regra 9. Vazio em quem se inscreveu antes da pergunta. */
  disponibilidade: string[];
  quer_capitao: boolean;
  entrou_no_grupo: string | null;
  situacao: "pendente" | "apto" | "recusado" | "desistiu" | "sobra";
  organizador: boolean;
  observacao: string | null;
  /**
   * De onde veio o `elo_verificado`: `riot` (o robô atualiza), `organizacao` (travado à
   * mão — o robô não mexe) ou nulo (ninguém confirmou ainda, ou foi gravado antes do robô).
   */
  elo_fonte?: "riot" | "organizacao" | null;
  /** Falso quando a organização tirou a pessoa de apto: o sistema não a promove de novo. */
  promocao_automatica?: boolean;
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
  observacao: string | null;
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

/**
 * Igual a `lerConfig`, mas devolve null em vez de estourar.
 *
 * Serve às PÁGINAS. Uma página pública não pode virar erro 500 porque o banco piscou
 * ou porque o ambiente ainda não tem as chaves (é o caso do desenvolvimento local):
 * ela mostra "inscrição indisponível no momento" e segue de pé, com o resto do site
 * funcionando. Nas ROTAS de escrita continuamos usando `lerConfig`, que falha alto —
 * lá, seguir sem configuração seria gravar com parâmetro errado.
 */
export async function lerConfigOuNulo(): Promise<EdicaoConfig | null> {
  // Sem as chaves (desenvolvimento local, pré-visualização sem segredo) não há o que ler,
  // e isso não é falha: o `console.error` abaixo virava a tela vermelha do Next em todo
  // carregamento local. O log fica para quando o banco EXISTE e não respondeu.
  if (!isSupabaseConfigured()) return null;
  try {
    return await lerConfig();
  } catch (error) {
    console.error("[inscricoes] configuração da edição indisponível", error);
    return null;
  }
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
  dono: { ipHash: string; jogadorId: string; email: string },
): Promise<Inscricao> {
  const config = await lerConfig();
  // A data de fechamento também fecha — não só a chave. Antes a data só escolhia o aviso,
  // e a inscrição seguia aberta depois dela até alguém lembrar de desligar.
  const janela = estadoDaJanela(config, Date.now());
  if (janela !== "aberta") {
    throw new ErroDeRegra(
      janela === "encerrada" ? "As inscrições estão encerradas." : "As inscrições não estão abertas no momento.",
    );
  }

  const cliente = createSupabaseAdminClient();

  // Freio de envio em massa. O formulário é público, e sem isto uma única pessoa
  // (ou um script) enche a tabela. O teto é folgado de propósito: numa casa com
  // internet compartilhada, dois irmãos se inscrevendo em seguida é normal.
  {
    const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: erroConta } = await cliente
      .from("inscricoes")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", dono.ipHash)
      .gte("criado_em", desde);

    if (erroConta) throw new Error(`Falha ao conferir a origem: ${erroConta.message}`);
    if ((count ?? 0) >= LIMITE_POR_ORIGEM_HORA) {
      throw new ErroDeRegra(
        "Muitas inscrições enviadas deste dispositivo na última hora. Se precisa inscrever mais alguém, fale com a organização.",
      );
    }
  }

  // Já inscrito nesta conta: barra ANTES de consultar a Riot (o índice único do e-mail
  // barraria no insert, mas aí a consulta já teria gastado cota).
  {
    const { count, error: erroJa } = await cliente
      .from("inscricoes")
      .select("id", { count: "exact", head: true })
      .eq("jogador_id", dono.jogadorId);
    if (erroJa) throw new Error(`Falha ao conferir a inscrição existente: ${erroJa.message}`);
    if ((count ?? 0) > 0) {
      throw new ErroDeRegra("Você já tem uma inscrição nesta edição. Para corrigir algo nela, fale com a organização.");
    }
  }

  // Depois dos freios, para quem já foi barrado não gastar consulta à Riot.
  const conta = await conferirContaNaRiot(dados.nick, dados.tag, config, dono);
  if (conta.tipo === "nao_encontrado") {
    throw new ErroDeRegra(
      `Não encontramos o Riot ID ${dados.nick}#${dados.tag} na Riot. Confira o nick e a tag exatamente como aparecem no cliente do LoL (a tag é o que vem depois do #). Se tiver certeza de que está certo, fale com a organização.`,
    );
  }

  const linha = {
    ...linhaDeInscricao(dados, dono.email),
    ip_hash: dono.ipHash,
    jogador_id: dono.jogadorId,
    ...(conta.tipo === "ok" && { puuid: conta.puuid, riot_id_atual: conta.riotIdAtual }),
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

/**
 * O Riot ID existe na Riot? Consultado no envio da inscrição, antes de gravar.
 *
 * Só um "não existe" DEFINITIVO (404) barra a inscrição — é o erro de digitação que hoje só
 * aparece dias depois, na conferência. Qualquer outra coisa (Riot fora do ar, limite de
 * taxa, chave ausente, robô pausado) deixa passar sem conferir: a inscrição não pode
 * depender da disponibilidade da Riot, e o robô confere de novo na rodada seguinte.
 */
async function conferirContaNaRiot(
  nick: string,
  tag: string,
  config: Pick<EdicaoConfig, "riot_pausa_ate">,
  dono: { jogadorId: string; ipHash: string },
): Promise<{ tipo: "ok"; puuid: string; riotIdAtual: string } | { tipo: "nao_encontrado" } | { tipo: "sem_conferencia" }> {
  if (roboPausado(config, Date.now())) return { tipo: "sem_conferencia" };
  if (!(await podeConsultarARiot(dono))) return { tipo: "sem_conferencia" };

  const resposta = await criarClienteRiot({ timeoutMs: 3000 }).contaPorRiotId(nick, tag);
  if (resposta.tipo === "ok") {
    return {
      tipo: "ok",
      puuid: resposta.dados.puuid,
      riotIdAtual: `${resposta.dados.gameName}#${resposta.dados.tagLine}`,
    };
  }
  if (resposta.tipo === "nao_encontrado") return { tipo: "nao_encontrado" };
  if (resposta.tipo === "limite" && !resposta.proprio) {
    await pausarRobo(resposta.esperarSegundos).catch((erro) => console.error("[inscricoes] falha ao pausar o robô", erro));
  }
  return { tipo: "sem_conferencia" };
}

/**
 * Registra a tentativa e diz se ainda cabe no teto (`CONSULTAS_RIOT_POR_HORA`).
 *
 * Qualquer falha aqui deixa passar SEM consultar: o freio existe para proteger a cota, e
 * na dúvida não gastamos cota — mas também não barramos a inscrição de ninguém.
 */
async function podeConsultarARiot(dono: { jogadorId: string; ipHash: string }): Promise<boolean> {
  try {
    const cliente = createSupabaseAdminClient();
    const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error } = await cliente
      .from("inscricao_consultas_riot")
      .select("id", { count: "exact", head: true })
      // Os dois valores são gerados no servidor (UUID da sessão e hash hexadecimal do IP).
      .or(`jogador_id.eq.${dono.jogadorId},ip_hash.eq.${dono.ipHash}`)
      .gte("ocorrido_em", desde);
    if (error) throw new Error(error.message);
    if ((count ?? 0) >= CONSULTAS_RIOT_POR_HORA) return false;

    const { error: erroRegistro } = await cliente
      .from("inscricao_consultas_riot")
      .insert({ jogador_id: dono.jogadorId, ip_hash: dono.ipHash });
    if (erroRegistro) throw new Error(erroRegistro.message);
    return true;
  } catch (erro) {
    console.error("[inscricoes] freio de consultas à Riot indisponível", erro);
    return false;
  }
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
    .select("inscricao_id,estado,valor_centavos,declarado_em,conferido_por,conferido_em,vence_em,observacao")
    .returns<Pagamento[]>();

  if (error) throw new Error(`Falha ao listar pagamentos: ${error.message}`);
  return data ?? [];
}

// ---------------------------------------------------------------- a minha inscrição

/**
 * O que o próprio jogador pode ver da sua inscrição. Sem id interno, sem ip_hash.
 *
 * Sem `pontos`, também: a tabela de valores da 4ª só sai depois de fechar a lista
 * (seção 3 do regulamento), e o número gravado hoje vem da tabela da 3ª.
 */
export type MinhaInscricao = {
  riotId: string;
  elo: string;
  rotaPrimaria: string;
  rotaSecundaria: string;
  disponibilidade: string[];
  situacao: Inscricao["situacao"];
  observacao: string | null;
  criadoEm: string;
  pagamento: { estado: EstadoPagamento; valorCentavos: number; venceEm: string | null } | null;
  conferencias: { item: ItemConferencia; estado: string; observacao: string | null }[];
};

/**
 * A inscrição de quem está logado — e só a dela.
 *
 * A consulta filtra por `jogador_id` vindo da SESSÃO, nunca por um id recebido do
 * cliente: essa é a diferença entre "ver a minha ficha" e "ver a ficha de qualquer um
 * trocando um número na URL".
 */
export async function minhaInscricao(jogadorId: string): Promise<MinhaInscricao | null> {
  const cliente = createSupabaseAdminClient();

  const { data: inscricao, error } = await cliente
    .from("inscricoes")
    .select(
      "id,criado_em,riot_id,elo_declarado,elo_verificado,elo_congelado,rota_primaria,rota_secundaria,disponibilidade,situacao,observacao",
    )
    .eq("jogador_id", jogadorId)
    .maybeSingle<{
      id: string;
      criado_em: string;
      riot_id: string;
      elo_declarado: string;
      elo_verificado: string | null;
      elo_congelado: string | null;
      rota_primaria: string;
      rota_secundaria: string;
      disponibilidade: string[] | null;
      situacao: Inscricao["situacao"];
      observacao: string | null;
    }>();

  if (error) throw new Error(`Falha ao ler a inscrição: ${error.message}`);
  if (!inscricao) return null;

  const [pag, conf] = await Promise.all([
    cliente
      .from("inscricao_pagamentos")
      .select("estado,valor_centavos,vence_em")
      .eq("inscricao_id", inscricao.id)
      .maybeSingle<{ estado: EstadoPagamento; valor_centavos: number; vence_em: string | null }>(),
    cliente
      .from("inscricao_conferencias")
      .select("item,estado,observacao")
      .eq("inscricao_id", inscricao.id)
      .returns<{ item: ItemConferencia; estado: string; observacao: string | null }[]>(),
  ]);

  return {
    riotId: inscricao.riot_id,
    /*
     * A MESMA cascata de três níveis que o resto do sistema usa: congelado (o que vale
     * no draft) → verificado (o que a organização conferiu) → declarado (a palavra do
     * jogador).
     *
     * Faltava o verificado aqui, e esta tela era a única do site que o pulava: o
     * jogador via o elo que declarou mesmo depois de a organização confirmar outro.
     */
    elo: inscricao.elo_congelado ?? inscricao.elo_verificado ?? inscricao.elo_declarado,
    rotaPrimaria: inscricao.rota_primaria,
    rotaSecundaria: inscricao.rota_secundaria,
    disponibilidade: inscricao.disponibilidade ?? [],
    situacao: inscricao.situacao,
    observacao: inscricao.observacao,
    criadoEm: inscricao.criado_em,
    pagamento: pag.data
      ? { estado: pag.data.estado, valorCentavos: pag.data.valor_centavos, venceEm: pag.data.vence_em }
      : null,
    conferencias: conf.data ?? [],
  };
}

/**
 * A inscrição de quem está logado, só o id.
 *
 * É a ponte entre a sessão e o draft: o motor identifica as pessoas pelo id da
 * INSCRIÇÃO, e a sessão sabe o id da CONTA. Sem esta tradução, a rota da escolha
 * precisaria receber o id do jogador no corpo — que é exatamente o que não pode.
 */
export async function inscricaoIdDoJogador(jogadorId: string): Promise<string | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("inscricoes")
    .select("id")
    .eq("jogador_id", jogadorId)
    .maybeSingle<{ id: string }>();

  if (error) throw new Error(`Falha ao localizar a inscrição: ${error.message}`);
  return data?.id ?? null;
}

/**
 * "Já paguei", dito pelo jogador.
 *
 * Só sai de `aguardando`. Não pode reabrir um pagamento já conferido, isento,
 * estornado ou cancelado — senão o jogador conseguiria mexer no caixa fechado, e a
 * palavra dele viraria a mesma coisa que a conferência da organização.
 */
export async function declararPagamento(jogadorId: string): Promise<"ok" | "sem_inscricao" | "nao_permitido"> {
  const cliente = createSupabaseAdminClient();

  const { data: inscricao, error } = await cliente
    .from("inscricoes")
    .select("id,riot_id")
    .eq("jogador_id", jogadorId)
    .maybeSingle<{ id: string; riot_id: string }>();

  if (error) throw new Error(`Falha ao ler a inscrição: ${error.message}`);
  if (!inscricao) return "sem_inscricao";

  const { data, error: erroUpdate } = await cliente
    .from("inscricao_pagamentos")
    .update({ estado: "declarado", declarado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
    .eq("inscricao_id", inscricao.id)
    .eq("estado", "aguardando")
    .select("inscricao_id");

  if (erroUpdate) throw new Error(`Falha ao registrar o aviso de pagamento: ${erroUpdate.message}`);
  if (!data || data.length === 0) return "nao_permitido";

  await registrarAuditoria({
    inscricaoId: inscricao.id,
    autor: inscricao.riot_id,
    acao: "pagamento_declarado_pelo_jogador",
  });

  return "ok";
}

// ---------------------------------------------------------------- ficha (organização)

/**
 * Campos da inscrição que a organização edita à mão.
 *
 * Repare no que NÃO está aqui: `pontos`. Ele continua derivado do elo, agora do
 * `elo_verificado` quando existe — deixar a organização digitar o preço do jogador
 * abriria pela porta dos fundos exatamente o que o formulário público fecha.
 */
export type PatchInscricao = {
  situacao?: Inscricao["situacao"];
  observacao?: string | null;
  organizador?: boolean;
  eloVerificado?: string | null;
  entrouNoGrupo?: string | null;
  disponibilidade?: string[];
  nomeReal?: string;
};

export async function atualizarInscricao(
  inscricaoId: string,
  patch: PatchInscricao,
  autor: string,
): Promise<void> {
  const linha: Record<string, unknown> = { atualizado_em: new Date().toISOString() };

  if (patch.situacao !== undefined) linha.situacao = patch.situacao;
  if (patch.observacao !== undefined) linha.observacao = patch.observacao;
  if (patch.organizador !== undefined) linha.organizador = patch.organizador;
  if (patch.entrouNoGrupo !== undefined) linha.entrou_no_grupo = patch.entrouNoGrupo;
  if (patch.disponibilidade !== undefined) linha.disponibilidade = patch.disponibilidade;
  if (patch.nomeReal !== undefined) linha.nome_real = patch.nomeReal;

  if (patch.eloVerificado !== undefined || patch.situacao !== undefined) {
    const { data: atual, error: erroLeitura } = await createSupabaseAdminClient()
      .from("inscricoes")
      .select("elo_declarado,elo_congelado,elo_riot,situacao")
      .eq("id", inscricaoId)
      .maybeSingle<{
        elo_declarado: string;
        elo_congelado: string | null;
        elo_riot: string | null;
        situacao: Inscricao["situacao"];
      }>();

    if (erroLeitura) throw new Error(`Falha ao ler a ficha: ${erroLeitura.message}`);
    if (!atual) throw new ErroDeRegra("Inscrição não encontrada.");

    if (patch.eloVerificado !== undefined) {
      /*
       * Escolher um elo à mão TRAVA o inscrito: o robô da Riot para de mexer no elo dele
       * (serve para a exceção — conta principal em outro lugar, combinado no grupo…).
       * Escolher "automático" (vazio) devolve o elo à Riot: vale o último que o robô leu,
       * ou o declarado se ele ainda não leu nada.
       */
      const manual = patch.eloVerificado;
      const verificado = manual ?? atual.elo_riot ?? null;
      linha.elo_verificado = verificado;
      linha.elo_fonte = manual ? "organizacao" : atual.elo_riot ? "riot" : null;

      /*
       * O preço acompanha o elo que vale. Derivado aqui, no servidor, pela mesma tabela do
       * site — nunca digitado.
       *
       * Duas regras que uma versão anterior desta função quebrava:
       *
       * 1. DEPOIS DO CONGELAMENTO o preço para de acompanhar o elo (é a promessa que
       *    `congelarElos` faz logo abaixo: "um draft em que o preço muda no meio não é
       *    um draft"). Salvar a ficha reprecificava o jogador mesmo com o elo já
       *    congelado — inclusive durante o draft.
       * 2. LIMPAR o elo verificado precisa devolver o preço ao elo que passa a valer. Com a
       *    guarda só de verdadeiro, `null` apagava o elo e deixava para trás os pontos
       *    do elo que acabara de ser removido.
       */
      if (!atual.elo_congelado) {
        const eloValendo = verificado ?? atual.elo_declarado;
        const pontos = pontosDoElo(eloValendo);
        if (pontos === null) throw new ErroDeRegra(`Elo não reconhecido: ${eloValendo}`);
        linha.pontos = pontos;
      }
    }

    if (patch.situacao !== undefined) {
      // Voltar alguém de aprovado para pendente é a organização SEGURANDO a pessoa: o
      // sistema não pode promovê-la de novo no próximo pagamento conferido. Qualquer outra
      // situação escolhida à mão devolve a promoção automática.
      linha.promocao_automatica = !(
        patch.situacao === "pendente" &&
        (atual.situacao === "apto" || atual.situacao === "sobra")
      );
    }
  }

  const { error } = await createSupabaseAdminClient()
    .from("inscricoes")
    .update(linha)
    .eq("id", inscricaoId);

  if (error) throw new Error(`Falha ao salvar a ficha: ${error.message}`);

  await registrarAuditoria({ inscricaoId, autor, acao: "ficha", detalhe: patch });
}

/**
 * Congela o elo de todos os aprovados — o valor que vale no draft.
 *
 * Depois disto o preço de cada um para de acompanhar o elo verificado. Existe porque
 * elo muda todo dia, e um draft em que o preço muda no meio não é um draft.
 */
export async function congelarElos(autor: string): Promise<number> {
  const cliente = createSupabaseAdminClient();
  const agora = new Date().toISOString();

  const { data, error } = await cliente
    .from("inscricoes")
    .select("id,elo_declarado,elo_verificado")
    .in("situacao", ["apto", "sobra"])
    .is("elo_congelado", null)
    .returns<{ id: string; elo_declarado: string; elo_verificado: string | null }[]>();

  if (error) throw new Error(`Falha ao ler os aprovados: ${error.message}`);
  if (!data || data.length === 0) return 0;

  let quantidade = 0;
  for (const linha of data) {
    const elo = linha.elo_verificado ?? linha.elo_declarado;
    const pontos = pontosDoElo(elo);
    if (pontos === null) throw new ErroDeRegra(`Elo não reconhecido em ${linha.id}: ${elo}`);

    // `is elo_congelado null` também no UPDATE: o cron diário e o botão podem rodar ao
    // mesmo tempo, e quem chegar depois não pode recongelar com outro valor nem contar de novo.
    const { data: congelada, error: erroUpdate } = await cliente
      .from("inscricoes")
      .update({ elo_congelado: elo, congelado_em: agora, pontos, atualizado_em: agora })
      .eq("id", linha.id)
      .is("elo_congelado", null)
      .select("id");

    if (erroUpdate) throw new Error(`Falha ao congelar ${linha.id}: ${erroUpdate.message}`);
    quantidade += congelada?.length ?? 0;
  }

  if (quantidade > 0) {
    await registrarAuditoria({ autor, acao: "elos_congelados", detalhe: { quantidade } });
  }
  return quantidade;
}

export async function listarAuditoria(limite = 60) {
  const { data, error } = await createSupabaseAdminClient()
    .from("inscricao_auditoria")
    .select("id,ocorrido_em,inscricao_id,autor,acao,detalhe")
    .order("ocorrido_em", { ascending: false })
    .limit(limite)
    .returns<
      {
        id: number;
        ocorrido_em: string;
        inscricao_id: string | null;
        autor: string;
        acao: string;
        detalhe: unknown;
      }[]
    >();

  if (error) throw new Error(`Falha ao ler a auditoria: ${error.message}`);
  return data ?? [];
}

// ---------------------------------------------------------------- conferência

export async function atualizarConferencia(args: {
  inscricaoId: string;
  item: ItemConferencia;
  /** Ausente preserva o veredicto gravado (quem só escreveu uma observação). */
  estado?: string;
  observacao?: string;
  retrato?: Record<string, unknown>;
  autor: string;
}): Promise<void> {
  const cliente = createSupabaseAdminClient();
  const agora = new Date().toISOString();

  const { error } = await cliente
    .from("inscricao_conferencias")
    .update({
      // `undefined` sai do JSON do update: a coluna fica como está.
      estado: args.estado,
      // Ausente PRESERVA o texto que já estava lá; string vazia é que limpa.
      // Antes isto era `?? null`, então trocar o estado sem redigitar apagava a
      // justificativa de quem tinha escrito antes — mesmo defeito que o `retrato`
      // tinha, e num campo em que a organização registra por que decidiu algo.
      observacao: args.observacao === undefined ? undefined : args.observacao || null,
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
    // Só o que esta gravação mudou — o que ficou ausente foi preservado, não "apagado".
    detalhe: {
      ...(args.estado !== undefined && { estado: args.estado }),
      ...(args.observacao !== undefined && { observacao: args.observacao || null }),
    },
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
      // Ausente PRESERVA o texto que já estava lá; string vazia é que limpa.
      // Antes isto era `?? null`, então trocar o estado sem redigitar apagava a
      // justificativa de quem tinha escrito antes — mesmo defeito que o `retrato`
      // tinha, e num campo em que a organização registra por que decidiu algo.
      observacao: args.observacao === undefined ? undefined : args.observacao || null,
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
  // A divisão conta todo mundo que ainda pode jogar — pendente incluso. Só recusado e
  // desistente saem (ver `contaParaTimes`).
  const elegiveis = inscricoes.filter((i) => contaParaTimes(i.situacao));
  const { times, vagas, sobra } = distribuirTimes(elegiveis.length, config.jogadores_por_time);

  return {
    inscritos: inscricoes.length,
    elegiveis: elegiveis.length,
    aprovados: aprovados.length,
    pendentes: inscricoes.filter((i) => i.situacao === "pendente").length,
    recusados: inscricoes.filter((i) => i.situacao === "recusado").length,
    // Sem "X de 30": não existe teto nesta edição, o número de times é derivado.
    times,
    vagas,
    sobra,
    // Recusado ou desistente que não pagou não é "a receber": a cobrança morreu com a
    // inscrição. Fica fora da conta do caixa sem gravar nada (ver `foraDaCobranca`).
    caixa: fecharCaixa(
      pagamentos.filter((p) => {
        const dono = inscricoes.find((i) => i.id === p.inscricao_id);
        return !dono || !foraDaCobranca(dono.situacao, p.estado);
      }),
    ),
  };
}

// ---------------------------------------------------------------- robô da Riot

/**
 * Filtro de posse de um requisito pelo robô: ninguém gravou, ou quem gravou foi ele.
 *
 * Aspas no valor: o filtro `or` do PostgREST usa vírgula, ponto e parênteses como sintaxe,
 * e com aspas o nome do autor nunca é lido como parte dela.
 */
export const FILTRO_ITEM_DO_ROBO = `conferido_por.is.null,conferido_por.eq."${AUTOR_RIOT}"`;
/** O elo só é do robô se ninguém da organização travou. */
export const FILTRO_ELO_DO_ROBO = "elo_fonte.is.null,elo_fonte.eq.riot";

/**
 * Grava o que o robô decidiu para um inscrito (ver `decidirSincronizacao`).
 *
 * Cada gravação que pode colidir com um organizador é CONDICIONAL numa instrução só: o
 * robô leu, consultou a Riot (segundos) e só então grava — se nesse meio-tempo alguém
 * travou o elo ou deu veredicto num requisito, o WHERE não casa mais e nada muda. O
 * Postgres reavalia o WHERE depois de esperar a trava da linha, então o humano sempre
 * ganha. A auditoria só é gravada quando a linha foi de fato alterada.
 */
export async function aplicarSincronizacao(
  inscricaoId: string,
  decisao: DecisaoDoRobo,
): Promise<{ eloGravado: boolean; itensGravados: number }> {
  const cliente = createSupabaseAdminClient();
  const agora = new Date().toISOString();

  // Colunas de exibição: só o robô escreve nelas, não há com quem colidir.
  const { error: erroColunas } = await cliente.from("inscricoes").update(decisao.colunasRiot).eq("id", inscricaoId);
  if (erroColunas) throw new Error(`Falha ao gravar os dados da Riot: ${erroColunas.message}`);

  let eloGravado = false;
  if (decisao.elo) {
    const { data, error } = await cliente
      .from("inscricoes")
      .update({ elo_verificado: decisao.elo.para, elo_fonte: "riot", pontos: decisao.elo.pontos, atualizado_em: agora })
      .eq("id", inscricaoId)
      .is("elo_congelado", null)
      .or(FILTRO_ELO_DO_ROBO)
      .select("id");

    if (error) throw new Error(`Falha ao atualizar o elo: ${error.message}`);
    eloGravado = (data?.length ?? 0) > 0;
    if (eloGravado && decisao.elo.mudouValor) {
      await registrarAuditoria({
        inscricaoId,
        autor: AUTOR_RIOT,
        acao: "elo_atualizado_pela_riot",
        detalhe: {
          de: decisao.elo.de,
          para: decisao.elo.para,
          pontosDe: decisao.elo.pontosDe,
          pontosPara: decisao.elo.pontos,
        },
      });
    }
  }

  let itensGravados = 0;
  for (const item of decisao.itens) {
    const { data, error } = await cliente
      .from("inscricao_conferencias")
      .update({
        estado: item.estado,
        observacao: item.observacao || null,
        retrato: item.retrato,
        conferido_por: AUTOR_RIOT,
        conferido_em: agora,
        atualizado_em: agora,
      })
      .eq("inscricao_id", inscricaoId)
      .eq("item", item.item)
      .or(FILTRO_ITEM_DO_ROBO)
      .select("inscricao_id");

    if (error) throw new Error(`Falha ao gravar o requisito ${item.item}: ${error.message}`);
    if ((data?.length ?? 0) === 0) continue;

    itensGravados += 1;
    await registrarAuditoria({
      inscricaoId,
      autor: AUTOR_RIOT,
      acao: `conferencia_${item.item}`,
      detalhe: { estado: item.estado, observacao: item.observacao || null },
    });
  }

  return { eloGravado, itensGravados };
}

/** A consulta à Riot deste inscrito falhou: registra para o painel e o põe no fim da fila. */
export async function registrarFalhaDoRobo(inscricaoId: string, mensagem: string): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("inscricoes")
    .update({ riot_status: "erro", riot_erro: mensagem.slice(0, 200), riot_sincronizado_em: new Date().toISOString() })
    .eq("id", inscricaoId);
  if (error) throw new Error(`Falha ao registrar o erro da Riot: ${error.message}`);
}

/**
 * Trava da rodada do robô. Só um por vez: o cron da Vercel pode disparar em dobro, e o
 * botão do painel pode ser apertado enquanto o cron roda — duas rodadas juntas gastariam a
 * cota da Riot em dobro e gravariam a mesma coisa duas vezes.
 *
 * A trava expira sozinha: se a função morrer no meio (tempo esgotado na Vercel), a
 * próxima rodada não fica bloqueada para sempre.
 */
export async function adquirirTravaDoRobo(minutos: number, agoraMs = Date.now()): Promise<boolean> {
  const agora = new Date(agoraMs).toISOString();
  const ate = new Date(agoraMs + minutos * 60_000).toISOString();
  const { data, error } = await createSupabaseAdminClient()
    .from("edicao_config")
    .update({ riot_trava_ate: ate })
    .eq("id", 1)
    // Aspas: a data ISO tem ":" e ".", que no filtro `or` são sintaxe.
    .or(`riot_trava_ate.is.null,riot_trava_ate.lt."${agora}"`)
    .select("id");

  if (error) throw new Error(`Falha ao travar o robô: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/** Solta a trava. Com resumo, registra também a rodada (a simulação não registra). */
export async function liberarTravaDoRobo(resumo?: Record<string, unknown>): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("edicao_config")
    .update({
      riot_trava_ate: null,
      ...(resumo && { riot_ultima_execucao: new Date().toISOString(), riot_ultimo_resumo: resumo }),
    })
    .eq("id", 1);
  if (error) throw new Error(`Falha ao liberar o robô: ${error.message}`);
}

/**
 * Depois de um 429 de verdade, ninguém (robô, botão, formulário) consulta a Riot até o
 * prazo que ela pediu. É o que as políticas da Riot exigem — e a contagem fica no banco
 * porque cada execução do servidor na Vercel não enxerga a memória da outra.
 */
export async function pausarRobo(segundos: number): Promise<void> {
  const ate = new Date(Date.now() + Math.max(1, segundos) * 1000).toISOString();
  const { error } = await createSupabaseAdminClient().from("edicao_config").update({ riot_pausa_ate: ate }).eq("id", 1);
  if (error) throw new Error(`Falha ao pausar o robô: ${error.message}`);
}

export function roboPausado(config: Pick<EdicaoConfig, "riot_pausa_ate">, agoraMs: number): boolean {
  if (!config.riot_pausa_ate) return false;
  const ate = new Date(config.riot_pausa_ate).getTime();
  return Number.isFinite(ate) && ate > agoraMs;
}

// ---------------------------------------------------------------- situação automática

/**
 * Promove UM inscrito a apto, se ele cumpre tudo (ver `situacaoSugerida`).
 *
 * Chamada depois de toda gravação que pode completar a lista: requisito, ficha, pagamento.
 * O UPDATE só casa com quem AINDA está pendente e com a promoção automática ligada — se
 * alguém da organização mudou a situação no meio, nada acontece.
 */
export async function reavaliarSituacao(inscricaoId: string, gatilho: string): Promise<boolean> {
  const cliente = createSupabaseAdminClient();
  const [inscricao, conferencias, pagamento, config] = await Promise.all([
    cliente
      .from("inscricoes")
      .select("situacao,promocao_automatica")
      .eq("id", inscricaoId)
      .maybeSingle<{ situacao: string; promocao_automatica: boolean | null }>(),
    cliente
      .from("inscricao_conferencias")
      .select("item,estado")
      .eq("inscricao_id", inscricaoId)
      .returns<{ item: string; estado: string }[]>(),
    cliente
      .from("inscricao_pagamentos")
      .select("estado")
      .eq("inscricao_id", inscricaoId)
      .maybeSingle<{ estado: string }>(),
    lerConfig(),
  ]);

  if (inscricao.error) throw new Error(`Falha ao ler a inscrição: ${inscricao.error.message}`);
  if (conferencias.error) throw new Error(`Falha ao ler os requisitos: ${conferencias.error.message}`);
  if (pagamento.error) throw new Error(`Falha ao ler o pagamento: ${pagamento.error.message}`);
  if (!inscricao.data) return false;

  const sugerida = situacaoSugerida({
    situacao: inscricao.data.situacao,
    promocaoAutomatica: inscricao.data.promocao_automatica !== false,
    conferencias: conferencias.data ?? [],
    pagamento: pagamento.data ?? null,
    inicioCampeonato: config.inicio_campeonato,
    agoraMs: Date.now(),
  });
  if (sugerida !== "apto") return false;

  return promoverAApto(inscricaoId, gatilho);
}

async function promoverAApto(inscricaoId: string, gatilho: string): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient()
    .from("inscricoes")
    .update({ situacao: "apto", atualizado_em: new Date().toISOString() })
    .eq("id", inscricaoId)
    .eq("situacao", "pendente")
    .eq("promocao_automatica", true)
    .select("id");

  if (error) throw new Error(`Falha ao promover a inscrição: ${error.message}`);
  if ((data?.length ?? 0) === 0) return false;

  await registrarAuditoria({ inscricaoId, autor: AUTOR_SISTEMA, acao: "situacao_promovida", detalhe: { para: "apto", gatilho } });
  return true;
}

/**
 * Passa por todos os pendentes. Roda no cron diário, como rede para o caso de uma
 * reavaliação pontual ter falhado. Na simulação só diz QUEM seria promovido.
 */
export async function reavaliarPendentes(opcoes: { simular?: boolean } = {}): Promise<string[]> {
  const [inscricoes, conferencias, pagamentos, config] = await Promise.all([
    listarInscricoes(),
    listarConferencias(),
    listarPagamentos(),
    lerConfig(),
  ]);
  const agoraMs = Date.now();
  const promovidos: string[] = [];

  for (const i of inscricoes) {
    const sugerida = situacaoSugerida({
      situacao: i.situacao,
      promocaoAutomatica: i.promocao_automatica !== false,
      conferencias: conferencias.filter((c) => c.inscricao_id === i.id),
      pagamento: pagamentos.find((p) => p.inscricao_id === i.id) ?? null,
      inicioCampeonato: config.inicio_campeonato,
      agoraMs,
    });
    if (sugerida !== "apto") continue;
    // O lote acima foi lido de uma vez e envelhece enquanto o laço anda. Quem é candidato
    // é reavaliado com leitura FRESCA antes de ser promovido.
    if (opcoes.simular || (await reavaliarSituacao(i.id, "rotina_diaria"))) promovidos.push(i.riot_id);
  }
  return promovidos;
}
