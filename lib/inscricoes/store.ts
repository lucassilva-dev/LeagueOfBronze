// Trava de build: se este módulo for importado por um componente "use client",
// a compilação FALHA. Aqui trafega e-mail, WhatsApp e Discord de terceiros — nada
// disso pode ser arrastado para o navegador num refactor futuro.
import "server-only";

import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/data-store";
import {
  alertasDoInscrito,
  assinaturaDoAlerta,
  cienciaDoAlerta,
  lerAlertasCientes,
  type Alerta,
  type CienciaDoAlerta,
  type CodigoDoAlerta,
} from "@/lib/inscricoes/alertas";
import { ErroDeConflito } from "@/lib/inscricoes/conflito";
import {
  ESTADOS_PENDENTES,
  lugarNaFila,
  montarFila,
  motivoParaManterAVaga,
  prazoDoChamado,
  previsaoParaNovaInscricao,
  type Fila,
  type LugarNaFila,
} from "@/lib/inscricoes/fila";
import { estaFora, foraDaCobranca } from "@/lib/inscricoes/pagamento";
import {
  contaParaTimes,
  distribuirTimes,
  ESTADOS_COM_DINHEIRO,
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
import { leituraParaCongelar } from "@/lib/draft/elo-da-inscricao";

export { AUTOR_RIOT, AUTOR_SISTEMA, ErroDeConflito };

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
  /** Teto de times (40 jogadores = 8 na 4ª). Nulo = sem teto. Opcional: banco sem a migração. */
  max_times?: number | null;
  orcamento_por_time: number;
  min_ranqueadas: number;
  dias_no_grupo: number;
  prazo_pagamento_dias: number;
  /**
   * Prazo de pagamento dos titulares, uma data só para todos (D3: fim de 31/10/2026 em
   * Brasília). Nulo = o comportamento antigo, `prazo_pagamento_dias` contados do envio.
   * Opcional: banco sem a migração — a leitura é `select *` e a coluna simplesmente falta.
   */
  prazo_pagamento_ate?: string | null;
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
  situacao: "pendente" | "apto" | "recusado" | "desistiu" | "sobra" | "excluido";
  organizador: boolean;
  /** NOTA INTERNA da organização. O jogador nunca vê (desde 2026-10-22, decisão G). */
  observacao: string | null;
  /**
   * "Recado para o jogador": o único texto da ficha que aparece em Minha inscrição.
   * Opcional: banco sem a migração não tem a coluna.
   */
  recado_jogador?: string | null;
  /**
   * De onde veio o `elo_verificado`: `riot` (o robô atualiza), `organizacao` (travado à
   * mão — o robô não mexe) ou nulo (ninguém confirmou ainda, ou foi gravado antes do robô).
   */
  elo_fonte?: "riot" | "organizacao" | null;
  /** Falso quando a organização tirou a pessoa de apto: o sistema não a promove de novo. */
  promocao_automatica?: boolean;
  /**
   * Ciência da organização nos alertas: código → { texto, por, em } (ver `lerAlertasCientes`
   * em lib/inscricoes/alertas.ts, que é quem lê). `unknown` porque vem do jsonb como estiver;
   * ausente = banco sem a migração.
   */
  alertas_cientes?: unknown;
  /** A trava das gravações da ciência (`gravarCiencias`). Vem no `select *`. */
  atualizado_em?: string | null;
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

/** Duas datas da configuração são o mesmo instante? (A mesma hora escrita com outro fuso é a mesma.) */
function mesmoInstante(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  const ma = new Date(a).getTime();
  const mb = new Date(b).getTime();
  return Number.isFinite(ma) && Number.isFinite(mb) ? ma === mb : a === b;
}

/**
 * Grava a configuração da edição. Além do update, três coisas que não podem depender de a
 * tela lembrar:
 *
 *  1. **Fechar é fechar, sem apagar o planejado.** «Fechar inscrições» e «Abrir» mandam só
 *     a chave, e a data de fechamento NÃO é tocada por eles: a planejada (15/11, digamos)
 *     sobrevive a fechar em 25/10 e reabrir em 27/10, e fecha a janela sozinha no dia. Antes,
 *     fechar carimbava «agora» por cima dela e reabrir zerava o carimbo — a janela ficava
 *     aberta para sempre, cobrando Pix depois do draft (DIFF-BE-02). O que impede o site de
 *     anunciar «EM BREVE» depois de fechar (CEN-02) é a leitura: chave desligada com a
 *     abertura no passado é «encerrada» (`estadoDaJanela`). Para isso a abertura precisa
 *     estar registrada: abrir (ou fechar uma janela aberta) sem abertura no passado grava
 *     agora como abertura — o registro de quando o formulário abriu. Data enviada junto
 *     vale como veio. Reabrir com o fechamento já vencido deixa a janela «encerrada»; a
 *     tela avisa e pede para adiar ou apagar a data.
 *  2. **Início novo, contagem nova.** A contagem de partidas do item (e) é da janela do
 *     início antigo; mudar o início zera a contagem para o robô recontar na janela nova.
 *  3. **Auditoria.** Quem mudou o quê, com o valor de antes — abrir/fechar, taxa, datas,
 *     teto de times mudam o formulário público, o robô e o draft.
 */
export async function salvarConfig(patch: Partial<EdicaoConfig>, autor: string = AUTOR_SISTEMA): Promise<EdicaoConfig> {
  const cliente = createSupabaseAdminClient();
  const antes = await lerConfig();
  const agoraMs = Date.now();
  const efetivo: Partial<EdicaoConfig> = { ...patch };

  if (patch.inscricoes_abertas !== undefined && patch.abertura_inscricoes === undefined) {
    const aberturaMs = antes.abertura_inscricoes ? new Date(antes.abertura_inscricoes).getTime() : NaN;
    const aberturaRegistrada = Number.isFinite(aberturaMs) && aberturaMs <= agoraMs;
    const abrindo = patch.inscricoes_abertas && !antes.inscricoes_abertas;
    const fechandoAberta = !patch.inscricoes_abertas && antes.inscricoes_abertas;
    if ((abrindo || fechandoAberta) && !aberturaRegistrada) {
      efetivo.abertura_inscricoes = new Date(agoraMs).toISOString();
    }
  }

  // ANTES do update: se zerar falhar, nada foi gravado e a pessoa tenta de novo. Na ordem
  // inversa, a configuração ficava salva com a contagem velha — e salvar de novo já não
  // zeraria, porque o início gravado seria o novo.
  if (efetivo.inicio_campeonato !== undefined && !mesmoInstante(antes.inicio_campeonato, efetivo.inicio_campeonato)) {
    const { error: erroContagem } = await cliente
      .from("inscricoes")
      .update({ riot_partidas_janela: null })
      .not("riot_partidas_janela", "is", null);
    if (erroContagem) throw new Error(`Falha ao zerar a contagem de partidas do item (e): ${erroContagem.message}`);
  }

  const { data, error } = await cliente
    .from("edicao_config")
    .update({ ...efetivo, atualizado_em: new Date(agoraMs).toISOString() })
    .eq("id", 1)
    .select("*")
    .single<EdicaoConfig>();

  if (error) {
    // Mesma janela entre o deploy e a migração, para o prazo único dos titulares (D3).
    if (efetivo.prazo_pagamento_ate !== undefined && colunaQueFalta(error, "prazo_pagamento_ate")) {
      throw new ErroDeRegra(
        "O prazo único de pagamento ainda não pode ser gravado: falta a migração do banco (coluna prazo_pagamento_ate). Nada foi salvo.",
      );
    }
    throw new Error(`Falha ao salvar a configuração: ${error.message}`);
  }

  const chaves = Object.keys(efetivo) as (keyof EdicaoConfig)[];
  await registrarAuditoria({
    autor,
    acao: "config",
    detalhe: {
      antes: Object.fromEntries(chaves.map((k) => [k, antes[k] ?? null])),
      depois: Object.fromEntries(chaves.map((k) => [k, efetivo[k] ?? null])),
    },
  });

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
): Promise<Inscricao & { lugarNaFila: LugarNaFila | null }> {
  const config = await lerConfig();
  // A data de fechamento também fecha — não só a chave. Antes a data só escolhia o aviso,
  // e a inscrição seguia aberta depois dela até alguém lembrar de desligar.
  //
  // Cada regra daqui sai com um `codigo` estável (ver `ErroDeRegra`): o texto é fixo em
  // português, e o formulário traduz pelo código (`inscricao.erros` no dicionário).
  const janela = estadoDaJanela(config, Date.now());
  if (janela !== "aberta") {
    throw janela === "encerrada"
      ? new ErroDeRegra("As inscrições estão encerradas.", "inscricoes_encerradas")
      : new ErroDeRegra("As inscrições não estão abertas no momento.", "inscricoes_fechadas");
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
        "muitas_inscricoes_origem",
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
      throw new ErroDeRegra(
        "Você já tem uma inscrição nesta edição. Para corrigir algo nela, fale com a organização.",
        "ja_inscrito",
      );
    }
  }

  // Depois dos freios, para quem já foi barrado não gastar consulta à Riot.
  const conta = await conferirContaNaRiot(dados.nick, dados.tag, config, dono);
  if (conta.tipo === "nao_encontrado") {
    throw new ErroDeRegra(
      `Não encontramos o Riot ID ${dados.nick}#${dados.tag} na Riot. Confira o nick e a tag exatamente como aparecem no cliente do LoL (a tag é o que vem depois do #). Se tiver certeza de que está certo, fale com a organização.`,
      "riot_id_inexistente",
    );
  }

  // A mesma CONTA já inscrita com outra grafia. O índice único é sobre o Riot ID escrito, e a
  // Riot acha "betyclarao#br1" e "Bety Clarão#BR1" como a mesma conta (sem acento, espaço nem
  // caixa): o PUUID é o que identifica a conta. Sem índice único no banco de propósito — o
  // PUUID muda com a chave da API e o robô o regrava; uma colisão lá derrubaria a rodada.
  if (conta.tipo === "ok") {
    const { count, error: erroConta } = await cliente
      .from("inscricoes")
      .select("id", { count: "exact", head: true })
      .eq("puuid", conta.puuid);
    if (erroConta) throw new Error(`Falha ao conferir a conta da Riot: ${erroConta.message}`);
    if ((count ?? 0) > 0) {
      throw new ErroDeRegra(
        "Essa conta da Riot já está inscrita. Se foi você, procure a organização em vez de se inscrever de novo.",
        "conta_riot_ja_inscrita",
      );
    }
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
      const [alvo, codigo] = error.message.includes("riot_id")
        ? ["Esse Riot ID já está inscrito.", "riot_id_ja_inscrito"]
        : error.message.includes("discord")
          ? ["Esse Discord já está inscrito.", "discord_ja_inscrito"]
          : ["Esse e-mail já está inscrito.", "email_ja_inscrito"];
      throw new ErroDeRegra(`${alvo} Se foi você, procure a organização em vez de se inscrever de novo.`, codigo);
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

  /*
   * Vagas cheias: a inscrição entra na fila de reserva, e reserva só paga se for chamado
   * (D2). O gatilho abriu o pagamento com prazo, como para todo mundo — o alinhamento tira
   * o prazo de quem caiu na fila. Falhar aqui NÃO desfaz a inscrição (ela já está gravada):
   * a resposta sai sem o lugar, a tela não mostra o Pix, e o próximo alinhamento (qualquer
   * gravação do painel) acerta o prazo.
   */
  let lugarNaFilaDaNova: LugarNaFila | null = null;
  try {
    const { fila } = await alinharCobrancaComAFila(AUTOR_SISTEMA);
    lugarNaFilaDaNova = lugarNaFila(fila, data.id);
  } catch (erro) {
    console.error("[inscricoes] inscrição gravada, mas a fila não foi alinhada", erro);
  }

  return { ...data, lugarNaFila: lugarNaFilaDaNova };
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
 *
 * Grava ANTES de liberar e reconta DEPOIS de gravar. Contar e só então gravar deixava uma
 * rajada simultânea inteira passar: os 40 envios contavam zero ao mesmo tempo, os 40
 * consultavam a Riot, metade levava 429 e o robô ficava pausado. Recontando com a própria
 * linha já gravada, a k-ésima tentativa enxerga pelo menos k linhas — no máximo o teto
 * passa. (Na rajada perfeita pode passar menos; aí a inscrição segue sem conferir, como
 * quando a Riot está fora do ar.) A primeira contagem só evita gravar linha à toa quando o
 * teto já foi batido.
 */
async function podeConsultarARiot(dono: { jogadorId: string; ipHash: string }): Promise<boolean> {
  try {
    const cliente = createSupabaseAdminClient();
    const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const contar = async () => {
      const { count, error } = await cliente
        .from("inscricao_consultas_riot")
        .select("id", { count: "exact", head: true })
        // Os dois valores são gerados no servidor (UUID da sessão e hash hexadecimal do IP).
        .or(`jogador_id.eq.${dono.jogadorId},ip_hash.eq.${dono.ipHash}`)
        .gte("ocorrido_em", desde);
      if (error) throw new Error(error.message);
      return count ?? 0;
    };

    if ((await contar()) >= CONSULTAS_RIOT_POR_HORA) return false;

    const { error: erroRegistro } = await cliente
      .from("inscricao_consultas_riot")
      .insert({ jogador_id: dono.jogadorId, ip_hash: dono.ipHash });
    if (erroRegistro) throw new Error(erroRegistro.message);

    return (await contar()) <= CONSULTAS_RIOT_POR_HORA;
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
  /**
   * "Recado para o jogador", escrito pela organização. A `observacao` da ficha NÃO vem
   * mais: virou nota interna (decisão G, 2026-10-22).
   */
  recado: string | null;
  /**
   * Titular, fila de reserva (com a posição) ou fora (D1). Só o lugar DELE — nada sobre os
   * outros inscritos sai daqui. `indefinido` = a leitura da fila falhou: na dúvida a tela não
   * cobra (ele pode ser reserva, e reserva só paga se for chamado — D2).
   */
  fila: { tipo: "titular" } | { tipo: "reserva"; posicao: number } | { tipo: "fora" } | { tipo: "indefinido" };
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
 *
 * As colunas são listadas uma a uma, de propósito: nem a nota interna (`observacao`), nem
 * contato, nem o que o robô da Riot viu saem do banco nesta leitura. O `recado_jogador` vai
 * na lista, mas o banco pode ainda não ter a coluna (o deploy chega antes da migração):
 * nesse caso a leitura é refeita sem ela e a tela segue de pé, sem recado.
 */
export async function minhaInscricao(jogadorId: string): Promise<MinhaInscricao | null> {
  const cliente = createSupabaseAdminClient();

  type Linha = {
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
    recado_jogador?: string | null;
  };
  const COLUNAS =
    "id,criado_em,riot_id,elo_declarado,elo_verificado,elo_congelado,rota_primaria,rota_secundaria,disponibilidade,situacao";
  const ler = (colunas: string) =>
    cliente.from("inscricoes").select(colunas).eq("jogador_id", jogadorId).maybeSingle<Linha>();

  let lida = await ler(`${COLUNAS},recado_jogador`);
  if (lida.error && colunaQueFalta(lida.error, "recado_jogador")) lida = await ler(COLUNAS);
  const { data: inscricao, error } = lida;

  if (error) throw new Error(`Falha ao ler a inscrição: ${error.message}`);
  if (!inscricao) return null;

  /*
   * O lugar na fila (D1) depende de todos os ativos: lido aqui, devolvido só o dele. Se uma
   * das duas leituras falha (as linhas da fila, ou o teto de vagas da configuração), o lugar
   * fica INDEFINIDO e a tela segue de pé sem o Pix: valer como titular abria a cobrança a
   * quem está na fila de reserva (D2), e derrubar a tela inteira escondia também o resto da
   * ficha. A falha fica no log.
   */
  let fila: MinhaInscricao["fila"];
  try {
    const [linhasDaFila, configDaFila] = await Promise.all([lerLinhasDaFila(), lerVagasDaConfig()]);
    const lugar = lugarNaFila(montarFila(linhasDaFila, configDaFila), inscricao.id);
    fila = lugar.tipo === "reserva" ? { tipo: "reserva", posicao: lugar.posicao } : { tipo: lugar.tipo };
  } catch (erro) {
    console.error("[inscricoes] lugar na fila indisponível para a Minha inscrição", erro);
    // Quem já está fora (recusado, desistente, excluído) continua fora: isso a ficha diz sozinha.
    fila = estaFora(inscricao.situacao) ? { tipo: "fora" } : { tipo: "indefinido" };
  }

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

  // Falha de leitura NÃO é "sem pagamento" nem "sem requisitos": engolida, a tela escondia o
  // Pix, o «JÁ PAGUEI» e a lista de requisitos sem aviso — e o jogador não tinha motivo
  // para recarregar. Estourando, a rota responde erro e a tela diz que não carregou.
  if (pag.error) throw new Error(`Falha ao ler o pagamento: ${pag.error.message}`);
  if (conf.error) throw new Error(`Falha ao ler os requisitos: ${conf.error.message}`);

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
    recado: inscricao.recado_jogador?.trim() || null,
    fila,
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

// ---------------------------------------------------------------- fila de reserva (D1 a D5)

type LinhaDaFila = { id: string; criado_em: string; situacao: string; organizador: boolean };

async function lerLinhasDaFila(): Promise<LinhaDaFila[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("inscricoes")
    .select("id,criado_em,situacao,organizador")
    .order("criado_em", { ascending: true })
    .returns<LinhaDaFila[]>();

  if (error) throw new Error(`Falha ao ler a fila de inscrições: ${error.message}`);
  return Array.isArray(data) ? data : [];
}

/**
 * Só o que a fila precisa da configuração (teto de times e jogadores por time), com as
 * colunas nomeadas: é a leitura da Minha inscrição, que não puxa nada com `*`. Estoura na
 * falha e com a configuração vazia, como `lerConfig`: "sem teto" aqui faria todo ativo valer
 * como titular — e o reserva receber o Pix. Quem chama decide o que fazer na dúvida.
 */
async function lerVagasDaConfig(): Promise<{ max_times?: number | null; jogadores_por_time?: number | null }> {
  const { data, error } = await createSupabaseAdminClient()
    .from("edicao_config")
    .select("max_times,jogadores_por_time")
    .eq("id", 1)
    .maybeSingle<{ max_times: number | null; jogadores_por_time: number }>();
  if (error) throw new Error(`Falha ao ler o teto de vagas: ${error.message}`);
  if (!data) throw new Error("edicao_config vazia: rode supabase/schema-4a-edicao.sql.");
  return data;
}

/**
 * O erro do PostgREST é "a coluna não existe"? (42703 do Postgres, ou a mensagem citando a
 * coluna.) Serve à janela entre o deploy e a migração: o código novo pede a coluna nova, o
 * banco ainda não a tem, e a leitura é refeita sem ela em vez de derrubar a tela.
 */
function colunaQueFalta(erro: { code?: string; message?: string }, coluna: string): boolean {
  return erro.code === "42703" || (erro.message ?? "").includes(coluna);
}

/** A fila de agora (ver `montarFila`), lida do banco. Estoura na falha de leitura. */
export async function lerFila(): Promise<Fila> {
  const [linhas, config] = await Promise.all([lerLinhasDaFila(), lerConfig()]);
  return montarFila(linhas, config);
}

/**
 * Onde cairia quem se inscrever agora — para o formulário avisar ANTES do envio que as
 * vagas estão cheias (D2). Nunca lança: na dúvida (banco fora, sem chaves) devolve nulo e a
 * página segue como antes; o lugar de verdade é dado depois do envio.
 */
export async function previsaoParaNovoInscrito(): Promise<
  (({ tipo: "titular" } | { tipo: "reserva"; posicao: number }) & { vagas: number | null }) | null
> {
  if (!isSupabaseConfigured()) return null;
  try {
    const fila = await lerFila();
    return { ...previsaoParaNovaInscricao(fila), vagas: fila.vagas };
  } catch (erro) {
    console.error("[inscricoes] previsão da fila indisponível", erro);
    return null;
  }
}

/**
 * Deixa o prazo de cada cobrança em aberto de acordo com a fila de AGORA (D2 e D4).
 *
 *  - **Reserva** com cobrança em aberto e prazo: o prazo some (`vence_em` nulo). Reserva
 *    só paga se for chamado.
 *  - **Titular** (não organizador) com cobrança em aberto e SEM prazo: foi chamado da fila —
 *    o prazo passa a valer (`prazoDoChamado`: o prazo da edição se ainda não venceu, senão
 *    agora + 48 h).
 *
 * Não precisa saber o que mudou: o "sem prazo" do titular É o rastro de quem estava na
 * fila. Por isso serve a toda ação que mexe na fila — situação na ficha, organizador, teto
 * de times, inscrição nova, passar a vaga — e roda na MESMA ação que tirou o outro da
 * vaga. Pago, isento, estornado e cancelado nunca são tocados, e prazo já gravado de
 * titular também não (D6 cuida do alinhamento inicial).
 *
 * Cada gravação é condicional ao estado lido (em aberto, com ou sem prazo): duas rodadas
 * juntas não gravam duas vezes, e só a que gravou escreve auditoria.
 */
export async function alinharCobrancaComAFila(
  autor: string,
  agoraMs = Date.now(),
): Promise<{ fila: Fila; chamados: { inscricaoId: string; venceEm: string }[]; paraAFila: string[] }> {
  const cliente = createSupabaseAdminClient();
  const [linhas, config, pagamentos] = await Promise.all([
    lerLinhasDaFila(),
    lerConfig(),
    cliente
      .from("inscricao_pagamentos")
      .select("inscricao_id,estado,vence_em")
      .in("estado", [...ESTADOS_PENDENTES])
      .returns<{ inscricao_id: string; estado: string; vence_em: string | null }[]>(),
  ]);
  if (pagamentos.error) throw new Error(`Falha ao ler os pagamentos: ${pagamentos.error.message}`);

  const fila = montarFila(linhas, config);
  const organizador = new Set(linhas.filter((l) => l.organizador).map((l) => l.id));
  const chamados: { inscricaoId: string; venceEm: string }[] = [];
  const paraAFila: string[] = [];
  const agora = new Date(agoraMs).toISOString();

  for (const p of pagamentos.data ?? []) {
    if (!ESTADOS_PENDENTES.includes(p.estado)) continue;
    const lugar = lugarNaFila(fila, p.inscricao_id);

    if (lugar.tipo === "reserva" && p.vence_em !== null) {
      const { data, error } = await cliente
        .from("inscricao_pagamentos")
        .update({ vence_em: null, atualizado_em: agora })
        .eq("inscricao_id", p.inscricao_id)
        .in("estado", [...ESTADOS_PENDENTES])
        .not("vence_em", "is", null)
        .select("inscricao_id");
      if (error) throw new Error(`Falha ao tirar o prazo da reserva: ${error.message}`);
      if ((data?.length ?? 0) === 0) continue;
      paraAFila.push(p.inscricao_id);
      await registrarAuditoria({
        inscricaoId: p.inscricao_id,
        autor,
        acao: "foi_para_a_fila",
        detalhe: { posicao: lugar.posicao, prazoAnterior: p.vence_em },
      });
      continue;
    }

    if (lugar.tipo === "titular" && p.vence_em === null && !organizador.has(p.inscricao_id)) {
      const venceEm = prazoDoChamado(config, agoraMs);
      const { data, error } = await cliente
        .from("inscricao_pagamentos")
        .update({ vence_em: venceEm, atualizado_em: agora })
        .eq("inscricao_id", p.inscricao_id)
        .in("estado", [...ESTADOS_PENDENTES])
        .is("vence_em", null)
        .select("inscricao_id");
      if (error) throw new Error(`Falha ao gravar o prazo de quem foi chamado: ${error.message}`);
      if ((data?.length ?? 0) === 0) continue;
      chamados.push({ inscricaoId: p.inscricao_id, venceEm });
      await registrarAuditoria({ inscricaoId: p.inscricao_id, autor, acao: "chamado_da_fila", detalhe: { venceEm } });
    }
  }

  return { fila, chamados, paraAFila };
}

/**
 * "Passar a vaga ao 1º da fila" (D5): o titular que não pagou até o prazo vira desistente,
 * com auditoria, e o próximo da fila é chamado na mesma ação (D4).
 *
 * Nada disso acontece sozinho: é um clique, com confirmação, de quem tem o escopo. As
 * condições são as mesmas que o painel usa para mostrar o botão (`motivoParaManterAVaga`)
 * e são conferidas de novo AQUI, com leitura fresca: organizador nunca perde a vaga,
 * "declarado" pede abrir o extrato antes, e prazo que não venceu não tira ninguém.
 *
 * O pagamento dele não é tocado (recusar/desistir não cancela pagamento): fica
 * «aguardando» e sai da cobrança na leitura (`foraDaCobranca`).
 */
export async function passarVagaPorFaltaDePagamento(
  inscricaoId: string,
  autor: string,
  agoraMs = Date.now(),
): Promise<{ chamados: { inscricaoId: string; riotId: string | null; venceEm: string }[]; filaAlinhada: boolean }> {
  const cliente = createSupabaseAdminClient();
  const [fila, ficha, pagamento] = await Promise.all([
    lerFila(),
    cliente
      .from("inscricoes")
      .select("id,riot_id,situacao,organizador")
      .eq("id", inscricaoId)
      .maybeSingle<{ id: string; riot_id: string; situacao: Inscricao["situacao"]; organizador: boolean }>(),
    cliente
      .from("inscricao_pagamentos")
      .select("estado,vence_em")
      .eq("inscricao_id", inscricaoId)
      .maybeSingle<{ estado: string; vence_em: string | null }>(),
  ]);

  if (ficha.error) throw new Error(`Falha ao ler a ficha: ${ficha.error.message}`);
  if (pagamento.error) throw new Error(`Falha ao ler o pagamento: ${pagamento.error.message}`);
  if (!ficha.data) throw new ErroDeRegra("Inscrição não encontrada.");

  const motivo = motivoParaManterAVaga(
    {
      lugar: lugarNaFila(fila, inscricaoId),
      organizador: ficha.data.organizador === true,
      situacao: ficha.data.situacao,
      pagamento: pagamento.data ?? null,
    },
    agoraMs,
  );
  if (motivo) throw new ErroDeRegra(`A vaga não foi passada: ${motivo}`);

  // A situação lida vai NA instrução: se outro organizador mudou a ficha no meio, nada muda.
  const agora = new Date(agoraMs).toISOString();
  const { data, error } = await cliente
    .from("inscricoes")
    .update({ situacao: "desistiu", promocao_automatica: true, atualizado_em: agora })
    .eq("id", inscricaoId)
    .eq("situacao", ficha.data.situacao)
    .select("id");
  if (error) throw new Error(`Falha ao liberar a vaga: ${error.message}`);
  if ((data?.length ?? 0) === 0) {
    throw new ErroDeConflito(
      "A situação desta inscrição mudou desde que você abriu a tela. Nada foi gravado: confira o valor atual e decida de novo.",
    );
  }

  await registrarAuditoria({
    inscricaoId,
    autor,
    acao: "vaga_perdida_por_falta_de_pagamento",
    detalhe: {
      motivo: "perdeu a vaga por falta de pagamento",
      situacaoAnterior: ficha.data.situacao,
      venceEm: pagamento.data?.vence_em ?? null,
    },
  });

  // A vaga JÁ foi liberada: uma falha daqui em diante não pode virar "não foi possível" na
  // tela, senão a organização tentaria de novo sobre algo feito. O próximo alinhamento (toda
  // gravação do painel) chama quem ficou sem prazo.
  let chamados: { inscricaoId: string; venceEm: string }[];
  try {
    chamados = (await alinharCobrancaComAFila(autor, agoraMs)).chamados;
  } catch (erro) {
    console.error("[inscricoes] vaga liberada, mas o próximo da fila não foi chamado", erro);
    return { chamados: [], filaAlinhada: false };
  }
  if (chamados.length === 0) return { chamados: [], filaAlinhada: true };

  const nomes = await cliente
    .from("inscricoes")
    .select("id,riot_id")
    .in(
      "id",
      chamados.map((c) => c.inscricaoId),
    )
    .returns<{ id: string; riot_id: string }[]>();
  const riotIdDe = (id: string) => (nomes.error ? null : (nomes.data ?? []).find((n) => n.id === id)?.riot_id ?? null);

  return { chamados: chamados.map((c) => ({ ...c, riotId: riotIdDe(c.inscricaoId) })), filaAlinhada: true };
}

/**
 * O e-mail da conta de um inscrito — para a organização liberar o login trancado (F) sem
 * receber nem mandar e-mail pela tela.
 */
export async function emailDaInscricao(inscricaoId: string): Promise<{ email: string; riotId: string } | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("inscricoes")
    .select("email,riot_id")
    .eq("id", inscricaoId)
    .maybeSingle<{ email: string; riot_id: string }>();

  if (error) throw new Error(`Falha ao ler a inscrição: ${error.message}`);
  return data ? { email: data.email, riotId: data.riot_id } : null;
}

// ---------------------------------------------------------------- ciência dos alertas

/** Janela entre o deploy e a migração: o código pede a coluna, o banco ainda não a tem. */
const CIENCIA_SEM_COLUNA =
  "A ciência dos alertas ainda não pode ser gravada: falta a migração do banco (coluna alertas_cientes). Nada foi gravado.";

/** Quantas vezes a gravação relê e tenta de novo quando a linha mudou no meio. */
const TENTATIVAS_DA_CIENCIA = 3;

/**
 * Os alertas de AGORA de um inscrito, calculados exatamente como o painel calcula (a mesma
 * `alertasDoInscrito`, com a lista inteira, as conferências dele, o pagamento com o prazo e
 * o lugar na fila). Nulo: a inscrição não existe.
 */
async function alertasAtuaisDoInscrito(
  inscricaoId: string,
  agoraMs: number,
): Promise<{ inscrito: Inscricao; alertas: Alerta[] } | null> {
  const cliente = createSupabaseAdminClient();
  const [inscritos, config, conferencias, pagamento] = await Promise.all([
    listarInscricoes(),
    lerConfig(),
    cliente
      .from("inscricao_conferencias")
      .select("item,estado,conferido_por")
      .eq("inscricao_id", inscricaoId)
      .returns<{ item: string; estado: string; conferido_por: string | null }[]>(),
    // Os mesmos campos que o painel tem do pagamento: os carimbos entram na assinatura dos
    // alertas de dinheiro (`PagamentoParaAlerta`), e a assinatura daqui tem de ser a da tela.
    cliente
      .from("inscricao_pagamentos")
      .select("estado,valor_centavos,declarado_em,conferido_em,vence_em")
      .eq("inscricao_id", inscricaoId)
      .maybeSingle<{
        estado: string;
        valor_centavos: number;
        declarado_em: string | null;
        conferido_em: string | null;
        vence_em: string | null;
      }>(),
  ]);
  if (conferencias.error) throw new Error(`Falha ao ler as conferências: ${conferencias.error.message}`);
  if (pagamento.error) throw new Error(`Falha ao ler o pagamento: ${pagamento.error.message}`);

  const inscrito = inscritos.find((i) => i.id === inscricaoId);
  if (!inscrito) return null;
  const alertas = alertasDoInscrito({
    inscrito,
    conferencias: conferencias.data ?? [],
    pagamento: pagamento.data ?? null,
    config,
    agoraMs,
    lugar: lugarNaFila(montarFila(inscritos, config), inscricaoId),
    inscritos,
  });
  return { inscrito, alertas };
}

/**
 * Grava o mapa novo de ciências SÓ se a linha ainda é a que foi lida (`atualizado_em` na
 * mesma instrução): duas ciências no mesmo inscrito ao mesmo tempo — o financeiro numa, a
 * conferência noutra — não apagam uma à outra. Devolve se gravou.
 */
async function gravarCiencias(
  lida: Readonly<Pick<Inscricao, "id" | "atualizado_em">>,
  cientes: Record<string, unknown>,
  agoraMs: number,
): Promise<boolean> {
  let gravacao = createSupabaseAdminClient()
    .from("inscricoes")
    .update({ alertas_cientes: cientes, atualizado_em: new Date(agoraMs).toISOString() })
    .eq("id", lida.id);
  gravacao = lida.atualizado_em ? gravacao.eq("atualizado_em", lida.atualizado_em) : gravacao.is("atualizado_em", null);
  const { data, error } = await gravacao.select("id");
  if (error) {
    if (colunaQueFalta(error, "alertas_cientes")) throw new ErroDeRegra(CIENCIA_SEM_COLUNA);
    throw new Error(`Falha ao gravar a ciência do alerta: ${error.message}`);
  }
  return (data?.length ?? 0) > 0;
}

/** O que está na coluna, como objeto que dá para copiar — preserva o que não é deste código. */
function cienciasGravadas(valor: unknown): Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor) ? { ...(valor as Record<string, unknown>) } : {};
}

/**
 * «Dar ciência» de um alerta: a organização viu e aceitou AQUELE alerta, com AQUELA
 * assinatura — o texto e os fatos que o disparam (ver `CienciaDoAlerta` em
 * lib/inscricoes/alertas.ts). Os alertas são recalculados aqui, com leitura fresca: só se
 * aceita ciência de um alerta que EXISTE agora com o código, o texto e a assinatura que a
 * tela mostrou. Senão, `ErroDeConflito` (409) e nada muda — a tela velha não dá ciência de
 * "declarou Ouro, a Riot mostra Diamante" quando a Riot já mostra Mestre, nem do «aprovado sem
 * pagamento» de antes do jogador declarar.
 *
 * Quem pode dar ciência de qual alerta (financeiro × conferência) é conferido na rota,
 * antes de chegar aqui (`escopoDaCiencia`).
 */
export async function darCienciaDoAlerta(args: {
  inscricaoId: string;
  codigo: CodigoDoAlerta;
  texto: string;
  /**
   * A assinatura que a tela calculou (`assinaturaDoAlerta`). Ausente = a tela só mandou o
   * texto (o alerta não tem fatos fora dele, ou é uma aba aberta antes da assinatura).
   */
  assinatura?: string;
  autor: string;
  agoraMs?: number;
}): Promise<{ ciencia: CienciaDoAlerta; jaTinha: boolean }> {
  const agoraMs = args.agoraMs ?? Date.now();

  for (let tentativa = 0; tentativa < TENTATIVAS_DA_CIENCIA; tentativa += 1) {
    const atual = await alertasAtuaisDoInscrito(args.inscricaoId, agoraMs);
    if (!atual) throw new ErroDeRegra("Inscrição não encontrada.");
    // `select *` sem a coluna: a chave nem vem.
    if (atual.inscrito.alertas_cientes === undefined) throw new ErroDeRegra(CIENCIA_SEM_COLUNA);

    const alerta = atual.alertas.find((a) => a.codigo === args.codigo);
    if (!alerta) {
      throw new ErroDeConflito(
        "Esse alerta não aparece mais para este inscrito — algo mudou desde que você abriu a tela. Nada foi gravado.",
      );
    }
    if (alerta.texto !== args.texto) {
      throw new ErroDeConflito(
        `Esse alerta mudou desde que você abriu a tela. Agora ele diz: «${alerta.texto}» Nada foi gravado: leia de novo e, se for o caso, dê ciência outra vez.`,
      );
    }
    // O mesmo texto, outros fatos: o jogador declarou, alguém mexeu no pagamento, o prazo
    // mudou. A tela não pode dar ciência de um fato que ela ainda não mostrou.
    const assinatura = assinaturaDoAlerta(alerta);
    // Alerta com fatos além do texto e pedido SEM assinatura: é uma tela de antes da
    // assinatura (aba aberta antes do deploy). Gravar a assinatura de agora daria ciência de
    // fatos que essa tela nunca mostrou.
    if (args.assinatura === undefined && assinatura !== alerta.texto) {
      throw new ErroDeConflito(
        "Esta tela está desatualizada para dar ciência deste alerta. Recarregue a página e dê ciência de novo.",
      );
    }
    if (args.assinatura !== undefined && args.assinatura !== assinatura) {
      throw new ErroDeConflito(
        "Esse alerta diz o mesmo, mas o que está por trás dele mudou desde que você abriu a tela (o pagamento, o prazo ou um requisito). Nada foi gravado: confira de novo e, se for o caso, dê ciência outra vez.",
      );
    }

    // Outra pessoa deu a mesma ciência no meio: está feito, sem gravar nem auditar de novo.
    const existente = cienciaDoAlerta(alerta, atual.inscrito.alertas_cientes);
    if (existente) return { ciencia: existente, jaTinha: true };

    // A assinatura só é gravada quando vai além do texto: sem fatos, o texto já é ela.
    const comFatos = assinatura !== alerta.texto;
    const ciencia: CienciaDoAlerta = {
      texto: alerta.texto,
      ...(comFatos && { assinatura }),
      por: args.autor,
      em: new Date(agoraMs).toISOString(),
    };
    const cientes = { ...cienciasGravadas(atual.inscrito.alertas_cientes), [args.codigo]: ciencia };
    if (!(await gravarCiencias(atual.inscrito, cientes, agoraMs))) continue;

    await registrarAuditoria({
      inscricaoId: args.inscricaoId,
      autor: args.autor,
      acao: "alerta_ciencia",
      detalhe: { codigo: args.codigo, texto: alerta.texto, ...(comFatos && { assinatura }) },
    });
    return { ciencia, jaTinha: false };
  }

  throw new ErroDeConflito(
    "A inscrição mudou várias vezes enquanto a ciência era gravada. Nada foi gravado: tente de novo em instantes.",
  );
}

/**
 * «Desfazer» a ciência: o alerta volta a contar. Não precisa que o alerta exista agora —
 * desfazer a ciência de um alerta que sumiu também é legítimo (limpa o registro).
 */
export async function desfazerCienciaDoAlerta(args: {
  inscricaoId: string;
  codigo: CodigoDoAlerta;
  autor: string;
  agoraMs?: number;
}): Promise<{ desfeita: CienciaDoAlerta | null }> {
  const agoraMs = args.agoraMs ?? Date.now();
  const cliente = createSupabaseAdminClient();

  for (let tentativa = 0; tentativa < TENTATIVAS_DA_CIENCIA; tentativa += 1) {
    // `*` e não a lista: sem a coluna (banco antes da migração) a leitura não falha, a chave
    // só não vem — e a resposta diz o porquê.
    const { data: lida, error } = await cliente
      .from("inscricoes")
      .select("*")
      .eq("id", args.inscricaoId)
      .maybeSingle<Inscricao>();
    if (error) throw new Error(`Falha ao ler a inscrição: ${error.message}`);
    if (!lida) throw new ErroDeRegra("Inscrição não encontrada.");
    if (lida.alertas_cientes === undefined) throw new ErroDeRegra(CIENCIA_SEM_COLUNA);

    const gravadas = cienciasGravadas(lida.alertas_cientes);
    if (!Object.hasOwn(gravadas, args.codigo)) {
      throw new ErroDeConflito(
        "Esse alerta já estava sem ciência (outra pessoa pode ter desfeito antes). Nada foi gravado.",
      );
    }
    const desfeita = lerAlertasCientes(gravadas)[args.codigo] ?? null;
    delete gravadas[args.codigo];
    if (!(await gravarCiencias(lida, gravadas, agoraMs))) continue;

    await registrarAuditoria({
      inscricaoId: args.inscricaoId,
      autor: args.autor,
      acao: "alerta_ciencia_desfeita",
      detalhe: { codigo: args.codigo, texto: desfeita?.texto ?? null, cienciaDe: desfeita?.por ?? null },
    });
    return { desfeita };
  }

  throw new ErroDeConflito(
    "A inscrição mudou várias vezes enquanto a ciência era desfeita. Nada foi gravado: tente de novo em instantes.",
  );
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
  /** Nota interna: só a organização vê. */
  observacao?: string | null;
  /** "Recado para o jogador": aparece em Minha inscrição. Vazio apaga. */
  recadoJogador?: string | null;
  organizador?: boolean;
  eloVerificado?: string | null;
  entrouNoGrupo?: string | null;
  disponibilidade?: string[];
  nomeReal?: string;
  /** Trava otimista: a situação que a tela viu. Ausente = grava sem conferir (como antes). */
  situacaoAnterior?: Inscricao["situacao"];
};

export async function atualizarInscricao(
  inscricaoId: string,
  patch: PatchInscricao,
  autor: string,
): Promise<void> {
  const linha: Record<string, unknown> = { atualizado_em: new Date().toISOString() };

  if (patch.situacao !== undefined) linha.situacao = patch.situacao;
  if (patch.observacao !== undefined) linha.observacao = patch.observacao;
  // Só entra no update quando veio: a ficha salva sem o recado não cita a coluna, e o
  // painel continua gravando no intervalo entre o deploy e a migração.
  if (patch.recadoJogador !== undefined) linha.recado_jogador = patch.recadoJogador || null;
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

  let gravacao = createSupabaseAdminClient().from("inscricoes").update(linha).eq("id", inscricaoId);
  // Na MESMA instrução, para não haver janela entre conferir e gravar.
  if (patch.situacaoAnterior !== undefined) gravacao = gravacao.eq("situacao", patch.situacaoAnterior);
  const { data, error } = await gravacao.select("id");

  if (error) {
    // Janela entre o deploy e a migração: o recado não tem coluna ainda. A ficha inteira não
    // foi gravada (é uma instrução só) — dizer isso, em vez de "não foi possível salvar".
    if (linha.recado_jogador !== undefined && colunaQueFalta(error, "recado_jogador")) {
      throw new ErroDeRegra(
        "O recado para o jogador ainda não pode ser gravado: falta a migração do banco (coluna recado_jogador). A ficha não foi salva — tire o recado e salve de novo, ou espere a migração.",
      );
    }
    throw new Error(`Falha ao salvar a ficha: ${error.message}`);
  }
  if (patch.situacaoAnterior !== undefined && (data?.length ?? 0) === 0) {
    throw new ErroDeConflito(
      "A situação desta inscrição mudou desde que você abriu a ficha (outra pessoa ou a promoção automática gravou antes). Nada foi gravado na ficha: confira o valor atual e salve de novo.",
    );
  }

  // A trava não é mudança: fica fora do registro do que foi alterado.
  const mudancas: Record<string, unknown> = { ...patch };
  delete mudancas.situacaoAnterior;
  await registrarAuditoria({ inscricaoId, autor, acao: "ficha", detalhe: mudancas });
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

  // A leitura da Riot vem junto: o preço do draft é por DIVISÃO (lib/draft/precos.ts), e o
  // robô continua atualizando `riot_divisao`/`riot_pdl` depois daqui — sem guardar a
  // divisão de hoje, a tabela mudaria depois de divulgada.
  const { data, error } = await cliente
    .from("inscricoes")
    .select("id,elo_declarado,elo_verificado,elo_riot,riot_divisao,riot_pdl")
    .in("situacao", ["apto", "sobra"])
    .is("elo_congelado", null)
    .returns<
      {
        id: string;
        elo_declarado: string;
        elo_verificado: string | null;
        elo_riot: string | null;
        riot_divisao: string | null;
        riot_pdl: number | null;
      }[]
    >();

  if (error) throw new Error(`Falha ao ler os aprovados: ${error.message}`);
  if (!data || data.length === 0) return 0;

  let quantidade = 0;
  for (const linha of data) {
    const elo = linha.elo_verificado ?? linha.elo_declarado;
    const pontos = pontosDoElo(elo);
    if (pontos === null) throw new ErroDeRegra(`Elo não reconhecido em ${linha.id}: ${elo}`);
    // Só a leitura do MESMO tier do elo congelado: elo travado à mão em outro tier fica sem
    // divisão (meio do elo), em vez de herdar a divisão de um elo que não é o dele.
    const leitura = leituraParaCongelar({
      elo,
      eloRiot: linha.elo_riot,
      divisao: linha.riot_divisao,
      pdl: linha.riot_pdl,
    });

    // `is elo_congelado null` também no UPDATE: o cron diário e o botão podem rodar ao
    // mesmo tempo, e quem chegar depois não pode recongelar com outro valor nem contar de novo.
    const { data: congelada, error: erroUpdate } = await cliente
      .from("inscricoes")
      .update({ elo_congelado: elo, ...leitura, congelado_em: agora, pontos, atualizado_em: agora })
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
  /** Trava otimista: o estado que a tela viu. Ausente = grava sem conferir (como antes). */
  estadoAnterior?: string;
  autor: string;
}): Promise<void> {
  const cliente = createSupabaseAdminClient();
  const agora = new Date().toISOString();

  let gravacao = cliente
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
  // Na MESMA instrução: a gaveta aberta antes de outro organizador recusar o (A) não pode
  // devolvê-lo a «ok» pelo atalho sem nem ver a recusa.
  if (args.estadoAnterior !== undefined) gravacao = gravacao.eq("estado", args.estadoAnterior);
  const { data, error } = await gravacao.select("inscricao_id");

  if (error) throw new Error(`Falha ao gravar a conferência: ${error.message}`);
  if (args.estadoAnterior !== undefined && (data?.length ?? 0) === 0) {
    throw new ErroDeConflito(
      `O requisito (${args.item.toUpperCase()}) mudou desde que você abriu a ficha (outra pessoa ou o robô da Riot gravou antes). Nada foi gravado nele: confira o valor atual e salve de novo.`,
    );
  }

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
  /** Trava otimista: o estado que a tela viu. Ausente = grava sem conferir (como antes). */
  estadoAnterior?: EstadoPagamento;
  autor: string;
}): Promise<void> {
  const cliente = createSupabaseAdminClient();
  const agora = new Date().toISOString();

  // "declarado" é a palavra do jogador e não carimba conferente. "pago" e
  // "estornado" são atos da organização e registram quem fez.
  const daOrganizacao = args.estado !== "declarado" && args.estado !== "aguardando";

  let esperado = args.estadoAnterior;

  // Estorno só de dinheiro que entrou. Sem isto, «aguardando → estorno devido» por engano
  // subia «recebido» e «em caixa» em R$ 20 que nunca existiram, punha na lista «a devolver»
  // quem não pagou, e a conta do caixa continuava fechando (ela é uma identidade).
  if (args.estado === "estorno_devido" || args.estado === "estornado") {
    const { data: atual, error: erroLeitura } = await cliente
      .from("inscricao_pagamentos")
      .select("estado")
      .eq("inscricao_id", args.inscricaoId)
      .maybeSingle<{ estado: EstadoPagamento }>();

    if (erroLeitura) throw new Error(`Falha ao ler o pagamento: ${erroLeitura.message}`);
    if (!atual) throw new ErroDeRegra("Pagamento não encontrado.");
    if (esperado !== undefined && atual.estado !== esperado) throw conflitoNoPagamento();
    if (!ESTADOS_COM_DINHEIRO.includes(atual.estado)) {
      throw new ErroDeRegra(
        "Só dá para estornar um pagamento que foi recebido. Confirme o «pago» antes — ou, se o dinheiro nunca entrou, use «Cancelado».",
      );
    }
    // A gravação fica presa ao estado que acabou de ser conferido: se ele mudar entre a
    // leitura e o update, nada é gravado.
    esperado = atual.estado;
  }

  let gravacao = cliente
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
  if (esperado !== undefined) gravacao = gravacao.eq("estado", esperado);
  const { data, error } = await gravacao.select("inscricao_id");

  if (error) throw new Error(`Falha ao gravar o pagamento: ${error.message}`);
  if (esperado !== undefined && (data?.length ?? 0) === 0) throw conflitoNoPagamento();

  await registrarAuditoria({
    inscricaoId: args.inscricaoId,
    autor: args.autor,
    acao: "pagamento",
    detalhe: { estado: args.estado },
  });
}

function conflitoNoPagamento(): ErroDeConflito {
  return new ErroDeConflito(
    "O pagamento mudou desde que você abriu a tela (outra pessoa da organização ou o próprio jogador gravou antes). Nada foi gravado: confira o estado atual e decida de novo.",
  );
}

/**
 * O caixa da edição.
 *
 * `arrecadado` desconta os estornos de propósito: é esse número, e não o bruto, que
 * vira premiação — e é ele que precisa bater com o que o site declara publicamente.
 * Isentos entram numa linha própria porque o dinheiro deles nunca existiu.
 *
 * `reservas` (opcional): quem está na fila de reserva. O «pago» deles vai para a linha
 * `aDevolverSeNaoJogar`, FORA do arrecadado (D2): reserva só paga se for chamado, e se não
 * for, a organização devolve — esse dinheiro não pode virar prêmio. Quando o reserva é
 * chamado, ele deixa de estar na lista e o mesmo pagamento passa a contar no arrecadado.
 */
export function fecharCaixa(pagamentos: readonly Pagamento[], reservas: ReadonlySet<string> = new Set()) {
  const soma = (filtro: (p: Pagamento) => boolean, ...estados: readonly EstadoPagamento[]) =>
    pagamentos.filter((p) => estados.includes(p.estado) && filtro(p)).reduce((t, p) => t + p.valor_centavos, 0);
  const todos = () => true;
  const deReserva = (p: Pagamento) => reservas.has(p.inscricao_id);

  // Estado é EXCLUSIVO: quem foi estornado deixou de ser "pago". Então "pago" já não
  // contém o dinheiro devolvido, e subtrair o estorno de novo descontaria duas vezes
  // o mesmo valor. `recebido` reconstrói o bruto somando tudo que um dia entrou.
  const daOrganizacao = soma((p) => !deReserva(p), "pago");
  const aDevolverSeNaoJogar = soma(deReserva, "pago");
  const aDevolver = soma(todos, "estorno_devido");
  const estornado = soma(todos, "estornado");
  const recebido = daOrganizacao + aDevolverSeNaoJogar + aDevolver + estornado;

  return {
    recebido,
    estornado,
    // Já entrou e ainda está na conta, mas está comprometido a sair.
    aDevolver,
    // Pago por quem está na fila de reserva: fica na conta, fora do prêmio (D2).
    aDevolverSeNaoJogar,
    // O que existe na conta agora, incluindo o que ainda será devolvido.
    emCaixa: recebido - estornado,
    // O dinheiro que é de fato da organização — é ESTE que vira premiação.
    arrecadado: daOrganizacao,
    aReceber: soma(todos, "aguardando", "declarado"),
    isento: soma(todos, "isento"),
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
  config: Pick<EdicaoConfig, "jogadores_por_time" | "max_times">,
) {
  // "sobra" também é APROVADO — é quem passou na conferência e ficou de fora quando
  // os times fecharam. Contar só os "apto" faria a conta se mover sozinha: ao marcar
  // dois como sobra, o total de aprovados cairia e a divisão mudaria de resposta.
  const aprovados = inscricoes.filter((i) => i.situacao === "apto" || i.situacao === "sobra");
  const recusados = inscricoes.filter((i) => i.situacao === "recusado").length;
  const excluidos = inscricoes.filter((i) => i.situacao === "excluido").length;
  // A divisão conta todo mundo que ainda pode jogar — pendente incluso. Só recusado,
  // desistente e excluído saem (ver `contaParaTimes`).
  const elegiveis = inscricoes.filter((i) => contaParaTimes(i.situacao));
  const { times, vagas, sobra } = distribuirTimes(
    elegiveis.length,
    config.jogadores_por_time,
    config.max_times ?? null,
  );

  const donoDe = (p: Pagamento) => inscricoes.find((i) => i.id === p.inscricao_id);
  // A fila de reserva (D1): titulares e reservas. Sem teto de times, todo ativo é titular.
  const fila = montarFila(inscricoes, config);
  const reservas = new Set(fila.reservas);
  // Recusado ou desistente que não pagou não é "a receber": a cobrança morreu com a
  // inscrição. Fica fora da conta do caixa sem gravar nada (ver `foraDaCobranca`).
  const caixa = fecharCaixa(
    pagamentos.filter((p) => {
      const dono = donoDe(p);
      return !dono || !foraDaCobranca(dono.situacao, p.estado);
    }),
    reservas,
  );
  // «A receber» é cobrança VIVA: nem organizador (não paga — o caso dele é o alerta
  // «organizador_cobrado», até alguém isentar) nem recusado/desistente que declarou (o
  // alerta «recusado_declarado» pede conferir o extrato antes de devolver), nem reserva (só
  // paga se for chamado, D2). Só este número muda: tirar o organizador do caixa inteiro
  // zeraria a linha «isento».
  caixa.aReceber = pagamentos
    .filter((p) => {
      if (p.estado !== "aguardando" && p.estado !== "declarado") return false;
      const dono = donoDe(p);
      return !dono || (!dono.organizador && contaParaTimes(dono.situacao) && !reservas.has(dono.id));
    })
    .reduce((t, p) => t + p.valor_centavos, 0);

  return {
    // Quantos são titulares e quantos esperam na fila (a lista completa vem em `fila`).
    titulares: fila.titulares.length,
    reservas: fila.reservas.length,
    // Recusado não conta como inscrito (pedido do Lucas, 22/10): ele continua na lista e
    // tem o próprio número em `recusados`. Excluído também não — esse nem aparece na lista.
    inscritos: inscricoes.length - recusados - excluidos,
    elegiveis: elegiveis.length,
    aprovados: aprovados.length,
    pendentes: inscricoes.filter((i) => i.situacao === "pendente").length,
    recusados,
    excluidos,
    // O número de times é derivado, limitado pelo teto `max_times` quando houver.
    times,
    vagas,
    sobra,
    caixa,
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
/**
 * O (e) também é do robô quando está «não avaliável» e sem observação — falta de base, não
 * veredicto (ver `itemEhDoRobo`). Mesma condição na gravação: se um organizador deu
 * veredicto ou escreveu uma observação no meio da rodada, o WHERE não casa mais. (A
 * observação vazia é gravada como nulo: ver `atualizarConferencia`.)
 */
export const FILTRO_ITEM_E_DO_ROBO = `${FILTRO_ITEM_DO_ROBO},and(estado.eq.nao_avaliavel,observacao.is.null)`;
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
      .or(item.item === "e" ? FILTRO_ITEM_E_DO_ROBO : FILTRO_ITEM_DO_ROBO)
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
    if (opcoes.simular) {
      promovidos.push(i.riot_id);
      continue;
    }
    // O lote acima foi lido de uma vez e envelhece enquanto o laço anda. Quem é candidato
    // é reavaliado com leitura FRESCA antes de ser promovido.
    //
    // Uma falha num inscrito (a rede piscou) não pode impedir a promoção dos seguintes: a
    // rotina é a rede de segurança das promoções que falharam, e só roda uma vez por dia.
    try {
      if (await reavaliarSituacao(i.id, "rotina_diaria")) promovidos.push(i.riot_id);
    } catch (erro) {
      console.error(`[inscricoes] falha ao reavaliar ${i.riot_id}`, erro);
    }
  }
  return promovidos;
}
