import type { Metadata } from "next";

import { Eyebrow, GoldTitle, SectionTitle } from "@/components/lob/ui";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { AVISO_RIOT_OFICIAL, CONTATO_EMAIL } from "@/lib/i18n/messages/legal";
import { getMessages } from "@/lib/i18n/server";
import { JOGADOR_COOKIE } from "@/lib/jogadores/auth";

/**
 * Renderização por requisição — OBRIGATÓRIO enquanto a CSP usar nonce (ver proxy.ts).
 * Página estática é pré-renderizada no build, sai sem nonce nos <script>, a CSP bloqueia
 * o JavaScript e o conteúdo preso no bloco de Suspense nunca aparece: página em branco.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages();
  return { title: t.legal.metaTitulo, description: t.legal.metaDescricao };
}

/**
 * Página de aviso legal e privacidade.
 *
 * Atende às políticas da Riot Games para produtos de terceiros: o aviso de não-endosso em
 * local prontamente visível (também está no rodapé de todas as páginas), a origem dos assets,
 * e um canal de contato público para pedidos de correção/remoção de dados — inclusive os
 * repassados pela Riot.
 *
 * A parte de privacidade descreve o que o site GRAVA de fato: cookies, conta de jogador
 * (lib/jogadores) e inscrição (lib/inscricoes, supabase/schema-4a-edicao.sql), e o que
 * atravessa para o público (lib/draft/virada.ts e a transmissão do draft). Quem mudar o
 * que é coletado ou publicado precisa mudar este texto junto — política desatualizada
 * é afirmação falsa com o nome da organização embaixo.
 */

const BLOCO = {
  background: "rgba(201,138,75,.06)",
  border: "1px solid rgba(201,138,75,.16)",
  borderRadius: 4,
  padding: "18px 20px",
} as const;

const P = {
  margin: 0,
  fontSize: 13.5,
  lineHeight: 1.65,
  color: "#b3a690",
} as const;

const DESTAQUE = { color: "#cfa877" } as const;

const LISTA = {
  margin: 0,
  paddingLeft: 18,
  display: "flex",
  flexDirection: "column",
  gap: 7,
  fontSize: 13.5,
  lineHeight: 1.6,
  color: "#b3a690",
} as const;

const NOME_COOKIE = {
  ...DESTAQUE,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 12.5,
  overflowWrap: "anywhere",
} as const;

const LINK_EMAIL = { color: "#e6c592", textDecoration: "none", overflowWrap: "anywhere" } as const;

function Secao({
  titulo,
  children,
}: Readonly<{ titulo: string; children: React.ReactNode }>) {
  return (
    <section className="lob-fade" style={{ marginTop: 34 }}>
      <div style={{ marginBottom: 13 }}>
        <SectionTitle size={20}>{titulo}</SectionTitle>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>{children}</div>
    </section>
  );
}

export default async function LegalPage() {
  const t = await getMessages();

  return (
    <div
      style={{
        position: "relative",
        maxWidth: 900,
        margin: "0 auto",
        padding: "0 clamp(16px,4vw,24px) 96px",
      }}
    >
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 8px" }}>
        <Eyebrow>{t.legal.sobretitulo}</Eyebrow>
        <GoldTitle
          style={{ fontSize: "clamp(40px,9vw,96px)", lineHeight: 0.9, margin: "10px 0 16px" }}
        >
          {t.legal.titulo}
        </GoldTitle>
        <p style={{ maxWidth: 620, fontSize: 15, lineHeight: 1.55, color: "#a99e8b", margin: 0 }}>
          {t.legal.subtitulo}
        </p>
      </section>

      <Secao titulo={t.legal.secaoNaoSomos}>
        {/*
          Texto EXIGIDO literalmente pela política da Riot. Vem de uma constante justamente
          para nunca ser traduzido nem reescrito por engano — aparece igual nos dois idiomas.
        */}
        <div style={BLOCO}>
          <p style={{ ...P, color: "#e2d6c0" }}>{AVISO_RIOT_OFICIAL}</p>
        </div>
        <p style={P}>
          <span style={DESTAQUE}>{t.legal.traducaoPrefixo}</span> {t.legal.traducaoAviso}
        </p>
        <p style={P}>{t.legal.projetoAmador}</p>
      </Secao>

      <Secao titulo={t.legal.secaoPropriedade}>
        <p style={P}>{t.legal.marcas}</p>
        <p style={P}>{t.legal.assets}</p>
        <p style={P}>{t.legal.assetsProprios}</p>
      </Secao>

      <Secao titulo={t.legal.secaoGuarda}>
        <p style={P}>{t.legal.guardaIntro}</p>
        <div style={BLOCO}>
          <ul style={LISTA}>
            <li>{t.legal.guardaItem1}</li>
            <li>{t.legal.guardaItem2}</li>
            <li>{t.legal.guardaItem3}</li>
          </ul>
        </div>
        <p style={P}>{t.legal.guardaVisitante}</p>
        {/*
          Os nomes vêm das MESMAS constantes que criam os cookies — se um deles mudar de
          nome, esta lista acompanha sozinha. Se um cookie NOVO for criado, ele precisa
          entrar aqui à mão: a página diz que esta é a lista inteira.
        */}
        <div style={BLOCO}>
          <ul style={LISTA}>
            <li>
              <span style={NOME_COOKIE}>{LOCALE_COOKIE}</span> — {t.legal.cookieIdioma}
            </li>
            <li>
              <span style={NOME_COOKIE}>{JOGADOR_COOKIE}</span> — {t.legal.cookieJogador}
            </li>
            <li>
              <span style={NOME_COOKIE}>{ADMIN_SESSION_COOKIE}</span> — {t.legal.cookieAdmin}
            </li>
          </ul>
        </div>
        <p style={P}>{t.legal.guardaLinksExternos}</p>
        <p style={P}>{t.legal.guardaConsentimento}</p>
      </Secao>

      <Secao titulo={t.legal.secaoConta}>
        <p style={P}>{t.legal.contaIntro}</p>
        <p style={P}>{t.legal.contaSenha}</p>
        <p style={P}>{t.legal.contaRegistros}</p>
        <p style={P}>{t.legal.contaEmail}</p>
        <p style={P}>{t.legal.contaRetencao}</p>
      </Secao>

      <Secao titulo={t.legal.secaoInscricao}>
        <p style={P}>{t.legal.inscricaoIntro}</p>
        <div style={BLOCO}>
          <ul style={LISTA}>
            <li>{t.legal.inscricaoItem1}</li>
            <li>{t.legal.inscricaoItem2}</li>
            <li>{t.legal.inscricaoItem3}</li>
            <li>{t.legal.inscricaoItem4}</li>
            <li>{t.legal.inscricaoItem5}</li>
            <li>{t.legal.inscricaoItem6}</li>
          </ul>
        </div>
        <p style={P}>{t.legal.inscricaoAutomatico}</p>
        <p style={P}>{t.legal.inscricaoOrganizacao}</p>
        <p style={P}>{t.legal.inscricaoPagamento}</p>
        <p style={P}>
          <span style={DESTAQUE}>{t.legal.rotuloParaQue}</span> {t.legal.inscricaoParaQue}
        </p>
        <p style={P}>
          <span style={DESTAQUE}>{t.legal.rotuloQuemVe}</span> {t.legal.inscricaoQuemVe}
        </p>
        <p style={P}>{t.legal.inscricaoPublico}</p>
        <p style={P}>{t.legal.inscricaoTransmissao}</p>
        <p style={P}>
          <span style={DESTAQUE}>{t.legal.rotuloPrazo}</span> {t.legal.inscricaoPrazo}
        </p>
        <p style={P}>
          <span style={DESTAQUE}>{t.legal.rotuloCorrecao}</span> {t.legal.inscricaoCorrecaoAntes}{" "}
          <a href={`mailto:${CONTATO_EMAIL}`} style={LINK_EMAIL}>
            {CONTATO_EMAIL}
          </a>{" "}
          {t.legal.inscricaoCorrecaoDepois}
        </p>
      </Secao>

      <Secao titulo={t.legal.secaoApi}>
        <p style={P}>{t.legal.apiComoUsamos}</p>
        <p style={P}>{t.legal.apiQuaisDados}</p>
        <p style={P}>{t.legal.apiRetencao}</p>
        <p style={P}>{t.legal.apiExclusao}</p>
        <p style={P}>{t.legal.apiNaoFazemos}</p>
      </Secao>

      <Secao titulo={t.legal.secaoContato}>
        <p style={P}>{t.legal.contatoTexto}</p>
        <div style={BLOCO}>
          <a
            href={`mailto:${CONTATO_EMAIL}`}
            style={{ ...P, color: "#e6c592", textDecoration: "none", fontSize: 15 }}
          >
            {CONTATO_EMAIL}
          </a>
        </div>
        <p style={P}>{t.legal.contatoPrazo}</p>
      </Secao>
    </div>
  );
}
