// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FichaDoJogadorComTema } from "@/components/times/ficha-do-jogador-com-tema";
import { PaginaDoTimeComTema } from "@/components/times/pagina-do-time-com-tema";
import { comCenario } from "@/components/times/util";
import { resolveElo, resolveRole } from "@/lib/design";
import { MESSAGES } from "@/lib/i18n/messages";
import type { DesignPlayer, DesignTeam } from "@/lib/roster";
import { TEMA_QUEIJO_MINAS } from "@/lib/temas/queijo-minas";
import { corDoTime, partesDoNome, temaDoTime, textoDoTema } from "@/lib/temas/registro";

/*
 * A página temática da Queijo Minas (26/10/2026), «O Expresso da Lua de Queijo»: o segundo
 * tema, o primeiro com cenário próprio (components/times/cenarios/estacao). O que o leitor de
 * tela lê, os textos do tema, a ordem do trem e a regra dos enfeites (aria-hidden e sem texto).
 */

const t = MESSAGES.pt.paginasHome;

function jogador(slug: string, nick: string, role: string, extra: Partial<DesignPlayer> = {}): DesignPlayer {
  return {
    id: slug,
    slug,
    nick: `${nick}#BR1`,
    displayNick: nick,
    name: slug,
    imageUrl: `/players/${slug}.jpeg`,
    mono: false,
    captain: false,
    elo: "Prata",
    eloMeta: resolveElo("Prata"),
    pts: 6,
    role1: role,
    roleMeta: resolveRole(role),
    teamId: "mare",
    teamName: "QUEIJO MINAS",
    teamSlug: "queijo-minas",
    teamColor: "#2fb3a8",
    reserva: false,
    saiu: false,
    noElenco: true,
    ...extra,
  } as DesignPlayer;
}

const ROSTER = [
  jogador("cachasa", "CACHASA", "TOP"),
  jogador("aura-mais-ego-67", "AURA MAIS EGO 67", "JUNG"),
  jogador("midas", "MIDAS", "SUP", { captain: true }),
  jogador("lelei-de-ozorio", "LELEI DE OZORIO", "MID"),
  jogador("lucrecia-pontius", "LUCRECIA PONTIUS", "ADC"),
];
const TIME: DesignTeam = {
  id: "mare",
  name: "QUEIJO MINAS",
  slug: "queijo-minas",
  color: "#2fb3a8",
  imageUrl: "/teams/queijo-minas.webp",
  roster: ROSTER,
  captain: ROSTER[2]!,
  total: 30,
};

function paginaDoTime() {
  return renderToStaticMarkup(
    <PaginaDoTimeComTema
      team={TIME}
      tema={TEMA_QUEIJO_MINAS}
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

/** O texto que o leitor de tela ouve: tudo fora de aria-hidden. */
function lidoPeloLeitor(el: Element): string {
  const copia = el.cloneNode(true) as Element;
  for (const oculto of copia.querySelectorAll('[aria-hidden="true"]')) oculto.remove();
  return copia.textContent ?? "";
}

describe("registro: o tema da Queijo Minas", () => {
  it("acha pelo slug; o id do draft (mare) sozinho não tem tema", () => {
    expect(temaDoTime("queijo-minas")).toBe(TEMA_QUEIJO_MINAS);
    expect(temaDoTime("mare")).toBeNull();
  });

  it("a cor do time no site é o ciano do farol; sem o slug, a da MARÉ", () => {
    expect(corDoTime({ id: "mare", slug: "queijo-minas" })).toBe("#3EE6F2");
    expect(corDoTime({ id: "mare", slug: "mare" })).toBe("#2fb3a8");
  });

  it("parte o nome pelo sufixo: QUEIJO grande, MINAS embaixo", () => {
    expect(partesDoNome("QUEIJO MINAS", TEMA_QUEIJO_MINAS.prefixo, TEMA_QUEIJO_MINAS.sufixo)).toEqual({
      assinatura: "MINAS",
      marca: "QUEIJO",
    });
  });

  it("os textos do tema saem no idioma da página; papel sem texto fica null", () => {
    expect(textoDoTema(TEMA_QUEIJO_MINAS, t, "capitao")).toBe("MAQUINISTA");
    expect(textoDoTema(TEMA_QUEIJO_MINAS, MESSAGES.en.paginasHome, "estrelando")).toBe("ALL ABOARD");
    expect(textoDoTema(temaDoTime("equipe-rx")!, t, "lema")).toBeNull();
  });

  it("comCenario soma a classe do cenário à da estrutura, pelo mesmo nome", () => {
    const c = comCenario({ casca: "base-casca", carta: "base-carta" }, { casca: "est-casca" });
    expect(c("casca", false, "carta")).toBe("base-casca est-casca base-carta");
    expect(comCenario({ casca: "b" })("casca")).toBe("b");
  });
});

describe("página temática da Queijo Minas", () => {
  it("o leitor de tela lê o nome uma vez; as 6 letras e a faixa do MINAS são aria-hidden", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("QUEIJO MINAS");
    const visual = h1.querySelector('[aria-hidden="true"]')!;
    expect(visual.querySelectorAll('[class*="letra"]')).toHaveLength(6);
  });

  it("o trem: quatro vagões e a locomotiva (o capitão) na frente, por último", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const nicks = [...doc.querySelectorAll("li h3")].map((h) => h.textContent);
    expect(nicks).toEqual(["CACHASA", "AURA MAIS EGO 67", "LELEI DE OZORIO", "LUCRECIA PONTIUS", "MIDAS"]);
    expect(doc.querySelectorAll('li a[href^="/jogadores/"]')).toHaveLength(5);
  });

  it("os textos do tema aparecem; MAQUINISTA na tela, CAPITÃO para o leitor", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const texto = doc.body.textContent ?? "";
    for (const trecho of [
      "A BORDO",
      "MAQUINISTA",
      "Mecânica duvidosa · entretenimento imaculado.",
      "Embarque imediato · pão de queijo não incluso.",
      "ORIGEM: MINAS GERAIS · DESTINO: SUMMONER'S RIFT",
      "EM VIAGEM DE 13 DE NOVEMBRO A 6 DE DEZEMBRO",
      "Nenhum queijo foi ferido durante as filmagens.",
    ]) {
      expect(texto).toContain(trecho);
    }
    const lido = lidoPeloLeitor(doc.body);
    expect(lido).toContain("CAPITÃO");
    expect(lido).not.toContain("MAQUINISTA");
    const carimbo = [...doc.querySelectorAll("p")].find((p) => p.textContent === "Ô TREM BÃO!")!;
    expect(carimbo.getAttribute("lang")).toBe("pt-BR");
  });

  it("o cenário estação está na página (e não o da RX)", () => {
    const html = paginaDoTime();
    expect(html).toContain('data-tema="queijo-minas"');
    expect(html).toContain('data-cenario="estacao"');
    expect(html).toMatch(/enfLua/);
    expect(html).toMatch(/enfTrilhos/);
    expect(html).not.toMatch(/enfCoroa|enfGrade/);
  });

  // Revisão de 26/10: se o time mudar de nome e o slug ficar, o tema continua valendo; o nome
  // inteiro vira a marca, e os espaços sumiam (letra por letra, sem quebra).
  it("nome de várias palavras: uma peça por palavra, letras numeradas no nome todo", () => {
    const html = renderToStaticMarkup(
      <PaginaDoTimeComTema
        team={{ ...TIME, name: "QUEIJO DE MINAS GERAIS" }}
        tema={TEMA_QUEIJO_MINAS}
        t={t}
        multiOpGg={{ ok: true, url: "https://op.gg/multisearch" } as never}
        temporada="4ª Edição"
        periodo={null}
      />,
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("QUEIJO DE MINAS GERAIS");
    const palavras = [...h1.querySelectorAll('[class*="palavra"]')];
    expect(palavras).toHaveLength(4);
    const letras = [...h1.querySelectorAll('[class*="letra"]')];
    expect(letras).toHaveLength(19);
    expect(letras.at(-1)!.getAttribute("style")).toContain("--i:18");
    expect(h1.querySelector('[aria-hidden="true"]')!.getAttribute("style")).toContain("--letras:6");
  });

  it("todo enfeite é aria-hidden e sem texto; todo svg é aria-hidden", () => {
    const html = paginaDoTime();
    expect(html.match(/class="[^"]*enf[A-Z]/g)?.length ?? 0).toBeGreaterThan(15);
    expect(enfeitesSemTexto(html)).toEqual([]);
  });
});

describe("ficha temática de um jogador da Queijo Minas", () => {
  const html = (player = ROSTER[2]!) =>
    renderToStaticMarkup(
      <FichaDoJogadorComTema
        player={player}
        team={TIME}
        tema={TEMA_QUEIJO_MINAS}
        t={t}
        tiles={[{ label: "PARTIDAS", val: "0" }]}
        opggUrl="https://op.gg/x"
        temporada="4ª Edição"
        voltar={{ href: "/times/queijo-minas", texto: t.jogadorVoltar }}
      />,
    );

  it("o nick é o h1, lido uma vez; OUTROS PASSAGEIROS com os 4 companheiros", () => {
    const doc = new DOMParser().parseFromString(html(), "text/html");
    expect(lidoPeloLeitor(doc.querySelector("h1")!)).toBe("MIDAS");
    const companheiros = [...doc.querySelectorAll('ul a[href^="/jogadores/"]')].map((a) => a.getAttribute("href"));
    expect(companheiros).toEqual([
      "/jogadores/cachasa",
      "/jogadores/aura-mais-ego-67",
      "/jogadores/lelei-de-ozorio",
      "/jogadores/lucrecia-pontius",
    ]);
    expect(doc.body.textContent).toContain("OUTROS PASSAGEIROS");
    expect(lidoPeloLeitor(doc.body)).toContain("CAPITÃO");
  });

  it("o retrato do Midas (foto deitada) usa a proporção do tema; o nick mede pela maior palavra", () => {
    const midas = html();
    expect(midas).toContain("--proporcao:3 / 2");
    const lucrecia = html(ROSTER[4]!);
    expect(lucrecia).not.toContain("--proporcao");
    expect(lucrecia).toContain("--maior-palavra:8");
  });

  it("entre os companheiros, o leitor de tela ouve quem é o capitão (a roda é só desenho)", () => {
    const doc = new DOMParser().parseFromString(html(ROSTER[0]!), "text/html");
    const midas = doc.querySelector('a[href="/jogadores/midas"]')!;
    expect(lidoPeloLeitor(midas)).toContain("CAPITÃO");
    const cachasaNaFichaDoMidas = new DOMParser()
      .parseFromString(html(), "text/html")
      .querySelector('a[href="/jogadores/cachasa"]')!;
    expect(lidoPeloLeitor(cachasaNaFichaDoMidas)).not.toContain("CAPITÃO");
  });

  it("todo enfeite é aria-hidden e sem texto (a lua atrás do retrato também)", () => {
    const ficha = html();
    expect(ficha).toMatch(/enfLuaRetrato/);
    expect(enfeitesSemTexto(ficha)).toEqual([]);
  });
});
