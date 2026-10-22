import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { criarBancoSimulado } from "./_banco-simulado";

/**
 * INS-15 — as regras do store saem com um `codigo` estável, e a resposta da rota o leva.
 *
 * O texto das regras de `criarInscricao` é fixo em português. Sem código, o formulário não
 * tinha como saber QUAL regra era, e o site em inglês mostrava «As inscrições estão
 * encerradas.» em português. Com o código, a tela traduz por `inscricao.erros` (ver
 * components/inscricao/formulario.tsx) e, quando não conhece o código, mostra o texto.
 */

const estado = vi.hoisted(() => ({
  banco: null as unknown as ReturnType<typeof import("./_banco-simulado").criarBancoSimulado>,
  riot: { puuid: "PUUID-X" as string | null },
}));

vi.mock("@/lib/data-store", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => estado.banco.cliente(),
}));

const store = await import("@/lib/inscricoes/store");
const { inscricaoPublicaSchema } = await import("@/lib/inscricoes/schema");
const { ErroDeRegra } = await import("@/lib/security/erros");
const { respostaDeErro } = await import("@/lib/security/resposta-erro");
const { MESSAGES } = await import("@/lib/i18n/messages");

function dados(nick = "Fulano") {
  return inscricaoPublicaSchema.parse({
    nick,
    tag: "BR1",
    nomeReal: "Fulano de Tal",
    discord: `${nick.toLowerCase()}_dc`,
    elo: "Ouro",
    rotaPrimaria: "MID",
    rotaSecundaria: "TOP",
    disponibilidade: ["noite"],
    aceiteRegulamento: true,
    aceiteImagem: true,
    aceiteRequisitos: true,
  });
}

const DONO = { ipHash: "h1", jogadorId: "eu", email: "eu@x.com" };

/** O código da regra que barrou, ou falha o teste se não foi uma regra. */
async function codigoDa(tentativa: Promise<unknown>): Promise<string | undefined> {
  const erro = await tentativa.then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroDeRegra);
  return (erro as InstanceType<typeof ErroDeRegra>).codigo;
}

beforeEach(() => {
  estado.banco = criarBancoSimulado();
  estado.banco.tabelas = {
    edicao_config: [
      {
        id: 1,
        inscricoes_abertas: true,
        abertura_inscricoes: "2026-10-05T12:00:00.000Z",
        fechamento_inscricoes: null,
        riot_pausa_ate: null,
      },
    ],
    inscricoes: [],
  };
  estado.riot.puuid = "PUUID-X";
  vi.stubEnv("RIOT_API_KEY", "RGAPI-teste");
  vi.stubGlobal("fetch", async () => {
    if (!estado.riot.puuid) return new Response(JSON.stringify({ status: { status_code: 404 } }), { status: 404 });
    return new Response(JSON.stringify({ puuid: estado.riot.puuid, gameName: "Fulano", tagLine: "BR1" }), { status: 200 });
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("cada regra de criarInscricao sai com o seu código", () => {
  it("janela encerrada pela data", async () => {
    estado.banco.tabelas.edicao_config![0]!.fechamento_inscricoes = "2026-01-01T00:00:00.000Z";
    expect(await codigoDa(store.criarInscricao(dados(), DONO))).toBe("inscricoes_encerradas");
  });

  it("janela que ainda não abriu", async () => {
    Object.assign(estado.banco.tabelas.edicao_config![0]!, { inscricoes_abertas: false, abertura_inscricoes: null });
    expect(await codigoDa(store.criarInscricao(dados(), DONO))).toBe("inscricoes_fechadas");
  });

  it("teto de inscrições por origem na última hora", async () => {
    const agora = new Date().toISOString();
    estado.banco.tabelas.inscricoes = Array.from({ length: 10 }, (_, i) => ({
      id: `o${i}`,
      ip_hash: "h1",
      jogador_id: `outra${i}`,
      criado_em: agora,
    }));
    expect(await codigoDa(store.criarInscricao(dados(), DONO))).toBe("muitas_inscricoes_origem");
  });

  it("a conta do site já tem inscrição", async () => {
    estado.banco.tabelas.inscricoes = [{ id: "minha", jogador_id: "eu", ip_hash: "h0", criado_em: "2026-10-06T00:00:00.000Z" }];
    expect(await codigoDa(store.criarInscricao(dados(), DONO))).toBe("ja_inscrito");
  });

  it("Riot ID que não existe na Riot", async () => {
    estado.riot.puuid = null;
    expect(await codigoDa(store.criarInscricao(dados(), DONO))).toBe("riot_id_inexistente");
  });

  it("a mesma conta da Riot já inscrita (pelo PUUID)", async () => {
    estado.banco.tabelas.inscricoes = [
      { id: "antiga", jogador_id: "outra", ip_hash: "h0", puuid: "PUUID-X", criado_em: "2026-10-06T00:00:00.000Z" },
    ];
    expect(await codigoDa(store.criarInscricao(dados(), DONO))).toBe("conta_riot_ja_inscrita");
  });

  it.each([
    ['duplicate key value violates unique constraint "inscricoes_riot_id_key"', "riot_id_ja_inscrito"],
    ['duplicate key value violates unique constraint "inscricoes_discord_key"', "discord_ja_inscrito"],
    ['duplicate key value violates unique constraint "inscricoes_email_key"', "email_ja_inscrito"],
  ])("índice único (23505): %s → %s", async (mensagem, codigo) => {
    estado.banco.falha = (tabela, op) =>
      tabela === "inscricoes" && op === "insert" ? { message: mensagem, code: "23505" } : null;
    expect(await codigoDa(store.criarInscricao(dados(), DONO))).toBe(codigo);
  });
});

describe("o código chega à resposta e tem tradução", () => {
  it("respostaDeErro devolve { error, codigo } para regra com código", async () => {
    const r = respostaDeErro("teste", new ErroDeRegra("As inscrições estão encerradas.", "inscricoes_encerradas"), "x");
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "As inscrições estão encerradas.", codigo: "inscricoes_encerradas" });
  });

  it("regra sem código: só o texto, como antes", async () => {
    const r = respostaDeErro("teste", new ErroDeRegra("Inscrição não encontrada."), "x");
    expect(await r.json()).toEqual({ error: "Inscrição não encontrada." });
  });

  it("erro que não é regra continua genérico, sem código nem detalhe do banco", async () => {
    const r = respostaDeErro("teste", new Error("relation inscricoes does not exist"), "Não foi possível.");
    const corpo = (await r.json()) as Record<string, unknown>;
    expect(corpo.error).toBe("Não foi possível.");
    expect(corpo).not.toHaveProperty("codigo");
  });

  it("todo código que o store emite tem tradução em pt e en", () => {
    const codigos = [
      "inscricoes_encerradas",
      "inscricoes_fechadas",
      "muitas_inscricoes_origem",
      "ja_inscrito",
      "riot_id_inexistente",
      "conta_riot_ja_inscrita",
      "riot_id_ja_inscrito",
      "discord_ja_inscrito",
      "email_ja_inscrito",
    ];
    for (const idioma of ["pt", "en"] as const) {
      for (const codigo of codigos) {
        expect(Object.hasOwn(MESSAGES[idioma].inscricao.erros, codigo), `${idioma}: ${codigo}`).toBe(true);
      }
    }
    // E o inglês é inglês de verdade, não o texto em português copiado.
    expect(MESSAGES.en.inscricao.erros.conta_riot_ja_inscrita).not.toBe(MESSAGES.pt.inscricao.erros.conta_riot_ja_inscrita);
  });
});
