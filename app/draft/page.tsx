import type { Metadata } from "next";

import Transmissao from "@/components/draft/transmissao";
import { getMessages } from "@/lib/i18n/server";

/**
 * Dinâmica, como toda página do site: a CSP usa nonce por requisição e uma página
 * pré-renderizada sai sem ele (ver o comentário em app/regras/page.tsx). Aqui há um
 * segundo motivo — o conteúdo muda a cada dois segundos, então cache não faz sentido.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Draft ao vivo · League of Bronze",
  description: "Acompanhe o sorteio dos times da 4ª Edição em tempo real.",
};

/**
 * A transmissão ocupa a página inteira, SEM o `LobShell`.
 *
 * Antes esta página punha um cabeçalho do site em cima — olho "4ª EDIÇÃO · AO VIVO",
 * título "DRAFT" em Anton 96px e subtítulo — e só então a transmissão. Duas coisas davam
 * errado: o handoff especifica um título POR FASE ("QUEM CAPITANEIA O QUÊ", "OS TIMES
 * ESTÃO FORMADOS"), então havia dois títulos brigando; e o shell limita a largura a
 * 1160px, enquanto o desenho é de palco — barra de status e grade de times ocupando a
 * tela toda, para ser projetado numa TV.
 *
 * O título de cada fase vive dentro da transmissão, onde ele muda junto com o estado.
 */
export default async function DraftPage() {
  const { draft: t } = await getMessages();

  return <Transmissao t={t} />;
}
