"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheck, Crown, Flame, Maximize2, TrendingUp, UserRoundX, type LucideIcon } from "lucide-react";

import { useCompacto } from "@/components/admin/responsivo";
import { Button, C, ChipFiltro, Elo, RolagemX, Toolbar, display, tabular } from "@/components/admin/ui";
import { RoleIcon } from "@/components/lob/ui";
import { ELO_ORDER, resolveElo, resolveRole, type EloMeta, type RoleMeta } from "@/lib/design";
import {
  ROTAS_IDEAIS,
  montarRotasIdeais,
  type Encaixe,
  type LugarNaRota,
  type RotaIdeal,
  type RotasIdeais,
} from "@/lib/draft/rotas-ideais";
import { SITE_DOMINIO } from "@/lib/site-url";

/**
 * Elo por rota — a pergunta que o grupo fez ("tem como ver a divisão de elo por role?").
 *
 * É a única peça da aba feita para SAIR do painel: a organização tira print e manda no
 * WhatsApp. Daí três escolhas que não valem para o resto da aba:
 *
 * 1. NENHUM PONTO aparece aqui. O preço de cada elo não é mostrado para jogador até a
 *    lista fechar (decisão da 4ª Edição), e um print circula sem controle — só quantas
 *    pessoas, de que elo, em que rota.
 * 2. O quadro se explica sozinho: título, quantos jogadores, que rota está contando,
 *    data e o endereço do site vão dentro da moldura, para o print não precisar de
 *    legenda.
 * 3. Na MATRIZ (principal, secundária, as duas) os nicks ficam só no `title` das células
 *    do quadro DA ABA (passar o mouse, no monitor) — nunca na tela de print, onde um
 *    tooltip parado sairia na imagem. A exceção é o modo IDEAL, que existe justamente para
 *    mostrar quem seria cada um dos N de cada rota (pedido do Lucas em 23/10): lá o nick vai
 *    escrito, ainda sem ponto nenhum.
 *
 * Quatro modos: rota principal, só a secundária, principal + secundária, e o ideal — a
 * simulação de `lib/draft/rotas-ideais.ts`, que tenta fechar N por rota (N = times) usando
 * só a principal e a secundária de cada um.
 *
 * A matriz é a mesma no monitor e no celular — linhas são os elos (do mais alto ao mais
 * baixo, como uma escada), colunas as cinco rotas. Cinco colunas cabem num telefone de
 * 320px. O celular perde o que não cabe ou custaria altura: a coluna de total, o nome
 * escrito do elo (fica o emblema com a sigla, e o nome vira o `alt`), o "jogadores" sob
 * cada total, o cartão de elo médio geral e os nicks no `title`.
 */

// ---------------------------------------------------------------- conta

/** Ordem do jogo, a mesma de "Cobertura de rotas". O banco grava JUNG, não SEL. */
export const ROTAS_DO_QUADRO = ["TOP", "JUNG", "MID", "ADC", "SUP"] as const;

/**
 * Que rota a MATRIZ conta: `principal` e `secundaria` contam cada pessoa uma vez (numa ou
 * noutra); `ambas` conta também na secundária.
 */
export type ModoDasRotas = "principal" | "secundaria" | "ambas";

/** O que o quadro mostra: uma das contagens da matriz, ou o ideal de N por rota. */
export type ModoDoQuadro = ModoDasRotas | "ideal";

/** O que o quadro precisa saber de cada inscrito — e nada além disso. */
export type JogadorDoQuadro = Readonly<{
  nick: string;
  /** O elo que vale para o draft (congelado → verificado → declarado). */
  elo: string;
  primaria: string;
  secundaria: string;
}>;

export type ColunaDaRota = {
  meta: RoleMeta;
  /** Quantas pessoas contam nesta rota (no modo `ambas`, principal + secundária). */
  total: number;
  /**
   * Quantas têm a rota como PRINCIPAL — titular, a conta da cobertura. Inclui quem tem elo
   * ilegível: a "Cobertura de rotas" da aba conta assim, e os dois não podem discordar.
   */
  principais: number;
  /** Contagem por `EloMeta.key`. */
  porElo: Record<string, number>;
  /** Nicks por `EloMeta.key`, para o `title` da célula. */
  nicksPorElo: Record<string, string[]>;
  /** Média dos degraus da escada (Ferro = 0 … Desafiante = 9), sem arredondar. */
  degrauMedio: number | null;
  /** O elo da média arredondada — o "elo médio" que aparece escrito. */
  medio: EloMeta | null;
};

export type QuadroEloPorRota = {
  /** Só os elos que aparecem, do mais alto ao mais baixo. */
  elos: EloMeta[];
  rotas: ColunaDaRota[];
  totalPorElo: Record<string, number>;
  /** Pessoas no quadro — cada uma uma vez, mesmo no modo `ambas`. */
  pessoas: number;
  /** Quem ficou de fora por elo ou rota que a tabela do site não reconhece. */
  foraDoQuadro: number;
  /** A maior célula: a régua do brilho. */
  maiorCelula: number;
  /** Elo médio de todo mundo (cada pessoa uma vez). */
  medioGeral: EloMeta | null;
};

const DEGRAU = new Map(ELO_ORDER.map((meta, indice) => [meta.key, indice]));

function eloDoDegrau(media: number | null): EloMeta | null {
  return media === null ? null : ELO_ORDER[Math.round(media)] ?? null;
}

/**
 * Monta a matriz elo × rota.
 *
 * Elo ou rota ilegível fica FORA (e é contado em `foraDoQuadro`) em vez de cair numa
 * coluna "outros": a aba já tem um aviso vermelho para elo não reconhecido, e uma linha
 * a mais aqui viraria lixo no print. No modo `ambas`, quem marcou a mesma rota duas
 * vezes conta uma só nela — senão a rota ganhava gente que não existe. No modo
 * `secundaria`, quem conta é a rota que a pessoa marcou em segundo; a principal só entra
 * na cobertura, que é sempre de titular.
 */
export function montarEloPorRota(jogadores: readonly JogadorDoQuadro[], modo: ModoDasRotas): QuadroEloPorRota {
  const rotas: ColunaDaRota[] = ROTAS_DO_QUADRO.map((chave) => ({
    meta: resolveRole(chave),
    total: 0,
    principais: 0,
    porElo: {},
    nicksPorElo: {},
    degrauMedio: null,
    medio: null,
  }));
  const porChave = new Map(rotas.map((coluna) => [coluna.meta.key, coluna]));
  const somaDeDegraus = new Map<string, number>();
  const totalPorElo: Record<string, number> = {};

  let pessoas = 0;
  let foraDoQuadro = 0;
  let somaGeral = 0;

  for (const jogador of jogadores) {
    const elo = resolveElo(jogador.elo);
    const principal = porChave.get(resolveRole(jogador.primaria).key);
    // A cobertura só depende da rota: um elo ilegível tira a pessoa da escada, mas ela
    // continua sendo titular da rota que marcou.
    if (principal) principal.principais += 1;
    const secundaria = porChave.get(resolveRole(jogador.secundaria).key);
    // A rota que este modo conta precisa ser legível; no `ambas`, a principal manda e a
    // secundária ilegível só deixa de somar.
    const exigida = modo === "secundaria" ? secundaria : principal;
    if (!elo || !exigida) {
      foraDoQuadro += 1;
      continue;
    }
    const colunas =
      modo === "ambas" && secundaria && secundaria !== exigida ? [exigida, secundaria] : [exigida];
    const degrau = DEGRAU.get(elo.key) ?? 0;

    for (const coluna of colunas) {
      coluna.total += 1;
      coluna.porElo[elo.key] = (coluna.porElo[elo.key] ?? 0) + 1;
      (coluna.nicksPorElo[elo.key] ??= []).push(jogador.nick);
      somaDeDegraus.set(coluna.meta.key, (somaDeDegraus.get(coluna.meta.key) ?? 0) + degrau);
    }
    totalPorElo[elo.key] = (totalPorElo[elo.key] ?? 0) + 1;
    pessoas += 1;
    somaGeral += degrau;
  }

  let maiorCelula = 0;
  for (const coluna of rotas) {
    coluna.degrauMedio = coluna.total > 0 ? (somaDeDegraus.get(coluna.meta.key) ?? 0) / coluna.total : null;
    coluna.medio = eloDoDegrau(coluna.degrauMedio);
    for (const quantidade of Object.values(coluna.porElo)) maiorCelula = Math.max(maiorCelula, quantidade);
    for (const nicks of Object.values(coluna.nicksPorElo)) nicks.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  return {
    elos: [...ELO_ORDER].reverse().filter((meta) => (totalPorElo[meta.key] ?? 0) > 0),
    rotas,
    totalPorElo,
    pessoas,
    foraDoQuadro,
    maiorCelula,
    medioGeral: eloDoDegrau(pessoas > 0 ? somaGeral / pessoas : null),
  };
}

export type DestaquesDoQuadro = {
  maisDisputada: ColunaDaRota[];
  maisEscassa: ColunaDaRota[];
  maiorMedia: ColunaDaRota[];
  /** O elo mais alto do pool e as rotas em que ele aparece. */
  topo: { elo: EloMeta; rotas: ColunaDaRota[] } | null;
};

/** Todos os empatados no extremo — escolher um só seria inventar desempate. */
function extremos(colunas: readonly ColunaDaRota[], valor: (c: ColunaDaRota) => number, maior: boolean) {
  if (colunas.length === 0) return [];
  const alvo = colunas.reduce((acc, c) => (maior ? Math.max(acc, valor(c)) : Math.min(acc, valor(c))), valor(colunas[0]));
  return colunas.filter((c) => valor(c) === alvo);
}

/** O degrau do elo médio QUE APARECE ESCRITO — não a média crua. */
function degrauExibido(c: ColunaDaRota): number {
  return c.medio ? (DEGRAU.get(c.medio.key) ?? 0) : -1;
}

/**
 * As curiosidades do rodapé. Quando todas as rotas empatam num critério, o destaque some:
 * "mais disputada: as cinco" não diz nada.
 *
 * O "maior elo médio" compara o elo que o quadro MOSTRA, não a média crua: com 3,33 contra
 * 3,25 as duas colunas exibem Ouro, e cravar uma só no destaque faria o print se
 * contradizer na linha logo acima.
 */
export function destaquesDoQuadro(quadro: QuadroEloPorRota): DestaquesDoQuadro {
  const { rotas } = quadro;
  const comGente = rotas.filter((c) => c.total > 0);
  const todasIguais = rotas.every((c) => c.total === rotas[0].total);
  const elo = quadro.elos[0];
  const mediasIguais = comGente.every((c) => degrauExibido(c) === degrauExibido(comGente[0]));
  return {
    maisDisputada: todasIguais ? [] : extremos(rotas, (c) => c.total, true),
    maisEscassa: todasIguais ? [] : extremos(rotas, (c) => c.total, false),
    maiorMedia: comGente.length < 2 || mediasIguais ? [] : extremos(comGente, degrauExibido, true),
    topo: elo ? { elo, rotas: rotas.filter((c) => (c.porElo[elo.key] ?? 0) > 0) } : null,
  };
}

// ---------------------------------------------------------------- apoio visual

/** `#rrggbb` + alfa. Cor estática de fundo e borda — nada aqui anima transparência. */
function comAlfa(hex: string, alfa: number): string {
  const canal = Math.round(Math.min(1, Math.max(0, alfa)) * 255);
  return `${hex}${canal.toString(16).padStart(2, "0")}`;
}

/** "Topo", "Topo e Selva", "Topo, Meio e Suporte". */
function juntar(nomes: readonly string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

function pessoasPorExtenso(n: number): string {
  return `${n} ${n === 1 ? "jogador" : "jogadores"}`;
}

/**
 * Sigla do elo para o celular. Em 26px os emblemas de Prata, Platina e Diamante se
 * confundem (todos azulados), e o nome inteiro não cabe na coluna — a sigla desfaz a
 * dúvida no print sem alargar nada.
 */
const SIGLA_DO_ELO: Record<string, string> = {
  ferro: "FER",
  bronze: "BRO",
  prata: "PRA",
  ouro: "OUR",
  platina: "PLA",
  esmeralda: "ESM",
  diamante: "DIA",
  mestre: "MES",
  "grao-mestre": "GM",
  desafiante: "DES",
};

/** Emblema com a sigla embaixo — a versão de bolso de `<Elo mostrarNome>`. */
function EloComSigla({ elo, tamanho }: Readonly<{ elo: EloMeta; tamanho: number }>) {
  return (
    <span style={{ display: "grid", justifyItems: "center", gap: 1 }}>
      <Elo elo={elo.label} tamanho={tamanho} />
      <span aria-hidden style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: ".06em", lineHeight: 1, color: elo.color }}>
        {SIGLA_DO_ELO[elo.key] ?? elo.label}
      </span>
    </span>
  );
}

const HEXAGONO = "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)";

/**
 * O ícone oficial da rota num hexágono com a borda na cor dela — o selo Hextech do
 * painel, mas tingido: no quadro a cor da rota é o que amarra a coluna inteira.
 */
function HexDaRota({ meta, tamanho }: Readonly<{ meta: RoleMeta; tamanho: number }>) {
  return (
    // A sombra mora no invólucro: `clip-path` recortaria o `filter` do próprio nó.
    <span
      aria-hidden
      style={{
        position: "relative",
        display: "inline-grid",
        placeItems: "center",
        width: tamanho,
        height: Math.round(tamanho * 0.866),
        flexShrink: 0,
        filter: `drop-shadow(0 0 10px ${comAlfa(meta.color, 0.4)}) drop-shadow(0 3px 6px rgba(0,0,0,.6))`,
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          clipPath: HEXAGONO,
          background: `linear-gradient(160deg, #fff4dd 0%, ${meta.color} 42%, ${comAlfa(meta.color, 0.45)} 100%)`,
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: tamanho >= 40 ? 2 : 1.6,
          clipPath: HEXAGONO,
          background: `radial-gradient(120% 75% at 50% 0%, ${comAlfa(meta.color, 0.34)}, transparent 62%), linear-gradient(180deg, #1f170d 0%, #0c0805 100%)`,
        }}
      />
      <span style={{ position: "relative", display: "grid" }}>
        <RoleIcon role={meta.key} size={Math.round(tamanho * 0.5)} color={meta.color} />
      </span>
    </span>
  );
}

/** Os cantos da moldura — o mesmo recorte de "placa" das telas do draft. */
function Cantos() {
  const base: CSSProperties = { position: "absolute", width: 14, height: 14, borderColor: C.bronze, borderStyle: "solid" };
  return (
    <>
      <span aria-hidden style={{ ...base, top: 9, left: 9, borderWidth: "1.5px 0 0 1.5px" }} />
      <span aria-hidden style={{ ...base, top: 9, right: 9, borderWidth: "1.5px 1.5px 0 0" }} />
      <span aria-hidden style={{ ...base, bottom: 9, left: 9, borderWidth: "0 0 1.5px 1.5px" }} />
      <span aria-hidden style={{ ...base, bottom: 9, right: 9, borderWidth: "0 1.5px 1.5px 0" }} />
    </>
  );
}

/**
 * Uma célula da matriz. A cor é a da ROTA (a coluna vira um pilar), e a intensidade
 * acompanha a quantidade contra a maior célula do quadro — o olho acha o amontoado antes
 * de ler o número. Zero é traço tracejado, não um "0" que disputaria atenção.
 */
function Celula({
  quantidade,
  maior,
  rota,
  elo,
  nicks,
  compacto,
  paraPrint,
}: Readonly<{
  quantidade: number;
  maior: number;
  rota: RoleMeta;
  elo: EloMeta;
  nicks: readonly string[];
  compacto: boolean;
  paraPrint: boolean;
}>) {
  const rotulo = `${rota.label}, ${elo.label}: ${quantidade}`;
  const altura = compacto ? 40 : 48;
  if (quantidade === 0) {
    return (
      <span
        role="cell"
        aria-label={rotulo}
        style={{
          height: altura,
          display: "grid",
          placeItems: "center",
          borderRadius: 4,
          border: "1px dashed rgba(201,138,75,.13)",
          background: "rgba(0,0,0,.16)",
          color: C.ink4,
          fontSize: 13,
        }}
      >
        <span aria-hidden>–</span>
      </span>
    );
  }
  const forca = maior > 0 ? quantidade / maior : 0;
  const pico = quantidade === maior;
  return (
    <span
      role="cell"
      aria-label={rotulo}
      title={compacto || paraPrint ? undefined : `${rotulo} — ${nicks.join(", ")}`}
      style={{
        height: altura,
        display: "grid",
        placeItems: "center",
        borderRadius: 4,
        border: `1px solid ${comAlfa(rota.color, 0.28 + 0.5 * forca)}`,
        background: `linear-gradient(180deg, ${comAlfa(rota.color, 0.12 + 0.4 * forca)}, ${comAlfa(rota.color, 0.04 + 0.18 * forca)})`,
        boxShadow: pico
          ? `0 0 18px ${comAlfa(rota.color, 0.38)}, inset 0 1px 0 rgba(255,255,255,.14)`
          : "inset 0 1px 0 rgba(255,255,255,.06)",
        fontFamily: display,
        fontSize: compacto ? 18 : 22,
        lineHeight: 1,
        color: forca >= 0.5 ? "#fffaf0" : C.ink,
        textShadow: "0 1px 6px rgba(0,0,0,.55)",
        ...tabular,
      }}
    >
      {quantidade}
    </span>
  );
}

/** Uma curiosidade do rodapé do quadro. */
function Destaque({
  icone: Icone,
  rotulo,
  cor,
  children,
  detalhe,
}: Readonly<{ icone: LucideIcon; rotulo: string; cor: string; children: ReactNode; detalhe: ReactNode }>) {
  const compacto = useCompacto();
  return (
    <div
      style={{
        position: "relative",
        minWidth: 0,
        padding: compacto ? "10px 10px 10px 12px" : "12px 12px 12px 14px",
        borderRadius: 4,
        border: `1px solid ${comAlfa(cor, 0.3)}`,
        background: `linear-gradient(135deg, ${comAlfa(cor, 0.14)}, rgba(0,0,0,.28) 70%)`,
        boxShadow: `inset 3px 0 0 ${cor}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 9.5,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: C.ink3,
        }}
      >
        <Icone size={13} color={cor} aria-hidden />
        {rotulo}
      </div>
      <div style={{ marginTop: 7, fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.3, overflowWrap: "anywhere" }}>
        {children}
      </div>
      <div style={{ marginTop: 3, fontSize: 11.5, color: C.ink3, lineHeight: 1.4, ...tabular }}>{detalhe}</div>
    </div>
  );
}

/** Rotas em fila, cada uma com o ícone e o nome na cor dela. */
function NomesDasRotas({ colunas }: Readonly<{ colunas: readonly ColunaDaRota[] }>) {
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: "2px 8px" }}>
      {colunas.map((c) => (
        <span key={c.meta.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: c.meta.color }}>
          <RoleIcon role={c.meta.key} size={14} color={c.meta.color} />
          {c.meta.label}
        </span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------- quadro

const rotuloMiudo: CSSProperties = {
  fontSize: 9.5,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: C.ink4,
};

/** O emblema calado: o nome do elo já vai escrito ao lado, e o leitor de tela o leria duas vezes. */
function EmblemaMudo({ elo, tamanho }: Readonly<{ elo: EloMeta; tamanho: number }>) {
  return (
    <span aria-hidden style={{ display: "inline-flex", flexShrink: 0 }}>
      <Elo elo={elo.label} tamanho={tamanho} />
    </span>
  );
}

// ---------------------------------------------------------------- ideal

/** O que vem depois de "N jogadores" no subtítulo, em cada modo. */
const SUBTITULO_DO_MODO: Record<ModoDoQuadro, (ideal: RotasIdeais<JogadorDoQuadro> | null) => string> = {
  principal: () => " · rota principal",
  secundaria: () => " · só a rota secundária",
  ambas: () => " · principal + secundária (cada um conta nas duas)",
  // Fala das VAGAS, não das pessoas: com gente sobrando, "cada um na principal ou na
  // secundária" mentiria sobre quem ficou sem vaga.
  ideal: (ideal) =>
    !ideal
      ? " · nenhum time fecha ainda"
      : ideal.fecha
        ? ` · ${ideal.vagasPorRota} times, toda vaga com alguém na principal ou na secundária`
        : ` · ${ideal.vagasPorRota} times, mas nem toda vaga fecha com a principal ou a secundária`,
};

/** O resumo de quem ficou onde: "33 na principal · 7 na secundária". */
function resumoDoIdeal(ideal: RotasIdeais<JogadorDoQuadro>): string {
  const partes = [`${ideal.contagem.principal} na principal`, `${ideal.contagem.secundaria} na secundária`];
  if (ideal.contagem.fora > 0) partes.push(`${ideal.contagem.fora} fora das duas`);
  if (ideal.semVaga.length > 0) partes.push(`${ideal.semVaga.length} sem vaga`);
  return partes.join(" · ");
}

/** Esconde da tela e deixa para o leitor de tela (o `sr-only` de sempre, em objeto). */
const soParaLeitor: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * "FECHA" ou "NÃO FECHA", grande — é a primeira pergunta de quem recebe o print. No celular
 * sai `curto`, na linha do título (quando cabe ao lado dele; senão, logo abaixo): o resumo
 * desce para o subtítulo, e o print do telefone ganha a altura de uma linha.
 */
function VereditoDoIdeal({ ideal, curto = false }: Readonly<{ ideal: RotasIdeais<JogadorDoQuadro>; curto?: boolean }>) {
  const cor = ideal.fecha ? C.ok : C.danger;
  const Icone = ideal.fecha ? CircleCheck : CircleAlert;
  return (
    <div
      role="status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: curto ? 7 : 12,
        padding: curto ? "5px 9px" : "10px 16px",
        borderRadius: 4,
        border: `1px solid ${comAlfa(cor, 0.5)}`,
        background: `linear-gradient(135deg, ${comAlfa(cor, 0.18)}, rgba(0,0,0,.3) 75%)`,
        boxShadow: `0 0 22px ${comAlfa(cor, 0.18)}`,
      }}
    >
      <Icone size={curto ? 16 : 26} color={cor} aria-hidden />
      <span style={{ display: "grid", gap: 2 }}>
        <span
          style={{
            fontFamily: display,
            fontSize: curto ? 14 : 22,
            letterSpacing: ".05em",
            lineHeight: 1.05,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            color: ideal.fecha ? C.okSoft : C.dangerSoft,
          }}
        >
          {ideal.fecha ? (curto ? "Fecha" : `Fecha ${ideal.vagasPorRota} de cada`) : "Não fecha"}
        </span>
        {curto ? null : <span style={{ fontSize: 11.5, color: C.ink2, ...tabular }}>{resumoDoIdeal(ideal)}</span>}
      </span>
    </div>
  );
}

/** O que o leitor de tela ouve no lugar da marca visual. A principal não precisa de aviso. */
const ENCAIXE_POR_EXTENSO: Record<Encaixe, string> = {
  principal: "",
  secundaria: ", na rota secundária",
  fora: ", fora das duas rotas que marcou",
};

/**
 * Um jogador na vaga: emblema, nick e, se não for a principal, a marca do porquê. A marca
 * mora DENTRO da célula do nick (e não numa terceira coluna da grade): coluna vazia ainda
 * cobraria o vão, e em coluna estreita cada pixel é uma letra do nome.
 */
function LinhaDoIdeal({ lugar, miudo }: Readonly<{ lugar: LugarNaRota<JogadorDoQuadro>; miudo: boolean }>) {
  const { jogador, encaixe } = lugar;
  const meta = resolveElo(jogador.elo);
  return (
    <li
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: miudo ? 5 : 7,
        // Em cartão a linha é baixa de propósito: são 40 nomes num print de telefone.
        minHeight: miudo ? 21 : 32,
        padding: miudo ? "1px 5px 1px 3px" : "3px 7px 3px 5px",
        borderRadius: 3,
        background:
          encaixe === "principal" ? "rgba(0,0,0,.24)" : encaixe === "secundaria" ? "rgba(224,163,58,.09)" : "rgba(212,87,74,.13)",
        border: `1px solid ${encaixe === "principal" ? "rgba(201,138,75,.08)" : encaixe === "secundaria" ? "rgba(224,163,58,.28)" : "rgba(212,87,74,.4)"}`,
      }}
    >
      <span aria-hidden style={{ display: "inline-flex", flexShrink: 0 }}>
        <Elo elo={jogador.elo} tamanho={miudo ? 16 : 24} />
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: miudo ? 11.5 : 13,
          fontWeight: 600,
          color: C.ink,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {jogador.nick}
        <span style={soParaLeitor}>
          , {meta?.label ?? jogador.elo}
          {ENCAIXE_POR_EXTENSO[encaixe]}
        </span>
      </span>
      {encaixe === "principal" ? null : (
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            fontSize: miudo ? 8.5 : 9,
            fontWeight: 700,
            letterSpacing: ".04em",
            textTransform: "uppercase",
            padding: "0 4px",
            borderRadius: 2,
            color: encaixe === "secundaria" ? C.warnSoft : C.dangerSoft,
            border: `1px solid ${encaixe === "secundaria" ? "rgba(224,163,58,.45)" : "rgba(212,87,74,.5)"}`,
          }}
        >
          {encaixe === "secundaria" ? "2ª" : "fora"}
        </span>
      )}
    </li>
  );
}

/**
 * Uma rota do ideal: as N vagas com quem ficou nelas. Em espaço largo é uma coluna (cinco
 * lado a lado, a escalação inteira num print); em espaço estreito — o celular, ou o painel
 * numa janela de meia tela — é um cartão com os nomes em duas colunas: cinco cartões de
 * oito nomes numa coluna só passariam de dois mil pixels.
 */
function RotaDoIdeal({
  rota,
  lugares,
  vagas,
  emCartao,
}: Readonly<{ rota: RotaIdeal; lugares: readonly LugarNaRota<JogadorDoQuadro>[]; vagas: number; emCartao: boolean }>) {
  const meta = resolveRole(rota);
  const naSecundaria = lugares.filter((l) => l.encaixe === "secundaria").length;
  const foraDaRota = lugares.filter((l) => l.encaixe === "fora").length;
  const abertas = Math.max(0, vagas - lugares.length);
  const degraus = lugares.map((l) => DEGRAU.get(resolveElo(l.jogador.elo)?.key ?? "") ?? null).filter((d): d is number => d !== null);
  const medio = eloDoDegrau(degraus.length > 0 ? degraus.reduce((s, d) => s + d, 0) / degraus.length : null);
  const detalhe = [
    `${lugares.length - naSecundaria - foraDaRota} na principal`,
    naSecundaria > 0 ? `${naSecundaria} na 2ª` : null,
    foraDaRota > 0 ? `${foraDaRota} fora` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const contador = (
    <span
      style={{
        fontFamily: display,
        fontSize: emCartao ? 15 : 24,
        lineHeight: 1,
        color: lugares.length === vagas ? C.ink : C.dangerSoft,
        ...tabular,
      }}
    >
      {lugares.length}/{vagas}
    </span>
  );

  return (
    <section
      aria-label={`${meta.label}: ${lugares.length} de ${vagas} vagas, ${detalhe}`}
      style={{
        minWidth: 0,
        borderRadius: 5,
        border: `1px solid ${comAlfa(meta.color, 0.32)}`,
        background: `linear-gradient(180deg, ${comAlfa(meta.color, 0.11)}, rgba(0,0,0,.22) 38%)`,
        boxShadow: `inset 0 2px 0 ${comAlfa(meta.color, 0.7)}`,
        padding: emCartao ? "7px 8px 8px" : "14px 10px 12px",
      }}
    >
      {emCartao ? (
        // Cabeçalho numa linha só: no print do telefone cada pixel de altura conta cinco vezes.
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <HexDaRota meta={meta} tamanho={22} />
          <span style={{ fontFamily: display, fontSize: 13, letterSpacing: ".06em", textTransform: "uppercase", color: meta.color }}>
            {meta.label}
          </span>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 10,
              color: C.ink3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              ...tabular,
            }}
          >
            {detalhe}
          </span>
          {contador}
        </div>
      ) : (
        <div style={{ display: "grid", justifyItems: "center", gap: 6, textAlign: "center", marginBottom: 12 }}>
          <HexDaRota meta={meta} tamanho={42} />
          <span style={{ fontFamily: display, fontSize: 15, letterSpacing: ".06em", textTransform: "uppercase", color: meta.color }}>
            {meta.label}
          </span>
          {contador}
          <span style={{ fontSize: 10.5, color: C.ink3, ...tabular }}>{detalhe}</span>
        </div>
      )}

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: emCartao ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)",
          gap: emCartao ? 3 : 5,
        }}
      >
        {lugares.map((lugar, i) => (
          <LinhaDoIdeal key={`${lugar.jogador.nick}-${i}`} lugar={lugar} miudo={emCartao} />
        ))}
        {Array.from({ length: abertas }, (_, i) => (
          <li
            key={`aberta-${i}`}
            style={{
              display: "grid",
              placeItems: "center",
              minHeight: emCartao ? 21 : 32,
              borderRadius: 3,
              border: "1px dashed rgba(212,87,74,.45)",
              color: C.dangerSoft,
              fontSize: 11,
            }}
          >
            vaga aberta
          </li>
        ))}
      </ul>

      {!emCartao && medio ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px 6px",
            marginTop: 10,
            paddingTop: 9,
            borderTop: `1px solid ${C.line}`,
            fontSize: 11,
            color: C.ink3,
          }}
        >
          elo médio <EmblemaMudo elo={medio} tamanho={22} />
          <strong style={{ color: medio.color }}>{medio.label}</strong>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Largura que o miolo do quadro tem de verdade. O painel no monitor vai de 900px (com o
 * trilho lateral) a monitores largos, e o quadro também roda na tela de print: decidir o
 * arranjo pelo modo compacto deixava cinco colunas de ~60px numa janela de meia tela.
 * Sem `ResizeObserver` (jsdom), fica com o arranjo largo.
 */
function useLarguraDe(no: RefObject<HTMLElement | null>): number | null {
  const [largura, setLargura] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = no.current;
    if (!el || typeof ResizeObserver !== "function") return;
    const medir = () => setLargura(el.clientWidth);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [no]);
  return largura;
}

/** Colunas por largura de miolo: 5 lado a lado (≥ 920px), 3 + 2 (≥ 560px) ou cartões. */
function colunasDoIdeal(largura: number | null, compacto: boolean): 5 | 3 | 1 {
  if (compacto) return 1;
  if (largura === null || largura >= 920) return 5;
  return largura >= 560 ? 3 : 1;
}

/**
 * As cinco rotas do ideal e, se houver, quantos não couberam em vaga nenhuma. Os nomes de
 * quem ficaria sem vaga NÃO saem: a simulação não sabe quem a organização marcou como sobra
 * (nem a ordem de inscrição), e um print dizendo o nome errado de quem fica de fora é pior
 * do que só o número.
 */
function CorpoIdeal({ ideal }: Readonly<{ ideal: RotasIdeais<JogadorDoQuadro> }>) {
  const compacto = useCompacto();
  const caixa = useRef<HTMLDivElement>(null);
  const colunas = colunasDoIdeal(useLarguraDe(caixa), compacto);
  const emCartao = colunas === 1;
  return (
    <div ref={caixa}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
          gap: emCartao ? 6 : 10,
        }}
      >
        {ROTAS_IDEAIS.map((rota) => (
          <RotaDoIdeal key={rota} rota={rota} lugares={ideal.porRota[rota]} vagas={ideal.vagasPorRota} emCartao={emCartao} />
        ))}
      </div>

      {ideal.semVaga.length > 0 ? (
        <p style={{ margin: "12px 0 0", fontSize: 12, color: C.ink2, ...tabular }}>
          <strong style={{ color: C.warnSoft }}>
            {ideal.semVaga.length} {ideal.semVaga.length === 1 ? "inscrito fica" : "inscritos ficam"} sem vaga
          </strong>{" "}
          — há mais gente que vagas. Quem fica de fora é decisão da organização.
        </p>
      ) : null}
    </div>
  );
}

/** A moldura com tudo dentro — o que vai para o print. Não tem estado: quem manda é `EloPorRota`. */
function Quadro({
  quadro,
  destaques,
  modo,
  ideal,
  times,
  hoje,
  paraPrint = false,
}: Readonly<{
  quadro: QuadroEloPorRota;
  destaques: DestaquesDoQuadro;
  modo: ModoDoQuadro;
  /** A simulação de N por rota — só no modo `ideal`, e nula enquanto nenhum time fecha. */
  ideal: RotasIdeais<JogadorDoQuadro> | null;
  times: number;
  hoje: string;
  /** Dentro da tela de print: sem nicks nem no `title` (na matriz). */
  paraPrint?: boolean;
}>) {
  const compacto = useCompacto();
  const noIdeal = modo === "ideal";

  // Rótulo do elo · 5 rotas · total (o total sai no celular: não cabe ao lado de cinco).
  const colunasDaGrade = compacto
    ? "34px repeat(5, minmax(0, 1fr))"
    : "minmax(108px, 1.15fr) repeat(5, minmax(0, 1fr)) 64px";
  const vao = compacto ? 5 : 8;
  const linha: CSSProperties = { display: "grid", gridTemplateColumns: colunasDaGrade, gap: vao, alignItems: "center" };
  const maiorTotalDeElo = Math.max(0, ...Object.values(quadro.totalPorElo));
  const contaCobertura = modo === "principal" && times > 0;

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 6,
        border: `1px solid ${C.line2}`,
        background: [
          "radial-gradient(90% 55% at 50% 0%, rgba(201,138,75,.17), transparent 70%)",
          "radial-gradient(55% 45% at 100% 100%, rgba(70,214,200,.07), transparent 70%)",
          "linear-gradient(180deg, #1a130b 0%, #0d0905 100%)",
        ].join(", "),
        boxShadow: "0 18px 40px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.04)",
        padding: compacto ? "22px 12px 16px" : "28px 26px 22px",
      }}
    >
      {/* As cinco cores das rotas no filete de cima: a legenda das colunas antes da leitura. */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${quadro.rotas.map((c) => c.meta.color).join(", ")})`,
        }}
      />
      <Cantos />

      {/* ------------------------------------------------------------ cabeçalho */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "12px 20px",
          marginBottom: compacto ? 18 : 22,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              fontSize: 10,
              letterSpacing: ".24em",
              textTransform: "uppercase",
              color: C.bronze,
            }}
          >
            <span aria-hidden style={{ width: 22, height: 1, background: C.bronze, flexShrink: 0 }} />
            4ª Edição · League of Bronze
          </div>
          {/* No celular o veredito curto divide a linha com o título (e desce se não couber). */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 10px", marginTop: 4 }}>
            {/* Folga em cima e embaixo: o gradiente recortado no texto só pinta dentro da
                caixa, e o til de "DIVISÃO" ficaria sem tinta com a linha apertada. */}
            <h4
              className="gold-text"
              style={{
                fontFamily: display,
                fontSize: compacto ? 27 : 36,
                lineHeight: 1.12,
                letterSpacing: ".01em",
                textTransform: "uppercase",
                margin: 0,
                padding: "0.12em 0 0.06em",
              }}
            >
              {noIdeal && ideal ? `O ideal: ${ideal.vagasPorRota} por rota` : "Divisão de elo por rota"}
            </h4>
            {noIdeal && ideal && compacto ? <VereditoDoIdeal ideal={ideal} curto /> : null}
          </div>
          <p style={{ margin: "2px 0 0", fontSize: 12.5, color: C.ink2, ...tabular }}>
            <strong style={{ color: C.bronzeHi }}>
              {pessoasPorExtenso(noIdeal ? quadro.pessoas + quadro.foraDoQuadro : quadro.pessoas)}
            </strong>
            {noIdeal && ideal && compacto ? ` · ${resumoDoIdeal(ideal)}` : SUBTITULO_DO_MODO[modo](ideal)}
          </p>
        </div>

        {noIdeal && ideal && !compacto ? <VereditoDoIdeal ideal={ideal} /> : null}

        {/* No monitor, o elo médio de todo mundo fecha o cabeçalho; no celular ele custaria
            uma linha inteira de altura, e o print do telefone já é apertado. */}
        {!noIdeal && !compacto && quadro.medioGeral ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 14px 8px 10px",
              borderRadius: 4,
              border: `1px solid ${comAlfa(quadro.medioGeral.color, 0.35)}`,
              background: `linear-gradient(135deg, ${comAlfa(quadro.medioGeral.color, 0.14)}, rgba(0,0,0,.3) 75%)`,
            }}
          >
            <EmblemaMudo elo={quadro.medioGeral} tamanho={46} />
            <span style={{ display: "grid", gap: 3 }}>
              <span style={rotuloMiudo}>Elo médio geral</span>
              <span style={{ fontFamily: display, fontSize: 19, letterSpacing: ".04em", textTransform: "uppercase", color: quadro.medioGeral.color }}>
                {quadro.medioGeral.label}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      {noIdeal ? (
        ideal ? (
          <CorpoIdeal ideal={ideal} />
        ) : (
          <p style={{ margin: 0, padding: "18px 0", fontSize: 13, color: C.ink3, textAlign: "center" }}>
            Nenhum time fecha ainda — o ideal aparece quando houver gente para pelo menos um time.
          </p>
        )
      ) : quadro.pessoas === 0 ? (
        <p style={{ margin: 0, padding: "18px 0", fontSize: 13, color: C.ink3, textAlign: "center" }}>
          {quadro.foraDoQuadro > 0
            ? `${quadro.foraDoQuadro} ${quadro.foraDoQuadro === 1 ? "ficha está" : "fichas estão"} com elo ou rota que a tabela do site não reconhece — corrija na aba Inscritos para o quadro aparecer.`
            : "Ninguém na conta ainda — o quadro aparece com a primeira inscrição que não foi recusada nem desistiu."}
        </p>
      ) : (
        <>
          {/* ------------------------------------------------------------ matriz */}
          <div role="table" aria-label="Divisão de elo por rota" style={{ display: "grid", gap: vao }}>
            {/* Rotas */}
            <div role="row" style={{ ...linha, alignItems: "end", marginBottom: compacto ? 2 : 4 }}>
              <span role="columnheader" style={{ ...rotuloMiudo, paddingBottom: 4 }}>
                Elo
              </span>
              {quadro.rotas.map((c) => {
                const falta = Math.max(0, times - c.principais);
                const cobertura = contaCobertura ? (falta > 0 ? `, falta ${falta} para ${times} times` : `, cobre os ${times} times`) : "";
                return (
                  <span
                    key={c.meta.key}
                    role="columnheader"
                    aria-label={`${c.meta.label}: ${pessoasPorExtenso(c.total)}${cobertura}`}
                    style={{ display: "grid", justifyItems: "center", gap: compacto ? 4 : 6, minWidth: 0, textAlign: "center" }}
                  >
                    <HexDaRota meta={c.meta} tamanho={compacto ? 32 : 46} />
                    <span
                      style={{
                        fontFamily: display,
                        fontSize: compacto ? 12 : 15,
                        letterSpacing: ".06em",
                        textTransform: "uppercase",
                        color: c.meta.color,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {compacto ? c.meta.short : c.meta.label}
                    </span>
                    <span
                      style={{
                        fontFamily: display,
                        fontSize: compacto ? 20 : 30,
                        lineHeight: 1,
                        color: C.ink,
                        ...tabular,
                      }}
                    >
                      {c.total}
                    </span>
                    {/* Espaçamento menor que o dos outros rótulos miúdos: entre 900 e ~920px a
                        coluna fica com ~58px, e "JOGADORES" com .16em encostava no vizinho. */}
                    {compacto ? null : (
                      <span style={{ ...rotuloMiudo, fontSize: 9, letterSpacing: ".06em" }}>
                        {c.total === 1 ? "jogador" : "jogadores"}
                      </span>
                    )}
                    {contaCobertura ? (
                      <span
                        title={`${c.principais} na rota principal · ${times} times precisam de ${times}`}
                        style={{
                          fontSize: compacto ? 9 : 10,
                          letterSpacing: ".08em",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                          padding: compacto ? 0 : "2px 7px",
                          borderRadius: 2,
                          color: falta > 0 ? C.dangerSoft : C.okSoft,
                          border: compacto ? undefined : `1px solid ${falta > 0 ? "rgba(212,87,74,.45)" : "rgba(70,214,200,.35)"}`,
                          background: compacto ? undefined : falta > 0 ? "rgba(212,87,74,.10)" : "rgba(70,214,200,.07)",
                        }}
                      >
                        {falta > 0 ? `falta ${falta}` : "ok"}
                      </span>
                    ) : null}
                  </span>
                );
              })}
              {/* Com a secundária as células somam presenças, e o total segue contando
                  PESSOAS — chamar de "Total" faria 1+1+1+1 = 2 parecer erro de conta. */}
              {compacto ? null : (
                <span
                  role="columnheader"
                  title={modo === "ambas" ? "Pessoas de cada elo, contadas uma vez só" : undefined}
                  style={{ ...rotuloMiudo, textAlign: "center", paddingBottom: 4 }}
                >
                  {modo === "ambas" ? "Pessoas" : "Total"}
                </span>
              )}
            </div>

            {/* A escada: um elo por linha */}
            {quadro.elos.map((elo) => {
              const total = quadro.totalPorElo[elo.key] ?? 0;
              return (
                <div key={elo.key} role="row" style={linha}>
                  <span role="rowheader" style={{ display: "flex", alignItems: "center", justifyContent: compacto ? "center" : undefined, minWidth: 0 }}>
                    {compacto ? <EloComSigla elo={elo} tamanho={26} /> : <Elo elo={elo.label} tamanho={34} mostrarNome />}
                  </span>
                  {quadro.rotas.map((c) => (
                    <Celula
                      key={c.meta.key}
                      quantidade={c.porElo[elo.key] ?? 0}
                      maior={quadro.maiorCelula}
                      rota={c.meta}
                      elo={elo}
                      nicks={c.nicksPorElo[elo.key] ?? []}
                      compacto={compacto}
                      paraPrint={paraPrint}
                    />
                  ))}
                  {compacto ? null : (
                    <span
                      role="cell"
                      aria-label={`${elo.label}, ${modo === "ambas" ? "pessoas" : "total"}: ${total}`}
                      style={{ display: "grid", gap: 5, justifyItems: "center" }}
                    >
                      <span style={{ fontFamily: display, fontSize: 19, lineHeight: 1, color: C.bronzeHi, ...tabular }}>{total}</span>
                      <span aria-hidden style={{ width: "100%", maxWidth: 44, height: 4, borderRadius: 2, background: "rgba(0,0,0,.4)" }}>
                        <span
                          style={{
                            display: "block",
                            height: "100%",
                            width: `${maiorTotalDeElo > 0 ? (total / maiorTotalDeElo) * 100 : 0}%`,
                            borderRadius: 2,
                            background: elo.color,
                          }}
                        />
                      </span>
                    </span>
                  )}
                </div>
              );
            })}

            {/* Elo médio de cada rota */}
            <div
              role="row"
              style={{
                ...linha,
                marginTop: compacto ? 4 : 6,
                paddingTop: compacto ? 10 : 12,
                borderTop: `1px solid ${C.line2}`,
              }}
            >
              <span role="rowheader" style={{ ...rotuloMiudo, fontSize: compacto ? 8 : 9.5, letterSpacing: compacto ? ".08em" : ".16em", color: C.ink3, lineHeight: 1.25 }}>
                Elo médio
              </span>
              {quadro.rotas.map((c) => (
                <span
                  key={c.meta.key}
                  role="cell"
                  aria-label={`${c.meta.label}, elo médio: ${c.medio?.label ?? "sem ninguém"}`}
                  style={{ display: "grid", justifyItems: "center", gap: 4, minWidth: 0 }}
                >
                  {c.medio && compacto ? (
                    <EloComSigla elo={c.medio} tamanho={26} />
                  ) : c.medio ? (
                    <>
                      <Elo elo={c.medio.label} tamanho={36} />
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: c.medio.color, whiteSpace: "nowrap" }}>{c.medio.label}</span>
                    </>
                  ) : (
                    <span style={{ color: C.ink4 }}>–</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* ------------------------------------------------------------ destaques */}
          <div
            style={{
              display: "grid",
              gap: compacto ? 8 : 10,
              gridTemplateColumns: compacto ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(170px, 1fr))",
              marginTop: compacto ? 18 : 22,
            }}
          >
            {destaques.maisDisputada.length > 0 ? (
              <Destaque icone={Flame} rotulo="Mais disputada" cor={destaques.maisDisputada[0].meta.color} detalhe={pessoasPorExtenso(destaques.maisDisputada[0].total)}>
                <NomesDasRotas colunas={destaques.maisDisputada} />
              </Destaque>
            ) : null}
            {destaques.maisEscassa.length > 0 ? (
              <Destaque icone={UserRoundX} rotulo="Mais escassa" cor={destaques.maisEscassa[0].meta.color} detalhe={pessoasPorExtenso(destaques.maisEscassa[0].total)}>
                <NomesDasRotas colunas={destaques.maisEscassa} />
              </Destaque>
            ) : null}
            {destaques.maiorMedia.length > 0 && destaques.maiorMedia[0].medio ? (
              <Destaque
                icone={TrendingUp}
                rotulo="Maior elo médio"
                cor={destaques.maiorMedia[0].meta.color}
                detalhe={
                  // Quebra de linha permitida: num telefone de 320px, "média · Esmeralda"
                  // passava da borda do cartão.
                  <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: "2px 6px" }}>
                    média <EmblemaMudo elo={destaques.maiorMedia[0].medio} tamanho={18} />
                    <span style={{ color: destaques.maiorMedia[0].medio.color, fontWeight: 700 }}>
                      {destaques.maiorMedia[0].medio.label}
                    </span>
                  </span>
                }
              >
                <NomesDasRotas colunas={destaques.maiorMedia} />
              </Destaque>
            ) : null}
            {destaques.topo ? (
              <Destaque
                icone={Crown}
                rotulo="Elo mais alto"
                cor={destaques.topo.elo.color}
                detalhe={`${juntar(destaques.topo.rotas.map((c) => c.meta.label))}`}
              >
                <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: "2px 8px" }}>
                  <EmblemaMudo elo={destaques.topo.elo} tamanho={22} />
                  <span style={{ color: destaques.topo.elo.color }}>
                    {destaques.topo.elo.label} ×{quadro.totalPorElo[destaques.topo.elo.key] ?? 0}
                  </span>
                </span>
              </Destaque>
            ) : null}
          </div>
        </>
      )}

      {/* ------------------------------------------------------------ rodapé */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "6px 16px",
          marginTop: compacto ? 14 : 18,
          paddingTop: 12,
          borderTop: `1px solid ${C.line}`,
        }}
      >
        {noIdeal ? (
          // O ideal precisa dizer que é simulação: no draft a rota não é travada, e um print
          // com nomes por rota sem esse aviso viraria "escalação oficial" no grupo.
          <p style={{ margin: 0, fontSize: compacto ? 10.5 : 11, lineHeight: 1.5, color: C.ink4, maxWidth: 620 }}>
            Simulação: cada um fica na rota principal sempre que dá. Onde falta gente, entra quem
            marcou aquela rota como secundária e, entre os jeitos possíveis, muda de rota sempre o
            mais fraco — o mais forte joga onde prefere. <strong style={{ color: C.warnSoft }}>2ª</strong> = jogando a
            secundária. No draft a rota não é travada — cada capitão escolhe quem quiser.
            {/* No celular a última frase sai: o print do telefone já é o mais apertado. */}
            {compacto ? null : " Conta todo inscrito que ainda pode jogar, pendentes inclusos."}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.55, color: C.ink4, maxWidth: 560 }}>
            Conta todo inscrito que ainda pode jogar — pendentes inclusos, recusados e desistentes
            fora. Elo que vale para o draft: o congelado; sem ele, o verificado (pela Riot ou pela
            organização); sem os dois, o declarado.
            {quadro.foraDoQuadro > 0
              ? ` ${quadro.foraDoQuadro} ${quadro.foraDoQuadro === 1 ? "ficha ficou" : "fichas ficaram"} de fora por elo ou rota não reconhecida.`
              : ""}
          </p>
        )}
        <span style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: C.bronze, whiteSpace: "nowrap", ...tabular }}>
          {SITE_DOMINIO} · {hoje}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- tela de print

/** Margem em volta do quadro na tela de print. */
const MARGEM_DO_PRINT = 10;

/** Faixa de cima reservada ao aviso de como fechar, enquanto ele existe. */
const ALTURA_DO_AVISO = 46;

/**
 * O quadro sozinho na tela, do tamanho que couber — para o print sair inteiro.
 *
 * No celular o quadro passa de 900px de altura e a doca do painel cobre o rodapé: o print
 * da página sairia cortado. Aqui ele ocupa a tela toda (acima da doca e do cabeçalho) e
 * ENCOLHE por `transform: scale` até caber na altura visível. Escala, nunca opacidade: as
 * quatro vezes em que este site apagou foi animando transparência.
 *
 * O aviso de como fechar ganha uma faixa SÓ DELE em cima (o quadro encolhe um pouco mais
 * enquanto ele existe) e some sozinho — desmontado, sem esmaecer —, quando o quadro cresce
 * para a tela inteira. Assim nem um print apressado sai com a pílula por cima do título.
 * Fecha com qualquer toque, clique ou Esc.
 *
 * Girar um celular grande para paisagem (mais de 900px) troca o painel de arranjo e
 * remonta a aba inteira — a tela de print fecha junto. É do painel, não daqui; quem gira
 * abre de novo.
 */
function TelaDePrint({
  onFechar,
  rotulo,
  largo = false,
  children,
}: Readonly<{
  onFechar: () => void;
  /** O que o leitor de tela anuncia: o nome do quadro que está na tela. */
  rotulo: string;
  /** Desenho mais largo no monitor (o ideal: cinco colunas de nomes). */
  largo?: boolean;
  children: ReactNode;
}>) {
  const compacto = useCompacto();
  const dialogo = useRef<HTMLDivElement>(null);
  const caixa = useRef<HTMLDivElement>(null);
  // A largura de desenho do quadro é a do telefone, ou a de um monitor comum; a altura sai
  // do conteúdo e decide a escala.
  const [medida, setMedida] = useState(() => ({ largura: larguraDoPrint(compacto, largo), altura: 0, escala: 1 }));
  const [aviso, setAviso] = useState(true);
  const fechar = useRef(onFechar);
  useEffect(() => {
    fechar.current = onFechar;
  });

  const reserva = aviso ? ALTURA_DO_AVISO : 0;

  useLayoutEffect(() => {
    const medir = () => {
      const largura = larguraDoPrint(compacto, largo);
      const no = caixa.current;
      if (!no) return;
      // `offsetHeight` ignora o `transform`: é a altura de verdade, sem a escala atual. Se a
      // largura mudou, a altura medida ainda é a velha — o observador mede de novo depois.
      const altura = no.offsetHeight;
      const escala = Math.min(
        1,
        (window.innerHeight - reserva - MARGEM_DO_PRINT * 2) / Math.max(1, altura),
        (window.innerWidth - MARGEM_DO_PRINT * 2) / Math.max(1, largura),
      );
      setMedida((antes) =>
        antes.largura === largura && antes.altura === altura && antes.escala === escala ? antes : { largura, altura, escala },
      );
    };
    medir();
    const observador = typeof ResizeObserver === "function" ? new ResizeObserver(medir) : null;
    if (caixa.current) observador?.observe(caixa.current);
    window.addEventListener("resize", medir);
    return () => {
      observador?.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [compacto, largo, reserva]);

  useEffect(() => {
    // O mesmo cuidado da `Folha`: o foco entra no diálogo (senão o Tab seguiria pelos
    // botões escondidos atrás dele, e um Enter às cegas gravaria algo) e volta para quem
    // abriu quando fecha.
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogo.current?.focus();
    const rolagemAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") fechar.current();
      // Não há nada focável aqui dentro: o Tab fica parado no próprio diálogo.
      else if (evento.key === "Tab") evento.preventDefault();
    };
    window.addEventListener("keydown", aoTeclar);
    const relogio = window.setTimeout(() => setAviso(false), 2600);
    return () => {
      document.body.style.overflow = rolagemAntes;
      window.removeEventListener("keydown", aoTeclar);
      window.clearTimeout(relogio);
      if (anterior && document.contains(anterior)) anterior.focus();
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialogo}
      role="dialog"
      aria-modal="true"
      aria-label={`${rotulo}, em tela cheia para print`}
      aria-describedby={aviso ? "elo-por-rota-aviso" : undefined}
      tabIndex={-1}
      onClick={() => fechar.current()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        boxSizing: "border-box",
        paddingTop: reserva,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        outline: "none",
        cursor: "zoom-out",
        background: "radial-gradient(80% 60% at 50% 0%, rgba(201,138,75,.14), transparent 70%), #0b0804",
      }}
    >
      {/* O invólucro tem o tamanho JÁ ENCOLHIDO: sem ele o quadro escalado continuaria
          ocupando a altura cheia no layout e sairia do centro. */}
      <div style={{ width: medida.largura * medida.escala, height: medida.altura * medida.escala }}>
        <div ref={caixa} style={{ width: medida.largura, transform: `scale(${medida.escala})`, transformOrigin: "0 0" }}>
          {children}
        </div>
      </div>

      {aviso ? (
        <span
          id="elo-por-rota-aviso"
          role="status"
          style={{
            position: "absolute",
            top: 8,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "7px 14px",
            borderRadius: 999,
            border: `1px solid ${C.line2}`,
            background: "rgba(11,8,4,.92)",
            color: C.ink2,
            fontSize: 12,
            whiteSpace: "nowrap",
            boxShadow: "0 8px 20px rgba(0,0,0,.5)",
          }}
        >
          {compacto ? "Toque em qualquer lugar para fechar" : "Clique ou Esc para fechar"}
        </span>
      ) : null}
    </div>,
    document.body,
  );
}

/**
 * Largura de desenho do print. O ideal (`largo`) ganha até 1280 no monitor: em 1040 as
 * cinco colunas deixavam ~90px para o nick, e um "samuelvenancio" com a marca 2ª saía com
 * reticências — no print não há como recuperar o nome cortado.
 */
function larguraDoPrint(compacto: boolean, largo = false): number {
  const teto = compacto ? 440 : largo ? 1280 : 1040;
  if (typeof window === "undefined") return compacto ? 375 : teto;
  return Math.min(window.innerWidth - MARGEM_DO_PRINT * 2, teto);
}

// ---------------------------------------------------------------- bloco da aba

export function EloPorRota({
  jogadores,
  times,
}: Readonly<{
  jogadores: readonly JogadorDoQuadro[];
  /** Times que fecham hoje (`panorama.times`) — quantos titulares cada rota precisa. */
  times: number;
}>) {
  const compacto = useCompacto();
  const [modo, setModo] = useState<ModoDoQuadro>("principal");
  const [paraPrint, setParaPrint] = useState(false);
  // No ideal a matriz não aparece, mas o cabeçalho ainda conta as pessoas por ela.
  const modoDaMatriz: ModoDasRotas = modo === "ideal" ? "principal" : modo;
  const quadro = useMemo(() => montarEloPorRota(jogadores, modoDaMatriz), [jogadores, modoDaMatriz]);
  const destaques = useMemo(() => destaquesDoQuadro(quadro), [quadro]);
  // Ordem fixa (elo, depois nick) antes da simulação: o empate total cai na ordem de
  // entrada, e o mesmo pool tem de dar o mesmo print em qualquer recarga.
  const ideal = useMemo(() => {
    if (modo !== "ideal" || times <= 0) return null;
    const degrauDe = (j: JogadorDoQuadro) => DEGRAU.get(resolveElo(j.elo)?.key ?? "") ?? -1;
    const ordenados = [...jogadores].sort((a, b) => degrauDe(b) - degrauDe(a) || a.nick.localeCompare(b.nick, "pt-BR"));
    return montarRotasIdeais(ordenados, times);
  }, [jogadores, modo, times]);
  // O print circula dias depois: a data diz de quando é o retrato.
  const [hoje] = useState(() =>
    new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }),
  );

  const props = { quadro, destaques, modo, ideal, times, hoje };
  const semNada = modo === "ideal" ? ideal === null : quadro.pessoas === 0;

  // Rótulo de mesa e de bolso. Os quatro por extenso somam ~500px: no telefone o do ideal
  // ficava inteiro fora da tela, numa fileira sem barra de rolagem à vista. O nome por
  // extenso continua sendo o nome acessível nos dois arranjos.
  const opcoes: ReadonlyArray<{ modo: ModoDoQuadro; longo: string; curto: string }> = [
    { modo: "principal", longo: "Rota principal", curto: "Principal" },
    { modo: "secundaria", longo: "Só secundária", curto: "Secundária" },
    { modo: "ambas", longo: "Principal + secundária", curto: "As duas" },
    {
      modo: "ideal",
      longo: times > 0 ? `Ideal: ${times} por rota` : "Ideal por rota",
      curto: times > 0 ? `Ideal: ${times}` : "Ideal",
    },
  ];
  const chips = opcoes.map((o) => (
    <ChipFiltro
      key={o.modo}
      ativo={modo === o.modo}
      onClick={() => setModo(o.modo)}
      rotulo={o.longo}
      disabled={o.modo === "ideal" && times <= 0}
      title={
        o.modo !== "ideal"
          ? o.longo
          : times <= 0
            ? "Nenhum time fecha ainda."
            : `Simula ${times} jogadores em cada rota, só com a principal e a secundária.`
      }
    >
      {compacto ? o.curto : o.longo}
    </ChipFiltro>
  ));

  return (
    <div>
      {/* Os controles ficam FORA da moldura: o modo já vai escrito no subtítulo do quadro,
          e o print sai sem botão no meio. */}
      <Toolbar
        style={{ marginBottom: 10 }}
        right={
          <Button small tone="gold" disabled={semNada} onClick={() => setParaPrint(true)}>
            <Maximize2 size={14} aria-hidden />
            Abrir para print
          </Button>
        }
      >
        {compacto ? (
          // No celular a fileira QUEBRA em vez de rolar: as quatro opções sempre à vista.
          <div role="group" aria-label="O que mostrar" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {chips}
          </div>
        ) : (
          <RolagemX rotulo="O que mostrar">{chips}</RolagemX>
        )}
      </Toolbar>

      <Quadro {...props} />

      {paraPrint ? (
        <TelaDePrint
          onFechar={() => setParaPrint(false)}
          rotulo={modo === "ideal" && ideal ? `O ideal: ${ideal.vagasPorRota} por rota` : "Divisão de elo por rota"}
          largo={modo === "ideal"}
        >
          <Quadro {...props} paraPrint />
        </TelaDePrint>
      ) : null}
    </div>
  );
}
