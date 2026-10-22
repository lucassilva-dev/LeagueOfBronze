// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { afterEach, describe, expect, it } from "vitest";

import { DataTable } from "@/components/data-table";
import { JogadoresClient, type PlayerPerf } from "@/components/lob/jogadores-client";
import { StatsToggles } from "@/components/lob/stats-toggles";
import { MESSAGES } from "@/lib/i18n/messages";
import { buildDesignPlayers } from "@/lib/roster";
import { calculatePlayerAggregates } from "@/lib/tournament";

import { temporadaJogada } from "./_ajuda";

/**
 * Os controles das páginas públicas para quem usa teclado ou leitor de tela: a ficha que
 * abre por cima de /jogadores, os botões de métrica de /stats e as colunas ordenáveis do
 * arquivo.
 */

afterEach(cleanup);

function paginaDeJogadores(locale: "pt" | "en") {
  const dataset = temporadaJogada();
  const perf: Record<string, PlayerPerf> = {};
  for (const agg of calculatePlayerAggregates(dataset)) {
    perf[agg.playerId] = {
      games: agg.gamesPlayed,
      wins: agg.wins,
      kills: agg.kills,
      deaths: agg.deaths,
      assists: agg.assists,
      kda: agg.kda,
      mvps: agg.gameMvps,
      winRate: agg.winRate,
    };
  }
  const t = MESSAGES[locale];
  return render(
    <>
      <button type="button">fora do diálogo</button>
      <JogadoresClient
        players={buildDesignPlayers(dataset)}
        perfByPlayer={perf}
        textos={t.paginasHome}
        elos={t.paginasStats.elos}
        localeTag={t.compartilhados.localeTag}
      />
    </>,
  );
}

/** Abre a ficha da Faisca (meio do time A) pelo botão do card dela. */
function abrirFichaDaFaisca() {
  const abrir = screen.getAllByRole("button").find((botao) => botao.textContent?.includes("Faisca"));
  if (!abrir) throw new Error("card da Faisca sem botão de abrir a ficha");
  abrir.focus();
  fireEvent.click(abrir);
  return abrir;
}

describe("PUB-10 — a ficha de /jogadores é um diálogo de verdade", () => {
  it("abre como diálogo modal rotulado pelo nick, com o foco dentro dele", () => {
    paginaDeJogadores("pt");
    const abrir = abrirFichaDaFaisca();

    const dialogo = screen.getByRole("dialog");
    expect(dialogo.getAttribute("aria-modal")).toBe("true");
    const rotulo = document.getElementById(dialogo.getAttribute("aria-labelledby") ?? "");
    expect(rotulo?.textContent).toBe("Faisca");
    // O foco entrou no diálogo (no "fechar") em vez de ficar no card por trás.
    expect(dialogo.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(abrir);
  });

  it("o Tab fica preso no diálogo", () => {
    paginaDeJogadores("pt");
    abrirFichaDaFaisca();
    const dialogo = screen.getByRole("dialog");

    // Foco escapou para a página escondida sob o véu: o próximo Tab o traz de volta.
    screen.getByText("fora do diálogo").focus();
    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
    expect(dialogo.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });

  it("Esc fecha e o foco volta para o card que abriu a ficha", () => {
    paginaDeJogadores("pt");
    const abrir = abrirFichaDaFaisca();
    // A pessoa está DENTRO do diálogo (no "fechar") quando aperta Esc.
    screen.getByRole("button", { name: MESSAGES.pt.paginasHome.jogadorFechar }).focus();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(abrir);
  });
});

describe("PUB-08 — KDA da ficha no formato do idioma", () => {
  it("inglês: 3.33; português: 3,33", () => {
    paginaDeJogadores("en");
    abrirFichaDaFaisca();
    expect(screen.getByRole("dialog").textContent).toContain("3.33");
    expect(screen.getByRole("dialog").textContent).not.toMatch(/\d,\d{2}/);
    cleanup();

    paginaDeJogadores("pt");
    abrirFichaDaFaisca();
    expect(screen.getByRole("dialog").textContent).toContain("3,33");
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
