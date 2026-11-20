import type { CSSProperties } from "react";

import type { DadosDaForja } from "@/lib/stats/forja";

import { CartaDoJogador } from "../carta-do-jogador";
import b from "../forja.module.css";
import { CartaoDoAto, preencher, type TimeDe } from "../pecas";
import type { TextosDaTela } from "../provedor";
import s from "./raras.module.css";

/** As trincas do molde: quatro riscos que saem do meio (coordenadas numa caixa 100×100). */
const TRINCAS = [
  "M50 50 L44 38 L48 27 L41 14 L45 2",
  "M50 50 L58 61 L54 73 L61 86 L57 98",
  "M50 50 L36 54 L27 49 L14 55 L3 51",
  "M50 50 L63 45 L73 51 L86 44 L97 49",
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
        {TRINCAS.map((d) => (
          <path key={d} d={d} pathLength={100} />
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
                  <CartaDoJogador jogador={jogador} time={timeDe(jogador)} t={t} posicao={i + 1} className={s.carta} />
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
