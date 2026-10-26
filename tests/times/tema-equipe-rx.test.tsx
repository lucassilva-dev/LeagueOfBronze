// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FichaDoJogadorComTema } from "@/components/times/ficha-do-jogador-com-tema";
import { PaginaDoTimeComTema } from "@/components/times/pagina-do-time-com-tema";
import { MESSAGES } from "@/lib/i18n/messages";
import type { DesignPlayer, DesignTeam } from "@/lib/roster";
import { resolveElo, resolveRole } from "@/lib/design";
import { TEMA_EQUIPE_RX } from "@/lib/temas/equipe-rx";
import { partesDoNome, temaDoTime } from "@/lib/temas/registro";

/*
 * A página temática da Equipe RX (26/10/2026) e a ficha temática do jogador: o que o leitor de
 * tela lê, a ordem do elenco e a regra dos enfeites (aria-hidden e sem texto).
 */

const t = MESSAGES.pt.paginasHome;

function jogador(slug: string, role: string, extra: Partial<DesignPlayer> = {}): DesignPlayer {
  return {
    id: slug,
    slug,
    nick: `${slug}#BR1`,
    displayNick: slug.toUpperCase(),
    name: slug,
    imageUrl: `/players/${slug}.jpeg`,
    mono: false,
    captain: false,
    elo: "Platina",
    eloMeta: resolveElo("Platina"),
    pts: 6,
    role1: role,
    roleMeta: resolveRole(role),
    teamId: "carmesim",
    teamName: "EQUIPE RX",
    teamSlug: "equipe-rx",
    teamColor: "#d9455f",
    reserva: false,
    saiu: false,
    noElenco: true,
    ...extra,
  } as DesignPlayer;
}

const ROSTER = [
  jogador("kratos", "TOP"),
  jogador("luiz", "JUNG"),
  jogador("maxmp", "SUP", { captain: true }),
  jogador("ironclaw", "MID"),
  jogador("iklra", "ADC"),
];
const TIME: DesignTeam = {
  id: "carmesim",
  name: "EQUIPE RX",
  slug: "equipe-rx",
  color: "#d9455f",
  imageUrl: "/teams/equipe-rx.webp",
  roster: ROSTER,
  captain: ROSTER[2]!,
  total: 30,
};

function paginaDoTime() {
  return renderToStaticMarkup(
    <PaginaDoTimeComTema
      team={TIME}
      tema={TEMA_EQUIPE_RX}
      t={t}
      multiOpGg={{ ok: true, url: "https://op.gg/multisearch" } as never}
      temporada="4ª Edição"
      periodo="de 13 de novembro a 6 de dezembro"
    />,
  );
}

/** Todo elemento com classe de enfeite (CSS Modules: `_enfAlgo_hash`) é aria-hidden ou mora num. */
function enfeitesSemTexto(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const problemas: string[] = [];
  for (const el of doc.querySelectorAll("[class]")) {
    if (!/(^|\s|_)enf[A-Z]/.test(el.getAttribute("class") ?? "")) continue;
    if (!el.closest('[aria-hidden="true"]')) problemas.push(`${el.tagName} sem aria-hidden: ${el.getAttribute("class")}`);
    const texto = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent?.trim()).join("");
    if (texto && !el.closest("svg")) problemas.push(`${el.tagName} com texto: ${texto}`);
  }
  for (const svg of doc.querySelectorAll("svg")) {
    if (!svg.closest('[aria-hidden="true"]')) problemas.push("svg sem aria-hidden");
  }
  return problemas;
}

describe("registro de temas", () => {
  it("acha pelo slug; time sem tema fica com o visual padrão", () => {
    expect(temaDoTime("equipe-rx")).toBe(TEMA_EQUIPE_RX);
    expect(temaDoTime("carmesim")).toBeNull();
    expect(temaDoTime("aurea")).toBeNull();
  });

  it("parte o nome como no escudo: EQUIPE em pincel, RX em metal", () => {
    expect(partesDoNome("EQUIPE RX", "EQUIPE")).toEqual({ assinatura: "EQUIPE", marca: "RX" });
    expect(partesDoNome("DESORGANIZAÇÃO", "EQUIPE")).toEqual({ assinatura: null, marca: "DESORGANIZAÇÃO" });
    expect(partesDoNome("EQUIPE", "EQUIPE")).toEqual({ assinatura: null, marca: "EQUIPE" });
  });
});

describe("página temática do time", () => {
  it("o leitor de tela lê o nome uma vez, e o desenho do título é aria-hidden", () => {
    const html = paginaDoTime();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(h1.textContent).toContain("EQUIPE RX");
    const visivelAoLeitor = [...h1.querySelectorAll("span")].filter((s) => !s.closest('[aria-hidden="true"]'));
    expect(visivelAoLeitor.map((s) => s.textContent)).toEqual(["EQUIPE RX"]);
  });

  it("cinco cartas, um h3 por nick, e o capitão fecha o elenco", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const nicks = [...doc.querySelectorAll("li h3")].map((h) => h.textContent);
    expect(nicks).toEqual(["KRATOS", "LUIZ", "IRONCLAW", "IKLRA", "MAXMP"]);
    expect(doc.querySelectorAll('li a[href^="/jogadores/"]')).toHaveLength(5);
    expect(doc.body.textContent).toContain("ESTRELANDO");
    expect(doc.body.textContent).toContain("EM CARTAZ DE 13 DE NOVEMBRO A 6 DE DEZEMBRO");
  });

  it("todo enfeite é aria-hidden e sem texto; todo svg é aria-hidden", () => {
    const html = paginaDoTime();
    // A conferência só vale se as classes de enfeite chegam ao HTML do teste.
    expect(html.match(/class="[^"]*enf[A-Z]/g)?.length ?? 0).toBeGreaterThan(15);
    expect(enfeitesSemTexto(html)).toEqual([]);
  });
});

describe("ficha temática do jogador", () => {
  const html = () =>
    renderToStaticMarkup(
      <FichaDoJogadorComTema
        player={ROSTER[2]!}
        team={TIME}
        tema={TEMA_EQUIPE_RX}
        t={t}
        tiles={[{ label: "PARTIDAS", val: "0" }]}
        opggUrl="https://op.gg/x"
        temporada="4ª Edição"
        voltar={{ href: "/times/equipe-rx", texto: t.jogadorVoltar }}
      />,
    );

  it("o nick é o h1, lido uma vez; os 4 companheiros têm link", () => {
    const doc = new DOMParser().parseFromString(html(), "text/html");
    const h1 = doc.querySelector("h1")!;
    const lidos = [...h1.querySelectorAll("span")].filter((s) => !s.closest('[aria-hidden="true"]'));
    expect(lidos.map((s) => s.textContent)).toEqual(["MAXMP"]);
    const companheiros = [...doc.querySelectorAll('ul a[href^="/jogadores/"]')].map((a) => a.getAttribute("href"));
    expect(companheiros).toEqual(["/jogadores/kratos", "/jogadores/luiz", "/jogadores/ironclaw", "/jogadores/iklra"]);
    expect(doc.body.textContent).toContain("CAPITÃO");
  });

  it("todo enfeite é aria-hidden e sem texto", () => {
    expect(enfeitesSemTexto(html())).toEqual([]);
  });
});
