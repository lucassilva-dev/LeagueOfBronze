import type { CSSProperties } from "react";

import { RoleIcon } from "@/components/lob/ui";
import { formatKda } from "@/lib/format";
import type { DadosDaForja, GrupoDeRota } from "@/lib/stats/forja";

import b from "../forja.module.css";
import { CartaoDoAto, Odometro, Rosto, coresDoTime, preencher, type TimeDe } from "../pecas";
import type { TextosDaTela } from "../provedor";
import s from "./canais.module.css";

/**
 * O Rift como molde visto de cima (caixa 600×600): a base azul embaixo à esquerda, a vermelha em
 * cima à direita. Cada rota tem o seu CANAL (por onde o metal corre) e o seu NÓ (onde o craque
 * aparece). A ordem é a do roteiro: Topo, Selva, Meio, Atirador, Suporte — o canal de baixo
 * serve aos dois últimos, com o atirador na quina e o suporte logo depois.
 */
const CANAIS = {
  TOP: { d: "M 86 478 L 86 150 Q 86 86 150 86 L 478 86", no: [96, 96] },
  SEL: { d: "M 104 452 Q 112 300 206 206 Q 300 112 452 104", no: [206, 206] },
  MID: { d: "M 112 488 L 488 112", no: [300, 300] },
  BOT: { d: "M 122 514 L 450 514 Q 514 514 514 450 L 514 122", no: [504, 504] },
} as const;

/** A selva de baixo: o segundo arco, que enche junto com o de cima (é a mesma rota). */
const SELVA_DE_BAIXO = "M 148 496 Q 300 488 394 394 Q 488 300 496 148";

/** Em que canal e em que ponto do roteiro cada rota acende (o `p` do ato). */
const ROTEIRO: Readonly<Record<string, { canal: keyof typeof CANAIS; no: readonly [number, number]; em: number }>> = {
  TOP: { canal: "TOP", no: CANAIS.TOP.no, em: 0.22 },
  SEL: { canal: "SEL", no: CANAIS.SEL.no, em: 0.36 },
  MID: { canal: "MID", no: CANAIS.MID.no, em: 0.5 },
  ADC: { canal: "BOT", no: CANAIS.BOT.no, em: 0.66 },
  SUP: { canal: "BOT", no: [514, 322], em: 0.78 },
};

function LinhaDaRota({
  grupo,
  dados,
  t,
  timeDe,
  em,
}: Readonly<{ grupo: GrupoDeRota; dados: DadosDaForja; t: TextosDaTela; timeDe: TimeDe; em: number }>) {
  const { f, s: st, localeTag } = t;
  const [primeiro, ...resto] = grupo.linhas;
  const craque = primeiro ? dados.jogadores[primeiro.slug] : undefined;
  if (!primeiro || !craque) return null;
  const time = timeDe(craque);

  return (
    <li className={s.linha} style={{ "--rota": grupo.cor, ...coresDoTime(time) } as CSSProperties} data-marca={em.toFixed(2)} data-conta="6">
      <p className={s.rotulo}>
        <RoleIcon role={grupo.chave} size={20} color={grupo.cor} />
        {st.rotaMelhor} {grupo.rotulo}
      </p>
      <Rosto jogador={craque} time={time} rotulo={preencher(f.cartaAbrir, { nick: craque.nick })} className={s.rosto} dica={false} />
      <div className={s.quem}>
        <a href={`/jogadores/${encodeURIComponent(craque.slug)}`} data-jogador={craque.slug} className={s.nick}>
          {craque.nick}
        </a>
        <span className={s.time}>{time?.nome ?? ""}</span>
      </div>
      <p className={s.kda}>
        <Odometro texto={formatKda(primeiro.kda, localeTag)} className={s.kdaNumero} />
        <span className={s.kdaRotulo}>KDA</span>
      </p>
      <p className={s.detalhe}>
        <span>
          {primeiro.abates}/{primeiro.mortes}/{primeiro.assistencias}
        </span>
        <span>
          {primeiro.jogos} {st.rotaJogos}
        </span>
        {primeiro.mvps > 0 ? <span>{primeiro.mvps} MVP{primeiro.mvps > 1 ? "s" : ""}</span> : null}
      </p>
      {resto.length > 0 ? (
        <ol className={s.vices} start={2}>
          {resto.map((linha) => {
            const jogador = dados.jogadores[linha.slug];
            if (!jogador) return null;
            return (
              <li key={linha.slug}>
                <span className={s.vicePosicao}>{linha.posicao}º</span>
                <a href={`/jogadores/${encodeURIComponent(linha.slug)}`} data-jogador={linha.slug} className={s.viceNick}>
                  {jogador.nick}
                </a>
                <span className={s.viceKda}>{formatKda(linha.kda, localeTag)}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </li>
  );
}

/**
 * ATO V — OS CANAIS. Melhor por rota (melhor KDA de cada rota entre quem jogou; top 3).
 * O metal corre pelos canais do Rift e acende uma rota por vez; o craque surge no nó do mapa e
 * a linha dele esquenta ao lado.
 */
export function AtoDosCanais({ dados, t, timeDe }: Readonly<{ dados: DadosDaForja; t: TextosDaTela; timeDe: TimeDe }>) {
  const { f } = t;
  const grupos = dados.rotas.filter((grupo) => ROTEIRO[grupo.sigla]);
  if (grupos.length === 0) return null;

  return (
    <section id="ato-canais" className={`${b.ato} ${s.ato}`} data-ato="canais" data-fixa="" aria-labelledby="titulo-dos-canais">
      <div className={b.palco}>
        <CartaoDoAto numero={f.atos.canais.numero} nome={f.atos.canais.nome} sub={f.atos.canais.sub} id="titulo-dos-canais" />

        <div className={`${b.cena} ${s.cena}`}>
          <div className={s.mapa} data-cena="" data-grupo-de-jogadores="">
            <svg className={s.enfRift} viewBox="0 0 600 600" aria-hidden focusable="false">
              {/* a caixa do molde e o rio */}
              <rect className={s.enfCaixa} x="14" y="14" width="572" height="572" rx="26" />
              <path className={s.enfRio} d="M 150 150 L 450 450" />
              {/* os sulcos por onde o metal vai correr */}
              <path className={s.enfSulco} d={SELVA_DE_BAIXO} />
              {Object.entries(CANAIS).map(([chave, canal]) => (
                <path key={`sulco-${chave}`} className={s.enfSulco} d={canal.d} />
              ))}
              {/* o metal: um halo largo por baixo e o veio quente por cima */}
              {Object.entries(CANAIS).map(([chave, canal]) => (
                <g key={`metal-${chave}`} className={s[`enfCanal${chave}` as keyof typeof s]}>
                  <path className={s.enfHalo} d={canal.d} pathLength={100} />
                  <path className={s.enfVeio} d={canal.d} pathLength={100} />
                </g>
              ))}
              {/* a selva é dos dois lados do rio: o arco de baixo acende com o de cima */}
              <g className={s.enfCanalSEL}>
                <path className={s.enfHalo} d={SELVA_DE_BAIXO} pathLength={100} />
                <path className={s.enfVeio} d={SELVA_DE_BAIXO} pathLength={100} />
              </g>
              {/* as bases */}
              <circle className={s.enfBaseAzul} cx="86" cy="514" r="30" />
              <circle className={s.enfBaseVermelha} cx="514" cy="86" r="30" />
            </svg>

            {grupos.map((grupo) => {
              const passo = ROTEIRO[grupo.sigla]!;
              const craque = grupo.linhas[0] ? dados.jogadores[grupo.linhas[0].slug] : undefined;
              if (!craque) return null;
              const time = timeDe(craque);
              return (
                <div
                  key={grupo.sigla}
                  className={s.no}
                  style={{ "--x": `${(passo.no[0] / 600) * 100}%`, "--y": `${(passo.no[1] / 600) * 100}%`, "--rota": grupo.cor } as CSSProperties}
                  data-marca={passo.em.toFixed(2)}
                  data-golpe=""
                  data-som="clang"
                  data-faisca="time"
                  data-cor={time?.neon ?? grupo.cor}
                >
                  <Rosto
                    jogador={craque}
                    time={time}
                    rotulo={preencher(f.cartaAbrir, { nick: craque.nick })}
                    className={s.noRosto}
                    dica={false}
                  />
                  <span className={s.noRota} aria-hidden>
                    <RoleIcon role={grupo.chave} size={18} color="#120d06" />
                  </span>
                </div>
              );
            })}
          </div>

          <ol className={s.lista} data-grupo-de-jogadores="">
            {grupos.map((grupo) => (
              <LinhaDaRota key={grupo.sigla} grupo={grupo} dados={dados} t={t} timeDe={timeDe} em={ROTEIRO[grupo.sigla]!.em} />
            ))}
          </ol>
        </div>

        <p className={b.nota}>{f.canaisNota}</p>
      </div>
    </section>
  );
}
