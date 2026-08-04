import { TcgCard } from "@/components/lob/tcg-card";
import { Eyebrow, GoldTitle, SectionTitle } from "@/components/lob/ui";
import { CARDS_BY_ID, ALL_CARDS } from "@/lib/cards";
import { getMessages } from "@/lib/i18n/server";
import type { CardId } from "@/lib/schema";
import { getServerDataset } from "@/lib/server-data";
import { calculateCardStats } from "@/lib/tournament";

export const dynamic = "force-dynamic";

export default async function CartasPage() {
  const { dataset } = await getServerDataset();
  const mensagens = await getMessages();
  const t = mensagens.paginasStats;
  const conf = mensagens.conformidade;
  const used = calculateCardStats(dataset).filter((stat) => stat.count > 0);

  // Os ids das cartas (e o dataset) continuam iguais: só o texto exibido muda de idioma.
  const nomeDaCarta = (id: string) => t.cartas[id as CardId]?.nome ?? CARDS_BY_ID[id as CardId]?.title ?? id;
  const selos = {
    chipDupla: t.cartasChipDupla,
    chipSurpresa: t.cartasChipSurpresa,
    rodapeDupla: t.cartasRodapeDupla,
    rodapeIndividual: t.cartasRodapeIndividual,
  };

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 26px" }}>
        <Eyebrow>{t.cartasEyebrow}</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(48px,11vw,128px)", lineHeight: 0.88, margin: "10px 0 16px" }}>{t.cartasTitulo}</GoldTitle>
        <p style={{ maxWidth: 660, fontSize: 16, lineHeight: 1.55, color: "#a99e8b", margin: 0 }}>
          {t.cartasIntro}
        </p>
      </section>

      {/*
        Bloco de integridade de jogo. As cartinhas restringem escolhas do adversário, e as
        políticas da Riot avaliam justamente isso — então a explicação fica em destaque no
        topo da página, não diluída num parágrafo mais abaixo.
      */}
      <section
        className="lob-fade"
        style={{
          marginBottom: 30,
          padding: "18px 20px",
          background: "rgba(201,138,75,.06)",
          border: "1px solid rgba(201,138,75,.18)",
          borderRadius: 4,
          maxWidth: 900,
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <SectionTitle size={17}>{conf.cartasTituloAviso}</SectionTitle>
        </div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "#b3a690" }}>
          {conf.cartasAviso}
        </p>
        <p style={{ margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.65, color: "#b3a690" }}>
          {conf.cartasAvisoTecnico}
        </p>
      </section>

      <section className="lob-fade" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(236px,1fr))", gap: 20 }}>
        {ALL_CARDS.map((card) => {
          const texto = t.cartas[card.cardId];
          return (
            <TcgCard
              key={card.id}
              card={texto ? { ...card, title: texto.nome, flavor: texto.flavor, description: texto.descricao } : card}
              t={selos}
            />
          );
        })}
      </section>

      {used.length > 0 ? (
        <section className="lob-fade" style={{ marginTop: 44 }}>
          <div style={{ marginBottom: 16 }}>
            <SectionTitle size={23}>{t.cartasMaisSorteadas}</SectionTitle>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
            {used.map((stat) => {
              const def = CARDS_BY_ID[stat.cardId as CardId];
              return (
                <div key={stat.cardId} className="lob-card-2" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {def?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={def.imageUrl}
                        alt=""
                        width={40}
                        height={40}
                        style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: `1px solid ${def.border}` }}
                      />
                    ) : (
                      <span style={{ display: "flex", width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 8, fontSize: 22, background: def ? `linear-gradient(135deg,${def.from}55,#0e0a05)` : undefined }} aria-hidden>{def?.emoji ?? "🎴"}</span>
                    )}
                    <div>
                      <p className="lob-display" style={{ margin: 0, fontSize: 15, color: "#f2ebdf" }}>{nomeDaCarta(stat.cardId)}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#8f8472" }}>{stat.count} {t.cartasSorteios}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Créditos das artes — exigido pela licença CC BY-SA 4.0 da arte do Draft Invertido. */}
      <section className="lob-fade" style={{ marginTop: 44, paddingTop: 18, borderTop: "1px solid rgba(201,138,75,.16)" }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: ".10em", color: "#8f8472" }}>{t.cartasCreditosTitulo}</p>
        <p style={{ margin: "8px 0 0", maxWidth: 720, fontSize: 11.5, lineHeight: 1.6, color: "#6f6656" }}>
          {t.cartasCreditosA}
          <strong style={{ color: "#8f8472" }}>{nomeDaCarta("DRAFT_INVERTIDO")}</strong>
          {t.cartasCreditosB}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" style={{ color: "#a98a5f" }}>
            CC BY-SA 4.0
          </a>{" "}
          (
          <a href="https://commons.wikimedia.org/wiki/File:Jojo_Todynho_-_46678168382.jpg" target="_blank" rel="noreferrer" style={{ color: "#a98a5f" }}>
            {t.cartasCreditosFonte}
          </a>
          )
          {t.cartasCreditosC}
          <a href="/cartas/CREDITOS.txt" target="_blank" rel="noreferrer" style={{ color: "#a98a5f" }}>
            /cartas/CREDITOS.txt
          </a>
          .
        </p>
      </section>
    </div>
  );
}
