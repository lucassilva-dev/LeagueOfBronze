import Link from "next/link";

import { CONTATO_EMAIL } from "@/lib/i18n/messages/legal";
import { getMessages } from "@/lib/i18n/server";

/**
 * Nota de consentimento das páginas que mostram foto + Riot ID de jogadores.
 *
 * As políticas da Riot proíbem de-anonimizar jogadores. Aqui foto, Riot ID e rota aparecem
 * juntos, então a autorização precisa estar visível NA PRÓPRIA PÁGINA onde os dados são
 * exibidos — não apenas na /legal — junto do caminho para pedir a remoção.
 */
export async function AvisoConsentimento() {
  const t = (await getMessages()).conformidade;

  return (
    <p
      style={{
        marginTop: 40,
        paddingTop: 16,
        borderTop: "1px solid rgba(201,138,75,.12)",
        fontSize: 11.5,
        lineHeight: 1.6,
        // Texto pequeno pede 4,5:1 (WCAG AA): o #7d7263 dava 4,1:1 sobre o fundo do site.
        color: "#8f8472",
      }}
    >
      {t.consentimentoJogadores}{" "}
      <a href={`mailto:${CONTATO_EMAIL}`} style={{ color: "#c98a4b", textDecoration: "none" }}>
        {CONTATO_EMAIL}
      </a>
      {" · "}
      <Link href="/legal" style={{ color: "#c98a4b", textDecoration: "none" }}>
        {t.consentimentoLink}
      </Link>
    </p>
  );
}
