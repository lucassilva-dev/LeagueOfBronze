// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FichaDoJogadorComTema } from "@/components/times/ficha-do-jogador-com-tema";
import { PaginaDoTimeComTema } from "@/components/times/pagina-do-time-com-tema";
import { resolveElo, resolveRole } from "@/lib/design";
import { MESSAGES } from "@/lib/i18n/messages";
import type { DesignPlayer, DesignTeam } from "@/lib/roster";
import { TEMA_EQUIPE_RX } from "@/lib/temas/equipe-rx";
import { TEMA_GALACTICOS_DO_BAR } from "@/lib/temas/galacticos-do-bar";
import { METRICAS, larguraDoNickEm, larguraEm, maiorPalavraEm } from "@/lib/temas/metricas";
import { TEMA_QUEIJO_MINAS } from "@/lib/temas/queijo-minas";
import { corDoTime, partesDoNome, temaDoTime, textoDoTema } from "@/lib/temas/registro";
import type { TemaDoTime } from "@/lib/temas/tipos";

/*
 * A página temática dos Galácticos do Bar (26/10/2026), «O Bar da Resenha»: o terceiro tema, o
 * primeiro com avatares redondos (fotos.formato = "medalhao") e com a largura do título MEDIDA
 * (lib/temas/metricas.ts). O que o leitor de tela lê, os textos, a ordem do elenco, a regra dos
 * enfeites e — o mais importante — que RX e Queijo Minas não ganharam nada disso.
 */

const t = MESSAGES.pt.paginasHome;

function jogador(slug: string, nick: string, role: string, extra: Partial<DesignPlayer> = {}): DesignPlayer {
  return {
    id: slug,
    slug,
    nick: `${nick}#BR1`,
    displayNick: nick,
    name: nick,
    imageUrl: `/players/${slug}-4a.webp`,
    mono: false,
    captain: false,
    elo: "Platina",
    eloMeta: resolveElo("Platina"),
    pts: 5,
    role1: role,
    roleMeta: resolveRole(role),
    teamId: "gelida",
    teamName: "Galácticos do Bar",
    teamSlug: "galacticos-do-bar",
    teamColor: "#B4C2FF",
    reserva: false,
    saiu: false,
    noElenco: true,
    ...extra,
  } as DesignPlayer;
}

const ROSTER = [
  jogador("dingobeell", "Dingobeell", "TOP"),
  jogador("iranildo-gari", "Iranildo Gari", "JUNG"),
  jogador("sr-hades", "Sr Hades", "MID"),
  jogador("sou-adc-nao-deus", "SOU ADC NÃO DEUS", "ADC", { captain: true }),
  jogador("z0e-baiana", "Z0E baiana", "SUP"),
];
const TIME: DesignTeam = {
  id: "gelida",
  name: "Galácticos do Bar",
  slug: "galacticos-do-bar",
  color: "#B4C2FF",
  imageUrl: "/teams/galacticos-do-bar.webp",
  roster: ROSTER,
  captain: ROSTER[3]!,
  total: 30,
};

function paginaDoTime(tema: TemaDoTime = TEMA_GALACTICOS_DO_BAR, time: DesignTeam = TIME) {
  return renderToStaticMarkup(
    <PaginaDoTimeComTema
      team={time}
      tema={tema}
      t={t}
      multiOpGg={{ ok: true, url: "https://op.gg/multisearch" } as never}
      temporada="4ª Edição"
      periodo="de 13 de novembro a 6 de dezembro"
    />,
  );
}

function ficha(player: DesignPlayer = ROSTER[3]!) {
  return renderToStaticMarkup(
    <FichaDoJogadorComTema
      player={player}
      team={TIME}
      tema={TEMA_GALACTICOS_DO_BAR}
      t={t}
      tiles={[{ label: "PARTIDAS", val: "0" }]}
      opggUrl="https://op.gg/x"
      temporada="4ª Edição"
      voltar={{ href: "/times/galacticos-do-bar", texto: t.jogadorVoltar }}
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

const KNEWAVE = METRICAS.knewave!;

describe("registro: o tema dos Galácticos do Bar", () => {
  it("acha pelo slug; o id do draft (gelida) sozinho não tem tema", () => {
    expect(temaDoTime("galacticos-do-bar")).toBe(TEMA_GALACTICOS_DO_BAR);
    expect(temaDoTime("gelida")).toBeNull();
  });

  it("a cor do time no site é o lavanda do neon; sem o slug, a da GÉLIDA", () => {
    expect(corDoTime({ id: "gelida", slug: "galacticos-do-bar" })).toBe("#B4C2FF");
    expect(corDoTime({ id: "gelida", slug: "gelida" })).toBe("#45a8d8");
  });

  it("parte o nome pelo sufixo, em qualquer caixa: GALÁCTICOS grande, DO BAR embaixo", () => {
    expect(partesDoNome("GALÁCTICOS DO BAR", undefined, "DO BAR")).toEqual({ assinatura: "DO BAR", marca: "GALÁCTICOS" });
    expect(partesDoNome("Galácticos do Bar", undefined, "DO BAR")).toEqual({ assinatura: "do Bar", marca: "Galácticos" });
  });

  it("os textos do tema saem no idioma da página", () => {
    expect(textoDoTema(TEMA_GALACTICOS_DO_BAR, t, "capitao")).toBe("DONO DO CANECO");
    expect(textoDoTema(TEMA_GALACTICOS_DO_BAR, MESSAGES.en.paginasHome, "estrelando")).toBe("TONIGHT'S LINEUP");
    expect(textoDoTema(TEMA_GALACTICOS_DO_BAR, MESSAGES.en.paginasHome, "carimbo")).toBe("FIADO SÓ AMANHÃ");
  });
});

describe("a largura medida da Knewave (lib/temas/metricas.ts)", () => {
  it("GALÁCTICOS = 5,44 em de avanço + 10 × 0,01 + 0,32 de tinta = 5,86 em", () => {
    expect(maiorPalavraEm("Galácticos", KNEWAVE)).toBe(5.86);
    expect(maiorPalavraEm("GALÁCTICOS", KNEWAVE)).toBe(5.86); // o acento decomposto vira um só
  });

  it("caractere fora da tabela conta como o mais largo medido (nunca estoura)", () => {
    expect(larguraEm("ㅤ", KNEWAVE)).toBe(1.33); // 1 + 0,01 + 0,32
    expect(KNEWAVE.padrao).toBeGreaterThanOrEqual(Math.max(...Object.values(KNEWAVE.avancos)));
  });

  it("nick da ficha: até duas linhas, só entre palavras; uma linha quando ela não encolhe demais", () => {
    expect(larguraDoNickEm("SOU ADC NÃO DEUS", KNEWAVE)).toBe(4.9); // SOU ADC / NÃO DEUS
    expect(larguraDoNickEm("Iranildo Gari", KNEWAVE)).toBe(7.124); // uma linha
    expect(larguraDoNickEm("Sr Hades", KNEWAVE)).toBe(4.668);
    expect(larguraDoNickEm("Dingobeell", KNEWAVE)).toBe(5.856);
  });

  it("RX e Queijo Minas não têm métrica: a página delas não muda", () => {
    expect(METRICAS[TEMA_EQUIPE_RX.fontes.titulo]).toBeUndefined();
    expect(METRICAS[TEMA_QUEIJO_MINAS.fontes.titulo]).toBeUndefined();
  });
});

describe("página temática dos Galácticos do Bar", () => {
  it("o leitor de tela lê o nome uma vez; as 10 letras são aria-hidden; o título leva a largura medida", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("Galácticos do Bar");
    const visual = h1.querySelector('[aria-hidden="true"]')!;
    expect(visual.querySelectorAll('[class*="letra"]')).toHaveLength(10);
    expect(visual.getAttribute("style")).toContain("--largura-em:5.86");
  });

  it("um nome gravado com o acento decomposto continua com 10 letras", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(TEMA_GALACTICOS_DO_BAR, { ...TIME, name: "Galácticos do Bar" }), "text/html");
    expect(doc.querySelectorAll('h1 [class*="letra"]')).toHaveLength(10);
  });

  it("a escalação: TOP, JUNG, MID, SUP e o dono do caneco (o capitão) por último", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const nicks = [...doc.querySelectorAll("li h3")].map((h) => h.textContent);
    expect(nicks).toEqual(["Dingobeell", "Iranildo Gari", "Sr Hades", "Z0E baiana", "SOU ADC NÃO DEUS"]);
    expect(doc.querySelectorAll('li a[href^="/jogadores/"]')).toHaveLength(5);
    expect(doc.querySelector("ul[data-n]")!.getAttribute("style")).toContain("--maior-palavra-em:5.856");
  });

  it("os textos do tema aparecem; DONO DO CANECO na tela, CAPITÃO para o leitor", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const texto = doc.body.textContent ?? "";
    for (const trecho of [
      "ESCALAÇÃO DE HOJE",
      "DONO DO CANECO",
      "FUTEBOL + AMIGOS + CERVEJA = FELICIDADE",
      "Tática da casa: tudo pro ADC.",
      "MESA 5 · PEDIDO: 1 TAÇA, BEM GELADA",
      "AO VIVO DE 13 DE NOVEMBRO A 6 DE DEZEMBRO",
      "Beba com moderação · jogue sem moderação nenhuma.",
    ]) {
      expect(texto).toContain(trecho);
    }
    const lido = lidoPeloLeitor(doc.body);
    expect(lido).toContain("CAPITÃO");
    expect(lido).not.toContain("DONO DO CANECO");
    const carimbo = [...doc.querySelectorAll("p")].find((p) => p.textContent === "FIADO SÓ AMANHÃ")!;
    expect(carimbo.getAttribute("lang")).toBe("pt-BR");
  });

  it("o cenário boteco: lousa atrás do elenco, TV na cartela, fotos em medalhão", () => {
    const html = paginaDoTime();
    expect(html).toContain('data-tema="galacticos-do-bar"');
    expect(html).toContain('data-cenario="boteco"');
    expect(html).toContain('data-fotos="medalhao"');
    expect(html).toMatch(/enfLousa/);
    expect(html).toMatch(/enfTelaCartela/);
    expect(html).toMatch(/enfLetreiro/);
    expect(html).not.toMatch(/enfCoroa|enfGrade|enfLua|enfTrilhos/);
  });

  it("todo enfeite é aria-hidden e sem texto; todo svg é aria-hidden", () => {
    const html = paginaDoTime();
    expect(html.match(/class="[^"]*enf[A-Z]/g)?.length ?? 0).toBeGreaterThan(25);
    expect(enfeitesSemTexto(html)).toEqual([]);
  });
});

describe("RX e Queijo Minas não ganham nada do boteco", () => {
  it.each([TEMA_EQUIPE_RX, TEMA_QUEIJO_MINAS])("$slug: sem medalhão, sem largura medida, sem lousa nem TV", (tema) => {
    const html = paginaDoTime(tema, { ...TIME, name: tema === TEMA_EQUIPE_RX ? "EQUIPE RX" : "QUEIJO MINAS", slug: tema.slug });
    expect(html).not.toContain("data-fotos");
    expect(html).not.toContain("--largura-em");
    expect(html).not.toContain("--maior-palavra-em");
    expect(html).not.toMatch(/enfLousa|enfTela/);
  });
});

describe("ficha temática de um jogador dos Galácticos do Bar", () => {
  it("o nick é o h1, lido uma vez, com a largura de duas linhas; A MESA TODA com os 4 companheiros", () => {
    const doc = new DOMParser().parseFromString(ficha(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("SOU ADC NÃO DEUS");
    expect(h1.querySelector('[aria-hidden="true"]')!.getAttribute("style")).toContain("--largura-nick-em:4.9");
    const companheiros = [...doc.querySelectorAll('ul a[href^="/jogadores/"]')].map((a) => a.getAttribute("href"));
    expect(companheiros).toEqual([
      "/jogadores/dingobeell",
      "/jogadores/iranildo-gari",
      "/jogadores/sr-hades",
      "/jogadores/z0e-baiana",
    ]);
    expect(doc.body.textContent).toContain("A MESA TODA");
    expect(lidoPeloLeitor(doc.body)).toContain("CAPITÃO");
  });

  it("entre os companheiros, o leitor de tela ouve quem é o capitão (o caneco é só desenho)", () => {
    const doc = new DOMParser().parseFromString(ficha(ROSTER[0]!), "text/html");
    expect(lidoPeloLeitor(doc.querySelector('a[href="/jogadores/sou-adc-nao-deus"]')!)).toContain("CAPITÃO");
  });

  it("todo enfeite é aria-hidden e sem texto (a bolacha atrás do retrato também)", () => {
    const html = ficha();
    expect(html).toContain('data-fotos="medalhao"');
    expect(html).toMatch(/enfBolacha/);
    expect(enfeitesSemTexto(html)).toEqual([]);
  });
});

describe("o chope nas letras é PINTURA que nunca esconde", () => {
  const css = readFileSync(path.join(process.cwd(), "components/times/cenarios/boteco.module.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const keyframe = (nome: string) => new RegExp(`@keyframes ${nome}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css)?.[1] ?? "";

  it("tiraChope só mexe no nível e na espuma; borbulha só na posição do fundo", () => {
    const declaradas = (corpo: string) =>
      [...corpo.matchAll(/([\w-]+)\s*:/g)].map((m) => m[1]).filter((p) => p !== "animation-timing-function");
    expect(new Set(declaradas(keyframe("tiraChope")))).toEqual(new Set(["--chope-nivel", "--chope-espuma"]));
    expect(new Set(declaradas(keyframe("borbulha")))).toEqual(new Set(["background-position"]));
  });

  it("os valores finais estão declarados na regra (sem @property, o var() continua válido)", () => {
    expect(css).toMatch(/\.raiz \.letra \.cromo \{[^}]*--chope-nivel: 100%;[^}]*--chope-espuma: 36%;/);
    // e há tinta sólida antes do background-clip
    expect(css).toMatch(/\.raiz \.cromo \{\s*color: var\(--tm-metal-meio\);/);
  });
});
