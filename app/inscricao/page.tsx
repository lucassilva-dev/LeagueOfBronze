import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import FormularioInscricao from "@/components/inscricao/formulario";
import { Eyebrow, GoldTitle, LobShell } from "@/components/lob/ui";
import { ELO_ORDER } from "@/lib/design";
import { metadadosDaPagina } from "@/lib/i18n/metadados";
import { getMessages } from "@/lib/i18n/server";
import { prazoDoAvisoDoFormulario } from "@/lib/inscricoes/fila";
import { estadoDaJanela } from "@/lib/inscricoes/schema";
import { inscricaoIdDoJogador, lerConfigOuNulo, previsaoParaNovoInscrito } from "@/lib/inscricoes/store";
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

// Título da aba no idioma da visita (lib/i18n/messages/metadados.ts): com `metadata`
// fixa, o site em inglês mostrava "Inscrição · League of Bronze".
export async function generateMetadata(): Promise<Metadata> {
  return metadadosDaPagina("inscricao", "/inscricao");
}

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
        // Quebra em duas linhas só quando não cabe (num celular de 320px o rótulo passava da
        // borda do cartão e era cortado), com a seta presa à última palavra.
        <Link
          className="lob-btn-gold"
          href={link.href}
          style={{ display: "inline-block", marginTop: 20, whiteSpace: "normal", maxWidth: "100%", textAlign: "center" }}
        >
          {link.rotulo.replace(/\s+→$/, "\u00a0→")}
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

  /*
   * Vagas cheias? (D1/D2) Só com o formulário à vista. A previsão NUNCA derruba a página:
   * qualquer falha vira "sem previsão" e o passo 3 fica como era — quem decide o lugar de
   * verdade é o servidor, no envio, e o recibo segue o que ele devolver.
   */
  const formularioVisivel = !jaInscrito && janela === "aberta" && config !== null;
  let previsao: Awaited<ReturnType<typeof previsaoParaNovoInscrito>> = null;
  if (formularioVisivel) {
    try {
      previsao = await previsaoParaNovoInscrito();
    } catch {
      previsao = null;
    }
  }
  // O prazo que um titular novo recebe (D3/D4): a data da edição enquanto ela vale. Depois
  // dela, são 48 h contadas do ENVIO — e a hora exata calculada aqui seria a de quando a
  // página abriu, não a de quando a pessoa enviar. Então o aviso diz "48 horas a partir do
  // envio". Sem data na configuração, o aviso antigo em dias.
  const { ate: prazoPagamentoAte, horas: prazoPagamentoHoras } = prazoDoAvisoDoFormulario(config);

  // Com a janela fechada o formulário some — e com ele o "Já tenho conta". Quem se inscreveu
  // e está sem sessão (venceu, outro aparelho) precisa de um caminho para a própria
  // inscrição; quem está logado não precisa dele.
  const entrarParaVer = jogador ? undefined : { href: "/entrar?volta=/minha-inscricao", rotulo: t.jaMeInscreviEntrar };

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
        <Aviso titulo={t.encerradaTitulo} texto={t.encerradaTexto} link={entrarParaVer} />
      ) : janela === "ainda_nao_abriu" || config === null ? (
        <Aviso titulo={t.fechadaTitulo} texto={t.fechadaTexto} link={entrarParaVer} />
      ) : (
        <FormularioInscricao
          t={t}
          elos={elos}
          config={{
            taxaCentavos: config.taxa_centavos,
            chavePix: config.chave_pix,
            prazoPagamentoDias: config.prazo_pagamento_dias,
            prazoPagamentoAte,
            prazoPagamentoHoras,
            minRanqueadas: config.min_ranqueadas,
            pctCampeao: config.pct_campeao,
            fila:
              previsao?.tipo === "reserva"
                ? { tipo: "reserva", posicao: previsao.posicao, vagas: previsao.vagas }
                : previsao?.tipo === "titular"
                  ? { tipo: "titular" }
                  : null,
          }}
          jogadorInicial={jogador ? { displayName: jogador.displayName, email: jogador.email } : null}
        />
      )}
    </LobShell>
  );
}
