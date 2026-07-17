import { JogadoresClient } from "@/components/lob/jogadores-client";
import { Eyebrow, GoldTitle, Pill } from "@/components/lob/ui";
import { buildDesignPlayers } from "@/lib/roster";
import { getServerDataset } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function JogadoresPage() {
  const { dataset } = await getServerDataset();
  const players = buildDesignPlayers(dataset);

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 26px" }}>
        <Eyebrow>3ª Edição dos Bronzes</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(44px,10vw,128px)", lineHeight: 0.88, margin: "10px 0 16px" }}>JOGADORES</GoldTitle>
        <p style={{ maxWidth: 580, fontSize: 16, lineHeight: 1.55, color: "#a99e8b", margin: "0 0 24px" }}>
          Trinta feras do low elo, do Ferro ao Mestre — escolhidas a peso de ouro no draft por
          pontos.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          <Pill>{players.length} INSCRITOS</Pill>
          <Pill>5 ROTAS</Pill>
        </div>
      </section>
      <JogadoresClient players={players} />
    </div>
  );
}
