// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

/**
 * O eco do aviso acima da doca, no celular.
 *
 * Quem salva pela doca está rolado lá embaixo, longe do aviso de verdade (o do topo). O eco
 * some sozinho (confirmação) ou com um toque (erro), e a dispensa é guardada pelo TEXTO. Sem
 * zerar essa dispensa a cada tentativa nova, o MESMO texto numa segunda vez não aparecia: um
 * erro repetido ao salvar passava calado, e quem salvou ficava sem saber que falhou de novo.
 *
 * O painel decide sozinho se está no celular (`matchMedia`), então aqui a largura é falsificada
 * — envolver com `ModoCompacto` não basta, o provedor de dentro venceria.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function dataset() {
  return {
    tournament: {
      name: "4ª Edição",
      lastUpdatedISO: "2026-10-20T00:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      status: "active",
    },
    archivedSeasons: [],
    teams: [],
    players: [],
    seriesMatches: [],
    standingsSeed: [],
  };
}

function prepararCelular() {
  vi.stubGlobal(
    "matchMedia",
    (consulta: string) =>
      ({
        matches: true,
        media: consulta,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
  vi.stubGlobal("scrollTo", () => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const corpo = url.includes("/api/admin/session")
        ? {
            configured: true,
            authorized: true,
            authMode: "accounts",
            dataProvider: "local",
            user: {
              username: "lucas",
              displayName: "Lucas",
              isMaster: true,
              scopes: [],
              mustChangePassword: false,
              legacy: false,
            },
          }
        : { dataset: dataset(), versao: 1 };
      return new Response(JSON.stringify(corpo), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  );
}

/** O eco é `aria-hidden` (o leitor de tela já ouviu o aviso do topo): procura pelo texto. */
function ecoVisivel(texto: string) {
  return Array.from(document.querySelectorAll<HTMLElement>('[aria-hidden="true"]')).find((el) =>
    el.textContent?.includes(texto),
  );
}

async function recarregarPelaFolhaDeSecoes() {
  fireEvent.click(screen.getByRole("button", { name: /Seções do painel\. Aberta/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Recarregar do arquivo/ }));
}

describe("aviso flutuante do celular", () => {
  it("o mesmo texto volta a aparecer numa tentativa nova depois de dispensado", async () => {
    prepararCelular();
    render(<AdminDashboardClient />);
    await screen.findByRole("button", { name: /Seções do painel\. Aberta/ });

    const texto = "Rascunho recarregado do arquivo local.";

    await recarregarPelaFolhaDeSecoes();
    await waitFor(() => expect(ecoVisivel(texto)).toBeTruthy());

    // Tocar no eco dispensa (e leva ao aviso do topo).
    fireEvent.click(ecoVisivel(texto)!);
    await waitFor(() => expect(ecoVisivel(texto)).toBeFalsy());

    // Segunda recarga: a resposta é igual, e o eco precisa aparecer de novo.
    await recarregarPelaFolhaDeSecoes();
    await waitFor(() => expect(ecoVisivel(texto)).toBeTruthy());
  });
});
