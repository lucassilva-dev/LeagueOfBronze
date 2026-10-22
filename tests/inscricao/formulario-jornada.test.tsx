// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import FormularioInscricao, { type ConfigPublica } from "@/components/inscricao/formulario";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * O formulário de inscrição (components/inscricao/formulario.tsx) nos caminhos em que a
 * jornada do jogador quebrava:
 *
 *  - INS-08: sessão caída no envio (401) → volta ao passo 1 no modo Entrar, e o reenvio
 *    funciona depois do login, sem perder o que foi preenchido.
 *  - INS-09: resposta perdida + reenvio (409 `jaInscrito`) → cartão "Você já está
 *    inscrito", com o caminho para Minha inscrição.
 *  - INS-11: o botão de rótulo longo do recibo pode quebrar linha no celular.
 *  - INS-12: o recibo manda clicar em JÁ PAGUEI, e não avisar no Discord.
 *  - INS-14: erros anunciados (role=alert, aria-invalid), <form> com Enter, "←" com nome.
 *  - INS-15: erros das rotas no idioma da tela, pelo `codigo`; regra da senha dita antes.
 *  - INS-16: tag colada com "#" não vira "Nick##TAG" no resumo.
 *  - INS-18: quem a página tratou como visitante (cookie Strict não veio) é reconhecido
 *    pela consulta feita daqui de dentro.
 *  - INS-19: nick, tag e Discord sem corretor nem maiúscula automática.
 *
 * O `fetch` é um roteador por "MÉTODO url": cada teste diz o que cada rota responde, e
 * uma chamada que ninguém previu falha alto.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const t = MESSAGES.pt.inscricao;
const en = MESSAGES.en.inscricao;

const CONFIG: ConfigPublica = {
  taxaCentavos: 2000,
  chavePix: "chave@exemplo.com",
  prazoPagamentoDias: 14,
  minRanqueadas: 5,
  pctCampeao: 70,
};
const ELOS = [{ valor: "Ouro", rotulo: "Ouro" }];
const LOGADO = { displayName: "Fulano", email: "fulano@exemplo.com" };

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

type Resposta = Response | (() => Response | Promise<Response>);

/**
 * `fetch` falso. Cada chave aceita uma resposta ou uma FILA delas (a última se repete).
 * A consulta de sessão do formulário (GET /api/inscricao/minha) responde "visitante" a
 * menos que o teste diga outra coisa.
 */
function roteador(mapa: Record<string, Resposta | Resposta[]>) {
  const filas = new Map(Object.entries(mapa).map(([k, v]) => [k, Array.isArray(v) ? [...v] : [v]]));
  if (!filas.has("GET /api/inscricao/minha")) {
    filas.set("GET /api/inscricao/minha", [() => json({ jogador: null, inscricao: null })]);
  }
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    const chave = `${init?.method ?? "GET"} ${url}`;
    const fila = filas.get(chave);
    if (!fila) throw new Error(`fetch inesperado: ${chave}`);
    const proxima = fila.length > 1 ? fila.shift()! : fila[0];
    return typeof proxima === "function" ? proxima() : proxima.clone();
  });
  vi.stubGlobal("fetch", f);
  return f;
}

const chamadas = (f: ReturnType<typeof roteador>, chave: string) =>
  f.mock.calls.filter(([url, init]) => `${(init as RequestInit | undefined)?.method ?? "GET"} ${url}` === chave)
    .length;

function campo(rotulo: string) {
  const escapado = rotulo.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&");
  return screen.getByLabelText(new RegExp(escapado, "i"), { selector: "input,select" }) as HTMLInputElement;
}

function preencherPasso1(rotulos = t, tag = "BR1") {
  fireEvent.change(campo(rotulos.nickLabel), { target: { value: "Fulano" } });
  fireEvent.change(campo(rotulos.tagLabel), { target: { value: tag } });
  fireEvent.change(campo(rotulos.discordLabel), { target: { value: "fulano" } });
  fireEvent.change(campo(rotulos.nomeLabel), { target: { value: "Fulano de Tal" } });
}

/** Do passo 2 ao passo 3 com os aceites marcados (os campos do passo 2 já preenchidos ficam). */
async function doPasso2AoPasso3(marcarAceites = true) {
  fireEvent.click(await screen.findByRole("button", { name: "Ouro" }));
  fireEvent.change(campo(t.rota1Label), { target: { value: "MEIO" } });
  fireEvent.change(campo(t.rota2Label), { target: { value: "TOPO" } });
  const noite = screen.getByRole("checkbox", { name: t.turnos.noite }) as HTMLInputElement;
  if (!noite.checked) fireEvent.click(noite);
  fireEvent.click(screen.getByRole("button", { name: t.continuar }));
  await screen.findByText(t.resumoTitulo);
  if (marcarAceites) for (const caixa of screen.getAllByRole("checkbox")) fireEvent.click(caixa);
}

/** Logado desde o começo: passo 1 → 2 → 3, pronto para ENVIAR. */
async function ateOPasso3(tag = "BR1") {
  preencherPasso1(t, tag);
  fireEvent.click(screen.getByRole("button", { name: t.continuar }));
  await doPasso2AoPasso3();
}

const ENVIO_OK = () => json({ ok: true, riotId: "Fulano#BR1" });

describe("sessão caída no envio (INS-08)", () => {
  it("401 precisaEntrar: volta ao passo 1 no modo Entrar, com o aviso; nada de 'Inscrevendo com a conta'", async () => {
    roteador({
      "POST /api/inscricao": json(
        { error: "Crie sua conta ou entre antes de enviar a inscrição.", codigo: "precisa_entrar", precisaEntrar: true },
        401,
      ),
    });
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    await ateOPasso3();
    fireEvent.click(screen.getByRole("button", { name: t.enviar }));

    expect(await screen.findByRole("heading", { name: t.entrarTitulo })).toBeTruthy();
    expect(document.querySelector('input[type="password"]')).not.toBeNull();
    expect(screen.queryByText(t.logadoComo, { exact: false })).toBeNull();
    expect(screen.getByRole("button", { name: t.entrarBotao })).toBeTruthy();
    // O e-mail da conta já vem preenchido no login.
    expect((document.querySelector('input[type="email"]') as HTMLInputElement).value).toBe(LOGADO.email);
    const avisos = screen.getAllByRole("alert").map((a) => a.textContent);
    expect(avisos).toContain(t.erros.precisa_entrar);
  });

  it("depois do login, segue ao passo 2 com tudo preenchido e o reenvio dá certo", async () => {
    const f = roteador({
      "POST /api/inscricao": [
        json({ error: "Crie sua conta ou entre antes de enviar a inscrição.", precisaEntrar: true }, 401),
        ENVIO_OK,
      ],
      "POST /api/conta/login": json({ jogador: LOGADO }),
      "GET /api/sessao": json({ jogador: { nome: "Fulano", temInscricao: false } }),
    });
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    await ateOPasso3();
    fireEvent.click(screen.getByRole("button", { name: t.enviar }));
    await screen.findByRole("heading", { name: t.entrarTitulo });

    fireEvent.change(document.querySelector('input[type="password"]') as HTMLInputElement, {
      target: { value: "senha-de-teste-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: t.entrarBotao }));

    // Passo 2 com o elo que já estava escolhido.
    const ouro = await screen.findByRole("button", { name: "Ouro" });
    expect(ouro.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: t.continuar }));
    await screen.findByText(t.resumoTitulo);
    // Os aceites marcados antes continuam marcados.
    for (const caixa of screen.getAllByRole("checkbox")) expect((caixa as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: t.enviar }));

    expect(await screen.findByText(t.prontoTitulo)).toBeTruthy();
    expect(chamadas(f, "POST /api/inscricao")).toBe(2);
    expect(chamadas(f, "POST /api/conta/login")).toBe(1);
  });
});

describe("resposta perdida e reenvio (INS-09)", () => {
  it("1º envio sem resposta (rede) + reenvio 409 jaInscrito → cartão 'Você já está inscrito' com o link", async () => {
    roteador({
      "POST /api/inscricao": [
        () => {
          throw new TypeError("Failed to fetch");
        },
        json(
          {
            error: "Você já tem uma inscrição nesta edição. Para corrigir algo nela, fale com a organização.",
            codigo: "ja_inscrito",
            jaInscrito: true,
          },
          409,
        ),
      ],
    });
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    await ateOPasso3();
    fireEvent.click(screen.getByRole("button", { name: t.enviar }));
    await screen.findByText(t.erroGenerico);
    fireEvent.click(screen.getByRole("button", { name: t.enviar }));

    expect(await screen.findByText(t.jaInscritoTitulo)).toBeTruthy();
    expect(document.querySelector('a[href="/minha-inscricao"]')).not.toBeNull();
    expect(screen.queryByRole("button", { name: t.enviar })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("controle: um 409 SEM o sinalizador continua sendo erro no passo 3", async () => {
    roteador({
      "POST /api/inscricao": json({ error: "O formulário de inscrição foi atualizado.", formularioDesatualizado: true }, 409),
    });
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    await ateOPasso3();
    fireEvent.click(screen.getByRole("button", { name: t.enviar }));
    expect((await screen.findByRole("alert")).textContent).toBe("O formulário de inscrição foi atualizado.");
    expect(screen.queryByText(t.jaInscritoTitulo)).toBeNull();
  });
});

describe("recibo (INS-11 e INS-12)", () => {
  it("manda clicar em JÁ PAGUEI em Minha inscrição, e não avisar no Discord", async () => {
    roteador({ "POST /api/inscricao": ENVIO_OK });
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    await ateOPasso3();
    fireEvent.click(screen.getByRole("button", { name: t.enviar }));
    const cartao = (await screen.findByText(t.prontoTitulo)).closest(".lob-card-2") as HTMLElement;
    expect(cartao.textContent).toContain(t.jaPaguei);
    expect(cartao.textContent).not.toMatch(/Discord/);
  });

  it("o texto vale nos dois idiomas", () => {
    expect(t.pagamentoAjuda).toContain(t.jaPaguei);
    expect(t.pagamentoAjuda).not.toMatch(/Discord/);
    expect(en.pagamentoAjuda).toContain(en.jaPaguei);
    expect(en.pagamentoAjuda).not.toMatch(/Discord/);
  });

  it("o botão ACOMPANHAR MINHA INSCRIÇÃO pode quebrar linha, com a seta presa à última palavra", async () => {
    roteador({ "POST /api/inscricao": ENVIO_OK });
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    await ateOPasso3();
    fireEvent.click(screen.getByRole("button", { name: t.enviar }));
    await screen.findByText(t.prontoTitulo);
    const botao = document.querySelector('a[href="/minha-inscricao"]') as HTMLElement;
    expect(botao.style.whiteSpace).toBe("normal");
    expect(botao.style.maxWidth).toBe("100%");
    expect(botao.textContent).toBe("ACOMPANHAR MINHA INSCRIÇÃO →");
  });

  it("o mesmo no cartão 'Você já está inscrito'", async () => {
    roteador({
      "GET /api/inscricao/minha": json({ jogador: LOGADO, inscricao: { riotId: "Fulano#BR1" } }),
    });
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={null} />);
    await screen.findByText(t.jaInscritoTitulo);
    const botao = document.querySelector('a[href="/minha-inscricao"]') as HTMLElement;
    expect(botao.style.whiteSpace).toBe("normal");
    expect(botao.textContent).toMatch(/INSCRIÇÃO →$/);
  });
});

describe("acessibilidade (INS-14)", () => {
  it("CONTINUAR com o passo 1 vazio: os avisos são role=alert e os campos ficam aria-invalid, ligados ao aviso", () => {
    roteador({});
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    fireEvent.click(screen.getByRole("button", { name: t.continuar }));

    const alertas = screen.getAllByRole("alert");
    expect(alertas.some((a) => a.textContent === t.campoObrigatorio)).toBe(true);

    const nick = campo(t.nickLabel);
    expect(nick.getAttribute("aria-invalid")).toBe("true");
    const descrito = document.getElementById(nick.getAttribute("aria-describedby") ?? "");
    expect(descrito?.textContent).toBe(t.campoObrigatorio);
    expect(descrito?.getAttribute("role")).toBe("alert");
  });

  it("sem erro, o campo não é aria-invalid e a ajuda o descreve; o nome do campo não leva a ajuda junto", () => {
    roteador({});
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    const discord = campo(t.discordLabel);
    expect(discord.getAttribute("aria-invalid")).toBeNull();
    const ajuda = document.getElementById(discord.getAttribute("aria-describedby") ?? "");
    expect(ajuda?.textContent).toBe(t.discordAjuda);
    expect(ajuda?.getAttribute("role")).toBeNull();
    expect(discord.closest("label")?.textContent).toBe(t.discordLabel);
  });

  it("é um <form>: enviar (Enter) faz o mesmo que o CONTINUAR, e o botão principal é type=submit", async () => {
    roteador({});
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    const form = document.querySelector("form") as HTMLFormElement;
    expect(form).not.toBeNull();
    const continuar = screen.getByRole("button", { name: t.continuar }) as HTMLButtonElement;
    expect(continuar.type).toBe("submit");
    expect(continuar.form).toBe(form);

    preencherPasso1();
    fireEvent.submit(form);
    expect(await screen.findByRole("button", { name: "Ouro" })).toBeTruthy();
  });

  it("no modo Entrar, o botão '←' tem nome que se lê", () => {
    roteador({});
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={null} />);
    fireEvent.click(screen.getByRole("button", { name: t.jaTenhoConta }));
    expect(screen.getByRole("button", { name: t.voltarParaCriarConta }).textContent).toBe("←");
    expect(screen.queryByRole("button", { name: "←" })).toBeNull();
  });

  it("o passo atual é aria-current=step", () => {
    roteador({});
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    const atual = document.querySelectorAll('li[aria-current="step"]');
    expect(atual.length).toBe(1);
    expect(atual[0].textContent).toContain(t.passo1);
  });
});

describe("erros das rotas no idioma da tela (INS-15)", () => {
  it("site em inglês: a senha curta recusada pelo cadastro sai em inglês, no aviso geral e no campo", async () => {
    const pt = "A senha precisa ter pelo menos 12 caracteres.";
    roteador({
      "POST /api/conta/cadastro": json(
        { error: pt, codigo: "senha_curta", problemas: [{ campo: "senha", mensagem: pt }] },
        400,
      ),
    });
    render(<FormularioInscricao t={en} config={CONFIG} elos={ELOS} jogadorInicial={null} />);
    preencherPasso1(en);
    fireEvent.change(campo(en.emailLabel), { target: { value: "fulano@exemplo.com" } });
    fireEvent.change(campo(en.senhaLabel), { target: { value: "curta1" } });
    fireEvent.click(screen.getByRole("button", { name: en.continuar }));

    const alertas = (await screen.findAllByRole("alert")).map((a) => a.textContent);
    expect(alertas).toContain(en.erros.senha_curta);
    expect(alertas.filter((a) => a === en.erros.senha_curta).length).toBe(2);
    expect(document.body.textContent).not.toContain(pt);
  });

  it("site em inglês: o 401 do envio sai em inglês", async () => {
    roteador({
      "POST /api/inscricao": json(
        { error: "Crie sua conta ou entre antes de enviar a inscrição.", codigo: "precisa_entrar", precisaEntrar: true },
        401,
      ),
    });
    render(<FormularioInscricao t={en} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    preencherPasso1(en);
    fireEvent.click(screen.getByRole("button", { name: en.continuar }));
    fireEvent.click(await screen.findByRole("button", { name: "Ouro" }));
    fireEvent.change(campo(en.rota1Label), { target: { value: "MEIO" } });
    fireEvent.change(campo(en.rota2Label), { target: { value: "TOPO" } });
    fireEvent.click(screen.getByRole("checkbox", { name: en.turnos.noite }));
    fireEvent.click(screen.getByRole("button", { name: en.continuar }));
    await screen.findByText(en.resumoTitulo);
    for (const caixa of screen.getAllByRole("checkbox")) fireEvent.click(caixa);
    fireEvent.click(screen.getByRole("button", { name: en.enviar }));

    const alertas = (await screen.findAllByRole("alert")).map((a) => a.textContent);
    expect(alertas).toContain(en.erros.precisa_entrar);
    expect(document.body.textContent).not.toMatch(/Crie sua conta/);
  });

  it("código que o dicionário não conhece: mostra o texto que veio", async () => {
    roteador({
      "POST /api/conta/cadastro": json({ error: "Algo novo.", codigo: "constructor" }, 400),
    });
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={null} />);
    preencherPasso1();
    fireEvent.change(campo(t.emailLabel), { target: { value: "fulano@exemplo.com" } });
    fireEvent.change(campo(t.senhaLabel), { target: { value: "senha-de-teste-123" } });
    fireEvent.click(screen.getByRole("button", { name: t.continuar }));
    expect((await screen.findByRole("alert")).textContent).toBe("Algo novo.");
  });

  it("a ajuda da conta diz a regra da senha ANTES do erro, nos dois idiomas", () => {
    expect(t.contaAjuda).toMatch(/12 caracteres/);
    expect(t.contaAjuda).toMatch(/letras e números/);
    expect(en.contaAjuda).toMatch(/12 characters/);
    expect(en.contaAjuda).toMatch(/letters and numbers/);
  });

  it("o dicionário de erros tem as mesmas chaves nos dois idiomas", () => {
    expect(Object.keys(en.erros).sort()).toEqual(Object.keys(t.erros).sort());
  });
});

describe("resumo do passo 3 (INS-16)", () => {
  it("tag colada como ' #br1 ' aparece como 'Fulano#BR1', sem o ## nem espaço", async () => {
    roteador({});
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    await ateOPasso3(" #br1 ");
    expect(screen.getByText("Fulano#BR1")).toBeTruthy();
    expect(screen.queryByText(/##/)).toBeNull();
  });
});

describe("sessão que a página não viu (INS-18)", () => {
  it("visitante para a página, mas logado e inscrito para o site: mostra 'Você já está inscrito'", async () => {
    roteador({
      "GET /api/inscricao/minha": json({ jogador: LOGADO, inscricao: { riotId: "Fulano#BR1" }, pix: null }),
    });
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={null} />);
    expect(await screen.findByText(t.jaInscritoTitulo)).toBeTruthy();
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it("logado sem inscrição: segue o formulário com a conta, sem pedir e-mail e senha", async () => {
    roteador({ "GET /api/inscricao/minha": json({ jogador: LOGADO, inscricao: null, pix: null }) });
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={null} />);
    expect(await screen.findByText(t.logadoComo, { exact: false })).toBeTruthy();
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(screen.queryByText(t.jaInscritoTitulo)).toBeNull();
  });

  it("reconhecido assim e com a sessão caindo no envio: o login já vem com o e-mail da conta", async () => {
    roteador({
      "GET /api/inscricao/minha": json({ jogador: LOGADO, inscricao: null, pix: null }),
      "POST /api/inscricao": json({ error: "x", codigo: "precisa_entrar", precisaEntrar: true }, 401),
    });
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={null} />);
    await screen.findByText(t.logadoComo, { exact: false });
    await ateOPasso3();
    fireEvent.click(screen.getByRole("button", { name: t.enviar }));
    await screen.findByRole("heading", { name: t.entrarTitulo });
    expect((document.querySelector('input[type="email"]') as HTMLInputElement).value).toBe(LOGADO.email);
  });

  it("controle: visitante de verdade continua vendo e-mail e senha", async () => {
    const f = roteador({});
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={null} />);
    await vi.waitFor(() => expect(chamadas(f, "GET /api/inscricao/minha")).toBe(1));
    expect(document.querySelector('input[type="password"]')).not.toBeNull();
    expect(screen.queryByText(t.logadoComo, { exact: false })).toBeNull();
  });

  it("falha na consulta (500 ou rede): segue como visitante, sem erro na tela", async () => {
    const f = roteador({ "GET /api/inscricao/minha": json({ error: "x", ref: "abcd1234" }, 500) });
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={null} />);
    await vi.waitFor(() => expect(chamadas(f, "GET /api/inscricao/minha")).toBe(1));
    expect(document.querySelector('input[type="password"]')).not.toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("quem a página já reconheceu não pergunta de novo", () => {
    const f = roteador({});
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    expect(chamadas(f, "GET /api/inscricao/minha")).toBe(0);
  });
});

describe("corretor do celular (INS-19)", () => {
  it("nick, tag e Discord sem maiúscula automática, corretor nem verificação ortográfica", () => {
    roteador({});
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    for (const rotulo of [t.nickLabel, t.tagLabel, t.discordLabel]) {
      const el = campo(rotulo);
      expect(el.getAttribute("autocapitalize"), rotulo).toBe("none");
      expect(el.getAttribute("autocorrect"), rotulo).toBe("off");
      expect(el.getAttribute("spellcheck"), rotulo).toBe("false");
    }
  });

  it("WhatsApp abre o teclado de telefone", () => {
    roteador({});
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    const zap = campo(t.whatsappLabel);
    expect(zap.getAttribute("inputmode")).toBe("tel");
    expect(zap.getAttribute("autocomplete")).toBe("tel");
  });
});

