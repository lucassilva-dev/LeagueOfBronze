"use client";

import { PainelDeErro, idiomaDoNavegador, textosDoErro, useIdioma } from "@/components/tela-de-erro";
import { htmlLang } from "@/lib/i18n/config";
import { AVISO_RIOT_OFICIAL } from "@/lib/i18n/messages/legal";

/**
 * Falha no PRÓPRIO layout raiz (o SiteFrame, a leitura do idioma) — a app/error.tsx não
 * cobre esse caso, porque ela mora dentro do layout que quebrou.
 *
 * Esta tela substitui o documento inteiro: precisa do próprio <html> e <body>, e não leva
 * o CSS nem as fontes do layout. Por isso o fundo e as cores vão inline aqui, e o painel
 * (components/tela-de-erro.tsx) já é todo inline.
 *
 * "Tentar de novo" recarrega a página inteira: com o layout quebrado não há o que
 * aproveitar do que está na tela, e a recarga é o caminho que sempre funciona.
 */
export default function ErroGeral({ error }: Readonly<{ error: Error & { digest?: string } }>) {
  const idioma = useIdioma(idiomaDoNavegador);
  return (
    <html lang={htmlLang(idioma)}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#100d07",
          color: "#b8ab97",
          fontFamily: '"Chakra Petch", system-ui, sans-serif',
        }}
      >
        <title>{textosDoErro(idioma).tituloDaAba}</title>
        <PainelDeErro idioma={idioma} codigo={error.digest} onTentarDeNovo={() => window.location.reload()} />
        {/* O aviso da Riot vai em TODA página (ver site-frame.tsx) — esta também. */}
        <p
          lang="en"
          style={{
            maxWidth: 640,
            margin: "0 auto",
            padding: "0 clamp(16px,4vw,24px) 32px",
            fontSize: 11,
            lineHeight: 1.6,
            color: "#8f8472",
          }}
        >
          {AVISO_RIOT_OFICIAL}
        </p>
      </body>
    </html>
  );
}
