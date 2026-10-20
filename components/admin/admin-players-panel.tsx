"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Plus, Trash2, Undo2 } from "lucide-react";

import type { Player, TournamentDataset } from "@/lib/schema";
import { createBlankPlayer, slugifyValue, type MutateDraft } from "@/components/admin/shared";
import { ICONE_DA_SECAO } from "@/components/admin/icones-admin";
import { useCompacto } from "@/components/admin/responsivo";
import { RoleIcon, TeamMark } from "@/components/lob/ui";
import { ELO_ORDER, resolveElo, resolveRole, teamColor } from "@/lib/design";
import {
  Banner,
  Button,
  C,
  Card,
  CartaoLinha,
  Check,
  Chip,
  ChipFiltro,
  Elo,
  Empty,
  Field,
  Folha,
  Input,
  RolagemX,
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
 * - O elo aparece pelo EMBLEMA oficial (o mesmo do site), não pelo nome escrito: é como a
 *   organização reconhece o elo de relance. O nome segue no `alt`, para quem não enxerga.
 *
 * No celular, a lista fica na página (filtro de time em chips, no polegar) e o formulário
 * abre numa folha de tela cheia, com as ações presas no rodapé. Fechar a folha é sair do
 * editor: com edição pendente, pergunta antes, exatamente como trocar de jogador pergunta.
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

/**
 * Selo de rota com a cor oficial da posição e o ícone oficial dela (o mesmo de /public/roles
 * que o site usa). Rota fora da tabela sai só com o texto: dado estranho fica visível.
 */
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
      <RoleIcon role={rota} size={11} color={meta.color} />
      {meta.short === "—" ? rota.toUpperCase() : meta.short}
    </span>
  );
}

/**
 * Casa de tamanho fixo ao lado de um <select>, com o desenho da opção escolhida (emblema do
 * elo, ícone da rota). O <select> nativo não mostra imagem nas opções, então o desenho vem
 * aqui fora. Sem escolha fica o tracejado no lugar — a casa não some, e o select não muda de
 * largura debaixo do dedo de quem está escolhendo.
 */
function CasaDaEscolha({ tamanho, children }: Readonly<{ tamanho: number; children?: ReactNode }>) {
  return (
    <span
      style={{
        width: tamanho,
        height: tamanho,
        flexShrink: 0,
        display: "inline-grid",
        placeItems: "center",
        borderRadius: 4,
        border: children ? "1px solid transparent" : `1px dashed ${C.line2}`,
      }}
    >
      {children}
    </span>
  );
}

/**
 * Texto que só o leitor de tela lê — o nome dos botões de ícone do rodapé do celular. O
 * `title` sozinho não basta: no toque ele nunca aparece.
 */
const soParaLeitor: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/** Botão de ícone do rodapé: 46px de largura, o mesmo alvo de dedo dos botões com texto. */
function BotaoDeIcone({
  rotulo,
  tone,
  onClick,
  children,
}: Readonly<{ rotulo: string; tone?: "ghost" | "danger"; onClick: () => void; children: ReactNode }>) {
  return (
    <Button tone={tone} title={rotulo} onClick={onClick} style={{ flexShrink: 0, padding: "0 13px" }}>
      {children}
      <span style={soParaLeitor}>{rotulo}</span>
    </Button>
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
    player.captain ?? false,
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
  const compacto = useCompacto();
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
  // Só no celular: a folha do editor está aberta, e o "fechar" pediu confirmação.
  const [editorAberto, setEditorAberto] = useState(false);
  const [confirmandoFechar, setConfirmandoFechar] = useState(false);
  const refExclusao = useRef<HTMLDivElement>(null);

  const salvo = draft.players.find((player) => player.id === selectedId) ?? null;
  const base = salvo ?? branco;
  const editando = Boolean(salvo);
  const sujo = serializa(form) !== serializa(carregado);
  // Derivado, e não só o estado: se a edição deixou de existir (ex.: "Recarregar do
  // rascunho" dentro da folha), não há mais o que perguntar.
  const perguntandoFechar = confirmandoFechar && sujo;

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

  /** Quantos jogadores cada time tem — o número que vai em cada chip do filtro no celular. */
  const elencoPorTime = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const player of draft.players) contagem.set(player.teamId, (contagem.get(player.teamId) ?? 0) + 1);
    return contagem;
  }, [draft.players]);

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

  // ------------------------------------------------ folha do celular

  /**
   * Abre o editor na folha. Tocar no jogador que JÁ está carregado só reabre: não é troca,
   * e passar por `pedirTroca` ali descartaria (ou perguntaria sobre) a própria edição.
   * Com edição pendente noutro jogador, a pergunta de troca aparece dentro da folha.
   */
  function abrirEditor(id: string | null) {
    if (id === null || id !== selectedId) pedirTroca(id);
    setConfirmandoFechar(false);
    setEditorAberto(true);
  }

  function fecharEditor() {
    setEditorAberto(false);
    setConfirmandoFechar(false);
    setConfirmandoExclusao(false);
    setPendente(null);
  }

  /** Esc, toque no fundo e o X chegam aqui. Com edição pendente, a folha pergunta antes. */
  function pedirFechar() {
    if (sujo) {
      setConfirmandoFechar(true);
      return;
    }
    fecharEditor();
  }

  function descartarEFechar() {
    carregar(base, selectedId);
    fecharEditor();
  }

  /**
   * No celular o aviso do estrago nasce no fim do formulário, fora da vista de quem tocou
   * na lixeira do rodapé: a folha rola até ele.
   */
  function pedirExclusao() {
    setConfirmandoExclusao(true);
    if (compacto) {
      requestAnimationFrame(() => refExclusao.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" }));
    }
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
    // A marca de capitão (gravada pela virada do draft) é do TIME: quem troca de time não
    // leva a capitania junto — senão o time novo ficava com dois capitães e o antigo com
    // nenhum. Para seguir capitão no time novo, é marcar de novo aqui.
    const trocouDeTime = carregado.teamId !== "" && carregado.teamId !== limpo.teamId;
    if (trocouDeTime && carregado.captain && limpo.captain) delete limpo.captain;
    if (!limpo.captain) delete limpo.captain;
    mutateDraft((next) => {
      const indice = next.players.findIndex((player) => player.id === selectedId);
      if (indice >= 0) next.players[indice] = { ...limpo };
      else next.players.push({ ...limpo });
      // Um capitão por time: marcar este desmarca quem mais estava marcado no mesmo time.
      if (limpo.captain) {
        for (const outro of next.players) {
          if (outro.id !== limpo.id && outro.teamId === limpo.teamId && outro.captain) delete outro.captain;
        }
      }
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
    // No celular a folha fecha: o jogador não existe mais, e um "Criar jogador" vazio no
    // lugar dele pareceria que a exclusão não aconteceu.
    setEditorAberto(false);
  }

  const impacto = salvo ? medirImpacto(draft, salvo.id) : null;
  const corAtual = form.teamId ? teamColor(form.teamId) : C.bronze;
  const eloAtual = resolveElo(form.elo);
  const rota1Conhecida = ROTAS.some((r) => r.valor === form.role1);
  const rota2Conhecida = ROTAS.some((r) => r.valor === (form.role2 ?? ""));
  const eloConhecido = ELOS.some((e) => e.valor === form.elo);
  /** No monitor a coluna do elo tem ~145px: o emblema miúdo deixa o nome caber no select. */
  const tamanhoDaCasa = compacto ? 34 : 24;

  // ------------------------------------------------ peças do desenho

  const avisoPendente = pendente ? (
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
  ) : null;

  const avisoDesatualizado = desatualizado ? (
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
  ) : null;

  const cabecalhoDaLista = (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: compacto ? 10 : 12,
      }}
    >
      <h3 style={{ fontFamily: display, fontSize: 16, color: C.bronze, margin: 0 }}>
        Jogadores cadastrados
      </h3>
      <span style={{ fontSize: 11, color: C.ink4, ...tabular }}>
        {filtrados.length} de {draft.players.length}
      </span>
    </div>
  );

  const novoJogador = () => (compacto ? abrirEditor(null) : pedirTroca(null));

  /** Estados vazios: sem elenco nenhum, ou sem ninguém que passe no filtro. */
  const listaVazia =
    draft.players.length === 0 ? (
      <Empty
        title="Nenhum jogador cadastrado"
        action={
          <Button tone="gold" small onClick={novoJogador}>
            Criar o primeiro jogador
          </Button>
        }
      >
        As estatísticas de cada partida são lançadas por jogador — sem elenco não há o que
        lançar.
      </Empty>
    ) : filtrados.length === 0 ? (
      <Empty title="Nenhum jogador com esse filtro">
        {compacto
          ? "Ajuste a busca ou volte o filtro para “Todos”."
          : "Ajuste a busca ou volte o filtro para “Todos os times”."}
      </Empty>
    ) : null;

  /**
   * Os campos de rota e elo. No monitor seguem na grade de colunas estreitas de sempre; no
   * celular cada um ocupa a linha inteira — "ADC · Atirador" não cabe em meia tela de 360px
   * com a fonte de 16px que o iPhone exige.
   */
  const campoRota = (qual: "role1" | "role2") => {
    const valor = qual === "role1" ? form.role1 : (form.role2 ?? "");
    const conhecida = qual === "role1" ? rota1Conhecida : rota2Conhecida;
    const select = (
      <Select
        value={valor}
        onChange={(v) => setForm((prev) => (qual === "role1" ? { ...prev, role1: v } : { ...prev, role2: v }))}
        style={{
          ...(compacto ? { flex: 1, minWidth: 0 } : null),
          ...(qual === "role1" && !form.role1 ? { border: `1px solid ${C.warn}66` } : null),
        }}
      >
        <option value="">{qual === "role1" ? "Escolha…" : "Nenhuma"}</option>
        {ROTAS.map(({ valor: v, meta }) => (
          <option key={v} value={v}>
            {meta.short} · {meta.label}
          </option>
        ))}
        <OpcaoAtual valor={valor} conhecido={conhecida} />
      </Select>
    );
    return (
      <Field label={qual === "role1" ? "Rota principal" : "Rota secundária"}>
        {/* No celular, o ícone oficial da rota escolhida ao lado. No monitor a coluna é
            estreita demais: o ícone comeria o "Atirador" do select. */}
        {compacto ? (
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CasaDaEscolha tamanho={tamanhoDaCasa}>
              {resolveRole(valor).key ? (
                <RoleIcon role={valor} size={24} color={resolveRole(valor).color} />
              ) : null}
            </CasaDaEscolha>
            {select}
          </span>
        ) : (
          select
        )}
      </Field>
    );
  };

  const campoElo = (
    <Field label="Elo">
      {/* O emblema da escolha ao lado do select, que não mostra imagem nas opções. */}
      <span style={{ display: "flex", alignItems: "center", gap: compacto ? 10 : 8 }}>
        <CasaDaEscolha tamanho={tamanhoDaCasa}>
          {eloAtual ? <Elo elo={form.elo} tamanho={tamanhoDaCasa} /> : null}
        </CasaDaEscolha>
        <Select
          value={form.elo}
          onChange={(v) => setForm((prev) => ({ ...prev, elo: v }))}
          style={{ flex: 1, minWidth: 0, ...(!form.elo ? { border: `1px solid ${C.warn}66` } : null) }}
        >
          <option value="">Escolha…</option>
          {ELOS.map(({ valor, meta }) => (
            <option key={valor} value={valor}>
              {meta.label}
            </option>
          ))}
          <OpcaoAtual valor={form.elo} conhecido={eloConhecido} />
        </Select>
      </span>
    </Field>
  );

  const campoCapitao = (
    <Field
      label="Capitão"
      hint="Um por time. Marcar aqui desmarca o capitão anterior do mesmo time. Sem nenhum marcado na temporada, o site usa a regra antiga (o MID)."
    >
      <Check
        checked={form.captain === true}
        onChange={(v) => setForm((prev) => ({ ...prev, captain: v }))}
      >
        Capitão do time
      </Check>
    </Field>
  );

  /**
   * Os campos do formulário — os mesmos no monitor e na folha do celular. Lá, as ações
   * moram no rodapé fixo da folha; aqui, no fim do formulário.
   */
  const campos = (
    <div style={{ display: "grid", gap: 13 }}>
      {/* Correção #12: ID só de leitura. */}
      <Field
        label="ID (gerado automaticamente)"
        hint="É a chave usada pelas linhas de estatística e pelos MVPs. Trocá-la deixaria o histórico apontando para um jogador que não existe mais."
      >
        {/* readOnly (e não disabled) para o valor continuar selecionável e copiável. No
            celular, 16px: o iPhone dá zoom ao focar campo menor, mesmo só de leitura. */}
        <input
          value={form.id}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          style={{
            width: "100%",
            padding: compacto ? "11px 12px" : "9px 11px",
            minHeight: compacto ? 44 : undefined,
            fontFamily: "inherit",
            fontSize: compacto ? 16 : 13,
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
      {compacto ? (
        <>
          {campoRota("role1")}
          {campoRota("role2")}
          {campoElo}
          {campoCapitao}
        </>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 11,
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          }}
        >
          {campoRota("role1")}
          {campoRota("role2")}
          {campoCapitao}
          {campoElo}
        </div>
      )}

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
            {eloAtual ? <Elo elo={form.elo} tamanho={24} /> : null}
          </div>
        </div>
      </div>

      {problemas.length > 0 ? (
        <Banner tone="warn" title="Falta ajustar antes de salvar">
          {problemas.join(" · ")}
        </Banner>
      ) : null}

      {/* Correção #7: exclusão em cascata só depois de ver o estrago. O invólucro só existe
          junto com o aviso: vazio, ele contaria como mais uma linha na grade (e mais um vão). */}
      {confirmandoExclusao && salvo && impacto ? (
        <div ref={refExclusao}>
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
        </div>
      ) : null}

      {compacto ? null : (
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
      )}

      <p style={{ margin: 0, fontSize: 11.5, color: C.ink4, lineHeight: 1.6 }}>
        Salvar altera apenas o rascunho. Nada vai para o site antes de publicar.
      </p>
    </div>
  );

  const estadoDoFormulario = sujo ? (
    <Chip tone="warn">Não salvo</Chip>
  ) : (
    <Chip tone="ok">Em dia com o rascunho</Chip>
  );

  /**
   * Rodapé fixo da folha: o "Salvar" sempre à vista do polegar. Excluir e desfazer viram
   * ícones ao lado (com nome para o leitor de tela) para tudo caber numa fileira só.
   * Pedindo para fechar com edição pendente, o rodapé vira a pergunta — é a parte da folha
   * que está sempre na tela, ao contrário de um aviso no topo do formulário rolado.
   */
  const rodapeDaFolha = perguntandoFechar ? (
    <div style={{ width: "100%", display: "grid", gap: 10 }}>
      <p role="alert" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: C.warnSoft }}>
        Fechar agora joga fora o que foi digitado em{" "}
        <strong style={{ color: C.ink }}>{carregado.nick || "jogador novo"}</strong>.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Button tone="danger" onClick={descartarEFechar} style={{ flex: "1 1 auto" }}>
          Descartar
        </Button>
        <Button onClick={() => setConfirmandoFechar(false)} style={{ flex: "1 1 auto" }}>
          Continuar editando
        </Button>
      </div>
    </div>
  ) : (
    <div style={{ width: "100%", display: "flex", gap: 8 }}>
      {editando && !confirmandoExclusao ? (
        <BotaoDeIcone rotulo="Excluir jogador" tone="danger" onClick={pedirExclusao}>
          <Trash2 size={18} aria-hidden />
        </BotaoDeIcone>
      ) : null}
      {sujo ? (
        <BotaoDeIcone rotulo="Desfazer alterações" onClick={() => carregar(base, selectedId)}>
          <Undo2 size={18} aria-hidden />
        </BotaoDeIcone>
      ) : null}
      <Button tone="gold" onClick={salvar} disabled={problemas.length > 0} style={{ flex: 1, minWidth: 0 }}>
        Salvar no rascunho
      </Button>
    </div>
  );

  return (
    <section>
      <SectionHead
        eyebrow="Cadastro"
        title="Jogadores"
        description="Escolha um jogador na lista para editar. Rota e elo são listas fechadas: o site só sabe desenhar esses valores."
        actions={
          compacto ? (
            <Button tone="gold" fullWidth onClick={() => abrirEditor(null)}>
              <Plus size={17} aria-hidden />
              Novo jogador
            </Button>
          ) : (
            <Button tone="gold" onClick={() => pedirTroca(null)}>
              Novo jogador
            </Button>
          )
        }
      />

      {compacto ? (
        // ------------------------------------------------ celular: lista na página
        <>
          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            <Field label="Buscar">
              <Input value={busca} onChange={setBusca} placeholder="nick ou slug" />
            </Field>
            {/* O filtro de time vira fileira de chips: um toque troca, e o número de cada
                time fica à vista — o <select> escondia os dois atrás de outro toque. */}
            <RolagemX rotulo="Filtrar por time">
              <ChipFiltro ativo={teamFilter === "all"} onClick={() => setTeamFilter("all")}>
                Todos <span style={tabular}>{draft.players.length}</span>
              </ChipFiltro>
              {times.map((team) => (
                <ChipFiltro key={team.id} ativo={teamFilter === team.id} onClick={() => setTeamFilter(team.id)}>
                  <TeamMark imageUrl={team.imageUrl} color={teamColor(team.id)} name="" size={18} />
                  {team.name || "(sem nome)"} <span style={tabular}>{elencoPorTime.get(team.id) ?? 0}</span>
                </ChipFiltro>
              ))}
            </RolagemX>
          </div>

          {cabecalhoDaLista}
          {listaVazia ?? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {filtrados.map((player) => {
                const ativo = selectedId === player.id;
                const time = draft.teams.find((team) => team.id === player.teamId);
                const cor = player.teamId ? teamColor(player.teamId) : C.ink4;
                const naoSalvo = sujo && ativo;
                return (
                  <li key={player.id}>
                    <CartaoLinha
                      idAlvo={`jogador-${player.id}`}
                      abreDialogo
                      selecionado={editorAberto && ativo}
                      destaque={player.teamId ? cor : undefined}
                      rotuloAlvo={`Editar ${player.nick || "jogador sem nick"}`}
                      onClick={() => abrirEditor(player.id)}
                      inicio={<Retrato nick={player.nick} imageUrl={player.imageUrl} cor={cor} size={40} />}
                      titulo={player.nick || "(sem nick)"}
                      subtitulo={
                        <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span>{time?.name ?? "sem time"}</span>
                          {player.role1 ? <SeloRota rota={player.role1} /> : null}
                          {player.role2 ? <SeloRota rota={player.role2} /> : null}
                        </span>
                      }
                      fim={
                        player.elo || naoSalvo ? (
                          <>
                            {player.elo ? <Elo elo={player.elo} tamanho={34} /> : null}
                            {naoSalvo ? <Chip tone="warn">não salvo</Chip> : null}
                          </>
                        ) : undefined
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}

          <Folha
            aberta={editorAberto}
            cheia
            titulo={editando ? "Editar jogador" : "Criar jogador"}
            subtitulo={
              <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {editando && carregado.nick ? <span>{carregado.nick}</span> : null}
                {estadoDoFormulario}
              </span>
            }
            icone={ICONE_DA_SECAO.players}
            onFechar={pedirFechar}
            rotuloFechar="Fechar o editor"
            rodape={rodapeDaFolha}
          >
            {avisoPendente}
            {avisoDesatualizado}
            <form
              // Correção #43: Enter dentro de qualquer campo salva, como em qualquer formulário.
              onSubmit={(event) => {
                event.preventDefault();
                salvar();
              }}
            >
              {campos}
              {/* O "Salvar" de verdade mora no rodapé, fora do <form>. Sem um botão de envio
                  aqui dentro, o Enter do teclado (o "Ir" do celular) não enviaria nada:
                  formulário com mais de um campo só envia sozinho se tiver um. */}
              <button
                type="submit"
                tabIndex={-1}
                aria-hidden
                disabled={problemas.length > 0}
                style={soParaLeitor}
              />
            </form>
          </Folha>
        </>
      ) : (
        <>
          {avisoPendente}
          {avisoDesatualizado}

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
              {cabecalhoDaLista}

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

              {listaVazia ?? (
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
                            {/* O emblema no lugar do nome do elo (que segue no alt). */}
                            {player.elo ? <Elo elo={player.elo} tamanho={20} /> : null}
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
                  {estadoDoFormulario}
                </div>

                {campos}
              </form>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
