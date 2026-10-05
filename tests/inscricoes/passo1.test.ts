import { describe, expect, it } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";
import { problemasDoPasso1, type CampoPasso1, type CamposPasso1 } from "@/lib/inscricoes/passo1";
import { inscricaoPublicaSchema } from "@/lib/inscricoes/schema";

/**
 * O passo 1 confere no navegador o que o servidor só confere no passo 3.
 *
 * As regras do cliente são uma CÓPIA das do schema (o cliente não carrega zod). Este
 * arquivo é o que impede a cópia de se desgarrar: cada exemplo roda nos dois lados, e os
 * dois têm de concordar sobre o campo ser válido ou não. Se alguém mudar o schema e
 * esquecer o cliente, é aqui que quebra.
 */

const t = MESSAGES.pt.inscricao;

const BASE: CamposPasso1 = {
  nick: "Nak4y",
  tag: "JPN",
  nome: "Fulano de Tal",
  discord: "nak4y",
  whatsapp: "",
};

const RESTO_VALIDO = {
  elo: "Diamante",
  rotaPrimaria: "MEIO",
  rotaSecundaria: "ATIRADOR",
  disponibilidade: ["noite"],
  aceiteRegulamento: true,
  aceiteImagem: true,
  aceiteRequisitos: true,
};

/** O servidor acha este campo inválido? */
function servidorRecusa(campos: CamposPasso1, campo: CampoPasso1): boolean {
  const r = inscricaoPublicaSchema.safeParse({
    ...RESTO_VALIDO,
    nick: campos.nick,
    tag: campos.tag,
    nomeReal: campos.nome,
    discord: campos.discord,
    whatsapp: campos.whatsapp || undefined,
  });
  return !r.success && r.error.issues.some((i) => i.path[0] === campo);
}

/** O cliente acha este campo inválido? */
function clienteRecusa(campos: CamposPasso1, campo: CampoPasso1): boolean {
  return problemasDoPasso1(campos, t).some((p) => p.campo === campo);
}

const CASOS: { campo: CampoPasso1; chave: keyof CamposPasso1; valores: string[] }[] = [
  {
    campo: "nick",
    chave: "nick",
    valores: ["", "  ", "ab", "abc", " abc ", "Faker#BR1", "#", "a".repeat(32), "a".repeat(33), "Nome Com Espaço"],
  },
  {
    campo: "tag",
    chave: "tag",
    valores: ["", "#", "A", "#A", "BR1", "#BR1", "##BR1", "BR-1", "BR 1", "12345678", "123456789", "ção"],
  },
  {
    campo: "nomeReal",
    chave: "nome",
    valores: ["", "Fulano", "  Fulano  ", "A B", "Ana Lu", `Maria ${"a".repeat(114)}`, `Maria ${"a".repeat(115)}`],
  },
  {
    campo: "discord",
    chave: "discord",
    valores: ["", " ", "@", " @", "@@", "@ fulano", "@fulano", "fulano", "a".repeat(64), "a".repeat(65), `@${"a".repeat(64)}`],
  },
  {
    campo: "whatsapp",
    chave: "whatsapp",
    valores: ["", "(11) 91234-5678", "1".repeat(24), "1".repeat(25)],
  },
];

describe("o passo 1 concorda com o servidor, campo a campo", () => {
  for (const { campo, chave, valores } of CASOS) {
    for (const valor of valores) {
      it(`${campo} = ${JSON.stringify(valor.length > 20 ? `${valor.slice(0, 12)}…(${valor.length})` : valor)}`, () => {
        const campos = { ...BASE, [chave]: valor };
        expect(clienteRecusa(campos, campo)).toBe(servidorRecusa(campos, campo));
      });
    }
  }

  it("o caso base passa nos dois lados", () => {
    expect(problemasDoPasso1(BASE, t)).toEqual([]);
    for (const { campo } of CASOS) expect(servidorRecusa(BASE, campo)).toBe(false);
  });
});

describe("as mensagens apontam o erro certo", () => {
  it("Riot ID colado inteiro no campo do nick", () => {
    expect(problemasDoPasso1({ ...BASE, nick: "Faker#BR1" }, t)).toEqual([
      { campo: "nick", mensagem: t.nickComHash },
    ]);
  });

  it("um nome só", () => {
    expect(problemasDoPasso1({ ...BASE, nome: "Fulano" }, t)).toEqual([
      { campo: "nomeReal", mensagem: t.nomeIncompleto },
    ]);
  });

  it("Discord só com @ conta como vazio", () => {
    expect(problemasDoPasso1({ ...BASE, discord: " @ " }, t)).toEqual([
      { campo: "discord", mensagem: t.campoObrigatorio },
    ]);
  });
});
