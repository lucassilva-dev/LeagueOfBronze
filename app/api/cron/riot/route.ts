import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { congelarElos, lerConfig, reavaliarPendentes } from "@/lib/inscricoes/store";
import { AUTOR_SISTEMA } from "@/lib/inscricoes/situacao";
import { sincronizarComRiot } from "@/lib/riot/sincronizar";
import { iguaisEmTempoConstante } from "@/lib/security/comparar";

export const dynamic = "force-dynamic";
// O teto do plano Hobby da Vercel. A rodada da Riot usa até 240 s; o resto é folga para
// congelar e reavaliar sem a função ser cortada no meio de uma gravação.
export const maxDuration = 300;

/**
 * A rotina diária da 4ª Edição (Vercel Cron, ver `vercel.json`).
 *
 *  1. Robô da Riot: atualiza elo e os requisitos (d), (m) e (e) de cada inscrito.
 *  2. Congela o elo dos aprovados quando a data de congelamento passou.
 *  3. Promove a apto quem já cumpre tudo e pagou — rede para alguma promoção que tenha
 *     falhado na hora da gravação.
 *
 * Proteção: a Vercel manda `Authorization: Bearer <CRON_SECRET>`. Sem o segredo
 * configurado a rota não roda (503) — sem ele, qualquer pessoa na internet poderia gastar a
 * cota da Riot do campeonato. A comparação é em tempo constante.
 *
 * `?simular=1` consulta a Riot e devolve o que MUDARIA, sem gravar nada (nem congelar, nem
 * promover). Serve para conferir antes de ligar — a resposta leva só Riot IDs, nunca
 * contato.
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET?.trim();
  if (!segredo) {
    return NextResponse.json({ error: "Rotina desligada neste ambiente." }, { status: 503 });
  }

  const autorizacao = request.headers.get("authorization") ?? "";
  if (!iguaisEmTempoConstante(autorizacao, `Bearer ${segredo}`)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const simular = request.nextUrl.searchParams.get("simular") === "1";

  /*
   * As três etapas são independentes: uma falha na rodada da Riot (um 503 dela, um erro de
   * banco num inscrito) não pode impedir o congelamento da data nem a promoção de quem já
   * cumpre tudo — a Vercel não repete o cron, e o próximo é só amanhã. Cada etapa falha
   * sozinha, com log, e a resposta sai 500 se alguma falhou, para aparecer no painel da Vercel.
   */
  const falhas: string[] = [];
  async function etapa<T>(nome: string, fazer: () => Promise<T>, seFalhar: T): Promise<T> {
    try {
      return await fazer();
    } catch (error) {
      console.error(`[api/cron/riot] etapa "${nome}" falhou`, error);
      falhas.push(nome);
      return seFalhar;
    }
  }

  const riot = await etapa("riot", () => sincronizarComRiot({ simular, orcamentoMs: 240_000 }), null);

  const congelados = simular
    ? 0
    : await etapa(
        "congelamento",
        async () => {
          const config = await lerConfig();
          const dataDoCongelamento = config.congelamento_elo ? new Date(config.congelamento_elo).getTime() : NaN;
          return Number.isFinite(dataDoCongelamento) && dataDoCongelamento <= Date.now()
            ? await congelarElos(AUTOR_SISTEMA)
            : 0;
        },
        0,
      );

  const promovidos = await etapa("promocao", () => reavaliarPendentes({ simular }), [] as string[]);

  const resposta = NextResponse.json(
    {
      ok: falhas.length === 0,
      simular,
      riot,
      congelados,
      promovidos: promovidos.length,
      ...(simular && { promoveria: promovidos }),
      ...(falhas.length > 0 && { falhas }),
    },
    { status: falhas.length === 0 ? 200 : 500 },
  );
  resposta.headers.set("Cache-Control", "no-store");
  return resposta;
}
