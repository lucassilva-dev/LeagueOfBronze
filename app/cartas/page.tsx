import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import type { CardDef } from "@/lib/cards";
import { CARDS, CARDS_BY_ID } from "@/lib/cards";
import type { CardId } from "@/lib/schema";
import { getServerDataset } from "@/lib/server-data";
import { calculateCardStats } from "@/lib/tournament";

export const dynamic = "force-dynamic";

function CartaVisual({ card }: Readonly<{ card: CardDef }>) {
  return (
    <Card className="overflow-hidden p-0">
      <div
        className="flex items-center justify-center py-8"
        style={{ background: `linear-gradient(135deg, ${card.from}, ${card.to})` }}
      >
        <span className="text-6xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]" aria-hidden>
          {card.emoji}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-heading text-lg font-bold tracking-wide">{card.title}</h3>
        <p className="mt-1 text-sm text-muted">{card.description}</p>
      </div>
    </Card>
  );
}

export default async function CartasPage() {
  const { dataset } = await getServerDataset();
  const used = calculateCardStats(dataset).filter((stat) => stat.count > 0);

  return (
    <PageShell className="space-y-6">
      <PageHero
        badge="Cartinhas"
        title="Cartas"
        description="Acervo das Cartinhas Surpresa do torneio. O sorteio é feito nos detalhes de cada série, no dia do jogo — aqui ficam todas as cartas que existem e suas regras."
      />

      <section>
        <h2 className="mb-3 font-heading text-xl font-semibold tracking-wide">Acervo de Cartas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <CartaVisual key={card.id} card={card} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-xl font-semibold tracking-wide">Cartas mais usadas</h2>
        {used.length === 0 ? (
          <Card className="p-5 text-sm text-muted">
            Nenhuma cartinha sorteada ainda. Conforme forem sorteadas nas séries, o ranking aparece
            aqui.
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
                      <p className="text-xs text-muted">{stat.count} sorteio(s)</p>
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
