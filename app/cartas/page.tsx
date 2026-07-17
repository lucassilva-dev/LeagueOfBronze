import { Eyebrow, GoldTitle, SectionTitle } from "@/components/lob/ui";
import { ALL_CARDS, CARDS_BY_ID, type CardDef } from "@/lib/cards";
import type { CardId } from "@/lib/schema";
import { getServerDataset } from "@/lib/server-data";
import { calculateCardStats } from "@/lib/tournament";

export const dynamic = "force-dynamic";

function TcgCard({ card }: Readonly<{ card: CardDef }>) {
  const chip = card.dupla ? "DUPLA" : "SURPRESA";
  const chipBg = card.dupla ? card.color : "rgba(10,8,4,.55)";
  const chipColor = card.dupla ? "#140d05" : "#cdbfa8";
  const foot = card.dupla ? "SÓ COM 2 CARTAS · AFETA OS 2 TIMES" : "1× POR SÉRIE · AFETA O ADVERSÁRIO";

  return (
    <div
      className="lob-tcg"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        border: `2px solid ${card.border}`,
        borderRadius: 11,
        overflow: "hidden",
        background: "linear-gradient(180deg,#221a10,#0e0a05)",
        boxShadow: "0 18px 40px -20px rgba(0,0,0,.85)",
      }}
    >
      <div style={{ position: "relative", padding: "13px 15px 12px", textAlign: "center", background: "linear-gradient(180deg,rgba(0,0,0,.55),transparent)" }}>
        <div style={{ display: "inline-block", margin: "0 auto 8px", padding: "3px 10px", borderRadius: 2, fontSize: 8.5, fontWeight: 700, letterSpacing: ".14em", background: chipBg, color: chipColor, border: `1px solid ${card.border}` }}>{chip}</div>
        <h3 className="lob-display" style={{ fontSize: 20, lineHeight: 1.02, color: "#f4ede1", margin: "0 4px" }}>{card.title}</h3>
        <div style={{ width: 40, height: 2, margin: "9px auto 0", background: card.color, boxShadow: `0 0 8px ${card.border}` }} />
      </div>
      <div style={{ position: "relative", margin: "0 12px", aspectRatio: "1 / 1", borderRadius: 4, overflow: "hidden", background: `linear-gradient(160deg,${card.from}33,#0b0804 70%)`, border: "1px solid rgba(201,138,75,.20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 64, filter: "drop-shadow(0 4px 10px rgba(0,0,0,.5))" }} aria-hidden>{card.emoji}</span>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 -30px 40px -20px rgba(11,8,4,.9)" }} />
      </div>
      <div style={{ padding: "14px 16px 17px", display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontStyle: "italic", lineHeight: 1.5, color: "#c6b99f", textAlign: "center" }}>“{card.flavor}”</p>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          <span style={{ width: 6, height: 6, transform: "rotate(45deg)", background: card.color }} />
          <span style={{ fontSize: 8.5, letterSpacing: ".12em", color: "#8f8472" }}>{foot}</span>
        </div>
      </div>
    </div>
  );
}

export default async function CartasPage() {
  const { dataset } = await getServerDataset();
  const used = calculateCardStats(dataset).filter((stat) => stat.count > 0);

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 26px" }}>
        <Eyebrow>Mecânica duvidosa · entretenimento imaculado</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(48px,11vw,128px)", lineHeight: 0.88, margin: "10px 0 16px" }}>CARTAS</GoldTitle>
        <p style={{ maxWidth: 660, fontSize: 16, lineHeight: 1.55, color: "#a99e8b", margin: 0 }}>
          Em cada série (MD3), cada capitão pode sortear uma cartinha surpresa — ao vivo, antes do
          pick &amp; ban, valendo só para aquela partida. O sorteio acontece nos detalhes de cada
          série. São 6 cartas individuais (afetam o adversário) e 2 duplas que entram quando os dois
          capitães usam na mesma partida.
        </p>
      </section>

      <section className="lob-fade" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(236px,1fr))", gap: 20 }}>
        {ALL_CARDS.map((card) => (
          <TcgCard key={card.id} card={card} />
        ))}
      </section>

      {used.length > 0 ? (
        <section className="lob-fade" style={{ marginTop: 44 }}>
          <div style={{ marginBottom: 16 }}>
            <SectionTitle size={23}>CARTAS MAIS SORTEADAS</SectionTitle>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
            {used.map((stat) => {
              const def = CARDS_BY_ID[stat.cardId as CardId];
              return (
                <div key={stat.cardId} className="lob-card-2" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ display: "flex", width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 8, fontSize: 22, background: def ? `linear-gradient(135deg,${def.from}55,#0e0a05)` : undefined }} aria-hidden>{def?.emoji ?? "🎴"}</span>
                    <div>
                      <p className="lob-display" style={{ margin: 0, fontSize: 15, color: "#f2ebdf" }}>{stat.title}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#8f8472" }}>{stat.count} sorteio(s)</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
