import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { html } from "./_ajuda";

/**
 * A moldura que envolve TODA página (components/site-frame.tsx e companhia): cabeçalho
 * sticky, landmarks, "pular para o conteúdo", menu, botão da conta, rodapé e o CSS global
 * que eles usam.
 */

const cenario = vi.hoisted(() => ({ locale: "pt" as "pt" | "en", pre: true }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES } = await import("@/lib/i18n/messages");
  return { getLocale: async () => cenario.locale, getMessages: async () => MESSAGES[cenario.locale] };
});
vi.mock("@/lib/data-store", async (original) => ({
  ...(await original<typeof import("@/lib/data-store")>()),
  ehAmbienteDeTeste: () => false,
  problemaDeAmbiente: () => null,
}));
vi.mock("@/lib/fase-do-site", async (original) => ({
  ...(await original<typeof import("@/lib/fase-do-site")>()),
  emPreTemporada: () => cenario.pre,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ refresh() {} }) }));

const { SiteFrame } = await import("@/components/site-frame");
const { MainNav } = await import("@/components/main-nav");
const { IndicadorDeSessao } = await import("@/components/sessao-no-cabecalho");
const { AvisoConsentimento } = await import("@/components/aviso-consentimento");
const { LobShell } = await import("@/components/lob/ui");
const { PageShell } = await import("@/components/page-shell");
const { MESSAGES } = await import("@/lib/i18n/messages");

const CSS = () => readFileSync("app/globals.css", "utf8");

/** Corpo de UMA regra do CSS global (a primeira com esse seletor exato). */
function regra(seletor: string, css = CSS()): string {
  const inicio = css.indexOf(`${seletor} {`);
  expect(inicio, `regra ${seletor} não encontrada`).toBeGreaterThanOrEqual(0);
  return css.slice(inicio, css.indexOf("}", inicio));
}

/** Razão de contraste WCAG entre duas cores #rrggbb. */
function contraste(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [claro, escuro] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (claro! + 0.05) / (escuro! + 0.05);
}

const FUNDO_DO_SITE = "#100d07";

async function moldura() {
  return renderToStaticMarkup(await SiteFrame({ children: <p>conteudo da pagina</p> }));
}

beforeEach(() => {
  cenario.locale = "pt";
  cenario.pre = true;
});

describe("PUB-01 — o cabeçalho sticky gruda no topo", () => {
  it("o invólucro do site corta o lado com a classe lob-raiz, sem `overflow-x: hidden` inline", async () => {
    const m = await moldura();
    const raiz = /<div class="lob-raiz"[^>]*>/.exec(m)?.[0] ?? "";
    expect(raiz).not.toBe("");
    // É o primeiro div da página: o invólucro de tudo.
    expect(m.indexOf("<div")).toBe(m.indexOf(raiz));
    // `hidden` inline fazia do div um contêiner de rolagem (overflow-y vira auto) e o
    // <header> sticky grudava NELE, que nunca rola.
    expect(raiz).not.toMatch(/overflow/);
    expect(m).toMatch(/<header id="lob-cabecalho"[^>]*position:sticky;top:0/);
  });

  it("no CSS, `clip` vem DEPOIS de `hidden` (o hidden só fica de reserva para navegador sem clip)", () => {
    const corpo = regra(".lob-raiz");
    const hidden = corpo.indexOf("overflow-x: hidden");
    const clip = corpo.indexOf("overflow-x: clip");
    expect(clip).toBeGreaterThan(-1);
    expect(clip).toBeGreaterThan(hidden);
    // Nenhum outro ancestral (html/body) volta a criar contêiner de rolagem.
    expect(CSS()).not.toMatch(/(^|\n)\s*(html|body)[^{]*\{[^}]*overflow/);
  });

  it("menu do celular rola por dentro (o cabeçalho agora fica preso e levaria o fim da lista junto)", () => {
    expect(regra(".lob-menu-movel")).toContain("overflow-y: auto");
  });
});

describe("PUB-03 — cabeçalho cabe em 320px (correção do orquestrador, conferida)", () => {
  it("as classes do aperto existem na moldura e no CSS", async () => {
    const m = await moldura();
    // O ENTRAR só nasce no cliente, depois de consultar a sessão: confere-se no componente.
    const entrar = renderToStaticMarkup(
      <IndicadorDeSessao
        t={MESSAGES.en.comum}
        sessao={{ jogador: null, organizacao: null }}
        aberto={false}
        saindo={false}
        onAlternar={() => {}}
        onFechar={() => {}}
        onSair={() => {}}
      />,
    );
    expect(entrar).toMatch(/class="lob-sessao-entrar"[^>]*>SIGN IN</);
    for (const classe of ["lob-cabecalho-linha", "lob-cabecalho-marca", "lob-cabecalho-logo", "lob-cabecalho-acoes", "lob-idioma-botao"]) {
      expect(m, classe).toContain(classe);
    }
    const aperto = CSS().slice(CSS().indexOf("@media (max-width: 380px)"));
    for (const classe of ["lob-cabecalho-linha", "lob-cabecalho-marca", "lob-cabecalho-logo", "lob-cabecalho-acoes", "lob-idioma-botao", "lob-sessao-entrar"]) {
      expect(aperto, classe).toContain(`.${classe}`);
    }
  });
});

describe("PUB-13 — landmarks e 'pular para o conteúdo'", () => {
  it("um ÚNICO <main id=conteudo>, e o link de salto é o primeiro foco da página", async () => {
    const m = await moldura();
    expect(m.match(/<main\b/g)).toHaveLength(1);
    expect(m).toMatch(/<main id="conteudo"[^>]*>[\s\S]*conteudo da pagina[\s\S]*<\/main>/);
    const salto = m.indexOf('<a href="#conteudo" class="lob-pular">Pular para o conteúdo</a>');
    expect(salto).toBeGreaterThan(-1);
    expect(salto).toBeLessThan(m.indexOf("<header"));
    expect(m.indexOf("<a")).toBe(salto);
  });

  it("o link de salto só aparece com foco, por deslocamento — nunca por opacidade/display", () => {
    const escondido = regra(".lob-pular");
    expect(escondido).toContain("transform: translateY(-120%)");
    expect(escondido).not.toMatch(/opacity|display|visibility/);
    expect(CSS()).toMatch(/\.lob-pular:focus[^{]*\{[^}]*transform: translateY\(12px\)/);
  });

  it("em inglês o link diz 'Skip to content'", async () => {
    cenario.locale = "en";
    expect(await moldura()).toContain(">Skip to content</a>");
  });

  it("as cascas das páginas (LobShell, PageShell) não abrem outro <main>", async () => {
    expect(renderToStaticMarkup(<LobShell>x</LobShell>)).not.toContain("<main");
    expect(renderToStaticMarkup(<PageShell>x</PageShell>)).not.toContain("<main");
    const carregando = [
      await import("@/app/calendario/loading"),
      await import("@/app/cartas/loading"),
      await import("@/app/regras/loading"),
      await import("@/app/stats/loading"),
      await import("@/app/tabela/loading"),
    ];
    for (const { default: Loading } of carregando) {
      expect(renderToStaticMarkup(<Loading />)).not.toContain("<main");
    }
  });

  it("o menu do celular também é <nav> (antes os links ficavam num div comum)", () => {
    const m = renderToStaticMarkup(
      <MainNav labels={[{ href: "/", label: "INÍCIO" }]} ariaLabel="Navegação principal" abrirMenu="Abrir menu" />,
    );
    expect(m.match(/<nav aria-label="Navegação principal"/g)).toHaveLength(2);
    expect(m).toMatch(/<nav aria-label="Navegação principal" class="min-\[1060px\]:hidden"><button[^>]*aria-label="Abrir menu"/);
  });
});

describe("PUB-06 — menu de 9 itens troca para o hambúrguer mais cedo", () => {
  const itens = (n: number) => Array.from({ length: n }, (_, i) => ({ href: `/p${i}`, label: `ITEM ${i}` }));

  it("9 itens (temporada): desktop só a partir de 1200px", () => {
    const m = renderToStaticMarkup(<MainNav labels={itens(9)} ariaLabel="nav" abrirMenu="menu" />);
    expect(m).toContain('class="hidden min-[1200px]:flex"');
    expect(m).toContain('class="min-[1200px]:hidden"');
    expect(m).not.toContain("1060px");
  });

  it("controle: os 5 da pré-temporada seguem trocando em 1060px", () => {
    const m = renderToStaticMarkup(<MainNav labels={itens(5)} ariaLabel="nav" abrirMenu="menu" />);
    expect(m).toContain('class="hidden min-[1060px]:flex"');
    expect(m).toContain('class="min-[1060px]:hidden"');
  });
});

describe("PUB-12 — o botão da conta diz quem está logado", () => {
  it("o nome da conta faz parte do nome acessível", () => {
    const m = renderToStaticMarkup(
      <IndicadorDeSessao
        t={MESSAGES.pt.comum}
        sessao={{ jogador: { nome: "Nakay", temInscricao: true, precisaTrocarSenha: false }, organizacao: null }}
        aberto={false}
        saindo={false}
        onAlternar={() => {}}
        onFechar={() => {}}
        onSair={() => {}}
      />,
    );
    const botao = /<button[^>]*class="lob-sessao-botao"[^>]*>/.exec(m)?.[0] ?? "";
    expect(botao).toMatch(/aria-label="Nakay[^"]*Abrir menu da conta"/);
  });
});

describe("PUB-09 — contraste do rodapé e do aviso de consentimento (AA: 4,5:1)", () => {
  it("todo texto do rodapé (aviso da Riot incluído) passa de 4,5:1 sobre o fundo do site", async () => {
    for (const locale of ["pt", "en"] as const) {
      cenario.locale = locale;
      const m = await moldura();
      const rodape = m.slice(m.indexOf("<footer"));
      const cores = [...rodape.matchAll(/(?<![-\w])color:(#[0-9a-f]{6})/gi)].map((c) => c[1]!.toLowerCase());
      expect(cores.length).toBeGreaterThan(0);
      for (const cor of cores) expect(contraste(cor, FUNDO_DO_SITE), `${locale} ${cor}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("aviso de consentimento de /jogadores", async () => {
    const m = await html(AvisoConsentimento());
    const cor = /<p style="[^"]*(?<![-\w])color:(#[0-9a-f]{6})/i.exec(m)?.[1] ?? "";
    expect(contraste(cor, FUNDO_DO_SITE)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("PUB-14 — o esqueleto de carregamento anima", () => {
  it("existe @keyframes shimmer e ele anima só a posição do fundo", () => {
    const css = CSS();
    expect(regra(".skeleton", css)).toContain("shimmer");
    const inicio = css.indexOf("@keyframes shimmer");
    expect(inicio).toBeGreaterThan(-1);
    const corpo = css.slice(inicio, css.indexOf("\n}", inicio));
    expect(corpo).toContain("background-position");
    expect(corpo).not.toMatch(/opacity|filter|visibility/);
  });
});
