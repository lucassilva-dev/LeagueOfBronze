"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Team, TournamentDataset } from "@/lib/schema";
import { createBlankTeam, slugifyValue, type MutateDraft } from "@/components/admin/shared";
import { teamColor } from "@/lib/design";
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
  display,
  tabular,
} from "@/components/admin/ui";

/**
 * Cadastro de times — lista à esquerda, formulário à direita.
 *
 * O que mudou além da pintura (e por quê):
 *
 * - O ID virou SOMENTE LEITURA. Ele é a chave que as séries, os jogadores e a classificação
 *   usam para apontar para o time; renomear aqui não renomeava lá, então o dataset inteiro
 *   ficava órfão sem nenhum aviso.
 * - Trocar de time com edição pendente agora PERGUNTA antes de descartar, e o formulário
 *   avisa quando o rascunho muda por fora (recarregamento) em vez de sobrescrever calado.
 * - Excluir mostra o ESTRAGO real (séries, jogos, linhas de estatística, jogadores) antes de
 *   confirmar, porque a operação é em cascata e não tem desfazer.
 */

// ---------------------------------------------------------------- regras de imagem

/**
 * Espelha `imageUrlField` de lib/schema.ts. A cópia é proposital: sem ela o formulário aceita
 * um caminho que o SERVIDOR rejeita, e o erro só aparece na hora de publicar — quando o
 * trabalho todo já foi digitado.
 */
const CAMINHO_DE_IMAGEM =
  /^\/(players|teams|cartas|elo|roles|borders)\/[A-Za-z0-9._-]+\.(png|jpe?g|webp|avif|gif|svg)$/i;

const DICA_IMAGEM =
  "Só arquivos do próprio site: /teams/, /players/, /cartas/, /elo/, /roles/ ou /borders/ com .png, .jpg, .webp, .avif, .gif ou .svg — ou um endereço https://ddragon.leagueoflegends.com/…";

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

// ---------------------------------------------------------------- pecinhas visuais

const STOPWORDS = new Set(["de", "do", "da", "dos", "das", "e"]);

function iniciais(nome: string) {
  const palavras = nome
    .trim()
    .split(/\s+/)
    .filter((p) => p && !STOPWORDS.has(p.toLowerCase()));
  const escolhidas = palavras.length ? palavras : nome.trim().split(/\s+/);
  const letras = escolhidas
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("");
  return (letras || nome.slice(0, 2) || "?").toUpperCase();
}

/** Escudo do time: a imagem quando existe, iniciais tingidas com a cor do time quando não. */
function Escudo({
  name,
  imageUrl,
  cor,
  size = 34,
}: Readonly<{ name: string; imageUrl?: string; cor: string; size?: number }>) {
  const base = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: 3,
    border: `1px solid ${cor}66`,
  };

  if (imageUrl && imageUrl.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={`Escudo de ${name || "time sem nome"}`}
        style={{ ...base, objectFit: "cover" }}
      />
    );
  }

  return (
    <span
      aria-hidden
      title={name}
      style={{
        ...base,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(180deg, ${cor}33, rgba(0,0,0,.35))`,
        color: cor,
        fontFamily: display,
        fontSize: Math.round(size * 0.4),
        lineHeight: 1,
      }}
    >
      {iniciais(name || "?")}
    </span>
  );
}

// ---------------------------------------------------------------- impacto da exclusão

type Impacto = Readonly<{
  series: number;
  jogos: number;
  linhas: number;
  jogadores: number;
  classificacao: number;
  /** Registros de sorteio (com semente) que somem junto com as séries do time. */
  sorteios: number;
}>;

/** Conta o que a exclusão em cascata leva junto. Números, não adjetivos. */
function medirImpacto(draft: TournamentDataset, teamId: string): Impacto {
  let series = 0;
  let jogos = 0;
  let linhas = 0;
  let sorteios = 0;

  for (const serie of draft.seriesMatches) {
    if (serie.teamAId !== teamId && serie.teamBId !== teamId) continue;
    series += 1;
    jogos += serie.games.length;
    sorteios += serie.sorteios?.length ?? 0;
    for (const jogo of serie.games) linhas += jogo.statsByPlayer.length;
  }

  return {
    series,
    jogos,
    linhas,
    jogadores: draft.players.filter((p) => p.teamId === teamId).length,
    classificacao: draft.standingsSeed.filter((linha) => linha.teamId === teamId).length,
    sorteios,
  };
}

// ---------------------------------------------------------------- painel

function serializa(team: Team) {
  return JSON.stringify([team.id, team.name, team.slug, team.imageUrl ?? ""]);
}

export function AdminTeamsPanel({
  draft,
  mutateDraft,
  onSujoChange,
}: Readonly<{
  draft: TournamentDataset;
  mutateDraft: MutateDraft;
  /** Avisa que há formulário preenchido e ainda não aplicado ao rascunho. */
  onSujoChange?: (sujo: boolean) => void;
}>) {
  const [selectedId, setSelectedId] = useState<string | null>(draft.teams[0]?.id ?? null);
  // O time em branco vive em estado (e não num useMemo) para que o ID gerado não mude a cada
  // renderização — se mudasse, o formulário se acharia "desatualizado" sozinho.
  const [branco, setBranco] = useState<Team>(createBlankTeam);
  const [form, setForm] = useState<Team>(() => draft.teams[0] ?? branco);
  // `carregado` é o retrato do que veio do rascunho; comparar com ele é o que define "sujo".
  const [carregado, setCarregado] = useState<Team>(form);
  const [pendente, setPendente] = useState<{ id: string | null } | null>(null);
  const [desatualizado, setDesatualizado] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const salvo = draft.teams.find((team) => team.id === selectedId) ?? null;
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

  const ordenados = useMemo(
    () => draft.teams.slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [draft.teams],
  );

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

  function carregar(team: Team, id: string | null) {
    setForm(team);
    setCarregado(team);
    setSelectedId(id);
    setPendente(null);
    setDesatualizado(false);
    setConfirmandoExclusao(false);
  }

  function trocar(id: string | null) {
    if (id === null) {
      const novo = createBlankTeam();
      setBranco(novo);
      carregar(novo, null);
      return;
    }
    const alvo = draft.teams.find((team) => team.id === id);
    if (!alvo) return;
    carregar(alvo, id);
  }

  /** Correção #14: nunca troca de time em cima de edição não salva sem perguntar. */
  function pedirTroca(id: string | null) {
    if (sujo) {
      setPendente({ id });
      return;
    }
    trocar(id);
  }

  const slugDuplicado =
    form.slug.trim().length > 0 &&
    draft.teams.some((team) => team.id !== form.id && team.slug === form.slug.trim());
  const idDuplicado =
    !editando && draft.teams.some((team) => team.id === form.id);
  const imagemInvalida = !imagemAceita(form.imageUrl ?? "");

  const problemas: string[] = [];
  if (!form.name.trim()) problemas.push("informe o nome do time");
  if (!form.slug.trim()) problemas.push("informe o slug");
  if (slugDuplicado) problemas.push("o slug já pertence a outro time");
  if (idDuplicado) problemas.push("já existe um time com este ID");
  if (imagemInvalida) problemas.push("o caminho do escudo não é aceito pelo servidor");

  function salvar() {
    if (problemas.length > 0) return;
    const limpo: Team = {
      ...form,
      name: form.name.trim(),
      slug: form.slug.trim(),
      imageUrl: (form.imageUrl ?? "").trim(),
    };
    mutateDraft((next) => {
      const indice = next.teams.findIndex((team) => team.id === selectedId);
      if (indice >= 0) next.teams[indice] = { ...limpo };
      else next.teams.push({ ...limpo });
    });
    setForm(limpo);
    setCarregado(limpo);
    setSelectedId(limpo.id);
    setDesatualizado(false);
  }

  function excluir(teamId: string) {
    mutateDraft((next) => {
      next.teams = next.teams.filter((team) => team.id !== teamId);
      next.players = next.players.filter((player) => player.teamId !== teamId);
      next.seriesMatches = next.seriesMatches.filter(
        (series) => series.teamAId !== teamId && series.teamBId !== teamId,
      );
      next.standingsSeed = next.standingsSeed.filter((linha) => linha.teamId !== teamId);
    });
    const novo = createBlankTeam();
    setBranco(novo);
    carregar(novo, null);
  }

  const impacto = salvo ? medirImpacto(draft, salvo.id) : null;
  const corAtual = teamColor(form.id);

  return (
    <section>
      <SectionHead
        eyebrow="Cadastro"
        title="Times"
        description="Escolha um time na lista para editar. O ID é gerado uma única vez e amarra todo o histórico — por isso não pode ser trocado aqui."
        actions={
          <Button tone="gold" onClick={() => pedirTroca(null)}>
            Novo time
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
          Trocar de time agora joga fora o que foi digitado em{" "}
          <strong style={{ color: C.ink2 }}>{carregado.name || "time novo"}</strong>.
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
          Os dados deste time foram recarregados ou importados. Salvar agora grava por cima da
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
              Times cadastrados
            </h3>
            <span style={{ fontSize: 11, color: C.ink4, ...tabular }}>{ordenados.length}</span>
          </div>

          {ordenados.length === 0 ? (
            <Empty
              title="Nenhum time cadastrado"
              action={
                <Button tone="gold" small onClick={() => pedirTroca(null)}>
                  Criar o primeiro time
                </Button>
              }
            >
              Os times são a base de tudo: jogadores, séries e classificação apontam para eles.
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
              {ordenados.map((team) => {
                const ativo = selectedId === team.id;
                const cor = teamColor(team.id);
                const elenco = draft.players.filter((p) => p.teamId === team.id).length;
                return (
                  <button
                    key={team.id}
                    type="button"
                    aria-current={ativo ? "true" : undefined}
                    onClick={() => pedirTroca(team.id)}
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
                    <Escudo name={team.name} imageUrl={team.imageUrl} cor={cor} />
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
                        {team.name || "(sem nome)"}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: C.ink4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          ...tabular,
                        }}
                      >
                        /{team.slug} · {elenco} jogador{elenco === 1 ? "" : "es"}
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
                {editando ? "Editar time" : "Criar time"}
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
                hint="É a chave usada por séries, jogadores e classificação. Trocá-la deixaria todo o histórico apontando para um time que não existe mais."
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

              <Field label="Nome">
                <Input
                  value={form.name}
                  onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
                  placeholder="Vanguarda de Ferro"
                />
              </Field>

              <Field
                label="Slug"
                hint={
                  slugDuplicado
                    ? "Este slug já pertence a outro time — dois times com o mesmo slug brigam pela mesma página."
                    : "Aparece no endereço da página do time."
                }
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <Input
                    value={form.slug}
                    onChange={(v) => setForm((prev) => ({ ...prev, slug: v }))}
                    placeholder="vanguarda-de-ferro"
                    style={
                      slugDuplicado
                        ? { border: `1px solid ${C.danger}`, ...tabular }
                        : tabular
                    }
                  />
                  <Button
                    small
                    onClick={() => setForm((prev) => ({ ...prev, slug: slugifyValue(prev.name) }))}
                    style={{ flexShrink: 0 }}
                  >
                    Gerar do nome
                  </Button>
                </div>
              </Field>

              {/* Correção #23: placeholder e dica ensinam o caminho que o servidor ACEITA. */}
              <Field
                label="Escudo (caminho da imagem)"
                hint={imagemInvalida ? `Caminho recusado. ${DICA_IMAGEM}` : DICA_IMAGEM}
              >
                <Input
                  value={form.imageUrl ?? ""}
                  onChange={(v) => setForm((prev) => ({ ...prev, imageUrl: v }))}
                  placeholder="/teams/vanguarda-de-ferro.png"
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
                <Escudo
                  name={form.name || "?"}
                  imageUrl={imagemInvalida ? undefined : form.imageUrl}
                  cor={corAtual}
                  size={44}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, color: C.ink3 }}>
                    Prévia do escudo (sem imagem, valem as iniciais).
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginTop: 6,
                      fontSize: 11,
                      color: C.ink4,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        background: corAtual,
                        flexShrink: 0,
                      }}
                    />
                    Cor do time no site: <span style={tabular}>{corAtual}</span>
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
                  title={`Excluir “${salvo.name}” apaga também o histórico dele`}
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
                    {impacto.jogadores} jogador{impacto.jogadores === 1 ? "" : "es"} ·{" "}
                    {impacto.series} série{impacto.series === 1 ? "" : "s"} · {impacto.jogos} jogo
                    {impacto.jogos === 1 ? "" : "s"} · {impacto.linhas} linha
                    {impacto.linhas === 1 ? "" : "s"} de estatística ·{" "}
                    {impacto.classificacao} linha{impacto.classificacao === 1 ? "" : "s"} da
                    classificação inicial
                  </span>
                  <br />
                  Some tudo de uma vez e <strong style={{ color: C.dangerSoft }}>não há como
                  desfazer</strong> — só restaurando um backup.
                  {/*
                    O histórico de sorteios é append-only e o servidor recusa removê-lo de
                    quem não é o responsável pelo campeonato. Sem este aviso, a exclusão
                    era aceita na tela e só falhava lá na frente, na hora de salvar — com o
                    time já apagado do rascunho e sem desfazer.
                  */}
                  {impacto.sorteios > 0 ? (
                    <>
                      <br />
                      <strong style={{ color: C.dangerSoft }}>
                        Inclui {impacto.sorteios} registro{impacto.sorteios === 1 ? "" : "s"} de
                        sorteio
                      </strong>{" "}
                      (com a semente que permite conferir cada resultado). Só o responsável pelo
                      campeonato consegue salvar uma remoção dessas.
                    </>
                  ) : null}
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
                    Excluir time
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
