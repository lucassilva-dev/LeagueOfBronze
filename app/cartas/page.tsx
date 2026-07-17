import { TcgCard } from "@/components/lob/tcg-card";
import { Eyebrow, GoldTitle, SectionTitle } from "@/components/lob/ui";
import { CARDS_BY_ID, ALL_CARDS } from "@/lib/cards";
import type { CardId } from "@/lib/schema";
import { getServerDataset } from "@/lib/server-data";
import { calculateCardStats } from "@/lib/tournament";

export const dynamic = "force-dynamic";

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
