import { NextResponse } from "next/server";

import { respostaDeErro } from "@/lib/security/resposta-erro";
import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/security/route-guard";
import { startNewTournament, ConflitoDeVersaoError } from "@/lib/data-store";
import { startTournamentSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const guarda = await requireAdmin(request, "tournament:lifecycle");
  if (!guarda.ok) return guarda.response;


  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = startTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos. Confira o nome, o formato e a confirmação." },
      { status: 400 },
    );
  }

  try {
    const { dataset, versao } = await startNewTournament({
      name: parsed.data.name,
      format: parsed.data.format,
      keepTeams: parsed.data.keepTeams,
      keepPlayers: parsed.data.keepPlayers,
      archiveCurrent: parsed.data.archiveCurrent,
    });
    /*
     * A VERSÃO vai junto. Esta rota grava pelo caminho incondicional, que INCREMENTA a
     * versão da linha; sem devolvê-la, o painel adotava o dataset novo e seguia com o
     * número velho, e o primeiro "Salvar" depois disso caía num 409 falso — sem ninguém
     * ter salvo nada, e com as duas saídas ruins (descartar o rascunho ou usar `force`,
     * que desliga a própria trava).
     */
    return NextResponse.json({ dataset, versao, message: "Nova temporada iniciada." });
  } catch (error) {
    /*
     * Conflito de versão não é falha de sistema: é outra pessoa tendo gravado entre a
     * leitura e a gravação desta operação (que arquiva o retrato do que está no ar, então
     * precisa mesmo da trava). Vira 409 para a tela poder oferecer recarregar.
     */
    if (error instanceof ConflitoDeVersaoError) {
      return NextResponse.json(
        {
          error: "Alguém salvou o campeonato enquanto você iniciar a temporada. Recarregue e tente de novo.",
          conflict: true,
          serverVersion: error.versaoAtual,
        },
        { status: 409 },
      );
    }
    return respostaDeErro("admin/tournament/start", error, "Falha ao iniciar a temporada.", 500);
  }
}
