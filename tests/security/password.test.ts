import { describe, expect, it } from "vitest";

import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/security/password";

const PEPPER = "pepper-de-teste-abc123";

describe("hash de senha (scrypt + pepper)", () => {
  it("aceita a senha correta", async () => {
    const hash = await hashPassword("senha-forte-123", PEPPER);
    await expect(verifyPassword("senha-forte-123", hash, PEPPER)).resolves.toBe(true);
  });

  it("rejeita a senha errada", async () => {
    const hash = await hashPassword("senha-forte-123", PEPPER);
    await expect(verifyPassword("senha-forte-124", hash, PEPPER)).resolves.toBe(false);
  });

  it("REJEITA a senha certa com o pepper errado — é isso que torna um dump do banco inútil", async () => {
    const hash = await hashPassword("senha-forte-123", PEPPER);
    await expect(verifyPassword("senha-forte-123", hash, "outro-pepper")).resolves.toBe(false);
    await expect(verifyPassword("senha-forte-123", hash, "")).resolves.toBe(false);
  });

  it("gera hashes diferentes para a mesma senha (salt aleatório)", async () => {
    const a = await hashPassword("senha-forte-123", PEPPER);
    const b = await hashPassword("senha-forte-123", PEPPER);
    expect(a).not.toBe(b);
    await expect(verifyPassword("senha-forte-123", a, PEPPER)).resolves.toBe(true);
    await expect(verifyPassword("senha-forte-123", b, PEPPER)).resolves.toBe(true);
  });

  it("nunca guarda a senha em claro", async () => {
    const hash = await hashPassword("minha-senha-secreta-1", PEPPER);
    expect(hash).not.toContain("minha-senha-secreta-1");
    expect(hash.startsWith("scrypt$1$")).toBe(true);
  });

  it("rejeita hashes malformados sem explodir", async () => {
    for (const ruim of [
      "",
      "nao-e-hash",
      "scrypt$1$32768$8$1$soh-cinco-campos",
      "bcrypt$1$32768$8$1$c2FsdA$aGFzaA",
      "scrypt$9$32768$8$1$c2FsdA$aGFzaA", // versão desconhecida
      "scrypt$1$0$8$1$c2FsdA$aGFzaA", // N inválido
      "scrypt$1$99999999$8$1$c2FsdA$aGFzaA", // N absurdo (defesa contra DoS)
      "scrypt$1$32768$8$1$$", // salt e hash vazios
    ]) {
      await expect(verifyPassword("qualquer", ruim, PEPPER)).resolves.toBe(false);
    }
  });

  it("lida com senha vazia e com senha muito longa", async () => {
    const hash = await hashPassword("", PEPPER);
    await expect(verifyPassword("", hash, PEPPER)).resolves.toBe(true);
    await expect(verifyPassword("x", hash, PEPPER)).resolves.toBe(false);

    const longa = "a".repeat(200);
    const hashLonga = await hashPassword(longa, PEPPER);
    await expect(verifyPassword(longa, hashLonga, PEPPER)).resolves.toBe(true);
  });
});

describe("força da senha", () => {
  it("exige tamanho mínimo", () => {
    expect(validatePasswordStrength("curta1")).toBeTruthy();
    expect(validatePasswordStrength("umasenhaqualquer1")).toBeNull();
  });

  it("exige letras e números", () => {
    expect(validatePasswordStrength("somenteletrasaqui")).toBeTruthy();
    expect(validatePasswordStrength("123456789012345")).toBeTruthy();
    expect(validatePasswordStrength("comletras123456")).toBeNull();
  });

  it("rejeita senha absurdamente longa (DoS de CPU no scrypt)", () => {
    expect(validatePasswordStrength("a1".repeat(200))).toBeTruthy();
  });
});
