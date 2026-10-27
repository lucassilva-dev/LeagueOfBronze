// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { afterEach, describe, expect, it } from "vitest";

import { DataTable } from "@/components/data-table";
import { JogadoresClient } from "@/components/lob/jogadores-client";
import { StatsToggles } from "@/components/lob/stats-toggles";
import { MESSAGES } from "@/lib/i18n/messages";
import { buildDesignPlayers } from "@/lib/roster";

import { temporadaJogada } from "./_ajuda";

/**
 * Os controles das páginas públicas para quem usa teclado ou leitor de tela: o caminho de
 * /jogadores até a ficha, os botões de métrica de /stats e as colunas ordenáveis do arquivo.
 */

afterEach(cleanup);

function paginaDeJogadores() {
  const dataset = temporadaJogada();
  const t = MESSAGES.pt;
  const players = buildDesignPlayers(dataset);
  render(<JogadoresClient players={players} textos={t.paginasHome} elos={t.paginasStats.elos} />);
  return players;
}

describe("PUB-10 — /jogadores leva à ficha de cada jogador", () => {
  // A ficha mora em /jogadores/<slug>: é lá que o time com página temática mostra a cara dele.
  // Antes o card abria um diálogo com a ficha no visual antigo, e o tema nunca aparecia.
  it("cada card é um link para /jogadores/<slug>, sem diálogo por cima da página", () => {
    const players = paginaDeJogadores();
    const links = screen.getAllByRole("link");
    // `?de=jogadores`: a ficha sabe que veio da lista e o «voltar» traz de volta para ela.
    expect(links.map((link) => link.getAttribute("href")).sort()).toEqual(
      players.map((player) => `/jogadores/${player.slug}?de=jogadores`).sort(),
    );
    expect(screen.queryAllByRole("button")).toEqual([]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cada card tem a âncora para onde o «voltar» da ficha devolve", () => {
    const players = paginaDeJogadores();
    for (const player of players) {
      const card = document.getElementById(`jogador-${player.slug}`);
      expect(card?.querySelector("a")?.getAttribute("href"), player.slug).toBe(`/jogadores/${player.slug}?de=jogadores`);
    }
  });

  it("o link do card se estica pelo card inteiro (tocar na foto também abre a ficha)", () => {
    paginaDeJogadores();
    for (const link of screen.getAllByRole("link")) {
      expect(link.classList.contains("lob-linha-link")).toBe(true);
      // O `::after` do link para no CARD: sem o relative nele, um card cobriria a página inteira.
      const card = link.closest(".lob-card-alvo") as HTMLElement | null;
      expect(card?.style.position).toBe("relative");
      for (let no = link as HTMLElement | null; no && no !== card; no = no.parentElement) {
        expect([no.style.position, no.style.filter, no.style.transform].filter(Boolean)).toEqual([]);
      }
    }
  });
});

describe("PUB-11 — estado dos controles exposto ao leitor de tela", () => {
  it("/stats: o botão da métrica escolhida diz que está pressionado", () => {
    render(<StatsToggles playerRankings={{}} champRankings={{}} />);
    // Uma métrica escolhida por grupo (jogadores e campeões); as outras, não pressionadas.
    const escolhida = screen.getAllByRole("button", { pressed: true })[0]!;
    const outra = screen.getAllByRole("button", { pressed: false })[0]!;
    expect(escolhida.textContent).toBe("Abates");
    fireEvent.click(outra);
    expect(outra.getAttribute("aria-pressed")).toBe("true");
    expect(escolhida.getAttribute("aria-pressed")).toBe("false");
  });

  it("arquivo: a coluna ordenável diz se e em que sentido ordena (aria-sort)", () => {
    type Linha = { time: string; pontos: number };
    const colunas: ColumnDef<Linha, unknown>[] = [
      { accessorKey: "time", header: "Time" },
      { accessorKey: "pontos", header: "Pontos" },
    ];
    render(<DataTable columns={colunas} data={[{ time: "A", pontos: 3 }, { time: "B", pontos: 6 }]} />);
    const pontos = screen.getByRole("columnheader", { name: /Pontos/ });
    expect(pontos.getAttribute("scope")).toBe("col");
    expect(pontos.getAttribute("aria-sort")).toBe("none");

    fireEvent.click(within(pontos).getByRole("button"));
    const primeiro = pontos.getAttribute("aria-sort");
    expect(["ascending", "descending"]).toContain(primeiro);
    fireEvent.click(within(pontos).getByRole("button"));
    expect(pontos.getAttribute("aria-sort")).toBe(primeiro === "ascending" ? "descending" : "ascending");
  });
});
