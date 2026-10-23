import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  TIMES_DO_CALENDARIO_4A,
  calendarioDivulgado,
  motivoSemCalendario,
  seriesDaFaseDePontos,
} from "@/lib/calendario-4a";
import { ConflitoDeVersaoError, readDatasetComVersao, saveDataset } from "@/lib/data-store";
import {
  alcancarORelogio,
  aplicarEscolha,
  iniciarDraft,
  jogadoresQueSairamDoPool,
  pausarDraft,
  podeEscolher,
  retomarDraft,
  timeDaVez,
  vezSemSaida,
} from "@/lib/draft/motor";
import {
  avisosDaVirada,
  datasetDoDraft,
  exigemConfirmacaoNaVirada,
  jogadoresForaDoDraft,
  listaForaDoDraft,
  problemasDaVirada,
  reservasDaVirada,
} from "@/lib/draft/virada";
import {
  comAsSaidasDoPool,
  lerDraftCompleto,
  montarDraftDosAprovados,
  paraPublico,
  previaDoDraft,
  salvarDraftSeIntacto,
  type MetodoDeCapitao,
} from "@/lib/draft/store";
import { listarInscricoes, registrarAuditoria } from "@/lib/inscricoes/store";
import { embaralhar, novaSemente } from "@/lib/series/sorteio";
import { requireAdmin } from "@/lib/security/route-guard";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { lerCorpoPublico } from "@/lib/security/rota-publica";

export const dynamic = "force-dynamic";

/**
 * Condução do draft pela organização: montar (sortear), iniciar, pausar, retomar,
 * escolher por um capitão, prever e aplicar a virada, e criar as séries do calendário.
 *
 * Escopo `draft:conduzir` para tudo, separado de `inscricoes:conferir` de propósito —
 * quem confere requisito não precisa poder refazer o sorteio no meio do evento.
 *
 * "Montar" é a ação perigosa: ela DESCARTA um draft em andamento. Por isso exige uma
 * confirmação explícita no corpo, e não apenas o escopo.
 *
 * "Montar" e "iniciar" também levam no corpo o sorteio que a tela VIU (`sorteioVisto`, a
 * semente, ou null quando ela não via draft nenhum). Duas pessoas conduzem a mesa ao mesmo
 * tempo, e um painel carregado antes do sorteio do colega continuava oferecendo «Sortear»:
 * o clique trocava, na frente do público, o sorteio que a TV acabara de animar. Se o
 * sorteio de agora não é o que a tela viu, a resposta é 409 e o painel se atualiza.
 */

const METODOS: MetodoDeCapitao[] = ["maior_elo", "manual", "mid", "adc", "pior"];

/**
 * O que a tela do draft no painel precisa: o estado (a mesma visão da transmissão) e a
 * conferência de antes do sorteio. Nada de contato — só Riot ID, elo, rota e pontos.
 */
export async function GET(request: NextRequest) {
  const guarda = await requireAdmin(request, "draft:conduzir");
  if (!guarda.ok) return guarda.response;

  try {
    // Uma leitura do draft só, usada pelos dois: a prévia precisa dele para dizer quem está
    // no draft e não é mais apto.
    const draftLido = lerDraftCompleto();
    const [{ estado, revisao }, previa] = await Promise.all([draftLido, previaDoDraft(draftLido)]);
    // Leitura não anda o relógio aqui: quem anda é a sondagem pública (/api/draft/estado),
    // que grava condicionado. O painel mostra o que está gravado.
    const semSaida = estado ? vezSemSaida(estado) : null;
    const resposta = NextResponse.json({
      draft: estado ? paraPublico(estado, revisao) : null,
      sorteio: estado?.sorteio ?? null,
      semSaida,
      previa,
    });
    resposta.headers.set("Cache-Control", "no-store, private");
    return resposta;
  } catch (error) {
    return respostaDeErro("api/admin/draft", error, "Não foi possível ler o draft.");
  }
}

export async function POST(request: NextRequest) {
  const guarda = await requireAdmin(request, "draft:conduzir");
  if (!guarda.ok) return guarda.response;

  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const corpo = lido.corpo as {
    acao?: string;
    metodo?: string;
    capitaes?: unknown;
    confirmoDescartar?: unknown;
    jogadorId?: unknown;
    timeId?: unknown;
    escolha?: unknown;
    sorteioVisto?: unknown;
    confirmoReaplicar?: unknown;
    confirmoForaDoDraft?: unknown;
  };
  const autor = guarda.identity.username;

  try {
    const { estado, revisao } = await lerDraftCompleto();
    // Sem o campo (cliente antigo) conta como "não via sorteio nenhum": com um sorteio no
    // ar, recusa — o lado seguro.
    const sorteioVisto = typeof corpo?.sorteioVisto === "string" ? corpo.sorteioVisto : null;
    const sorteioDeAgora = estado?.sorteio?.semente ?? null;

    switch (corpo?.acao) {
      case "montar": {
        const metodo = METODOS.find((m) => m === corpo.metodo);
        if (!metodo) return NextResponse.json({ error: "Método de capitão inválido." }, { status: 400 });

        // Vale também com `confirmoDescartar`: a confirmação foi dada sobre o draft que a
        // tela mostrava, não sobre um sorteio novo que entrou depois.
        if (sorteioVisto !== sorteioDeAgora) {
          return painelDesatualizado(
            "Outro sorteio entrou depois que você abriu o painel. O painel foi atualizado: confira o sorteio que está no ar antes de sortear de novo.",
          );
        }

        // Um draft já iniciado é histórico ao vivo: refazer apaga escolhas que já
        // foram anunciadas. Exigir a confirmação evita que um clique errado no meio
        // do evento zere tudo.
        if (estado && estado.fase !== "preparando" && corpo.confirmoDescartar !== true) {
          return NextResponse.json(
            {
              error: "Já existe um draft em andamento. Confirme que quer descartá-lo e sortear de novo.",
              precisaConfirmar: true,
            },
            { status: 409 },
          );
        }

        const capitaes = Array.isArray(corpo.capitaes)
          ? corpo.capitaes.filter((c): c is string => typeof c === "string")
          : [];

        const novo = await montarDraftDosAprovados({ metodo, capitaesManuais: capitaes });
        const gravou = await salvarDraftSeIntacto(novo, revisao);
        if (!gravou) return conflito();

        // A semente vai para a auditoria também: o estado do draft é sobrescrito no
        // próximo sorteio, e a auditoria é append-only.
        await registrarAuditoria({
          autor,
          acao: "draft_montado",
          detalhe: {
            metodo,
            times: novo.times.length,
            escolhas: novo.ordem.length,
            semente: novo.sorteio?.semente,
            capitaesAntesDoSorteio: novo.sorteio?.capitaes,
            ordemSorteada: novo.times.map((t) => ({ time: t.nome, capitao: t.capitaoId })),
            // A tabela de pontos que entrou neste sorteio. O estado é sobrescrito no próximo;
            // aqui ela fica para sempre, com a semente.
            tabelaDePontos: novo.tabelaDePontos
              ? {
                  granularidade: novo.tabelaDePontos.granularidade,
                  curvatura: novo.tabelaDePontos.curvatura,
                  linhas: novo.tabelaDePontos.linhas.map((l) => ({ classe: l.rotulo, quantos: l.quantos, pontos: l.pontos })),
                  alvo: novo.tabelaDePontos.alvo,
                  soma: novo.tabelaDePontos.soma,
                  folga: novo.tabelaDePontos.folga,
                  erroMaximoEmDegraus: novo.tabelaDePontos.erroMaximoEmDegraus,
                  // Quando a conta desceu da tabela pedida (curvatura, soma), o porquê.
                  queda: novo.tabelaDePontos.queda ?? null,
                }
              : undefined,
          },
        });
        return NextResponse.json({ ok: true, draft: paraPublico(novo, revisao + 1) });
      }

      case "iniciar":
      case "pausar":
      case "retomar": {
        if (!estado) return NextResponse.json({ error: "Monte o draft primeiro." }, { status: 409 });

        if (corpo.acao === "iniciar") {
          // «Iniciar» só existe antes do apito. Vindo de um painel velho, ele retomava uma
          // pausa da organização, devolvia o prazo cheio a um time com o tempo já vencido
          // (sem o auto-pick) ou, com o draft encerrado, estourava em 500.
          if (estado.fase !== "preparando") {
            return painelDesatualizado(
              estado.fase === "encerrado"
                ? "O draft já terminou. O painel foi atualizado."
                : "O draft já foi iniciado. O painel foi atualizado.",
            );
          }
          if (sorteioVisto !== sorteioDeAgora) {
            return painelDesatualizado(
              "O sorteio mudou depois que você abriu o painel. O painel foi atualizado: confira o sorteio novo antes de iniciar.",
            );
          }
        }

        const agora = Date.now();
        // Iniciar e retomar já saem com quem deixou o pool aplicado (C1): o relógio começa
        // a correr sem essa pessoa entre os escolhíveis.
        const novo =
          corpo.acao === "iniciar"
            ? await comAsSaidasDoPool(iniciarDraft(estado, agora), { fresco: true })
            : corpo.acao === "pausar"
              ? pausarDraft(estado)
              : await comAsSaidasDoPool(retomarDraft(estado, agora), { fresco: true });

        const gravou = await salvarDraftSeIntacto(novo, revisao);
        if (!gravou) return conflito();

        await registrarAuditoria({ autor, acao: `draft_${corpo.acao}` });
        return NextResponse.json({ ok: true, draft: paraPublico(novo, revisao + 1) });
      }

      case "escolher": {
        /*
         * A organização escolhe PELO time da vez.
         *
         * Existe para o dia em que o capitão não consegue entrar (conta sem senha, celular
         * sem bateria, internet caída) e diz no Discord quem quer. Sem isto a única saída
         * era deixar o cronômetro estourar e o auto-pick pegar o mais barato — o oposto do
         * que o capitão pediu. O time NÃO vem do corpo: é sempre o da vez, pelo motor.
         */
        if (!estado) return NextResponse.json({ error: "Monte o draft primeiro." }, { status: 409 });
        const jogadorId = typeof corpo.jogadorId === "string" ? corpo.jogadorId : null;
        if (!jogadorId) return NextResponse.json({ error: "Escolha um jogador." }, { status: 400 });

        // Quem saiu do pool (C1) lido na hora, antes do relógio: a mesa não leva quem acabou
        // de desistir, mesmo com a tela mostrando o nome.
        const atual = alcancarORelogio(await comAsSaidasDoPool(estado, { fresco: true }), Date.now());
        const daVez = timeDaVez(atual);
        if (!daVez) return NextResponse.json({ error: "Não há escolha em andamento." }, { status: 409 });

        // A vez que a pessoa CONFIRMOU na tela tem de ser a vez de agora. Entre o clique e a
        // chegada do pedido o relógio pode ter virado (o confirm segura a página enquanto as
        // outras telas fazem o auto-pick andar), e sem esta trava o jogador escolhido para
        // um time ia parar no time seguinte — sem desfazer.
        if (corpo.timeId !== daVez || corpo.escolha !== atual.escolhaAtual) {
          return NextResponse.json(
            {
              error: "A vez mudou enquanto você escolhia. Confira o quadro e escolha de novo.",
              draft: paraPublico(atual, revisao),
            },
            { status: 409 },
          );
        }

        const veredito = podeEscolher(atual, daVez, jogadorId);
        if (!veredito.ok) {
          return NextResponse.json({ error: veredito.motivo, draft: paraPublico(atual, revisao) }, { status: 409 });
        }

        const novo = aplicarEscolha(atual, daVez, jogadorId, Date.now());
        const gravou = await salvarDraftSeIntacto(novo, revisao);
        if (!gravou) return conflito();

        await registrarAuditoria({
          autor,
          acao: "draft_escolha_pela_organizacao",
          detalhe: { timeId: daVez, jogadorId, escolha: atual.escolhaAtual },
        });
        return NextResponse.json({ ok: true, draft: paraPublico(novo, revisao + 1) });
      }

      case "prever":
      case "virar": {
        if (!estado) return NextResponse.json({ error: "Monte o draft primeiro." }, { status: 409 });

        const inscritos = await listarInscricoes();

        /*
         * Os reservas (decisão C4 de 2026-10-22): todo inscrito da fila — titular ou reserva —
         * que não ficou num elenco vai para o site como reserva oficial, sem time. São eles
         * que substituem jogo a jogo e herdam a vaga de quem sair de vez.
         */
        const reservas = reservasDaVirada(estado, inscritos);
        const problemas = problemasDaVirada(estado, reservas);
        const resultado = datasetDoDraft(estado, reservas);
        // O time que vai com vaga aberta porque a ordem perdeu escolhas por falta de jogador
        // (alguém saiu do pool, C1, ou faltava titular apto no sorteio, C4): não trava.
        const avisos = avisosDaVirada(estado);

        /*
         * Quem está no draft e a inscrição não é mais `apto` (recusado ou desistente depois
         * do sorteio, devolvido à sobra ou a pendente). Quem estava no POOL já saiu dos
         * escolhíveis (C1) e não vai para time nenhum: fica no aviso, sem confirmação. Quem
         * está num ELENCO segue no draft (C2): aplicar no site publica essa pessoa num time,
         * então a virada só segue com a confirmação explícita no corpo (`confirmoForaDoDraft:
         * true`, booleano, não "sim"); depois, a vaga é reposta pela saída de vez no painel de
         * Jogadores.
         */
        const foraDoDraft = jogadoresForaDoDraft(estado, inscritos);
        const precisamConfirmar = exigemConfirmacaoNaVirada(foraDoDraft);

        if (corpo.acao === "prever") {
          // Só olha. A organização confere os elencos antes de qualquer escrita no
          // dataset público — que é de onde o site inteiro lê.
          return NextResponse.json({ ok: true, problemas, avisos, foraDoDraft, ...resultado });
        }

        const foraSemConfirmacao = precisamConfirmar.length > 0 && corpo.confirmoForaDoDraft !== true;
        if (foraSemConfirmacao) {
          problemas.push(
            `Não estão mais aptos na inscrição: ${listaForaDoDraft(precisamConfirmar)}. Para aplicar mesmo assim, confirme.`,
          );
        }

        if (problemas.length > 0) {
          return NextResponse.json(
            {
              error:
                foraSemConfirmacao && problemas.length === 1
                  ? "Há jogadores no draft que não estão mais aptos. Confirme para aplicar mesmo assim."
                  : "O draft ainda não está pronto para virar.",
              problemas,
              ...(foraSemConfirmacao ? { foraDoDraft, precisaConfirmarForaDoDraft: true } : {}),
            },
            { status: 409 },
          );
        }

        // Com versão: a virada substitui times e jogadores a partir do que leu, então uma
        // gravação que entre no meio seria perdida em silêncio.
        const { dataset, versao } = await readDatasetComVersao();

        // ⚠ Trava que não estava no plano, e que precisa existir: trocar os jogadores
        // de uma temporada que JÁ TEM partidas registradas deixa as estatísticas
        // apontando para gente que não está mais no dataset — placar de série
        // referenciando jogador inexistente. A virada é para uma temporada recém
        // aberta, não para uma em andamento.
        if (dataset.seriesMatches.length > 0) {
          return NextResponse.json(
            {
              error:
                "Esta temporada já tem séries registradas. Arquive-a e comece a 4ª Edição antes de aplicar o draft.",
            },
            { status: 409 },
          );
        }

        // Temporada encerrada não recebe time novo: a 3ª fica "finished" depois de
        // arquivada, e virar por cima dela gravava os times da 4ª num campeonato fechado
        // (com o nome e o seasonId da 3ª). O caminho é Torneio → Iniciar a 4ª Edição.
        if (dataset.tournament.status !== "active") {
          return NextResponse.json(
            {
              error:
                "A temporada no ar está encerrada. Em Torneio, inicie a 4ª Edição (sem manter times e jogadores) antes de aplicar o draft.",
            },
            { status: 409 },
          );
        }

        /*
         * `standingsSeed` NÃO pode ser herdada da composição anterior.
         *
         * A virada substitui o conjunto inteiro de times, então cada linha da
         * classificação inicial passava a apontar para um `teamId` que não existe mais.
         * A trava acima só cobre `seriesMatches`; a semente ficava de fora e viajava
         * intacta para a edição nova, alimentando a tabela com times fantasmas.
         *
         * Filtrar (em vez de zerar) mantém o caso legítimo de uma semente que já foi
         * escrita com os times novos.
         */
        const semente = dataset.standingsSeed.filter((linha) =>
          resultado.teams.some((time) => time.id === linha.teamId),
        );

        /*
         * Reaplicar troca `teams` e `players` INTEIROS pela saída do draft. Entre a virada e
         * o calendário a organização edita o site (foto do jogador, nome escolhido pelo
         * time), e um segundo clique em «Aplicar no site» apagava isso calado. O id de cada
         * time no site sai do nome fixo da posição (lib/draft/times.ts → virada.ts), igual
         * em qualquer draft com o mesmo número de times; então o mesmo conjunto no ar quer
         * dizer "já aplicado" — inclusive de um draft refeito, que também apagaria as
         * edições. Só segue com a confirmação explícita no corpo.
         */
        const idsNoAr = dataset.teams.map((t) => t.id).sort();
        const idsDoDraft = resultado.teams.map((t) => t.id).sort();
        const jaAplicado =
          idsNoAr.length > 0 && idsNoAr.length === idsDoDraft.length && idsNoAr.every((id, i) => id === idsDoDraft[i]);
        if (jaAplicado && corpo.confirmoReaplicar !== true) {
          return NextResponse.json(
            {
              error:
                "O draft já foi aplicado no site. Aplicar de novo substitui times e jogadores inteiros e apaga o que foi editado depois (fotos dos jogadores, nomes dos times). Confirme para reaplicar.",
              precisaConfirmar: true,
            },
            { status: 409 },
          );
        }

        try {
          await saveDataset(
            {
              ...dataset,
              teams: resultado.teams,
              players: resultado.players,
              standingsSeed: semente,
            },
            { versaoEsperada: versao },
          );
        } catch (erro) {
          if (erro instanceof ConflitoDeVersaoError) {
            return NextResponse.json(
              {
                error:
                  "Alguém salvou o campeonato enquanto o draft era aplicado. Recarregue e tente de novo.",
                conflict: true,
              },
              { status: 409 },
            );
          }
          throw erro;
        }

        const naoAptosSemTime = [
          ...jogadoresQueSairamDoPool(estado).map((j) => j.riotId),
          ...foraDoDraft.filter((f) => f.lugar === "pool").map((f) => f.riotId),
        ];
        await registrarAuditoria({
          autor,
          acao: "draft_virado_para_o_dataset",
          detalhe: {
            times: resultado.teams.length,
            jogadores: resultado.players.length,
            reservas: reservas.length,
            ...(avisos.length > 0 ? { avisos } : {}),
            // Aplicado com a confirmação: fica registrado quem não era mais apto num elenco.
            ...(precisamConfirmar.length > 0 ? { confirmadoForaDoDraft: precisamConfirmar } : {}),
            // E quem não é mais apto e não foi para time nenhum (não pediu confirmação): quem
            // saiu do pool não vai para o site; quem voltou a sobra ou pendente vai como reserva.
            ...(naoAptosSemTime.length > 0 ? { naoAptosSemTime } : {}),
          },
        });

        return NextResponse.json({ ok: true, avisos, ...resultado });
      }

      case "calendario": {
        /*
         * Sorteia a posição de cada time no calendário da 4ª (Time 1 … Time 8) e cria as
         * séries da fase de pontos (28 com 8 times), com data e hora (lib/calendario-4a.ts).
         *
         * Só com a grade divulgada — desde 2026-10-22 as datas de 8 times estão "a
         * divulgar", e sem data não há série para criar. Depois, só depois da virada, numa
         * temporada aberta e ainda sem nenhuma série — e só com os times DESTE draft. Sem
         * essa última trava, um clique antes da virada criava o calendário da 4ª com os
         * times da 3ª.
         */
        if (!calendarioDivulgado()) {
          return NextResponse.json({ error: motivoSemCalendario(), semCalendario: true }, { status: 409 });
        }
        if (!estado) return NextResponse.json({ error: "Monte e aplique o draft primeiro." }, { status: 409 });

        const { dataset, versao } = await readDatasetComVersao();
        if (dataset.tournament.status !== "active") {
          return NextResponse.json(
            { error: "A temporada no ar está encerrada. Inicie a 4ª Edição em Torneio primeiro." },
            { status: 409 },
          );
        }
        if (dataset.seriesMatches.length > 0) {
          return NextResponse.json(
            {
              error: `Esta temporada já tem ${dataset.seriesMatches.length} série(s). O calendário só é criado numa temporada sem séries — para refazer, apague as séries no painel de Séries.`,
            },
            { status: 409 },
          );
        }

        const timesDoDraft = datasetDoDraft(estado).teams.map((t) => t.id).sort();
        const timesNoAr = dataset.teams.map((t) => t.id);
        const mesmos =
          timesNoAr.length === timesDoDraft.length && [...timesNoAr].sort().every((id, i) => id === timesDoDraft[i]);
        if (!mesmos) {
          return NextResponse.json(
            { error: "Os times no ar não são os deste draft. Aplique o draft (virada) antes de criar o calendário." },
            { status: 409 },
          );
        }
        if (timesNoAr.length !== TIMES_DO_CALENDARIO_4A) {
          return NextResponse.json(
            {
              error: `O calendário da 4ª é de ${TIMES_DO_CALENDARIO_4A} times, e há ${timesNoAr.length} no ar. Crie as séries à mão no painel de Séries.`,
            },
            { status: 409 },
          );
        }

        const sementeDoSorteio = novaSemente();
        const posicoes = embaralhar(sementeDoSorteio, "calendario", timesNoAr);
        const series = seriesDaFaseDePontos(posicoes);

        try {
          await saveDataset({ ...dataset, seriesMatches: series }, { versaoEsperada: versao });
        } catch (erro) {
          if (erro instanceof ConflitoDeVersaoError) {
            return NextResponse.json(
              { error: "Alguém salvou o campeonato agora há pouco. Recarregue e tente de novo.", conflict: true },
              { status: 409 },
            );
          }
          throw erro;
        }

        const nomePor = new Map(dataset.teams.map((t) => [t.id, t.name]));
        const resultado = posicoes.map((id, i) => ({ posicao: i + 1, teamId: id, nome: nomePor.get(id) ?? id }));

        await registrarAuditoria({
          autor,
          acao: "calendario_sorteado",
          detalhe: { semente: sementeDoSorteio, entrada: timesNoAr, posicoes: resultado, series: series.length },
        });

        return NextResponse.json({ ok: true, posicoes: resultado, series: series.length, semente: sementeDoSorteio });
      }

      default:
        return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
    }
  } catch (error) {
    return respostaDeErro("api/admin/draft", error, "Não foi possível conduzir o draft.");
  }
}

function conflito() {
  return NextResponse.json(
    { error: "O draft mudou enquanto você agia. Recarregue e tente de novo." },
    { status: 409 },
  );
}

/** A tela agiu sobre um draft que não é mais o de agora. O painel relê o estado ao receber. */
function painelDesatualizado(error: string) {
  return NextResponse.json({ error, desatualizado: true }, { status: 409 });
}
