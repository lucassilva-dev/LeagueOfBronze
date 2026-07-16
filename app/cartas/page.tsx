import { CartasPageClient } from "@/components/cartas-page-client";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { CARDS_BY_ID } from "@/lib/cards";
import type { CardId } from "@/lib/schema";
import { getServerDataset } from "@/lib/server-data";
import { calculateCardStats } from "@/lib/tournament";

export const dynamic = "force-dynamic";

export default async function CartasPage() {
  const { dataset } = await getServerDataset();
  const used = calculateCardStats(dataset).filter((stat) => stat.count > 0);

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge="Cartinhas"
        title="Cartas"
        description="Acervo das Cartinhas Surpresa do torneio e sorteio (único ou duplo). Cada carta altera o draft de uma partida da série, a critério do capitão."
      />

      <CartasPageClient />

      <section>
        <h2 className="mb-3 font-heading text-xl font-semibold tracking-wide">Cartas mais usadas</h2>
        {used.length === 0 ? (
          <Card className="p-5 text-sm text-muted">
            Nenhuma cartinha registrada ainda. Conforme forem usadas nas séries (lançadas no
            /admin), o ranking aparece aqui.
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {used.map((stat) => {
              const def = CARDS_BY_ID[stat.cardId as CardId];
              return (
                <Card key={stat.cardId} className="p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl"
                      style={{
                        background: def
                          ? `linear-gradient(135deg, ${def.from}, ${def.to})`
                          : undefined,
                      }}
                      aria-hidden
                    >
                      {def?.emoji ?? "🎴"}
                    </span>
                    <div>
                      <p className="font-semibold">{stat.title}</p>
                      <p className="text-xs text-muted">{stat.count} uso(s)</p>
                    </div>
                  </div>
                  {stat.byTeam.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-xs text-muted">
                      {stat.byTeam.map((team) => (
                        <li key={team.teamId} className="flex justify-between gap-2">
                          <span className="truncate">{team.teamName}</span>
                          <span className="font-semibold text-text">{team.count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
