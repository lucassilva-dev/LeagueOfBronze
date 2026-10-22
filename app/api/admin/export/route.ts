import { NextResponse } from "next/server";

import { respostaDeErro } from "@/lib/security/resposta-erro";
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/security/route-guard";
import { readDatasetText } from "@/lib/data-store";

export const dynamic = "force-dynamic";

/**
 * "2026-11-20-22-00-00": data e hora do backup no relógio de BRASÍLIA.
 *
 * O servidor roda em UTC, e `toISOString()` fazia o backup das 22h de sexta 20/11 se
 * chamar "...-2026-11-21-01-00-00" — de sábado. Na hora de escolher "o de antes da rodada
 * de sábado", a data do nome induzia a pegar o arquivo errado.
 */
function carimboDeBrasilia(instante: Date): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instante)
      .map((parte) => [parte.type, parte.value]),
  );
  return `${partes.year}-${partes.month}-${partes.day}-${partes.hour}-${partes.minute}-${partes.second}`;
}

export async function GET(request: NextRequest) {
  const guarda = await requireAdmin(request, "dataset:export");
  if (!guarda.ok) return guarda.response;


  try {
    const text = await readDatasetText();
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="leagueofbronze-backup-${carimboDeBrasilia(new Date())}.json"`,
      },
    });
  } catch (error) {
    return respostaDeErro("admin/export", error, "Falha ao exportar.", 500);
  }
}
