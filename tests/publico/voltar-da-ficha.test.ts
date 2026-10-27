import { describe, expect, it } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";
import { ancoraDoJogador, fichaPelaLista, voltarDaFicha } from "@/lib/voltar-da-ficha";

/**
 * O «voltar» da ficha acompanha o caminho de entrada (pedido do Lucas, 26/10/2026): quem abriu
 * pela lista de /jogadores volta para a lista, no card de onde saiu; quem veio do time (ou de
 * um link direto) volta para o time.
 */

const textos = { voltarAoTime: "← VOLTAR AO ELENCO", voltarAosJogadores: "← VOLTAR AOS JOGADORES" };
const hades = { slug: "sr-hades", reserva: false, teamSlug: "galacticos-do-bar" };

describe("voltar da ficha do jogador", () => {
  it("aberta pela lista de /jogadores: volta para a lista, no card do jogador", () => {
    expect(fichaPelaLista("sr-hades")).toBe("/jogadores/sr-hades?de=jogadores");
    expect(voltarDaFicha(hades, "jogadores", textos)).toEqual({
      href: `/jogadores#${ancoraDoJogador("sr-hades")}`,
      texto: "← VOLTAR AOS JOGADORES",
    });
  });

  it("aberta pelo time ou por link direto: volta para o time", () => {
    expect(voltarDaFicha(hades, undefined, textos)).toEqual({ href: "/times/galacticos-do-bar", texto: "← VOLTAR AO ELENCO" });
  });

  it("origem desconhecida ou repetida na URL não vale (volta para o time)", () => {
    expect(voltarDaFicha(hades, "https://outro.site", textos).href).toBe("/times/galacticos-do-bar");
    expect(voltarDaFicha(hades, ["jogadores", "jogadores"], textos).href).toBe("/times/galacticos-do-bar");
  });

  it("o reserva não tem time: volta sempre para a lista", () => {
    expect(voltarDaFicha({ slug: "x", reserva: true, teamSlug: "" }, undefined, textos)).toEqual({
      href: "/jogadores",
      texto: "← VOLTAR AOS JOGADORES",
    });
  });

  it("os textos existem nos dois idiomas", () => {
    expect(MESSAGES.pt.paginasHome.jogadorVoltar).toMatch(/VOLTAR/);
    expect(MESSAGES.en.paginasHome.jogadorVoltar).toMatch(/BACK/);
  });
});
