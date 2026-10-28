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
import { TEMA_FAS_DE_ROSCA } from "@/lib/temas/fas-de-rosca-esporte-clube";
import { TEMA_GALACTICOS_DO_BAR } from "@/lib/temas/galacticos-do-bar";
import { METRICAS, larguraDoNickEm, larguraEm, maiorPalavraEm } from "@/lib/temas/metricas";
import { TEMA_QUEIJO_MINAS } from "@/lib/temas/queijo-minas";
import { corDoTime, partesDoNome, temaDoTime, textoDoTema } from "@/lib/temas/registro";
import type { PapelDoTexto, TemaDoTime } from "@/lib/temas/tipos";

/*
 * A página temática dos Fãs de Rosca Esporte Clube (28/10/2026), «Dia de Braço»: a academia do
 * time às 6h (cenário `academia`). O primeiro tema com o nome PARTIDO EM DOIS TAMANHOS (FÃS DE
 * menor, ROSCA grande; no computador, dos dois lados do escudo) e o segundo com a largura do
 * título medida (Sofia Sans Extra Condensed 900 itálico). Confere o leitor de tela, os textos nos
 * dois idiomas, a ordem do elenco, as métricas, a regra dos enfeites, o CSS do cenário (2D, poucos
 * laços, o movimento reduzido) e que RX, Queijo Minas e Galácticos não ganharam nada disso.
 */

const t = MESSAGES.pt.paginasHome;

function jogador(slug: string, nick: string, tag: string, role: string, elo: string, extra: Partial<DesignPlayer> = {}): DesignPlayer {
  return {
    id: slug,
    slug,
    nick: `${nick}#${tag}`,
    displayNick: nick,
    name: nick,
    imageUrl: `/players/${slug}-4a.webp`,
    mono: false,
    captain: false,
    elo,
    eloMeta: resolveElo(elo),
    pts: 5,
    role1: role,
    roleMeta: resolveRole(role),
    teamId: "seiva",
    teamName: "FÃS DE ROSCA ESPORTE CLUBE",
    teamSlug: "fas-de-rosca-esporte-clube",
    teamColor: "#FFA3C8",
    reserva: false,
    saiu: false,
    noElenco: true,
    ...extra,
  } as DesignPlayer;
}

// O elenco de produção (28/10): o capitão é o vidotti agiota, da selva.
const ROSTER = [
  jogador("tapa-de-doido", "Tapa de Doido", "ATS", "TOP", "Esmeralda"),
  jogador("vidotti-agiota", "vidotti agiota", "BR1", "JUNG", "Diamante", { captain: true }),
  jogador("d1elzera", "D1elzera", "GOAT", "MID", "Mestre"),
  jogador("omegafuria", "OmegaFuria", "2929", "ADC", "Bronze"),
  jogador("saborenergetico", "SaborEnergetico", "1777", "SUP", "Prata"),
];
const TIME: DesignTeam = {
  id: "seiva",
  name: "FÃS DE ROSCA ESPORTE CLUBE",
  slug: "fas-de-rosca-esporte-clube",
  color: "#FFA3C8",
  imageUrl: "/teams/fas-de-rosca-esporte-clube.webp",
  roster: ROSTER,
  captain: ROSTER[1]!,
  total: 29,
};

function paginaDoTime(tema: TemaDoTime = TEMA_FAS_DE_ROSCA, time: DesignTeam = TIME) {
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

function ficha(player: DesignPlayer = ROSTER[1]!) {
  return renderToStaticMarkup(
    <FichaDoJogadorComTema
      player={player}
      team={TIME}
      tema={TEMA_FAS_DE_ROSCA}
      t={t}
      tiles={[{ label: "PARTIDAS", val: "0" }]}
      opggUrl="https://op.gg/x"
      temporada="4ª Edição"
      voltar={{ href: "/times/fas-de-rosca-esporte-clube", texto: t.jogadorVoltar }}
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

const SOFIA = METRICAS["sofia-extra-condensada"]!;

describe("registro: o tema dos Fãs de Rosca", () => {
  it("acha pelo slug; o id do draft (seiva) sozinho não tem tema", () => {
    expect(temaDoTime("fas-de-rosca-esporte-clube")).toBe(TEMA_FAS_DE_ROSCA);
    expect(temaDoTime("seiva")).toBeNull();
    expect(TEMA_FAS_DE_ROSCA.cenario).toBe("academia");
    expect(TEMA_FAS_DE_ROSCA.fontes).toEqual({ titulo: "sofia-extra-condensada", assinatura: "kaushan" });
  });

  it("a cor do time no site é o rosa do glacê; sem o slug, a da SEIVA", () => {
    expect(corDoTime({ id: "seiva", slug: "fas-de-rosca-esporte-clube" })).toBe("#FFA3C8");
    expect(corDoTime({ id: "seiva", slug: "seiva" })).toBe("#8fc23f");
  });

  it("parte o nome pelo sufixo, em qualquer caixa: FÃS DE ROSCA grande, ESPORTE CLUBE embaixo", () => {
    expect(partesDoNome("FÃS DE ROSCA ESPORTE CLUBE", undefined, "ESPORTE CLUBE")).toEqual({
      assinatura: "ESPORTE CLUBE",
      marca: "FÃS DE ROSCA",
    });
    expect(partesDoNome("Fãs de Rosca Esporte Clube", undefined, "ESPORTE CLUBE")).toEqual({
      assinatura: "Esporte Clube",
      marca: "Fãs de Rosca",
    });
  });

  it("os 9 textos do tema saem nos dois idiomas (o TÁ PAGO fica em português)", () => {
    const pt: Record<PapelDoTexto, string> = {
      lema: "Ninguém aqui pula dia de braço.",
      estrelando: "SÓCIOS EM DIA",
      aviso: "Mensalidade atrasada? Acerta com o personal (ele cobra juros).",
      capitao: "PERSONAL",
      emCartaz: "QUENTINHO {periodo}",
      destino: "Pós-treino: 5 roscas pra viagem.",
      carimbo: "TÁ PAGO",
      fecho: "Contém glúten. E braço demais.",
      companheiros: "PARCEIROS DE TREINO",
    };
    const en: Record<PapelDoTexto, string> = {
      lema: "Nobody here skips arm day.",
      estrelando: "PAID-UP MEMBERS",
      aviso: "Behind on your dues? Settle up with the coach (he charges interest).",
      capitao: "COACH",
      emCartaz: "FRESH OUT OF THE OVEN {periodo}",
      destino: "Post-workout: 5 donuts to go.",
      carimbo: "TÁ PAGO",
      fecho: "Contains gluten. And way too much arm.",
      companheiros: "GYM BUDDIES",
    };
    for (const papel of Object.keys(pt) as PapelDoTexto[]) {
      expect(textoDoTema(TEMA_FAS_DE_ROSCA, t, papel)).toBe(pt[papel]);
      expect(textoDoTema(TEMA_FAS_DE_ROSCA, MESSAGES.en.paginasHome, papel)).toBe(en[papel]);
    }
  });
});

describe("a largura medida da Sofia Sans Extra Condensed (lib/temas/metricas.ts)", () => {
  it("ROSCA = 2,219 em de avanço + 5 × 0,02 + 0,36 de tinta = 2,679 em; FÃS DE mede quase o mesmo", () => {
    expect(maiorPalavraEm("FÃS DE ROSCA", SOFIA)).toBe(2.679);
    expect(maiorPalavraEm("FÃS DE ROSCA", SOFIA)).toBe(2.679); // o acento decomposto vira um só
    expect(larguraEm("FÃS DE", SOFIA)).toBe(2.684);
  });

  it("caractere fora da tabela conta como o mais largo medido (nunca estoura)", () => {
    expect(larguraEm("ㅤ", SOFIA)).toBe(1.38); // 1 + 0,02 + 0,36
    expect(SOFIA.padrao).toBeGreaterThanOrEqual(Math.max(...Object.values(SOFIA.avancos)));
  });

  it("nick da ficha: até duas linhas, só entre palavras", () => {
    expect(larguraDoNickEm("Tapa de Doido", SOFIA)).toBe(3.185); // TAPA DE / DOIDO
    expect(larguraDoNickEm("vidotti agiota", SOFIA)).toBe(3.087); // VIDOTTI / AGIOTA
    expect(larguraDoNickEm("D1elzera", SOFIA)).toBe(3.775);
    expect(larguraDoNickEm("OmegaFuria", SOFIA)).toBe(4.847);
    expect(larguraDoNickEm("SaborEnergetico", SOFIA)).toBe(6.92); // uma palavra: nunca parte
  });

  it("a Knewave dos Galácticos continua igual; RX e Queijo Minas seguem sem métrica", () => {
    expect(maiorPalavraEm("Galácticos", METRICAS.knewave!)).toBe(5.86);
    expect(METRICAS[TEMA_EQUIPE_RX.fontes.titulo]).toBeUndefined();
    expect(METRICAS[TEMA_QUEIJO_MINAS.fontes.titulo]).toBeUndefined();
  });
});

describe("página temática dos Fãs de Rosca", () => {
  it("o leitor de tela lê o nome uma vez; as 10 letras são aria-hidden; o título leva a largura medida", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("FÃS DE ROSCA ESPORTE CLUBE");
    const visual = h1.querySelector('[aria-hidden="true"]')!;
    expect(visual.querySelectorAll('[class*="letra"]')).toHaveLength(10);
    expect(visual.querySelectorAll('[class*="palavra"]')).toHaveLength(3);
    expect(visual.getAttribute("style")).toContain("--largura-em:2.679");
    expect(visual.textContent).toContain("ESPORTE CLUBE");
  });

  it("um nome gravado com o acento decomposto continua com 10 letras", () => {
    const html = paginaDoTime(TEMA_FAS_DE_ROSCA, { ...TIME, name: "FÃS DE ROSCA ESPORTE CLUBE" });
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelectorAll('h1 [class*="letra"]')).toHaveLength(10);
  });

  it("o elenco: TOP, MID, ADC, SUP e o personal (o capitão) por último, cada um no seu enquadramento", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    expect([...doc.querySelectorAll("li h3")].map((h) => h.textContent)).toEqual([
      "Tapa de Doido",
      "D1elzera",
      "OmegaFuria",
      "SaborEnergetico",
      "vidotti agiota",
    ]);
    expect(doc.querySelectorAll('li a[href^="/jogadores/"]')).toHaveLength(5);
    expect(doc.querySelector("ul[data-n]")!.getAttribute("style")).toContain("--maior-palavra-em:6.92");
    const focos = [...doc.querySelectorAll('li [style*="--foco"]')].map((el) => el.getAttribute("style"));
    expect(focos).toEqual(["--foco:58% 22%", "--foco:47% 40%", "--foco:50% 26%", "--foco:47% 12%", "--foco:48% 36%"]);
  });

  it("os textos do tema aparecem; PERSONAL na tela, CAPITÃO para o leitor", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const texto = doc.body.textContent ?? "";
    for (const trecho of [
      "SÓCIOS EM DIA",
      "PERSONAL",
      "Ninguém aqui pula dia de braço.",
      "Mensalidade atrasada? Acerta com o personal (ele cobra juros).",
      "Pós-treino: 5 roscas pra viagem.",
      "QUENTINHO DE 13 DE NOVEMBRO A 6 DE DEZEMBRO",
      "Contém glúten. E braço demais.",
    ]) {
      expect(texto).toContain(trecho);
    }
    const lido = lidoPeloLeitor(doc.body);
    expect(lido).toContain("CAPITÃO");
    expect(lido).not.toContain("PERSONAL");
    const carimbo = [...doc.querySelectorAll("p")].find((p) => p.textContent === "TÁ PAGO")!;
    expect(carimbo.getAttribute("lang")).toBe("pt-BR");
  });

  it("o cenário academia: fita na moldura, muro atrás do elenco, mancha no saco; retratos sem medalhão", () => {
    const html = paginaDoTime();
    expect(html).toContain('data-tema="fas-de-rosca-esporte-clube"');
    expect(html).toContain('data-cenario="academia"');
    expect(html).not.toContain("data-fotos");
    expect(html).toMatch(/enfFita/);
    expect(html).toMatch(/enfMuro/);
    expect(html).toMatch(/enfMancha/);
    expect(html).not.toMatch(/enfLousa|enfTela|enfCoroa|enfGrade|enfLua|enfTrilhos/);
  });

  it("a poeira de magnésio tem 6 grãos (o celular mostra 3: academia.module.css)", () => {
    expect(paginaDoTime().match(/class="[^"]*enfPo(?![a-z])/g)).toHaveLength(6);
  });

  it("todo enfeite é aria-hidden e sem texto; todo svg é aria-hidden", () => {
    const html = paginaDoTime();
    expect(html.match(/class="[^"]*enf[A-Z]/g)?.length ?? 0).toBeGreaterThan(25);
    expect(enfeitesSemTexto(html)).toEqual([]);
  });
});

describe("os outros temas não ganham nada da academia", () => {
  it.each([
    ["equipe-rx", TEMA_EQUIPE_RX, "EQUIPE RX"],
    ["queijo-minas", TEMA_QUEIJO_MINAS, "QUEIJO MINAS"],
    ["galacticos-do-bar", TEMA_GALACTICOS_DO_BAR, "Galácticos do Bar"],
  ] as const)("%s: sem fita, muro, saco nem mãos", (_slug, tema, nome) => {
    const html = paginaDoTime(tema, { ...TIME, name: nome, slug: tema.slug });
    expect(html).not.toMatch(/enfFita|enfMuro|enfMancha|enfMaos|enfPoeira|enfRelogio/);
    expect(html).not.toContain('data-cenario="academia"');
  });
});

describe("ficha temática de um jogador dos Fãs de Rosca", () => {
  it("o nick é o h1, lido uma vez, com a largura de duas linhas; PARCEIROS DE TREINO com os 4 outros", () => {
    const doc = new DOMParser().parseFromString(ficha(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("vidotti agiota");
    expect(h1.querySelector('[aria-hidden="true"]')!.getAttribute("style")).toContain("--largura-nick-em:3.087");
    expect([...doc.querySelectorAll('ul a[href^="/jogadores/"]')].map((a) => a.getAttribute("href"))).toEqual([
      "/jogadores/tapa-de-doido",
      "/jogadores/d1elzera",
      "/jogadores/omegafuria",
      "/jogadores/saborenergetico",
    ]);
    expect(doc.body.textContent).toContain("PARCEIROS DE TREINO");
    expect(lidoPeloLeitor(doc.body)).toContain("CAPITÃO");
  });

  it("entre os parceiros, o leitor de tela ouve quem é o capitão (o halter é só desenho)", () => {
    const doc = new DOMParser().parseFromString(ficha(ROSTER[0]!), "text/html");
    expect(lidoPeloLeitor(doc.querySelector('a[href="/jogadores/vidotti-agiota"]')!)).toContain("CAPITÃO");
  });

  it("todo enfeite é aria-hidden e sem texto (as mãos de magnésio e o flash também)", () => {
    const html = ficha();
    expect(html).toMatch(/enfMaos/);
    expect(html).toMatch(/enfFlash/);
    expect(html).toContain('aria-labelledby="tm-nick"'); // a ficha esconde a poeira por ele (academia.module.css)
    expect(enfeitesSemTexto(html)).toEqual([]);
  });

  it("o retrato de cada um usa o enquadramento do tema (o mesmo da carta)", () => {
    for (const p of ROSTER) {
      expect(ficha(p)).toContain(`--foco:${TEMA_FAS_DE_ROSCA.fotos.foco![p.slug]}`);
    }
  });
});

describe("o CSS do cenário academia", () => {
  const ler = (arquivo: string) =>
    readFileSync(path.join(process.cwd(), "components/times/cenarios", arquivo), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const pagina = ler("academia.module.css");
  const fichaCss = ler("academia-ficha.module.css");

  /** Os @keyframes e as regras mais internas (dentro de @media/@supports também). */
  function analisar(css: string) {
    const keyframes = new Map<string, string>();
    const regras: { seletor: string; corpo: string }[] = [];
    const visitar = (trecho: string) => {
      let i = 0;
      while (i < trecho.length) {
        const abre = trecho.indexOf("{", i);
        if (abre < 0) break;
        const cabeca = trecho.slice(i, abre).trim();
        let nivel = 1;
        let j = abre + 1;
        for (; j < trecho.length && nivel > 0; j++) {
          if (trecho[j] === "{") nivel++;
          else if (trecho[j] === "}") nivel--;
        }
        const corpo = trecho.slice(abre + 1, j - 1);
        const kf = /^@keyframes\s+([\w-]+)/.exec(cabeca);
        if (kf) keyframes.set(kf[1]!, corpo);
        else if (cabeca.startsWith("@")) visitar(corpo);
        else regras.push({ seletor: cabeca, corpo });
        i = j;
      }
    };
    visitar(css);
    return { keyframes, regras };
  }

  it("nada em 3D (o WebKit some com background-clip: text sob translate3d — lição da Queijo Minas)", () => {
    for (const css of [pagina, fichaCss]) {
      expect(css).not.toMatch(/\b(translate3d|scale3d|rotate3d|matrix3d|translateZ|rotateX|rotateY|perspective)\b/);
    }
  });

  /** Os keyframes que a regra roda em laço: no atalho (`a 1s, b 10s infinite`) ou nos longhands. */
  function lacosDa(corpo: string, nomes: ReadonlySet<string>): string[] {
    const usados: string[] = [];
    for (const m of corpo.matchAll(/(?:^|[\s;])animation\s*:\s*([^;]+)/g)) {
      for (const parte of m[1]!.split(",")) {
        if (!/\binfinite\b/.test(parte)) continue;
        const nome = parte.trim().split(/\s+/).find((p) => nomes.has(p));
        if (nome) usados.push(nome);
      }
    }
    if (/animation-iteration-count\s*:\s*infinite/.test(corpo)) {
      for (const m of corpo.matchAll(/animation-name\s*:\s*([^;]+)/g)) {
        usados.push(...m[1]!.split(",").map((p) => p.trim()).filter((p) => nomes.has(p)));
      }
    }
    return usados;
  }

  it("os laços infinitos são só enfeite, só transform/opacidade: a poeira, o ponteiro e o brilho do bíceps", () => {
    const lacos = new Set<string>();
    for (const css of [pagina, fichaCss]) {
      const { keyframes, regras } = analisar(css);
      const nomes = new Set(keyframes.keys());
      for (const r of regras) {
        for (const nome of lacosDa(r.corpo, nomes)) {
          lacos.add(nome);
          // O último seletor composto é um enfeite (`.enf…`).
          expect(r.seletor.trim().split(/\s+|>|\+|~/).filter(Boolean).at(-1), `laço ${nome} em conteúdo`).toMatch(/^\.enf/);
          const propriedades = [...keyframes.get(nome)!.matchAll(/([\w-]+)\s*:/g)].map((m) => m[1]!);
          expect(propriedades.filter((p) => !["transform", "opacity", "animation-timing-function"].includes(p)), nome).toEqual([]);
        }
      }
    }
    expect(lacos).toEqual(new Set(["poeiraDeMagnesio", "ponteiroDosSegundos", "brilhoBicepsDeNovo"]));
    expect(pagina).not.toMatch(/raiosRespiram/); // o juiz cortou a respiração dos raios
  });

  it("o celular fica com 3 grãos de poeira e a ficha com nenhum (orçamento de laços)", () => {
    expect(pagina).toMatch(/@media \(max-width: 599px\) \{\s*\.enfPo:nth-child\(n \+ 4\) \{\s*display: none;/);
    expect(pagina).toMatch(/\.raiz:has\(\[aria-labelledby="tm-nick"\]\) \.enfPoeira \{\s*display: none;/);
  });

  it("no movimento reduzido some o que só existe em movimento (arcos, suor, brilhos, lascas, poeira, flash)", () => {
    const reduzido = (css: string) => /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    for (const classe of ["enfArcos", "enfSuor", "enfBrilho", "enfLasca", "enfPoeira"]) {
      expect(reduzido(pagina)).toContain(`.${classe}`);
    }
    expect(reduzido(fichaCss)).toContain(".enfFlash");
  });

  it("as duas reservas da fonte do título moram aqui, com os nomes que o next/font pede", () => {
    const fontes = readFileSync(path.join(process.cwd(), "components/times/fontes-dos-temas.ts"), "utf8");
    expect(fontes).toContain('fallback: ["Rosca Reserva Impact", "Rosca Reserva"]');
    expect(pagina).toMatch(/@font-face \{\s*font-family: "Rosca Reserva Impact";\s*src: local\("Impact"\);\s*size-adjust: 63%;/);
    expect(pagina).toMatch(/@font-face \{\s*font-family: "Rosca Reserva";[^}]*local\("Arial"\)[^}]*size-adjust: 40%;/);
  });

  it("o crachá inteiro abre a ficha: o miolo não se posiciona (o link estica até a carta)", () => {
    expect(pagina).toMatch(/\.raiz \.miolo \{\s*position: static;/);
  });
});
