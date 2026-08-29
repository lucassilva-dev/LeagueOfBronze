import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
import { tournamentDatasetSchema } from "@/lib/schema";

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
    const resumo = parsed.error.issues
      .slice(0, 10)
      .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
      .join(" | ");
    return NextResponse.json({ error: `Validação falhou: ${resumo}` }, { status: 400 });
  }

  try {
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
      return NextResponse.json(
        {
          error:
            "Este envio não trouxe a versão do campeonato. Recarregue a página do painel e tente de novo.",
          conflict: true,
          serverVersion: versaoAtual,
        },
        { status: 409 },
      );
    }

    if (!forcar && versaoEnviada !== versaoAtual) {
      return NextResponse.json(
        {
          error:
            "Outra pessoa salvou alterações enquanto você editava. Recarregue para ver a versão atual, ou salve novamente para sobrescrever.",
          conflict: true,
          serverVersion: versaoAtual,
        },
        { status: 409 },
      );
    }

    /*
     * `sorteios` é PROPRIEDADE DO SERVIDOR e não passa por aqui.
     *
     * É o histórico append-only dos sorteios de lados e cartinhas, com a semente que
     * permite conferir cada resultado. Sem esta linha, quem tivesse `series:manage`
     * apagava o histórico inteiro pelo editor do painel — bastava salvar o rascunho
     * sem ele. Um registro que a própria pessoa auditada pode remover não é registro.
     *
     * O que chega do cliente é descartado e o que está gravado é preservado; escrever
     * ali só pela rota de sorteio.
     */
    for (const serie of parsed.data.seriesMatches) {
      const guardada = atual.seriesMatches.find((s) => s.id === serie.id);
      if (guardada?.sorteios?.length) serie.sorteios = guardada.sorteios;
      else delete serie.sorteios;
    }

    /*
     * `archivedSeasons` também é PROPRIEDADE DO SERVIDOR e não passa por aqui.
     *
     * Cada entrada guarda um dataset COMPLETO de uma temporada inteira, e depois de
     * "encerrar + iniciar a próxima" (`buildNextSeasonDataset` zera `seriesMatches`) esse
     * retrato é o ÚNICO exemplar que resta da temporada anterior.
     *
     * Quem escreve aqui é o ciclo de vida (`/api/admin/tournament/end`), nunca o editor: o
     * painel só LÊ esta lista para mostrar contagem. Mas o rascunho carrega o dataset
     * inteiro de volta no PUT, então uma aba aberta ANTES do arquivamento reenviava
     * `archivedSeasons: []` — e com "Salvar por cima assim mesmo" (`force`), que pula a
     * trava de versão, a temporada arquivada era apagada de vez. A restauração de backup
     * não passa por aqui (usa `/api/admin/import`), então preservar não fecha caminho
     * nenhum.
     */
    parsed.data.archivedSeasons = atual.archivedSeasons;

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
    if (!guarda.identity.isMaster) {
      const idsEnviados = new Set(parsed.data.seriesMatches.map((s) => s.id));
      const historicoPerdido = atual.seriesMatches
        .filter((s) => s.sorteios?.length && !idsEnviados.has(s.id))
        .map((s) => s.id);

      if (historicoPerdido.length > 0) {
        return NextResponse.json(
          {
            error:
              `Estas séries têm histórico de sorteios e só o responsável pelo campeonato ` +
              `pode removê-las ou trocar o ID delas: ${historicoPerdido.join(", ")}. O ` +
              `histórico guarda a semente de cada sorteio e é append-only.`,
          },
          { status: 403 },
        );
      }
    }

    const veredito = authorizeDatasetChange(guarda.identity, atual, parsed.data);

    if (!veredito.ok) {
      return NextResponse.json(
        {
          error: `Você não tem permissão para alterar: ${veredito.missing.map(scopeLabel).join(", ")}.`,
          missing: veredito.missing,
          changes: veredito.changes.slice(0, 20),
        },
        { status: 403 },
      );
    }

    if (veredito.changes.length === 0) {
      return NextResponse.json({ dataset: atual, versao: versaoAtual, message: "Nada mudou." });
    }

    /*
     * A GRAVAÇÃO É CONDICIONADA à versão lida — é ela que fecha a corrida de verdade.
     *
     * `force` grava sem condição de propósito: é o "salvar por cima assim mesmo" que a
     * tela oferece depois de mostrar o 409, e aí sobrescrever é a decisão consciente de
     * quem está editando.
     */
    let gravado;
    try {
      // Condicionada à versão que o CLIENTE afirmou ter (já conferida acima como igual à
      // atual), e não à que o servidor leu: assim a condição descreve o estado sobre o
      // qual a pessoa de fato editou.
      gravado = await saveDatasetComVersao(parsed.data, {
        versaoEsperada: forcar ? undefined : versaoEnviada,
      });
    } catch (erro) {
      if (erro instanceof ConflitoDeVersaoError) {
        return NextResponse.json(
          {
            error:
              "Outra pessoa salvou alterações enquanto você editava. Recarregue para ver a versão atual, ou salve novamente para sobrescrever.",
            conflict: true,
            serverVersion: erro.versaoAtual,
          },
          { status: 409 },
        );
      }
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
    return NextResponse.json({
      dataset: gravado.dataset,
      versao: gravado.versao,
      message: "Dados salvos com sucesso.",
    });
  } catch (error) {
    return respostaDeErro("admin/dataset PUT", error, "Falha ao salvar os dados do campeonato.");
  }
}
