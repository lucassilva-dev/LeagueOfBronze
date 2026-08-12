import { beforeAll, describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/security/password";
import { signSessionToken, verifySessionToken } from "@/lib/security/session";

const SEGREDO_ADMIN = "segredo-de-sessao-para-teste";
const PEPPER_ADMIN = "pepper-de-senha-para-teste";

// O módulo lê o ambiente na chamada, não na importação — mas o import é estático,
// então preparamos antes de qualquer coisa tocar nele.
process.env.ADMIN_SESSION_SECRET = SEGREDO_ADMIN;
process.env.ADMIN_PASSWORD_PEPPER = PEPPER_ADMIN;

let pepperDeSenhaJogador: () => string;
let segredoDeSessao: () => string;
let cadastroJogadorSchema: typeof import("@/lib/jogadores/schema").cadastroJogadorSchema;

beforeAll(async () => {
  const auth = await import("@/lib/jogadores/auth");
  pepperDeSenhaJogador = auth.pepperDeSenhaJogador;
  segredoDeSessao = auth.segredoDeSessao;
  cadastroJogadorSchema = (await import("@/lib/jogadores/schema")).cadastroJogadorSchema;
});

const payload = { sid: "sessao-1", uid: "jogador-1", exp: Math.floor(Date.now() / 1000) + 3600, epoch: 0 };

describe("separação de domínio entre sessão de jogador e de admin", () => {
  it("o segredo do jogador NÃO é o segredo do admin", () => {
    expect(segredoDeSessao()).not.toBe(SEGREDO_ADMIN);
    expect(segredoDeSessao().length).toBeGreaterThan(20);
  });

  it("token de jogador não vale como token de admin", () => {
    // Os dois formatos são idênticos (sid, uid, exp, epoch). Se o segredo fosse o
    // mesmo, este token passaria pela verificação de assinatura do admin e a única
    // coisa segurando a porta seria o sid não existir em admin_sessions — defesa
    // por acidente, não por projeto.
    const doJogador = signSessionToken(payload, segredoDeSessao());

    expect(verifySessionToken(doJogador, SEGREDO_ADMIN)).toBeNull();
    expect(verifySessionToken(doJogador, segredoDeSessao())).toMatchObject({ uid: "jogador-1" });
  });

  it("token de admin não vale como token de jogador", () => {
    const doAdmin = signSessionToken(payload, SEGREDO_ADMIN);

    expect(verifySessionToken(doAdmin, segredoDeSessao())).toBeNull();
  });

  it("o pepper de senha também é separado — hash de um lado não confere do outro", async () => {
    const pepperJogador = pepperDeSenhaJogador();
    expect(pepperJogador).not.toBe(PEPPER_ADMIN);

    const hashDoJogador = await hashPassword("senhaDoJogador123", pepperJogador);

    expect(await verifyPassword("senhaDoJogador123", hashDoJogador, pepperJogador)).toBe(true);
    // Mesmo com a senha certa, o hash não abre com o pepper do outro domínio.
    expect(await verifyPassword("senhaDoJogador123", hashDoJogador, PEPPER_ADMIN)).toBe(false);
  });
});

describe("cadastro de jogador", () => {
  const valido = { email: "Nak4y@Exemplo.com", nome: "Nakay", senha: "umaSenhaBoa123" };

  it("normaliza o e-mail para minúsculas — o índice único é sobre lower(email)", () => {
    expect(cadastroJogadorSchema.parse(valido).email).toBe("nak4y@exemplo.com");
  });

  it("recusa e-mail inválido", () => {
    expect(cadastroJogadorSchema.safeParse({ ...valido, email: "nak4y arroba" }).success).toBe(false);
  });

  it("põe teto no tamanho da senha antes do scrypt", () => {
    // Sem teto, uma senha de 1 MB vira CPU de graça para quem ataca: verifyPassword
    // é caro de propósito, e caro sem limite é negação de serviço.
    const gigante = { ...valido, senha: "a1".repeat(5000) };
    expect(cadastroJogadorSchema.safeParse(gigante).success).toBe(false);
  });
});
