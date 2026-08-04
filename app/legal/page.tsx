import type { Metadata } from "next";

import { Eyebrow, GoldTitle, SectionTitle } from "@/components/lob/ui";

export const metadata: Metadata = {
  title: "Aviso legal e privacidade · Os Bronzes",
  description:
    "Aviso legal exigido pela Riot Games, atribuição de propriedade intelectual e política de privacidade do site Os Bronzes.",
};

/**
 * Página de aviso legal e privacidade.
 *
 * Existe para atender às políticas da Riot Games para produtos de terceiros: o aviso de
 * não-endosso precisa estar em local prontamente visível (ele também está no rodapé de
 * todas as páginas), e a origem dos assets precisa ser declarada. A parte de privacidade
 * descreve honestamente o que o site guarda — que é pouco: nada de dado de conta da Riot.
 */

/**
 * Renderização por requisição — OBRIGATÓRIO enquanto a CSP usar nonce (ver proxy.ts).
 * Página estática é pré-renderizada no build, sai sem nonce nos <script>, a CSP bloqueia
 * o JavaScript e o conteúdo preso no bloco de Suspense nunca aparece: página em branco.
 */
export const dynamic = "force-dynamic";

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

export default function LegalPage() {
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
        <Eyebrow>Aviso legal</Eyebrow>
        <GoldTitle
          style={{ fontSize: "clamp(40px,9vw,96px)", lineHeight: 0.9, margin: "10px 0 16px" }}
        >
          LEGAL &amp; PRIVACIDADE
        </GoldTitle>
        <p style={{ maxWidth: 620, fontSize: 15, lineHeight: 1.55, color: "#a99e8b", margin: 0 }}>
          Quem somos, nossa relação com a Riot Games e o que este site guarda sobre você.
        </p>
      </section>

      <Secao titulo="NÃO SOMOS A RIOT GAMES">
        {/*
          Texto EXIGIDO literalmente pela política da Riot para produtos de terceiros.
          Não editar nem traduzir esta versão — a tradução vem logo abaixo, à parte.
        */}
        <div style={BLOCO}>
          <p style={{ ...P, color: "#e2d6c0" }}>
            Os Bronzes isn&rsquo;t endorsed by Riot Games and doesn&rsquo;t reflect the views or
            opinions of Riot Games or anyone officially involved in producing or managing Riot Games
            properties. Riot Games, and all associated properties are trademarks or registered
            trademarks of Riot Games, Inc.
          </p>
        </div>
        <p style={P}>
          Em português: <strong style={{ color: "#cfa877" }}>Os Bronzes não é endossado pela Riot
          Games</strong> e não reflete as visões ou opiniões da Riot Games ou de qualquer pessoa
          oficialmente envolvida na produção ou gestão das propriedades da Riot Games.
        </p>
        <p style={P}>
          Este é um projeto amador, feito por e para um grupo de amigos, sem qualquer vínculo
          oficial, patrocínio ou aprovação da Riot Games.
        </p>
      </Secao>

      <Secao titulo="PROPRIEDADE INTELECTUAL E ASSETS">
        <p style={P}>
          League of Legends e Riot Games são marcas comerciais ou marcas registradas da Riot Games,
          Inc. League of Legends &copy; Riot Games, Inc.
        </p>
        <p style={P}>
          As imagens de campeões exibidas neste site vêm do{" "}
          <strong style={{ color: "#cfa877" }}>Data Dragon</strong>, a fonte de assets pública e
          aprovada pela Riot Games. Nenhum asset é obtido de fonte não aprovada. Logotipos, escudos
          de elo, arte das cartinhas e fotos de jogadores são criações próprias da organização ou
          material enviado pelos próprios participantes.
        </p>
      </Secao>

      <Secao titulo="O QUE ESTE SITE GUARDA">
        <p style={P}>
          Bem pouco. Os dados publicados aqui são os do próprio campeonato, informados pelos
          participantes à organização:
        </p>
        <div style={BLOCO}>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              display: "flex",
              flexDirection: "column",
              gap: 7,
              fontSize: 13.5,
              lineHeight: 1.6,
              color: "#b3a690",
            }}
          >
            <li>Nick (Riot ID), time, rota e elo de cada participante.</li>
            <li>Resultados das partidas: campeões, banimentos, abates/mortes/assistências, duração.</li>
            <li>Foto de perfil, quando o participante envia uma.</li>
          </ul>
        </div>
        <p style={P}>
          <strong style={{ color: "#cfa877" }}>Não coletamos nada de quem apenas visita o site.</strong>{" "}
          Não há cadastro de visitante, não usamos cookies de rastreamento, não há anúncios e não há
          rastreadores de terceiros. O único cookie existente é o de sessão do painel administrativo,
          usado exclusivamente para manter a organização autenticada.
        </p>
        <p style={P}>
          Também <strong style={{ color: "#cfa877" }}>não armazenamos identificadores de conta da
          Riot</strong> (como PUUID) nem qualquer credencial de jogador.
        </p>
        <p style={P}>
          Todos os participantes são membros do grupo privado que organiza o campeonato e{" "}
          <strong style={{ color: "#cfa877" }}>autorizam expressamente</strong>, ao se inscrever, a
          exibição pública do seu nick, apelido, foto e estatísticas das partidas do torneio,
          conforme consta no regulamento. Não publicamos dados de nenhum jogador que não seja
          participante inscrito, e não cruzamos informações para identificar jogadores fora do
          torneio.
        </p>
      </Secao>

      <Secao titulo="USO DA API DA RIOT GAMES">
        <p style={P}>
          Este site pode usar a API oficial da Riot Games para importar dados de partidas do
          campeonato (campeões, placar e estatísticas). Esse acesso é feito apenas pelo servidor, em
          conexão segura, e somente pela organização do torneio a partir do painel administrativo.
        </p>
        <p style={P}>
          Os dados obtidos são usados exclusivamente para montar a classificação, o histórico de
          partidas e as estatísticas deste campeonato. Não fazemos automação de jogo, scripts,
          trapaça, integração dentro do jogo, apostas nem qualquer sistema alternativo de ranqueamento
          de jogadores.
        </p>
      </Secao>

      <Secao titulo="CORREÇÕES E CONTATO">
        <p style={P}>
          Encontrou um dado errado sobre você, ou quer que sua foto ou seu nick sejam removidos?
          Fale com a organização pelo Discord ou pelo grupo do WhatsApp do campeonato — ajustamos ou
          removemos.
        </p>
      </Secao>
    </div>
  );
}
