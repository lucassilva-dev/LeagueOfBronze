import { Eyebrow, EloCrest, GoldTitle, SectionTitle } from "@/components/lob/ui";
import { CARDS, DUPLAS } from "@/lib/cards";
import { ELO_ORDER } from "@/lib/design";

const FICHA = [
  { k: "INSCRIÇÃO", v: "R$ 20,00 por pessoa" },
  { k: "MODALIDADE", v: "5v5 · Summoner’s Rift" },
  { k: "FORMAÇÃO", v: "Draft — capitães são os mids" },
  { k: "FASE DE PONTOS", v: "Melhor de 3 (MD3)" },
  { k: "GRANDE FINAL", v: "Melhor de 5 (MD5)" },
  { k: "DATAS", v: "25–26/07 e 01–02/08" },
  { k: "TURNOS", v: "Matutino 9h · Vespertino 14h" },
  { k: "ORÇAMENTO", v: "30 pontos por capitão" },
];

const REGRAS_GERAIS = [
  "Apenas gente do grupo do WhatsApp/Discord — nada de estranhos desconhecidos.",
  "Vínculo obrigatório da conta com o Discord.",
  "Capitães montam o time pelo draft e pelos valores de elo.",
  "É preciso ter feito a MD5 da fila solo/duo para participar.",
  "Mínimo de 5 partidas nos últimos 30 dias.",
  "Conta smurf não é aceita.",
  "Substituições só com jogadores do próprio grupo — ninguém é obrigado a aceitar.",
  "Não apareceu na hora ou no dia do jogo: W.O.",
  "Tolerância de 10 minutos na SÉRIE (MD3), não por partida.",
  "Proibido trocar confrontos, adiar ou adiantar jogos.",
  "O capitão pode trocar a lane de dois jogadores na série; eles só voltam à lane original após um jogo.",
  "Check-in no Discord até 10 minutos antes do horário marcado.",
  "Informe o nick/ID antes do torneio — trocar de conta sem aviso desclassifica a partida.",
  "Conta da Riot vinculada ao Discord antes do início do torneio.",
  "Lado (blue/red): sorteio no 1º jogo; depois escolhe quem perdeu.",
  "Fair play: ofensa, discurso de ódio ou griefing geram punição até desclassificação.",
  "Queda de conexão não pausa nem invalida o jogo.",
  "O capitão vencedor envia o print do resultado no Discord em até 15 minutos.",
  "Ao participar, você autoriza o uso da sua imagem/nick em transmissões.",
  "A organização pode ajustar o regulamento antes do início, com aviso no Discord.",
  "Empate na tabela: confronto direto → saldo de mapas → sorteio.",
  "Uso do canal de voz oficial obrigatório durante as partidas.",
];

const DRAFT_BULLETS = [
  "Os 6 capitães são os 6 midlaners — o Mid é a cabeça do time. O sorteio define qual time cada um capitaneia.",
  "Cada capitão tem 30 pontos de orçamento (o valor do próprio capitão já entra na conta).",
  "O draft tem 4 rodadas: Topo, Selva, Atirador e Suporte.",
  "A ordem de escolha é serpentina (1-2-3-4-5-6-6-5-4-3-2-1).",
  "Jogador escolhido não pode ser pego por outro time.",
  "Pool total de 156 pontos — média de 26 por time.",
];

const PONTUACAO = [
  "Vitória na série (MD3) = 3 pontos · Derrota = 0.",
  "Critério de desempate: 1º confronto direto, 2º saldo de mapas, 3º sorteio.",
  "Os 2 primeiros da fase de pontos avançam para a Grande Final em MD5.",
];

const CARTA_INTRO =
  "Em cada série (MD3), cada capitão pode optar por sortear — ou não — uma cartinha surpresa, usável em qualquer partida da série a seu critério. Se optar por usar, a carta é sorteada publicamente e ao vivo, com os dois times acompanhando, antes da fase de pick & ban da partida escolhida, e o efeito vale apenas para aquela partida. Máximo de 1 cartinha por capitão por série.";
const CARTA_INTRO2 =
  "Se só um capitão usa, o sorteio vale entre as 6 cartinhas individuais (A–F) e afeta apenas o time adversário. Quando os DOIS capitães usam na mesma partida, entram no sorteio também as 2 cartinhas duplas — cujo efeito atinge os dois times — passando a valer entre as 8 cartas, sorteada uma única vez. Toda escolha exigida por uma carta é feita na hora e informada à organização, que tem a palavra final.";

function Card({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="lob-card-2">{children}</div>;
}

export default function RegrasPage() {
  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 24px" }}>
        <Eyebrow>Regulamento oficial</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(48px,11vw,128px)", lineHeight: 0.88, margin: "10px 0 16px" }}>REGRAS</GoldTitle>
        <p style={{ maxWidth: 600, fontSize: 16, lineHeight: 1.55, color: "#a99e8b", margin: 0 }}>
          Tudo que rege a 3ª Edição dos Bronzes — formato, draft por pontos, conduta e as cartinhas
          surpresa.
        </p>
      </section>

      <section className="lob-fade" style={{ marginTop: 14 }}>
        <div style={{ marginBottom: 14 }}>
          <SectionTitle size={23}>FICHA RÁPIDA</SectionTitle>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
          {FICHA.map((f) => (
            <div key={f.k} className="lob-card-2" style={{ padding: "15px 16px" }}>
              <div style={{ fontSize: 10.5, letterSpacing: ".12em", color: "#c98a4b", marginBottom: 7 }}>{f.k}</div>
              <div style={{ fontSize: 14, color: "#e9dfcd", lineHeight: 1.4 }}>{f.v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="lob-fade" style={{ marginTop: 38 }}>
        <div style={{ marginBottom: 14 }}>
          <SectionTitle size={23}>REGRAS GERAIS</SectionTitle>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 10 }}>
          {REGRAS_GERAIS.map((rule, i) => (
            <div key={rule} className="lob-card-2" style={{ display: "flex", gap: 12, padding: "13px 15px" }}>
              <span style={{ flexShrink: 0, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, background: "rgba(201,138,75,.12)", color: "#cfa877", fontFamily: "var(--font-display)", fontSize: 14 }}>
                {String.fromCharCode(97 + i)}
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.5, color: "#b3a690" }}>{rule}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lob-fade" style={{ marginTop: 38 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16, alignItems: "start" }}>
          <Card>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <SectionTitle size={18}>FORMAÇÃO &amp; DRAFT POR PONTOS</SectionTitle>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {DRAFT_BULLETS.map((b) => (
                  <div key={b} style={{ display: "flex", gap: 9, fontSize: 13, lineHeight: 1.5, color: "#b3a690" }}>
                    <span style={{ color: "#c98a4b", flexShrink: 0 }}>◆</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <SectionTitle size={18}>VALORES POR ELO</SectionTitle>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {ELO_ORDER.map((elo) => (
                  <div key={elo.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 11px", background: "rgba(201,138,75,.06)", borderRadius: 2 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, color: "#e2d6c0" }}>
                      <EloCrest elo={elo.label} size={28} title={false} /> {elo.label}
                    </span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "#e6c592" }}>{elo.pts}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(201,138,75,.14)", fontSize: 12.5, lineHeight: 1.5, color: "#8f8472" }}>
                Orçamento de <b style={{ color: "#e6c592" }}>30 pontos</b> por capitão · pool total de{" "}
                <b style={{ color: "#e6c592" }}>156 pontos</b>.
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="lob-fade" style={{ marginTop: 16 }}>
        <div style={{ padding: 20, background: "rgba(201,138,75,.05)", border: "1px solid rgba(201,138,75,.16)", borderRadius: 3 }}>
          <div style={{ marginBottom: 12 }}>
            <SectionTitle size={18}>PONTUAÇÃO &amp; DESEMPATE</SectionTitle>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {PONTUACAO.map((b) => (
              <div key={b} style={{ display: "flex", gap: 9, fontSize: 13, lineHeight: 1.5, color: "#b3a690" }}>
                <span style={{ color: "#c98a4b", flexShrink: 0 }}>◆</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lob-fade" style={{ marginTop: 38 }}>
        <div style={{ marginBottom: 14 }}>
          <SectionTitle size={23}>CARTINHAS SURPRESA</SectionTitle>
        </div>
        <div className="lob-card-2" style={{ padding: "18px 20px", marginBottom: 8 }}>
          <p style={{ margin: "0 0 12px", fontSize: 13.5, lineHeight: 1.6, color: "#b3a690" }}>{CARTA_INTRO}</p>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#b3a690" }}>{CARTA_INTRO2}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 10px" }}>
          <span style={{ fontSize: 11, letterSpacing: ".14em", color: "#c98a4b", whiteSpace: "nowrap" }}>CARTINHAS INDIVIDUAIS · A–F</span>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(201,138,75,.35),transparent)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 10 }}>
          {CARDS.map((c) => (
            <div key={c.id} className="lob-card-2" style={{ display: "flex", gap: 13, padding: "14px 15px" }}>
              <span style={{ flexShrink: 0, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, background: "rgba(201,138,75,.14)", color: "#e6c592", fontFamily: "var(--font-display)", fontSize: 16 }}>{c.letter}</span>
              <div>
                <div className="lob-display" style={{ fontSize: 15, color: "#f2ebdf", marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#a99e8b" }}>{c.description}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 10px" }}>
          <span style={{ fontSize: 11, letterSpacing: ".14em", color: "#57d8cb", whiteSpace: "nowrap" }}>CARTINHAS DUPLAS · SÓ QUANDO OS 2 CAPITÃES USAM</span>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(87,216,203,.35),transparent)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 10 }}>
          {DUPLAS.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 13, padding: "14px 15px", background: "linear-gradient(180deg,#16211e,#0f1615)", border: "1px solid rgba(87,216,203,.22)", borderRadius: 3 }}>
              <span style={{ flexShrink: 0, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, background: "rgba(87,216,203,.14)", color: "#7fe6db", fontSize: 13 }}>◆◆</span>
              <div>
                <div className="lob-display" style={{ fontSize: 15, color: "#eafaf7", marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#9fc4bd" }}>{c.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
