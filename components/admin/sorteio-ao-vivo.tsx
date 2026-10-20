"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as KeyboardEventReact,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ArrowLeftRight, Dices, Undo2, X } from "lucide-react";

import { CARDS_BY_ID, baralhoDoSorteio, isDuplaCard, letraDaCarta, type CardDef } from "@/lib/cards";
import type { CardId } from "@/lib/schema";
import { useCompacto } from "@/components/admin/responsivo";
import { IconeCarta, IconeCartas, type Icone } from "@/components/lob/icones";
import {
  Banner,
  Button,
  C,
  Card,
  Chip,
  SectionHead,
  Toolbar,
  display,
  tabular,
} from "@/components/admin/ui";

/**
 * A CERIMÔNIA DO SORTEIO — a tela que a organização projeta antes da partida.
 *
 * ⚠ O QUE ESTA TELA **NÃO** FAZ: sortear. Quem sorteia é `POST /api/admin/series/sorteio`,
 * no servidor, a partir de uma semente de 128 bits que fica gravada na série. Aqui só se
 * REVELA um resultado que já existe. A diferença não é acadêmica: se a roda girasse no
 * navegador e só depois salvasse, bastaria girar até gostar do resultado e então confirmar —
 * o mesmo furo que o formulário de inscrição tinha quando mandava os pontos já calculados.
 *
 * Por isso a roda começa a girar ANTES da resposta chegar (senão haveria um congelamento
 * estranho de meio segundo enquanto a rede responde) mas só FREIA no valor que veio. O giro
 * inicial é teatro honesto: ele não decide nada, e o freio é a única parte que sabe o
 * resultado.
 *
 * E por isso a semente aparece na tela, em miúdo. Quem estiver assistindo pode anotá-la e
 * conferir depois com `conferirSorteio` (lib/series/sorteio.ts). "Confie em nós" vira
 * "confira você mesmo".
 *
 * ⚠ NENHUMA ANIMAÇÃO DE OPACIDADE. Já apagou o conteúdo deste site quatro vezes. Tudo o que
 * se move aqui se move por `transform`.
 *
 * NO CELULAR (`useCompacto()`) a cerimônia vira uma tela de aplicativo: barra fina em cima
 * com o confronto e o X, o meio rola, e os botões de sortear ficam presos EMBAIXO, onde o
 * polegar alcança sem a pessoa trocar a mão que segura o telefone. A roda mede a largura
 * da tela em vez de 420px fixos — com o tamanho fixo ela estourava a página e, presa pelo
 * `maxWidth`, virava uma elipse. No monitor o arranjo é o de sempre.
 *
 * A tela vai para o <body> por portal. No celular o editor de série (onde mora o botão que
 * abre a cerimônia) é uma folha em tela cheia; dentro dela, o Esc daqui subia até a folha e
 * fechava o EDITOR no lugar do sorteio, e o Tab saía da cerimônia para os campos escondidos
 * atrás. Por isso o palco trata Esc e Tab ele mesmo e não deixa os dois subirem.
 */

type Props = Readonly<{
  aberto: boolean;
  onFechar: () => void;
  serieId: string;
  teamAId: string;
  teamBId: string;
  nomeDoTime: (id: string) => string;
  corDoTime: (id: string) => string;
  blueSideTeamId?: string;
  cardsUsed?: readonly { teamId: string; cardId: string; dupla?: boolean }[];
  podeLados: boolean;
  podeCartas: boolean;
  /**
   * Avisa o painel do que o servidor acabou de gravar.
   *
   * Recebe o resultado em vez de não receber nada de propósito: antes isto disparava
   * uma RECARGA do rascunho, que abre um `window.confirm` quando há edição não salva.
   * No meio da cerimônia — com a tela projetada — o diálogo trava a thread e a roda
   * congela. Com os dois campos em mãos, o painel sincroniza só o que mudou.
   */
  onSorteado: (resultado: {
    /** O que este sorteio realmente mexeu. O painel só aplica o campo correspondente. */
    tipo: "lados" | "carta";
    blueSideTeamId: string | null;
    cardsUsed: { teamId: string; cardId: string; dupla?: boolean }[];
    /** Versão nova do dataset. Sem ela o painel salva com a versão velha e leva 409. */
    versao?: number;
    /** Versão que a rota leu. O painel só adota `versao` se o rascunho estiver nela. */
    versaoLida?: number;
    /** Histórico atualizado: os avisos de exclusão/renomeação do painel dependem dele. */
    sorteios?: unknown[];
  }) => void;
}>;

// ---------------------------------------------------------------- contrato da rota

type SorteioDaResposta = {
  tipo: "lados" | "carta";
  semente: string;
  emISO: string;
  autor: string;
  teamId?: string;
  resultado: string;
  detalhe?: Record<string, unknown>;
};

type RespostaSorteio = {
  ok: true;
  sorteio: SorteioDaResposta;
  blueSideTeamId: string | null;
  cardsUsed: { teamId: string; cardId: string; dupla?: boolean }[];
  /** Quantas vezes ESTE sorteio já foi feito nesta série. 1 = primeira. */
  vezes: number;
  /** Versão da linha DEPOIS da gravação, para o painel não cair em 409. */
  versao?: number;
  /** Versão que a rota LEU antes de gravar — o painel só adota `versao` se casar. */
  versaoLida?: number;
  /** Histórico já com o registro deste sorteio, para o rascunho do painel acompanhar. */
  sorteios?: unknown[];
};

type Pedido =
  | { readonly tipo: "lados" }
  | { readonly tipo: "carta"; readonly teamId?: string; readonly dupla?: boolean };

// ---------------------------------------------------------------- tempos da cerimônia

/** Um passo de giro livre. Intervalo e transição têm a MESMA duração: o giro não engasga. */
const PASSO_MS = 560;
const PASSO_GRAUS = 420;
/** Piso de suspense: mesmo que a rede responda em 80 ms, a roda gira isto antes de frear. */
const MINIMO_MS = 1400;
/** A desaceleração. É o único trecho que conhece o resultado. */
const FREIO_MS = 2600;
const VOLTAS_FINAIS = 3;

const AZUL = "#4d9bff";
const VERMELHO = "#ff5d5d";

// ---------------------------------------------------------------- a roda

type ItemDaRoda = Readonly<{
  chave: string;
  cor: string;
  rotulo: string;
  /** Segunda linha do rótulo (letra da carta, "DUPLA"...). */
  nota?: string;
}>;

/**
 * A roda propriamente dita.
 *
 * As fatias são um `conic-gradient` — sem SVG, sem canvas: a fatia `i` ocupa exatamente
 * `[i*passo, (i+1)*passo)` a partir do topo, no sentido horário, que é a mesma conta que o
 * freio usa para escolher o ângulo final. Uma única fórmula descrevendo as duas coisas evita
 * a roda parar "quase" no resultado certo.
 *
 * Os rótulos giram JUNTO com a roda e nascem virados para fora (`rotate(θ)`); assim, quando a
 * fatia vencedora chega ao ponteiro, o rótulo dela está exatamente na horizontal.
 *
 * `fluido` (celular): a roda ocupa a largura disponível até `tamanho` e se mantém redonda
 * por `aspect-ratio`. Antes, com largura e altura fixas e `maxWidth: 100%`, a largura
 * encolhia e a altura não — a roda virava elipse e o freio parava "fora" do ponteiro. Tudo o
 * que dependia do tamanho em pixels (ponteiro, largura dos rótulos) passa a ser proporção.
 */
function Roda({
  itens,
  giro,
  transicao,
  tamanho,
  fluido = false,
}: Readonly<{
  itens: readonly ItemDaRoda[];
  giro: number;
  transicao: string;
  tamanho: number;
  fluido?: boolean;
}>) {
  const passo = 360 / Math.max(1, itens.length);
  const doisItens = itens.length <= 2;

  const fatias = itens
    .map((item, i) => `${item.cor} ${(i * passo).toFixed(3)}deg ${((i + 1) * passo).toFixed(3)}deg`)
    .join(", ");
  const separadores = `repeating-conic-gradient(from 0deg, rgba(8,5,2,.9) 0deg .7deg, rgba(0,0,0,0) .7deg ${passo.toFixed(3)}deg)`;

  const caixa: CSSProperties = fluido
    ? { position: "relative", width: "100%", maxWidth: tamanho, aspectRatio: "1 / 1", flexShrink: 0 }
    : { position: "relative", width: tamanho, height: tamanho, flexShrink: 0, maxWidth: "100%" };

  const anel = `0 0 0 3px ${C.line2}, 0 0 0 9px rgba(11,8,4,.9), 0 0 70px rgba(201,138,75,.20)`;
  const sombraInterna = "inset 0 0 60px rgba(0,0,0,.45)";

  const disco = (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        background: `${separadores}, conic-gradient(from 0deg, ${fatias})`,
        boxShadow: fluido ? sombraInterna : `${anel}, ${sombraInterna}`,
        transform: `rotate(${giro}deg)`,
        transition: transicao,
        willChange: "transform",
      }}
    >
      {itens.map((item, i) => {
        const meio = i * passo + passo / 2;
        const raio = doisItens ? 0.28 : 0.33;
        const rad = (meio * Math.PI) / 180;
        const largura = doisItens ? 0.34 : 0.3;
        return (
          <div
            key={item.chave}
            style={{
              position: "absolute",
              left: `${50 + raio * 100 * Math.sin(rad)}%`,
              top: `${50 - raio * 100 * Math.cos(rad)}%`,
              width: fluido ? `${largura * 100}%` : tamanho * largura,
              transform: `translate(-50%, -50%) rotate(${meio}deg)`,
              textAlign: "center",
              color: "#160f06",
              textShadow: "0 1px 0 rgba(255,255,255,.28)",
              pointerEvents: "none",
            }}
          >
            {/* No celular o nome do time encolhe com a roda: a 20px, "Capangas do Motomoto"
                num terço de uma roda de 330px quebrava em quatro linhas. */}
            <div
              style={{
                fontFamily: display,
                fontSize: doisItens ? (fluido ? "clamp(14px, 4.6vw, 20px)" : 20) : 15,
                lineHeight: 1.05,
                overflowWrap: "anywhere",
              }}
            >
              {item.rotulo}
            </div>
            {item.nota ? (
              <div style={{ fontSize: 10, letterSpacing: ".14em", fontWeight: 700, marginTop: 3 }}>
                {item.nota}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  return (
    <div aria-hidden style={caixa}>
      {/* Ponteiro: fixo no topo, apontando para dentro. Nunca gira. */}
      <div
        style={{
          position: "absolute",
          top: fluido ? "-4.5%" : -Math.round(tamanho * 0.045),
          left: "50%",
          marginLeft: -12,
          width: 0,
          height: 0,
          borderLeft: "12px solid transparent",
          borderRight: "12px solid transparent",
          borderTop: `22px solid ${C.bronzeHi}`,
          filter: "drop-shadow(0 3px 6px rgba(0,0,0,.75))",
          zIndex: 3,
        }}
      />

      {fluido ? (
        /*
         * No celular o disco gira DENTRO de uma moldura redonda que corta o que sai dela.
         *
         * O disco é um círculo pintado numa caixa quadrada; a 45° a caixa girada fica 1,41x
         * mais larga que ela mesma, e caixa transformada conta como transbordo — com a roda
         * na largura da tela, a cerimônia rolava de lado no meio do giro. A moldura não gira:
         * o anel e o brilho (que são simétricos, girar não muda nada neles) moram nela.
         */
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", boxShadow: anel }}>
          {disco}
        </div>
      ) : (
        disco
      )}

      {/* Cubo: cobre o encontro das fatias, que sempre fica sujo no centro. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "17%",
          height: "17%",
          marginLeft: "-8.5%",
          marginTop: "-8.5%",
          borderRadius: "50%",
          background: `radial-gradient(circle at 40% 35%, ${C.panel2}, ${C.ground})`,
          border: `2px solid ${C.line2}`,
          zIndex: 2,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- peças da revelação

/** Um dos dois lados, na revelação de lados. */
function PainelDeLado({
  nome,
  cor,
  azul,
  compacto = false,
}: Readonly<{ nome: string; cor: string; azul: boolean; compacto?: boolean }>) {
  const corDoLado = azul ? cor : VERMELHO;
  return (
    <div
      style={{
        flex: "1 1 240px",
        minWidth: 0,
        padding: compacto ? "16px 14px" : "22px 20px",
        borderRadius: 6,
        border: `2px solid ${corDoLado}`,
        background: `linear-gradient(180deg, ${corDoLado}22, rgba(11,8,4,.7))`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "5px 14px",
          borderRadius: 2,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".20em",
          background: azul ? cor : "rgba(255,93,93,.14)",
          color: azul ? "#0b0804" : VERMELHO,
          border: azul ? "1px solid transparent" : `1px solid ${VERMELHO}`,
        }}
      >
        {azul ? "LADO AZUL" : "LADO VERMELHO"}
      </div>
      {/* `4.4vw` foi medido para o monitor: num celular de 360 dava o piso de 26px. Lá a
          largura do painel é a da tela, então o nome pode crescer até 7vw. */}
      <div
        style={{
          fontFamily: display,
          fontSize: compacto ? "clamp(24px,7vw,34px)" : "clamp(26px,4.4vw,46px)",
          lineHeight: 1.05,
          color: C.ink,
          marginTop: compacto ? 10 : 12,
          overflowWrap: "anywhere",
        }}
      >
        {nome}
      </div>
      {azul ? (
        <div style={{ fontSize: 11.5, color: AZUL, marginTop: 6, letterSpacing: ".08em" }}>
          começa no azul no jogo 1
        </div>
      ) : null}
    </div>
  );
}

/**
 * A carta virada para cima.
 *
 * A DESCRIÇÃO INTEIRA aparece — nunca resumida, nunca escondida atrás de um "ver mais". É o
 * regulamento do jogo que a plateia está prestes a assistir; quem não leu, não entende o que
 * vai acontecer em tela.
 */
function CartaRevelada({
  carta,
  arteQuebrada,
  onArteQuebrada,
  letras,
  campeoes,
  compacto = false,
}: Readonly<{
  carta: CardDef;
  arteQuebrada: boolean;
  onArteQuebrada: () => void;
  letras: readonly string[];
  campeoes: number | null;
  compacto?: boolean;
}>) {
  // No celular a carta é uma coluna: arte centralizada em cima, regra embaixo. Com o `wrap`
  // do monitor a arte ocupava a largura inteira e empurrava a regra — que é o que a plateia
  // precisa ler — para uma segunda tela.
  return (
    <div
      style={{
        display: "flex",
        flexDirection: compacto ? "column" : undefined,
        gap: compacto ? 16 : 22,
        flexWrap: compacto ? undefined : "wrap",
        alignItems: compacto ? "stretch" : "flex-start",
        border: `2px solid ${carta.border}`,
        borderRadius: 8,
        background: `linear-gradient(150deg, ${carta.from}22, ${carta.to} 62%)`,
        padding: compacto ? 16 : 22,
      }}
    >
      <div
        style={{
          position: "relative",
          width: compacto ? "min(240px, 100%)" : "min(300px, 100%)",
          alignSelf: compacto ? "center" : undefined,
          aspectRatio: "1 / 1",
          flexShrink: 0,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${carta.border}`,
          background: `linear-gradient(160deg, ${carta.from}33, ${C.ground} 70%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {carta.imageUrl && !arteQuebrada ? (
          // A mesma arte da página /cartas. Se o arquivo faltar, cai no emoji — numa
          // projeção, um quadrado quebrado é pior do que um emoji grande.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={carta.imageUrl}
            alt={carta.title}
            onError={onArteQuebrada}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span aria-hidden style={{ fontSize: 110, lineHeight: 1 }}>
            {carta.emoji}
          </span>
        )}
      </div>

      <div style={{ flex: compacto ? "0 0 auto" : "1 1 320px", minWidth: 0 }}>
        <Toolbar style={{ marginBottom: 10 }}>
          {carta.letter ? (
            <Chip tone="gold">
              <IconeCarta size={12} aria-hidden />
              CARTA {carta.letter}
            </Chip>
          ) : null}
          {carta.dupla ? (
            <Chip tone="warn">
              <IconeCartas size={12} aria-hidden />
              DUPLA · VALE PARA OS DOIS TIMES
            </Chip>
          ) : null}
        </Toolbar>

        <h3
          style={{
            fontFamily: display,
            fontSize: compacto ? "clamp(28px,8vw,40px)" : "clamp(30px,5vw,52px)",
            lineHeight: 1.02,
            color: C.ink,
            margin: "0 0 10px",
            overflowWrap: compacto ? "anywhere" : undefined,
          }}
        >
          {carta.title}
        </h3>

        <div style={{ width: 64, height: 3, background: carta.color, marginBottom: 14 }} />

        {letras.length === 2 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              flexWrap: "wrap",
              padding: "14px 18px",
              marginBottom: 14,
              borderRadius: 6,
              border: `1px solid ${carta.border}`,
              background: "rgba(0,0,0,.35)",
            }}
          >
            {letras.map((letra) => (
              <span
                key={letra}
                style={{
                  fontFamily: display,
                  fontSize: "clamp(56px,10vw,110px)",
                  lineHeight: 1,
                  color: carta.color,
                  textShadow: `0 0 34px ${carta.border}`,
                }}
              >
                {letra}
              </span>
            ))}
            {campeoes !== null ? (
              <span style={{ fontSize: 15, color: C.ink2, ...tabular }}>
                {campeoes} campeões disponíveis
              </span>
            ) : null}
          </div>
        ) : null}

        {/* A regra a 16px no celular: é o texto que a pessoa lê em voz alta para a call, com
            o telefone na mão e longe do rosto — o piso de 15px do monitor ficava miúdo. */}
        <p
          style={{
            margin: "0 0 14px",
            fontSize: compacto ? 16 : "clamp(15px,1.7vw,19px)",
            lineHeight: 1.6,
            color: C.ink,
          }}
        >
          {carta.description}
        </p>

        <p
          style={{
            margin: 0,
            fontSize: compacto ? 14 : "clamp(13px,1.4vw,15px)",
            fontStyle: "italic",
            lineHeight: 1.55,
            color: C.ink3,
          }}
        >
          &ldquo;{carta.flavor}&rdquo;
        </p>
      </div>
    </div>
  );
}

/** A prova. Miúda, mas presente: com a semente qualquer pessoa refaz a conta. */
function LinhaDaSemente({ sorteio }: Readonly<{ sorteio: SorteioDaResposta }>) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        flexWrap: "wrap",
        alignItems: "baseline",
        marginTop: 14,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: 11,
        color: C.ink4,
        // A semente são 32 caracteres sem espaço: numa tela estreita ela quebra no meio em
        // vez de empurrar a cerimônia de lado.
        overflowWrap: "anywhere",
        ...tabular,
      }}
    >
      <span>
        <span style={{ color: C.bronze, letterSpacing: ".14em" }}>semente </span>
        {sorteio.semente}
      </span>
      <span>
        <span style={{ color: C.bronze, letterSpacing: ".14em" }}>autor </span>
        {sorteio.autor}
      </span>
      <span>
        <span style={{ color: C.bronze, letterSpacing: ".14em" }}>em </span>
        {sorteio.emISO}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- estado da tela

type Tela =
  | { fase: "repouso" }
  | { fase: "girando"; serieId: string; itens: readonly ItemDaRoda[] }
  | {
      fase: "revelado";
      serieId: string;
      itens: readonly ItemDaRoda[];
      resposta: RespostaSorteio;
    }
  | { fase: "erro"; serieId: string; mensagem: string };

const REPOUSO: Tela = { fase: "repouso" };

function defDaCarta(id: string): CardDef | undefined {
  return CARDS_BY_ID[id as CardId];
}

// O baralho de AGORA, o mesmo em que o servidor sorteia (sem as cartas retiradas).
function itensDeCartas(dupla: boolean): ItemDaRoda[] {
  return baralhoDoSorteio(dupla).map((carta) => ({
    chave: carta.cardId,
    cor: carta.color,
    rotulo: carta.emoji,
    nota: letraDaCarta(carta.cardId) ?? "DUPLA",
  }));
}

type CartaUsada = Readonly<{ teamId: string; cardId: string; dupla?: boolean }>;

const ehDupla = (carta: CartaUsada) => carta.dupla === true || isDuplaCard(carta.cardId as CardId);

/** Carta de um time só é uma cartinha; a dupla (vale para os dois) é o par de cartas. */
const iconeDaCarta = (carta: CartaUsada): Icone => (ehDupla(carta) ? IconeCartas : IconeCarta);

/** O que o Tab percorre dentro do palco — a mesma lista da Folha do painel. */
const FOCAVEIS_DO_PALCO =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function LinhaDeEstado({
  icone: Desenho,
  cor,
  children,
}: Readonly<{ icone: Icone; cor: string; children: ReactNode }>) {
  return (
    <li style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, lineHeight: 1.45, color: C.ink2 }}>
      <Desenho size={17} color={cor} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{children}</span>
    </li>
  );
}

/**
 * "Como está agora", no celular: um fato por linha, com o ícone do que ele é.
 *
 * No monitor são chips numa faixa só. Chip não quebra linha (é `nowrap` de propósito, para
 * não virar duas palavras soltas), e "Capangas do Motomoto · Troca de Rota" num chip
 * passava da largura do telefone e empurrava a cerimônia de lado.
 */
function EstadoAtualCompacto({
  azul,
  cartas,
  dupla,
  nomeDoTime,
}: Readonly<{
  azul?: string;
  cartas: readonly CartaUsada[];
  dupla: boolean;
  nomeDoTime: (id: string) => string;
}>) {
  return (
    <Card padding="14px 14px" style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10.5, letterSpacing: ".16em", color: C.bronze, marginBottom: 10 }}>
        COMO ESTÁ AGORA
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 9 }}>
        <LinhaDeEstado icone={ArrowLeftRight} cor={azul ? AZUL : C.ink4}>
          {azul ? (
            <>
              Lado azul no jogo 1: <strong style={{ color: C.ink }}>{nomeDoTime(azul)}</strong>
            </>
          ) : (
            "Lados não sorteados"
          )}
        </LinhaDeEstado>
        {cartas.length === 0 ? (
          <LinhaDeEstado icone={IconeCarta} cor={C.ink4}>
            Nenhuma cartinha
          </LinhaDeEstado>
        ) : (
          cartas.map((carta) => (
            <LinhaDeEstado key={`${carta.teamId}:${carta.cardId}`} icone={iconeDaCarta(carta)} cor={C.bronzeHi}>
              <strong style={{ color: C.ink }}>{nomeDoTime(carta.teamId)}</strong> ·{" "}
              {defDaCarta(carta.cardId)?.title ?? carta.cardId}
            </LinhaDeEstado>
          ))
        )}
        {dupla ? (
          <LinhaDeEstado icone={IconeCartas} cor={C.warnSoft}>
            Sorteio duplo: a carta vale para os dois times
          </LinhaDeEstado>
        ) : null}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------- a tela

export function SorteioAoVivo({
  aberto,
  onFechar,
  serieId,
  teamAId,
  teamBId,
  nomeDoTime,
  corDoTime,
  blueSideTeamId,
  cardsUsed,
  podeLados,
  podeCartas,
  onSorteado,
}: Props) {
  const [tela, setTela] = useState<Tela>(REPOUSO);
  const [giro, setGiro] = useState(0);
  const [transicao, setTransicao] = useState("none");
  const [arteQuebrada, setArteQuebrada] = useState<string | null>(null);
  const compacto = useCompacto();

  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null);
  const partida = useRef<ReturnType<typeof setTimeout> | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revela = useRef<ReturnType<typeof setTimeout> | null>(null);
  const palco = useRef<HTMLDivElement>(null);
  /** Cada sorteio recebe um número; respostas de um sorteio abandonado são descartadas. */
  const rodada = useRef(0);

  const limparTempos = useCallback(() => {
    if (intervalo.current) clearInterval(intervalo.current);
    if (partida.current) clearTimeout(partida.current);
    if (espera.current) clearTimeout(espera.current);
    if (revela.current) clearTimeout(revela.current);
    intervalo.current = null;
    partida.current = null;
    espera.current = null;
    revela.current = null;
  }, []);

  const fechar = useCallback(() => {
    rodada.current += 1;
    limparTempos();
    setTela(REPOUSO);
    setTransicao("none");
    onFechar();
  }, [limparTempos, onFechar]);

  // O pai passa `onFechar` em linha, com identidade nova a cada render — e o `onSorteado`
  // provoca uma. Se o efeito de abertura dependesse de `fechar`, cada uma dessas renders o
  // desmontava e remontava no meio da cerimônia, arrancando o foco do botão onde a pessoa
  // estava. O ouvinte lê sempre o `fechar` mais novo por esta referência.
  const fecharAtual = useRef(fechar);
  useEffect(() => {
    fecharAtual.current = fechar;
  });

  // ESC fecha, a rolagem de fundo trava e o foco entra no palco — a tela é projetada, então
  // ninguém deveria precisar caçar o X com o mouse na frente de todo mundo. Ao fechar, o foco
  // volta para quem abriu ("Sortear ao vivo"): no celular esse botão mora dentro da folha do
  // editor, e um foco largado no <body> fazia o próximo Tab sair da folha.
  //
  // O ouvinte da janela é a rede de segurança para quando o foco NÃO está no palco; com o
  // foco lá dentro, quem trata o Esc é `aoTeclarNoPalco`, que não deixa o evento subir.
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") fecharAtual.current();
    };
    window.addEventListener("keydown", aoTeclar);
    const rolagemAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    palco.current?.focus();
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = rolagemAnterior;
      if (anterior && document.contains(anterior)) anterior.focus();
    };
  }, [aberto]);

  // Sortear troca o conteúdo do palco, e o botão clicado some junto: o foco cairia no <body>,
  // fora da cerimônia (e fora do alcance do Tab preso abaixo). Volta para o palco.
  useEffect(() => {
    if (!aberto) return;
    const ativo = document.activeElement;
    if (!ativo || ativo === document.body) palco.current?.focus();
  }, [aberto, tela.fase]);

  // Fechar por fora (o painel some, a série troca) não pode deixar um relógio armado
  // disparando `setTela` numa tela que não existe mais.
  useEffect(() => limparTempos, [limparTempos]);

  /**
   * Descarta a tela de um sorteio de OUTRA série sem tocar em estado durante o render:
   * a comparação é feita na leitura, não com um efeito de reset. Reabrir a mesma série
   * mostra o último resultado; abrir outra série começa limpo.
   */
  const telaAtual: Tela = tela.fase !== "repouso" && tela.serieId !== serieId ? REPOUSO : tela;

  const freiar = (
    itens: readonly ItemDaRoda[],
    resposta: RespostaSorteio,
    reduzido: boolean,
    minhaRodada: number,
  ) => {
    if (rodada.current !== minhaRodada) return;
    if (intervalo.current) clearInterval(intervalo.current);
    if (partida.current) clearTimeout(partida.current);
    intervalo.current = null;
    partida.current = null;

    const achado = itens.findIndex((item) => item.chave === resposta.sorteio.resultado);

    const revelacaoDireta: Tela = { fase: "revelado", serieId, itens, resposta };

    /*
     * Resultado fora da roda NÃO pode virar "para na fatia 0 e finge".
     *
     * Aconteceria se o baralho desta tela e o do servidor divergissem — e esta é a tela
     * PROJETADA: a roda encostaria numa carta com toda a encenação de vitória enquanto o
     * texto anuncia outra. O `?? 0` fazia exatamente isso.
     *
     * Sem fatia correspondente, revela sem freio — mesma proteção que a cerimônia
     * pública já documenta e aplica (components/series/cerimonia-de-sorteio.tsx).
     */
    if (achado < 0) {
      setTransicao("none");
      setTela(revelacaoDireta);
      return;
    }

    const indice = achado;
    const passo = 360 / Math.max(1, itens.length);
    // Ângulo que traz o MEIO da fatia vencedora até o ponteiro, sempre girando para a
    // frente (nunca de ré) e com voltas inteiras de sobra para a freada ter curso.
    const alvo = (atual: number) =>
      Math.ceil(atual / 360) * 360 + VOLTAS_FINAIS * 360 + (360 - (indice * passo + passo / 2));

    const revelado: Tela = { fase: "revelado", serieId, itens, resposta };

    if (reduzido) {
      setTransicao("none");
      setGiro(alvo);
      setTela(revelado);
      return;
    }

    setTransicao(`transform ${FREIO_MS}ms cubic-bezier(.14,.72,.12,1)`);
    setGiro(alvo);
    revela.current = setTimeout(() => {
      if (rodada.current === minhaRodada) setTela(revelado);
    }, FREIO_MS + 90);
  };

  const sortear = (pedido: Pedido) => {
    if (telaAtual.fase === "girando") return;

    rodada.current += 1;
    const minhaRodada = rodada.current;
    limparTempos();

    const itens: readonly ItemDaRoda[] =
      pedido.tipo === "lados"
        ? [teamAId, teamBId].map((id) => ({
            chave: id,
            cor: corDoTime(id),
            rotulo: nomeDoTime(id),
          }))
        : itensDeCartas(pedido.dupla === true);

    // Lido no HANDLER, nunca no render: `matchMedia` durante o render é impuro e o
    // react-hooks/purity barra — além de render no servidor não ter `window`.
    const reduzido =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

    setArteQuebrada(null);
    setTela({ fase: "girando", serieId, itens });

    if (!reduzido) {
      // O giro livre começa AGORA, antes da resposta. Ele não sabe o resultado — e não
      // precisa saber: quem decide é o servidor, e o freio é que obedece.
      //
      // O primeiro passo sai num relógio curto, e não junto com a montagem: um elemento que
      // NASCE já com o transform final não transiciona (não havia valor anterior), e a roda
      // ficaria parada os primeiros 560 ms — logo no momento em que todo mundo está olhando.
      setTransicao(`transform ${PASSO_MS}ms linear`);
      partida.current = setTimeout(() => {
        if (rodada.current !== minhaRodada) return;
        setGiro((atual) => atual + PASSO_GRAUS);
        intervalo.current = setInterval(() => {
          setGiro((atual) => atual + PASSO_GRAUS);
        }, PASSO_MS);
      }, 32);
    }

    const comecou = Date.now();

    void (async () => {
      try {
        const corpo =
          pedido.tipo === "lados"
            ? { seriesId: serieId, tipo: "lados" }
            : {
                seriesId: serieId,
                tipo: "carta",
                teamId: pedido.dupla ? undefined : pedido.teamId,
                dupla: pedido.dupla === true,
              };

        const resposta = await fetch("/api/admin/series/sorteio", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpo),
        });

        const dados = (await resposta.json().catch(() => null)) as
          | (Partial<RespostaSorteio> & { error?: string; ref?: string })
          | null;

        if (!resposta.ok || !dados?.ok || !dados.sorteio) {
          const referencia = dados?.ref ? ` (ref ${dados.ref})` : "";
          throw new Error(
            `${dados?.error ?? `Falha no sorteio (HTTP ${resposta.status}).`}${referencia}`,
          );
        }

        const completa: RespostaSorteio = {
          ok: true,
          sorteio: dados.sorteio,
          blueSideTeamId: dados.blueSideTeamId ?? null,
          cardsUsed: dados.cardsUsed ?? [],
          vezes: dados.vezes ?? 1,
          versao: dados.versao,
          versaoLida: dados.versaoLida,
          sorteios: dados.sorteios,
        };

        /*
         * O AVISO AO PAINEL VEM ANTES DA GUARDA DE RODADA, e a ordem é o ponto.
         *
         * O servidor já gravou quando respondeu: lado azul, carta e o registro em
         * `sorteios` estão no banco, aconteça o que acontecer nesta tela. Com a guarda
         * antes, fechar a cerimônia entre o clique e a resposta (✕ ou ESC) fazia
         * `fechar()` incrementar `rodada.current` e o `return` descartar o resultado
         * SEM avisar o painel — e `onSorteado` é o único caminho pelo qual o rascunho
         * aprende o que foi gravado. O painel seguia com `blueSideTeamId`/`cardsUsed`
         * anteriores e com a versão velha do dataset.
         *
         * Descartar a ANIMAÇÃO de uma rodada abandonada é correto; descartar o dado já
         * gravado não é.
         */
        onSorteado({
          tipo: completa.sorteio.tipo,
          blueSideTeamId: completa.blueSideTeamId,
          cardsUsed: completa.cardsUsed,
          versao: completa.versao,
          versaoLida: completa.versaoLida,
          sorteios: completa.sorteios,
        });

        // Daqui para baixo é só encenação — e ela sim pode ser abandonada.
        if (rodada.current !== minhaRodada) return;

        const restante = reduzido ? 0 : Math.max(0, MINIMO_MS - (Date.now() - comecou));
        espera.current = setTimeout(() => {
          freiar(itens, completa, reduzido, minhaRodada);
        }, restante);
      } catch (falha) {
        if (rodada.current !== minhaRodada) return;
        // A roda NÃO pode ficar girando para sempre quando a rede cai.
        limparTempos();
        setTransicao("none");
        setTela({
          fase: "erro",
          serieId,
          mensagem: falha instanceof Error ? falha.message : "Falha no sorteio.",
        });
      }
    })();
  };

  // Portal no <body>: sem `document` (render no servidor) não há onde montar — e fechado
  // também não há nada a montar.
  if (!aberto || typeof document === "undefined") return null;

  /**
   * Esc e Tab tratados no palco, e sem subir.
   *
   * O palco vai por portal, mas evento React sobe pela ÁRVORE React, não pela do DOM: no
   * celular a cerimônia nasce dentro da folha do editor de série, e a folha também ouve Esc
   * (fecha o editor) e Tab (prende o foco nos campos dela). Sem o `stopPropagation`, um Esc
   * aqui fechava o editor por baixo da cerimônia. O Tab fica preso no palco: a página atrás
   * está coberta, e o foco andando por ela seria invisível.
   */
  const aoTeclarNoPalco = (evento: KeyboardEventReact<HTMLDivElement>) => {
    if (evento.key === "Escape") {
      evento.stopPropagation();
      fechar();
      return;
    }
    if (evento.key !== "Tab" || !palco.current) return;
    evento.stopPropagation();
    const focaveis = Array.from(palco.current.querySelectorAll<HTMLElement>(FOCAVEIS_DO_PALCO));
    const primeiro = focaveis[0];
    const ultimo = focaveis.at(-1);
    if (!primeiro || !ultimo) {
      evento.preventDefault();
      return;
    }
    const atual = document.activeElement;
    if (evento.shiftKey && (atual === primeiro || atual === palco.current)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && atual === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  };

  const girando = telaAtual.fase === "girando";
  const emRepouso = telaAtual.fase === "repouso" || telaAtual.fase === "erro";
  const faltaLados = podeLados ? undefined : "Falta o escopo series:sides";
  const faltaCartas = podeCartas ? undefined : "Falta o escopo series:cards";

  const azulAtual = blueSideTeamId;
  const cartasAtuais = cardsUsed ?? [];
  const duplaAtual = cartasAtuais.some(ehDupla);

  const revelacao = telaAtual.fase === "revelado" ? telaAtual.resposta : null;
  const definicaoRevelada =
    revelacao && revelacao.sorteio.tipo === "carta" ? defDaCarta(revelacao.sorteio.resultado) : undefined;
  // A letra é a do baralho do dia do sorteio (A–E na 4ª), não a da 3ª gravada na definição.
  const cartaRevelada = definicaoRevelada
    ? { ...definicaoRevelada, letter: letraDaCarta(definicaoRevelada.cardId, revelacao?.sorteio.emISO) }
    : undefined;
  const detalhe = revelacao?.sorteio.detalhe;
  const letras = Array.isArray(detalhe?.letras)
    ? detalhe.letras.filter((letra): letra is string => typeof letra === "string")
    : [];
  const campeoes = typeof detalhe?.campeoes === "number" ? detalhe.campeoes : null;

  const tamanhoDaRoda = revelacao ? 240 : 420;

  // ------------------------------------------------ peças comuns aos dois arranjos

  const palcoBase: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 9000,
    background: C.ground,
    color: C.ink,
    outline: "none",
  };

  const avisos = (
    <>
      {telaAtual.fase === "erro" ? (
        <Banner tone="danger" title="O sorteio não aconteceu">
          {telaAtual.mensagem} Nada foi gravado nesta tentativa — pode sortear de novo.
        </Banner>
      ) : null}

      {revelacao && revelacao.vezes > 1 ? (
        <Banner tone="warn" title={`Este sorteio já tinha sido feito nesta série (${revelacao.vezes}ª vez)`}>
          O histórico da série registra as {revelacao.vezes} vezes, com a semente de cada uma —
          refazer é permitido, apagar o anterior não é.
        </Banner>
      ) : null}
    </>
  );

  // O selo do cabeçalho é o dos dados: a cerimônia mora dentro da aba Séries, e sem o
  // `icone` próprio ela herdaria as espadas da seção — que dizem "confronto", não "sorteio".
  const cabecalhoDoSorteio = (
    <SectionHead
      icone={Dices}
      eyebrow="Antes da partida"
      title="Sorteio"
      description="O resultado é decidido no servidor a partir de uma semente gravada na série. A roda aqui só revela — e a semente fica na tela para quem quiser conferir depois."
    />
  );

  const semEscopo =
    !podeLados && !podeCartas ? (
      <p style={{ marginTop: 16, fontSize: 12.5, color: C.ink4 }}>
        Sua conta não tem nenhum dos escopos de sorteio (series:sides, series:cards).
      </p>
    ) : null;

  const resultado = revelacao ? (
    <>
      {revelacao.sorteio.tipo === "lados" ? (
        <div
          style={{
            display: "flex",
            flexDirection: compacto ? "column" : undefined,
            gap: compacto ? 12 : 16,
            flexWrap: compacto ? undefined : "wrap",
          }}
        >
          {[teamAId, teamBId].map((id) => (
            <PainelDeLado
              key={id}
              nome={nomeDoTime(id)}
              cor={corDoTime(id)}
              azul={id === revelacao.sorteio.resultado}
              compacto={compacto}
            />
          ))}
        </div>
      ) : cartaRevelada ? (
        <CartaRevelada
          carta={cartaRevelada}
          arteQuebrada={arteQuebrada === cartaRevelada.cardId}
          onArteQuebrada={() => setArteQuebrada(cartaRevelada.cardId)}
          letras={letras}
          campeoes={campeoes}
          compacto={compacto}
        />
      ) : (
        <Banner tone="warn" title="Carta desconhecida">
          O servidor devolveu {revelacao.sorteio.resultado}, que não está no baralho
          desta versão do site.
        </Banner>
      )}

      <LinhaDaSemente sorteio={revelacao.sorteio} />
    </>
  ) : null;

  const statusGirando = girando ? (
    <p
      role="status"
      style={{
        margin: 0,
        fontFamily: display,
        fontSize: compacto ? 18 : 20,
        letterSpacing: ".18em",
        color: C.bronzeLit,
      }}
    >
      SORTEANDO...
    </p>
  ) : null;

  // ------------------------------------------------ celular

  if (compacto) {
    /*
     * Os botões de sortear ficam no rodapé preso, em grade de duas colunas: lados na linha
     * de cima (é o primeiro sorteio da série), uma carta para cada time lado a lado, e o
     * duplo embaixo. Cada botão de carta escreve o nome do time numa linha própria — em meia
     * largura, "Sortear carta · Capangas do Motomoto" quebrava em três linhas tortas.
     */
    const rodape = emRepouso ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, width: "100%" }}>
        <Button
          tone="gold"
          fullWidth
          disabled={!podeLados}
          title={faltaLados}
          onClick={() => sortear({ tipo: "lados" })}
          style={{ gridColumn: "1 / -1" }}
        >
          <ArrowLeftRight size={17} aria-hidden />
          Sortear lados
        </Button>
        {[teamAId, teamBId].map((id) => (
          <Button
            key={id}
            tone="gold"
            fullWidth
            disabled={!podeCartas}
            title={faltaCartas}
            onClick={() => sortear({ tipo: "carta", teamId: id })}
            style={{ justifyContent: "flex-start", textAlign: "left", padding: "8px 12px" }}
          >
            <IconeCarta size={18} aria-hidden style={{ flexShrink: 0 }} />
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.2 }}>
              <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" }}>
                Sortear carta
              </span>
              <span style={{ fontSize: 13.5, letterSpacing: ".02em", overflowWrap: "anywhere" }}>
                {nomeDoTime(id)}
              </span>
            </span>
          </Button>
        ))}
        <Button
          tone="ghost"
          fullWidth
          disabled={!podeCartas}
          title={faltaCartas ?? "Uma carta só, valendo para os dois times (pool de 8)"}
          onClick={() => sortear({ tipo: "carta", dupla: true })}
          style={{ gridColumn: "1 / -1" }}
        >
          <IconeCartas size={17} aria-hidden />
          Sorteio duplo
        </Button>
      </div>
    ) : revelacao ? (
      // "Voltar" fica com a sobra da largura: é o caminho para o próximo sorteio da série.
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, width: "100%" }}>
        <Button tone="ghost" fullWidth onClick={() => setTela(REPOUSO)} style={{ padding: "11px 12px" }}>
          <Undo2 size={16} aria-hidden />
          Voltar aos sorteios
        </Button>
        <Button tone="ghost" onClick={fechar} style={{ padding: "11px 14px" }}>
          <X size={16} aria-hidden />
          Fechar
        </Button>
      </div>
    ) : null;

    const cerimoniaDeBolso = (
      <div
        ref={palco}
        role="dialog"
        aria-modal="true"
        aria-label="Sorteio ao vivo"
        tabIndex={-1}
        onKeyDown={aoTeclarNoPalco}
        style={{ ...palcoBase, display: "flex", flexDirection: "column" }}
      >
        {/* Barra fina: o confronto (para quem segura o telefone saber de que série é) e o X
            com alvo de dedo. Não rola — o X nunca sai de vista no meio da cerimônia. */}
        <header
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "calc(8px + env(safe-area-inset-top)) 10px 8px 16px",
            borderBottom: `1px solid ${C.line}`,
            background: "linear-gradient(180deg,#1b140c,#0e0905)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".18em",
                color: C.bronzeHi,
              }}
            >
              <Dices size={13} aria-hidden />
              SORTEIO AO VIVO
            </div>
            <div
              style={{
                marginTop: 3,
                fontFamily: display,
                fontSize: 15,
                lineHeight: 1.2,
                color: C.ink,
                overflowWrap: "anywhere",
              }}
            >
              {nomeDoTime(teamAId)} <span style={{ color: C.bronze }}>×</span> {nomeDoTime(teamBId)}
            </div>
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            title="Fechar (ESC)"
            style={{
              width: 44,
              height: 44,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              border: `1px solid ${C.line2}`,
              borderRadius: 4,
              background: "rgba(201,138,75,.07)",
              color: C.ink2,
              cursor: "pointer",
            }}
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: "16px 16px 22px",
          }}
        >
          {emRepouso ? (
            <>
              {avisos}
              {cabecalhoDoSorteio}
              <EstadoAtualCompacto
                azul={azulAtual}
                cartas={cartasAtuais}
                dupla={duplaAtual}
                nomeDoTime={nomeDoTime}
              />
              {semEscopo}
            </>
          ) : (
            // Girando, a roda fica no meio da tela (é o momento em que todo mundo olha); na
            // revelação ela encolhe e sobe, e o resultado vem logo abaixo dela.
            <div
              style={{
                minHeight: girando ? "100%" : undefined,
                display: "flex",
                flexDirection: "column",
                justifyContent: girando ? "center" : undefined,
              }}
            >
              {avisos}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  paddingTop: 12,
                }}
              >
                {telaAtual.fase === "girando" || telaAtual.fase === "revelado" ? (
                  <Roda
                    itens={telaAtual.itens}
                    giro={giro}
                    transicao={transicao}
                    tamanho={revelacao ? 150 : 400}
                    fluido
                  />
                ) : null}
                {statusGirando}
              </div>
              {resultado ? (
                <div style={{ marginTop: 18, minWidth: 0 }} aria-live="polite">
                  {resultado}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {rodape ? (
          <footer
            style={{
              flexShrink: 0,
              padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
              borderTop: `1px solid ${C.line}`,
              background: "rgba(10,7,4,.97)",
            }}
          >
            {rodape}
          </footer>
        ) : (
          <div aria-hidden style={{ height: "env(safe-area-inset-bottom)", flexShrink: 0 }} />
        )}
      </div>
    );

    return createPortal(cerimoniaDeBolso, document.body);
  }

  // ------------------------------------------------ monitor (o arranjo aprovado)

  const cerimonia = (
    <div
      ref={palco}
      role="dialog"
      aria-modal="true"
      aria-label="Sorteio ao vivo"
      tabIndex={-1}
      onKeyDown={aoTeclarNoPalco}
      style={{ ...palcoBase, overflowY: "auto" }}
    >
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "26px 24px 56px" }}>
        <Toolbar style={{ marginBottom: 18 }}>
          <Chip tone="gold">SORTEIO AO VIVO</Chip>
          <span style={{ fontSize: 12, color: C.ink3 }}>
            {nomeDoTime(teamAId)} × {nomeDoTime(teamBId)}
          </span>
          <span style={{ marginLeft: "auto" }}>
            <Button tone="ghost" small onClick={fechar} title="Fechar (ESC)">
              <X size={14} aria-hidden />
              Fechar
            </Button>
          </span>
        </Toolbar>

        {avisos}

        {emRepouso ? (
          <>
            {cabecalhoDoSorteio}

            <Card padding="18px 20px" style={{ marginBottom: 22 }}>
              <Toolbar>
                <span style={{ fontSize: 10.5, letterSpacing: ".16em", color: C.bronze }}>
                  COMO ESTÁ AGORA
                </span>
                {azulAtual ? (
                  <Chip tone="ok" title="Lado azul do jogo 1">
                    AZUL · {nomeDoTime(azulAtual)}
                  </Chip>
                ) : (
                  <Chip tone="off">lados não sorteados</Chip>
                )}
                {cartasAtuais.length === 0 ? (
                  <Chip tone="off">nenhuma cartinha</Chip>
                ) : (
                  cartasAtuais.map((carta) => {
                    const Desenho = iconeDaCarta(carta);
                    return (
                      <Chip key={`${carta.teamId}:${carta.cardId}`} tone="neutro">
                        <Desenho size={12} aria-hidden />
                        {nomeDoTime(carta.teamId)} · {defDaCarta(carta.cardId)?.title ?? carta.cardId}
                      </Chip>
                    );
                  })
                )}
                {duplaAtual ? (
                  <Chip tone="warn">
                    <IconeCartas size={12} aria-hidden />
                    SORTEIO DUPLO
                  </Chip>
                ) : null}
              </Toolbar>
            </Card>

            <Toolbar style={{ gap: 12 }}>
              <Button
                tone="gold"
                disabled={!podeLados}
                title={faltaLados}
                onClick={() => sortear({ tipo: "lados" })}
              >
                <ArrowLeftRight size={15} aria-hidden />
                Sortear lados
              </Button>
              {[teamAId, teamBId].map((id) => (
                <Button
                  key={id}
                  tone="gold"
                  disabled={!podeCartas}
                  title={faltaCartas}
                  onClick={() => sortear({ tipo: "carta", teamId: id })}
                >
                  <IconeCarta size={15} aria-hidden />
                  Sortear carta · {nomeDoTime(id)}
                </Button>
              ))}
              <Button
                tone="ghost"
                disabled={!podeCartas}
                title={faltaCartas ?? "Uma carta só, valendo para os dois times (pool de 8)"}
                onClick={() => sortear({ tipo: "carta", dupla: true })}
              >
                <IconeCartas size={15} aria-hidden />
                Sorteio duplo
              </Button>
            </Toolbar>

            {semEscopo}
          </>
        ) : null}

        {telaAtual.fase === "girando" || telaAtual.fase === "revelado" ? (
          <div
            style={{
              display: "flex",
              gap: 28,
              flexWrap: "wrap",
              alignItems: "flex-start",
              justifyContent: revelacao ? "flex-start" : "center",
              marginTop: 10,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <Roda
                itens={telaAtual.itens}
                giro={giro}
                transicao={transicao}
                tamanho={tamanhoDaRoda}
              />
              {statusGirando}
            </div>

            {revelacao ? (
              <div style={{ flex: "1 1 420px", minWidth: 0 }} aria-live="polite">
                {resultado}

                <Toolbar style={{ marginTop: 18 }}>
                  <Button tone="ghost" onClick={() => setTela(REPOUSO)}>
                    Voltar aos sorteios
                  </Button>
                  <Button tone="ghost" onClick={fechar}>
                    Fechar
                  </Button>
                </Toolbar>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(cerimonia, document.body);
}
