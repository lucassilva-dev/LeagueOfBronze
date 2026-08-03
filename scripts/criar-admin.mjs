#!/usr/bin/env node
/**
 * Gera os segredos e o SQL para criar uma conta de admin.
 *
 * A SENHA NUNCA SAI DESTA MÁQUINA: o script só imprime o hash (scrypt + pepper).
 * Sem o pepper — que fica apenas nas variáveis de ambiente, nunca no banco — o hash
 * é inútil para quem obtiver um dump da tabela.
 *
 * Uso:
 *   node scripts/criar-admin.mjs --segredos
 *       Gera ADMIN_SESSION_SECRET, ADMIN_PASSWORD_PEPPER e LOGIN_IP_PEPPER.
 *
 *   node scripts/criar-admin.mjs --usuario lucas --nome "Lucas" --master
 *       Pede a senha e imprime o INSERT para rodar no SQL Editor do Supabase.
 *       Requer ADMIN_PASSWORD_PEPPER no ambiente (o MESMO valor da Vercel).
 */

import { createHmac, randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";

const N = 32768;
const R = 8;
const P = 1;
const KEYLEN = 32;

function hashSenha(senha, pepper) {
  const pre = createHmac("sha256", pepper).update(senha, "utf8").digest();
  const salt = randomBytes(16);
  const derivado = scryptSync(pre, salt, KEYLEN, { N, r: R, p: P, maxmem: 96 * 1024 * 1024 });
  return ["scrypt", "1", N, R, P, salt.toString("base64url"), derivado.toString("base64url")].join("$");
}

function arg(nome) {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function perguntarOculto(pergunta) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const stdout = process.stdout;
    const aoEscrever = (chunk, encoding, cb) => {
      // Não ecoa a senha no terminal.
      if (rl.line.length > 0) return cb();
      return stdout.constructor.prototype.write.call(stdout, chunk, encoding, cb);
    };
    const original = stdout.write;
    stdout.write = aoEscrever;
    rl.question(pergunta, (resposta) => {
      stdout.write = original;
      stdout.write("\n");
      rl.close();
      resolve(resposta);
    });
  });
}

if (process.argv.includes("--segredos")) {
  const gerar = () => randomBytes(32).toString("base64url");
  console.log("\n=== Defina estas variáveis na Vercel (Production) e no seu .env.local ===\n");
  console.log(`ADMIN_SESSION_SECRET=${gerar()}`);
  console.log(`ADMIN_PASSWORD_PEPPER=${gerar()}`);
  console.log(`LOGIN_IP_PEPPER=${gerar()}`);
  console.log("\nGuarde o ADMIN_PASSWORD_PEPPER: trocá-lo invalida TODAS as senhas já cadastradas.");
  console.log("Trocar o ADMIN_SESSION_SECRET desconecta todo mundo (útil em emergência).\n");
  process.exit(0);
}

const usuario = arg("usuario");
const nome = arg("nome") ?? usuario;
const master = process.argv.includes("--master");
const pepper = process.env.ADMIN_PASSWORD_PEPPER?.trim();

if (!usuario) {
  console.error("Uso: node scripts/criar-admin.mjs --usuario <login> [--nome \"Nome\"] [--master]");
  console.error("     node scripts/criar-admin.mjs --segredos");
  process.exit(1);
}
if (!pepper) {
  console.error("ERRO: defina ADMIN_PASSWORD_PEPPER no ambiente antes de rodar.");
  console.error('  PowerShell:  $env:ADMIN_PASSWORD_PEPPER="<valor>"');
  process.exit(1);
}

const senha = await perguntarOculto(`Senha para "${usuario}" (mín. 12 caracteres, letras + números): `);

if (senha.length < 12 || !/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
  console.error("ERRO: senha fraca. Use 12+ caracteres combinando letras e números.");
  process.exit(1);
}

const hash = hashSenha(senha, pepper);
const escapar = (v) => String(v).replace(/'/g, "''");

console.log("\n=== Rode este SQL no SQL Editor do Supabase ===\n");
console.log(`insert into public.admin_users (username, display_name, password_hash, is_master, scopes)
values ('${escapar(usuario)}', '${escapar(nome)}', '${hash}', ${master}, '{}')
on conflict do nothing;\n`);
console.log("A senha em si não foi gravada em lugar nenhum — só o hash acima.\n");
