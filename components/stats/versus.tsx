"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { Faiscas, type ApiFaiscas } from "@/components/series/faiscas";
import { useMovimentoReduzidoDoSistema } from "@/components/series/preferencias-do-show";
import { championIconUrl } from "@/lib/champions";
import { formatDateLabel, formatKda } from "@/lib/format";
import { coresDoConfronto, paraOklab } from "@/lib/series/cores-do-confronto";
import { confrontoDireto, proximasSeries, type DadosDaForja, type JogadorDaForja, type TimeDaForja } from "@/lib/stats/forja";

import { CartaDoJogador } from "./carta-do-jogador";
import { escreverPedidoDeVs, type PedidoDeVs } from "./constantes";
import { Medalhao, NomeDoTime, Rosto, coresDoTime, larguraDaMarca, larguraNaAnton, preencher } from "./pecas";
import { useForja, type TextosDaTela } from "./provedor";
import { TelaCheia } from "./tela-cheia";
import s from "./versus.module.css";

/**
 * O MODO VS — dois jogadores ou dois times frente a frente, em tela de luta. Feito para o caster:
 * um clique numa das PRÓXIMAS SÉRIES já monta o confronto da vez; o resto é escolher os dois
 * lados e apertar LUTAR.
 *
 * A tela de luta lê linha a linha quem leva cada número (o maior, ou o menor quando «menos é
 * melhor») e fecha com o veredito — «FULANO leva 6 de 8 quesitos»: toda linha da tela é um
 * quesito. Valor de draft e pontos de elenco ficam FORA da luta: são moeda de draft, não medida
 * de habilidade (é o que a página inteira repete). Quem ainda não jogou aparece com traço — zero
 * abate não é «menos mortes».
 *
 * Nos times, a segunda metade da tela é o ROTA A ROTA: os cinco duelos, jogador contra jogador
 * da mesma rota, pelo KDA.
 *
 * O confronto mora no endereço (`?vs=t:a,b` / `?vs=j:a,b`): dá para abrir o link antes da partida.
 */

type Lado = "a" | "b";
type Par = Readonly<{ a: string | null; b: string | null }>;

type Linha = Readonly<{
  chave: string;
  rotulo: string;
  nota?: string;
  /** null = sem dado (ainda não jogou): aparece «—» e a linha não conta. */
  a: number | null;
  b: number | null;
  textoA: string;
  textoB: string;
  /** Quanto da barra cada lado enche (0–1). */
  fracA: number;
  fracB: number;
  criterio: "maior" | "menor";
}>;

const TRACO = "—";

function vencedorDa(linha: Linha): Lado | "empate" | null {
  if (linha.a === null || linha.b === null) return null;
  if (linha.a === linha.b) return "empate";
  const aLeva = linha.criterio === "maior" ? linha.a > linha.b : linha.a < linha.b;
  return aLeva ? "a" : "b";
}

/** Uma linha de número simples: a barra é a fração do maior dos dois. */
function linha(
  chave: string,
  rotulo: string,
  a: number | null,
  b: number | null,
  criterio: Linha["criterio"],
  formato: (v: number) => string = String,
  nota?: string,
): Linha {
  const maior = Math.max(a ?? 0, b ?? 0, 0);
  const frac = (v: number | null) => (v === null || maior <= 0 ? 0 : Math.max(0, v) / maior);
  return {
    chave,
    rotulo,
    nota,
    a,
    b,
    textoA: a === null ? TRACO : formato(a),
    textoB: b === null ? TRACO : formato(b),
    fracA: frac(a),
    fracB: frac(b),
    criterio,
  };
}

/** Texto escuro ou claro sobre a cor do time (a placa de quem leva a linha). */
function tintaSobre(cor: string): string {
  const lab = paraOklab(cor);
  return lab && lab[0] < 0.62 ? "#fff8ec" : "#0b0805";
}

function semAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// ------------------------------------------------------------------------------------ as linhas

function linhasDosTimes(a: TimeDaForja, b: TimeDaForja, t: TextosDaTela, totalDeTimes: number): Linha[] {
  const { f, localeTag } = t;
  const jogouA = a.jogos.v + a.jogos.d > 0;
  const jogouB = b.jogos.v + b.jogos.d > 0;
  const se = (jogou: boolean, v: number) => (jogou ? v : null);
  const placar = (lado: Readonly<{ v: number; d: number }>) => `${lado.v}–${lado.d}`;
  /** Vitórias valem mais; com vitórias iguais, menos derrotas. */
  const campanha = (lado: Readonly<{ v: number; d: number }>) => lado.v * 1000 - lado.d;
  const maiorDe = (x: number, y: number) => Math.max(1, x, y);

  const posicao: Linha = {
    chave: "posicao",
    rotulo: f.vsPosicao,
    a: a.posicao,
    b: b.posicao,
    textoA: a.posicao === null ? TRACO : preencher(f.holofotePosicao, { n: a.posicao }),
    textoB: b.posicao === null ? TRACO : preencher(f.holofotePosicao, { n: b.posicao }),
    fracA: a.posicao === null ? 0 : (totalDeTimes - a.posicao + 1) / totalDeTimes,
    fracB: b.posicao === null ? 0 : (totalDeTimes - b.posicao + 1) / totalDeTimes,
    criterio: "menor",
  };
  const series: Linha = {
    chave: "series",
    rotulo: f.vsSeries,
    a: se(a.series.v + a.series.d > 0, campanha(a.series)),
    b: se(b.series.v + b.series.d > 0, campanha(b.series)),
    textoA: a.series.v + a.series.d > 0 ? placar(a.series) : TRACO,
    textoB: b.series.v + b.series.d > 0 ? placar(b.series) : TRACO,
    fracA: a.series.v / maiorDe(a.series.v, b.series.v),
    fracB: b.series.v / maiorDe(a.series.v, b.series.v),
    criterio: "maior",
  };
  const mapas: Linha = {
    chave: "mapas",
    rotulo: f.vsMapas,
    a: se(jogouA, campanha(a.jogos)),
    b: se(jogouB, campanha(b.jogos)),
    textoA: jogouA ? placar(a.jogos) : TRACO,
    textoB: jogouB ? placar(b.jogos) : TRACO,
    fracA: a.jogos.v / maiorDe(a.jogos.v, b.jogos.v),
    fracB: b.jogos.v / maiorDe(a.jogos.v, b.jogos.v),
    criterio: "maior",
  };

  return [
    posicao,
    series,
    mapas,
    linha("abates", f.cartaAbates, se(jogouA, a.abates), se(jogouB, b.abates), "maior"),
    linha("mortes", f.cartaMortes, se(jogouA, a.mortes), se(jogouB, b.mortes), "menor", String, f.vsMenosMelhor),
    linha("assist", f.cartaAssist, se(jogouA, a.assistencias), se(jogouB, b.assistencias), "maior"),
    linha("kda", "KDA", se(jogouA, a.kda), se(jogouB, b.kda), "maior", (v) => formatKda(v, localeTag)),
    linha("mvps", "MVPs", se(jogouA, a.mvps), se(jogouB, b.mvps), "maior"),
  ];
}

function linhasDosJogadores(a: JogadorDaForja, b: JogadorDaForja, t: TextosDaTela): Linha[] {
  const { f, localeTag } = t;
  const se = (j: JogadorDaForja, v: number) => (j.jogos > 0 ? v : null);
  return [
    linha("vitorias", f.cartaVitorias, se(a, a.vitorias), se(b, b.vitorias), "maior"),
    linha("abates", f.cartaAbates, se(a, a.abates), se(b, b.abates), "maior"),
    linha("mortes", f.cartaMortes, se(a, a.mortes), se(b, b.mortes), "menor", String, f.vsMenosMelhor),
    linha("assist", f.cartaAssist, se(a, a.assistencias), se(b, b.assistencias), "maior"),
    linha("kda", "KDA", se(a, a.kda), se(b, b.kda), "maior", (v) => formatKda(v, localeTag)),
    linha("mvps", "MVPs", se(a, a.mvps), se(b, b.mvps), "maior"),
  ];
}

type Duelo = Readonly<{ a: JogadorDaForja | null; b: JogadorDaForja | null }>;

/**
 * Os duelos do rota a rota: cada jogador do time A diante do adversário da MESMA rota. Quem não
 * tem par de rota (elenco com duas pessoas na mesma função) enfrenta quem sobrou do outro lado.
 */
function duelosPorRota(a: TimeDaForja, b: TimeDaForja, dados: DadosDaForja): Duelo[] {
  const doA = a.elenco.map((slug) => dados.jogadores[slug]).filter((j): j is JogadorDaForja => Boolean(j));
  const restoDoB = b.elenco.map((slug) => dados.jogadores[slug]).filter((j): j is JogadorDaForja => Boolean(j));
  const duelos: { a: JogadorDaForja | null; b: JogadorDaForja | null }[] = [];
  const semPar: JogadorDaForja[] = [];
  for (const ja of doA) {
    const i = restoDoB.findIndex((jb) => jb.rota.sigla === ja.rota.sigla);
    if (i >= 0) duelos.push({ a: ja, b: restoDoB.splice(i, 1)[0]! });
    else semPar.push(ja);
  }
  for (const ja of semPar) duelos.push({ a: ja, b: restoDoB.shift() ?? null });
  for (const jb of restoDoB) duelos.push({ a: null, b: jb });
  return duelos;
}

// ------------------------------------------------------------------------------------ a tela

export function ModoVs() {
  const { versus, portaFechada } = useForja();
  // Na primeira visita com um link de VS, a luta espera a porta da fornalha abrir.
  if (!versus.pedido || portaFechada) return null;
  // Um pedido novo (outro botão VS, o «enfrentar» do holofote) recomeça a tela.
  return <TelaDoVs key={escreverPedidoDeVs(versus.pedido)} pedido={versus.pedido} />;
}

function TelaDoVs({ pedido }: Readonly<{ pedido: PedidoDeVs }>) {
  const { dados, t, fontes, versus, holofote, som } = useForja();
  const { f, s: st, localeTag } = t;
  const reduzido = useMovimentoReduzidoDoSistema();

  const timePorSlug = useMemo(() => new Map(dados.times.map((time) => [time.slug, time] as const)), [dados.times]);
  const timePorId = useMemo(() => new Map(dados.times.map((time) => [time.id, time] as const)), [dados.times]);
  const existe = (tipo: PedidoDeVs["tipo"], slug: string | undefined): string | null => {
    if (!slug) return null;
    if (tipo === "times") return timePorSlug.has(slug) ? slug : (dados.times.find((time) => time.id === slug)?.slug ?? null);
    return dados.jogadores[slug] ? slug : null;
  };

  const [tipo, setTipo] = useState<PedidoDeVs["tipo"]>(pedido.tipo);
  const [par, setPar] = useState<Par>(() => {
    const a = existe(pedido.tipo, pedido.a);
    const b = existe(pedido.tipo, pedido.b);
    return { a, b: b === a ? null : b };
  });
  const [fase, setFase] = useState<"escolha" | "luta">(() => (par.a && par.b ? "luta" : "escolha"));
  const [alvo, setAlvo] = useState<Lado>(() => (par.a && !par.b ? "b" : "a"));
  const [busca, setBusca] = useState("");
  const [copiado, setCopiado] = useState(false);
  /** Conta as lutas: cada uma remonta a cena (as entradas tocam de novo). */
  const [rodada, setRodada] = useState(0);

  const faiscas = useRef<ApiFaiscas | null>(null);
  const cena = useRef<HTMLDivElement | null>(null);

  const emLuta = fase === "luta" && par.a !== null && par.b !== null;

  // ---------------------------------------------------------------- os dois lados, prontos
  const luta = useMemo(() => {
    if (!par.a || !par.b) return null;
    if (tipo === "times") {
      const a = timePorSlug.get(par.a);
      const b = timePorSlug.get(par.b);
      if (!a || !b) return null;
      const [corA, corB] = coresDoConfronto(a.candidatasDePalco, b.candidatasDePalco);
      return { tipo, a, b, corA, corB, nomeA: a.nome, nomeB: b.nome, linhas: linhasDosTimes(a, b, t, dados.times.length) } as const;
    }
    const a = dados.jogadores[par.a];
    const b = dados.jogadores[par.b];
    if (!a || !b) return null;
    const timeA = timePorId.get(a.timeId) ?? null;
    const timeB = timePorId.get(b.timeId) ?? null;
    const [corA, corB] = coresDoConfronto(timeA?.candidatasDePalco ?? ["#c98a4b"], timeB?.candidatasDePalco ?? ["#57d8cb"]);
    return { tipo, a, b, timeA, timeB, corA, corB, nomeA: a.nick, nomeB: b.nick, linhas: linhasDosJogadores(a, b, t) } as const;
  }, [dados.jogadores, dados.times.length, par.a, par.b, t, timePorId, timePorSlug, tipo]);

  const placar = useMemo(() => {
    const resultados = (luta?.linhas ?? []).map(vencedorDa);
    const decididas = resultados.filter((r) => r !== null);
    return { resultados, total: decididas.length, a: decididas.filter((r) => r === "a").length, b: decididas.filter((r) => r === "b").length };
  }, [luta]);

  // ---------------------------------------------------------------- o endereço acompanha a luta
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (emLuta) url.searchParams.set("vs", escreverPedidoDeVs({ tipo, a: par.a ?? undefined, b: par.b ?? undefined }));
      else url.searchParams.delete("vs");
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* endereço esquisito: fica como está */
    }
  }, [emLuta, par.a, par.b, tipo]);

  // ---------------------------------------------------------------- o golpe: som e faíscas
  const numeroDeLinhas = luta?.linhas.length ?? 0;
  const corA = luta?.corA ?? "#c98a4b";
  const corB = luta?.corB ?? "#57d8cb";
  useEffect(() => {
    if (!emLuta) return;
    cena.current?.focus({ preventScroll: true });
    if (reduzido) {
      som.tocar((x) => x.impacto());
      return;
    }
    som.tocar((x) => x.sopro());
    const relogios = [
      window.setTimeout(() => {
        som.tocar((x) => x.impacto());
        // Poucas e grossas: faísca fina vira bloco na compressão do vídeo.
        faiscas.current?.explosao({ x: 0.5, y: 0.2, cores: [corA, corB, "#fff3dc", "#ffc061"], quantidade: 64, forca: 1, espessura: 3.2, vida: 0.85, apagaEm: 0.62 });
        faiscas.current?.onda({ x: 0.5, y: 0.2, cor: "#fff3dc", raio: 520, espessura: 7, duracao: 0.6 });
      }, 330),
      window.setTimeout(() => som.tocar((x) => x.contagem(numeroDeLinhas, 1000)), 700),
      window.setTimeout(() => som.tocar((x) => x.clang(1.1)), 1950),
    ];
    return () => relogios.forEach((id) => window.clearTimeout(id));
  }, [corA, corB, emLuta, numeroDeLinhas, reduzido, rodada, som]);

  // ---------------------------------------------------------------- comandos
  const escolher = (slug: string) => {
    const outro: Lado = alvo === "a" ? "b" : "a";
    const novo = { ...par, [alvo]: slug } as { a: string | null; b: string | null };
    // Quem já estava do outro lado troca de canto, em vez de lutar contra si mesmo.
    if (par[outro] === slug) novo[outro] = par[alvo] === slug ? null : par[alvo];
    setPar(novo);
    if (!novo[outro]) setAlvo(outro);
    som.tocar((x) => x.clique());
  };
  const lutar = (novoPar: Par = par, novoTipo: PedidoDeVs["tipo"] = tipo) => {
    if (!novoPar.a || !novoPar.b) return;
    setTipo(novoTipo);
    setPar(novoPar);
    setFase("luta");
    setRodada((n) => n + 1);
    setCopiado(false);
  };
  const trocarTipo = (novo: PedidoDeVs["tipo"]) => {
    if (novo === tipo) return;
    setTipo(novo);
    setPar({ a: null, b: null });
    setAlvo("a");
    setBusca("");
    som.tocar((x) => x.clique());
  };
  const copiar = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("vs", escreverPedidoDeVs({ tipo, a: par.a ?? undefined, b: par.b ?? undefined }));
      await navigator.clipboard.writeText(url.toString());
      setCopiado(true);
      som.tocar((x) => x.clique());
    } catch {
      /* sem permissão de área de transferência: o link continua na barra de endereço */
    }
  };

  const proximas = useMemo(
    () =>
      proximasSeries(dados, 6).flatMap((serie) => {
        const a = timePorId.get(serie.timeA);
        const b = timePorId.get(serie.timeB);
        return a && b ? [{ id: serie.id, a, b, data: formatDateLabel(serie.data, { day: "2-digit", month: "2-digit", year: undefined }, localeTag) }] : [];
      }),
    [dados, localeTag, timePorId],
  );

  const rotuloDaTela = luta && emLuta ? `${f.vsTitulo}: ${luta.nomeA} × ${luta.nomeB}` : `${f.vsTitulo}: ${f.vsEscolha}`;

  // ================================================================== a tela de LUTA
  if (emLuta && luta) {
    const veredito =
      placar.total === 0
        ? luta.tipo === "times"
          ? f.vsSemConfronto
          : f.cartaSemJogo
        : placar.a === placar.b
          ? f.vsEmpate
          : preencher(f.vsVantagem, { nome: placar.a > placar.b ? luta.nomeA : luta.nomeB, n: Math.max(placar.a, placar.b), total: placar.total });
    const quemLeva: Lado | null = placar.total === 0 || placar.a === placar.b ? null : placar.a > placar.b ? "a" : "b";
    const encontros = luta.tipo === "times" ? confrontoDireto(dados, luta.a.id, luta.b.id) : [];
    const jogados = encontros.filter((serie) => serie.completa);
    const proximo = encontros.find((serie) => !serie.completa) ?? null;
    const data = (iso: string) => formatDateLabel(iso, { day: "2-digit", month: "2-digit", year: undefined }, localeTag);

    const estilo = {
      "--a": luta.corA,
      "--b": luta.corB,
      "--a-tinta": tintaSobre(luta.corA),
      "--b-tinta": tintaSobre(luta.corB),
      "--n": luta.linhas.length,
    } as CSSProperties;

    const asLinhas = (
      <ol className={s.linhas}>
        {luta.linhas.map((l, i) => {
          const leva = placar.resultados[i];
          return (
            <li key={l.chave} className={s.linha} style={{ "--i": i, "--fa": l.fracA.toFixed(3), "--fb": l.fracB.toFixed(3) } as CSSProperties} data-leva={leva ?? undefined}>
              <span className={s.soLeitor}>
                {l.rotulo}: {luta.nomeA} {l.textoA}, {luta.nomeB} {l.textoB}
              </span>
              <span className={s.valor} data-lado="a" aria-hidden>
                {l.textoA}
              </span>
              <span className={s.trilho} data-lado="a" aria-hidden>
                <span className={s.enfBarra} />
              </span>
              <span className={s.rotulo} aria-hidden>
                {l.rotulo}
                {l.nota ? <small>{l.nota}</small> : null}
              </span>
              <span className={s.trilho} data-lado="b" aria-hidden>
                <span className={s.enfBarra} />
              </span>
              <span className={s.valor} data-lado="b" aria-hidden>
                {l.textoB}
              </span>
            </li>
          );
        })}
      </ol>
    );

    return (
      <TelaCheia rotulo={rotuloDaTela} rotuloDeFechar={f.holofoteFechar} aoFechar={versus.fechar} className={s.versus} inerte={holofote.aberto !== null}>
        <div key={rodada} ref={cena} className={s.luta} style={estilo} data-tipo={luta.tipo} data-leva={quemLeva ?? undefined} tabIndex={-1}>
          <span className={`${s.enfMetade} ${s.enfMetadeA}`} aria-hidden />
          <span className={`${s.enfMetade} ${s.enfMetadeB}`} aria-hidden />

          <h2 className={s.soLeitor}>
            {luta.nomeA} × {luta.nomeB}
          </h2>

          {/* ------------------------------------------------ os dois cantos */}
          <div className={s.topo}>
            {luta.tipo === "times" ? (
              <>
                <CantoDoTime time={luta.a} lado="a" fonte={fontes[luta.a.id] ?? null} t={t} />
                <p className={s.marca} aria-hidden>
                  <span className={s.enfRaio} />
                  <span className={s.marcaTexto}>VS</span>
                </p>
                <CantoDoTime time={luta.b} lado="b" fonte={fontes[luta.b.id] ?? null} t={t} />
              </>
            ) : (
              <>
                <CantoDoJogador jogador={luta.a} time={luta.timeA} lado="a" t={t} />
                <p className={s.marca} aria-hidden>
                  <span className={s.enfRaio} />
                  <span className={s.marcaTexto}>VS</span>
                </p>
                <CantoDoJogador jogador={luta.b} time={luta.timeB} lado="b" t={t} />
              </>
            )}
          </div>

          {/* ------------------------------------------------ o miolo */}
          {luta.tipo === "times" ? (
            // times: os quesitos de um lado, os cinco duelos de rota do outro
            <div className={s.miolo} data-tipo="times">
              {asLinhas}
              <RotaARota a={luta.a} b={luta.b} dados={dados} t={t} />
            </div>
          ) : (
            // jogadores: os quesitos no meio, os campeões de cada um nas laterais
            <div className={s.miolo} data-tipo="jogadores">
              <Campeoes jogador={luta.a} lado="a" t={t} />
              {asLinhas}
              <Campeoes jogador={luta.b} lado="b" t={t} />
            </div>
          )}

          {/* ------------------------------------------------ o veredito e os comandos */}
          <div className={s.pe}>
            <p className={s.veredito} data-leva={quemLeva ?? undefined}>
              {veredito}
            </p>

            {luta.tipo === "times" ? (
              <p className={s.encontros}>
                <strong>{f.vsConfronto}</strong>
                {jogados.length === 0 ? (
                  <span>{f.vsSemConfronto}</span>
                ) : (
                  jogados.map((serie) => {
                    const direto = serie.timeA === luta.a.id;
                    return (
                      <a key={serie.id} href={`/partidas/${encodeURIComponent(serie.id)}`} className={s.encontro}>
                        {direto ? serie.placarA : serie.placarB}–{direto ? serie.placarB : serie.placarA}
                        <small>{data(serie.data)}</small>
                      </a>
                    );
                  })
                )}
                {proximo ? (
                  <>
                    <strong>{f.vsProximo}</strong>
                    <a href={`/partidas/${encodeURIComponent(proximo.id)}`} className={s.encontro}>
                      {data(proximo.data)}
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}

            <p className={s.acoes}>
              <button type="button" className={s.acao} onClick={() => lutar({ a: par.b, b: par.a })}>
                {f.vsTrocar}
              </button>
              <button
                type="button"
                className={s.acao}
                onClick={() => {
                  setFase("escolha");
                  setCopiado(false);
                }}
              >
                {f.vsNovo}
              </button>
              <button type="button" className={s.acao} onClick={copiar} data-feito={copiado ? "" : undefined}>
                <span aria-live="polite">{copiado ? f.vsCopiado : f.vsCopiar}</span>
              </button>
            </p>
          </div>

          <div className={s.enfFaiscas} aria-hidden>
            <Faiscas ref={faiscas} reduzido={reduzido} />
          </div>
        </div>
      </TelaCheia>
    );
  }

  // ================================================================== a tela de ESCOLHA
  const termo = semAcento(busca.trim());
  const jogadoresPorTime = dados.times
    .map((time) => ({
      time,
      jogadores: time.elenco
        .map((slug) => dados.jogadores[slug])
        .filter((j): j is JogadorDaForja => Boolean(j) && (termo === "" || semAcento(`${j!.nick} ${j!.nome}`).includes(termo))),
    }))
    .filter((grupo) => grupo.jogadores.length > 0);

  const nomeDoLado = (lado: Lado): string | null => {
    const slug = par[lado];
    if (!slug) return null;
    return tipo === "times" ? (timePorSlug.get(slug)?.nome ?? null) : (dados.jogadores[slug]?.nick ?? null);
  };

  return (
    <TelaCheia rotulo={rotuloDaTela} rotuloDeFechar={f.holofoteFechar} aoFechar={versus.fechar} className={s.versus} inerte={holofote.aberto !== null}>
      <div className={s.escolha}>
        <header className={s.cabeca}>
          <p className={s.sobre}>{f.vsTitulo}</p>
          <h2 className={s.titulo}>{f.vsEscolha}</h2>
          <p className={s.abas}>
            {(["times", "jogadores"] as const).map((chave) => (
              <button key={chave} type="button" className={s.aba} aria-pressed={tipo === chave} onClick={() => trocarTipo(chave)}>
                {chave === "times" ? f.vsTimes : f.vsJogadores}
              </button>
            ))}
          </p>
        </header>

        {/* os dois cantos e o botão de lutar */}
        <div className={s.cantos}>
          {(["a", "b"] as const).map((lado) => {
            const slug = par[lado];
            const time = slug ? (tipo === "times" ? (timePorSlug.get(slug) ?? null) : (timePorId.get(dados.jogadores[slug]?.timeId ?? "") ?? null)) : null;
            const jogador = slug && tipo === "jogadores" ? (dados.jogadores[slug] ?? null) : null;
            return (
              <button
                key={lado}
                type="button"
                className={s.canto}
                data-lado={lado}
                data-cheio={slug ? "" : undefined}
                aria-pressed={alvo === lado}
                style={coresDoTime(time)}
                onClick={() => setAlvo(lado)}
              >
                <span className={s.cantoRotulo}>{lado === "a" ? f.vsLadoA : f.vsLadoB}</span>
                {slug && tipo === "times" && time ? <Medalhao time={time} className={s.cantoMedalha} rotulo="" /> : null}
                {jogador ? <FotoDoJogador jogador={jogador} className={s.cantoFoto} /> : null}
                <span className={s.cantoNome}>{nomeDoLado(lado) ?? f.vsVazio}</span>
              </button>
            );
          })}
          <button type="button" className={s.lutar} disabled={!par.a || !par.b} onClick={() => lutar()}>
            <span className={s.enfPulso} aria-hidden />
            {f.vsLutar}
          </button>
        </div>

        {/* o atalho do caster: as próximas séries, a um clique */}
        {proximas.length > 0 ? (
          <section className={s.secao} aria-labelledby="vs-proximas">
            <h3 id="vs-proximas" className={s.secaoTitulo}>
              {f.vsProximas}
            </h3>
            <ul className={s.proximas}>
              {proximas.map((serie) => (
                <li key={serie.id}>
                  <button type="button" className={s.proxima} onClick={() => lutar({ a: serie.a.slug, b: serie.b.slug }, "times")}>
                    <Medalhao time={serie.a} className={s.proximaMedalha} rotulo="" cunhado={false} />
                    {/* sempre em duas linhas: um time em cima, «× o outro» embaixo */}
                    <span className={s.proximaNomes}>
                      <span style={{ color: serie.a.cor }}>{serie.a.nome}</span>
                      <span className={s.proximaContra}>
                        <em aria-hidden>×</em> <span style={{ color: serie.b.cor }}>{serie.b.nome}</span>
                      </span>
                    </span>
                    <Medalhao time={serie.b} className={s.proximaMedalha} rotulo="" cunhado={false} />
                    <span className={s.proximaData}>{serie.data}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* as opções */}
        <section className={s.secao} aria-labelledby="vs-opcoes">
          <h3 id="vs-opcoes" className={s.secaoTitulo}>
            {tipo === "times" ? f.vsTimes : f.vsJogadores}
            <span>{alvo === "a" ? f.vsLadoA : f.vsLadoB}</span>
          </h3>

          {tipo === "times" ? (
            <ul className={s.times}>
              {dados.times.map((time) => {
                const lado = par.a === time.slug ? "a" : par.b === time.slug ? "b" : null;
                return (
                  <li key={time.id}>
                    <button type="button" className={s.opcao} style={coresDoTime(time)} data-escolhido={lado ?? undefined} onClick={() => escolher(time.slug)}>
                      <Medalhao time={time} className={s.opcaoMedalha} rotulo="" />
                      <NomeDoTime time={time} fonteClasse={fontes[time.id] ?? null} className={s.opcaoNome} />
                      {lado ? <span className={s.opcaoLado}>{lado === "a" ? f.vsLadoA : f.vsLadoB}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <>
              <label className={s.busca}>
                <span className={s.soLeitor}>{f.vsBuscar}</span>
                <input type="search" value={busca} onChange={(ev) => setBusca(ev.target.value)} placeholder={f.vsBuscar} autoComplete="off" spellCheck={false} />
              </label>
              <div className={s.grupos}>
                {jogadoresPorTime.map(({ time, jogadores }) => (
                  <div key={time.id} className={s.grupo} style={coresDoTime(time)}>
                    <p className={s.grupoNome}>{time.nome}</p>
                    <ul>
                      {jogadores.map((j) => {
                        const lado = par.a === j.slug ? "a" : par.b === j.slug ? "b" : null;
                        return (
                          <li key={j.slug}>
                            <button type="button" className={s.pessoa} data-escolhido={lado ?? undefined} onClick={() => escolher(j.slug)}>
                              <FotoDoJogador jogador={j} className={s.pessoaFoto} />
                              <span className={s.pessoaNick}>{j.nick}</span>
                              <span className={s.pessoaRota}>{j.rota.sigla}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                {jogadoresPorTime.length === 0 ? <p className={s.vazio}>{st.rankVazioJogadores}</p> : null}
              </div>
            </>
          )}
        </section>
      </div>
    </TelaCheia>
  );
}

// ------------------------------------------------------------------------------------ as peças

function FotoDoJogador({ jogador, className }: Readonly<{ jogador: JogadorDaForja; className?: string }>) {
  return (
    <span className={`${s.foto} ${className ?? ""}`} data-medalhao={jogador.fotoMedalhao ? "" : undefined} aria-hidden>
      {jogador.foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={jogador.foto} alt="" loading="lazy" decoding="async" draggable={false} style={{ objectPosition: jogador.fotoFoco }} />
      ) : (
        jogador.nick.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

/** O canto de um time: o medalhão e o nome (que é o link para a página do time), numa linha só. */
function CantoDoTime({ time, lado, fonte, t }: Readonly<{ time: TimeDaForja; lado: Lado; fonte: string | null; t: TextosDaTela }>) {
  const { f } = t;
  const estreou = time.series.v + time.series.d > 0 || time.jogos.v + time.jogos.d > 0;
  return (
    <div className={s.canto2} data-lado={lado} style={coresDoTime(time)}>
      <Medalhao time={time} className={s.medalha} rotulo="" />
      <div className={s.cantoTexto} style={{ "--nome-em": larguraDaMarca(time).toFixed(2) } as CSSProperties}>
        <a className={s.nomeLink} href={`/times/${encodeURIComponent(time.slug)}`} title={f.moldesVerTime}>
          <NomeDoTime time={time} fonteClasse={fonte} className={s.nome} />
        </a>
        <p className={s.campanha}>
          {/* duas linhas, iguais dos dois lados: a campanha em cima, a posição embaixo */}
          <span>{estreou ? preencher(f.campanhaSeries, { v: time.series.v, d: time.series.d }) : f.moldesSemJogo}</span>
          {time.posicao !== null && estreou ? <span>{preencher(f.moldesLugar, { n: time.posicao })}</span> : null}
        </p>
      </div>
    </div>
  );
}

/** O canto de um jogador: a carta e o nick (o link para a ficha), que nunca quebra no meio. */
function CantoDoJogador({ jogador, time, lado, t }: Readonly<{ jogador: JogadorDaForja; time: TimeDaForja | null; lado: Lado; t: TextosDaTela }>) {
  const { f, s: st } = t;
  return (
    <div className={s.canto2} data-lado={lado} style={coresDoTime(time)}>
      <div className={s.cartaDoCanto} aria-hidden>
        <CartaDoJogador jogador={jogador} time={time} t={t} viraSozinha={false} className={s.carta} />
      </div>
      <div className={s.cantoTexto} style={{ "--nome-em": larguraNaAnton(jogador.nick).toFixed(2) } as CSSProperties}>
        <a className={`${s.nomeLink} ${s.nomeDoJogador}`} href={`/jogadores/${encodeURIComponent(jogador.slug)}`} title={f.cartaFicha}>
          {jogador.nick}
        </a>
        {time ? <p className={s.campanha}>{time.nome}</p> : null}
        {/* dois pedaços: lado a lado (com o ponto entre eles) ou um em cima do outro, sem ponto solto */}
        <p className={s.contexto}>
          <span>{jogador.rota.rotulo}</span>
          <span>{jogador.jogos > 0 ? `${jogador.jogos} ${st.rotaJogos}` : f.moldesSemJogo}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * O ROTA A ROTA: os duelos de rota no meio da tela, um jogador diante do outro (foto, nick e KDA),
 * com a placa na cor do lado em quem tem o KDA maior.
 */
function RotaARota({ a, b, dados, t }: Readonly<{ a: TimeDaForja; b: TimeDaForja; dados: DadosDaForja; t: TextosDaTela }>) {
  const { f, localeTag } = t;
  const duelos = duelosPorRota(a, b, dados);
  const kdaDe = (j: JogadorDaForja | null) => (j && j.jogos > 0 ? formatKda(j.kda, localeTag) : TRACO);

  return (
    <section className={s.rotas} aria-labelledby="vs-rota-a-rota">
      <h3 id="vs-rota-a-rota" className={s.rotasTitulo}>
        {f.vsRotaARota} <span>KDA</span>
      </h3>
      <ol className={s.duelos} data-grupo-de-jogadores="">
        {duelos.map((d, i) => {
          const rota = (d.a ?? d.b)!.rota;
          const jogaram = d.a !== null && d.b !== null && d.a.jogos > 0 && d.b.jogos > 0;
          const leva = jogaram ? (d.a!.kda === d.b!.kda ? "empate" : d.a!.kda > d.b!.kda ? "a" : "b") : undefined;
          return (
            <li key={`${d.a?.slug ?? "-"}:${d.b?.slug ?? "-"}`} className={s.duelo} data-leva={leva} style={{ "--i": i } as CSSProperties}>
              <span className={s.soLeitor}>
                {rota.rotulo}: {d.a ? `${d.a.nick} ${kdaDe(d.a)}` : TRACO}, {d.b ? `${d.b.nick} ${kdaDe(d.b)}` : TRACO}
              </span>
              <LadoDoDuelo jogador={d.a} time={a} lado="a" kda={kdaDe(d.a)} t={t} />
              <span className={s.dueloRota} style={{ color: rota.cor }} aria-hidden>
                <span className={s.dueloRotaLonga}>{rota.rotulo}</span>
                <span className={s.dueloRotaCurta}>{rota.sigla}</span>
              </span>
              <LadoDoDuelo jogador={d.b} time={b} lado="b" kda={kdaDe(d.b)} t={t} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function LadoDoDuelo({
  jogador,
  time,
  lado,
  kda,
  t,
}: Readonly<{ jogador: JogadorDaForja | null; time: TimeDaForja; lado: Lado; kda: string; t: TextosDaTela }>) {
  if (!jogador) return <span className={s.dueloLado} data-lado={lado} aria-hidden />;
  return (
    <span className={s.dueloLado} data-lado={lado} style={coresDoTime(time)}>
      <Rosto jogador={jogador} time={time} rotulo={preencher(t.f.cartaAbrir, { nick: jogador.nick })} className={s.dueloRosto} dica={false} />
      <span className={s.dueloNick} aria-hidden>
        {jogador.nick}
      </span>
      <span className={s.dueloKda} aria-hidden>
        {kda}
      </span>
    </span>
  );
}

/** Os campeões que o jogador mais jogou (ao lado dos números, na luta de jogadores). */
function Campeoes({ jogador, lado, t }: Readonly<{ jogador: JogadorDaForja; lado: Lado; t: TextosDaTela }>) {
  const { f, s: st } = t;
  return (
    <div className={s.elenco} data-lado={lado}>
      <p className={s.elencoTitulo}>{f.holofoteCampeoes}</p>
      {jogador.campeoes.length === 0 ? (
        <p className={s.elencoVazio}>{f.cartaSemJogo}</p>
      ) : (
        <ul>
          {jogador.campeoes.slice(0, 5).map((c) => (
            <li key={c.nome}>
              {c.id ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={s.campeaoIcone} src={championIconUrl(c.id)} alt="" loading="lazy" decoding="async" draggable={false} />
              ) : (
                <span className={s.campeaoIcone} aria-hidden />
              )}
              <span className={s.elencoTexto}>
                <span className={s.elencoNick}>{c.nome}</span>
                <span className={s.elencoKda}>
                  {c.jogos}× · {c.vitorias}
                  {st.siglaVitoria}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
