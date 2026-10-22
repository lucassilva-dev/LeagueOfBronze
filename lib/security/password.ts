import {
  createHmac,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";

// promisify não infere a sobrecarga com `options`; tipamos explicitamente.
const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/**
 * Hash de senha com scrypt (nativo do Node — sem dependência nova) + "pepper".
 *
 * Por que o pepper importa aqui: a senha é primeiro passada por HMAC-SHA256 com um
 * segredo que vive APENAS na variável de ambiente, nunca no banco. Assim, mesmo que
 * alguém consiga um dump completo da tabela de usuários, os hashes são inúteis para
 * ataque de dicionário — falta o pepper. É a peça que sustenta o requisito
 * "mesmo com acesso ao banco não consegue nada".
 *
 * Formato armazenado: scrypt$<versão>$<N>$<r>$<p>$<salt>$<hash>   (base64url)
 */

const VERSION = "1";
const SCRYPT_N = 32768; // custo de CPU/memória (~32 MB)
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const MAX_MEM = 96 * 1024 * 1024;
const MAX_N = 1 << 20; // teto defensivo: hash malformado não pode virar DoS

/** Aplica o pepper. O valor é usado como bytes UTF-8, então qualquer string serve. */
function prehash(password: string, pepper: string): Buffer {
  return createHmac("sha256", pepper).update(password, "utf8").digest();
}

export async function hashPassword(password: string, pepper: string): Promise<string> {
  if (!pepper) throw new Error("Pepper de senha não configurado (ADMIN_PASSWORD_PEPPER).");

  const salt = randomBytes(16);
  const derived = (await scrypt(prehash(password, pepper), salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEM,
  })) as Buffer;

  return [
    "scrypt",
    VERSION,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
  pepper: string,
): Promise<boolean> {
  if (!pepper || !stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 7) return false;

  const [algo, version, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
  if (algo !== "scrypt" || version !== VERSION) return false;

  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isSafeInteger(n) || n < 2 || n > MAX_N) return false;
  if (!Number.isSafeInteger(r) || r < 1 || r > 32) return false;
  if (!Number.isSafeInteger(p) || p < 1 || p > 16) return false;

  const salt = Buffer.from(saltRaw, "base64url");
  const expected = Buffer.from(hashRaw, "base64url");
  if (salt.length === 0 || expected.length === 0) return false;

  let derived: Buffer;
  try {
    // Deriva exatamente o mesmo tamanho do esperado: a comparação sempre roda em
    // buffers de igual comprimento, então não vaza tamanho por tempo de resposta.
    derived = (await scrypt(prehash(password, pepper), salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: MAX_MEM,
    })) as Buffer;
  } catch {
    return false;
  }

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/**
 * Por que a senha foi recusada, como CÓDIGO estável — o texto depende do idioma de quem
 * lê (o cadastro de jogador responde em inglês no site em inglês), o código não.
 */
export type MotivoDeSenhaFraca = "senha_curta" | "senha_longa" | "senha_fraca";

export const MENSAGENS_DE_SENHA_FRACA: Record<"pt" | "en", Record<MotivoDeSenhaFraca, string>> = {
  pt: {
    senha_curta: "A senha precisa ter pelo menos 12 caracteres.",
    senha_longa: "A senha é longa demais (máximo de 200 caracteres).",
    senha_fraca: "A senha precisa combinar letras e números.",
  },
  en: {
    senha_curta: "The password must be at least 12 characters long.",
    senha_longa: "The password is too long (200 characters at most).",
    senha_fraca: "The password must mix letters and numbers.",
  },
};

export function motivoDeSenhaFraca(password: string): MotivoDeSenhaFraca | null {
  if (password.length < 12) return "senha_curta";
  if (password.length > 200) return "senha_longa";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "senha_fraca";
  return null;
}

/** Senha forte o suficiente para uma conta que controla o campeonato inteiro. */
export function validatePasswordStrength(password: string): string | null {
  const motivo = motivoDeSenhaFraca(password);
  return motivo ? MENSAGENS_DE_SENHA_FRACA.pt[motivo] : null;
}

/*
 * Alfabeto da senha provisória: minúsculas e dígitos SEM os que se confundem quando a
 * senha é ditada ou copiada de um print no grupo (0/o, 1/l/i). Fica com 31 símbolos.
 */
const ALFABETO_PROVISORIO = "abcdefghjkmnpqrstuvwxyz23456789";
const BLOCOS_PROVISORIOS = 3;
const TAMANHO_DO_BLOCO = 4;

/**
 * Senha provisória que a organização entrega ao jogador que esqueceu a dele.
 *
 * 12 símbolos sorteados com `randomInt` (uniforme, do gerador criptográfico) em 3 blocos
 * separados por hífen: "k7wm-3qfa-x9pe". Dá ~59 bits — muito acima do que o limitador de
 * tentativas deixa alguém chutar — e ainda é fácil de ler em voz alta.
 *
 * Sempre tem letra E número, então também passa em `validatePasswordStrength`: o jogador
 * que só confirmar a provisória na tela de troca não esbarra na regra de senha.
 */
export function gerarSenhaProvisoria(): string {
  for (;;) {
    const blocos = Array.from({ length: BLOCOS_PROVISORIOS }, () =>
      Array.from(
        { length: TAMANHO_DO_BLOCO },
        () => ALFABETO_PROVISORIO[randomInt(ALFABETO_PROVISORIO.length)],
      ).join(""),
    );
    const senha = blocos.join("-");
    if (/[a-z]/.test(senha) && /[0-9]/.test(senha)) return senha;
  }
}
