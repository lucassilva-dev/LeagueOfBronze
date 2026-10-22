// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminBackupPanel } from "@/components/admin/admin-backup-panel";
import { SorteioAoVivo } from "@/components/admin/sorteio-ao-vivo";
import { baixarBackupDoServidor, carimboDeBrasilia } from "@/components/admin/ui";
import { compartilhados } from "@/lib/i18n/messages/compartilhados";

/**
 * Detalhes que aparecem na tela projetada e no arquivo de backup:
 *  - PNL-14: a cor da revelação de lados é a do LADO, não a do time;
 *  - PNL-07: sortear uma série que o servidor não tem não promete "pode sortear de novo";
 *  - PNL-16: o nome de reserva do backup no relógio de Brasília;
 *  - PNL-12: importar sem a permissão vem desligado;
 *  - PNL-08: letras e semente de um sorteio só aparecem com a carta que ele deu.
 */

const roteador = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => roteador }));

const { SeriesLiveDraw } = await import("@/components/series-live-draw");

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

/** Sem animação: a revelação sai assim que o servidor responde. */
function semAnimacao() {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("reduce"),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  }));
}

function cerimonia(corDoTime: (id: string) => string = () => "#d9455f") {
  return render(
    <SorteioAoVivo
      aberto
      onFechar={() => {}}
      serieId="4a-jogo-05"
      teamAId="anil"
      teamBId="carmesim"
      nomeDoTime={(id) => ({ anil: "Anil", carmesim: "Carmesim" })[id] ?? id}
      corDoTime={corDoTime}
      podeLados
      podeCartas
      onSorteado={() => {}}
    />,
  );
}

describe("revelação de lados (PNL-14)", () => {
  it("o time vermelho que ganha o azul aparece em AZUL, com o selo azul", async () => {
    semAnimacao();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json({
          ok: true,
          sorteio: { tipo: "lados", semente: "s".repeat(32), autor: "lucas", resultado: "carmesim", emISO: "2026-11-21T21:50:00.000Z" },
          blueSideTeamId: "carmesim",
          cardsUsed: [],
          vezes: 1,
          versao: 0,
          versaoLida: 0,
          sorteios: [],
        }),
      ),
    );
    cerimonia();
    fireEvent.click(screen.getAllByRole("button", { name: /sortear lados/i })[0]!);

    const selo = await screen.findByText("LADO AZUL");
    // #4d9bff, o azul do lado — e não o #d9455f do Carmesim.
    expect(selo.style.background).toMatch(/rgb\(77, 155, 255\)|#4d9bff/i);
    expect(selo.parentElement!.style.border).toMatch(/rgb\(77, 155, 255\)|#4d9bff/i);
  });
});

describe("sortear série que o servidor não tem (PNL-07)", () => {
  it("o 404 manda salvar a série, em vez de 'pode sortear de novo'", async () => {
    semAnimacao();
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "Série não encontrada." }, 404)));
    cerimonia();
    fireEvent.click(screen.getAllByRole("button", { name: /sortear lados/i })[0]!);

    await screen.findByText(/salve a série no painel e sorteie depois/);
    expect(screen.queryByText(/pode sortear de novo/)).toBeNull();
  });
});

describe("nome de reserva do backup (PNL-16)", () => {
  it("22:30 de 21/11 em Brasília é 21/11, não 22/11", () => {
    expect(carimboDeBrasilia(new Date("2026-11-22T01:30:00.000Z"))).toBe("2026-11-21-22-30-00");
  });

  it("sem Content-Disposition, o arquivo baixa com o carimbo de Brasília", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-22T01:30:00.000Z"));
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} }));
    const nome = await baixarBackupDoServidor(new Response("{}"));
    expect(nome).toBe("leagueofbronze-backup-2026-11-21-22-30-00.json");
  });
});

describe("importar sem a permissão (PNL-12)", () => {
  it("os cartões de importação vêm desligados e o aviso diz por quê", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal("fetch", vi.fn(async () => json({ dataset: { tournament: { name: "4ª" }, teams: [], players: [], seriesMatches: [], archivedSeasons: [] }, versao: 1 })));
    render(<AdminBackupPanel onImportFile={async () => {}} onImportText={async () => {}} podeImportar={false} />);

    expect(screen.getByText("Importar exige uma permissão que esta conta não tem")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Escolher arquivo" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByPlaceholderText(/Cole aqui um backup/) as HTMLTextAreaElement).disabled).toBe(true);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });
});

describe("página da partida depois de uma correção manual de carta (PNL-08)", () => {
  const times = { a: { id: "time-a", name: "Anil" }, b: { id: "time-b", name: "Carmesim" } };

  function pagina(cartaNaTela: string, ultimo: Record<string, unknown>) {
    vi.stubGlobal("fetch", vi.fn(async () => json({ authorized: false })));
    render(
      <SeriesLiveDraw
        seriesId="4a-jogo-05"
        teamA={times.a}
        teamB={times.b}
        initialCards={[{ teamId: "time-a", cardId: cartaNaTela }]}
        initialUltimoCarta={ultimo as never}
      />,
    );
  }

  it("sorteio de verdade, carta igual: letras e semente à vista", () => {
    pagina("ABCDRAFT", {
      tipo: "carta",
      semente: "abc123",
      autor: "nakay",
      teamId: "time-a",
      resultado: "ABCDRAFT",
      detalhe: { letras: ["A", "C"], campeoes: 30 },
    });
    expect(screen.getByText("A · C")).toBeTruthy();
    expect(screen.getByText(/semente: abc123/)).toBeTruthy();
  });

  it("correção à mão por último: sem letras antigas e sem 'semente:' vazio", () => {
    pagina("TUDO_LIBERADO", {
      tipo: "carta_manual",
      semente: "",
      autor: "lucas",
      teamId: "time-a",
      resultado: "TUDO_LIBERADO",
      detalhe: { sobrescreveu: "ABCDRAFT" },
    });
    expect(screen.queryByText(/Letras sorteadas/)).toBeNull();
    expect(screen.queryByText(/semente:/)).toBeNull();
  });

  it("correção à mão por último: a procedência diz quem corrigiu («correção manual por …»)", () => {
    pagina("TUDO_LIBERADO", {
      tipo: "carta_manual",
      semente: "",
      autor: "lucas",
      teamId: "time-a",
      resultado: "TUDO_LIBERADO",
      detalhe: { sobrescreveu: "ABCDRAFT" },
    });
    expect(screen.getByText("correção manual por lucas")).toBeTruthy();
    expect(screen.queryByText(/sorteado por/)).toBeNull();
  });

  it("no site em inglês, a mesma linha sai traduzida", () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ authorized: false })));
    render(
      <SeriesLiveDraw
        seriesId="4a-jogo-05"
        teamA={times.a}
        teamB={times.b}
        initialCards={[{ teamId: "time-a", cardId: "TUDO_LIBERADO" }]}
        initialUltimoCarta={{ tipo: "carta_manual", semente: "", autor: "lucas", teamId: "time-a", resultado: "TUDO_LIBERADO" } as never}
        textos={compartilhados.en}
      />,
    );
    expect(screen.getByText("manual correction by lucas")).toBeTruthy();
  });

  it("sorteio de verdade por último: continua a linha da semente, sem «correção manual»", () => {
    pagina("ABCDRAFT", {
      tipo: "carta",
      semente: "abc123",
      autor: "nakay",
      teamId: "time-a",
      resultado: "ABCDRAFT",
    });
    expect(screen.getByText(/sorteado por nakay/)).toBeTruthy();
    expect(screen.queryByText(/correção manual/)).toBeNull();
  });

  it("registro de sorteio antigo com a carta já trocada: as letras dele não descrevem a carta na tela", () => {
    pagina("TUDO_LIBERADO", {
      tipo: "carta",
      semente: "abc123",
      autor: "nakay",
      teamId: "time-a",
      resultado: "ABCDRAFT",
      detalhe: { letras: ["A", "C"] },
    });
    expect(screen.queryByText("A · C")).toBeNull();
  });
});
