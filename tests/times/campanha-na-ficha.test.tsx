// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CampanhaDoJogador } from "@/components/times/campanha";
import cm from "@/components/times/campanha.module.css";
import { CAMPANHA_DOS_CENARIOS } from "@/components/times/cenarios/campanha-dos-cenarios";
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

function ficha(tema: TemaDoTime, campanha: Campanha, textos = t, localeTag = "pt-BR", formatos = MESSAGES.pt.compartilhados.formatos) {
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
      formatos={formatos}
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
    // Os 8 cenários têm ganchos, num registro só da ficha (fora de CENARIOS: a página do time não
    // baixa o CSS da campanha).
    const ganchos = CAMPANHA_DOS_CENARIOS[tema.cenario].classes;
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

  it("em inglês, os rótulos do resto do site: Bo3, JG e Group stage (nada de MD3, SEL, Regular season)", () => {
    // O caçador da ALFA: a rota no ranking por rota, a série (MD3) e o próximo desafio (MD3 · fase).
    const campanha = campanhaDoJogador(dataset(), id("alfa", "JUNGLE"));
    const doc = ficha(tema, campanha, en, "en-US", MESSAGES.en.compartilhados.formatos);
    const texto = doc.querySelector("section[data-campanha]")!.textContent ?? "";
    expect(texto).toContain("KDA among JG players");
    expect(texto).toContain("Bo3 · Group stage");
    expect(texto).not.toMatch(/MD[35]|SEL|Regular season/);
  });

  it("empate no ranking: a nota «empate divide a posição» e, no leitor de tela, com quantos", () => {
    // O caçador da ALFA empata em abates (2) com TOP, ADC e SUP da ALFA e os 5 da BETA (as mesmas
    // linhas nos dois jogos): mais 8. A MID está sozinha no topo das 4 métricas.
    const comEmpate = ficha(tema, campanhaDoJogador(dataset(), id("alfa", "JUNGLE")));
    const ranking = comEmpate.querySelector("section[data-campanha] ol li[data-metrica]")!.closest("li:not([data-metrica])")!;
    expect(ranking.textContent).toContain("empate divide a posição");
    const abates = comEmpate.querySelector('section[data-campanha] li[data-metrica="abates"]')!;
    expect(abates.hasAttribute("data-empate")).toBe(true);
    expect(lido(abates)).toContain("empate com mais 8");
    const semEmpate = ficha(tema, campanhaDoJogador(dataset(), id("alfa", "MID")));
    expect(semEmpate.querySelector("section[data-campanha]")!.textContent).not.toContain("empate divide a posição");
    expect(semEmpate.querySelector("section[data-campanha] [data-empate]")).toBeNull();
  });

  it("sem <aside> dentro da seção (o complementary aninhado que o axe acusava)", () => {
    const doc = ficha(tema, campanhaDoJogador(dataset(), id("alfa", "MID")));
    const secao = doc.querySelector("section[data-campanha]")!;
    expect(secao.querySelector("aside")).toBeNull();
    expect(doc.getElementById("tm-campanha-proximo")!.textContent).toBe(textoDoTema(tema, t, "campanhaProximo"));
  });

  it("o leitor de tela: o K/D/A por extenso e cada «VER PARTIDA» com o adversário", () => {
    const doc = ficha(tema, campanhaDoJogador(dataset(), id("alfa", "MID")));
    const serie = doc.querySelector(`ol[aria-labelledby="tm-campanha-resultados"] > li`)!;
    expect(lido(serie)).toContain("abates 9, mortes 2, assistências 6");
    expect(lido(serie)).not.toContain("9/2/6");
    expect(lido(serie.querySelector('a[href="/partidas/s1"]')!)).toContain("vs BETA");
    // O link do melhor jogo diz "Jogo 1" (o "J1" fica só à vista).
    const melhor = doc.querySelector('section[data-campanha] ul a[href="/partidas/s1"]')!;
    expect(lido(melhor)).toContain("Jogo 1");
    expect(lido(melhor)).not.toMatch(/J1/);
  });

  it("jogo lançado só com o vencedor: «sem K/D/A ainda», nunca «não jogou»", () => {
    const d = dataset();
    d.seriesMatches.find((s) => s.id === "s1")!.games.push({ winnerTeamId: "beta", mvpPlayerId: "", statsByPlayer: [] });
    const doc = ficha(tema, campanhaDoJogador(d, id("alfa", "MID")));
    const j3 = doc.querySelector('section[data-campanha] li[data-tipo="provisorio"]')!;
    expect(j3).not.toBeNull();
    expect(j3.textContent).toContain(t.campanhaProvisorio);
    expect(j3.textContent).not.toContain(t.campanhaNaoJogou);
  });

  it("série toda provisória: o aviso não afirma nada (pode ter jogado ali) e a série não vira dele", () => {
    const d = copia(cenario());
    d.seriesMatches.find((s) => s.id === "s1")!.games = [
      { winnerTeamId: "alfa", mvpPlayerId: "", statsByPlayer: [] },
      { winnerTeamId: "alfa", mvpPlayerId: "", statsByPlayer: [] },
    ];
    const doc = ficha(tema, campanhaDoJogador(d, id("alfa", "MID")));
    const secao = doc.querySelector("section[data-campanha]")!;
    expect(secao.textContent).toContain("Fulano ainda não tem jogo com K/D/A nesta edição.");
    expect(secao.textContent).not.toContain("ainda não entrou em quadra");
    expect(secao.textContent).not.toContain("depois do primeiro jogo");
    expect(secao.querySelectorAll('li[data-tipo="provisorio"]')).toHaveLength(0);
    expect(secao.querySelector("[data-sem-jogos]")).not.toBeNull();
  });

  it("quem só entrou como substituto que não pontua não lê «ainda não entrou em quadra»", () => {
    const d = dataset();
    d.seriesMatches.find((s) => s.id === "s1")!.games[1]!.statsByPlayer.push(
      linha("r1", 2, 1, 3, { naoPontua: true, teamId: "beta", champion: "Lux" }),
    );
    const doc = ficha(tema, campanhaDoJogador(d, "r1"));
    const texto = doc.querySelector("section[data-campanha]")!.textContent ?? "";
    expect(texto).toContain("Fulano entrou em 1 jogo como substituto, que não pontua no site");
    expect(texto).not.toContain("ainda não entrou em quadra");
  });

  it("quem saiu sem jogar: sem promessa de números, e o aviso na largura toda", () => {
    const d = dataset();
    d.players.find((p) => p.id === id("gama", "TOP"))!.saiuEm = "2026-11-19T00:00:00.000Z";
    const doc = ficha(tema, campanhaDoJogador(d, id("gama", "TOP")));
    const secao = doc.querySelector("section[data-campanha]")!;
    expect(secao.textContent).toContain("Fulano saiu do time sem jogar nesta edição.");
    expect(secao.textContent).not.toContain("depois do primeiro jogo");
    const grade = secao.querySelector("[data-sem-jogos]")!;
    expect(grade.hasAttribute("data-sem-lado")).toBe(true);
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
