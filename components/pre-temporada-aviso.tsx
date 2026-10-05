import Link from "next/link";

import { Eyebrow, GoldTitle } from "@/components/lob/ui";
import { getMessages } from "@/lib/i18n/server";
import { estadoDaJanela } from "@/lib/inscricoes/schema";
import { lerConfigOuNulo } from "@/lib/inscricoes/store";

type Pagina = "times" | "jogadores" | "calendario" | "tabela" | "estatisticas";

const ROTULO = {
  times: "navTimes",
  jogadores: "navJogadores",
  calendario: "navCalendario",
  tabela: "navTabela",
  estatisticas: "navEstatisticas",
} as const satisfies Record<Pagina, string>;

/**
 * O que as páginas da temporada mostram enquanto a temporada ao vivo está vazia — entre
 * arquivar uma edição e aplicar o draft da próxima (ver `semTemporadaAoVivo` em
 * lib/fase-do-site.ts, que é quem decide).
 *
 * Sem isto elas não quebravam, mas mentiam: "OS 0 TIMES", "0 INSCRITOS" no dia em que as
 * inscrições abriram, e uma Grande Final marcada para uma data que já passou.
 *
 * O botão da inscrição segue a janela, como na home: com as inscrições encerradas,
 * "FAZER MINHA INSCRIÇÃO" prometeria o que a página seguinte não entrega.
 */
export async function PreTemporadaAviso({ pagina }: Readonly<{ pagina: Pagina }>) {
  const [{ preTemporada: t, comum }, config] = await Promise.all([getMessages(), lerConfigOuNulo()]);
  const aberta = estadoDaJanela(config) === "aberta";

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 26px" }}>
        <Eyebrow>{t.avisoSobretitulo}</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(44px,10vw,128px)", lineHeight: 0.88 }}>
          {comum[ROTULO[pagina]]}
        </GoldTitle>
      </section>

      <section className="lob-card-2 lob-fade" style={{ padding: "clamp(22px,4vw,34px)", maxWidth: 760 }}>
        <h2
          className="lob-display"
          style={{ margin: "0 0 10px", fontSize: "clamp(20px,3vw,26px)", color: "#f3ece0" }}
        >
          {t.avisoTitulo}
        </h2>
        <p style={{ margin: 0, maxWidth: "62ch", fontSize: 15, lineHeight: 1.6, color: "#a99e8b" }}>
          {t.avisoTexto}
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
          <Link href="/inscricao" className="lob-btn-gold">
            {aberta ? t.avisoBotaoInscricao : t.botaoVerInscricao}
          </Link>
          <Link href="/temporadas" className="lob-btn-ghost">
            {t.avisoBotaoTemporadas}
          </Link>
        </div>
      </section>
    </div>
  );
}
