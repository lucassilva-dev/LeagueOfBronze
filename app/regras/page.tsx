import { Eyebrow, EloCrest, GoldTitle, SectionTitle } from "@/components/lob/ui";
import { CARDS, DUPLAS } from "@/lib/cards";
import { ELO_ORDER } from "@/lib/design";
import { getMessages } from "@/lib/i18n/server";

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

function Card({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="lob-card-2">{children}</div>;
}

export default async function RegrasPage() {
  const { paginasRegras: t, paginasStats: ts } = await getMessages();
  // ELO_ORDER vem do design system com `key` tipada como string; o mapa traduzido tem chaves
  // fechadas, então a leitura é feita por um Record aberto (com fallback para o rótulo do lib).
  const eloRotulos: Record<string, string> = ts.elos;
  // Mesmo motivo para as cartinhas: CARDS/DUPLAS vêm de lib/cards.ts com `id` string.
  const cartaTextos: Record<string, { nome: string; descricao: string }> = ts.cartas;

  const FICHA = [
    { k: t.fichaInscricaoK, v: t.fichaInscricaoV },
    { k: t.fichaPremio1K, v: t.fichaPremio1V },
    { k: t.fichaPremio2K, v: t.fichaPremio2V },
    { k: t.fichaModalidadeK, v: t.fichaModalidadeV },
    { k: t.fichaFormacaoK, v: t.fichaFormacaoV },
    { k: t.fichaFaseK, v: t.fichaFaseV },
    { k: t.fichaFinalK, v: t.fichaFinalV },
    { k: t.fichaDatasK, v: t.fichaDatasV },
    { k: t.fichaTurnosK, v: t.fichaTurnosV },
    { k: t.fichaOrcamentoK, v: t.fichaOrcamentoV },
  ];

  const REGRAS_GERAIS = [
    t.regraA, t.regraB, t.regraC, t.regraD, t.regraE, t.regraF, t.regraG, t.regraH,
    t.regraI, t.regraJ, t.regraK, t.regraL, t.regraM, t.regraN, t.regraO, t.regraP,
    t.regraQ, t.regraR, t.regraS, t.regraT, t.regraU, t.regraV,
  ];

  const DRAFT_BULLETS = [t.draft1, t.draft2, t.draft3, t.draft4, t.draft5, t.draft6];

  const PONTUACAO = [t.pontuacao1, t.pontuacao2, t.pontuacao3, t.pontuacao4];

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 24px" }}>
        <Eyebrow>{t.regrasSobretitulo}</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(48px,11vw,128px)", lineHeight: 0.88, margin: "10px 0 16px" }}>{t.regrasTitulo}</GoldTitle>
        <p style={{ maxWidth: 600, fontSize: 16, lineHeight: 1.55, color: "#a99e8b", margin: 0 }}>
          {t.regrasSubtitulo}
        </p>
      </section>

      <section className="lob-fade" style={{ marginTop: 14 }}>
        <div style={{ marginBottom: 14 }}>
          <SectionTitle size={23}>{t.fichaTitulo}</SectionTitle>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
          {FICHA.map((f) => (
            <div key={f.k} className="lob-card-2" style={{ padding: "15px 16px" }}>
              <div style={{ fontSize: 10.5, letterSpacing: ".12em", color: "#c98a4b", marginBottom: 7 }}>{f.k}</div>
              <div style={{ fontSize: 14, color: "#e9dfcd", lineHeight: 1.4 }}>{f.v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="lob-fade" style={{ marginTop: 38 }}>
        <div style={{ marginBottom: 14 }}>
          <SectionTitle size={23}>{t.regrasGeraisTitulo}</SectionTitle>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 10 }}>
          {REGRAS_GERAIS.map((rule, i) => (
            <div key={rule} className="lob-card-2" style={{ display: "flex", gap: 12, padding: "13px 15px" }}>
              <span style={{ flexShrink: 0, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, background: "rgba(201,138,75,.12)", color: "#cfa877", fontFamily: "var(--font-display)", fontSize: 14 }}>
                {String.fromCharCode(97 + i)}
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.5, color: "#b3a690" }}>{rule}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lob-fade" style={{ marginTop: 38 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16, alignItems: "start" }}>
          <Card>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <SectionTitle size={18}>{t.draftTitulo}</SectionTitle>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {DRAFT_BULLETS.map((b) => (
                  <div key={b} style={{ display: "flex", gap: 9, fontSize: 13, lineHeight: 1.5, color: "#b3a690" }}>
                    <span style={{ color: "#c98a4b", flexShrink: 0 }}>◆</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <SectionTitle size={18}>{t.eloTitulo}</SectionTitle>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {ELO_ORDER.map((elo) => (
                  <div key={elo.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 11px", background: "rgba(201,138,75,.06)", borderRadius: 2 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, color: "#e2d6c0" }}>
                      <EloCrest elo={elo.label} size={28} title={false} labels={ts.elos} />{" "}
                      {eloRotulos[elo.key] ?? elo.label}
                    </span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "#e6c592" }}>{elo.pts}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(201,138,75,.14)", fontSize: 12.5, lineHeight: 1.5, color: "#8f8472" }}>
                {t.eloOrcamentoPre} <b style={{ color: "#e6c592" }}>{t.eloOrcamentoValor}</b> {t.eloOrcamentoMeio}{" "}
                <b style={{ color: "#e6c592" }}>{t.eloPoolValor}</b>.
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="lob-fade" style={{ marginTop: 16 }}>
        <div style={{ padding: 20, background: "rgba(201,138,75,.05)", border: "1px solid rgba(201,138,75,.16)", borderRadius: 3 }}>
          <div style={{ marginBottom: 12 }}>
            <SectionTitle size={18}>{t.pontuacaoTitulo}</SectionTitle>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {PONTUACAO.map((b) => (
              <div key={b} style={{ display: "flex", gap: 9, fontSize: 13, lineHeight: 1.5, color: "#b3a690" }}>
                <span style={{ color: "#c98a4b", flexShrink: 0 }}>◆</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lob-fade" style={{ marginTop: 38 }}>
        <div style={{ marginBottom: 14 }}>
          <SectionTitle size={23}>{t.cartasTitulo}</SectionTitle>
        </div>
        <div className="lob-card-2" style={{ padding: "18px 20px", marginBottom: 8 }}>
          <p style={{ margin: "0 0 12px", fontSize: 13.5, lineHeight: 1.6, color: "#b3a690" }}>{t.cartaIntro}</p>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#b3a690" }}>{t.cartaIntro2}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 10px" }}>
          <span style={{ fontSize: 11, letterSpacing: ".14em", color: "#c98a4b", whiteSpace: "nowrap" }}>{t.cartasIndividuaisLabel}</span>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(201,138,75,.35),transparent)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 10 }}>
          {CARDS.map((c) => (
            <div key={c.id} className="lob-card-2" style={{ display: "flex", gap: 13, padding: "14px 15px" }}>
              <span style={{ flexShrink: 0, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, background: "rgba(201,138,75,.14)", color: "#e6c592", fontFamily: "var(--font-display)", fontSize: 16 }}>{c.letter}</span>
              <div>
                <div className="lob-display" style={{ fontSize: 15, color: "#f2ebdf", marginBottom: 4 }}>{cartaTextos[c.id]?.nome ?? c.title}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#a99e8b" }}>{cartaTextos[c.id]?.descricao ?? c.description}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 10px" }}>
          <span style={{ fontSize: 11, letterSpacing: ".14em", color: "#57d8cb", whiteSpace: "nowrap" }}>{t.cartasDuplasLabel}</span>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(87,216,203,.35),transparent)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 10 }}>
          {DUPLAS.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 13, padding: "14px 15px", background: "linear-gradient(180deg,#16211e,#0f1615)", border: "1px solid rgba(87,216,203,.22)", borderRadius: 3 }}>
              <span style={{ flexShrink: 0, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, background: "rgba(87,216,203,.14)", color: "#7fe6db", fontSize: 13 }}>◆◆</span>
              <div>
                <div className="lob-display" style={{ fontSize: 15, color: "#eafaf7", marginBottom: 4 }}>{cartaTextos[c.id]?.nome ?? c.title}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#9fc4bd" }}>{cartaTextos[c.id]?.descricao ?? c.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
