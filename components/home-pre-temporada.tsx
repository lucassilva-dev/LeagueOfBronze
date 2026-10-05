import Link from "next/link";

import { Eyebrow, GoldTitle, Pill, SectionTitle } from "@/components/lob/ui";
import { Trailer4a } from "@/components/trailer-4a";
import { getMessages } from "@/lib/i18n/server";
import { estadoDaJanela, type EstadoJanela } from "@/lib/inscricoes/schema";
import { lerConfigOuNulo } from "@/lib/inscricoes/store";
import { getServerArchivedSeasons, getServerDataset } from "@/lib/server-data";
import { getChampionshipResult } from "@/lib/tournament";

/** `destino` diz para onde o link leva, e decide o rótulo: a série da final ou a temporada. */
type Campeao = { nome: string; temporada: string; href: string; destino: "final" | "temporada" };

/**
 * O campeão mais recente, venha ele da temporada ainda no ar ou do arquivo.
 *
 * Os dois caminhos existem porque o código vai ao ar ANTES de a organização arquivar a
 * edição pelo painel: até lá o campeão está no dataset ao vivo; depois, só no arquivo.
 *
 * Falha de leitura NÃO derruba a home: a razão de ser desta página é a chamada para a
 * inscrição, e ela não depende do dataset. Sem dados, o bloco do campeão some e o resto fica.
 */
async function buscarCampeao(): Promise<Campeao | null> {
  try {
    const { dataset, indexes } = await getServerDataset();
    const championship = getChampionshipResult(dataset);
    if (championship) {
      return {
        nome: indexes.teamsById.get(championship.championTeamId)?.name ?? championship.championTeamId,
        temporada: dataset.tournament.name,
        href: `/partidas/${encodeURIComponent(championship.summary.series.id)}`,
        destino: "final",
      };
    }
  } catch (error) {
    console.error("[home] leitura do dataset falhou; a home segue sem o bloco do campeão.", error);
  }

  // Já vem da mais recente para a mais antiga, e degrada para lista vazia se o banco falhar.
  const ultima = (await getServerArchivedSeasons()).find((s) => s.championTeamName);
  if (!ultima?.championTeamName) return null;
  return {
    nome: ultima.championTeamName,
    temporada: ultima.name,
    href: `/temporadas/${encodeURIComponent(ultima.seasonId)}`,
    destino: "temporada",
  };
}

function formatarMoeda(centavos: number, localeTag: string) {
  return new Intl.NumberFormat(localeTag, { style: "currency", currency: "BRL" }).format(centavos / 100);
}

const SELO_ESTILO: Record<EstadoJanela, { cor: string; fundo: string; borda: string }> = {
  aberta: { cor: "#8fe0a0", fundo: "rgba(95,191,106,.14)", borda: "rgba(95,191,106,.5)" },
  ainda_nao_abriu: { cor: "#e6c592", fundo: "rgba(201,138,75,.10)", borda: "rgba(201,138,75,.4)" },
  encerrada: { cor: "#a99e8b", fundo: "rgba(255,255,255,.04)", borda: "rgba(169,158,139,.35)" },
  indisponivel: { cor: "#e6c592", fundo: "rgba(201,138,75,.10)", borda: "rgba(201,138,75,.4)" },
};

/**
 * Home da PRÉ-TEMPORADA (ver lib/fase-do-site.ts): a porta de entrada da inscrição.
 *
 * Nada aqui crava data, número de times nem formato — isso é decidido com o grupo a cada
 * edição. Os números que aparecem (taxa, prazo) vêm da Configuração da edição.
 */
export async function HomePreTemporada() {
  const [mensagens, config, campeao] = await Promise.all([
    getMessages(),
    lerConfigOuNulo(),
    buscarCampeao(),
  ]);
  const t = mensagens.preTemporada;
  const janela = estadoDaJanela(config);
  const valor = config ? formatarMoeda(config.taxa_centavos, mensagens.compartilhados.localeTag) : null;

  const selo = {
    aberta: t.seloAberta,
    ainda_nao_abriu: t.seloAindaNaoAbriu,
    encerrada: t.seloEncerrada,
    indisponivel: t.seloIndisponivel,
  }[janela];
  const intro = {
    aberta: t.introAberta,
    ainda_nao_abriu: t.introAindaNaoAbriu,
    encerrada: t.introEncerrada,
    indisponivel: t.introAberta,
  }[janela];
  const estiloSelo = SELO_ESTILO[janela];

  const passos = [
    { titulo: t.passo1Titulo, texto: t.passo1Texto },
    { titulo: t.passo2Titulo, texto: t.passo2Texto },
    {
      titulo: t.passo3Titulo,
      texto:
        config && valor
          ? t.passo3Texto.replace("{valor}", valor).replace("{dias}", String(config.prazo_pagamento_dias))
          : t.passo3TextoSemValores,
    },
    { titulo: t.passo4Titulo, texto: t.passo4Texto },
    { titulo: t.passo5Titulo, texto: t.passo5Texto },
  ];

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      {/* HERO */}
      <section className="lob-fade" style={{ padding: "clamp(48px,8vw,88px) 0 30px" }}>
        <Eyebrow>{t.homeSobretitulo}</Eyebrow>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: 14,
            padding: "6px 12px",
            borderRadius: 2,
            border: `1px solid ${estiloSelo.borda}`,
            background: estiloSelo.fundo,
            color: estiloSelo.cor,
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: ".14em",
          }}
        >
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: estiloSelo.cor }} />
          {selo}
        </span>
        <GoldTitle style={{ fontSize: "clamp(52px,11vw,148px)", lineHeight: 1.08, margin: "12px 0 calc(14px - 0.42em)" }}>
          {t.homeTituloLinha1}
          <br />
          {t.homeTituloLinha2}
        </GoldTitle>
        <p style={{ maxWidth: 620, fontSize: "clamp(15px,2.2vw,18px)", lineHeight: 1.55, color: "#a99e8b", margin: "0 0 26px" }}>
          {intro}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 11, marginBottom: 26 }}>
          <Link href="/inscricao" className="lob-btn-gold" style={{ padding: "16px 28px", fontSize: 14 }}>
            {janela === "aberta" ? t.botaoInscrever : t.botaoVerInscricao}
          </Link>
          <Link href="/regras" className="lob-btn-ghost" style={{ padding: "16px 24px", fontSize: 13 }}>
            {t.botaoRegras}
          </Link>
          <Link href="/temporadas" className="lob-btn-ghost" style={{ padding: "16px 24px", fontSize: 13 }}>
            {t.botaoTemporadas}
          </Link>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          <Pill>{t.pilulaIndividual}</Pill>
          {valor ? <Pill>{t.pilulaTaxa.replace("{valor}", valor)}</Pill> : null}
          <Pill>{t.pilulaPremio}</Pill>
        </div>
      </section>

      {/* TRAILER — logo abaixo da chamada, porque ele termina na própria tela de inscrição */}
      <section className="lob-fade" style={{ margin: "18px 0 44px" }}>
        <div style={{ marginBottom: 10 }}>
          <SectionTitle>{t.trailerTitulo}</SectionTitle>
        </div>
        <p style={{ maxWidth: 620, fontSize: 14, lineHeight: 1.55, color: "#a99e8b", margin: "0 0 16px" }}>
          {t.trailerTexto}
        </p>
        <Trailer4a aria={t.trailerAria} semSuporte={t.trailerSemSuporte} />
        {/* O vídeo termina na tela de inscrição; o botão fica logo embaixo dele. */}
        <div style={{ marginTop: 18 }}>
          <Link href="/inscricao" className="lob-btn-gold" style={{ padding: "16px 28px", fontSize: 14 }}>
            {janela === "aberta" ? t.botaoInscrever : t.botaoVerInscricao}
          </Link>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="lob-fade" style={{ margin: "18px 0 44px" }}>
        <div style={{ marginBottom: 16 }}>
          <SectionTitle>{t.comoTitulo}</SectionTitle>
        </div>
        <ol
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
            gap: 14,
          }}
        >
          {passos.map((passo, i) => (
            <li key={passo.titulo} className="lob-card-2" style={{ padding: "20px 18px" }}>
              <div className="lob-display" style={{ fontSize: 34, lineHeight: 1, color: "#f0c88a" }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="lob-display" style={{ marginTop: 10, fontSize: 18, color: "#f3ece0" }}>
                {passo.titulo}
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.55, color: "#8f8472" }}>{passo.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* CAMPEÃO DA EDIÇÃO ANTERIOR */}
      {campeao ? (
        <section className="lob-fade">
          <Link
            href={campeao.href}
            className="lob-lift"
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: "clamp(14px,3vw,26px)",
              flexWrap: "wrap",
              overflow: "hidden",
              textDecoration: "none",
              border: "1px solid rgba(232,184,120,.42)",
              borderRadius: 4,
              background: "linear-gradient(135deg,#2b1f0f,#140f07)",
              padding: "clamp(20px,3.5vw,32px)",
            }}
          >
            <div style={{ fontSize: "clamp(34px,6vw,48px)", lineHeight: 1 }} aria-hidden>
              🏆
            </div>
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <div style={{ fontSize: 11, letterSpacing: ".24em", color: "#e6c592" }}>
                {t.campeaoSobretitulo.replace("{temporada}", campeao.temporada.toUpperCase())}
              </div>
              <div
                className="lob-display gold-text"
                style={{ marginTop: 8, fontSize: "clamp(26px,5vw,44px)", lineHeight: 1.06, overflowWrap: "anywhere" }}
              >
                {campeao.nome.toUpperCase()}
              </div>
            </div>
            <span style={{ color: "#e6c592", fontWeight: 700, fontSize: 12, letterSpacing: ".12em" }}>
              {campeao.destino === "final" ? t.campeaoVerFinal : t.campeaoVer}
            </span>
          </Link>
        </section>
      ) : null}
    </div>
  );
}
