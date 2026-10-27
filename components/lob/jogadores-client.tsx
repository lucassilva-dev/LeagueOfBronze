import { PlayerCard } from "@/components/lob/player-card";
import { RoleIcon } from "@/components/lob/ui";
import { rotaCurto, rotaLabel, type PaginasHomeTextos } from "@/lib/i18n/messages/paginas-home";
import type { DesignPlayer } from "@/lib/roster";

const ROLE_ORDER = ["TOP", "SEL", "MID", "ADC", "SUP"];

/**
 * /jogadores, por rota. Cada card LEVA à ficha do jogador (/jogadores/<slug>): é lá que o
 * time com página temática mostra a cara dele (components/times). Antes o card abria um
 * diálogo com a ficha no visual antigo, e o tema do time nunca aparecia por este caminho.
 */
export function JogadoresClient({
  players,
  textos: t,
  elos,
}: Readonly<{
  players: DesignPlayer[];
  textos: PaginasHomeTextos;
  /** Rótulos de elo por chave, para o alt/title das cristas. */
  elos?: Record<string, string>;
}>) {
  const byRole = new Map<string, DesignPlayer[]>();
  for (const player of players) {
    const list = byRole.get(player.roleMeta.short) ?? [];
    list.push(player);
    byRole.set(player.roleMeta.short, list);
  }
  /*
   * As rotas conhecidas vêm primeiro, na ordem do design; o que sobrar vem depois.
   *
   * A segunda parte não é enfeite: `resolveRole` devolve um fallback com `short: "—"`
   * para rota vazia ou não reconhecida, e esse valor não está em ROLE_ORDER. Percorrer
   * só ROLE_ORDER fazia esses jogadores SUMIREM da página — enquanto a pílula do topo
   * continuava contando todos os inscritos. O número dizia 30 e a página mostrava 29,
   * sem nenhum caminho para chegar no que faltava.
   */
  const montarSecao = (short: string) => {
    const list = (byRole.get(short) ?? []).slice().sort((a, b) => b.pts - a.pts);
    if (list.length === 0) return null;
    return {
      short,
      label: rotaLabel(t, short, list[0].roleMeta.label),
      color: list[0].roleMeta.color,
      players: list,
    };
  };

  const sobras = [...byRole.keys()].filter((short) => !ROLE_ORDER.includes(short)).sort();
  const sections = [...ROLE_ORDER, ...sobras]
    .map(montarSecao)
    .filter((section): section is NonNullable<typeof section> => section !== null);

  return (
    <>
      {sections.map((section) => (
        <section key={section.short} className="lob-fade">
          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "36px 0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <RoleIcon role={section.players[0].role1} size={26} color={section.color} />
              <h2 className="lob-display" style={{ fontSize: 27, color: "#f2ebdf", margin: 0 }}>{section.label}</h2>
            </div>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(201,138,75,.4),transparent)" }} />
            <span style={{ fontSize: 11, letterSpacing: ".10em", color: "#8f8472", whiteSpace: "nowrap" }}>{section.players.length} {t.jogadoresContagem}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(188px,1fr))", gap: 16 }}>
            {section.players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                href={`/jogadores/${player.slug}`}
                textos={{
                  capitao: t.capitao,
                  ficha: t.ficha,
                  rotaCurto: rotaCurto(t, player.roleMeta.short),
                  elos,
                }}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
