import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { AdminIdentity } from "@/lib/admin-auth";
import {
  ConflitoDeVersaoError,
  DatasetMissingError,
  readDatasetComVersao,
  saveDatasetComVersao,
} from "@/lib/data-store";
import { authorizeDatasetChange } from "@/lib/security/dataset-diff";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { requireAdmin } from "@/lib/security/route-guard";
import { scopeLabel } from "@/lib/security/scopes";
import {
  descreverProblemasDoDataset,
  MAX_SORTEIOS_POR_SERIE,
  problemasDeJogoDepoisDaDecisao,
  tournamentDatasetSchema,
  type TournamentDataset,
} from "@/lib/schema";
import { ancorarCamposDoServidor, registrarCorrecoesManuais } from "@/lib/series/campos-do-servidor";
import { problemasDeLinhaSemTime, problemasDeTrocaDeTimeComHistorico } from "@/lib/tournament";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Qualquer pessoa autenticada pode LER o dataset — é o que carrega o editor.
  const guarda = await requireAdmin(request);
  if (!guarda.ok) return guarda.response;

  try {
    // A VERSÃO viaja junto: é o token que o painel devolve no PUT para provar que editou
    // em cima do estado atual. Sem ela o editor não teria como participar da trava.
    const { dataset, versao } = await readDatasetComVersao();
    return NextResponse.json({ dataset, versao });
  } catch (error) {
    /*
     * A LINHA NÃO EXISTIR é um estado com conserto, e a tela precisa saber disso.
     *
     * Sem o código abaixo virava um 500 genérico: o painel mostrava "Não foi possível
     * abrir o painel" com um botão "Tentar de novo" que falharia para sempre, e a
     * semeadura — que é justamente o conserto — não tinha caminho nenhum na interface.
     * A mensagem do erro chegava a mandar "use a semeadura no painel admin", que não
     * existia.
     *
     * O texto aqui é genérico de propósito: o nome da tabela e o id da linha ficam só no
     * log, com o código de referência.
     */
    if (error instanceof DatasetMissingError) {
      console.error("[admin/dataset GET] dataset ausente", error);
      return NextResponse.json(
        {
          error:
            "Os dados do campeonato ainda não existem neste banco. É possível semear a partir do arquivo do repositório.",
          code: "DATASET_MISSING",
        },
        { status: 404 },
      );
    }
    return respostaDeErro("admin/dataset GET", error, "Falha ao carregar os dados do campeonato.");
  }
}

/** Voltas do "Salvar por cima" antes de desistir: cada uma relê e remescla. */
const TENTATIVAS_DO_FORCE = 5;

/*
 * O 409 dizia "salve novamente para sobrescrever", mas o Salvar normal reenvia a MESMA
 * versão e leva o mesmo 409 — quem sobrescreve é só o botão do aviso do painel.
 */
const MENSAGEM_DE_CONFLITO =
  "Outra pessoa salvou alterações enquanto você editava. Use o aviso do painel: traga a versão nova ou salve por cima assim mesmo.";

/**
 * Salva o dataset inteiro. A permissão é calculada pela DIFERENÇA entre o dado atual
 * e o enviado: cada seção alterada exige o seu escopo (ver lib/security/dataset-diff).
 */
export async function PUT(request: NextRequest) {
  const guarda = await requireAdmin(request);
  if (!guarda.ok) return guarda.response;

  // Teto de tamanho antes de ler o corpo: payload gigante não pode virar DoS de memória.
  const tamanho = Number(request.headers.get("content-length") ?? 0);
  if (tamanho > 3_000_000) {
    return NextResponse.json({ error: "Payload grande demais." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const payload = (body as { dataset?: unknown })?.dataset ?? body;
  const forcar = (body as { force?: unknown })?.force === true;
  const versaoDoCliente = (body as { versao?: unknown })?.versao;
  const versaoEnviada = typeof versaoDoCliente === "number" ? versaoDoCliente : undefined;

  // Valida ANTES de comparar, para o diff trabalhar sobre dados confiáveis.
  const parsed = tournamentDatasetSchema.safeParse(payload);
  if (!parsed.success) {
    // Em português e pelo NOME da série/jogo/campo: o índice do array ("seriesMatches.1")
    // não bate com a lista do painel, que é ordenada por data.
    const resumo = descreverProblemasDoDataset(parsed.error.issues, payload);
    return NextResponse.json({ error: `Validação falhou: ${resumo}` }, { status: 400 });
  }

  try {
    /*
     * "SALVAR POR CIMA" RELÊ E REMESCLA, EM VEZ DE GRAVAR SEM CONDIÇÃO.
     *
     * Antes o `force` gravava incondicionalmente o corpo montado sobre a PRIMEIRA leitura:
     * se um sorteio caísse entre essa leitura e a gravação, o registro append-only dele e o
     * lado/carta sorteados sumiam, porque a mesclagem (histórico, retratos, sorteio não
     * visto) e a autorização descreviam um estado que já não existia. Agora cada volta
     * relê, remescla, reautoriza e grava CONDICIONADA à versão que acabou de ler; se outra
     * gravação passar na frente, a volta seguinte recomeça sobre ela.
     *
     * Sem `force` há uma volta só, e o conflito vira 409 como sempre.
     */
    const voltas = forcar ? TENTATIVAS_DO_FORCE : 1;
    for (let volta = 1; ; volta++) {
      const resultado = await tentarGravar({
        enviado: parsed.data,
        forcar,
        versaoEnviada,
        identity: guarda.identity,
      });
      if ("resposta" in resultado) return resultado.resposta;

      if (volta >= voltas) {
        return NextResponse.json(
          {
            error: forcar
              ? "O campeonato recebeu outras gravações seguidas enquanto você salvava por cima. Tente de novo em instantes."
              : MENSAGEM_DE_CONFLITO,
            conflict: true,
            serverVersion: resultado.conflito,
          },
          { status: 409 },
        );
      }
    }
  } catch (error) {
    return respostaDeErro("admin/dataset PUT", error, "Falha ao salvar os dados do campeonato.");
  }
}

/**
 * Uma volta do PUT: lê, confere a versão, mescla o que é do servidor, autoriza e grava.
 *
 * Devolve a resposta pronta, ou `{ conflito }` com a versão do banco quando ele recusou a
 * gravação condicionada (outra gravação entrou entre a leitura e a escrita) — o laço do
 * PUT decide se tenta de novo.
 */
async function tentarGravar({
  enviado,
  forcar,
  versaoEnviada,
  identity,
}: {
  enviado: TournamentDataset;
  forcar: boolean;
  versaoEnviada: number | undefined;
  identity: AdminIdentity;
}): Promise<{ resposta: NextResponse } | { conflito: number }> {
  const { dataset: atual, versao: versaoAtual } = await readDatasetComVersao();

  /*
   * Trava de concorrência. O painel carrega o dataset e edita em rascunho; se outra
   * pessoa gravar nesse meio-tempo (inclusive um sorteio de carta ou de lado, que
   * gravam por conta própria), salvar por cima apagaria o trabalho dela em silêncio.
   *
   * Esta conferência é só a recusa ANTECIPADA, para não gastar o diff de autorização
   * num envio que já se sabe velho. Quem de fato garante é a gravação condicionada lá
   * embaixo: entre esta linha e o `saveDataset` cabe outra requisição inteira, e era
   * exatamente por aí que dois salvamentos quase simultâneos passavam os dois.
   */
  /*
   * A VERSÃO É OBRIGATÓRIA (fora do `force`), e isso não é burocracia.
   *
   * A gravação condicionada lá embaixo usa a versão que ESTE pedido acabou de ler, então
   * ela fecha a corrida entre a leitura e a escrita do servidor — mas não sabe nada sobre
   * há quanto tempo o rascunho do cliente está aberto. Sem exigir o token, um corpo sem
   * `versao` passava direto: o servidor lia a versão atual, gravava condicionado a ela, e
   * um rascunho de meia hora atrás sobrescrevia tudo sem 409 nenhum. Ou seja, omitir o
   * campo equivalia a `force` — uma trava que só o nosso próprio painel aplicava.
   */
  if (!forcar && versaoEnviada === undefined) {
    return {
      resposta: NextResponse.json(
        {
          error:
            "Este envio não trouxe a versão do campeonato. Recarregue a página do painel e tente de novo.",
          conflict: true,
          serverVersion: versaoAtual,
        },
        { status: 409 },
      ),
    };
  }

  if (!forcar && versaoEnviada !== versaoAtual) {
    return {
      resposta: NextResponse.json(
        { error: MENSAGEM_DE_CONFLITO, conflict: true, serverVersion: versaoAtual },
        { status: 409 },
      ),
    };
  }

  /*
   * O QUE É DO SERVIDOR NÃO VEM DO RASCUNHO (ver lib/series/campos-do-servidor.ts).
   *
   * `sorteios` é o histórico append-only dos sorteios de lados e cartinhas, com a semente
   * que permite conferir cada resultado. Sem a reancoragem, quem tivesse `series:manage`
   * apagava o histórico inteiro pelo editor do painel — bastava salvar o rascunho sem ele.
   * Um registro que a própria pessoa auditada pode remover não é registro. O que chega do
   * cliente é descartado e o que está gravado é preservado.
   *
   * `archivedSeasons` também: cada entrada guarda um dataset COMPLETO de uma temporada
   * inteira, e depois de "encerrar + iniciar a próxima" (`buildNextSeasonDataset` zera
   * `seriesMatches`) esse retrato é o ÚNICO exemplar que resta da temporada anterior. Quem
   * escreve ali é o ciclo de vida (`/api/admin/tournament/end`), nunca o editor; uma aba
   * aberta ANTES do arquivamento reenviava `archivedSeasons: []`, e com "Salvar por cima"
   * a temporada arquivada era apagada de vez. A restauração de backup não passa por aqui
   * (usa `/api/admin/import`), então preservar não fecha caminho nenhum.
   *
   * E o LADO e a CARTA de um sorteio que o rascunho não viu (feito em outro aparelho
   * depois de o painel abrir) valem os do servidor: "Salvar por cima" deixa de desfazer o
   * sorteio anunciado na live, e quem só lança resultado deixa de ser cobrado por
   * `series:cards`/`series:sides` que nunca tocou. A mesclagem só COPIA valores gravados,
   * então também não dá a ninguém o poder de mexer neles.
   */
  const proposta = ancorarCamposDoServidor(enviado, atual);

  /*
   * ...e preservar por igualdade de id não basta.
   *
   * A preservação acima só encontra o histórico quando o id da série continua o
   * mesmo. Some o id do corpo enviado e o histórico morre em silêncio, por dois
   * caminhos que existem hoje no painel:
   *
   *  - RENOMEAR a série (o editor deixa trocar o id): o corpo chega com o id novo,
   *    o `find` não acha nada, e o registro do id antigo simplesmente não é
   *    regravado. O aviso da tela só fala que o link público muda.
   *  - REMOVER a série e recriá-la com o mesmo id em duas requisições: a primeira
   *    apaga o histórico, a segunda devolve uma série limpa.
   *
   * Nos dois casos quem tem `series:manage` apaga o registro append-only que a
   * preservação acima existe para proteger — inclusive a semente que permite
   * conferir cada sorteio.
   *
   * A recusa vale para quem NÃO é master. A ameaça real é um admin limitado apagar
   * o rastro de um sorteio que não gostou: um registro que a própria pessoa auditada
   * pode remover não é registro. Já o dono do campeonato precisa poder apagar uma
   * série criada por engano que chegou a ter sorteio — barrar TODO mundo transformava
   * um risco raro de auditoria num impedimento comum: a série já tinha sido removida
   * do rascunho na tela, então o painel inteiro ficava impossível de salvar, sem
   * desfazer, às vezes no meio do evento. Excluir um time era pior ainda, porque
   * arrasta as séries dele junto.
   *
   * `force` não passa por aqui de propósito: ele existe para resolver edição
   * concorrente (409), não para autorizar a destruição do histórico.
   */
  if (!identity.isMaster) {
    const idsEnviados = new Set(proposta.seriesMatches.map((s) => s.id));
    const historicoPerdido = atual.seriesMatches
      .filter((s) => s.sorteios?.length && !idsEnviados.has(s.id))
      .map((s) => s.id);

    if (historicoPerdido.length > 0) {
      return {
        resposta: NextResponse.json(
          {
            error:
              `Estas séries têm histórico de sorteios e só o responsável pelo campeonato ` +
              `pode removê-las ou trocar o ID delas: ${historicoPerdido.join(", ")}. O ` +
              `histórico guarda a semente de cada sorteio e é append-only.`,
          },
          { status: 403 },
        ),
      };
    }
  }

  /*
   * Jogo lançado depois de a série estar decidida (3x0 numa MD3). A regra vale só para a
   * GRAVAÇÃO e só quando o envio piora o que está gravado — ver o comentário da função:
   * o dado real da 3ª tem um caso assim, e o schema roda em toda leitura.
   */
  const jogosDemais = problemasDeJogoDepoisDaDecisao(proposta, atual);
  if (jogosDemais.length > 0) {
    return { resposta: NextResponse.json({ error: jogosDemais.join(" | ") }, { status: 400 }) };
  }

  /*
   * Troca de time pelo cadastro de quem já jogou (FB-3): as linhas antigas sem "Jogou por"
   * valem pelo time do jogador e iriam junto para o time novo — estatística pública mudando
   * de lado por quem só tem `players:write`. Antes do `problemasDeLinhaSemTime` porque é a
   * causa: depois da troca, as linhas dele podem cair também naquela regra.
   */
  const trocasComHistorico = problemasDeTrocaDeTimeComHistorico(proposta, atual);
  if (trocasComHistorico.length > 0) {
    return { resposta: NextResponse.json({ error: trocasComHistorico.join(" | ") }, { status: 400 }) };
  }

  /*
   * Substituto avulso sem "Jogou por" (regra 6): a linha NOVA (ou mudada) de titular de um
   * time que não disputa a série some das duas colunas da partida e conta para o time dele.
   * Mesma lógica de cima — só para a gravação e comparando com o gravado, porque o dado real
   * tem sobras assim e o schema roda em toda leitura.
   */
  const linhasSemTime = problemasDeLinhaSemTime(proposta, atual);
  if (linhasSemTime.length > 0) {
    return { resposta: NextResponse.json({ error: linhasSemTime.join(" | ") }, { status: 400 }) };
  }

  const veredito = authorizeDatasetChange(identity, atual, proposta);

  if (!veredito.ok) {
    return {
      resposta: NextResponse.json(
        {
          error: `Você não tem permissão para alterar: ${veredito.missing.map(scopeLabel).join(", ")}.`,
          missing: veredito.missing,
          changes: veredito.changes.slice(0, 20),
        },
        { status: 403 },
      ),
    };
  }

  if (veredito.changes.length === 0) {
    return { resposta: NextResponse.json({ dataset: atual, versao: versaoAtual, message: "Nada mudou." }) };
  }

  /*
   * Lado ou carta trocados À MÃO pelo editor entram no histórico como correção manual.
   * Depois da autorização de propósito: o registro é do servidor, e quem tem só
   * `series:cards` não pode ser cobrado de `series:manage` por ele.
   */
  const registro = registrarCorrecoesManuais(proposta, atual, identity.username, new Date().toISOString());
  if (!registro.ok) {
    return {
      resposta: NextResponse.json(
        {
          error: `A série ${registro.serieId} já acumulou ${MAX_SORTEIOS_POR_SERIE} registros de sorteio e não cabe mais nenhuma correção de lado ou carta. Fale com a organização antes de continuar.`,
        },
        { status: 400 },
      ),
    };
  }

  /*
   * A GRAVAÇÃO É CONDICIONADA — é ela que fecha a corrida de verdade.
   *
   * Sem `force`, à versão que o CLIENTE afirmou ter (já conferida acima como igual à
   * atual): assim a condição descreve o estado sobre o qual a pessoa de fato editou. Com
   * `force`, à versão que ESTA volta leu — sobrescrever é a decisão consciente de quem
   * está editando, mas a mesclagem e a autorização acima só valem para esse estado.
   */
  let gravado;
  try {
    gravado = await saveDatasetComVersao(proposta, {
      versaoEsperada: forcar ? versaoAtual : versaoEnviada,
    });
  } catch (erro) {
    if (erro instanceof ConflitoDeVersaoError) return { conflito: erro.versaoAtual };
    throw erro;
  }

  /*
   * A versão devolvida é a que a GRAVAÇÃO caiu — nem previsão, nem releitura.
   *
   * Prever `versaoAtual + 1` quebrava o provedor local (que devolve sempre 0): o painel
   * guardava 1, mandava 1 no salvamento seguinte, o servidor lia 0 e recusava, e a partir
   * do SEGUNDO "Salvar" tudo caía em 409. E reler depois de gravar tem o problema oposto:
   * entre a gravação e a releitura cabe a gravação de OUTRA pessoa, e o painel sairia
   * carregando o número dela — passando a sobrescrevê-la no próximo Salvar.
   */
  return {
    resposta: NextResponse.json({
      dataset: gravado.dataset,
      versao: gravado.versao,
      message: "Dados salvos com sucesso.",
    }),
  };
}
