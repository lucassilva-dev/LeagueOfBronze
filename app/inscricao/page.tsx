import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import FormularioInscricao from "@/components/inscricao/formulario";
import { Eyebrow, GoldTitle, LobShell } from "@/components/lob/ui";
import { ELO_ORDER } from "@/lib/design";
import { getMessages } from "@/lib/i18n/server";
import { estadoDaJanela } from "@/lib/inscricoes/schema";
import { inscricaoIdDoJogador, lerConfigOuNulo } from "@/lib/inscricoes/store";
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

function Aviso({
  titulo,
  texto,
  link,
}: Readonly<{ titulo: string; texto: string; link?: { href: string; rotulo: string } }>) {
  return (
    <div className="lob-card-2 lob-fade" style={{ padding: "30px 28px" }}>
      <h2 className="lob-display" style={{ margin: "0 0 10px", fontSize: 22, color: "var(--lob-text)" }}>
        {titulo}
      </h2>
      <p style={{ margin: 0, maxWidth: "60ch", color: "var(--lob-muted)", lineHeight: 1.6 }}>{texto}</p>
      {link ? (
        <Link className="lob-btn-gold" href={link.href} style={{ display: "inline-block", marginTop: 20 }}>
          {link.rotulo}
        </Link>
      ) : null}
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

  // Quem JÁ se inscreveu não refaz os três passos para ouvir "esse e-mail já está
  // inscrito" no fim: vai direto para a própria inscrição. Na dúvida (leitura falhou),
  // mostra o formulário — o servidor recusa a duplicata do mesmo jeito.
  const jaInscrito = jogador ? Boolean(await inscricaoIdDoJogador(jogador.id).catch(() => null)) : false;

  // A decisão sai de uma função pura, com o "agora" resolvido fora do render.
  const janela = estadoDaJanela(config);

  const eloRotulos: Record<string, string> = ts.elos;
  // Sem os pontos de cada elo: a tabela da 4ª só sai depois que a lista fechar
  // (seção 3 do regulamento), e a que existe hoje é a da 3ª.
  const elos = ELO_ORDER.map((e) => ({
    // `valor` é sempre o rótulo canônico em português — é o que `resolveElo`
    // entende no servidor. O que muda com o idioma é só o que se lê.
    valor: e.label,
    rotulo: eloRotulos[e.key] ?? e.label,
  }));

  return (
    <LobShell>
      <header style={{ marginBottom: 26 }}>
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <GoldTitle>{t.titulo}</GoldTitle>
        <p style={{ margin: "10px 0 0", color: "var(--lob-muted)", maxWidth: "62ch" }}>{t.subtitulo}</p>
      </header>

      {jaInscrito ? (
        <Aviso
          titulo={t.jaInscritoTitulo}
          texto={t.jaInscritoTexto}
          link={{ href: "/minha-inscricao", rotulo: t.prontoVer }}
        />
      ) : janela === "indisponivel" ? (
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
            pctCampeao: config.pct_campeao,
          }}
          jogadorInicial={jogador ? { displayName: jogador.displayName, email: jogador.email } : null}
        />
      )}
    </LobShell>
  );
}
