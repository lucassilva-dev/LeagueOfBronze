// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FichaDoJogadorComTema } from "@/components/times/ficha-do-jogador-com-tema";
import { PaginaDoTimeComTema } from "@/components/times/pagina-do-time-com-tema";
import { resolveElo, resolveRole, teamColor } from "@/lib/design";
import { MESSAGES } from "@/lib/i18n/messages";
import type { DesignPlayer, DesignTeam } from "@/lib/roster";
import { TEMA_EQUIPE_RX } from "@/lib/temas/equipe-rx";
import { TEMA_GALACTICOS_DO_BAR } from "@/lib/temas/galacticos-do-bar";
import { METRICAS, larguraDoNickEm, larguraEm, maiorPalavraEm } from "@/lib/temas/metricas";
import { TEMA_OS_5_SEM_PING } from "@/lib/temas/os-5-sem-ping";
import { TEMA_QUEIJO_MINAS } from "@/lib/temas/queijo-minas";
import { corDoTime, partesDoNome, temaDoTime, textoDoTema } from "@/lib/temas/registro";
import type { TemaDoTime } from "@/lib/temas/tipos";

/*
 * A página temática do OS 5 SEM PING (28/10/2026), «A Call que Nunca Cai»: a call de madrugada do
 * time — a entrada trava (999 ms), conecta em 0 ms e o poro bota os óculos pixelados. O título é a
 * Unbounded 800 em adesivo de gel, com a largura MEDIDA (lib/temas/metricas.ts). O que o leitor de
 * tela lê, os textos, a ordem do elenco (com o nick de DOIS espaços do N4firida), a regra dos
 * enfeites, o ping que é enfeite e nunca esconde — e que RX, Queijo Minas e Galácticos não ganharam
 * nada disso.
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
    elo: "Diamante",
    eloMeta: resolveElo("Diamante"),
    pts: 6,
    role1: role,
    roleMeta: resolveRole(role),
    teamId: "aurea",
    teamName: "OS 5 SEM PING",
    teamSlug: "os-5-sem-ping",
    teamColor: "#3DFF8F",
    reserva: false,
    saiu: false,
    noElenco: true,
    ...extra,
  } as DesignPlayer;
}

// Como no banco: rotas na ordem da base e o capitão (ADC) no meio; o nick do MID tem DOIS espaços.
const ROSTER = [
  jogador("goom-gum", "GOOM GUM", "TOP"),
  jogador("nikiti", "Nikiti", "JUNG"),
  jogador("n4firida-agiota", "N4firida  agiota", "MID"),
  jogador("giripoca", "Giripoca", "ADC", { captain: true }),
  jogador("miva", "Miva", "SUP"),
];
const TIME: DesignTeam = {
  id: "aurea",
  name: "OS 5 SEM PING",
  slug: "os-5-sem-ping",
  color: "#3DFF8F",
  imageUrl: "/teams/os-5-sem-ping.webp",
  roster: ROSTER,
  captain: ROSTER[3]!,
  total: 30,
};

function paginaDoTime(tema: TemaDoTime = TEMA_OS_5_SEM_PING, time: DesignTeam = TIME) {
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
      tema={TEMA_OS_5_SEM_PING}
      t={t}
      tiles={[{ label: "PARTIDAS", val: "0" }]}
      opggUrl="https://op.gg/x"
      temporada="4ª Edição"
      voltar={{ href: "/times/os-5-sem-ping", texto: t.jogadorVoltar }}
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

const UNBOUNDED = METRICAS.unbounded!;
const CSS = (arquivo: string) =>
  readFileSync(path.join(process.cwd(), "components/times/cenarios", arquivo), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("registro: o tema do OS 5 SEM PING", () => {
  it("acha pelo slug; o id do draft (aurea) sozinho não tem tema", () => {
    expect(temaDoTime("os-5-sem-ping")).toBe(TEMA_OS_5_SEM_PING);
    expect(temaDoTime("aurea")).toBeNull();
  });

  it("a cor do time no site é o verde do sinal; sem o slug, a da ÁUREA", () => {
    expect(corDoTime({ id: "aurea", slug: "os-5-sem-ping" })).toBe("#3DFF8F");
    expect(corDoTime({ id: "aurea", slug: "aurea" })).toBe(teamColor("aurea"));
    expect(teamColor("aurea")).not.toBe("#3DFF8F");
  });

  it("parte o nome pelo prefixo, em qualquer caixa: SEM PING grande, OS 5 na linha de status", () => {
    expect(partesDoNome("OS 5 SEM PING", "OS 5")).toEqual({ assinatura: "OS 5", marca: "SEM PING" });
    expect(partesDoNome("Os 5 Sem Ping", "OS 5")).toEqual({ assinatura: "Os 5", marca: "Sem Ping" });
  });

  it("os textos do tema saem no idioma da página; o adesivo fica em português nos dois", () => {
    const en = MESSAGES.en.paginasHome;
    expect(textoDoTema(TEMA_OS_5_SEM_PING, t, "capitao")).toBe("ADM DA CALL");
    expect(textoDoTema(TEMA_OS_5_SEM_PING, en, "capitao")).toBe("CALL ADMIN");
    expect(textoDoTema(TEMA_OS_5_SEM_PING, t, "estrelando")).toBe("CÂMERAS LIGADAS");
    expect(textoDoTema(TEMA_OS_5_SEM_PING, en, "estrelando")).toBe("CAMERAS ON");
    expect(textoDoTema(TEMA_OS_5_SEM_PING, en, "companheiros")).toBe("IN THE SAME CALL");
    expect(textoDoTema(TEMA_OS_5_SEM_PING, t, "carimbo")).toBe("999 ms? Nunca nem vi.");
    expect(textoDoTema(TEMA_OS_5_SEM_PING, en, "carimbo")).toBe("999 ms? Nunca nem vi.");
    expect(textoDoTema(TEMA_OS_5_SEM_PING, en, "emCartaz")).toBe("ONLINE {periodo}");
  });

  it("fotos de celular que preenchem a moldura (sem medalhão); a do GOOM GUM sai quadrada na ficha", () => {
    expect(TEMA_OS_5_SEM_PING.fotos.formato).toBeUndefined();
    expect(TEMA_OS_5_SEM_PING.fotos.proporcao).toEqual({ "goom-gum": "1 / 1" });
    expect(Object.keys(TEMA_OS_5_SEM_PING.fotos.foco ?? {}).sort()).toEqual(["giripoca", "goom-gum", "miva", "n4firida-agiota", "nikiti"]);
  });
});

describe("a largura medida da Unbounded 800 (lib/temas/metricas.ts)", () => {
  it("as mesmas 84 chaves da Knewave", () => {
    expect(Object.keys(UNBOUNDED.avancos).sort()).toEqual(Object.keys(METRICAS.knewave!.avancos).sort());
  });

  it("SEM PING: a maior palavra é PING = 3,14 em de avanço + 4 × 0,01 + 0,34 do adesivo = 3,52 em", () => {
    expect(maiorPalavraEm("SEM PING", UNBOUNDED)).toBe(3.52);
    expect(maiorPalavraEm("Sem Ping", UNBOUNDED)).toBe(3.52);
    expect(larguraEm("SEM", UNBOUNDED)).toBe(3.285);
  });

  it("caractere fora da tabela conta como o mais largo medido, arredondado para cima (nunca estoura)", () => {
    expect(larguraEm("ㅤ", UNBOUNDED)).toBe(1.75); // 1,4 + 0,01 + 0,34
    expect(UNBOUNDED.padrao).toBeGreaterThanOrEqual(Math.max(...Object.values(UNBOUNDED.avancos)));
    expect(UNBOUNDED.avancos.W).toBe(1.375);
  });

  it("nick da ficha: até duas linhas, só entre palavras — inclusive o de DOIS espaços", () => {
    expect(larguraDoNickEm("N4firida  agiota", UNBOUNDED)).toBe(6.564); // N4FIRIDA / AGIOTA
    expect(larguraDoNickEm("N4firida  agiota", UNBOUNDED)).toBe(larguraDoNickEm("N4firida agiota", UNBOUNDED));
    expect(larguraDoNickEm("GOOM GUM", UNBOUNDED)).toBe(4.545); // GOOM / GUM
    expect(larguraDoNickEm("Giripoca", UNBOUNDED)).toBe(6.691);
    expect(larguraDoNickEm("Nikiti", UNBOUNDED)).toBe(4.18);
    expect(larguraDoNickEm("Miva", UNBOUNDED)).toBe(3.925);
  });

  it("RX e Queijo Minas continuam sem métrica: a página delas não muda", () => {
    expect(METRICAS[TEMA_EQUIPE_RX.fontes.titulo]).toBeUndefined();
    expect(METRICAS[TEMA_QUEIJO_MINAS.fontes.titulo]).toBeUndefined();
  });

  it("a reserva da Unbounded é a Arial Bold a 85% (mais estreita em todo caractere), em todo peso", () => {
    const css = CSS("chamada.module.css");
    const face = /@font-face\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(face).toContain('font-family: "Sem Ping Reserva"');
    expect(face).toMatch(/local\("Arial Bold"\)/);
    expect(face).toMatch(/size-adjust:\s*85%/);
    expect(face).toMatch(/font-weight:\s*100 900/);
    expect(css).not.toContain("Lilita Caixa Alta");
  });
});

describe("página temática do OS 5 SEM PING", () => {
  it("o leitor de tela lê o nome uma vez; as 7 letras são aria-hidden; o título leva a largura medida", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("OS 5 SEM PING");
    const visual = h1.querySelector('[aria-hidden="true"]')!;
    expect(visual.querySelectorAll('[class*="letra"]')).toHaveLength(7);
    expect(visual.getAttribute("style")).toContain("--largura-em:3.52");
    // A linha de status da sala: «OS 5» com as 5 barras de sinal (enfeite).
    expect(visual.querySelector('[class*="pincel"]')!.textContent).toBe("OS 5");
    expect(visual.querySelectorAll('[class*="assinatura"] rect')).toHaveLength(5);
  });

  it("as câmeras: TOP, JUNG, MID, SUP e o ADM DA CALL (o capitão) por último; o nick de dois espaços intacto", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const nicks = [...doc.querySelectorAll("li h3")].map((h) => h.textContent);
    expect(nicks).toEqual(["GOOM GUM", "Nikiti", "N4firida  agiota", "Miva", "Giripoca"]);
    const links = [...doc.querySelectorAll('li a[href^="/jogadores/"]')].map((a) => a.getAttribute("href"));
    expect(links).toEqual(["/jogadores/goom-gum", "/jogadores/nikiti", "/jogadores/n4firida-agiota", "/jogadores/miva", "/jogadores/giripoca"]);
    expect(doc.querySelector("ul[data-n]")!.getAttribute("style")).toContain("--maior-palavra-em:6.691");
  });

  it("os textos do tema aparecem; ADM DA CALL na tela, CAPITÃO para o leitor", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const texto = doc.body.textContent ?? "";
    for (const trecho of [
      "CÂMERAS LIGADAS",
      "ADM DA CALL",
      "Câmera ligada, microfone aberto, ping zero.",
      "Ninguém travou. Ainda.",
      "Chamada encerrada · quedas: 0 · ping médio: 0 ms",
      "4ª EDIÇÃO · CONECTADOS DE 13 DE NOVEMBRO A 6 DE DEZEMBRO",
      "Travou? Tira da tomada e conta até dez.",
    ]) {
      expect(texto).toContain(trecho);
    }
    const lido = lidoPeloLeitor(doc.body);
    expect(lido).toContain("CAPITÃO");
    expect(lido).not.toContain("ADM DA CALL");
    const carimbo = [...doc.querySelectorAll("p")].find((p) => p.textContent === "999 ms? Nunca nem vi.")!;
    expect(carimbo.getAttribute("lang")).toBe("pt-BR");
  });

  it("o cenário chamada: a janela da call, o status, os controles, o leque, os óculos, os fantasmas", () => {
    const html = paginaDoTime();
    expect(html).toContain('data-tema="os-5-sem-ping"');
    expect(html).toContain('data-cenario="chamada"');
    expect(html).not.toContain("data-fotos");
    for (const enfeite of ["enfJanela", "enfFala", "enfStatus", "enfPing", "enfControles", "enfLeque", "enfOculos", "enfFantasma", "enfMalha", "enfEncerrada"]) {
      expect(html, enfeite).toMatch(new RegExp(`_${enfeite}_`));
    }
    // As câmeras do fundo são enfCamDesfocada: nada aqui começa com enfTela (a TV é da GdB).
    expect(html).not.toMatch(/enfCoroa|enfGrade|enfLua|enfTrilhos|enfLousa|enfTela|enfLetreiro/);
    // 4 arcos no herói, os óculos pixelados no escudo e na carta do ADM, as 5 estrelas da avaliação.
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelectorAll('[class*="enfLeque"] [class*="enfArcoWifi"]')).toHaveLength(4);
    expect(doc.querySelectorAll('[class*="enfOculos"]').length).toBeGreaterThanOrEqual(2);
    expect(doc.querySelectorAll('[class*="enfEstrela_"]')).toHaveLength(5);
  });

  it("todo enfeite é aria-hidden e sem texto; todo svg é aria-hidden; os desenhos do cenário sem <text>", () => {
    const html = paginaDoTime();
    expect(html.match(/class="[^"]*enf[A-Z]/g)?.length ?? 0).toBeGreaterThan(30);
    expect(enfeitesSemTexto(html)).toEqual([]);
    // O único <text> da página é a sigla vazada da base (enfRotaGigante), que este cenário esconde.
    const doc = new DOMParser().parseFromString(html, "text/html");
    const comTexto = [...doc.querySelectorAll("svg")].filter((svg) => svg.querySelector("text"));
    expect(comTexto.every((svg) => svg.closest('[class*="enfRotaGigante"]'))).toBe(true);
  });
});

describe("RX, Queijo Minas e Galácticos não ganham nada da call", () => {
  it.each([TEMA_EQUIPE_RX, TEMA_QUEIJO_MINAS, TEMA_GALACTICOS_DO_BAR])("$slug: sem janela, leque, status nem óculos pixelados", (tema) => {
    const nome = { "equipe-rx": "EQUIPE RX", "queijo-minas": "QUEIJO MINAS", "galacticos-do-bar": "GALÁCTICOS DO BAR" }[tema.slug]!;
    const html = paginaDoTime(tema, { ...TIME, name: nome, slug: tema.slug });
    // A classe exata (`_nome_hash`): a Queijo Minas tem as `enfJanelas` acesas da serra.
    expect(html).not.toMatch(/_(enfLeque|enfJanela|enfStatus|enfOculosQueCaem|enfCamDesfocada)_/);
    expect(html).not.toContain('data-cenario="chamada"');
  });
});

describe("ficha temática de um jogador do OS 5 SEM PING", () => {
  it("o nick é o h1, lido uma vez, com a largura medida; NA MESMA CALL com os 4 companheiros", () => {
    const doc = new DOMParser().parseFromString(ficha(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("Giripoca");
    expect(h1.querySelector('[aria-hidden="true"]')!.getAttribute("style")).toContain("--largura-nick-em:6.691");
    const companheiros = [...doc.querySelectorAll('ul a[href^="/jogadores/"]')].map((a) => a.getAttribute("href"));
    expect(companheiros).toEqual(["/jogadores/goom-gum", "/jogadores/nikiti", "/jogadores/n4firida-agiota", "/jogadores/miva"]);
    expect(doc.body.textContent).toContain("NA MESMA CALL");
    expect(lidoPeloLeitor(doc.body)).toContain("CAPITÃO");
    expect(lidoPeloLeitor(doc.body)).not.toContain("ADM DA CALL");
  });

  it("entre os companheiros, o leitor de tela ouve quem é o capitão (os óculos são só desenho)", () => {
    const doc = new DOMParser().parseFromString(ficha(ROSTER[0]!), "text/html");
    expect(lidoPeloLeitor(doc.querySelector('a[href="/jogadores/giripoca"]')!)).toContain("CAPITÃO");
  });

  it("o N4firida em duas linhas (6,564 em); o GOOM GUM com a foto quadrada", () => {
    const n4 = new DOMParser().parseFromString(ficha(ROSTER[2]!), "text/html");
    expect(n4.querySelector("h1 [aria-hidden]")!.getAttribute("style")).toContain("--largura-nick-em:6.564");
    expect(lidoPeloLeitor(n4.querySelector("h1")!)).toBe("N4firida  agiota");
    expect(ficha(ROSTER[0]!)).toContain("--proporcao:1 / 1");
  });

  it("a câmera fixada: a mesma janela da call, os arcos atrás do retrato, os óculos do ADM; enfeites limpos", () => {
    const html = ficha();
    expect(html).not.toContain("data-fotos");
    expect(html).toMatch(/_enfAtrasRetrato_/);
    expect(html).toMatch(/_enfLequeRetrato_/);
    expect(html).toMatch(/_enfOculosQueCaem_/);
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelectorAll('[class*="enfLequeRetrato"] [class*="enfArcoWifi"]')).toHaveLength(2);
    // A janela da ficha só conecta (quem fala é o retrato): a regra mira o anel FILHO da seção da ficha.
    expect(doc.querySelector('section[aria-labelledby="tm-nick"] > [class*="enfFala"]')).not.toBeNull();
    expect(enfeitesSemTexto(html)).toEqual([]);
  });
});

describe("o ping é enfeite que nunca esconde, e os laços são poucos", () => {
  const css = CSS("chamada.module.css");
  const cssFicha = CSS("chamada-ficha.module.css");
  const keyframe = (fonte: string, nome: string) => new RegExp(`@keyframes ${nome}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(fonte)?.[1] ?? "";
  const declaradas = (corpo: string) =>
    new Set([...corpo.matchAll(/([\w-]+)\s*:/g)].map((m) => m[1]).filter((p) => p !== "animation-timing-function"));

  it("@property --ping é um inteiro que começa (e termina) em 0", () => {
    expect(css).toMatch(/@property --ping\s*\{[^}]*syntax:\s*"<integer>";[^}]*initial-value:\s*0;/);
    expect(css).toMatch(/\.enfPing\s*\{[^}]*--ping:\s*0;[^}]*counter-reset:\s*ping var\(--ping\);/);
  });

  it("pingCai só mexe no número e na cor; o pingOscila (laço de propriedade registrada) foi cortado", () => {
    expect(declaradas(keyframe(css, "pingCai"))).toEqual(new Set(["--ping", "color"]));
    expect(css).not.toContain("pingOscila");
  });

  it("os laços infinitos são só os aprovados (arcos, deriva, a janela falando, o ADM e a câmera fixada)", () => {
    const fonte = css + cssFicha;
    const nomes = new Set([...fonte.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]!));
    const infinitos = new Set<string>();
    for (const m of fonte.matchAll(/\{([^{}]*)\}/g)) {
      const corpo = m[1]!;
      const lista = (prop: string) =>
        new RegExp(`(?:^|[\\s;])${prop}\\s*:\\s*([^;]+)`).exec(corpo)?.[1]?.split(",").map((s) => s.trim());
      // longhands: o nome e a contagem na mesma posição da lista (a lista curta se repete)
      const lNomes = lista("animation-name") ?? [];
      const contas = lista("animation-iteration-count") ?? [];
      lNomes.forEach((nome, i) => {
        if (contas.length && contas[i % contas.length] === "infinite" && nomes.has(nome)) infinitos.add(nome);
      });
      // shorthand: cada parte que diz infinite
      for (const parte of lista("animation") ?? []) {
        const nome = parte.split(/\s+/).find((p) => nomes.has(p));
        if (nome && /\binfinite\b/.test(parte)) infinitos.add(nome);
      }
    }
    expect([...infinitos].sort()).toEqual(["arcoPinga", "derivaDaCall", "falaAdm", "falaFixado", "janelaFala"]);
  });
});

describe("a call cabe no celular e no vídeo", () => {
  const pagina = CSS("chamada.module.css");
  const daFicha = CSS("chamada-ficha.module.css");

  it("vindo da lista (?de=jogadores), abaixo de 380 px a contagem do ping sai e o status não cobre o voltar", () => {
    expect(pagina).toMatch(
      /@media \(max-width: 379px\) \{\s*\.raiz \.heroi:has\(\.voltar\[href\^="\/jogadores"\]\) \.enfPing \{\s*display: none;/,
    );
  });

  it("o leque de Wi-Fi estreita onde o arco de fora passava por baixo das pílulas", () => {
    expect(pagina).toMatch(/@media \(max-width: 599px\) \{\s*\.enfLeque \{\s*width: calc\(var\(--escudo\) \* 1\.6\);/);
    expect(pagina).toMatch(/@media \(min-width: 1024px\) \{\s*\.enfLeque \{\s*width: calc\(var\(--escudo\) \* 1\.6\);/);
    expect(pagina).toMatch(
      /@media \(min-width: 1024px\) and \(max-width: 1279px\) \{\s*\.enfLeque \{\s*width: calc\(var\(--escudo\) \* 1\.5\);/,
    );
  });

  it("abaixo de 900 o retrato da ficha se mede pela altura (o nick cabe na 1ª dobra do 405×720)", () => {
    expect(daFicha).toMatch(/\.raiz \.retratoCasca \{\s*max-width: min\(100% - 24px, 400px, calc\(\(100svh - 372px\) \* 0\.8\)\);/);
  });
});
