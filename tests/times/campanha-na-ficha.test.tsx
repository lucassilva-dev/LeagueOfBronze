// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CampanhaDoJogador } from "@/components/times/campanha";
import cm from "@/components/times/campanha.module.css";
import { CENARIOS } from "@/components/times/cenarios";
import { FichaDoJogadorComTema } from "@/components/times/ficha-do-jogador-com-tema";
import { comCenario } from "@/components/times/util";
import { resolveElo, resolveRole } from "@/lib/design";
import { MESSAGES } from "@/lib/i18n/messages";
import { campanhaDoJogador, type CampanhaDoJogador as Campanha } from "@/lib/jogadores/campanha";
import type { DesignPlayer, DesignTeam } from "@/lib/roster";
import { temaDoTime, textoDoTema } from "@/lib/temas/registro";
import type { TemaDoTime } from "@/lib/temas/tipos";

import { cenario, copia, id, jogo, linha, linhasDoTime, validar } from "../torneio/_cenario-regra-6";

/*
 * A CAMPANHA na ficha (components/times/campanha.tsx), nos 8 temas e na ficha sem tema: o título
 * do tema, as peças com os ganchos do cenário, o que o leitor de tela ouve (V/D por extenso, o
 * placar por extenso, nada de pronome — o nick), o vazio de quem não jogou e o inglês.
 */

const t = MESSAGES.pt.paginasHome;
const en = MESSAGES.en.paginasHome;
const SLUGS = [
  "equipe-rx",
  "queijo-minas",
  "galacticos-do-bar",
  "fas-de-rosca-esporte-clube",
  "os-5-furiosos",
  "so-adc-bronze-clube",
  "os-5-sem-ping",
  "desorganizacao",
] as const;

function dataset() {
  const d = copia(cenario());
  d.seriesMatches.find((s) => s.id === "s1")!.games = [
    { ...jogo("alfa", [linha(id("alfa", "MID"), 9, 2, 6, { champion: "Ahri" }), ...linhasDoTime("alfa", [1, 2, 1], ["MID"]), ...linhasDoTime("beta", [1, 2, 1])]), durationMin: 30 },
    { ...jogo("alfa", [linha(id("alfa", "MID"), 4, 4, 4, { champion: "Lux" }), ...linhasDoTime("alfa", [1, 2, 1], ["MID"]), ...linhasDoTime("beta", [1, 2, 1])]), durationMin: 27 },
  ];
  const r = validar(d);
  if (!r.success) throw new Error("cenário inválido");
  return r.data;
}

function jogador(slug: string, tema: TemaDoTime): DesignPlayer {
  return {
    id: id("alfa", "MID"),
    slug,
    nick: "Fulano#BR1",
    displayNick: "Fulano",
    name: "Fulano de Tal",
    mono: false,
    captain: false,
    elo: "Platina",
    eloMeta: resolveElo("Platina"),
    pts: 5,
    role1: "MID",
    roleMeta: resolveRole("MID"),
    teamId: "alfa",
    teamName: "ALFA",
    teamSlug: tema.slug,
    teamColor: tema.cor,
    reserva: false,
    saiu: false,
    noElenco: true,
  } as DesignPlayer;
}

function ficha(tema: TemaDoTime, campanha: Campanha, textos = t, localeTag = "pt-BR") {
  const time: DesignTeam = { id: "alfa", name: "ALFA", slug: tema.slug, color: tema.cor, roster: [], captain: null, total: 30 };
  const html = renderToStaticMarkup(
    <FichaDoJogadorComTema
      player={jogador("fulano", tema)}
      team={time}
      tema={tema}
      t={textos}
      tiles={[{ label: "PARTIDAS", val: "2" }]}
      opggUrl={null}
      temporada="4ª Edição"
      voltar={{ href: "/jogadores", texto: textos.jogadorVoltar }}
      campanha={campanha}
      localeTag={localeTag}
      semCampeao="Campeão não informado"
    />,
  );
  return new DOMParser().parseFromString(html, "text/html");
}

/** O texto que o leitor de tela ouve: tudo fora de aria-hidden. */
function lido(el: Element): string {
  const copiaDoNo = el.cloneNode(true) as Element;
  for (const oculto of copiaDoNo.querySelectorAll('[aria-hidden="true"]')) oculto.remove();
  return (copiaDoNo.textContent ?? "").replace(/\s+/g, " ");
}

describe.each(SLUGS)("a campanha na ficha temática — %s", (slug) => {
  const tema = temaDoTime(slug)!;
  const campanha = campanhaDoJogador(dataset(), id("alfa", "MID"));
  const doc = ficha(tema, campanha);
  const secao = doc.querySelector("section[data-campanha]")!;

  it("a seção vem entre o herói e os companheiros, com o título do tema", () => {
    expect(secao).not.toBeNull();
    const titulo = doc.getElementById("tm-campanha-titulo")!;
    expect(titulo.textContent).toBe(textoDoTema(tema, t, "campanha"));
    expect(secao.getAttribute("aria-labelledby")).toBe("tm-campanha-titulo");
    expect(secao.previousElementSibling?.getAttribute("aria-labelledby")).toBe("tm-nick");
  });

  it("os subtítulos do tema e as peças da campanha", () => {
    expect(doc.getElementById("tm-campanha-resultados")!.textContent).toBe(textoDoTema(tema, t, "campanhaResultados"));
    expect(doc.getElementById("tm-campanha-campeoes")!.textContent).toBe(textoDoTema(tema, t, "campanhaCampeoes"));
    expect(secao.querySelectorAll("li[data-resultado]").length).toBeGreaterThan(0);
    expect(secao.querySelectorAll('a[href="/partidas/s1"]').length).toBeGreaterThan(0);
  });

  it("o gancho do cenário chega às peças (e o .raiz dele à raiz da ficha)", () => {
    const ganchos = CENARIOS[tema.cenario].classesDaCampanha;
    if (!ganchos) return; // tema ainda sem gancho: só a base
    const raiz = doc.querySelector(`[data-tema="${slug}"]`)!;
    if (ganchos.raiz) expect(raiz.classList.contains(ganchos.raiz)).toBe(true);
    if (ganchos.serie) expect(secao.getElementsByClassName(ganchos.serie).length).toBeGreaterThan(0);
  });

  it("o leitor de tela ouve as palavras, não as letras: Vitória, Jogo 1, o placar por extenso", () => {
    const serie = secao.querySelector(`ol[aria-labelledby="tm-campanha-resultados"] > li`)!;
    const ouvido = lido(serie);
    expect(ouvido).toContain("Placar da série: ALFA 2 a 0 BETA");
    expect(ouvido).toContain("Jogo 1");
    expect(ouvido).toContain("VITÓRIA");
    expect(ouvido).not.toMatch(/\bJ1\b/);
  });

  it("enfeite do cenário na campanha é aria-hidden e sem texto", () => {
    for (const el of secao.querySelectorAll("[class]")) {
      if (!/(^|\s|_)enf[A-Z]/.test(el.getAttribute("class") ?? "")) continue;
      expect(el.closest('[aria-hidden="true"]'), el.getAttribute("class") ?? "").not.toBeNull();
    }
  });
});

describe("a campanha — casos", () => {
  const tema = temaDoTime("equipe-rx")!;

  it("quem ainda não jogou vê o vazio com o nick (sem pronome) e o próximo desafio", () => {
    const campanha = campanhaDoJogador(dataset(), id("gama", "MID"));
    const doc = ficha(tema, { ...campanha });
    const secao = doc.querySelector("section[data-campanha]")!;
    expect(secao.textContent).toContain("Fulano ainda não entrou em quadra nesta edição.");
    expect(doc.getElementById("tm-campanha-proximo")!.textContent).toBe(textoDoTema(tema, t, "campanhaProximo"));
    expect(secao.querySelector('a[href="/partidas/s2"]')).not.toBeNull();
  });

  it("em inglês: títulos do tema, W/L e o ordinal em inglês", () => {
    const campanha = campanhaDoJogador(dataset(), id("alfa", "MID"));
    const doc = ficha(tema, campanha, en, "en-US");
    const secao = doc.querySelector("section[data-campanha]")!;
    expect(doc.getElementById("tm-campanha-titulo")!.textContent).toBe("THE LIGHTNING TRAIL");
    expect(secao.textContent).toContain("1st");
    expect(lido(secao)).toContain("WIN");
    expect(secao.textContent).not.toContain("1º");
  });

  it("a ficha sem tema usa a mesma peça com o bronze do site", () => {
    const campanha = campanhaDoJogador(dataset(), id("alfa", "MID"));
    const html = renderToStaticMarkup(
      <CampanhaDoJogador
        campanha={campanha}
        t={t}
        localeTag="pt-BR"
        semCampeao="—"
        nick="Fulano"
        idBase="ficha-campanha"
        c={comCenario(cm)}
        tituloClasse={cm.tituloPadrao!}
        titulos={{ campanha: t.campanhaTitulo, resultados: t.campanhaResultados, campeoes: t.campanhaCampeoes, proximo: t.campanhaProximo }}
        padrao
      />,
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    const secao = doc.querySelector("section[data-campanha]")!;
    expect(secao.classList.contains(cm.padrao!)).toBe(true);
    expect(doc.getElementById("ficha-campanha-titulo")!.textContent).toBe("A CAMPANHA");
  });
});
