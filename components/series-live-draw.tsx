"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { preload } from "react-dom";
import { useRouter } from "next/navigation";
import { Lock, Maximize2, MonitorPlay, Shuffle, Swords, Users, Volume1, Volume2, VolumeX } from "lucide-react";

import type { CardId } from "@/lib/schema";
import { CARDS_BY_ID, CARTAS_ATIVAS, letraDaCarta, type CardDef } from "@/lib/cards";
import { compartilhados } from "@/lib/i18n/messages/compartilhados";
import { paginasStats } from "@/lib/i18n/messages/paginas-stats";
import { coresDoConfronto } from "@/lib/series/cores-do-confronto";
import { identidadeDoTime } from "@/lib/series/identidade-do-time";
import { criarSomDaCerimonia } from "@/lib/series/som-da-cerimonia";
import {
  CerimoniaDeSorteio,
  type PedidoDeSorteio,
  type RespostaSorteio,
  type TextosDaCerimonia,
} from "@/components/series/cerimonia-de-sorteio";
import { EscudoDoShow, NomeDoTime, type TimeDoShow } from "@/components/series/escudo-do-show";
import type { TextoDaCarta } from "@/components/series/palco-das-cartas";
import {
  DEGRAUS_DE_VOLUME,
  useMovimentoReduzidoDoSistema,
  useShowCompleto,
  useTelaCheia,
  useVolumeDoShow,
} from "@/components/series/preferencias-do-show";

import p from "@/components/partida/partida.module.css";

/** Textos do bloco. Opcional: sem eles o sorteio fica em português (padrão do site). */
type TextosSorteio = (typeof compartilhados)["pt"];

/** O time como a página entrega: id e nome sempre; escudo, slug e fonte do tema quando houver. */
type TimeRef = Readonly<{
  id: string;
  name: string;
  slug?: string | null;
  imageUrl?: string | null;
  /** A classe do next/font da fonte de título do tema (a página resolve no servidor). */
  fonteClasse?: string | null;
}>;
type Drawn = { teamId: string; cardId: string; dupla?: boolean };

type Sorteio = {
  tipo: string;
  semente: string;
  autor: string;
  /** Time que recebeu a carta (ausente no sorteio duplo, que vale para os dois). */
  teamId?: string;
  resultado: string;
  detalhe?: { letras?: [string, string]; campeoes?: number; dupla?: boolean };
};
type SessaoAdmin = {
  authorized?: boolean;
  user?: { isMaster?: boolean; scopes?: string[] };
};

/**
 * Os dois times com a identidade visual do tema e a cor de palco do confronto, memoizados por
 * PRIMITIVOS (ver o comentário no uso).
 */
function useTimesDoShow(a: TimeRef | null, b: TimeRef | null): [TimeDoShow, TimeDoShow] {
  const [idA, nomeA, slugA, imagemA, fonteA] = [a?.id, a?.name, a?.slug ?? null, a?.imageUrl ?? null, a?.fonteClasse ?? null];
  const [idB, nomeB, slugB, imagemB, fonteB] = [b?.id, b?.name, b?.slug ?? null, b?.imageUrl ?? null, b?.fonteClasse ?? null];
  return useMemo(() => {
    const ia = identidadeDoTime(idA && nomeA ? { id: idA, name: nomeA, slug: slugA, imageUrl: imagemA } : null, "A");
    const ib = identidadeDoTime(idB && nomeB ? { id: idB, name: nomeB, slug: slugB, imageUrl: imagemB } : null, "B");
    const [palcoA, palcoB] = coresDoConfronto(ia.candidatasDePalco, ib.candidatasDePalco);
    return [
      { ...ia, fonteClasse: fonteA, corDePalco: palcoA },
      { ...ib, fonteClasse: fonteB, corDePalco: palcoB },
    ];
  }, [idA, nomeA, slugA, imagemA, fonteA, idB, nomeB, slugB, imagemB, fonteB]);
}

/** Os textos de cada carta (nome, sabor, regra, frase concreta) — da página, ou o padrão em pt. */
function textosPadraoDasCartas(): Record<string, TextoDaCarta> {
  return paginasStats.pt.cartas as Record<string, TextoDaCarta>;
}

/**
 * A ARENA DO SORTEIO — o bloco de sorteios na página pública da partida.
 *
 * Ela MOSTRA o estado atual (quem está em cada lado do jogo 1, que cartinha cada time tirou, de
 * onde veio cada resultado) e, para quem tem escopo, abre o SHOW em tela cheia
 * (`CerimoniaDeSorteio`). O sorteio em si não acontece aqui nem na cerimônia: acontece em
 * `POST /api/admin/series/sorteio`, no servidor, com uma semente gravada na série.
 *
 * Antes de este arquivo existir assim, o botão sorteava no próprio navegador com
 * `Math.random()` e mandava o resultado pronto — dava para recarregar e sortear de novo até
 * gostar. E a gravação era `fetch(...).catch(() => {})`, então falha de rede deixava a tela
 * mostrando um resultado que nunca foi salvo.
 *
 * Para a transmissão, a organização ganha um painel: MODO TRANSMISSÃO (esconde o cabeçalho e o
 * resto da página, deixando o confronto e a arena), TELA CHEIA, TESTAR SOM (calibrar o OBS antes
 * de entrar no ar) e o aviso de movimento reduzido do sistema, que mataria o show ao vivo.
 */
export function SeriesLiveDraw({
  seriesId,
  teamA,
  teamB,
  initialCards,
  initialBlueSideTeamId,
  initialSorteiosDasCartas,
  initialUltimoLados,
  textos: t = compartilhados.pt,
  nomesCartas,
  textosDasCartas,
  ladosTravados = false,
  decididaPorWo = false,
  somenteLeitura = false,
  baralhoEm,
}: Readonly<{
  seriesId: string;
  teamA: TimeRef | null;
  teamB: TimeRef | null;
  initialCards: Drawn[];
  initialBlueSideTeamId?: string | null;
  /**
   * O último registro de CARTA (sorteio ou correção à mão) de cada time, por id do time — o
   * sorteio duplo, que não tem time, vale para os dois (ver `registrosDasCartasPorTime`).
   *
   * As letras do ABCDRAFT e a linha de procedência (semente e autor) vinham só da resposta da
   * cerimônia, então existiam apenas na aba de quem clicou: qualquer recarga — ou qualquer outra
   * pessoa abrindo a página — via a carta sem as letras que a completam e sem a semente que
   * permite conferir o sorteio. E é POR TIME: com um registro só ("o último sorteio de carta"),
   * sortear a carta do time B apagava da tela as letras e a semente da carta do time A.
   */
  initialSorteiosDasCartas?: Readonly<Record<string, Sorteio>>;
  /**
   * O último sorteio (ou correção à mão) de LADOS. A procedência dos lados fica à vista como a
   * das cartas: sem a semente, "o servidor sorteou" vira "confie em nós".
   */
  initialUltimoLados?: Sorteio | null;
  textos?: TextosSorteio;
  /** Nome de cada cartinha por id, traduzido. Opcional: sem ele vale lib/cards.ts (pt). */
  nomesCartas?: Record<string, string>;
  /** Nome, sabor, regra e frase concreta de cada carta, traduzidos (a cerimônia mostra). */
  textosDasCartas?: Record<string, TextoDaCarta>;
  /** O jogo 1 já foi registrado: o servidor recusaria sortear os lados. */
  ladosTravados?: boolean;
  /** Série decidida por W.O.: não há partida para sortear. */
  decididaPorWo?: boolean;
  /**
   * Partida de temporada ARQUIVADA: só mostra o que foi sorteado. Nem pergunta a sessão — a rota
   * de sorteio trabalha no campeonato no ar, e um botão aqui sortearia na série de mesmo id da
   * temporada atual. Módulo sem registro (sem lado, sem carta) some em vez de dizer "a sortear".
   */
  somenteLeitura?: boolean;
  /**
   * A data do BARALHO das letras das cartas (A, B, C… — `letraDaCarta`). Sem ela, o de hoje. No
   * arquivo é a data da partida: na 3ª eram seis cartas (a Yuumi era D), na 4ª são cinco, e a
   * letra de hoje contaria a história errada.
   */
  baralhoEm?: string;
}>) {
  const [podeLados, setPodeLados] = useState(false);
  const [podeCartas, setPodeCartas] = useState(false);
  const [blueSideTeamId, setBlueSideTeamId] = useState<string | null>(initialBlueSideTeamId ?? null);
  const [cardByTeam, setCardByTeam] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {};
    for (const card of initialCards) map[card.teamId] = card.cardId;
    return map;
  });
  const [isDupla, setIsDupla] = useState(() => initialCards.some((card) => card.dupla));
  const [sorteiosDasCartas, setSorteiosDasCartas] = useState<Record<string, Sorteio>>(() => ({ ...initialSorteiosDasCartas }));
  const [ultimoLados, setUltimoLados] = useState<Sorteio | null>(initialUltimoLados ?? null);
  const [pedido, setPedido] = useState<PedidoDeSorteio | null>(null);
  const [emTransmissao, setEmTransmissao] = useState(false);
  /*
   * Conta os cliques só para servir de `key` à cerimônia.
   *
   * Remontar a cada clique é o que garante que a roda comece do zero e que o sorteio saia
   * UMA vez. Sem isso o mesmo componente era reaproveitado e o efeito reexecutava a cada
   * `router.refresh()` — o que gravou 24 sorteios a partir de um clique só.
   */
  const [rodada, setRodada] = useState(0);
  /** Quantos ensaios já rodaram (o resultado de demonstração alterna a cada um). */
  const ensaios = useRef(0);
  /** Há resultado novo que o resto da página (servidor) ainda não mostra. */
  const atualizarDepois = useRef(false);
  const cerimoniaAberta = useRef(false);

  const reduzidoDoSistema = useMovimentoReduzidoDoSistema();
  const [showCompleto, setShowCompleto] = useShowCompleto();
  const [telaCheia, alternarTelaCheia] = useTelaCheia();
  // O volume é UM só: o do «Testar som» é o que a cerimônia vai tocar na live.
  const [degrau, proximoVolume, alternarMudo] = useVolumeDoShow();

  /*
   * A identidade de cada time memoizada por PRIMITIVOS, nunca pelo objeto `teamA`/`teamB`.
   * `router.refresh()` devolve times novos em memória — mesmos dados, outra identidade —, e um
   * memo por objeto recalculava, a cerimônia via dependência nova e sorteava OUTRA VEZ (um
   * clique virou 24 sorteios gravados em 52 segundos).
   */
  const [timeA, timeB] = useTimesDoShow(teamA, teamB);
  const temOsDois = Boolean(teamA && teamB);
  const idA = timeA.id;
  const idB = timeB.id;

  const abrir = useCallback((novo: PedidoDeSorteio) => {
    setRodada((n) => n + 1);
    cerimoniaAberta.current = true;
    setPedido(novo);
  }, []);
  const router = useRouter();

  useEffect(() => {
    if (somenteLeitura) return;
    // `authorized` sozinho só diz que é da organização. Sortear lado e sortear carta são
    // escopos distintos — oferecer o botão a quem não os tem só entrega um 403.
    fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.json())
      .then((data: SessaoAdmin) => {
        const u = data?.user;
        const tem = (escopo: string) =>
          Boolean(data?.authorized && u && (u.isMaster || (u.scopes ?? []).includes(escopo)));
        setPodeLados(tem("series:sides"));
        setPodeCartas(tem("series:cards"));
      })
      .catch(() => {});
  }, [somenteLeitura]);

  // Quem vai conduzir o sorteio de cartas já baixa as artes: na virada da carta, ao vivo, a
  // imagem precisa estar pronta (sem ela entra o emoji de reserva).
  useEffect(() => {
    if (!podeCartas) return;
    for (const carta of CARTAS_ATIVAS) if (carta.imageUrl) preload(carta.imageUrl, { as: "image" });
  }, [podeCartas]);

  /*
   * MODO TRANSMISSÃO: a classe vive no <html> porque o cabeçalho do site está fora desta árvore
   * (o mesmo padrão do modo TV do draft). Esconde cabeçalho, rodapé e as seções marcadas
   * `data-fora-do-palco`, deixando o confronto e a arena para o OBS.
   */
  useEffect(() => {
    if (!emTransmissao) return;
    const raiz = document.documentElement;
    raiz.classList.add("lob-palco");
    window.scrollTo({ top: 0 });
    return () => raiz.classList.remove("lob-palco");
  }, [emTransmissao]);

  /**
   * O resultado já está gravado quando isto roda — a cerimônia avisa assim que o servidor
   * responde, ainda com a peça girando.
   *
   * A arena é sincronizada aqui A PARTIR DA RESPOSTA: os estados locais nascem de `useState`
   * com valor inicial, e um refresh do servidor não reexecuta inicializador de estado.
   *
   * O `router.refresh()` (que re-renderiza a página inteira: placar, bandeira de lado no herói)
   * fica para QUANDO A CERIMÔNIA FECHAR. Disparado no meio do freio, ele disputava a thread com
   * a animação — o engasgo aparecia justamente na hora que a plateia está olhando.
   */
  const aplicarResposta = useCallback(
    (resposta: RespostaSorteio) => {
      // Só sorteio de CARTA entra em `sorteiosDasCartas` (as letras do ABCDRAFT e a semente de
      // cada vaga): carimbar um sorteio de LADOS ali fazia a vaga exibir a semente dos lados.
      if (resposta.sorteio && resposta.sorteio.tipo !== "lados") {
        const registro = resposta.sorteio as Sorteio;
        // Individual: o time dele. Duplo (sem time): vale para os dois.
        const donos = registro.teamId ? [registro.teamId] : [idA, idB];
        setSorteiosDasCartas((antes) => ({ ...antes, ...Object.fromEntries(donos.map((id) => [id, registro])) }));
      }

      if (resposta.sorteio?.tipo === "lados") {
        setBlueSideTeamId(resposta.blueSideTeamId ?? null);
        setUltimoLados(resposta.sorteio as Sorteio);
      } else {
        const cartas = resposta.cardsUsed ?? [];
        const mapa: Record<string, string | null> = {};
        for (const c of cartas) mapa[c.teamId] = c.cardId;
        setCardByTeam(mapa);
        setIsDupla(cartas.some((c) => c.dupla));
      }

      if (cerimoniaAberta.current) atualizarDepois.current = true;
      else router.refresh();
    },
    [router, idA, idB],
  );

  /** A resposta não veio (rede, gateway): o sorteio PODE estar gravado — a página confere ao fechar. */
  const respostaIncerta = useCallback(() => {
    atualizarDepois.current = true;
  }, []);

  const fecharCerimonia = useCallback(() => {
    cerimoniaAberta.current = false;
    setPedido(null);
    if (atualizarDepois.current) {
      atualizarDepois.current = false;
      router.refresh();
    }
  }, [router]);

  const volume = DEGRAUS_DE_VOLUME[degrau] ?? 0.65;
  const testarSom = useCallback(() => {
    const som = criarSomDaCerimonia(volume);
    if (!som) return;
    som.abertura();
    setTimeout(() => som.revelar("azul"), 900);
    setTimeout(() => som.fechar(), 5200);
  }, [volume]);
  const IconeDoVolume = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const rotuloDoVolume = `${t.cerimoniaSom}: ${t.cerimoniaVolumes[degrau] ?? ""}`;

  const blueTeam = temOsDois ? (blueSideTeamId === timeB.id ? timeB : blueSideTeamId === timeA.id ? timeA : null) : null;
  const redTeam = blueTeam ? (blueTeam.id === timeA.id ? timeB : timeA) : null;

  /*
   * O registro só descreve a vaga se a carta à vista é a que ELE deu: depois de uma correção à
   * mão, letras e semente antigas embaixo da carta nova pareciam ter produzido a nova.
   */
  const registroDaVaga = (teamId: string): Sorteio | null => {
    const registro = sorteiosDasCartas[teamId];
    return registro && cardByTeam[teamId] === registro.resultado ? registro : null;
  };
  const registroA = registroDaVaga(idA);
  const registroB = registroDaVaga(idB);
  // O sorteio duplo é UM registro para as duas vagas (a mesma semente): a procedência sai uma
  // vez, embaixo delas. Correções à mão de dupla são uma por time e ficam em cada vaga.
  const registroDuplo =
    isDupla && registroA && registroB && registroA.semente !== "" && registroA.semente === registroB.semente ? registroA : null;

  const cartasDaPagina = textosDasCartas ?? textosPadraoDasCartas();
  const podeAlgo = podeLados || podeCartas;
  const semSorteio = decididaPorWo;
  // No arquivo, módulo sem registro some (não há o que sortear nem o que mostrar).
  const mostrarLados = temOsDois && (!somenteLeitura || blueTeam !== null);
  const mostrarCartas = !somenteLeitura || Object.values(cardByTeam).some(Boolean);

  const textosDaCerimonia: TextosDaCerimonia = {
    titulo: t.cerimoniaTitulo,
    fechar: t.cerimoniaFechar,
    vai: t.cerimoniaVai,
    ladoAzul: t.sorteioLadoAzul,
    ladoVermelho: t.sorteioLadoVermelho,
    resultado: t.cerimoniaResultado,
    semente: t.sorteioSemente,
    porFulano: t.sorteioPorFulano,
    falhou: t.sorteioFalhou,
    semConexao: t.cerimoniaSemConexao,
    semResposta: t.cerimoniaSemResposta,
    repetido: t.sorteioRepetido,
    sorteando: t.sorteioSorteando,
    frases: t.cerimoniaFrases,
    tituloLados: t.cerimoniaTituloLados,
    tituloCarta: t.cerimoniaTituloCarta,
    tituloDupla: t.cerimoniaTituloDupla,
    perguntaLados: t.cerimoniaPerguntaLados,
    jogo1: t.cerimoniaJogo1,
    comecaNo: t.cerimoniaComecaNo,
    som: t.cerimoniaSom,
    volumes: t.cerimoniaVolumes,
    telaCheia: t.cerimoniaTelaCheia,
    sairDaTelaCheia: t.cerimoniaSairDaTelaCheia,
    reduzidoAviso: t.cerimoniaReduzidoAviso,
    showCompleto: t.cerimoniaShowCompleto,
    atalhos: t.cerimoniaAtalhos,
    atalhosTelaCheia: t.cerimoniaAtalhosTelaCheia,
    atalhosTelaCheiaSemTrava: t.cerimoniaAtalhosTelaCheiaSemTrava,
    aoVivo: t.cerimoniaAoVivo,
    ensaioMarca: t.cerimoniaEnsaioMarca,
    ensaioCreditos: t.cerimoniaEnsaioCreditos,
    letreirosLados: t.cerimoniaLetreirosLados,
    letreirosCarta: t.cerimoniaLetreirosCarta,
    letreirosDupla: t.cerimoniaLetreirosDupla,
    cartas: {
      usouACarta: t.cerimoniaUsouACarta,
      sofre: t.cerimoniaSofre,
      osDoisTimes: t.cerimoniaOsDoisTimes,
      tituloDupla: t.cerimoniaDuploCabecalho,
      valeParaOsDois: t.cerimoniaOsDoisTimes,
      saiuACarta: t.cerimoniaSaiuACarta,
      carta: t.cerimoniaCarta,
      surpresa: t.cerimoniaChipSurpresa,
      dupla: t.cerimoniaChipDupla,
      lendaria: t.cerimoniaLendaria,
      oQueAcontece: t.cerimoniaOQueAcontece,
      aRegra: t.cerimoniaARegra,
      letras: t.sorteioLetras,
      campeoesDisponiveis: t.sorteioCampeoesDisponiveis,
    },
  };

  return (
    <>
      <section className={p.arena} aria-labelledby="arena-do-sorteio">
        <span aria-hidden className={p.enfGradeDaArena} />
        {/* <div>, não <header>: o modo transmissão esconde todo <header> da página (o do site). */}
        <div className={p.arenaCabecalho}>
          <div className={p.arenaTitulos}>
            <p className={p.olho}>{t.arenaOlho}</p>
            <h2 id="arena-do-sorteio" className={p.arenaTitulo}>
              {t.arenaTitulo}
            </h2>
            {/* No arquivo, "quem sorteia é o servidor" seria falso para o que foi lançado à mão antes
                de o sorteio existir no site. */}
            <p className={p.arenaSub}>{somenteLeitura ? t.arenaSubtituloArquivo : t.arenaSubtitulo}</p>
          </div>
          {podeAlgo ? (
            <span className={p.seloAoVivo}>
              <span aria-hidden className={p.enfPontoAoVivo} />
              {t.sorteioAoVivo}
            </span>
          ) : null}
        </div>

        <div className={`${p.arenaGrade} ${mostrarLados && mostrarCartas ? "" : p.arenaGradeUnica}`}>
          {/* ------------------------------------------------ LADOS · JOGO 1 */}
          {mostrarLados ? (
            <div className={p.modulo}>
              <p className={p.moduloTitulo}>{t.sorteioLadosTitulo}</p>
              <div className={p.portoes}>
                <Portao lado="azul" rotulo={t.sorteioLadoAzul} time={blueTeam} vazio={t.arenaASortear} />
                <Portao lado="vermelho" rotulo={t.sorteioLadoVermelho} time={redTeam} vazio={t.arenaASortear} />
              </div>
              {/* Procedência dos lados: só descreve o que está na tela (o lado azul atual). */}
              {ultimoLados?.tipo === "lados_manual" ? (
                <p className={p.procedencia}>
                  {t.sorteioCorrecaoManual} {ultimoLados.autor}
                </p>
              ) : ultimoLados?.tipo === "lados" && ultimoLados.semente && ultimoLados.resultado === blueSideTeamId ? (
                <p className={p.procedencia}>
                  <span className={p.mono}>
                    {t.sorteioSemente}: {ultimoLados.semente}
                  </span>
                  {" · "}
                  {t.sorteioPorFulano} {ultimoLados.autor}
                </p>
              ) : null}
              {somenteLeitura ? null : semSorteio ? (
                <p className={p.observacao}>{t.arenaWo}</p>
              ) : ladosTravados ? (
                <p className={p.observacao}>
                  <Lock aria-hidden className={p.iconeMiudo} /> {t.arenaLadosTravados}
                </p>
              ) : podeLados ? (
                <button type="button" className={p.botaoOuro} onClick={() => abrir({ tipo: "lados" })}>
                  <Swords aria-hidden /> {t.sorteioBotaoLados}
                </button>
              ) : null}
            </div>
          ) : null}

          {/* ------------------------------------------------ CARTINHAS DA SÉRIE */}
          {mostrarCartas ? (
            <div className={p.modulo}>
              <p className={p.moduloTitulo}>{t.sorteioCartinhasTitulo}</p>
              {isDupla ? <p className={p.faixaDupla}>{t.sorteioDuplo}</p> : null}
              <div className={p.vagas}>
                {teamA ? (
                  <VagaDaCarta
                    time={timeA}
                    oponente={teamB ? timeB : null}
                    cardId={cardByTeam[timeA.id] ?? null}
                    registro={registroDuplo ? null : registroA}
                    t={t}
                    nomesCartas={nomesCartas}
                    cartas={cartasDaPagina}
                    podeSortear={podeCartas && !semSorteio}
                    baralhoEm={baralhoEm}
                    onSortear={() => abrir({ tipo: "carta", teamId: timeA.id })}
                  />
                ) : null}
                {teamB ? (
                  <VagaDaCarta
                    time={timeB}
                    oponente={teamA ? timeA : null}
                    cardId={cardByTeam[timeB.id] ?? null}
                    registro={registroDuplo ? null : registroB}
                    t={t}
                    nomesCartas={nomesCartas}
                    cartas={cartasDaPagina}
                    podeSortear={podeCartas && !semSorteio}
                    baralhoEm={baralhoEm}
                    onSortear={() => abrir({ tipo: "carta", teamId: timeB.id })}
                  />
                ) : null}
              </div>

              {registroDuplo ? <ProcedenciaDaCarta registro={registroDuplo} t={t} /> : null}

              {podeCartas && temOsDois && !semSorteio ? (
                <div className={p.dupla}>
                  <button type="button" className={p.botaoContorno} onClick={() => abrir({ tipo: "carta", dupla: true })}>
                    <Users aria-hidden /> {t.sorteioBotaoDupla}
                  </button>
                  <p className={p.explicacao}>{t.sorteioDuplaExplicacao}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ------------------------------------------------ painel da organização */}
        {podeAlgo ? (
          <div className={p.operador}>
            <p className={p.operadorRotulo}>{t.arenaOperador}</p>
            <div className={p.operadorBotoes}>
              <button
                type="button"
                className={p.botaoContorno}
                aria-pressed={emTransmissao}
                onClick={() => setEmTransmissao((v) => !v)}
              >
                <MonitorPlay aria-hidden /> {emTransmissao ? t.arenaSairDaTransmissao : t.arenaModoTransmissao}
              </button>
              <button type="button" className={p.botaoContorno} aria-pressed={telaCheia} onClick={alternarTelaCheia}>
                <Maximize2 aria-hidden /> {telaCheia ? t.cerimoniaSairDaTelaCheia : t.cerimoniaTelaCheia}
              </button>
              <button type="button" className={p.botaoContorno} onClick={proximoVolume} aria-label={rotuloDoVolume}>
                <IconeDoVolume aria-hidden /> {rotuloDoVolume}
              </button>
              <button type="button" className={p.botaoContorno} onClick={testarSom}>
                <Volume2 aria-hidden /> {t.arenaTestarSom}
              </button>
            </div>
            {temOsDois ? (
              <div className={p.operadorBotoes}>
                {/* ENSAIO: a cerimônia completa sem pedir nada ao servidor (nem gravar). Os nomes não
                    repetem "sortear lados": o botão de verdade é um só. */}
                <span className={p.operadorRotuloMiudo}>{t.arenaEnsaio}</span>
                <button type="button" className={p.botaoEnsaio} onClick={() => abrir({ tipo: "lados", ensaio: ensaios.current++ })}>
                  {t.arenaEnsaioLados}
                </button>
                <button
                  type="button"
                  className={p.botaoEnsaio}
                  onClick={() => abrir({ tipo: "carta", teamId: timeA.id, ensaio: ensaios.current++ })}
                >
                  {t.arenaEnsaioCarta}
                </button>
                <button type="button" className={p.botaoEnsaio} onClick={() => abrir({ tipo: "carta", dupla: true, ensaio: ensaios.current++ })}>
                  {t.arenaEnsaioDupla}
                </button>
              </div>
            ) : null}
            {reduzidoDoSistema ? (
              <p className={p.avisoReduzido}>
                <span>{showCompleto ? t.cerimoniaShowCompletoLigado : t.cerimoniaReduzidoAviso}</span>
                <button type="button" onClick={() => setShowCompleto(!showCompleto)}>
                  {showCompleto ? t.arenaVoltarAoCalmo : t.cerimoniaShowCompleto}
                </button>
              </p>
            ) : null}
            <p className={p.explicacao}>{t.arenaDicaObs}</p>
          </div>
        ) : null}
      </section>

      {temOsDois && !somenteLeitura ? (
        <CerimoniaDeSorteio
          key={rodada}
          aberto={pedido !== null}
          pedido={pedido}
          onFechar={fecharCerimonia}
          onSorteado={aplicarResposta}
          seriesId={seriesId}
          timeA={timeA}
          timeB={timeB}
          t={textosDaCerimonia}
          textosDasCartas={cartasDaPagina}
          showCompleto={showCompleto}
          onShowCompleto={setShowCompleto}
          degrau={degrau}
          onProximoVolume={proximoVolume}
          onAlternarMudo={alternarMudo}
          onIncerto={respostaIncerta}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- peças da arena

function Portao({
  lado,
  rotulo,
  time,
  vazio,
}: Readonly<{ lado: "azul" | "vermelho"; rotulo: string; time: TimeDoShow | null; vazio: string }>) {
  return (
    <div className={`${p.portao} ${lado === "azul" ? p.portaoAzul : p.portaoVermelho} ${time ? p.portaoSorteado : ""}`}>
      <span className={p.portaoRotulo}>{rotulo}</span>
      {time ? (
        <>
          <EscudoDoShow time={time} className={p.portaoEscudo} />
          <NomeDoTime time={time} className={p.portaoNome} />
        </>
      ) : (
        <>
          <span aria-hidden className={p.portaoInterrogacao}>
            ?
          </span>
          <span className={p.portaoVazio}>{vazio}</span>
        </>
      )}
    </div>
  );
}

function VagaDaCarta({
  time,
  oponente,
  cardId,
  registro,
  t,
  nomesCartas,
  cartas,
  podeSortear,
  onSortear,
  baralhoEm,
}: Readonly<{
  time: TimeDoShow;
  oponente: TimeDoShow | null;
  cardId: string | null;
  /** O registro que deu a carta à vista (sorteio ou correção à mão), quando ele a descreve. */
  registro: Sorteio | null;
  t: TextosSorteio;
  nomesCartas?: Record<string, string>;
  cartas: Record<string, TextoDaCarta>;
  podeSortear: boolean;
  onSortear: () => void;
  /** O baralho da letra (ver `baralhoEm` da arena). */
  baralhoEm?: string;
}>) {
  const def: CardDef | undefined = cardId ? CARDS_BY_ID[cardId as CardId] : undefined;
  // O nome traduzido vem da página; sem ele vale o título em português de lib/cards.ts.
  const nome = def ? (nomesCartas?.[def.id] ?? cartas[def.id]?.nome ?? def.title) : undefined;
  const letra = def ? letraDaCarta(def.cardId, baralhoEm) : undefined;

  return (
    <div className={p.vaga}>
      <div className={p.vagaCabecalho}>
        <EscudoDoShow time={time} className={p.vagaEscudo} />
        <NomeDoTime time={time} className={p.vagaNome} como="span" />
      </div>

      {def ? (
        <div
          className={p.miniCarta}
          style={{ "--cor-carta": def.color, "--borda-carta": def.border } as CSSProperties}
        >
          <div className={p.miniArte}>
            {def.imageUrl ? (
              // Mesma arte da página /cartas — o emoji fica só como reserva.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={def.imageUrl} alt={nome ?? def.title} />
            ) : (
              <span aria-hidden>{def.emoji}</span>
            )}
            {letra ? <span className={p.miniLetra}>{letra}</span> : null}
          </div>
          <p className={p.miniNome}>{nome}</p>
          {def.dupla ? <p className={p.miniDupla}>{t.sorteioCartaDupla}</p> : null}
        </div>
      ) : (
        <div className={p.miniVerso}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" aria-hidden />
          <p className={p.miniSemCarta}>{t.sorteioSemCarta}</p>
        </div>
      )}

      {def && !def.dupla && oponente ? (
        <p className={p.vagaContra}>
          {t.arenaValeContra} <span style={{ color: oponente.cor }}>{oponente.nome}</span>
        </p>
      ) : null}

      {registro ? <ProcedenciaDaCarta registro={registro} t={t} naVaga /> : null}

      {podeSortear ? (
        <button
          type="button"
          className={p.botaoContorno}
          onClick={onSortear}
          aria-label={`${t.arenaSortearCartaPara} ${time.nome}`}
        >
          <Shuffle aria-hidden /> {t.sorteioBotaoSortear}
        </button>
      ) : null}
    </div>
  );
}

/**
 * As letras do ABCDRAFT e a PROCEDÊNCIA de uma carta. As letras completam a carta: sem elas o
 * ABCDRAFT não diz o que fazer. A procedência fica à vista porque o sorteio é do servidor e a
 * semente permite recalculá-lo depois — é o que separa "confie em nós" de "confira você mesmo".
 * A correção à mão (`carta_manual`, sem semente) ganha a própria linha, «correção manual por
 * fulano», para a carta não ficar sem procedência; o detalhe continua no histórico da série.
 */
function ProcedenciaDaCarta({ registro, t, naVaga = false }: Readonly<{ registro: Sorteio; t: TextosSorteio; naVaga?: boolean }>) {
  const letras = registro.tipo === "carta" ? registro.detalhe?.letras : undefined;
  return (
    <>
      {letras ? (
        <div className={`${p.letras} ${naVaga ? p.letrasNaVaga : ""}`}>
          <p className={p.letrasRotulo}>{t.sorteioLetras}</p>
          <p className={p.letrasPar}>{letras.join(" · ")}</p>
          {typeof registro.detalhe?.campeoes === "number" ? (
            <p className={p.letrasCampeoes}>
              {registro.detalhe.campeoes} {t.sorteioCampeoesDisponiveis}
            </p>
          ) : null}
        </div>
      ) : null}
      {registro.tipo === "carta_manual" ? (
        <p className={p.procedencia}>
          {t.sorteioCorrecaoManual} {registro.autor}
        </p>
      ) : registro.semente ? (
        <p className={p.procedencia}>
          <span className={p.mono}>
            {t.sorteioSemente}: {registro.semente}
          </span>
          {" · "}
          {t.sorteioPorFulano} {registro.autor}
        </p>
      ) : null}
    </>
  );
}
