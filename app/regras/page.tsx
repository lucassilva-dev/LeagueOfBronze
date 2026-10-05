import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";

import { Eyebrow, GoldTitle, SectionTitle } from "@/components/lob/ui";
import { CARTAS_ATIVAS, type CardDef } from "@/lib/cards";
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

/**
 * /regras — regulamento da 4ª Edição (4º Campeonato dos Bronzes).
 *
 * Segue as 7 seções do PDF oficial, na mesma ordem, mais a seção de Premiação, que
 * nasceu das decisões da organização de 05/10/2026. Onde o PDF e essas decisões
 * divergem, vale a decisão (o PDF será atualizado depois).
 *
 * Dois números NÃO estão escritos no texto: a taxa de inscrição e a fatia do campeão.
 * Os dois vêm da Configuração da edição (`edicao_config`), a mesma que o formulário de
 * inscrição e o caixa usam — publicar aqui um valor digitado à mão é como a página e o
 * caixa começam a discordar. Sem configuração (banco fora do ar, ambiente sem chave), a
 * página continua de pé e o texto sai sem os números.
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

function Secao({
  id,
  titulo,
  children,
}: Readonly<{ id: string; titulo: string; children: ReactNode }>) {
  return (
    <section id={id} className="lob-fade" style={{ marginTop: 46, scrollMarginTop: MARGEM_ANCORA }}>
      <div style={{ marginBottom: 14 }}>
        <SectionTitle size={23}>{titulo}</SectionTitle>
      </div>
      {children}
    </section>
  );
}

function Marcadores({ itens }: Readonly<{ itens: ReactNode[] }>) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {itens.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 9, fontSize: 13.5, lineHeight: 1.55, color: "#b3a690" }}>
          <span aria-hidden style={{ color: "#c98a4b", flexShrink: 0 }}>
            ◆
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Selo quadrado com número ou letra, usado nas regras, no draft e nas cartinhas.
 *
 * Não é aria-hidden: as listas usam `list-style: none`, e sem marcador o leitor de tela
 * perderia o número da regra — que é justamente como o regulamento é citado.
 */
function Selo({ children, tamanho = 26 }: Readonly<{ children: ReactNode; tamanho?: number }>) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: tamanho,
        height: tamanho,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 3,
        background: "rgba(201,138,75,.13)",
        color: "#e6c592",
        fontFamily: "var(--font-display)",
        fontSize: tamanho > 26 ? 16 : 14,
      }}
    >
      {children}
    </span>
  );
}

function Rotulo({ children, cor = "#c98a4b" }: Readonly<{ children: ReactNode; cor?: string }>) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 8px" }}>
      <span style={{ fontSize: 11, letterSpacing: ".14em", color: cor }}>{children}</span>
      <div style={{ height: 1, flex: 1, minWidth: 24, background: `linear-gradient(90deg,${cor}59,transparent)` }} />
    </div>
  );
}

export default async function RegrasPage() {
  const [mensagens, config] = await Promise.all([getMessages(), lerConfigOuNulo()]);
  const { paginasRegras: t, paginasStats: ts, conformidade: conf, compartilhados: tc } = mensagens;

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

  const SUMARIO = [
    { id: "visao-geral", rotulo: t.visaoGeralTitulo },
    { id: "inscricao", rotulo: t.inscricaoTitulo },
    { id: "formacao", rotulo: t.formacaoTitulo },
    { id: "regras-gerais", rotulo: t.regrasGeraisTitulo },
    { id: "cartinhas", rotulo: t.cartasTitulo },
    { id: "pontuacao", rotulo: t.pontuacaoTitulo },
    { id: "premiacao", rotulo: t.premiacaoTitulo },
    { id: "calendario", rotulo: t.calendarioTitulo },
  ];

  const FICHA: { k: string; v: ReactNode }[] = [
    { k: t.fichaModalidadeK, v: t.fichaModalidadeV },
    { k: t.fichaPeriodoK, v: t.fichaPeriodoV },
    { k: t.fichaFaseK, v: t.fichaFaseV },
    { k: t.fichaSemifinaisK, v: t.fichaSemifinaisV },
    { k: t.fichaFinalK, v: t.fichaFinalV },
    { k: t.fichaInscricaoK, v: interpolar(t.fichaInscricaoV, { link: linkInscricao }) },
    { k: t.fichaTransmissaoK, v: interpolar(t.fichaTransmissaoV, { canal1, canal2 }) },
    {
      k: t.fichaValorK,
      v: taxa ? (
        <b className="lob-display" style={{ fontSize: 20, fontWeight: 400, color: "#e6c592" }}>
          {taxa}
        </b>
      ) : (
        interpolar(t.fichaValorSemConfig, { link: linkInscricao })
      ),
    },
  ];

  const CAMPOS = [
    t.inscricaoCampo1,
    t.inscricaoCampo2,
    t.inscricaoCampo3,
    t.inscricaoCampo4,
    t.inscricaoCampo5,
    t.inscricaoCampo6,
  ];

  const CAPITAES = [t.capitaes1, t.capitaes2, t.capitaes3, t.capitaes4, t.capitaes5];

  const DRAFT = [t.draft1, t.draft2, t.draft3, t.draft4, t.draft5, t.draft6];

  // A ordem é o número da regra: o índice + 1 vira o id "regra-N" que a inscrição linka.
  const REGRAS = [
    t.regra1, t.regra2, t.regra3, t.regra4, t.regra5, t.regra6, t.regra7, t.regra8,
    t.regra9, t.regra10, t.regra11, t.regra12, t.regra13, t.regra14, t.regra15, t.regra16,
    t.regra17, t.regra18, t.regra19, t.regra20, t.regra21, t.regra22,
  ];
  const trocasDasRegras = {
    secao: (
      <a href="#formacao" style={ESTILO_LINK}>
        {t.regra2Link}
      </a>
    ),
  };

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

  const PONTUACAO = [
    { k: t.pontuacaoFaseK, v: t.pontuacaoFaseV },
    { k: t.pontuacaoDesempateK, v: interpolar(t.pontuacaoDesempateV, { regra: linkRegra(19, t.pontuacaoDesempateLink) }) },
    { k: t.pontuacaoSemisK, v: t.pontuacaoSemisV },
    { k: t.pontuacaoFinalK, v: t.pontuacaoFinalV },
    { k: t.pontuacaoSeriesK, v: t.pontuacaoSeriesV },
  ];

  const CALENDARIO = [
    { data: t.calDatas1a4, turno: t.turnoManha, horarios: "09:00 · 10:30 · 12:00", oque: t.calSeries3 },
    { data: t.calDatas1a4, turno: t.turnoTarde, horarios: "14:00 · 15:30 · 17:00", oque: t.calSeries3 },
    { data: t.calData5, turno: t.turnoManha, horarios: "09:00 · 10:30 · 12:00", oque: t.calSeries3 },
    { data: t.calData5, turno: t.turnoTarde, horarios: "14:00", oque: t.calUltimaSerie },
    { data: t.calData6, turno: t.turnoTarde, horarios: "14:00 · 16:00", oque: t.calSemis },
    { data: t.calData6, turno: t.turnoNoite, horarios: "18:30", oque: t.calFinal },
  ];
  const celula: CSSProperties = {
    padding: "11px 14px",
    borderBottom: "1px solid rgba(201,138,75,.12)",
    textAlign: "left",
    verticalAlign: "top",
  };

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 24px" }}>
        <Eyebrow>{t.regrasSobretitulo}</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(48px,11vw,128px)", lineHeight: 0.88 }}>{t.regrasTitulo}</GoldTitle>
        <p style={{ maxWidth: 640, fontSize: 16, lineHeight: 1.55, color: "#a99e8b", margin: 0 }}>
          {t.regrasSubtitulo}
        </p>
      </section>

      {/* Atalhos para as seções: o regulamento é longo e é lido aos pedaços. */}
      <nav aria-label={t.sumarioRotulo} className="lob-fade" style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: "#8f8472", textTransform: "uppercase", marginBottom: 8 }}>
          {t.sumarioRotulo}
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SUMARIO.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="lob-pill" style={{ textDecoration: "none" }}>
                {s.rotulo}
              </a>
            </li>
          ))}
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
            <SectionTitle size={17}>{conf.formatoVariaTitulo}</SectionTitle>
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
            <div key={f.k} className="lob-card-2" style={{ padding: "15px 16px" }}>
              <div style={{ fontSize: 10.5, letterSpacing: ".12em", color: "#c98a4b", marginBottom: 7 }}>{f.k}</div>
              <div style={{ fontSize: 14, color: "#e9dfcd", lineHeight: 1.45 }}>{f.v}</div>
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
          <div style={{ fontSize: 11, letterSpacing: ".14em", color: "#c98a4b", marginBottom: 12 }}>
            {t.inscricaoCamposTitulo}
          </div>
          <Marcadores itens={CAMPOS} />
          <p style={{ margin: "16px 0 0", paddingTop: 14, borderTop: "1px solid rgba(201,138,75,.14)", fontSize: 13, lineHeight: 1.6, color: "#8f8472" }}>
            {t.inscricaoNota}
          </p>
        </div>
        <p style={{ ...TEXTO, maxWidth: 820, marginTop: 14 }}>
          <b style={{ color: "#e6c592" }}>{t.inscricaoReservasRotulo}</b> {t.inscricaoReservasTexto}
        </p>
      </Secao>

      {/* ---------------------------------------------------------- 3. FORMAÇÃO DOS TIMES */}
      <Secao id="formacao" titulo={t.formacaoTitulo}>
        <p style={{ ...TEXTO, maxWidth: 820, marginBottom: 16 }}>{t.formacaoIntro}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 16, alignItems: "start" }}>
          <div className="lob-card-2" style={{ padding: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <SectionTitle size={18}>{t.capitaesTitulo}</SectionTitle>
            </div>
            <Marcadores itens={CAPITAES} />
          </div>
          <div className="lob-card-2" style={{ padding: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <SectionTitle size={18}>{t.draftTitulo}</SectionTitle>
            </div>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {DRAFT.map((item, i) => (
                <li key={item} style={{ display: "flex", gap: 11, fontSize: 13.5, lineHeight: 1.55, color: "#b3a690" }}>
                  <Selo tamanho={22}>{i + 1}</Selo>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/*
          No lugar da grade "Valores por elo" da 3ª: a tabela da 4ª só existe depois que a
          lista de inscritos fechar. Publicar os pontos antigos aqui faria parecer que eles
          valem para esta edição.
        */}
        <div
          role="note"
          style={{
            marginTop: 16,
            padding: "16px 20px",
            background: "rgba(201,138,75,.06)",
            border: "1px solid rgba(201,138,75,.18)",
            borderRadius: 4,
          }}
        >
          <p style={{ ...TEXTO, fontSize: 13.5 }}>
            <b style={{ color: "#e6c592" }}>{t.tabelaValoresRotulo}</b> {t.tabelaValoresTexto}
          </p>
          {/* Deixa explícito que isto é moeda de draft, não ranqueamento alternativo. */}
          <p style={{ margin: "10px 0 0", fontSize: 12, lineHeight: 1.55, color: "#7d7263" }}>{conf.eloAviso}</p>
        </div>
      </Secao>

      {/* ---------------------------------------------------------- 4. REGRAS */}
      <Secao id="regras-gerais" titulo={t.regrasGeraisTitulo}>
        {/*
          Lista em colunas (não em grade): a leitura desce a coluna 1 → 22, que é a ordem de
          um regulamento numerado. Cada item tem id="regra-N" — a inscrição linka direto.
        */}
        <ol style={{ listStyle: "none", margin: 0, padding: 0, columnWidth: 340, columnGap: 12 }}>
          {REGRAS.map((regra, i) => (
            <li
              key={i}
              id={`regra-${i + 1}`}
              className="lob-card-2"
              style={{
                display: "flex",
                gap: 12,
                padding: "13px 15px",
                marginBottom: 10,
                breakInside: "avoid",
                scrollMarginTop: MARGEM_ANCORA,
              }}
            >
              <Selo>{i + 1}</Selo>
              <span style={{ fontSize: 13.5, lineHeight: 1.55, color: "#b3a690" }}>
                {interpolar(regra, trocasDasRegras)}
              </span>
            </li>
          ))}
        </ol>
      </Secao>

      {/* ---------------------------------------------------------- 5. CARTINHAS SURPRESA */}
      <Secao id="cartinhas" titulo={t.cartasTitulo}>
        <div className="lob-card-2" style={{ padding: "18px 20px" }}>
          <p style={{ ...TEXTO, marginBottom: 12 }}>{t.cartasIntro}</p>
          <Marcadores itens={[t.cartasRegra1, t.cartasRegra2, t.cartasRegra3]} />
        </div>

        <Rotulo>{t.cartasIndividuaisLabel}</Rotulo>
        <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.55, color: "#8f8472" }}>{t.cartasIndividuaisTexto}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,320px),1fr))", gap: 10 }}>
          {individuais.map(({ carta, letra }) => {
            const { nome, efeito } = textoDaCarta(carta);
            return (
              <div key={carta.id} className="lob-card-2" style={{ display: "flex", gap: 13, padding: "14px 15px" }}>
                <Selo tamanho={30}>{letra}</Selo>
                <div>
                  <div className="lob-display" style={{ fontSize: 15, color: "#f2ebdf", marginBottom: 4 }}>
                    {nome}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "#a99e8b" }}>{efeito}</div>
                </div>
              </div>
            );
          })}
        </div>

        <Rotulo cor="#57d8cb">{t.cartasDuplasLabel}</Rotulo>
        <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.55, color: "#8f8472" }}>{t.cartasDuplasTexto}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,320px),1fr))", gap: 10 }}>
          {duplas.map((carta) => {
            const { nome, efeito } = textoDaCarta(carta);
            return (
              <div
                key={carta.id}
                style={{
                  display: "flex",
                  gap: 13,
                  padding: "14px 15px",
                  background: "linear-gradient(180deg,#16211e,#0f1615)",
                  border: "1px solid rgba(87,216,203,.22)",
                  borderRadius: 3,
                }}
              >
                <span
                  aria-hidden
                  style={{ flexShrink: 0, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, background: "rgba(87,216,203,.14)", color: "#7fe6db", fontSize: 13 }}
                >
                  ◆◆
                </span>
                <div>
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
          <Marcadores
            itens={PONTUACAO.map((p) => (
              <Fragment key={p.k}>
                <b style={{ color: "#e2d6c0" }}>{p.k}</b> {p.v}
              </Fragment>
            ))}
          />
        </div>
      </Secao>

      {/* ---------------------------------------------------------- PREMIAÇÃO (decisão de 05/10/2026) */}
      <Secao id="premiacao" titulo={t.premiacaoTitulo}>
        {premio ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,200px),1fr))", gap: 12, marginBottom: 14, maxWidth: 520 }}>
            {[
              { k: t.premiacaoCampeaoK, v: premio.campeao },
              { k: t.premiacaoViceK, v: premio.vice },
            ].map((p) => (
              <div key={p.k} className="lob-card-2" style={{ padding: "15px 16px" }}>
                <div style={{ fontSize: 10.5, letterSpacing: ".12em", color: "#c98a4b", marginBottom: 6 }}>{p.k}</div>
                <div className="lob-display" style={{ fontSize: 30, lineHeight: 1, color: "#e6c592" }}>{p.v}</div>
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

      {/* ---------------------------------------------------------- 7. CALENDÁRIO MODELO */}
      <Secao id="calendario" titulo={t.calendarioTitulo}>
        <p style={{ ...TEXTO, maxWidth: 820, marginBottom: 14 }}>{t.calendarioIntro}</p>
        {/*
          A tabela tem largura mínima e rola DENTRO da caixa no celular — a página em si
          nunca ganha rolagem lateral.
        */}
        <div
          role="region"
          aria-label={t.calendarioTitulo}
          tabIndex={0}
          className="lob-card-2 lob-scroll"
          style={{ overflowX: "auto" }}
        >
          <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13.5, color: "#b3a690" }}>
            <thead>
              <tr style={{ background: "rgba(201,138,75,.10)" }}>
                {[t.calColData, t.calColTurno, t.calColHorarios, t.calColOque].map((col) => (
                  <th
                    key={col}
                    scope="col"
                    style={{ ...celula, fontSize: 10.5, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "#c98a4b" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CALENDARIO.map((linha, i) => (
                <tr key={i}>
                  <th scope="row" style={{ ...celula, fontWeight: 600, color: "#e9dfcd", whiteSpace: "nowrap" }}>
                    {linha.data}
                  </th>
                  <td style={{ ...celula, whiteSpace: "nowrap" }}>{linha.turno}</td>
                  <td style={{ ...celula, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: "#e2d6c0" }}>
                    {linha.horarios}
                  </td>
                  <td style={celula}>{linha.oque}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...TEXTO, maxWidth: 820, marginTop: 14 }}>{t.calendarioNota}</p>
        <p style={{ margin: "10px 0 0", maxWidth: 820, fontSize: 13, lineHeight: 1.6, color: "#8f8472" }}>
          {t.calendarioOutros}
        </p>
      </Secao>
    </div>
  );
}
