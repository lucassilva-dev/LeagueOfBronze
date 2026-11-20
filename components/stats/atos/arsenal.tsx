"use client";

import { useState, type CSSProperties } from "react";

import { championIconUrl } from "@/lib/champions";
import { formatKda } from "@/lib/format";
import { METRICAS_DE_CAMPEAO, arteDoCampeao, valorDoCampeao, type CampeaoDaForja, type MetricaDeCampeao } from "@/lib/stats/forja";

import b from "../forja.module.css";
import { CartaoDoAto, Odometro, preencher } from "../pecas";
import { useForja } from "../provedor";
import s from "./arsenal.module.css";

/** Quantos campeões entram em cada anel da órbita (de dentro para fora), depois do nº 1. */
const ANEIS = [6, 10] as const;
/** Quantas linhas a lista mostra antes do «ver todos». */
const TOPO = 8;

function Icone({ campeao, className }: Readonly<{ campeao: CampeaoDaForja; className?: string }>) {
  if (!campeao.id) {
    // Nome digitado que o Data Dragon não reconhece: as iniciais, nunca um ícone quebrado.
    return (
      <span className={`${s.iniciais} ${className ?? ""}`} aria-hidden>
        {campeao.nome.trim().slice(0, 2).toUpperCase() || "?"}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={championIconUrl(campeao.id)} alt="" loading="lazy" decoding="async" draggable={false} />;
}

/**
 * ATO VII — O ARSENAL. Os campeões, em cinco abas (mais jogados, mais banidos, presença, winrate,
 * KDA): uma órbita em 3D (CSS) com os ícones do Data Dragon dimensionados pela métrica da aba, o
 * nº 1 no centro com a splash art ao fundo, e a lista ranqueada ao lado — que é o que se lê.
 * Clicar num campeão (na órbita ou na lista) o põe no centro.
 */
export function AtoDoArsenal() {
  const { dados, t, som } = useForja();
  const { f, s: st, localeTag } = t;
  const [metrica, setMetrica] = useState<MetricaDeCampeao>("jogados");
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [giros, setGiros] = useState(0);

  const ordem = dados.campeoesOrdem[metrica];
  const campeoes = ordem.map((chave) => dados.campeoes[chave]).filter((c): c is CampeaoDaForja => Boolean(c));
  const lider = campeoes[0] ?? null;
  const foco = (escolhido ? campeoes.find((c) => c.chave === escolhido) : null) ?? lider;
  const maior = Math.max(0.0001, ...campeoes.map((c) => valorDoCampeao(c, metrica)));
  const info = st.metricasCampeao[metrica];

  const valor = (c: CampeaoDaForja): string => {
    const v = valorDoCampeao(c, metrica);
    if (metrica === "jogados" || metrica === "banidos") return `${v}×`;
    if (metrica === "presenca" || metrica === "winrate") return `${Math.round(v)}%`;
    return formatKda(v, localeTag);
  };
  // As mesmas legendas da tabela antiga, por aba.
  // «picks» e «bans» por extenso, e vitórias–derrotas como placar: «6V · 0D» lia-se «OD».
  const picks = f.colPicks.toLowerCase();
  const bans = f.colBans.toLowerCase();
  const sub = (c: CampeaoDaForja): string => {
    if (metrica === "jogados") return `${st.siglaVitoria}–${st.siglaDerrota} ${c.vitorias}–${c.derrotas}`;
    if (metrica === "banidos") return `${Math.round(c.banRate)}% ${st.siglaDosJogos}`;
    if (metrica === "presenca") return `${c.picks} ${picks} · ${c.bans} ${bans}`;
    if (metrica === "winrate") return `${st.siglaVitoria}/${st.siglaJogo} ${c.vitorias}/${c.picks}`;
    return `${c.abates}/${c.mortes}/${c.assistencias}`;
  };

  const trocar = (nova: MetricaDeCampeao) => {
    if (nova === metrica) return;
    setMetrica(nova);
    setEscolhido(null);
    setGiros((n) => n + 1);
    som.tocar((x) => x.sopro());
  };
  const escolher = (chave: string) => {
    setEscolhido(chave);
    som.tocar((x) => x.clique());
  };

  // A órbita: depois do nº 1, os próximos preenchem os anéis de dentro para fora.
  const orbitantes = campeoes.slice(1, 1 + ANEIS[0] + ANEIS[1]);
  const aneis = [orbitantes.slice(0, ANEIS[0]), orbitantes.slice(ANEIS[0])];
  const lista = campeoes.slice(0, aberto ? undefined : TOPO);
  const arte = foco?.id ? arteDoCampeao(foco.id) : null;
  const distintos = Object.values(dados.campeoes).filter((c) => c.picks > 0).length;

  return (
    <section id="ato-arsenal" className={`${b.ato} ${s.ato}`} data-ato="arsenal" aria-labelledby="titulo-do-arsenal">
      {/* a splash art do campeão em foco, ao fundo, em parallax */}
      <div className={s.enfFundo} aria-hidden data-paralaxe="">
        {arte ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={arte.splash} src={arte.splash} alt="" loading="lazy" decoding="async" draggable={false} />
        ) : null}
      </div>

      <div className={`${b.palco} ${s.palco}`}>
        <div className={s.topo}>
          <CartaoDoAto numero={f.atos.arsenal.numero} nome={f.atos.arsenal.nome} sub={f.atos.arsenal.sub} id="titulo-do-arsenal">
            {/* a história do ato num número: quantos campeões diferentes já entraram em jogo */}
            <p className={s.manchete}>
              <strong>{distintos}</strong> {preencher(f.arsenalManchete, { jogos: dados.resumo.jogos })}
            </p>
          </CartaoDoAto>
          <div className={s.abas} role="group" aria-label={f.arsenalAbas}>
            {METRICAS_DE_CAMPEAO.map((chave) => (
              <button key={chave} type="button" className={s.aba} aria-pressed={chave === metrica} onClick={() => trocar(chave)}>
                {st.metricasCampeao[chave].label}
              </button>
            ))}
          </div>
        </div>

        {!lider || !foco ? (
          <div className={s.vazio}>
            <p className={s.vazioTitulo}>{st.rankVazioCampeoes}</p>
            <p>{st.rankVazioTexto}</p>
          </div>
        ) : (
          <div className={s.cena}>
            {/* ------------------------------------------------------------ a órbita */}
            <div className={s.orbita} data-gira={giros % 2 === 0 ? "a" : "b"}>
              {aneis.map((anel, a) => (
                <ul key={`anel-${a}`} className={s.anel} data-anel={a} style={{ "--n": Math.max(1, anel.length) } as CSSProperties}>
                  {anel.map((c, i) => (
                    <li
                      key={c.chave}
                      className={s.orbitante}
                      style={
                        {
                          "--ang": `${(i / Math.max(1, anel.length)) * 360}deg`,
                          "--escala": (0.72 + 0.5 * Math.sqrt(valorDoCampeao(c, metrica) / maior)).toFixed(3),
                        } as CSSProperties
                      }
                    >
                      <span className={s.contra}>
                        <button
                          type="button"
                          className={`${s.planeta} ${b.dica}`}
                          data-dica={`${c.nome} · ${valor(c)}`}
                          aria-label={`${c.nome}: ${valor(c)} (${info.label})`}
                          aria-pressed={foco.chave === c.chave}
                          onClick={() => escolher(c.chave)}
                        >
                          <Icone campeao={c} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ))}

              {/* o centro da órbita: o campeão em foco (o nº 1 da aba, ou o que a pessoa escolheu) */}
              <div className={s.centro} aria-hidden>
                <span className={s.medalha}>
                  <Icone campeao={foco} className={s.medalhaIcone} />
                </span>
              </div>

              {/* o «terço inferior» de transmissão: quem está no centro, e o número dele */}
              <div className={s.foco}>
                <p className={s.focoQuem}>
                  <span className={s.focoLugar}>{foco.chave === lider.chave ? f.arsenalLider : `${campeoes.indexOf(foco) + 1}º`}</span>
                  <span className={s.focoNome}>{foco.nome}</span>
                  {/* por extenso: «6P · 0B · 6V/0D» era sopa de letras (e o zero lia-se «O») */}
                  <span className={s.focoSub}>
                    {foco.picks} {picks} · {foco.bans} {bans} · {st.siglaVitoria}–{st.siglaDerrota} {foco.vitorias}–{foco.derrotas} · KDA{" "}
                    {formatKda(foco.kda, localeTag)}
                  </span>
                </p>
                <p className={s.focoValor}>
                  <Odometro texto={valor(foco)} className={s.focoNumero} />
                  <span>{info.head}</span>
                </p>
              </div>
            </div>

            {/* ------------------------------------------------------------ a lista */}
            <div className={s.painel}>
              <ol className={s.lista}>
                {lista.map((c, i) => (
                  <li key={c.chave} className={s.linha}>
                    <button type="button" className={s.linhaBotao} aria-pressed={foco.chave === c.chave} onClick={() => escolher(c.chave)}>
                      <span className={s.posicao}>{i + 1}</span>
                      <span className={s.linhaIcone}>
                        <Icone campeao={c} />
                      </span>
                      <span className={s.linhaNome}>
                        {c.nome}
                        <span>{sub(c)}</span>
                      </span>
                      <span className={s.linhaValor}>{valor(c)}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className={s.pe}>
                <p className={s.descricao}>{info.desc}</p>
                {campeoes.length > TOPO ? (
                  <button type="button" className={s.verTodos} aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
                    {aberto ? f.arsenalVerMenos : preencher(f.arsenalVerTodos, { n: campeoes.length })}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
