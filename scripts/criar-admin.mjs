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
 *       Pede a senha (digitação oculta) e imprime o INSERT para o SQL Editor.
 *
 * Requer ADMIN_PASSWORD_PEPPER no ambiente — o MESMO valor configurado na Vercel:
 *   PowerShell:  $env:ADMIN_PASSWORD_PEPPER="<valor>"
 *
 * Sem terminal interativo, a senha pode vir de: $env:NOVA_SENHA="<senha>"
 */

import { createHmac, randomBytes, scryptSync } from "node:crypto";

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

/** Leitura oculta de senha, em modo raw (funciona no Windows). */
function perguntarOculto(pergunta) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;

    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      reject(
        new Error(
          "Terminal interativo indisponível.\n" +
            "  Defina a senha por variável e rode de novo:\n" +
            '    $env:NOVA_SENHA="sua-senha-forte-123"',
        ),
      );
      return;
    }

    stdout.write(pergunta);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let senha = "";

    const finalizar = (valor, erro) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", aoDigitar);
      stdout.write("\n");
      if (erro) reject(erro);
      else resolve(valor);
    };

    const aoDigitar = (bloco) => {
      for (const ch of bloco) {
        if (ch === "\r" || ch === "\n" || ch === "\u0004") return finalizar(senha);
        if (ch === "\u0003") return finalizar(null, new Error("Cancelado."));
        if (ch === "\u007f" || ch === "\b") {
          if (senha.length > 0) {
            senha = senha.slice(0, -1);
            stdout.write("\b \b");
          }
          continue;
        }
        if (ch >= " ") {
          senha += ch;
          stdout.write("*");
        }
      }
    };

    stdin.on("data", aoDigitar);
  });
}

async function obterSenha(usuario) {
  const doAmbiente = process.env.NOVA_SENHA;
  if (doAmbiente) return doAmbiente;
  return perguntarOculto(`Senha para "${usuario}" (mín. 12 caracteres, letras + números): `);
}

async function main() {
  if (process.argv.includes("--segredos")) {
    const gerar = () => randomBytes(32).toString("base64url");
    console.log("\n=== Defina estas variáveis na Vercel (Production) e no seu .env.local ===\n");
    console.log(`ADMIN_SESSION_SECRET=${gerar()}`);
    console.log(`ADMIN_PASSWORD_PEPPER=${gerar()}`);
    console.log(`LOGIN_IP_PEPPER=${gerar()}`);
    console.log("\nGuarde o ADMIN_PASSWORD_PEPPER: trocá-lo invalida TODAS as senhas já cadastradas.");
    console.log("Trocar o ADMIN_SESSION_SECRET desconecta todo mundo (útil em emergência).\n");
    return;
  }

  const usuario = arg("usuario");
  const nome = arg("nome") ?? usuario;
  const master = process.argv.includes("--master");
  const pepper = process.env.ADMIN_PASSWORD_PEPPER?.trim();

  if (!usuario) {
    console.error('Uso: node scripts/criar-admin.mjs --usuario <login> [--nome "Nome"] [--master]');
    console.error("     node scripts/criar-admin.mjs --segredos");
    process.exitCode = 1;
    return;
  }

  if (!pepper) {
    console.error("ERRO: ADMIN_PASSWORD_PEPPER não está no ambiente desta janela do terminal.");
    console.error("  Use o MESMO valor que você colocou na Vercel:");
    console.error('    $env:ADMIN_PASSWORD_PEPPER="<valor>"');
    console.error("  E então rode o comando de novo.");
    process.exitCode = 1;
    return;
  }

  const senha = await obterSenha(usuario);

  if (!senha || senha.length < 12 || !/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
    console.error("\nERRO: senha fraca. Use 12+ caracteres combinando letras e números.");
    process.exitCode = 1;
    return;
  }

  const hash = hashSenha(senha, pepper);
  const escapar = (v) => String(v).replace(/'/g, "''");

  console.log("\n=== Rode este SQL no SQL Editor do Supabase ===\n");
  console.log(`insert into public.admin_users (username, display_name, password_hash, is_master, scopes)
values ('${escapar(usuario)}', '${escapar(nome)}', '${hash}', ${master}, '{}')
on conflict do nothing;\n`);
  console.log("A senha em si não foi gravada em lugar nenhum — só o hash acima.\n");
}

main().catch((erro) => {
  console.error(`\nERRO: ${erro.message}`);
  process.exitCode = 1;
});
