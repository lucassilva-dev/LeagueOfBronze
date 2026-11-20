import type { CSSProperties } from "react";

import { RoleIcon } from "@/components/lob/ui";
import { formatKda } from "@/lib/format";
import { arteDoCampeao, type JogadorDaForja, type TimeDaForja } from "@/lib/stats/forja";

import s from "./carta.module.css";
import { EmblemaDoElo, coresDoTime, preencher } from "./pecas";
import type { TextosDaTela } from "./provedor";

/**
 * A CARTA HOLOGRÁFICA DO JOGADOR.
 *
 * É a evolução das duas cartas que o site já tinha: a anatomia vem do `PlayerCard`
 * (components/lob/player-card.tsx — rota, elo, capitão, nick em Anton, time no rodapé) e a
 * inclinação 3D vem do motor do `TcgCard`, que agora é compartilhado
 * (components/lob/inclinacao.ts). O que é novo: o foil nas cores do TIME, o verso com as
 * estatísticas e a arte do campeão mais jogado (Data Dragon), e o selo com o valor de draft.
 *
 * Renderiza no servidor, sem estado. Quem dá vida é a página:
 *  - `data-inclina`  → o motor escreve --rx/--ry/--bx/--by (inclinação, foil, brilho);
 *  - `data-vira`     → o clique vira a carta (`data-virada`) e pede a arte do verso;
 *  - `data-jogador`  → abre o holofote (é um link para a ficha: funciona sem JavaScript).
 */

/** A largura aproximada de um texto na Anton, em em (para o nick caber na carta). */
function larguraNaAnton(texto: string): number {
  let soma = 0;
  for (const c of texto) {
    if (c === " ") soma += 0.2;
    else if (c >= "0" && c <= "9") soma += 0.47;
    else if (c === c.toLowerCase() && c !== c.toUpperCase()) soma += 0.43;
    else if ("IÍÌÎ1.,'!".includes(c)) soma += 0.26;
    else if ("MWÆ".includes(c)) soma += 0.66;
    else soma += 0.5;
  }
  return Math.max(2.4, soma);
}

function Foto({ jogador, time }: Readonly<{ jogador: JogadorDaForja; time: TimeDaForja | null }>) {
  if (!jogador.foto) {
    return (
      <span className={s.semFoto}>
        <RoleIcon role={jogador.rota.chave} size={96} color={time?.cor ?? "#c98a4b"} opacity={0.5} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={s.foto}
      src={jogador.foto}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      data-medalhao={jogador.fotoMedalhao ? "" : undefined}
      style={{ objectPosition: jogador.fotoFoco }}
    />
  );
}

export function CartaDoJogador({
  jogador,
  time,
  t,
  posicao,
  className,
  estilo,
  marca,
  viraSozinha = true,
  titulo: Titulo = "h3",
}: Readonly<{
  jogador: JogadorDaForja;
  time: TimeDaForja | null;
  t: TextosDaTela;
  /** A posição na lista em que a carta aparece (#1, #2…), se houver. */
  posicao?: number;
  className?: string;
  estilo?: CSSProperties;
  /** Atributos de marca do roteiro (`data-marca` etc.), quando a carta é revelada pela rolagem. */
  marca?: Readonly<Record<string, string>>;
  /** A carta vira no clique (padrão). No holofote ela já vem aberta, com os números ao lado. */
  viraSozinha?: boolean;
  titulo?: "h2" | "h3";
}>) {
  const { f, localeTag } = t;
  const assinatura = jogador.campeoes[0] ?? null;
  const arte = assinatura?.id ? arteDoCampeao(assinatura.id) : null;
  const jogou = jogador.jogos > 0;
  const ficha = `/jogadores/${encodeURIComponent(jogador.slug)}`;
  const nickEm = larguraNaAnton(jogador.nick).toFixed(2);

  return (
    <article
      className={`${s.carta} ${className ?? ""}`}
      style={{ ...coresDoTime(time), "--nick-em": nickEm, ...estilo } as CSSProperties}
      data-carta=""
      data-inclina="15"
      data-virada="0"
      {...marca}
    >
      <div className={s.inclina}>
        <div className={s.giro}>
          {/* ------------------------------------------------ frente */}
          <div className={s.frente} data-lado="frente">
            <div className={s.janela}>
              <Foto jogador={jogador} time={time} />
              <span className={s.enfVeu} aria-hidden />
            </div>

            <div className={s.cabeca}>
              {posicao ? (
                <span className={s.posicao}>
                  <span aria-hidden>#</span>
                  {posicao}
                </span>
              ) : null}
              {/* a rota e, embaixo dela, a braçadeira de capitão (no pé ela empurrava o nick para
                  baixo do selo de pontos) */}
              <span className={s.etiquetas}>
                <span className={s.rota} style={{ "--rota": jogador.rota.cor } as CSSProperties}>
                  <RoleIcon role={jogador.rota.chave} size={16} color="#120d06" />
                  {jogador.rota.rotulo}
                </span>
                {jogador.capitao ? <span className={s.capitao}>{f.cartaCapitao}</span> : null}
              </span>
              {jogador.elo ? <EmblemaDoElo chave={jogador.elo.chave} rotulo={jogador.elo.rotulo} className={s.elo} /> : null}
            </div>

            <div className={s.pe}>
              <Titulo className={s.nick}>{jogador.nick}</Titulo>
              {time ? (
                <p className={s.time}>
                  {time.escudo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={time.escudo} alt="" loading="lazy" decoding="async" draggable={false} />
                  ) : null}
                  <span>{time.nome}</span>
                </p>
              ) : null}
            </div>

            <p className={s.selo}>
              <span className={s.seloNumero}>{jogador.pts}</span>
              <span className={s.seloRotulo}>{f.cartaPts}</span>
              <span className={s.soLeitor}>{f.cartaValor}</span>
            </p>

            <span className={s.enfFoil} aria-hidden />
            <span className={s.enfBrilho} aria-hidden />
            <span className={s.enfBrasa} data-brasa="" aria-hidden />

            {viraSozinha ? (
              <button type="button" className={s.vira} data-vira="" aria-label={`${f.cartaVirar}: ${jogador.nick}`}>
                <span className={s.enfGira} aria-hidden />
              </button>
            ) : null}
          </div>

          {/* ------------------------------------------------ verso */}
          {viraSozinha ? (
            <div className={s.verso} data-lado="verso" inert>
              {arte ? (
                // A arte só é pedida quando a carta vira (`data-src` → `src`, no provedor).
                // eslint-disable-next-line @next/next/no-img-element
                <img className={s.arte} data-src={arte.retrato} alt="" decoding="async" draggable={false} />
              ) : null}
              <span className={s.enfVeuDoVerso} aria-hidden />

              <p className={s.versoNick}>{jogador.nick}</p>

              {jogou ? (
                <>
                  <dl className={s.numeros}>
                    <div>
                      <dt>KDA</dt>
                      <dd>{formatKda(jogador.kda, localeTag)}</dd>
                    </div>
                    <div>
                      <dt>MVPs</dt>
                      <dd>{jogador.mvps}</dd>
                    </div>
                    <div>
                      <dt>{f.cartaJogos}</dt>
                      <dd>{jogador.jogos}</dd>
                    </div>
                    <div>
                      <dt>{f.cartaVitorias}</dt>
                      <dd>{jogador.vitorias}</dd>
                    </div>
                  </dl>
                  <p className={s.kda}>
                    <span>{jogador.abates}</span> / <span>{jogador.mortes}</span> / <span>{jogador.assistencias}</span>
                    <span className={s.kdaRotulo}>
                      {f.cartaAbates} / {f.cartaMortes} / {f.cartaAssist}
                    </span>
                  </p>
                  {assinatura ? (
                    <p className={s.assinatura}>
                      <span className={s.assinaturaRotulo}>{f.cartaAssinatura}</span>
                      <strong>{assinatura.nome}</strong> · {assinatura.jogos}×
                    </p>
                  ) : null}
                </>
              ) : (
                <p className={s.semJogo}>{f.cartaSemJogo}</p>
              )}

              <button type="button" className={s.desvira} data-vira="" aria-label={`${f.cartaDesvirar}: ${jogador.nick}`} />
              <p className={s.acoes}>
                <a href={ficha} data-jogador={jogador.slug} className={s.acao} aria-label={preencher(f.cartaAbrir, { nick: jogador.nick })}>
                  {f.cartaHolofote}
                </a>
                <a href={ficha} className={s.acaoSecundaria}>
                  {f.cartaFicha} <span aria-hidden>→</span>
                </a>
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
