import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { respostaDeErro } from "@/lib/security/resposta-erro";

export const dynamic = "force-dynamic";

/**
 * Callback da Tournament API da Riot.
 *
 * Quando uma partida jogada com um tournament code termina, os servidores da Riot fazem um
 * POST para a URL registrada no provider com o resultado. Diferente do resto de /api/admin,
 * esta rota é PÚBLICA por necessidade — quem chama é a Riot, sem cookie de sessão nosso.
 *
 * O que protege esta rota, então:
 *  - só aceita POST, e só JSON;
 *  - teto de tamanho no corpo, para um payload gigante não virar consumo de memória;
 *  - o corpo é validado contra um schema; o que não bate é descartado;
 *  - ela NÃO grava no dataset do campeonato. O resultado fica registrado no log para a
 *    organização conferir e lançar pelo painel. Escrita automática a partir de uma requisição
 *    externa não autenticada seria um caminho de adulteração da classificação.
 *
 * A Riot espera HTTP 200 para considerar o callback entregue; sem isso ela reenvia por até
 * 5 minutos. Por isso qualquer falha de processamento nossa ainda responde 200 — reenviar
 * não resolveria — enquanto corpo malformado responde 400.
 *
 * ATENÇÃO ao registrar o provider: a Riot só aceita URL de callback em domínio com TLD
 * aprovado pela ICANN antes de março de 2011 (ou ccTLD). O domínio `.app` do vercel.app NÃO
 * atende esse critério — é preciso um domínio próprio (.com, .net, .com.br, .gg) apontando
 * para cá antes de registrar o provider.
 */

const TETO_BYTES = 64 * 1024;

/**
 * Formato do callback (Tournament-V5). Campos extras são ignorados de propósito: a Riot pode
 * acrescentar campos, e um payload novo não deve derrubar o endpoint.
 */
const callbackSchema = z.object({
  shortCode: z.string().trim().max(200).optional(),
  metaData: z.string().trim().max(2000).optional(),
  gameId: z.union([z.number(), z.string()]).optional(),
  gameName: z.string().trim().max(200).optional(),
  gameType: z.string().trim().max(100).optional(),
  gameMap: z.union([z.number(), z.string()]).optional(),
  gameMode: z.string().trim().max(100).optional(),
  region: z.string().trim().max(20).optional(),
  winningTeam: z.array(z.object({}).passthrough()).optional(),
  losingTeam: z.array(z.object({}).passthrough()).optional(),
  startTime: z.union([z.number(), z.string()]).optional(),
});

export async function POST(request: NextRequest) {
  /*
   * O teto é medido no CORPO LIDO, não no cabeçalho.
   *
   * `Content-Length` é opcional: quem envia `Transfer-Encoding: chunked` simplesmente
   * não manda o cabeçalho, o `?? 0` fazia a comparação virar `0 > 65536` (falso), e
   * `request.json()` materializava o corpo inteiro na memória da função antes de o Zod
   * chegar a rodar. Esta rota é PÚBLICA e sem autenticação — é a Riot que chama —, então
   * bastava um cliente qualquer mandar centenas de MB em paralelo para derrubar a
   * instância por memória, recebendo um 400 depois do estrago.
   *
   * Ler como texto e medir os bytes de verdade é o mesmo que `lerCorpoPublico` já faz
   * nas rotas internas; aqui não dá para reusá-la inteira porque ela exige mesma origem,
   * que uma chamada da Riot nunca teria.
   */
  // 1º corte, de graça: quando o cabeçalho VEM, recusa sem ler byte nenhum do corpo.
  // (Ele é opcional — `Transfer-Encoding: chunked` não o manda — por isso não basta
  //  sozinho; mas remover esta checagem, como uma versão anterior desta correção fez,
  //  obrigava a bufferizar até um corpo declaradamente gigante antes de responder 413.)
  const declarado = Number(request.headers.get("content-length") ?? Number.NaN);
  if (Number.isFinite(declarado) && declarado > TETO_BYTES) {
    return NextResponse.json({ error: "Payload grande demais." }, { status: 413 });
  }

  let corpo: unknown;
  try {
    // 2º corte: quem não declarou tamanho é medido no corpo lido de verdade. Sem isto,
    // um cliente que omite o `Content-Length` materializava centenas de MB na memória da
    // função antes de o Zod rodar — e esta rota é PÚBLICA e sem autenticação.
    const texto = await request.text();
    if (Buffer.byteLength(texto, "utf8") > TETO_BYTES) {
      return NextResponse.json({ error: "Payload grande demais." }, { status: 413 });
    }
    corpo = JSON.parse(texto);
  } catch {
    // O `await request.text()` fica DENTRO do try: corpo truncado no meio do envio
    // rejeita a promessa, e fora daqui isso virava 500 onde o certo é 400.
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = callbackSchema.safeParse(corpo);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const { shortCode, gameId, region, winningTeam, losingTeam } = parsed.data;
    // Registro para a organização conferir e lançar o resultado pelo painel.
    console.info("[riot/tournament-callback] partida recebida", {
      shortCode,
      gameId,
      region,
      jogadoresVencedores: winningTeam?.length ?? 0,
      jogadoresPerdedores: losingTeam?.length ?? 0,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Reenviar não resolveria um erro nosso, então confirmamos o recebimento mesmo assim.
    respostaDeErro("riot/tournament-callback", error, "Falha ao processar o callback.");
    return NextResponse.json({ ok: true });
  }
}

/** Verificação de disponibilidade: útil ao registrar o provider e para monitoramento. */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "riot-tournament-callback", accepts: "POST" });
}
