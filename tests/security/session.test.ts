import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { newSessionId, signSessionToken, verifySessionToken } from "@/lib/security/session";

const SECRET = "segredo-de-sessao-para-teste";
const AGORA = 1_800_000_000_000; // referência fixa de tempo

function payload(overrides: Partial<Parameters<typeof signSessionToken>[0]> = {}) {
  return {
    sid: newSessionId(),
    uid: "11111111-2222-3333-4444-555555555555",
    exp: Math.floor(AGORA / 1000) + 3600,
    epoch: 1,
    ...overrides,
  };
}

describe("token de sessão assinado", () => {
  it("assina e valida de volta", () => {
    const p = payload();
    const token = signSessionToken(p, SECRET);
    expect(verifySessionToken(token, SECRET, AGORA)).toEqual(p);
  });

  it("o token NÃO deriva da senha (é um id aleatório) — falha central do modelo antigo", () => {
    const a = signSessionToken(payload(), SECRET);
    const b = signSessionToken(payload(), SECRET);
    expect(a).not.toBe(b); // cada login gera um token distinto
  });

  it("rejeita token assinado com outro segredo", () => {
    const token = signSessionToken(payload(), "outro-segredo");
    expect(verifySessionToken(token, SECRET, AGORA)).toBeNull();
  });

  it("rejeita corpo adulterado (troca de usuário)", () => {
    const token = signSessionToken(payload(), SECRET);
    const [versao, corpo, assinatura] = token.split(".");
    const adulterado = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(corpo, "base64url").toString()), uid: "invasor" }),
    ).toString("base64url");
    expect(verifySessionToken(`${versao}.${adulterado}.${assinatura}`, SECRET, AGORA)).toBeNull();
  });

  it("rejeita assinatura removida ou trocada", () => {
    const token = signSessionToken(payload(), SECRET);
    const [versao, corpo] = token.split(".");
    expect(verifySessionToken(`${versao}.${corpo}.`, SECRET, AGORA)).toBeNull();
    expect(verifySessionToken(`${versao}.${corpo}`, SECRET, AGORA)).toBeNull();
    expect(verifySessionToken(`${versao}.${corpo}.aaaa`, SECRET, AGORA)).toBeNull();
  });

  it("rejeita sessão expirada", () => {
    const token = signSessionToken(payload({ exp: Math.floor(AGORA / 1000) - 1 }), SECRET);
    expect(verifySessionToken(token, SECRET, AGORA)).toBeNull();
  });

  it("aceita antes de expirar e rejeita depois", () => {
    const exp = Math.floor(AGORA / 1000) + 60;
    const token = signSessionToken(payload({ exp }), SECRET);
    expect(verifySessionToken(token, SECRET, AGORA)).not.toBeNull();
    expect(verifySessionToken(token, SECRET, exp * 1000 + 1)).toBeNull();
  });

  it("rejeita versão desconhecida de token", () => {
    const token = signSessionToken(payload(), SECRET).replace(/^v1\./, "v2.");
    expect(verifySessionToken(token, SECRET, AGORA)).toBeNull();
  });

  it("REJEITA o formato do cookie antigo (sha256 da senha)", () => {
    const cookieLegado = createHash("sha256").update("senha:sitecampeonato-admin-v1").digest("hex");
    expect(verifySessionToken(cookieLegado, SECRET, AGORA)).toBeNull();
  });

  it("rejeita lixo, vazio e ausente", () => {
    for (const ruim of ["", "   ", "a.b", "a.b.c.d", "v1..", "v1.###.###", null, undefined]) {
      expect(verifySessionToken(ruim as string, SECRET, AGORA)).toBeNull();
    }
  });

  it("rejeita quando não há segredo configurado", () => {
    const token = signSessionToken(payload(), SECRET);
    expect(verifySessionToken(token, "", AGORA)).toBeNull();
  });

  it("rejeita payload com campos faltando ou de tipo errado", () => {
    const forjar = (obj: unknown) => {
      const corpo = Buffer.from(JSON.stringify(obj)).toString("base64url");
      const assin = createHmac("sha256", SECRET).update(corpo).digest("base64url");
      return `v1.${corpo}.${assin}`;
    };
    expect(verifySessionToken(forjar({ uid: "u", exp: 9e9, epoch: 1 }), SECRET, AGORA)).toBeNull();
    expect(verifySessionToken(forjar({ sid: "s", exp: 9e9, epoch: 1 }), SECRET, AGORA)).toBeNull();
    expect(verifySessionToken(forjar({ sid: "s", uid: "u", epoch: 1 }), SECRET, AGORA)).toBeNull();
    expect(verifySessionToken(forjar({ sid: "s", uid: "u", exp: "9e9", epoch: 1 }), SECRET, AGORA)).toBeNull();
    expect(verifySessionToken(forjar("texto"), SECRET, AGORA)).toBeNull();
  });
});
