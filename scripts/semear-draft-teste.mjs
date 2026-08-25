#!/usr/bin/env node
/**
 * Enche o AMBIENTE DE TESTE com inscritos suficientes para montar o draft ao vivo.
 *
 * Uso:
 *   node scripts/semear-draft-teste.mjs https://teste-league-of-bronze.vercel.app
 *
 * Passa pelas rotas PÚBLICAS de verdade (`/api/conta/cadastro` e `/api/inscricao`), e não
 * por INSERT direto. É mais lento, mas tem duas vantagens que valem: os gatilhos do banco
 * disparam (as pendências de conferência e a linha de pagamento nascem junto) e o próprio
 * fluxo de inscrição fica testado de ponta a ponta antes de o pessoal chegar.
 *
 * ⚠ Só aponte para o ambiente de teste. O script recusa qualquer URL que não comece com
 * "teste-" — inscrição de mentira na base de verdade é o estrago que o ambiente separado
 * existe para evitar.
 *
 * Aprovar (situacao = 'apto') é passo separado, feito no painel ou por SQL: aqui todas
 * nascem "pendente", como nasceriam de verdade.
 */

const BASE = process.argv[2];
if (!BASE) {
  console.error("Uso: node scripts/semear-draft-teste.mjs <url-do-ambiente-de-teste>");
  process.exit(1);
}
if (!/^https:\/\/teste-/.test(BASE)) {
  console.error(`Recusado: "${BASE}" não parece o ambiente de teste (esperado https://teste-…).`);
  process.exit(1);
}

const SENHA = "bronzeteste2026";

/*
 * Orçamento: 6 times × 30 pontos = 180. Esta distribuição soma 156, deixando folga para o
 * draft ter escolhas de verdade — um pool no teto exato trava na primeira escolha cara.
 *
 * Seis por faixa e seis por rota: todo capitão encontra o time que precisa montar.
 */
const FAIXAS = [
  { elo: "DIAMANTE", pts: 8 },
  { elo: "ESMERALDA", pts: 6 },
  { elo: "PLATINA", pts: 5 },
  { elo: "OURO", pts: 4 },
  { elo: "PRATA", pts: 3 },
];
const ROTAS = ["TOP", "JUNG", "MID", "ADC", "SUP"];

const APELIDOS = [
  "TorreSolo", "MatoOMeuJungle", "MidOuAfk", "UltimoTiro", "SuporteDeLuxo", "PratinhaEterno",
  "GankQueNaoVem", "RoubaFarm", "ChutaTorre", "EscudoFurado", "AlimentaGeral", "CacaBaraoSozinho",
  "RoamInfinito", "CriticoNaMinion", "WardCega", "VoltaProFerro", "SmiteAtrasado", "RoubaAzul",
  "MissaNaBase", "CuraTardia", "YasuoDoMal", "ZeroPorCento", "MuroDeVento", "TresPorNove",
  "PingaNaLane", "MinionChefe", "CanhaoAndante", "OndaDeAtaque", "EmpurraSempre", "GuardaCosta",
];

const inscritos = APELIDOS.map((nick, i) => {
  const faixa = FAIXAS[Math.floor(i / 6)];
  const n = String(i + 1).padStart(2, "0");
  return {
    n,
    nick,
    email: `jogador${n}@teste.lob`,
    nome: `Jogador ${n} (teste)`,
    discord: `jogador${n}teste`,
    elo: faixa.elo,
    pontos: faixa.pts,
    rotaPrimaria: ROTAS[i % 5],
    rotaSecundaria: ROTAS[(i + 2) % 5],
    // Dez querem ser capitão para a escolha ter opções — com exatamente seis, o "sorteio"
    // de capitães não sortearia nada.
    querCapitao: i < 10,
  };
});

const cookiesDe = (r) =>
  (r.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0])
    .join("; ");

async function criar(p) {
  const cabecalho = { "Content-Type": "application/json", Origin: BASE };

  const rc = await fetch(`${BASE}/api/conta/cadastro`, {
    method: "POST",
    headers: cabecalho,
    body: JSON.stringify({ email: p.email, nome: p.nome, senha: SENHA }),
  });
  const corpoConta = await rc.json().catch(() => ({}));
  if (!rc.ok) return { ...p, etapa: "conta", erro: corpoConta.error ?? `HTTP ${rc.status}` };

  const cookie = cookiesDe(rc);
  if (!cookie) return { ...p, etapa: "conta", erro: "sem cookie de sessão" };

  const ri = await fetch(`${BASE}/api/inscricao`, {
    method: "POST",
    headers: { ...cabecalho, Cookie: cookie },
    body: JSON.stringify({
      nick: p.nick,
      tag: "TST",
      nomeReal: p.nome,
      discord: p.discord,
      elo: p.elo,
      rotaPrimaria: p.rotaPrimaria,
      rotaSecundaria: p.rotaSecundaria,
      querCapitao: p.querCapitao,
      aceiteRegulamento: true,
      aceiteImagem: true,
      aceiteRequisitos: true,
    }),
  });
  const corpoInsc = await ri.json().catch(() => ({}));
  if (!ri.ok) return { ...p, etapa: "inscrição", erro: corpoInsc.error ?? `HTTP ${ri.status}` };

  return { ...p, ok: true };
}

const resultados = [];
for (const p of inscritos) {
  // Em série de propósito: as rotas públicas têm limite por IP, e trinta pedidos de uma vez
  // seriam barrados — o que faria o script "falhar" sem nada estar errado.
  resultados.push(await criar(p));
  process.stdout.write(".");
}
process.stdout.write("\n");

const bons = resultados.filter((r) => r.ok);
const ruins = resultados.filter((r) => !r.ok);
console.log(`  criados: ${bons.length}/${resultados.length}`);
console.log(`  pontos somados: ${bons.reduce((a, b) => a + b.pontos, 0)} (teto para 6 times: 180)`);
for (const r of ruins.slice(0, 8)) console.log(`  falhou ${r.nick} na ${r.etapa}: ${r.erro}`);
