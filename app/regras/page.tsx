import type { Metadata } from "next";
import {
  ArrowLeftRight,
  BadgeCheck,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Camera,
  ClipboardPen,
  Coins,
  Crown,
  Dices,
  FileCheck,
  FilePen,
  Flag,
  Gamepad2,
  Gavel,
  Handshake,
  Headphones,
  Hourglass,
  IdCard,
  Link2,
  ListOrdered,
  Medal,
  MousePointerClick,
  Repeat,
  Scale,
  ScrollText,
  Shuffle,
  SunMoon,
  Swords,
  Target,
  Timer,
  Trophy,
  // Ícone de marca, marcado como obsoleto no lucide (sai na v1.0; o projeto está preso
  // na 0.x). Fica porque o texto diz "Twitch" com todas as letras — se um dia sumir, o
  // tsc acusa aqui e a troca é por MonitorPlay.
  Twitch,
  UserCheck,
  UserX,
  UsersRound,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { Fragment, type ComponentProps, type CSSProperties, type ReactNode } from "react";

import { CalendarioDa4a } from "@/components/calendario-4a";
import { IconeCarta, IconeCartas, SeloHex, type Icone, type PropsDoIcone } from "@/components/lob/icones";
import { EloCrest, Eyebrow, GoldTitle, RoleIcon, SectionTitle } from "@/components/lob/ui";
import { CARTAS_ATIVAS, type CardDef } from "@/lib/cards";
import { metadadosDaPagina } from "@/lib/i18n/metadados";
import { getMessages } from "@/lib/i18n/server";
import { lerConfigOuNulo } from "@/lib/inscricoes/store";
import type { CardId } from "@/lib/schema";

/**
 * Renderização por requisição — OBRIGATÓRIO, não é preferência.
 *
 * A CSP do site usa nonce (ver proxy.ts), e o nonce é gerado a cada requisição. Uma
 * página estática é pré-renderizada no build, quando o nonce ainda não existe: os
 * <script> saem sem nonce, a CSP bloqueia TODO o JavaScript e o React nunca troca o
 * bloco de Suspense pelo conteúdo — a página fica em branco. Foi exatamente o que
 * aconteceu aqui em produção. Toda página deste app precisa ser dinâmica enquanto a
 * CSP for baseada em nonce.
 */
export const dynamic = "force-dynamic";

/** Título e descrição próprios, no idioma da visita (lib/i18n/messages/metadados.ts). */
export async function generateMetadata(): Promise<Metadata> {
  return metadadosDaPagina("regras", "/regras");
}

/**
 * /regras — regulamento da 4ª Edição (4º Campeonato dos Bronzes).
 *
 * Segue as 7 seções do PDF oficial, na mesma ordem, mais a seção de Premiação, que
 * nasceu das decisões da organização de 05/10/2026. Onde o PDF e essas decisões
 * divergem, vale a decisão (o PDF será atualizado depois). As decisões de 22/10/2026
 * entraram no texto das regras que já existiam (4, 6, 8, 19 e 22, o draft e as reservas),
 * sem numeração nova: a inscrição e o painel linkam /regras#regra-N.
 *
 * Dois números NÃO estão escritos no texto: a taxa de inscrição e a fatia do campeão.
 * Os dois vêm da Configuração da edição (`edicao_config`), a mesma que o formulário de
 * inscrição e o caixa usam — publicar aqui um valor digitado à mão é como a página e o
 * caixa começam a discordar. Sem configuração (banco fora do ar, ambiente sem chave), a
 * página continua de pé e o texto sai sem os números.
 *
 * Identidade: nenhum losango genérico. Cada título, ficha, item e regra leva o desenho do
 * que trata, dentro do selo hexagonal de bronze (components/lob/icones.tsx) — o mesmo do
 * painel. Elo é o emblema oficial, rota é o ícone oficial de posição. Tudo aqui continua
 * Server Component, sem estado: o que se adapta ao celular são as grades `auto-fill` com
 * `min(100%, …)`, que viram uma coluna só em 360px sem estourar a largura.
 */

const TWITCH = [
  { canal: "n4kay", href: "https://www.twitch.tv/n4kay" },
  { canal: "thalissonvieira", href: "https://www.twitch.tv/thalissonvieira" },
] as const;

const ESTILO_LINK: CSSProperties = {
  color: "#e6c592",
  textDecoration: "underline",
  textDecorationColor: "rgba(230,197,146,.45)",
  textUnderlineOffset: 3,
};

/** Respiro para a âncora (/regras#regra-17) não parar embaixo do cabeçalho fixo. */
const MARGEM_ANCORA = 92;

const TEXTO: CSSProperties = { margin: 0, fontSize: 14, lineHeight: 1.65, color: "#b3a690" };

type TomDoSelo = NonNullable<ComponentProps<typeof SeloHex>["tom"]>;

/** Cor do desenho solto (fora do selo) em cada tom — a mesma do glifo dentro do selo. */
const COR_DO_TOM: Record<TomDoSelo, string> = { bronze: "#e6c592", ouro: "#ffd98a", teal: "#7fe6db" };

// ---------------------------------------------------------------- seções

type IdDaSecao =
  | "visao-geral"
  | "inscricao"
  | "formacao"
  | "regras-gerais"
  | "cartinhas"
  | "pontuacao"
  | "premiacao"
  | "calendario";

/**
 * O desenho de cada seção — o mesmo no título e no atalho do sumário, num lugar só para
 * os dois nunca divergirem. O id é a âncora que a inscrição e o painel linkam: não mude.
 * Premiação é o único selo em ouro: é o que o campeão leva.
 */
const SECOES: Record<IdDaSecao, { icone: Icone; tom?: TomDoSelo }> = {
  "visao-geral": { icone: ScrollText },
  inscricao: { icone: ClipboardPen },
  formacao: { icone: UsersRound },
  "regras-gerais": { icone: Gavel },
  cartinhas: { icone: IconeCarta },
  pontuacao: { icone: Medal },
  premiacao: { icone: Trophy, tom: "ouro" },
  calendario: { icone: CalendarDays },
};

// ---------------------------------------------------------------- desenhos que não são do lucide

/**
 * A rota no formato de ícone de selo: o ícone oficial de posição (máscara tingível), que é
 * o que "rota" significa para quem joga — uma estrada do lucide diria outra coisa. Aceita
 * as props de um ícone para o SeloHex tingir e posicionar como faz com os outros.
 */
function IconeDaRota({ size = 24, color = "currentColor", style }: PropsDoIcone) {
  const lado = typeof size === "number" ? size : 24;
  return (
    <span aria-hidden style={{ ...style, display: "inline-flex" }}>
      <RoleIcon role="MID" size={Math.round(lado * 1.15)} color={color} />
    </span>
  );
}

/**
 * Emblema oficial de um elo no lugar do selo, do mesmo tamanho dele. Não vai DENTRO do
 * hexágono: lá ele sairia com 13px, ilegível — o emblema já é uma moldura por si.
 *
 * aria-hidden: é ilustração. O texto do item já diz "elo"; o nome do emblema de exemplo
 * ("Esmeralda") lido antes dele só confundiria quem usa leitor de tela.
 */
function EmblemaDoElo({ elo, tamanho }: Readonly<{ elo: string; tamanho: number }>) {
  return (
    <span
      aria-hidden
      style={{
        width: tamanho,
        height: Math.round(tamanho * 0.866),
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <EloCrest elo={elo} size={tamanho + 6} title={false} />
    </span>
  );
}

/** Mesmo recorte do SeloHex (components/lob/icones.tsx): hexágono de topo reto. */
const HEXAGONO = "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)";

/**
 * Selo hexagonal com número ou letra — o passo do draft e a letra da cartinha.
 *
 * Peça local: o SeloHex só aceita desenho, e aqui o conteúdo é texto. Repete a moldura de
 * bronze dele (borda em degradê, fundo escuro com brilho no topo) para os dois parecerem a
 * mesma família lado a lado.
 *
 * Não é aria-hidden: as listas usam `list-style: none`, e sem marcador o leitor de tela
 * perderia o número — que é justamente como o regulamento é citado.
 */
function SeloLetra({ children, tamanho = 28 }: Readonly<{ children: ReactNode; tamanho?: number }>) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-grid",
        placeItems: "center",
        width: tamanho,
        height: Math.round(tamanho * 0.866),
        flexShrink: 0,
        filter: "drop-shadow(0 3px 8px rgba(0,0,0,.55))",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          clipPath: HEXAGONO,
          background: "linear-gradient(160deg,#f6d6a2 0%,#c98a4b 45%,#6e4520 100%)",
        }}
      />
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: tamanho >= 40 ? 2 : 1.6,
          clipPath: HEXAGONO,
          background:
            "radial-gradient(120% 70% at 50% 0%,rgba(240,200,138,.20),transparent 60%),linear-gradient(180deg,#22180d 0%,#120c06 100%)",
        }}
      />
      <span
        style={{
          position: "relative",
          fontFamily: "var(--font-display)",
          fontSize: Math.round(tamanho * 0.46),
          lineHeight: 1,
          color: "#f0c88a",
        }}
      >
        {children}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------- utilidades de texto

/**
 * Troca os marcadores `{nome}` de um texto traduzido por nós React (links, valores).
 * Marcador sem troca correspondente fica como está, para o erro aparecer na tela em vez
 * de sumir em silêncio.
 */
function interpolar(texto: string, trocas: Record<string, ReactNode>): ReactNode[] {
  return texto.split(/(\{\w+\})/).map((parte, i) => {
    const nome = /^\{(\w+)\}$/.exec(parte)?.[1];
    return nome !== undefined && nome in trocas ? <Fragment key={i}>{trocas[nome]}</Fragment> : parte;
  });
}

function formatarMoeda(centavos: number, localeTag: string) {
  return new Intl.NumberFormat(localeTag, { style: "currency", currency: "BRL" }).format(centavos / 100);
}

function formatarPercentual(valor: number, localeTag: string) {
  return new Intl.NumberFormat(localeTag, { style: "percent", maximumFractionDigits: 1 }).format(valor / 100);
}

// ---------------------------------------------------------------- blocos da página

function Secao({ id, titulo, children }: Readonly<{ id: IdDaSecao; titulo: string; children: ReactNode }>) {
  const { icone, tom } = SECOES[id];
  return (
    <section id={id} className="lob-fade" style={{ marginTop: 46, scrollMarginTop: MARGEM_ANCORA }}>
      <div style={{ marginBottom: 14 }}>
        <SectionTitle size={23} icone={icone} tom={tom}>
          {titulo}
        </SectionTitle>
      </div>
      {children}
    </section>
  );
}

/** Tamanho do selo dos itens de lista: o hexágono (24px de altura) acompanha a 1ª linha. */
const SELO_DO_ITEM = 28;

/**
 * Item de lista: o texto e o que o marca — um desenho (vai no selo) ou uma marca pronta
 * (o emblema do elo, que é moldura por si).
 */
type ItemMarcado = { texto: ReactNode } & ({ icone: Icone } | { marca: ReactNode });

/**
 * Lista com o desenho de cada item no lugar do bullet: quem bate o olho acha "o elo", "a
 * disponibilidade", "o sorteio" sem ler a lista inteira.
 */
function Marcadores({ itens }: Readonly<{ itens: ItemMarcado[] }>) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      {itens.map((item, i) => (
        <li
          key={i}
          style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 13.5, lineHeight: 1.55, color: "#b3a690" }}
        >
          {"icone" in item ? <SeloHex icone={item.icone} tamanho={SELO_DO_ITEM} /> : item.marca}
          {/* 13,5px × 1,55 ≈ 21px de linha contra 24px de selo: 2px em cima alinham os dois. */}
          <span style={{ minWidth: 0, paddingTop: 2 }}>{item.texto}</span>
        </li>
      ))}
    </ul>
  );
}

function Rotulo({
  children,
  cor = "#c98a4b",
  icone: Desenho,
}: Readonly<{ children: ReactNode; cor?: string; icone?: Icone }>) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 8px" }}>
      {Desenho ? <Desenho size={16} color={cor} aria-hidden style={{ flexShrink: 0 }} /> : null}
      <span style={{ fontSize: 11, letterSpacing: ".14em", color: cor }}>{children}</span>
      <div style={{ height: 1, flex: 1, minWidth: 24, background: `linear-gradient(90deg,${cor}59,transparent)` }} />
    </div>
  );
}

// ---------------------------------------------------------------- página

export default async function RegrasPage() {
  const [mensagens, config] = await Promise.all([getMessages(), lerConfigOuNulo()]);
  const { paginasRegras: t, paginasStats: ts, conformidade: conf, compartilhados: tc, calendario4a: tCal } = mensagens;

  // ---------------------------------------------------------- números da configuração
  const taxa =
    config && Number.isFinite(config.taxa_centavos) ? formatarMoeda(config.taxa_centavos, tc.localeTag) : null;
  const pct = config?.pct_campeao;
  const premio =
    typeof pct === "number" && Number.isFinite(pct) && pct >= 0 && pct <= 100
      ? { campeao: formatarPercentual(pct, tc.localeTag), vice: formatarPercentual(100 - pct, tc.localeTag) }
      : null;

  // ---------------------------------------------------------- links reaproveitados
  const linkInscricao = (
    <Link href="/inscricao" style={ESTILO_LINK}>
      {t.fichaInscricaoLink}
    </Link>
  );
  const linkRegra = (n: number, rotulo: ReactNode = n) => (
    <a href={`#regra-${n}`} style={ESTILO_LINK}>
      {rotulo}
    </a>
  );
  const [canal1, canal2] = TWITCH.map((c) => (
    <a key={c.canal} href={c.href} target="_blank" rel="noreferrer" style={ESTILO_LINK}>
      {c.canal}
    </a>
  ));

  const SUMARIO: { id: IdDaSecao; rotulo: string }[] = [
    { id: "visao-geral", rotulo: t.visaoGeralTitulo },
    { id: "inscricao", rotulo: t.inscricaoTitulo },
    { id: "formacao", rotulo: t.formacaoTitulo },
    { id: "regras-gerais", rotulo: t.regrasGeraisTitulo },
    { id: "cartinhas", rotulo: t.cartasTitulo },
    { id: "pontuacao", rotulo: t.pontuacaoTitulo },
    { id: "premiacao", rotulo: t.premiacaoTitulo },
    { id: "calendario", rotulo: t.calendarioTitulo },
  ];

  // A final é o único selo em ouro da ficha, como a Premiação entre as seções.
  const FICHA: { k: string; v: ReactNode; icone: Icone; tom?: TomDoSelo }[] = [
    { k: t.fichaModalidadeK, v: t.fichaModalidadeV, icone: Gamepad2 },
    { k: t.fichaPeriodoK, v: t.fichaPeriodoV, icone: CalendarRange },
    { k: t.fichaFaseK, v: t.fichaFaseV, icone: Swords },
    { k: t.fichaSemifinaisK, v: t.fichaSemifinaisV, icone: Medal },
    { k: t.fichaFinalK, v: t.fichaFinalV, icone: Trophy, tom: "ouro" },
    { k: t.fichaInscricaoK, v: interpolar(t.fichaInscricaoV, { link: linkInscricao }), icone: ClipboardPen },
    { k: t.fichaTransmissaoK, v: interpolar(t.fichaTransmissaoV, { canal1, canal2 }), icone: Twitch },
    {
      k: t.fichaValorK,
      icone: Coins,
      v: taxa ? (
        <b className="lob-display" style={{ fontSize: 20, fontWeight: 400, color: "#e6c592" }}>
          {taxa}
        </b>
      ) : (
        interpolar(t.fichaValorSemConfig, { link: linkInscricao })
      ),
    },
  ];

  // Na ordem do formulário. O elo é o emblema oficial (Esmeralda de exemplo) e a rota é o
  // ícone oficial de posição: são os símbolos que o jogador já reconhece do jogo.
  const CAMPOS: ItemMarcado[] = [
    { texto: t.inscricaoCampo1, icone: IdCard },
    { texto: t.inscricaoCampo2, icone: Gamepad2 },
    { texto: t.inscricaoCampo3, marca: <EmblemaDoElo elo="ESMERALDA" tamanho={SELO_DO_ITEM} /> },
    { texto: t.inscricaoCampo4, icone: IconeDaRota },
    { texto: t.inscricaoCampo5, icone: SunMoon },
    { texto: t.inscricaoCampo6, icone: FileCheck },
  ];

  // Desde 23/10/2026 os capitães são definidos pela organização (o selo de "conferido") e não
  // têm preço (as moedas do orçamento). A coroa fica só no título do cartão — repetida no item
  // de cima não diria nada de novo.
  const CAPITAES: ItemMarcado[] = [
    { texto: t.capitaes1, icone: BadgeCheck },
    { texto: t.capitaes2, icone: Coins },
    { texto: t.capitaes3, icone: UsersRound },
    { texto: t.capitaes4, icone: Dices },
    { texto: t.capitaes5, icone: Gamepad2 },
  ];

  const DRAFT = [t.draft1, t.draft2, t.draft3, t.draft4, t.draft5, t.draft6];

  // A ordem é o número da regra: o índice + 1 vira o id "regra-N" que a inscrição linka.
  // Ao lado, o desenho do que cada regra trata.
  const REGRAS: [string, Icone][] = [
    [t.regra1, UsersRound], //      quem pode jogar: o grupo
    [t.regra2, Crown], //           capitães montam o time
    [t.regra3, Swords], //          MD5 da solo/duo feita
    [t.regra4, CalendarClock], //   5 partidas nos 10 dias antes
    [t.regra5, UserX], //           smurf não
    [t.regra6, Repeat], //          substituições
    [t.regra7, Timer], //           tolerância de 10 minutos
    [t.regra8, Flag], //            W.O.
    [t.regra9, CalendarCheck], //   calendário definitivo
    [t.regra10, ArrowLeftRight], // troca de lane
    [t.regra11, UserCheck], //      check-in
    [t.regra12, BadgeCheck], //     conta verificada
    [t.regra13, Dices], //          lado por sorteio
    [t.regra14, Handshake], //      fair play
    [t.regra15, WifiOff], //        queda de conexão
    [t.regra16, Camera], //         print do resultado
    [t.regra17, Twitch], //         transmissão
    [t.regra18, FilePen], //        alteração de regras
    [t.regra19, Scale], //          desempate
    [t.regra20, Headphones], //     voz obrigatória
    [t.regra21, Link2], //          Riot vinculada ao Discord
    [t.regra22, Coins], //          pagamento
  ];
  const trocasDasRegras = {
    secao: (
      <a href="#formacao" style={ESTILO_LINK}>
        {t.regra2Link}
      </a>
    ),
  };

  const CARTAS_GERAIS: ItemMarcado[] = [
    { texto: t.cartasRegra1, icone: IconeCarta },
    { texto: t.cartasRegra2, icone: MousePointerClick },
    { texto: t.cartasRegra3, icone: Gavel },
  ];

  // Efeito de cada carta no texto do regulamento da 4ª. Carta nova sem texto aqui cai na
  // descrição da vitrine (/cartas), e só depois na do lib.
  const EFEITOS: Partial<Record<CardId, string>> = {
    ABCDRAFT: t.efeitoAbcdraft,
    DRAFT_SABOTADO: t.efeitoDraftSabotado,
    INTER_CLASSE: t.efeitoInterClasse,
    INVERSAO_ROTAS: t.efeitoInversaoRotas,
    TUDO_LIBERADO: t.efeitoTudoLiberado,
    AMIGOS_NATUREZA: t.efeitoAmigosNatureza,
    DRAFT_INVERTIDO: t.efeitoDraftInvertido,
  };
  const textoDaCarta = (c: CardDef) => ({
    nome: ts.cartas[c.cardId]?.nome ?? c.title,
    efeito: EFEITOS[c.cardId] ?? ts.cartas[c.cardId]?.descricao ?? c.description,
  });
  // Letras de EXIBIÇÃO, recalculadas sobre as cartas em vigor (A–E na 4ª). O campo
  // `letter` do lib é o da 3ª e continua valendo no histórico e no sorteio.
  const individuais = CARTAS_ATIVAS.filter((c) => !c.dupla).map((c, i) => ({
    carta: c,
    letra: String.fromCharCode(65 + i),
  }));
  const duplas = CARTAS_ATIVAS.filter((c) => c.dupla);

  const PONTUACAO: ItemMarcado[] = [
    { k: t.pontuacaoFaseK, v: t.pontuacaoFaseV, icone: Swords },
    {
      k: t.pontuacaoDesempateK,
      v: interpolar(t.pontuacaoDesempateV, { regra: linkRegra(19, t.pontuacaoDesempateLink) }),
      icone: Scale,
    },
    { k: t.pontuacaoSemisK, v: t.pontuacaoSemisV, icone: Medal },
    { k: t.pontuacaoFinalK, v: t.pontuacaoFinalV, icone: Trophy },
    { k: t.pontuacaoSeriesK, v: t.pontuacaoSeriesV, icone: Target },
  ].map(({ k, v, icone }) => ({
    icone,
    texto: (
      <>
        <b style={{ color: "#e2d6c0" }}>{k}</b> {v}
      </>
    ),
  }));

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 24px" }}>
        <Eyebrow>{t.regrasSobretitulo}</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(48px,11vw,128px)", lineHeight: 0.88 }}>{t.regrasTitulo}</GoldTitle>
        <p style={{ maxWidth: 640, fontSize: 16, lineHeight: 1.55, color: "#a99e8b", margin: 0 }}>
          {t.regrasSubtitulo}
        </p>
      </section>

      {/*
        Atalhos para as seções: o regulamento é longo e é lido aos pedaços. Cada atalho leva
        o desenho do título da seção, para quem desce a página reconhecer onde chegou. 40px
        de altura: no celular é alvo de dedo, não de mouse.
      */}
      <nav aria-label={t.sumarioRotulo} className="lob-fade" style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: "#8f8472", textTransform: "uppercase", marginBottom: 8 }}>
          {t.sumarioRotulo}
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SUMARIO.map((s) => {
            const { icone: Desenho, tom = "bronze" } = SECOES[s.id];
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="lob-pill"
                  style={{ textDecoration: "none", minHeight: 40, padding: "0 14px" }}
                >
                  <Desenho size={15} color={COR_DO_TOM[tom]} aria-hidden style={{ flexShrink: 0 }} />
                  {s.rotulo}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/*
        O formato NÃO é fixo: muda a cada edição, decidido com o grupo. Isso precisa vir antes
        da ficha, senão a página parece descrever um regulamento permanente. Também é a
        resposta ao critério de "condições de vitória justas e transparentes": o que garante a
        transparência não é o formato ser imutável, e sim ser publicado por completo antes da
        primeira partida e valer igual para todos.
      */}
      <section className="lob-fade" style={{ marginTop: 22 }}>
        <div
          style={{
            padding: "18px 20px",
            background: "rgba(201,138,75,.06)",
            border: "1px solid rgba(201,138,75,.18)",
            borderRadius: 4,
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <SectionTitle size={17} icone={Shuffle}>
              {conf.formatoVariaTitulo}
            </SectionTitle>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "#b3a690" }}>
            {conf.formatoVariaTexto}
          </p>
          <p style={{ margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.65, color: "#b3a690" }}>
            {conf.formatoVariaExemplos}
          </p>
          <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.6, color: "#8f8472" }}>
            {conf.formatoVariaGarantia}
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- 1. VISÃO GERAL */}
      <Secao id="visao-geral" titulo={t.visaoGeralTitulo}>
        <p style={{ ...TEXTO, maxWidth: 820, marginBottom: 14 }}>{t.visaoGeralIntro}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,240px),1fr))", gap: 12 }}>
          {FICHA.map((f) => (
            <div
              key={f.k}
              className="lob-card-2"
              style={{ display: "flex", alignItems: "flex-start", gap: 13, padding: "15px 16px" }}
            >
              <SeloHex icone={f.icone} tom={f.tom} tamanho={36} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10.5, letterSpacing: ".12em", color: "#c98a4b", marginBottom: 7 }}>{f.k}</div>
                <div style={{ fontSize: 14, color: "#e9dfcd", lineHeight: 1.45 }}>{f.v}</div>
              </div>
            </div>
          ))}
        </div>
      </Secao>

      {/* ---------------------------------------------------------- 2. INSCRIÇÃO */}
      <Secao id="inscricao" titulo={t.inscricaoTitulo}>
        <p style={{ ...TEXTO, maxWidth: 820 }}>
          {interpolar(t.inscricaoIntro, {
            r1: linkRegra(1),
            r3: linkRegra(3),
            r4: linkRegra(4),
            r5: linkRegra(5),
            r21: linkRegra(21),
          })}
        </p>
        <div className="lob-card-2" style={{ padding: 20, marginTop: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: ".14em", color: "#c98a4b", marginBottom: 14 }}>
            {t.inscricaoCamposTitulo}
          </div>
          <Marcadores itens={CAMPOS} />
          <p style={{ margin: "16px 0 0", paddingTop: 14, borderTop: "1px solid rgba(201,138,75,.14)", fontSize: 13, lineHeight: 1.6, color: "#8f8472" }}>
            {t.inscricaoNota}
          </p>
        </div>
        {/*
          Fila de reserva (decisão de 22/10/2026): titulares por ordem de inscrição, com os
          organizadores dentro; o reserva só paga se for chamado. Os números das regras viram
          link, como na introdução acima.
        */}
        <p style={{ ...TEXTO, maxWidth: 820, marginTop: 14 }}>
          <b style={{ color: "#e6c592" }}>{t.inscricaoReservasRotulo}</b>{" "}
          {interpolar(t.inscricaoReservasTexto, { r6: linkRegra(6), r22: linkRegra(22) })}
        </p>
      </Secao>

      {/* ---------------------------------------------------------- 3. FORMAÇÃO DOS TIMES */}
      <Secao id="formacao" titulo={t.formacaoTitulo}>
        <p style={{ ...TEXTO, maxWidth: 820, marginBottom: 16 }}>{t.formacaoIntro}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 16, alignItems: "start" }}>
          <div className="lob-card-2" style={{ padding: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <SectionTitle size={18} icone={Crown}>
                {t.capitaesTitulo}
              </SectionTitle>
            </div>
            <Marcadores itens={CAPITAES} />
          </div>
          <div className="lob-card-2" style={{ padding: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <SectionTitle size={18} icone={ListOrdered}>
                {t.draftTitulo}
              </SectionTitle>
            </div>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {DRAFT.map((item, i) => (
                <li
                  key={item}
                  style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 13.5, lineHeight: 1.55, color: "#b3a690" }}
                >
                  <SeloLetra tamanho={SELO_DO_ITEM}>{i + 1}</SeloLetra>
                  <span style={{ minWidth: 0, paddingTop: 2 }}>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/*
          No lugar da grade "Valores por elo" da 3ª: a tabela da 4ª só existe depois que a
          lista de inscritos fechar. Publicar os pontos antigos aqui faria parecer que eles
          valem para esta edição. A ampulheta diz "ainda vai sair" antes de a pessoa ler.
        */}
        <div
          role="note"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            marginTop: 16,
            padding: "16px 20px",
            background: "rgba(201,138,75,.06)",
            border: "1px solid rgba(201,138,75,.18)",
            borderRadius: 4,
          }}
        >
          <SeloHex icone={Hourglass} tamanho={32} />
          <div style={{ minWidth: 0 }}>
            <p style={{ ...TEXTO, fontSize: 13.5 }}>
              <b style={{ color: "#e6c592" }}>{t.tabelaValoresRotulo}</b> {t.tabelaValoresTexto}
            </p>
            {/* Deixa explícito que isto é moeda de draft, não ranqueamento alternativo. */}
            <p style={{ margin: "10px 0 0", fontSize: 12, lineHeight: 1.55, color: "#7d7263" }}>{conf.eloAviso}</p>
          </div>
        </div>
      </Secao>

      {/* ---------------------------------------------------------- 4. REGRAS */}
      <Secao id="regras-gerais" titulo={t.regrasGeraisTitulo}>
        {/*
          Lista em colunas (não em grade): a leitura desce a coluna 1 → 22, que é a ordem de
          um regulamento numerado. Cada item tem id="regra-N" — a inscrição linka direto.

          O número vai ESCRITO ("REGRA 7"), não aria-hidden e não só dentro do selo: é como o
          regulamento é citado, e o leitor de tela precisa ouvir. O selo leva o desenho do
          assunto, para achar "a do W.O." ou "a do desempate" sem saber o número.
        */}
        <ol style={{ listStyle: "none", margin: 0, padding: 0, columnWidth: 340, columnGap: 12 }}>
          {REGRAS.map(([regra, icone], i) => (
            <li
              key={i}
              id={`regra-${i + 1}`}
              className="lob-card-2"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 13,
                padding: "14px 15px",
                marginBottom: 10,
                breakInside: "avoid",
                scrollMarginTop: MARGEM_ANCORA,
              }}
            >
              <SeloHex icone={icone} tamanho={34} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".16em", color: "#c98a4b", lineHeight: 1.2, marginBottom: 5 }}>
                  {interpolar(t.regraRotulo, {
                    n: (
                      <span
                        className="lob-display"
                        style={{ fontSize: 17, fontWeight: 400, letterSpacing: ".02em", color: "#f0c88a" }}
                      >
                        {i + 1}
                      </span>
                    ),
                  })}
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "#b3a690" }}>
                  {interpolar(regra, trocasDasRegras)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Secao>

      {/* ---------------------------------------------------------- 5. CARTINHAS SURPRESA */}
      <Secao id="cartinhas" titulo={t.cartasTitulo}>
        <div className="lob-card-2" style={{ padding: "18px 20px" }}>
          <p style={{ ...TEXTO, marginBottom: 14 }}>{t.cartasIntro}</p>
          <Marcadores itens={CARTAS_GERAIS} />
        </div>

        <Rotulo icone={IconeCarta}>{t.cartasIndividuaisLabel}</Rotulo>
        <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.55, color: "#8f8472" }}>{t.cartasIndividuaisTexto}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,320px),1fr))", gap: 10 }}>
          {individuais.map(({ carta, letra }) => {
            const { nome, efeito } = textoDaCarta(carta);
            return (
              <div key={carta.id} className="lob-card-2" style={{ display: "flex", alignItems: "flex-start", gap: 13, padding: "14px 15px" }}>
                <SeloLetra tamanho={38}>{letra}</SeloLetra>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                    <IconeCarta size={15} color="#e6c592" style={{ flexShrink: 0 }} />
                    <span className="lob-display" style={{ fontSize: 15, color: "#f2ebdf" }}>
                      {nome}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "#a99e8b" }}>{efeito}</div>
                </div>
              </div>
            );
          })}
        </div>

        <Rotulo cor="#57d8cb" icone={IconeCartas}>
          {t.cartasDuplasLabel}
        </Rotulo>
        <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.55, color: "#8f8472" }}>{t.cartasDuplasTexto}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,320px),1fr))", gap: 10 }}>
          {duplas.map((carta) => {
            const { nome, efeito } = textoDaCarta(carta);
            return (
              <div
                key={carta.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 13,
                  padding: "14px 15px",
                  background: "linear-gradient(180deg,#16211e,#0f1615)",
                  border: "1px solid rgba(87,216,203,.22)",
                  borderRadius: 3,
                }}
              >
                {/* As duas cartas no selo verde-água: a dupla afeta os dois times. */}
                <SeloHex icone={IconeCartas} tom="teal" tamanho={38} />
                <div style={{ minWidth: 0 }}>
                  <div className="lob-display" style={{ fontSize: 15, color: "#eafaf7", marginBottom: 4 }}>{nome}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "#9fc4bd" }}>{efeito}</div>
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ margin: "16px 0 0", fontSize: 13, lineHeight: 1.6, color: "#8f8472" }}>
          <b style={{ color: "#cdbfa8" }}>{t.cartasNovasRotulo}</b> {t.cartasNovasTexto}
        </p>
      </Secao>

      {/* ---------------------------------------------------------- 6. PONTUAÇÃO E FASES FINAIS */}
      <Secao id="pontuacao" titulo={t.pontuacaoTitulo}>
        <div style={{ padding: 20, background: "rgba(201,138,75,.05)", border: "1px solid rgba(201,138,75,.16)", borderRadius: 3 }}>
          <p style={{ ...TEXTO, marginBottom: 14 }}>{t.pontuacaoIntro}</p>
          <Marcadores itens={PONTUACAO} />
        </div>
      </Secao>

      {/* ---------------------------------------------------------- PREMIAÇÃO (decisão de 05/10/2026) */}
      <Secao id="premiacao" titulo={t.premiacaoTitulo}>
        {premio ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,220px),1fr))", gap: 12, marginBottom: 14, maxWidth: 560 }}>
            {[
              { k: t.premiacaoCampeaoK, v: premio.campeao, icone: Trophy, tom: "ouro" as const },
              { k: t.premiacaoViceK, v: premio.vice, icone: Medal, tom: "bronze" as const },
            ].map((p) => (
              <div
                key={p.k}
                className="lob-card-2"
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 16px" }}
              >
                <SeloHex icone={p.icone} tom={p.tom} tamanho={44} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, letterSpacing: ".12em", color: "#c98a4b", marginBottom: 6 }}>{p.k}</div>
                  <div className="lob-display" style={{ fontSize: 30, lineHeight: 1, color: "#e6c592" }}>{p.v}</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <p style={{ ...TEXTO, maxWidth: 820 }}>
          {premio
            ? interpolar(t.premiacaoTexto, {
                campeao: <b style={{ color: "#e6c592" }}>{premio.campeao}</b>,
                vice: <b style={{ color: "#e6c592" }}>{premio.vice}</b>,
              })
            : t.premiacaoTextoSemConfig}
        </p>
        <p style={{ ...TEXTO, maxWidth: 820, marginTop: 10 }}>{t.premiacaoOrganizadores}</p>
      </Secao>

      {/* ---------------------------------------------------------- 7. CALENDÁRIO */}
      {/*
        O calendário oficial, de lib/calendario-4a.ts — o mesmo que /calendario e a home
        mostram. Antes aqui havia um "calendário modelo" de 8 times escrito à mão.
      */}
      <Secao id="calendario" titulo={t.calendarioTitulo}>
        <p style={{ ...TEXTO, maxWidth: 820, marginBottom: 16 }}>{tCal.intro}</p>
        <CalendarioDa4a t={tCal} localeTag={tc.localeTag} />
      </Secao>
    </div>
  );
}
