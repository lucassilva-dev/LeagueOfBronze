import type { CSSProperties } from "react";

import type { DadosDaForja } from "@/lib/stats/forja";

import { CartaDoJogador } from "../carta-do-jogador";
import b from "../forja.module.css";
import { CartaoDoAto, preencher, type TimeDe } from "../pecas";
import type { TextosDaTela } from "../provedor";
import s from "./raras.module.css";

/**
 * As trincas do molde (coordenadas numa caixa 100×100). As duas verticais correm EXATAMENTE
 * pela emenda das duas metades (o mesmo zigue-zague do recorte, no CSS): o molde racha onde
 * trincou. As outras são os ramos que abrem para os lados.
 */
const TRINCAS = [
  "M55 47 L45 31 L54 16 L46 0",
  "M55 47 L46 63 L54 80 L47 100",
  "M55 47 L40 53 L28 48 L14 55 L3 51",
  "M55 47 L66 44 L76 51 L88 45 L97 50",
  "M45 31 L36 26 L31 17",
  "M46 63 L57 68 L63 77",
  "M28 48 L24 39",
  "M76 51 L80 60",
] as const;

/** O que vai gravado no molde (duas vezes: uma metade de cada lado da rachadura). */
function FaceDoMolde({ selo, aviso }: Readonly<{ selo: string; aviso: string }>) {
  return (
    <span className={s.face}>
      <span className={s.faceTexto}>{selo}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.faceEmblema} src="/emblema-recortado.png" alt="" width={512} height={512} decoding="async" loading="lazy" />
      <span className={s.faceAviso}>{aviso}</span>
      <svg className={s.enfTrincas} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden focusable="false">
        {/* cada trinca são dois traços: a luz que vaza (larga) e o veio branco de quente (fino) */}
        {TRINCAS.map((d) => (
          <path key={`halo-${d}`} d={d} pathLength={100} data-camada="halo" />
        ))}
        {TRINCAS.map((d) => (
          <path key={`veio-${d}`} d={d} pathLength={100} data-camada="veio" />
        ))}
      </svg>
    </span>
  );
}

/**
 * ATO IV — AS PEÇAS RARAS. Os mais caros do draft (o mesmo recorte de «top jogadores por valor»).
 *
 * Com o ato fixo: um molde de areia selado trinca conforme a rolagem, racha e solta as cartas,
 * que chegam em brasa e esfriam no foil do time; depois a esteira corre de lado, uma carta de
 * cada vez no centro. Sem pinos (celular), as cartas ficam numa fileira que se arrasta com o dedo.
 */
export function AtoDasPecasRaras({ dados, t, timeDe }: Readonly<{ dados: DadosDaForja; t: TextosDaTela; timeDe: TimeDe }>) {
  const { f } = t;
  const n = dados.topValor.length;
  const selo = preencher(f.pecasSelo, { n });
  // Quem custou o mesmo divide o lugar (10, 10, 10, 8… → #1, #1, #1, #4…): a ordem entre
  // empatados é só a do cadastro, e um «#5» numa carta que vale o mesmo que a «#4» mentia.
  const valores = dados.topValor.map((slug) => dados.jogadores[slug]?.pts ?? 0);
  const lugarDe = (i: number) => 1 + valores.filter((v) => v > valores[i]!).length;

  return (
    <section id="ato-pecas" className={`${b.ato} ${s.ato}`} data-ato="pecas" data-fixa="" aria-labelledby="titulo-das-pecas">
      <div className={b.palco}>
        <CartaoDoAto numero={f.atos.pecas.numero} nome={f.atos.pecas.nome} sub={f.atos.pecas.sub} id="titulo-das-pecas" />

        <div className={`${b.cena} ${s.cena}`} style={{ "--n": n } as CSSProperties}>
          {/* O molde selado: só existe com o ato fixo (no CSS). É cenário — as cartas estão logo
              abaixo, no HTML, com tudo que importa. */}
          <div
            className={s.selado}
            aria-hidden
            data-marca="0.4"
            data-golpe=""
            data-som="estalo carta@180 carta@320 carta@460"
            data-faisca="forte"
          >
            <span className={s.enfLuzDeDentro} />
            <span className={`${s.metade} ${s.metadeEsquerda}`}>
              <FaceDoMolde selo={selo} aviso={f.pecasAviso} />
            </span>
            <span className={`${s.metade} ${s.metadeDireita}`}>
              <FaceDoMolde selo={selo} aviso={f.pecasAviso} />
            </span>
          </div>
          <span className={s.soMarca} data-marca="0.2" data-som="trinca" aria-hidden />
          <span className={s.soMarca} data-marca="0.3" data-som="trinca" aria-hidden />

          <ol className={s.esteira} data-grupo-de-jogadores="">
            {dados.topValor.map((slug, i) => {
              const jogador = dados.jogadores[slug];
              if (!jogador) return null;
              return (
                <li key={slug} className={s.vaga} style={{ "--i": i } as CSSProperties} data-marca="0.4">
                  <CartaDoJogador jogador={jogador} time={timeDe(jogador)} t={t} posicao={lugarDe(i)} className={s.carta} />
                </li>
              );
            })}
          </ol>
        </div>

        <p className={b.nota}>{preencher(f.pecasNota, { n })}</p>
      </div>
    </section>
  );
}
