"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle, Swords, Users } from "lucide-react";

import type { CardId } from "@/lib/schema";
import { CARDS_BY_ID } from "@/lib/cards";
import { compartilhados } from "@/lib/i18n/messages/compartilhados";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CerimoniaDeSorteio,
  type PedidoDeSorteio,
} from "@/components/series/cerimonia-de-sorteio";

/** Textos do bloco. Opcional: sem eles o sorteio fica em português (padrão do site). */
type TextosSorteio = (typeof compartilhados)["pt"];

type TeamRef = { id: string; name: string };
type Drawn = { teamId: string; cardId: string; dupla?: boolean };

type Sorteio = {
  tipo: string;
  semente: string;
  autor: string;
  resultado: string;
  detalhe?: { letras?: [string, string]; campeoes?: number };
};
type RespostaSorteio = {
  sorteio?: Sorteio;
  blueSideTeamId?: string | null;
  cardsUsed?: ReadonlyArray<{ teamId: string; cardId: string; dupla?: boolean }>;
  vezes?: number;
};
type SessaoAdmin = {
  authorized?: boolean;
  user?: { isMaster?: boolean; scopes?: string[] };
};

// Declarado fora do render: componente criado durante o render perde o estado a cada
// re-render (e o lint do React barra).
function SideChip({
  label,
  color,
  team,
}: Readonly<{
  label: string;
  color: string;
  team: TeamRef | null;
}>) {
  return (
    <div
      className="flex flex-1 flex-col items-center gap-1 rounded-2xl border p-3"
      style={{ borderColor: `${color}55`, background: `${color}12` }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color }}>
        {label}
      </span>
      <span className="text-sm font-semibold text-center">{team?.name ?? "—"}</span>
    </div>
  );
}

function CardFace({
  cardId,
  t,
  nomesCartas,
}: Readonly<{
  cardId?: string | null;
  t: TextosSorteio;
  nomesCartas?: Record<string, string>;
}>) {
  const def = cardId ? CARDS_BY_ID[cardId as CardId] : undefined;
  // O nome traduzido vem da página; sem ele vale o título em português de lib/cards.ts.
  const nome = def ? (nomesCartas?.[def.id] ?? def.title) : undefined;
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div
        className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl text-5xl shadow-glow"
        style={{
          background: def
            ? `linear-gradient(135deg, ${def.from}, ${def.to})`
            : "rgba(255,255,255,0.04)",
          border: def ? `1px solid ${def.border}` : undefined,
        }}
      >
        {def?.imageUrl ? (
          // Mesma arte da página /cartas — o emoji fica só como reserva.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={def.imageUrl}
            alt={def.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden>{def?.emoji ?? "🎴"}</span>
        )}
      </div>
      <p className="text-sm font-semibold">{nome ?? t.sorteioSemCarta}</p>
      {def?.dupla ? (
        <span className="text-[10px] uppercase tracking-[0.12em] text-accent2">
          {t.sorteioCartaDupla}
        </span>
      ) : null}
    </div>
  );
}

/**
 * O bloco de sorteio na página pública da partida.
 *
 * Ele MOSTRA o estado atual (quem está no lado azul, que cartinha cada time tirou) e, para
 * quem tem escopo, abre a cerimônia em tela cheia — a roleta. O sorteio em si não acontece
 * aqui nem na cerimônia: acontece em `POST /api/admin/series/sorteio`, no servidor, com uma
 * semente gravada na série.
 *
 * Antes deste arquivo existir assim, o botão sorteava no próprio navegador com
 * `Math.random()` e mandava o resultado pronto — dava para recarregar e sortear de novo até
 * gostar. E a gravação era `fetch(...).catch(() => {})`, então falha de rede deixava a tela
 * mostrando um resultado que nunca foi salvo.
 */
export function SeriesLiveDraw({
  seriesId,
  teamA,
  teamB,
  initialCards,
  initialBlueSideTeamId,
  initialUltimoCarta,
  textos: t = compartilhados.pt,
  nomesCartas,
}: Readonly<{
  seriesId: string;
  teamA: TeamRef | null;
  teamB: TeamRef | null;
  initialCards: Drawn[];
  initialBlueSideTeamId?: string | null;
  /**
   * O último sorteio de CARTA já gravado nesta série.
   *
   * As letras do ABCDRAFT e a linha de procedência (semente e autor) vinham só da
   * resposta da cerimônia, então existiam apenas na aba de quem clicou: qualquer recarga
   * — ou qualquer outra pessoa abrindo a página — via a carta sem as letras que a
   * completam e sem a semente que permite conferir o sorteio. Justamente a informação que
   * torna o resultado auditável era a que não sobrevivia.
   *
   * É o último sorteio de CARTA, e não o último de qualquer tipo: se o último tivesse
   * sido de lados, a seção de cartinhas passaria a exibir a semente do sorteio de lados.
   */
  initialUltimoCarta?: Sorteio | null;
  textos?: TextosSorteio;
  /** Nome de cada cartinha por id, traduzido. Opcional: sem ele vale lib/cards.ts (pt). */
  nomesCartas?: Record<string, string>;
}>) {
  const [podeLados, setPodeLados] = useState(false);
  const [podeCartas, setPodeCartas] = useState(false);
  const [blueSideTeamId, setBlueSideTeamId] = useState<string | null>(
    initialBlueSideTeamId ?? null,
  );
  const [cardByTeam, setCardByTeam] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {};
    for (const card of initialCards) map[card.teamId] = card.cardId;
    return map;
  });
  const [isDupla, setIsDupla] = useState(() => initialCards.some((card) => card.dupla));
  const [ultimo, setUltimo] = useState<Sorteio | null>(initialUltimoCarta ?? null);
  const [pedido, setPedido] = useState<PedidoDeSorteio | null>(null);
  /*
   * Conta os cliques só para servir de `key` à cerimônia.
   *
   * Remontar a cada clique é o que garante que a roda comece do zero e que o sorteio saia
   * UMA vez. Sem isso o mesmo componente era reaproveitado e o efeito reexecutava a cada
   * `router.refresh()` — o que gravou 24 sorteios a partir de um clique só.
   */
  const [rodada, setRodada] = useState(0);

  const abrir = useCallback((p: PedidoDeSorteio) => {
    setRodada((n) => n + 1);
    setPedido(p);
  }, []);
  const router = useRouter();

  useEffect(() => {
    // `authorized` sozinho só diz que é da organização. Sortear lado e sortear carta
    // são escopos distintos — oferecer o botão a quem não os tem só entrega um 403.
    fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.json())
      .then((data: SessaoAdmin) => {
        const u = data?.user;
        const tem = (escopo: string) =>
          Boolean(data?.authorized && u && (u.isMaster || (u.scopes ?? []).includes(escopo)));
        setPodeLados(tem("series:sides"));
        setPodeCartas(tem("series:cards"));
      })
      .catch(() => {});
  }, []);

  /**
   * O resultado já está gravado quando isto roda — a cerimônia avisa assim que o servidor
   * responde, ainda com a roda desacelerando.
   *
   * A tela é sincronizada aqui A PARTIR DA RESPOSTA, e não só por `router.refresh()`: os
   * estados locais nascem de `useState` com valor inicial, e um refresh do servidor não
   * reexecuta inicializador de estado. Sem isto, fechar a cerimônia mostraria o valor antigo.
   */
  const aplicarResposta = useCallback(
    (resposta: RespostaSorteio) => {
      // Só sorteio de CARTA entra em `ultimo`: ele alimenta as letras do ABCDRAFT e a
      // linha de semente/autor da seção de cartinhas. Carimbar um sorteio de LADOS ali
      // fazia a seção de cartas exibir a semente e o autor do sorteio de lados — e some
      // com as letras da carta que continua na tela. É a mesma escolha que
      // `initialUltimoCarta` já faz ao hidratar do servidor.
      if (resposta.sorteio && resposta.sorteio.tipo !== "lados") setUltimo(resposta.sorteio);

      if (resposta.sorteio?.tipo === "lados") {
        setBlueSideTeamId(resposta.blueSideTeamId ?? null);
      } else {
        const cartas = resposta.cardsUsed ?? [];
        const mapa: Record<string, string | null> = {};
        for (const c of cartas) mapa[c.teamId] = c.cardId;
        setCardByTeam(mapa);
        setIsDupla(cartas.some((c) => c.dupla));
      }

      // O resto da página (histórico de sorteios, jogos) vem do servidor.
      router.refresh();
    },
    [router],
  );

  const blueTeam =
    teamA && teamB
      ? blueSideTeamId === teamB.id
        ? teamB
        : blueSideTeamId === teamA.id
          ? teamA
          : null
      : null;
  const redTeam = blueTeam ? (blueTeam.id === teamA?.id ? teamB : teamA) : null;

  const renderTeam = (team: TeamRef | null) => {
    if (!team) return null;
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">{team.name}</p>
        <CardFace cardId={cardByTeam[team.id]} t={t} nomesCartas={nomesCartas} />
        {podeCartas ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => abrir({ tipo: "carta", teamId: team.id })}
          >
            <Shuffle className="h-4 w-4" /> {t.sorteioBotaoSortear}
          </Button>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <Card className="p-5">
        {teamA && teamB ? (
          <div className="mb-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                {t.sorteioLadosTitulo}
              </p>
              {podeLados ? <span className="text-[11px] text-accent2">{t.sorteioAoVivo}</span> : null}
            </div>
            <div className="mt-3 flex items-stretch gap-3">
              <SideChip label={t.sorteioLadoAzul} color="#4d9bff" team={blueTeam} />
              <SideChip label={t.sorteioLadoVermelho} color="#ff5d5d" team={redTeam} />
            </div>
            {podeLados ? (
              <div className="mt-3 flex justify-center">
                <Button variant="secondary" size="sm" onClick={() => abrir({ tipo: "lados" })}>
                  <Swords className="h-4 w-4" /> {t.sorteioBotaoLados}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">
            {t.sorteioCartinhasTitulo}
          </p>
          {podeCartas ? <span className="text-[11px] text-accent2">{t.sorteioAoVivo}</span> : null}
        </div>
        {isDupla ? (
          <p className="mt-2 rounded-lg border border-accent2/30 bg-accent2/[0.06] px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-accent2">
            {t.sorteioDuplo}
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {renderTeam(teamA)}
          {renderTeam(teamB)}
        </div>

        {/* As letras completam a carta: sem elas o ABCDRAFT não diz o que fazer. */}
        {ultimo?.detalhe?.letras ? (
          <div className="mt-3 rounded-xl border border-accent2/30 bg-accent2/[0.06] p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{t.sorteioLetras}</p>
            <p className="mt-1 text-3xl font-bold tracking-[0.2em] text-accent2">
              {ultimo.detalhe.letras.join(" · ")}
            </p>
            {typeof ultimo.detalhe.campeoes === "number" ? (
              <p className="text-[11px] text-muted">
                {ultimo.detalhe.campeoes} {t.sorteioCampeoesDisponiveis}
              </p>
            ) : null}
          </div>
        ) : null}

        {/*
          A procedência fica à vista. O sorteio é do servidor e a semente permite
          recalculá-lo depois — mostrar isso é o que separa "confie em nós" de
          "confira você mesmo".
        */}
        {ultimo ? (
          <p className="mt-3 text-center text-[10.5px] text-muted">
            <span className="font-mono">
              {t.sorteioSemente}: {ultimo.semente}
            </span>
            {" · "}
            {t.sorteioPorFulano} {ultimo.autor}
          </p>
        ) : null}

        {podeCartas && teamA && teamB ? (
          <div className="mt-3 flex flex-col items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => abrir({ tipo: "carta", dupla: true })}
            >
              <Users className="h-4 w-4" /> {t.sorteioBotaoDupla}
            </Button>
            <p className="text-center text-[11px] text-muted">{t.sorteioDuplaExplicacao}</p>
          </div>
        ) : null}
      </Card>

      <CerimoniaDeSorteio
        key={rodada}
        aberto={pedido !== null}
        pedido={pedido}
        onFechar={() => setPedido(null)}
        onSorteado={aplicarResposta}
        seriesId={seriesId}
        teamA={teamA}
        teamB={teamB}
        nomesCartas={nomesCartas}
        t={{
          titulo: t.cerimoniaTitulo,
          fechar: t.cerimoniaFechar,
          vai: t.cerimoniaVai,
          girando: t.cerimoniaGirando,
          ladoAzul: t.sorteioLadoAzul,
          ladoVermelho: t.sorteioLadoVermelho,
          resultado: t.cerimoniaResultado,
          semente: t.sorteioSemente,
          porFulano: t.sorteioPorFulano,
          falhou: t.sorteioFalhou,
          repetido: t.sorteioRepetido,
          letras: t.sorteioLetras,
          campeoesDisponiveis: t.sorteioCampeoesDisponiveis,
          cartaDupla: t.sorteioCartaDupla,
          som: t.cerimoniaSom,
          semSom: t.cerimoniaSemSom,
          frases: t.cerimoniaFrases,
        }}
      />
    </>
  );
}
