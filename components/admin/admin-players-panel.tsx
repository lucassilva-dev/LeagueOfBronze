"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Player, TournamentDataset } from "@/lib/schema";
import { createBlankPlayer, slugifyValue, type MutateDraft } from "@/components/admin/shared";
import { ELO_ORDER, resolveElo, resolveRole, teamColor } from "@/lib/design";
import {
  Banner,
  Button,
  C,
  Card,
  Chip,
  Empty,
  Field,
  Input,
  SectionHead,
  Select,
  display,
  tabular,
} from "@/components/admin/ui";

/**
 * Cadastro de jogadores — lista à esquerda, formulário à direita.
 *
 * O que mudou além da pintura (e por quê):
 *
 * - ID somente leitura: é a chave que as linhas de estatística e os MVPs usam. Renomear aqui
 *   não renomeava lá — o histórico do jogador virava lixo silenciosamente.
 * - Rota e elo saíram de texto livre para lista fechada: o site resolve esses valores por
 *   tabela, e um "midlane" digitado à mão simplesmente não pintava nada.
 * - Jogador novo começa VAZIO. Antes já vinha com o primeiro time da lista, rota 2 e elo
 *   preenchidos — um padrão errado passava despercebido e ia parar no site.
 * - Trocar de jogador com edição pendente pergunta antes; excluir mostra o estrago antes.
 */

// ---------------------------------------------------------------- regras de imagem

/**
 * Espelha `imageUrlField` de lib/schema.ts. A cópia é proposital: sem ela o formulário aceita
 * um caminho que o SERVIDOR rejeita, e o erro só aparece na hora de publicar.
 */
const CAMINHO_DE_IMAGEM =
  /^\/(players|teams|cartas|elo|roles|borders)\/[A-Za-z0-9._-]+\.(png|jpe?g|webp|avif|gif|svg)$/i;

const DICA_IMAGEM =
  "Só arquivos do próprio site: /players/, /teams/, /cartas/, /elo/, /roles/ ou /borders/ com .png, .jpg, .webp, .avif, .gif ou .svg — ou um endereço https://ddragon.leagueoflegends.com/…";

function imagemAceita(valor: string) {
  const v = valor.trim();
  if (!v) return true;
  if (v.includes("..") || v.includes("\\")) return false;
  if (CAMINHO_DE_IMAGEM.test(v)) return true;
  try {
    const url = new URL(v);
    return url.protocol === "https:" && url.hostname === "ddragon.leagueoflegends.com";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- listas fechadas

// Correção #24: as rotas e os elos que o site sabe desenhar. Fora desta lista, o valor existe
// no banco mas não vira ícone nem cor em lugar nenhum.
const ROTAS = ["TOP", "JUNG", "MID", "ADC", "SUP"].map((valor) => ({
  valor,
  meta: resolveRole(valor),
}));

const ELOS = ELO_ORDER.map((meta) => ({
  // "grao-mestre" -> "GRAOMESTRE": a forma canônica que lib/design resolve de volta.
  valor: meta.key.toUpperCase().replace(/[^A-Z0-9]/g, ""),
  meta,
}));

/**
 * Opção extra para o valor que já está gravado quando ele não está na lista fechada (dados
 * antigos como "PRAT"). Sem isso o <select> mostraria vazio e trocaria o dado do jogador na
 * primeira vez que alguém abrisse a ficha.
 */
function OpcaoAtual({ valor, conhecido }: Readonly<{ valor: string; conhecido: boolean }>) {
  if (!valor || conhecido) return null;
  return <option value={valor}>{valor} (valor atual)</option>;
}

// ---------------------------------------------------------------- pecinhas visuais

function iniciais(nick: string) {
  const nome = nick.split("#")[0].trim() || nick.trim();
  const palavras = nome.split(/\s+/).filter(Boolean);
  const letras =
    palavras.length >= 2
      ? `${palavras[0][0]}${palavras[1][0]}`
      : nome.replace(/[^A-Za-z0-9]/g, "").slice(0, 2);
  return (letras || nome.slice(0, 2) || "?").toUpperCase();
}

/** Miniatura do jogador: a foto quando existe, iniciais quando não. */
function Retrato({
  nick,
  imageUrl,
  cor,
  size = 34,
}: Readonly<{ nick: string; imageUrl?: string; cor: string; size?: number }>) {
  const base = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: "50%",
    border: `1px solid ${cor}66`,
  };

  if (imageUrl && imageUrl.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={`Foto de ${nick || "jogador sem nick"}`}
        style={{ ...base, objectFit: "cover" }}
      />
    );
  }

  return (
    <span
      aria-hidden
      title={nick}
      style={{
        ...base,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,.4)",
        color: cor,
        fontSize: Math.round(size * 0.36),
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {iniciais(nick || "?")}
    </span>
  );
}

/** Selo de rota com a cor oficial da posição. */
function SeloRota({ rota }: Readonly<{ rota: string }>) {
  const meta = resolveRole(rota);
  return (
    <span
      title={meta.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 6px",
        borderRadius: 2,
        fontSize: 10,
        letterSpacing: ".06em",
        color: meta.color,
        border: `1px solid ${meta.color}55`,
        background: `${meta.color}14`,
        whiteSpace: "nowrap",
      }}
    >
      {meta.short === "—" ? rota.toUpperCase() : meta.short}
    </span>
  );
}

// ---------------------------------------------------------------- impacto da exclusão

type Impacto = Readonly<{ series: number; linhas: number; mvps: number }>;

/** Conta em quanta coisa o jogador aparece. Números, não adjetivos. */
function medirImpacto(draft: TournamentDataset, playerId: string): Impacto {
  let series = 0;
  let linhas = 0;
  let mvps = 0;

  for (const serie of draft.seriesMatches) {
    let citado = false;
    for (const jogo of serie.games) {
      if (jogo.mvpPlayerId === playerId) {
        mvps += 1;
        citado = true;
      }
      for (const linha of jogo.statsByPlayer) {
        if (linha.playerId === playerId) {
          linhas += 1;
          citado = true;
        }
      }
    }
    if (citado) series += 1;
  }

  return { series, linhas, mvps };
}

function removePlayerFromSeriesMatches(
  seriesMatches: TournamentDataset["seriesMatches"],
  playerId: string,
) {
  return seriesMatches.map((series) => ({
    ...series,
    games: series.games.map((game) => ({
      ...game,
      mvpPlayerId: game.mvpPlayerId === playerId ? "" : game.mvpPlayerId,
      statsByPlayer: game.statsByPlayer.filter((row) => row.playerId !== playerId),
    })),
  }));
}

// ---------------------------------------------------------------- painel

function serializa(player: Player) {
  return JSON.stringify([
    player.id,
    player.nick,
    player.slug,
    player.teamId,
    player.role1,
    player.role2 ?? "",
    player.elo,
    player.imageUrl ?? "",
    player.name ?? "",
    player.mono ?? false,
  ]);
}

/** Correção #25: jogador novo começa vazio — nada de time/rota/elo chutados. */
function criarJogadorEmBranco(): Player {
  return { ...createBlankPlayer(), teamId: "", role1: "", role2: "", elo: "" };
}

export function AdminPlayersPanel({
  draft,
  mutateDraft,
  onSujoChange,
}: Readonly<{
  draft: TournamentDataset;
  mutateDraft: MutateDraft;
  /** Avisa que há formulário preenchido e ainda não aplicado ao rascunho. */
  onSujoChange?: (sujo: boolean) => void;
}>) {
  const [selectedId, setSelectedId] = useState<string | null>(draft.players[0]?.id ?? null);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [busca, setBusca] = useState("");
  // O jogador em branco vive em estado (e não num useMemo) para que o ID gerado não mude a cada
  // renderização — se mudasse, o formulário se acharia "desatualizado" sozinho.
  const [branco, setBranco] = useState<Player>(criarJogadorEmBranco);
  const [form, setForm] = useState<Player>(() => draft.players[0] ?? branco);
  // `carregado` é o retrato do que veio do rascunho; comparar com ele é o que define "sujo".
  const [carregado, setCarregado] = useState<Player>(form);
  const [pendente, setPendente] = useState<{ id: string | null } | null>(null);
  const [desatualizado, setDesatualizado] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const salvo = draft.players.find((player) => player.id === selectedId) ?? null;
  const base = salvo ?? branco;
  const editando = Boolean(salvo);
  const sujo = serializa(form) !== serializa(carregado);

  /*
   * Avisa o painel principal que existe formulário preenchido e ainda NÃO aplicado.
   *
   * O `sujo` do painel principal compara rascunho com baseline, e este formulário só entra
   * no rascunho quando alguém clica em "Salvar no rascunho". Sem este aviso, sair ou
   * fechar a aba com uma ficha inteira digitada não pedia confirmação nenhuma: o
   * `beforeunload` não estava registrado e o "Sair" não perguntava — tudo o que foi
   * digitado sumia sem uma palavra.
   *
   * O callback vai por REF e o efeito depende só de `sujo`: com o callback nas
   * dependências, um pai que o recriasse a cada render faria o efeito disparar em laço.
   */
  const refSujo = useRef(onSujoChange);
  useEffect(() => {
    refSujo.current = onSujoChange;
  });
  useEffect(() => {
    refSujo.current?.(sujo);
    // Ao desmontar (trocar de aba), o formulário deixa de existir — e de contar.
    return () => refSujo.current?.(false);
  }, [sujo]);

  const times = useMemo(
    () => draft.teams.slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [draft.teams],
  );

  const filtrados = useMemo(() => {
    const alvo = busca.trim().toLowerCase();
    return draft.players
      .filter((player) => teamFilter === "all" || player.teamId === teamFilter)
      .filter(
        (player) =>
          alvo === "" ||
          player.nick.toLowerCase().includes(alvo) ||
          player.slug.toLowerCase().includes(alvo),
      )
      .slice()
      .sort((a, b) => a.nick.localeCompare(b.nick, "pt-BR"));
  }, [draft.players, teamFilter, busca]);

  const baseChave = serializa(base);

  // O rascunho pode mudar por fora (recarregar dataset, importar backup). Sem edição pendente
  // o formulário acompanha; com edição pendente ele AVISA em vez de engolir o que foi digitado.
  useEffect(() => {
    if (baseChave === serializa(carregado)) {
      setDesatualizado(false);
      return;
    }
    if (sujo) {
      setDesatualizado(true);
      return;
    }
    setForm(base);
    setCarregado(base);
    setDesatualizado(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseChave]);

  function carregar(player: Player, id: string | null) {
    setForm(player);
    setCarregado(player);
    setSelectedId(id);
    setPendente(null);
    setDesatualizado(false);
    setConfirmandoExclusao(false);
  }

  function trocar(id: string | null) {
    if (id === null) {
      const novo = criarJogadorEmBranco();
      setBranco(novo);
      carregar(novo, null);
      return;
    }
    const alvo = draft.players.find((player) => player.id === id);
    if (!alvo) return;
    carregar(alvo, id);
  }

  /** Correção #14: nunca troca de jogador em cima de edição não salva sem perguntar. */
  function pedirTroca(id: string | null) {
    if (sujo) {
      setPendente({ id });
      return;
    }
    trocar(id);
  }

  const slugDuplicado =
    form.slug.trim().length > 0 &&
    draft.players.some((player) => player.id !== form.id && player.slug === form.slug.trim());
  const idDuplicado = !editando && draft.players.some((player) => player.id === form.id);
  const imagemInvalida = !imagemAceita(form.imageUrl ?? "");
  const timeInexistente =
    form.teamId.trim().length > 0 && !draft.teams.some((team) => team.id === form.teamId);

  const problemas: string[] = [];
  if (!form.nick.trim()) problemas.push("informe o nick");
  if (!form.slug.trim()) problemas.push("informe o slug");
  if (!form.teamId.trim()) problemas.push("escolha o time");
  if (timeInexistente) problemas.push("o time escolhido não existe mais");
  if (!form.role1.trim()) problemas.push("escolha a rota principal");
  if (!form.elo.trim()) problemas.push("escolha o elo");
  if (slugDuplicado) problemas.push("o slug já pertence a outro jogador");
  if (idDuplicado) problemas.push("já existe um jogador com este ID");
  if (imagemInvalida) problemas.push("o caminho da foto não é aceito pelo servidor");

  function salvar() {
    if (problemas.length > 0) return;
    const limpo: Player = {
      ...form,
      nick: form.nick.trim(),
      slug: form.slug.trim(),
      role1: form.role1.trim(),
      role2: (form.role2 ?? "").trim(),
      elo: form.elo.trim(),
      imageUrl: (form.imageUrl ?? "").trim(),
    };
    mutateDraft((next) => {
      const indice = next.players.findIndex((player) => player.id === selectedId);
      if (indice >= 0) next.players[indice] = { ...limpo };
      else next.players.push({ ...limpo });
    });
    setForm(limpo);
    setCarregado(limpo);
    setSelectedId(limpo.id);
    setDesatualizado(false);
  }

  function excluir(playerId: string) {
    mutateDraft((next) => {
      next.players = next.players.filter((player) => player.id !== playerId);
      next.seriesMatches = removePlayerFromSeriesMatches(next.seriesMatches, playerId);
    });
    const novo = criarJogadorEmBranco();
    setBranco(novo);
    carregar(novo, null);
  }

  const impacto = salvo ? medirImpacto(draft, salvo.id) : null;
  const corAtual = form.teamId ? teamColor(form.teamId) : C.bronze;
  const eloAtual = resolveElo(form.elo);
  const rota1Conhecida = ROTAS.some((r) => r.valor === form.role1);
  const rota2Conhecida = ROTAS.some((r) => r.valor === (form.role2 ?? ""));
  const eloConhecido = ELOS.some((e) => e.valor === form.elo);

  return (
    <section>
      <SectionHead
        eyebrow="Cadastro"
        title="Jogadores"
        description="Escolha um jogador na lista para editar. Rota e elo são listas fechadas: o site só sabe desenhar esses valores."
        actions={
          <Button tone="gold" onClick={() => pedirTroca(null)}>
            Novo jogador
          </Button>
        }
      />

      {pendente ? (
        <Banner
          tone="warn"
          title="Você tem alterações não salvas neste formulário"
          actions={
            <>
              <Button tone="danger" small onClick={() => trocar(pendente.id)}>
                Descartar e trocar
              </Button>
              <Button small onClick={() => setPendente(null)}>
                Continuar editando
              </Button>
            </>
          }
        >
          Trocar de jogador agora joga fora o que foi digitado em{" "}
          <strong style={{ color: C.ink2 }}>{carregado.nick || "jogador novo"}</strong>.
        </Banner>
      ) : null}

      {desatualizado ? (
        <Banner
          tone="warn"
          title="O rascunho mudou fora deste formulário"
          actions={
            <>
              <Button small onClick={() => carregar(base, selectedId)}>
                Recarregar do rascunho
              </Button>
              <Button small onClick={() => setDesatualizado(false)}>
                Manter minha edição
              </Button>
            </>
          }
        >
          Os dados deste jogador foram recarregados ou importados. Salvar agora grava por cima da
          versão nova.
        </Banner>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 18,
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          alignItems: "start",
        }}
      >
        {/* ------------------------------------------------ lista */}
        <Card padding="16px 16px 18px">
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <h3 style={{ fontFamily: display, fontSize: 16, color: C.bronze, margin: 0 }}>
              Jogadores cadastrados
            </h3>
            <span style={{ fontSize: 11, color: C.ink4, ...tabular }}>
              {filtrados.length} de {draft.players.length}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              marginBottom: 14,
            }}
          >
            <Field label="Filtrar por time">
              <Select value={teamFilter} onChange={setTeamFilter}>
                <option value="all">Todos os times</option>
                {times.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Buscar">
              <Input value={busca} onChange={setBusca} placeholder="nick ou slug" />
            </Field>
          </div>

          {draft.players.length === 0 ? (
            <Empty
              title="Nenhum jogador cadastrado"
              action={
                <Button tone="gold" small onClick={() => pedirTroca(null)}>
                  Criar o primeiro jogador
                </Button>
              }
            >
              As estatísticas de cada partida são lançadas por jogador — sem elenco não há o que
              lançar.
            </Empty>
          ) : filtrados.length === 0 ? (
            <Empty title="Nenhum jogador com esse filtro">
              Ajuste a busca ou volte o filtro para “Todos os times”.
            </Empty>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 6,
                maxHeight: 520,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {filtrados.map((player) => {
                const ativo = selectedId === player.id;
                const time = draft.teams.find((team) => team.id === player.teamId);
                const cor = player.teamId ? teamColor(player.teamId) : C.ink4;
                const elo = resolveElo(player.elo);
                return (
                  <button
                    key={player.id}
                    type="button"
                    aria-current={ativo ? "true" : undefined}
                    onClick={() => pedirTroca(player.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      width: "100%",
                      textAlign: "left",
                      padding: "9px 11px",
                      borderRadius: 3,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      border: `1px solid ${ativo ? C.line2 : C.line}`,
                      borderLeft: `3px solid ${ativo ? cor : "transparent"}`,
                      background: ativo ? "rgba(201,138,75,.12)" : "rgba(0,0,0,.24)",
                    }}
                  >
                    <Retrato nick={player.nick} imageUrl={player.imageUrl} cor={cor} />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          display: "block",
                          fontFamily: display,
                          fontSize: 15,
                          color: ativo ? C.bronzeHi : C.ink,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {player.nick || "(sem nick)"}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          marginTop: 3,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: C.ink4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 130,
                          }}
                        >
                          {time?.name ?? "sem time"}
                        </span>
                        {player.role1 ? <SeloRota rota={player.role1} /> : null}
                        {player.role2 ? <SeloRota rota={player.role2} /> : null}
                        <span style={{ fontSize: 10.5, color: elo?.color ?? C.ink4 }}>
                          {elo?.label ?? player.elo}
                        </span>
                      </span>
                    </span>
                    {sujo && ativo ? <Chip tone="warn">não salvo</Chip> : null}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* ------------------------------------------------ formulário */}
        <Card padding="16px 16px 18px">
          <form
            // Correção #43: Enter dentro de qualquer campo salva, como em qualquer formulário.
            onSubmit={(event) => {
              event.preventDefault();
              salvar();
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <h3 style={{ fontFamily: display, fontSize: 16, color: C.bronze, margin: 0 }}>
                {editando ? "Editar jogador" : "Criar jogador"}
              </h3>
              {sujo ? (
                <Chip tone="warn">Não salvo</Chip>
              ) : (
                <Chip tone="ok">Em dia com o rascunho</Chip>
              )}
            </div>

            <div style={{ display: "grid", gap: 13 }}>
              {/* Correção #12: ID só de leitura. */}
              <Field
                label="ID (gerado automaticamente)"
                hint="É a chave usada pelas linhas de estatística e pelos MVPs. Trocá-la deixaria o histórico apontando para um jogador que não existe mais."
              >
                {/* readOnly (e não disabled) para o valor continuar selecionável e copiável. */}
                <input
                  value={form.id}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                  style={{
                    width: "100%",
                    padding: "9px 11px",
                    fontFamily: "inherit",
                    fontSize: 13,
                    color: C.ink3,
                    background: "rgba(0,0,0,.24)",
                    border: `1px dashed ${C.line}`,
                    borderRadius: 3,
                    cursor: "default",
                    ...tabular,
                  }}
                />
              </Field>

              <Field label="Nick">
                <Input
                  value={form.nick}
                  onChange={(v) => setForm((prev) => ({ ...prev, nick: v }))}
                  placeholder="Nick do jogo"
                />
              </Field>

              <Field
                label="Slug"
                hint={
                  slugDuplicado
                    ? "Este slug já pertence a outro jogador — dois jogadores com o mesmo slug brigam pela mesma página."
                    : "Aparece no endereço da página do jogador."
                }
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <Input
                    value={form.slug}
                    onChange={(v) => setForm((prev) => ({ ...prev, slug: v }))}
                    placeholder="nick-do-jogador"
                    style={slugDuplicado ? { border: `1px solid ${C.danger}`, ...tabular } : tabular}
                  />
                  <Button
                    small
                    onClick={() => setForm((prev) => ({ ...prev, slug: slugifyValue(prev.nick) }))}
                    style={{ flexShrink: 0 }}
                  >
                    Gerar do nick
                  </Button>
                </div>
              </Field>

              {/* Correção #25: sem time padrão — quem cadastra escolhe. */}
              <Field
                label="Time"
                hint={timeInexistente ? "O time gravado neste jogador não existe mais no rascunho." : undefined}
              >
                <Select
                  value={form.teamId}
                  onChange={(v) => setForm((prev) => ({ ...prev, teamId: v }))}
                  style={
                    !form.teamId || timeInexistente ? { border: `1px solid ${C.warn}66` } : undefined
                  }
                >
                  <option value="">Escolha o time…</option>
                  {times.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                  {timeInexistente ? (
                    <option value={form.teamId}>{form.teamId} (time removido)</option>
                  ) : null}
                </Select>
              </Field>

              {/* Correção #24: rota e elo viraram lista fechada. */}
              <div
                style={{
                  display: "grid",
                  gap: 11,
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                }}
              >
                <Field label="Rota principal">
                  <Select
                    value={form.role1}
                    onChange={(v) => setForm((prev) => ({ ...prev, role1: v }))}
                    style={!form.role1 ? { border: `1px solid ${C.warn}66` } : undefined}
                  >
                    <option value="">Escolha…</option>
                    {ROTAS.map(({ valor, meta }) => (
                      <option key={valor} value={valor}>
                        {meta.short} · {meta.label}
                      </option>
                    ))}
                    <OpcaoAtual valor={form.role1} conhecido={rota1Conhecida} />
                  </Select>
                </Field>

                <Field label="Rota secundária">
                  <Select
                    value={form.role2 ?? ""}
                    onChange={(v) => setForm((prev) => ({ ...prev, role2: v }))}
                  >
                    <option value="">Nenhuma</option>
                    {ROTAS.map(({ valor, meta }) => (
                      <option key={valor} value={valor}>
                        {meta.short} · {meta.label}
                      </option>
                    ))}
                    <OpcaoAtual valor={form.role2 ?? ""} conhecido={rota2Conhecida} />
                  </Select>
                </Field>

                <Field label="Elo">
                  <Select
                    value={form.elo}
                    onChange={(v) => setForm((prev) => ({ ...prev, elo: v }))}
                    style={!form.elo ? { border: `1px solid ${C.warn}66` } : undefined}
                  >
                    <option value="">Escolha…</option>
                    {ELOS.map(({ valor, meta }) => (
                      <option key={valor} value={valor}>
                        {meta.label}
                      </option>
                    ))}
                    <OpcaoAtual valor={form.elo} conhecido={eloConhecido} />
                  </Select>
                </Field>
              </div>

              {/* Correção #23: placeholder e dica ensinam o caminho que o servidor ACEITA. */}
              <Field
                label="Foto (caminho da imagem)"
                hint={imagemInvalida ? `Caminho recusado. ${DICA_IMAGEM}` : DICA_IMAGEM}
              >
                <Input
                  value={form.imageUrl ?? ""}
                  onChange={(v) => setForm((prev) => ({ ...prev, imageUrl: v }))}
                  placeholder="/players/nick-do-jogador.png"
                  style={imagemInvalida ? { border: `1px solid ${C.danger}` } : undefined}
                />
              </Field>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 12px",
                  borderRadius: 3,
                  border: `1px solid ${C.line}`,
                  background: "rgba(0,0,0,.2)",
                }}
              >
                <Retrato
                  nick={form.nick || "?"}
                  imageUrl={imagemInvalida ? undefined : form.imageUrl}
                  cor={corAtual}
                  size={46}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, color: C.ink3 }}>
                    Prévia da foto (sem imagem, valem as iniciais).
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginTop: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {form.role1 ? <SeloRota rota={form.role1} /> : null}
                    {form.role2 ? <SeloRota rota={form.role2} /> : null}
                    {eloAtual ? (
                      <span style={{ fontSize: 10.5, color: eloAtual.color }}>{eloAtual.label}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {problemas.length > 0 ? (
                <Banner tone="warn" title="Falta ajustar antes de salvar">
                  {problemas.join(" · ")}
                </Banner>
              ) : null}

              {/* Correção #7: exclusão em cascata só depois de ver o estrago. */}
              {confirmandoExclusao && salvo && impacto ? (
                <Banner
                  tone="danger"
                  title={`Excluir “${salvo.nick}” apaga também o histórico dele`}
                  actions={
                    <>
                      <Button tone="danger" small onClick={() => excluir(salvo.id)}>
                        Excluir definitivamente
                      </Button>
                      <Button small onClick={() => setConfirmandoExclusao(false)}>
                        Cancelar
                      </Button>
                    </>
                  }
                >
                  <span style={tabular}>
                    {impacto.linhas} linha{impacto.linhas === 1 ? "" : "s"} de estatística em{" "}
                    {impacto.series} série{impacto.series === 1 ? "" : "s"} · {impacto.mvps} MVP
                    {impacto.mvps === 1 ? "" : "s"}
                  </span>
                  <br />
                  As linhas somem, os jogos onde ele era MVP ficam sem MVP e{" "}
                  <strong style={{ color: C.dangerSoft }}>não há como desfazer</strong> — só
                  restaurando um backup.
                </Banner>
              ) : null}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
                <Button type="submit" tone="gold" disabled={problemas.length > 0}>
                  Salvar no rascunho
                </Button>
                {sujo ? (
                  <Button onClick={() => carregar(base, selectedId)}>Desfazer alterações</Button>
                ) : null}
                {editando && !confirmandoExclusao ? (
                  <Button tone="danger" onClick={() => setConfirmandoExclusao(true)}>
                    Excluir jogador
                  </Button>
                ) : null}
              </div>

              <p style={{ margin: 0, fontSize: 11.5, color: C.ink4, lineHeight: 1.6 }}>
                Salvar altera apenas o rascunho. Nada vai para o site antes de publicar.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </section>
  );
}
