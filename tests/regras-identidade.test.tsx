// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { Gavel } from "lucide-react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CalendarioDa4a } from "@/components/calendario-4a";
import { SectionTitle } from "@/components/lob/ui";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * /regras com a identidade "Bronze Hextech": nenhum losango genérico, cada título, item e
 * regra com o desenho do que trata — sem perder o que a página já garantia: as âncoras que
 * a inscrição linka (#regra-N, #visao-geral…) e o número da regra legível, inclusive para
 * leitor de tela (o regulamento é citado pelo número).
 */

const cenario = vi.hoisted(() => ({ locale: "pt" as "pt" | "en" }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES: mensagens } = await import("@/lib/i18n/messages");
  return {
    getLocale: async () => cenario.locale,
    getMessages: async () => mensagens[cenario.locale],
  };
});

vi.mock("@/lib/inscricoes/store", () => ({
  lerConfigOuNulo: async () => ({ taxa_centavos: 2000, pct_campeao: 70 }),
}));

const { default: RegrasPage } = await import("@/app/regras/page");

async function montar(): Promise<HTMLDivElement> {
  const raiz = document.createElement("div");
  raiz.innerHTML = renderToStaticMarkup(await RegrasPage());
  return raiz;
}

/**
 * O texto como o leitor de tela recebe: sem o que está dentro de aria-hidden. (O
 * textContent cola blocos vizinhos sem espaço — "REGRA 7Tolerância" —, mas rótulo e
 * texto são blocos separados, e o leitor de tela os lê como duas linhas: daí o \s*.)
 */
function textoAcessivel(el: Element): string {
  const copia = el.cloneNode(true) as Element;
  copia.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  return (copia.textContent ?? "").replace(/\s+/g, " ").trim();
}

beforeEach(() => {
  cenario.locale = "pt";
});

describe("/regras: âncoras e números", () => {
  it("mantém os ids das seções e das 22 regras", async () => {
    const raiz = await montar();
    for (const id of ["visao-geral", "inscricao", "formacao", "regras-gerais", "cartinhas", "pontuacao", "premiacao", "calendario"]) {
      expect(raiz.querySelector(`#${id}`), id).not.toBeNull();
    }
    for (let n = 1; n <= 22; n++) expect(raiz.querySelector(`#regra-${n}`), `regra-${n}`).not.toBeNull();
    expect(raiz.querySelector("#regra-23")).toBeNull();
  });

  it("cada regra diz \"REGRA N\" — e o leitor de tela ouve o número", async () => {
    const raiz = await montar();
    const r7 = raiz.querySelector("#regra-7")!;
    expect(textoAcessivel(r7)).toMatch(/^REGRA 7\s*Tolerância de 10 minutos/);
    expect(textoAcessivel(raiz.querySelector("#regra-22")!)).toMatch(/^REGRA 22\s*Inscrição:/);
  });

  it("em inglês, \"RULE N\"", async () => {
    cenario.locale = "en";
    const raiz = await montar();
    expect(textoAcessivel(raiz.querySelector("#regra-7")!)).toMatch(/^RULE 7\s*10-minute grace period/);
  });

  it("cada regra tem o seu selo, e o selo é decorativo (o texto é que nomeia)", async () => {
    const raiz = await montar();
    for (let n = 1; n <= 22; n++) {
      const regra = raiz.querySelector(`#regra-${n}`)!;
      expect(regra.querySelector('[aria-hidden="true"] svg'), `regra-${n}`).not.toBeNull();
    }
  });
});

describe("/regras: ícones no lugar dos losangos", () => {
  it("nenhum losango genérico: nem caractere ◆/◇ nem quadrado girado", async () => {
    const raiz = await montar();
    expect(raiz.textContent).not.toMatch(/[◆◇○]/);
    expect(raiz.innerHTML).not.toMatch(/rotate\(45deg\)/);
  });

  it("os títulos das seções e os atalhos do sumário levam desenho", async () => {
    const raiz = await montar();
    for (const secao of raiz.querySelectorAll("section[id]")) {
      expect(secao.querySelector("h2")?.parentElement?.querySelector("svg"), secao.id).not.toBeNull();
    }
    const atalhos = raiz.querySelectorAll("nav a");
    expect(atalhos).toHaveLength(8);
    for (const a of atalhos) expect(a.querySelector("svg"), a.getAttribute("href") ?? "").not.toBeNull();
  });

  it("o elo do formulário é o emblema oficial, não a palavra", async () => {
    const raiz = await montar();
    const inscricao = raiz.querySelector("#inscricao")!;
    expect(inscricao.querySelector('img[src="/elo/esmeralda.png"]')).not.toBeNull();
    // Ilustração: o nome do emblema de exemplo não é lido antes do texto do item.
    expect(textoAcessivel(inscricao)).not.toContain("Esmeralda");
  });

  it("as cartinhas duplas usam o desenho das duas cartas, não \"◆◆\"", async () => {
    const raiz = await montar();
    expect(raiz.querySelector("#cartinhas")!.textContent).not.toContain("◆◆");
  });

  it("nenhuma animação ou transição de opacidade", async () => {
    const raiz = await montar();
    expect(raiz.innerHTML).not.toMatch(/opacity\s*:\s*0|transition[^;"]*opacity/);
  });
});

describe("calendário: as notas com ícone", () => {
  it("cada nota tem o seu desenho, e o losango sumiu", () => {
    const raiz = document.createElement("div");
    raiz.innerHTML = renderToStaticMarkup(<CalendarioDa4a t={MESSAGES.pt.calendario4a} localeTag="pt-BR" />);
    const notas = [...raiz.querySelectorAll("li")].filter((li) => li.textContent?.includes(MESSAGES.pt.calendario4a.notaReserva));
    expect(notas).toHaveLength(1);
    expect(notas[0]!.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(raiz.textContent).not.toContain("◆");
  });
});

describe("SectionTitle", () => {
  it("sem ícone, continua o losango de sempre (as outras páginas não mudam)", () => {
    const html = renderToStaticMarkup(<SectionTitle>TÍTULO</SectionTitle>);
    expect(html).toContain("rotate(45deg)");
    expect(html).not.toContain("<svg");
  });

  it("com ícone, o selo hexagonal no lugar do losango", () => {
    const html = renderToStaticMarkup(<SectionTitle icone={Gavel}>TÍTULO</SectionTitle>);
    expect(html).not.toContain("rotate(45deg)");
    expect(html).toContain("<svg");
    expect(html).toMatch(/clip-path:polygon/);
  });
});
