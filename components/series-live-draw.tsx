"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle, Swords, Users } from "lucide-react";

import type { CardId } from "@/lib/schema";
import { ALL_CARDS, CARDS, CARDS_BY_ID } from "@/lib/cards";
import { compartilhados } from "@/lib/i18n/messages/compartilhados";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Textos do bloco. Opcional: sem eles o sorteio fica em português (padrão do site). */
type TextosSorteio = (typeof compartilhados)["pt"];

type TeamRef = { id: string; name: string };
type Drawn = { teamId: string; cardId: string; dupla?: boolean };

const DUPLA_TARGET = "__DUPLA__";

type Sorteio = {
  tipo: string;
  semente: string;
  autor: string;
  resultado: string;
  detalhe?: { letras?: [string, string]; campeoes?: number };
};
type RespostaSorteio = {
  error?: string;
  sorteio?: Sorteio;
  blueSideTeamId?: string | null;
  cardsUsed?: Drawn[];
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
  spinning,
  t,
}: Readonly<{
  label: string;
  color: string;
  team: TeamRef | null;
  spinning: boolean;
  t: TextosSorteio;
}>) {
  return (
    <div
      className="flex flex-1 flex-col items-center gap-1 rounded-2xl border p-3"
      style={{ borderColor: `${color}55`, background: `${color}12` }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color }}>
        {label}
      </span>
      <span className="text-sm font-semibold text-center">
        {spinning ? t.sorteioSorteando : (team?.name ?? "—")}
      </span>
    </div>
  );
}

function CardFace({
  cardId,
  spinning,
  t,
  nomesCartas,
}: Readonly<{
  cardId?: string | null;
  spinning?: boolean;
  t: TextosSorteio;
  nomesCartas?: Record<string, string>;
}>) {
  const def = cardId ? CARDS_BY_ID[cardId as CardId] : undefined;
  // O nome traduzido vem da página; sem ele vale o título em português de lib/cards.ts.
  const nome = def ? (nomesCartas?.[def.id] ?? def.title) : undefined;
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div
        className={`relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl text-5xl shadow-glow transition ${
          spinning ? "scale-105 animate-pulse" : ""
        }`}
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
      <p className="text-sm font-semibold">
        {nome ?? (spinning ? t.sorteioSorteando : t.sorteioSemCarta)}
      </p>
      {def?.dupla ? (
        <span className="text-[10px] uppercase tracking-[0.12em] text-accent2">
          {t.sorteioCartaDupla}
        </span>
      ) : null}
    </div>
  );
}

export function SeriesLiveDraw({
  seriesId,
  teamA,
  teamB,
  initialCards,
  initialBlueSideTeamId,
  textos: t = compartilhados.pt,
  nomesCartas,
}: Readonly<{
  seriesId: string;
  teamA: TeamRef | null;
  teamB: TeamRef | null;
  initialCards: Drawn[];
  initialBlueSideTeamId?: string | null;
  textos?: TextosSorteio;
  /** Nome de cada cartinha por id, traduzido. Opcional: sem ele vale lib/cards.ts (pt). */
  nomesCartas?: Record<string, string>;
}>) {
  const [podeLados, setPodeLados] = useState(false);
  const [podeCartas, setPodeCartas] = useState(false);
  const [blueSideTeamId, setBlueSideTeamId] = useState<string | null>(
    initialBlueSideTeamId ?? null,
  );
  const [sideSpinning, setSideSpinning] = useState(false);
  const [cardByTeam, setCardByTeam] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {};
    for (const card of initialCards) map[card.teamId] = card.cardId;
    return map;
  });
  const [isDupla, setIsDupla] = useState(() => initialCards.some((card) => card.dupla));
  const [spinTarget, setSpinTarget] = useState<string | null>(null);
  const [spinFace, setSpinFace] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<Sorteio | null>(null);
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
   * Pede o sorteio AO SERVIDOR e anima até o resultado que voltou.
   *
   * Antes, o resultado saía de um `Math.random()` aqui no navegador e era mandado
   * pronto para a rota — bastava recarregar a página e sortear de novo até gostar, e
   * nada ficava registrado. Pior: a gravação era `fetch(...).catch(() => {})`, então
   * uma falha de rede deixava a tela mostrando um resultado que nunca foi salvo.
   *
   * Agora o servidor decide, grava a semente junto e devolve. A roleta continua
   * girando enquanto a resposta não chega — o suspense é teatro, o resultado não é.
   */
  const pedirSorteio = async (
    alvo: string,
    corpo: { tipo: "lados" | "carta"; teamId?: string; dupla?: boolean },
    pool: typeof CARDS | null,
  ) => {
    if (spinTarget || sideSpinning) return;
    setErro(null);
    if (corpo.tipo === "lados") setSideSpinning(true);
    else setSpinTarget(alvo);

    // Giro livre enquanto a rede responde. Só o freio conhece o resultado.
    const girar = setInterval(() => {
      if (corpo.tipo === "lados") {
        setBlueSideTeamId((atual) => (atual === teamA?.id ? (teamB?.id ?? null) : (teamA?.id ?? null)));
      } else if (pool) {
        setSpinFace(pool[Math.floor(Math.random() * pool.length)]!.id);
      }
    }, 85);

    const inicio = Date.now();
    try {
      const resposta = await fetch("/api/admin/series/sorteio", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId, ...corpo }),
      });
      const dados = (await resposta.json().catch(() => ({}))) as RespostaSorteio;

      // Piso de suspense: numa rede rápida a roleta mal apareceria.
      const faltando = Math.max(0, 1200 - (Date.now() - inicio));
      await new Promise((r) => setTimeout(r, faltando));
      clearInterval(girar);

      if (!resposta.ok || !dados.sorteio) {
        // A falha PRECISA aparecer. O `.catch(() => {})` de antes escondia justamente
        // o caso em que a tela e o banco discordam.
        setErro(dados.error ?? t.sorteioFalhou);
        setBlueSideTeamId(initialBlueSideTeamId ?? null);
        setSpinFace(null);
        return;
      }

      setUltimo(dados.sorteio);
      if (corpo.tipo === "lados") {
        setBlueSideTeamId(dados.blueSideTeamId ?? null);
      } else {
        const cartas = dados.cardsUsed ?? [];
        const mapa: Record<string, string | null> = {};
        for (const c of cartas) mapa[c.teamId] = c.cardId;
        setCardByTeam(mapa);
        setIsDupla(cartas.some((c) => c.dupla));
        setSpinFace(null);
      }

      // O resto da página (o bloco de cartinhas mais abaixo) vem do servidor.
      router.refresh();
    } catch {
      clearInterval(girar);
      setErro(t.sorteioFalhou);
      setBlueSideTeamId(initialBlueSideTeamId ?? null);
      setSpinFace(null);
    } finally {
      setSideSpinning(false);
      setSpinTarget(null);
    }
  };

  const drawSides = () => void pedirSorteio("__LADOS__", { tipo: "lados" }, null);
  const drawSingle = (team: TeamRef) =>
    void pedirSorteio(team.id, { tipo: "carta", teamId: team.id }, CARDS);
  const drawDupla = () => void pedirSorteio(DUPLA_TARGET, { tipo: "carta", dupla: true }, ALL_CARDS);

  const renderTeam = (team: TeamRef | null) => {
    if (!team) return null;
    const spinning = spinTarget === team.id || spinTarget === DUPLA_TARGET;
    const shown = spinning ? spinFace : cardByTeam[team.id];
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">{team.name}</p>
        <CardFace cardId={shown} spinning={spinning} t={t} nomesCartas={nomesCartas} />
        {podeCartas ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => drawSingle(team)}
            disabled={Boolean(spinTarget)}
          >
            <Shuffle className="h-4 w-4" /> {t.sorteioBotaoSortear}
          </Button>
        ) : null}
      </div>
    );
  };

  const blueTeam = teamA && teamB ? (blueSideTeamId === teamB.id ? teamB : blueSideTeamId === teamA.id ? teamA : null) : null;
  const redTeam = blueTeam ? (blueTeam.id === teamA?.id ? teamB : teamA) : null;

  return (
    <Card className="p-5">
      {teamA && teamB ? (
        <div className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{t.sorteioLadosTitulo}</p>
            {podeLados ? <span className="text-[11px] text-accent2">{t.sorteioAoVivo}</span> : null}
          </div>
          <div className="mt-3 flex items-stretch gap-3">
            <SideChip
              label={t.sorteioLadoAzul}
              color="#4d9bff"
              team={blueTeam}
              spinning={sideSpinning}
              t={t}
            />
            <SideChip
              label={t.sorteioLadoVermelho}
              color="#ff5d5d"
              team={redTeam}
              spinning={sideSpinning}
              t={t}
            />
          </div>
          {podeLados ? (
            <div className="mt-3 flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={drawSides}
                disabled={sideSpinning || Boolean(spinTarget)}
              >
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
          <span className="font-mono">{t.sorteioSemente}: {ultimo.semente}</span>
          {" · "}
          {t.sorteioPorFulano} {ultimo.autor}
        </p>
      ) : null}

      {erro ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-danger/40 bg-danger/[0.08] px-3 py-2 text-center text-[12px] text-danger"
        >
          {erro}
        </p>
      ) : null}
      {podeCartas && teamA && teamB ? (
        <div className="mt-3 flex flex-col items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={drawDupla}
            disabled={Boolean(spinTarget)}
          >
            <Users className="h-4 w-4" /> {t.sorteioBotaoDupla}
          </Button>
          <p className="text-center text-[11px] text-muted">{t.sorteioDuplaExplicacao}</p>
        </div>
      ) : null}
    </Card>
  );
}
