import type { CSSProperties, ReactNode } from "react";

import { RoleIcon } from "@/components/lob/ui";
import { eloSvgUrl } from "@/lib/design";
import type { JogadorDaForja, TimeDaForja } from "@/lib/stats/forja";
import { METRICAS, larguraEm } from "@/lib/temas/metricas";

import s from "./forja.module.css";

/**
 * AS PEÇAS COMUNS DA FORJA — o que todo ato usa: o cartão do ato, o odômetro, o medalhão do time
 * e o rosto do jogador. Tudo renderizável no servidor (sem estado): quem dá vida é o CSS, com os
 * atributos que o diretor liga (`data-aceso`, `--p`).
 */

/** Troca cada `{chave}` do texto pelo valor; chave sem valor fica como está. */
export function preencher(modelo: string, valores: Readonly<Record<string, string | number>>): string {
  return modelo.replace(/\{(\w+)\}/g, (inteiro, chave: string) => (chave in valores ? String(valores[chave]) : inteiro));
}

/**
 * A largura aproximada de um texto na Anton, em em — para um nick caber numa linha (a fonte de
 * título do site não tem métrica medida; os avanços abaixo erram para mais, nunca para menos).
 */
export function larguraNaAnton(texto: string): number {
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

/**
 * A largura da MARCA do time em `em`, na fonte do tema dele — para o nome caber no maior tamanho
 * possível. Fonte medida (lib/temas/metricas.ts) dá a largura exata; as duas sem medição (Exo 2
 * da RX, Bungee do Queijo Minas) e o time sem tema entram por um avanço médio.
 */
const AVANCO_MEDIO: Readonly<Record<string, number>> = { "exo2-italico": 0.66, bungee: 0.72 };
export function larguraDaMarca(time: Pick<TimeDaForja, "marca" | "fonteTitulo">): number {
  const metricas = time.fonteTitulo ? METRICAS[time.fonteTitulo] : undefined;
  if (metricas) return larguraEm(time.marca, metricas);
  return Math.max(1, time.marca.length * (time.fonteTitulo ? (AVANCO_MEDIO[time.fonteTitulo] ?? 0.6) : 0.5));
}

/** O time de um jogador, com a identidade dele — ou null para o reserva (sem time). */
export type TimeDe = (jogador: JogadorDaForja) => TimeDaForja | null;

/** As variáveis de cor de um time para o CSS (`--cor`, `--neon`, `--arco`, `--abismo`). */
export function coresDoTime(time: TimeDaForja | null): CSSProperties {
  if (!time) return { "--cor": "#8f8472", "--neon": "#c98a4b", "--arco": "#f0c88a", "--abismo": "#1a1108" } as CSSProperties;
  return { "--cor": time.cor, "--neon": time.neon, "--arco": time.arco, "--abismo": time.abismo } as CSSProperties;
}

// ---------------------------------------------------------------------------------- cartão do ato

/**
 * O cartão que abre cada ato: o número («ATO II»), o nome da cena («A LIGA») e o que ela mostra.
 * No computador, com o ato fixo, ele começa grande no meio do palco e recolhe para o canto.
 */
export function CartaoDoAto({
  numero,
  nome,
  sub,
  como: Titulo = "h2",
  id,
  children,
}: Readonly<{ numero: string; nome: string; sub: string; como?: "h1" | "h2"; id?: string; children?: ReactNode }>) {
  return (
    <header className={s.cartao}>
      <p className={s.cartaoNumero}>{numero}</p>
      <Titulo id={id} className={s.cartaoNome}>
        {nome}
      </Titulo>
      <p className={s.cartaoSub}>{sub}</p>
      {children}
    </header>
  );
}

// ---------------------------------------------------------------------------------- odômetro

/**
 * Um número que ROLA até o valor, dígito por dígito.
 *
 * O número de verdade está no HTML, como texto (é o que o leitor de tela lê, o que o buscador
 * indexa e o que sai num copiar-e-colar). A fita que rola por cima é enfeite: os dígitos dela
 * são `content` de CSS, não texto da página — um leitor de página nunca vê «0123456789».
 *
 * Repouso = valor final. A fita só volta ao zero dentro de uma marca apagada
 * (`[data-aceso="0"]`), e rola de volta ao número quando a marca acende. Quando o valor muda
 * (o ranking trocando de critério), cada coluna rola do dígito antigo para o novo.
 */
export function Odometro({ texto, className, rotulo }: Readonly<{ texto: string; className?: string; rotulo?: string }>) {
  const caracteres = [...texto];
  const digitos = caracteres.filter((c) => c >= "0" && c <= "9").length;
  let visto = 0;
  return (
    <span className={`${s.odo} ${className ?? ""}`} aria-label={rotulo}>
      {caracteres.map((c, i) => {
        if (c < "0" || c > "9") {
          return (
            <span key={`sep-${caracteres.length - i}`} className={s.odoSep}>
              {c}
            </span>
          );
        }
        // A chave conta da DIREITA: a unidade continua sendo a unidade quando o número ganha casas.
        const daDireita = digitos - visto;
        visto += 1;
        return (
          <span key={`d-${daDireita}`} className={s.odoCol} style={{ "--d": c, "--odo-t": `${(0.55 + visto * 0.16).toFixed(2)}s` } as CSSProperties}>
            <span className={s.odoReal}>{c}</span>
            <span className={s.enfFita} aria-hidden />
          </span>
        );
      })}
    </span>
  );
}

// ---------------------------------------------------------------------------------- medalhão

/**
 * O escudo do time cunhado num medalhão de bronze: aro metálico, face rebaixada e o escudo em
 * relevo (o filtro `#lob-cunho`, de `<FiltrosDaForja>`, tira o relevo da própria imagem), com a
 * aura na cor do time. Sem escudo, a sigla — nunca um buraco.
 */
export function Medalhao({
  time,
  className,
  rotulo,
  cunhado = true,
}: Readonly<{ time: Pick<TimeDaForja, "nome" | "escudo" | "sigla" | "cor" | "neon">; className?: string; rotulo?: string; cunhado?: boolean }>) {
  return (
    <span className={`${s.medalhao} ${className ?? ""}`} style={{ "--cor": time.cor, "--neon": time.neon } as CSSProperties}>
      <span className={s.enfAura} aria-hidden />
      <span className={s.enfMoeda} aria-hidden />
      {time.escudo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={`${s.medalhaoEscudo} ${cunhado ? s.medalhaoCunhado : ""}`}
          src={time.escudo}
          alt={rotulo ?? time.nome}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      ) : (
        <span className={s.medalhaoSigla} role="img" aria-label={rotulo ?? time.nome}>
          {time.sigla}
        </span>
      )}
      <span className={s.enfReflexo} aria-hidden />
    </span>
  );
}

/**
 * Os filtros SVG da página, declarados uma vez. `lob-cunho` dá RELEVO a uma imagem: a luminância
 * vira altura e uma luz rasante modela o volume e risca o brilho. As cores do escudo ficam (é
 * esmalte sobre metal, não bronze cru): o time continua reconhecível de longe, e a peça parece
 * batida, não colada.
 */
export function FiltrosDaForja() {
  return (
    <svg className={s.enfFiltros} width="0" height="0" aria-hidden focusable="false">
      <defs>
        <filter id="lob-cunho" x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="luz" />
          <feComposite in="luz" in2="SourceAlpha" operator="in" result="altura" />
          <feGaussianBlur in="altura" stdDeviation="1.1" result="relevo" />
          <feDiffuseLighting in="relevo" surfaceScale="2.6" diffuseConstant="1.2" lightingColor="#ffe6bc" result="difusa">
            <feDistantLight azimuth="225" elevation="50" />
          </feDiffuseLighting>
          {/* cor × (0,42 + 0,7 × luz): o escudo continua com as cores dele, modeladas pela luz */}
          <feComposite in="SourceGraphic" in2="difusa" operator="arithmetic" k1="0.7" k2="0.42" k3="0" k4="0" result="pintado" />
          <feSpecularLighting in="relevo" surfaceScale="2.6" specularConstant="0.8" specularExponent="24" lightingColor="#fff3dc" result="brilho">
            <feDistantLight azimuth="225" elevation="54" />
          </feSpecularLighting>
          <feComposite in="brilho" in2="SourceAlpha" operator="in" result="brilhoNoEscudo" />
          <feComposite in="brilhoNoEscudo" in2="pintado" operator="arithmetic" k1="0" k2="0.6" k3="1" k4="0" result="iluminado" />
          <feComposite in="iluminado" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

// ---------------------------------------------------------------------------------- rosto

/**
 * O jogador em miniatura: a foto num aro da cor do time. É um LINK para a ficha (funciona sem
 * JavaScript); com a página viva, o clique abre o holofote no lugar (`data-jogador`).
 */
export function Rosto({
  jogador,
  time,
  rotulo,
  className,
  dica = true,
  estilo,
}: Readonly<{
  jogador: JogadorDaForja;
  time: TimeDaForja | null;
  /** O que o leitor de tela ouve (ex.: «Abrir Fulano em destaque»). */
  rotulo: string;
  className?: string;
  /** Mostra o nick (e o time) numa etiqueta ao passar o mouse ou focar. */
  dica?: boolean;
  estilo?: CSSProperties;
}>) {
  return (
    <a
      href={`/jogadores/${encodeURIComponent(jogador.slug)}`}
      className={`${s.rosto} ${className ?? ""}`}
      style={{ ...coresDoTime(time), ...estilo }}
      data-jogador={jogador.slug}
      data-medalhao={jogador.fotoMedalhao ? "" : undefined}
      data-dica={dica ? (time ? `${jogador.nick} · ${time.nome}` : jogador.nick) : undefined}
      aria-label={rotulo}
    >
      {jogador.foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={jogador.foto} alt="" loading="lazy" decoding="async" draggable={false} style={{ objectPosition: jogador.fotoFoco }} />
      ) : (
        <RoleIcon role={jogador.rota.chave} size={22} color={time?.cor ?? "#c98a4b"} />
      )}
    </a>
  );
}

/** O emblema oficial do elo (PNG de /public/elo), com o rótulo no idioma da página. */
export function EmblemaDoElo({ chave, rotulo, className }: Readonly<{ chave: string; rotulo: string; className?: string }>) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={eloSvgUrl(chave)} alt={rotulo} loading="lazy" decoding="async" draggable={false} />
  );
}

/**
 * O nome do time na fonte e no metal do tema dele (a assinatura pequena, a marca grande) — o
 * mesmo desenho da página do time e do show do sorteio.
 */
export function NomeDoTime({
  time,
  fonteClasse,
  className,
  como: Tag = "span",
}: Readonly<{ time: TimeDaForja; fonteClasse: string | null; className?: string; como?: "span" | "h3" | "p" }>) {
  const estilo = {
    "--metal": time.metal,
    "--metal-solido": time.metalSolido,
    "--peso-nome": time.pesoTitulo,
    "--estilo-nome": time.estiloTitulo,
  } as CSSProperties;
  const prefixada = time.assinatura !== null && time.nome.toUpperCase().startsWith(time.assinatura.toUpperCase());
  return (
    <Tag className={`${s.nomeDoTime} ${fonteClasse ?? ""} ${className ?? ""}`} style={estilo}>
      {time.assinatura === null ? (
        <span className={s.nomeMarca}>{time.nome}</span>
      ) : prefixada ? (
        <>
          <span className={s.nomeAssinatura}>{time.assinatura}</span> <span className={s.nomeMarca}>{time.marca}</span>
        </>
      ) : (
        <>
          <span className={s.nomeMarca}>{time.marca}</span> <span className={s.nomeAssinatura}>{time.assinatura}</span>
        </>
      )}
    </Tag>
  );
}
