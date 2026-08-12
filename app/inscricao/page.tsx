import type { Metadata } from "next";
import { cookies } from "next/headers";

import FormularioInscricao from "@/components/inscricao/formulario";
import { Eyebrow, GoldTitle } from "@/components/lob/ui";
import { ELO_ORDER } from "@/lib/design";
import { getMessages } from "@/lib/i18n/server";
import { estadoDaJanela } from "@/lib/inscricoes/schema";
import { lerConfigOuNulo } from "@/lib/inscricoes/store";
import { JOGADOR_COOKIE, identidadePorToken } from "@/lib/jogadores/auth";

/**
 * Renderização por requisição — OBRIGATÓRIO, não é preferência.
 *
 * A CSP do site usa nonce (ver proxy.ts), gerado a cada requisição. Uma página
 * estática é pré-renderizada no build, quando o nonce ainda não existe: os <script>
 * saem sem nonce, a CSP bloqueia TODO o JavaScript e a página fica em branco. Já
 * aconteceu com /regras e /legal.
 *
 * Aqui há um segundo motivo, igualmente forte: a página lê a sessão do jogador e a
 * configuração da edição. Nada disso pode ser servido de cache.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inscrição · League of Bronze",
  description: "Inscrição individual para a 4ª Edição do League of Bronze.",
};

function Aviso({ titulo, texto }: Readonly<{ titulo: string; texto: string }>) {
  return (
    <div className="lob-card-2 lob-fade" style={{ padding: "30px 28px" }}>
      <h2 className="lob-display" style={{ margin: "0 0 10px", fontSize: 22, color: "var(--lob-text)" }}>
        {titulo}
      </h2>
      <p style={{ margin: 0, maxWidth: "60ch", color: "var(--lob-muted)", lineHeight: 1.6 }}>{texto}</p>
    </div>
  );
}

export default async function InscricaoPage() {
  const { inscricao: t, paginasStats: ts } = await getMessages();
  const config = await lerConfigOuNulo();

  // Sessão de quem já criou conta e voltou para terminar. Se a leitura falhar, a
  // página segue como visitante — perder a sessão só custa um login a mais, enquanto
  // derrubar a página custaria a inscrição.
  const token = (await cookies()).get(JOGADOR_COOKIE)?.value;
  const jogador = await identidadePorToken(token).catch(() => null);

  // A decisão sai de uma função pura, com o "agora" resolvido fora do render.
  const janela = estadoDaJanela(config);

  const eloRotulos: Record<string, string> = ts.elos;
  const elos = ELO_ORDER.map((e) => ({
    // `valor` é sempre o rótulo canônico em português — é o que `resolveElo`
    // entende no servidor. O que muda com o idioma é só o que se lê.
    valor: e.label,
    rotulo: eloRotulos[e.key] ?? e.label,
    pts: e.pts,
  }));

  return (
    <>
      <header style={{ marginBottom: 26 }}>
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <GoldTitle>{t.titulo}</GoldTitle>
        <p style={{ margin: "10px 0 0", color: "var(--lob-muted)", maxWidth: "62ch" }}>{t.subtitulo}</p>
      </header>

      {janela === "indisponivel" ? (
        <Aviso titulo={t.indisponivelTitulo} texto={t.indisponivelTexto} />
      ) : janela === "encerrada" ? (
        <Aviso titulo={t.encerradaTitulo} texto={t.encerradaTexto} />
      ) : janela === "ainda_nao_abriu" || config === null ? (
        <Aviso titulo={t.fechadaTitulo} texto={t.fechadaTexto} />
      ) : (
        <FormularioInscricao
          t={t}
          elos={elos}
          config={{
            taxaCentavos: config.taxa_centavos,
            chavePix: config.chave_pix,
            prazoPagamentoDias: config.prazo_pagamento_dias,
            minRanqueadas: config.min_ranqueadas,
            diasNoGrupo: config.dias_no_grupo,
          }}
          jogadorInicial={jogador ? { displayName: jogador.displayName, email: jogador.email } : null}
        />
      )}
    </>
  );
}
