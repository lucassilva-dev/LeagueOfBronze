"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeftRight,
  Ban,
  CircleCheck,
  CircleDashed,
  ClipboardCheck,
  ClipboardPen,
  CloudDownload,
  Coins,
  Download,
  Gamepad2,
  KeyRound,
  Lock,
  LogOut,
  Radio,
  RotateCcw,
  Save,
  Shield,
  SlidersHorizontal,
  Swords,
  Trash2,
  Trophy,
  Upload,
  UserPlus,
  UserRoundCog,
} from "lucide-react";

import { useCompacto } from "@/components/admin/responsivo";
import {
  Banner,
  Button,
  C,
  Card,
  CartaoLinha,
  Chip,
  Empty,
  Eyebrow,
  Field,
  Folha,
  Input,
  SectionHead,
  display,
  tabular,
} from "@/components/admin/ui";
import { IconeCarta, type Icone } from "@/components/lob/icones";
import { ASSIGNABLE_SCOPES, SCOPES, scopeLabel, type Scope } from "@/lib/security/scopes";

type UsuarioAdmin = {
  id: string;
  username: string;
  displayName: string;
  isMaster: boolean;
  scopes: string[];
  disabled: boolean;
  mustChangePassword: boolean;
  activeSessions: number;
};

/** Confirmação pendente de uma ação destrutiva (uma por vez, sempre nomeando a conta). */
type Confirmacao = {
  id: string;
  tipo: "desativar" | "sessoes" | "remover" | "senha";
};

const ESCOPOS_ATRIBUIVEIS = SCOPES.filter((s) => !s.masterOnly);
const ESCOPOS_DO_MASTER = SCOPES.filter((s) => s.masterOnly);
const GRUPOS = [...new Set(ESCOPOS_ATRIBUIVEIS.map((s) => s.group))];

/**
 * O desenho de cada permissão — o mesmo da seção do painel que ela abre, quando existe uma
 * (times é o brasão, séries as espadas, inscrições a prancheta, draft o rádio). Quem
 * concede reconhece de relance o que está entregando, e o ícone toma o lugar do "○"
 * genérico, que só dizia "desmarcado".
 *
 * `Record<Scope, …>`: um escopo novo no catálogo sem desenho aqui não compila — melhor do
 * que ele aparecer sem ícone e ninguém notar.
 */
const ICONE_DO_ESCOPO: Record<Scope, Icone> = {
  "series:cards": IconeCarta,
  "series:sides": ArrowLeftRight,
  "results:write": ClipboardPen,
  "series:manage": Swords,
  "teams:write": Shield,
  "players:write": Gamepad2,
  "riot:import": CloudDownload,
  "dataset:export": Download,
  "inscricoes:conferir": ClipboardCheck,
  "inscricoes:financeiro": Coins,
  "draft:conduzir": Radio,
  "edicao:configurar": SlidersHorizontal,
  "tournament:lifecycle": Trophy,
  "dataset:import": Upload,
  "users:manage": KeyRound,
};

/** Escopo que veio do banco e o catálogo não conhece (seed antigo) ganha a chave genérica. */
function iconeDoEscopo(chave: string): Icone {
  return (ICONE_DO_ESCOPO as Partial<Record<string, Icone>>)[chave] ?? KeyRound;
}

/**
 * Regra de senha ESPELHADA de validatePasswordStrength (lib/security/password.ts).
 * Antes o painel só cobrava o tamanho, mas o servidor também exige letras + números:
 * a pessoa preenchia tudo, clicava e tomava um erro que a interface tinha prometido que
 * não viria. Se aquela função mudar, esta lista tem que mudar junto.
 */
function avaliarSenha(senha: string) {
  return [
    { ok: senha.length >= 5, texto: "Pelo menos 5 caracteres" },
    { ok: /[a-zA-Z]/.test(senha) && /[0-9]/.test(senha), texto: "Combina letras e números" },
    { ok: senha.length <= 200, texto: "No máximo 200 caracteres" },
  ];
}

/** Mesma regra do schema da rota POST /api/admin/users. */
function usuarioValido(valor: string) {
  return valor.length >= 3 && valor.length <= 60 && /^[a-zA-Z0-9._-]+$/.test(valor);
}

function inicial(u: UsuarioAdmin) {
  const base = u.displayName.trim() || u.username;
  return (base[0] ?? "?").toUpperCase();
}

/** "4 de 11 permissões" — o resumo da linha no celular, onde os chips não cabem todos. */
function resumoDasPermissoes(u: UsuarioAdmin) {
  if (u.isMaster) return "acesso total";
  const tem = u.scopes.filter((s) => (ASSIGNABLE_SCOPES as readonly string[]).includes(s)).length;
  return `${tem} de ${ASSIGNABLE_SCOPES.length} permissões`;
}

/**
 * Permissões que a pessoa tocou no celular e ainda não salvou: escopo → como ela quer que
 * fique. Ausente = intocado, e intocado acompanha sempre o que veio do servidor.
 */
type Toques = Partial<Record<string, boolean>>;

/** Tira do rascunho o que o servidor já tem — chamado quando a lista recarrega. */
function podarToques(toques: Toques, doServidor: readonly string[]): Toques {
  const resto: Toques = {};
  for (const [chave, quer] of Object.entries(toques)) {
    if (quer !== undefined && quer !== doServidor.includes(chave)) resto[chave] = quer;
  }
  return resto;
}

// ---------------------------------------------------------------- peças locais

/** Texto só para leitor de tela — o desenho ao lado diz o mesmo para quem enxerga. */
const SO_PARA_LEITOR: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};

/** Rótulo pequeno em caixa alta que abre um grupo de permissões ou um bloco da folha. */
const ROTULO_DE_GRUPO: CSSProperties = {
  margin: "0 0 7px",
  fontSize: 10,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: C.bronze,
};

/** Cabeçalho de cartão (o BlockTitle tem margem própria para uso entre blocos soltos). */
function CardHead({
  eyebrow,
  title,
  description,
  right,
}: Readonly<{ eyebrow: string; title: string; description?: string; right?: ReactNode }>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap",
        marginBottom: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 style={{ fontFamily: display, fontSize: 19, color: C.ink, margin: 0 }}>{title}</h3>
        {description ? (
          <p style={{ margin: "6px 0 0", fontSize: 12.5, color: C.ink3, maxWidth: "64ch", lineHeight: 1.6 }}>
            {description}
          </p>
        ) : null}
      </div>
      {right}
    </div>
  );
}

/**
 * Chip clicável de permissão. Visualmente igual ao <Chip>, mas é um <button> de verdade:
 * teclado, aria-pressed e o outline global de foco funcionam sem gambiarra.
 *
 * O desenho da permissão vai na frente, sempre; o estado fica no tom (verde = concedida) e
 * na BORDA — tracejada quando falta. A borda é a pista que não depende de cor, papel que
 * antes era do "✓/○"; e por ter a mesma largura nos dois estados, um clique não empurra os
 * chips vizinhos para outro lugar (o próximo clique cairia no chip errado).
 */
function ChipToggle({
  ativo,
  disabled,
  onClick,
  children,
  title,
  icone: Desenho,
}: Readonly<{
  ativo: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
  icone: Icone;
}>) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={ativo}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 2,
        fontFamily: "inherit",
        fontSize: 10.5,
        letterSpacing: ".04em",
        whiteSpace: "nowrap",
        cursor: disabled ? "not-allowed" : "pointer",
        ...(ativo
          ? {
              border: "1px solid rgba(70,214,200,.40)",
              color: C.okSoft,
              background: "rgba(70,214,200,.09)",
            }
          : {
              border: `1px dashed ${C.line2}`,
              color: C.ink4,
              background: "transparent",
            }),
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Desenho size={12} aria-hidden style={{ flexShrink: 0 }} />
      {children}
    </button>
  );
}

/** Regra de senha exatamente igual à do servidor, conferida enquanto se digita. */
function RegrasDaSenha({
  regras,
  compacto,
}: Readonly<{ regras: ReturnType<typeof avaliarSenha>; compacto: boolean }>) {
  return (
    <ul
      style={{
        listStyle: "none",
        display: "flex",
        // No celular uma regra por linha: lado a lado elas quebravam no meio da frase.
        flexDirection: compacto ? "column" : "row",
        flexWrap: "wrap",
        gap: compacto ? 7 : "6px 16px",
        margin: "12px 0 0",
        padding: 0,
      }}
    >
      {regras.map((r) => {
        const Marca = r.ok ? CircleCheck : CircleDashed;
        return (
          <li
            key={r.texto}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: compacto ? 12.5 : 11.5,
              color: r.ok ? C.okSoft : C.ink4,
            }}
          >
            <Marca size={compacto ? 15 : 13} aria-hidden style={{ flexShrink: 0 }} />
            <span style={SO_PARA_LEITOR}>{r.ok ? "Cumprida: " : "Ainda falta: "}</span>
            {r.texto}
          </li>
        );
      })}
    </ul>
  );
}

/** Avatar de inicial: identifica a linha de relance numa lista de contas parecidas. */
function AvatarDaConta({ u, tamanho = 40 }: Readonly<{ u: UsuarioAdmin; tamanho?: number }>) {
  return (
    <div
      aria-hidden
      style={{
        width: tamanho,
        height: tamanho,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        borderRadius: 3,
        fontFamily: display,
        fontSize: Math.round(tamanho * 0.45),
        color: u.isMaster ? "#160f06" : C.bronzeLit,
        background: u.isMaster ? `linear-gradient(180deg, ${C.bronzeHi}, ${C.bronzeDeep})` : "rgba(201,138,75,.10)",
        border: `1px solid ${u.isMaster ? "transparent" : C.line2}`,
      }}
    >
      {inicial(u)}
    </div>
  );
}

/** Situação da conta em chips — o que a pessoa precisa saber antes de mexer nela. */
function ChipsDaConta({ u, style }: Readonly<{ u: UsuarioAdmin; style?: CSSProperties }>) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, ...style }}>
      {u.isMaster ? <Chip tone="gold">MASTER · acesso total</Chip> : null}
      {u.disabled ? <Chip tone="warn">Conta desativada · sem acesso</Chip> : null}
      {u.mustChangePassword ? <Chip tone="warn">Troca de senha pendente</Chip> : null}
      {u.activeSessions > 0 ? (
        <Chip tone="ok">
          <span style={tabular}>{u.activeSessions}</span>
          {u.activeSessions === 1 ? " sessão aberta" : " sessões abertas"}
        </Chip>
      ) : (
        <Chip tone="off">Sem sessão aberta</Chip>
      )}
    </div>
  );
}

/**
 * Os três botões de acesso de uma conta comum. No monitor, pequenos e lado a lado no
 * cartão; no celular, um por linha e com ícone — são ações de risco, e o polegar não pode
 * cair no vizinho.
 */
function AcoesDaConta({
  u,
  ocupado,
  compacto,
  onConfirmar,
  onReativar,
}: Readonly<{
  u: UsuarioAdmin;
  ocupado: boolean;
  compacto: boolean;
  onConfirmar: (tipo: Confirmacao["tipo"]) => void;
  onReativar: () => void;
}>) {
  const rotulo = (Desenho: Icone, texto: string) =>
    compacto ? (
      <>
        <Desenho size={16} aria-hidden />
        {texto}
      </>
    ) : (
      texto
    );

  return (
    <div style={compacto ? { display: "grid", gap: 8 } : { display: "flex", gap: 7, flexWrap: "wrap" }}>
      <Button
        tone="ghost"
        small={!compacto}
        fullWidth={compacto}
        disabled={ocupado}
        onClick={() => onConfirmar("sessoes")}
      >
        {rotulo(LogOut, "Encerrar sessões")}
      </Button>
      <Button
        tone="ghost"
        small={!compacto}
        fullWidth={compacto}
        disabled={ocupado}
        onClick={() => onConfirmar("senha")}
      >
        {rotulo(KeyRound, "Senha provisória")}
      </Button>
      {u.disabled ? (
        <Button tone="ghost" small={!compacto} fullWidth={compacto} disabled={ocupado} onClick={onReativar}>
          {rotulo(RotateCcw, "Reativar")}
        </Button>
      ) : (
        <Button
          tone="danger"
          small={!compacto}
          fullWidth={compacto}
          disabled={ocupado}
          onClick={() => onConfirmar("desativar")}
        >
          {rotulo(Ban, "Desativar")}
        </Button>
      )}
      <Button
        tone="danger"
        small={!compacto}
        fullWidth={compacto}
        disabled={ocupado}
        onClick={() => onConfirmar("remover")}
      >
        {rotulo(Trash2, "Remover")}
      </Button>
    </div>
  );
}

/** Confirmações nomeadas: cada ação de risco diz o nome da conta e o preço antes de agir. */
function ConfirmacoesDaConta({
  u,
  confirmando,
  ocupado,
  compacto,
  textoRemocao,
  onTextoRemocao,
  senhaGerada,
  onEncerrarSessoes,
  onGerarSenha,
  onDesativar,
  onRemover,
  onCancelar,
  onEsquecerSenha,
}: Readonly<{
  u: UsuarioAdmin;
  confirmando: Confirmacao["tipo"] | null;
  ocupado: boolean;
  compacto: boolean;
  textoRemocao: string;
  onTextoRemocao: (v: string) => void;
  /** A provisória que acabou de ser gerada para ESTA conta — nulo nas outras. */
  senhaGerada: string | null;
  onEncerrarSessoes: () => void;
  onGerarSenha: () => void;
  onDesativar: () => void;
  onRemover: () => void;
  onCancelar: () => void;
  onEsquecerSenha: () => void;
}>) {
  const caixa = useRef<HTMLDivElement>(null);
  const [copiada, setCopiada] = useState<"ok" | "falhou" | null>(null);

  // No celular os botões moram no fim da folha: a confirmação nasce abaixo do botão tocado
  // e podia ficar fora da tela — parecia que o toque não tinha feito nada.
  useEffect(() => {
    if (compacto && (confirmando || senhaGerada)) caixa.current?.scrollIntoView?.({ block: "nearest" });
  }, [compacto, confirmando, senhaGerada]);

  /*
   * A senha aparece UMA vez: mora só no estado do painel e some ao fechar este aviso, a
   * folha da conta ou a página. O servidor não a guarda — perdeu, gera outra.
   */
  if (senhaGerada) {
    const copiar = async () => {
      try {
        await navigator.clipboard.writeText(senhaGerada);
        setCopiada("ok");
      } catch {
        setCopiada("falhou");
      }
    };
    return (
      <div ref={caixa} style={{ marginTop: 14 }} role="status">
        <Banner
          tone="ok"
          title={`Senha provisória de ${u.displayName}`}
          actions={
            <Button tone="ghost" small onClick={onEsquecerSenha}>
              Já repassei
            </Button>
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "2px 0 10px" }}>
            <code
              style={{
                padding: "6px 10px",
                borderRadius: 3,
                border: `1px solid ${C.line2}`,
                background: "rgba(0,0,0,.35)",
                color: C.bronzeHi,
                fontSize: 15,
                letterSpacing: ".06em",
                userSelect: "all",
                overflowWrap: "anywhere",
              }}
            >
              {senhaGerada}
            </code>
            <Button small onClick={() => void copiar()}>
              Copiar
            </Button>
            {copiada === "ok" ? (
              <span style={{ fontSize: 12, color: C.okSoft }}>Copiada.</span>
            ) : copiada === "falhou" ? (
              <span style={{ fontSize: 12, color: C.dangerSoft }}>
                O navegador não deixou copiar — selecione e copie à mão.
              </span>
            ) : null}
          </div>
          Mande no PRIVADO de <strong>@{u.username}</strong>. Ele entra com o usuário <strong>{u.username}</strong>{" "}
          e esta senha, e o painel obriga a trocar por uma dele na hora. Ela aparece só agora: o servidor não a
          guarda.
        </Banner>
      </div>
    );
  }

  if (confirmando === "senha") {
    return (
      <div ref={caixa} style={{ marginTop: 14 }}>
        <Banner
          tone="danger"
          title={`Gerar uma senha provisória para ${u.displayName}?`}
          actions={
            <>
              <Button tone="gold" small disabled={ocupado} onClick={onGerarSenha}>
                {ocupado ? "Gerando..." : "Gerar senha"}
              </Button>
              <Button tone="ghost" small disabled={ocupado} onClick={onCancelar}>
                Cancelar
              </Button>
            </>
          }
        >
          Para quem esqueceu a senha. A senha atual de <strong>@{u.username}</strong> deixa de valer e as sessões
          abertas caem na hora. Você recebe a provisória para repassar, e ele troca no primeiro acesso.
        </Banner>
      </div>
    );
  }

  if (confirmando === "sessoes") {
    return (
      <div ref={caixa} style={{ marginTop: 14 }}>
        <Banner
          tone="danger"
          title={`Encerrar as sessões de ${u.displayName}?`}
          actions={
            <>
              <Button tone="danger" small disabled={ocupado} onClick={onEncerrarSessoes}>
                {ocupado ? "Encerrando..." : "Encerrar agora"}
              </Button>
              <Button tone="ghost" small disabled={ocupado} onClick={onCancelar}>
                Cancelar
              </Button>
            </>
          }
        >
          As sessões abertas de <strong>@{u.username}</strong> caem na hora — inclusive no celular.
          A conta continua ativa e com as mesmas permissões; ela só precisa entrar de novo.
        </Banner>
      </div>
    );
  }

  if (confirmando === "desativar") {
    return (
      <div ref={caixa} style={{ marginTop: 14 }}>
        <Banner
          tone="danger"
          title={`Desativar a conta de ${u.displayName}?`}
          actions={
            <>
              <Button tone="danger" small disabled={ocupado} onClick={onDesativar}>
                {ocupado ? "Desativando..." : "Desativar"}
              </Button>
              <Button tone="ghost" small disabled={ocupado} onClick={onCancelar}>
                Cancelar
              </Button>
            </>
          }
        >
          <strong>@{u.username}</strong> perde o acesso imediatamente: as sessões abertas caem na hora
          e ela não consegue mais entrar. As permissões ficam guardadas e dá para reativar depois.
        </Banner>
      </div>
    );
  }

  if (confirmando === "remover") {
    return (
      <div ref={caixa} style={{ marginTop: 14 }}>
        <Banner
          tone="danger"
          title={`Remover ${u.displayName} definitivamente?`}
          actions={
            <>
              <Button
                tone="danger"
                small
                disabled={ocupado || textoRemocao.trim() !== u.username}
                onClick={onRemover}
              >
                {ocupado ? "Removendo..." : "Remover para sempre"}
              </Button>
              <Button tone="ghost" small disabled={ocupado} onClick={onCancelar}>
                Cancelar
              </Button>
            </>
          }
        >
          A conta é apagada e <strong>não tem volta</strong>. As sessões abertas caem na hora e o
          histórico de quem fez o quê deixa de apontar para uma conta existente. Se a ideia é só tirar
          o acesso por enquanto, use <em>Desativar</em>.
          <div style={{ maxWidth: 280, marginTop: 12 }}>
            <Field label={`Digite ${u.username} para confirmar`}>
              <Input value={textoRemocao} onChange={onTextoRemocao} placeholder={u.username} autoComplete="off" />
            </Field>
          </div>
        </Banner>
      </div>
    );
  }

  return null;
}

/**
 * Uma permissão no celular. A linha inteira é o alvo do dedo (o <label> envolve a caixa),
 * com o desenho da permissão, o nome e uma caixa de marcação DE VERDADE na ponta — o
 * leitor de tela anuncia "marcada/desmarcada" sem tradução, e o chip de 10px do monitor
 * vira uma linha de 52px.
 *
 * `alterada` marca o que ainda não foi salvo; `bloqueada` é escopo exclusivo do master,
 * mostrado para deixar o teto claro, mas sem caixa que se possa marcar.
 */
function LinhaEscopo({
  icone: Desenho,
  rotulo,
  marcada,
  onAlternar,
  disabled,
  alterada,
  bloqueada,
}: Readonly<{
  icone: Icone;
  rotulo: string;
  marcada: boolean;
  onAlternar?: () => void;
  disabled?: boolean;
  alterada?: boolean;
  bloqueada?: boolean;
}>) {
  const ativa = marcada && !bloqueada;
  const travada = Boolean(disabled || bloqueada);

  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 52,
        padding: "8px 12px",
        borderRadius: 4,
        border: `1px solid ${ativa ? "rgba(70,214,200,.40)" : C.line}`,
        background: ativa ? "rgba(70,214,200,.07)" : "rgba(0,0,0,.22)",
        cursor: travada ? "not-allowed" : "pointer",
        opacity: bloqueada ? 0.6 : disabled ? 0.55 : 1,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 34,
          height: 34,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          borderRadius: 4,
          border: `1px solid ${ativa ? "rgba(70,214,200,.35)" : C.line2}`,
          background: ativa ? "rgba(70,214,200,.10)" : "rgba(201,138,75,.07)",
          color: ativa ? C.okSoft : bloqueada ? C.ink4 : C.bronzeLit,
        }}
      >
        <Desenho size={17} aria-hidden />
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.35, color: ativa ? C.ink : C.ink2 }}>
        {rotulo}
        {bloqueada ? (
          <span style={{ display: "block", marginTop: 2, fontSize: 11, color: C.ink4 }}>Só a conta master</span>
        ) : null}
        {alterada ? (
          <span style={{ display: "block", marginTop: 4 }}>
            <Chip tone="warn">{marcada ? "concedida · não salva" : "tirada · não salva"}</Chip>
          </span>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={ativa}
        disabled={travada}
        onChange={() => onAlternar?.()}
        style={{ width: 22, height: 22, flexShrink: 0, accentColor: C.ok, cursor: "inherit" }}
      />
    </label>
  );
}

/**
 * As permissões no celular: em grupos (fieldset + legend, o agrupamento que o leitor de
 * tela entende), uma linha de toque por permissão, e no fim as exclusivas do master,
 * travadas — escondê-las fazia parecer que o painel tinha esquecido delas.
 */
function EscoposNoCelular({
  marcado,
  alterado,
  onAlternar,
  disabled,
}: Readonly<{
  marcado: (chave: string) => boolean;
  alterado?: (chave: string) => boolean;
  onAlternar: (chave: string) => void;
  disabled?: boolean;
}>) {
  const fieldset: CSSProperties = { margin: 0, padding: 0, border: 0, minWidth: 0 };
  const lista: CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {GRUPOS.map((grupo) => (
        <fieldset key={grupo} style={fieldset}>
          <legend style={{ ...ROTULO_DE_GRUPO, padding: 0 }}>{grupo}</legend>
          <ul style={lista}>
            {ESCOPOS_ATRIBUIVEIS.filter((s) => s.group === grupo).map((s) => (
              <li key={s.key}>
                <LinhaEscopo
                  icone={iconeDoEscopo(s.key)}
                  rotulo={s.label}
                  marcada={marcado(s.key)}
                  alterada={alterado?.(s.key)}
                  disabled={disabled}
                  onAlternar={() => onAlternar(s.key)}
                />
              </li>
            ))}
          </ul>
        </fieldset>
      ))}

      <fieldset style={fieldset}>
        <legend style={{ ...ROTULO_DE_GRUPO, padding: 0, color: C.ink4 }}>
          Exclusivo do master · não pode ser concedido
        </legend>
        <ul style={lista}>
          {ESCOPOS_DO_MASTER.map((s) => (
            <li key={s.key}>
              <LinhaEscopo icone={Lock} rotulo={s.label} marcada={false} bloqueada />
            </li>
          ))}
        </ul>
      </fieldset>
    </div>
  );
}

/** Os três campos da conta nova. No celular, uma coluna: o formulário mora numa folha. */
function CamposNovaConta({
  usuario,
  onUsuario,
  nome,
  onNome,
  senha,
  onSenha,
  compacto,
}: Readonly<{
  usuario: string;
  onUsuario: (v: string) => void;
  nome: string;
  onNome: (v: string) => void;
  senha: string;
  onSenha: (v: string) => void;
  compacto: boolean;
}>) {
  return (
    <div
      style={{
        display: "grid",
        gap: compacto ? 14 : 12,
        gridTemplateColumns: compacto ? "minmax(0, 1fr)" : "repeat(auto-fit, minmax(190px, 1fr))",
      }}
    >
      <Field
        label="Usuário"
        hint={
          usuario.trim() && !usuarioValido(usuario.trim())
            ? "3 a 60 caracteres: letras, números, ponto, hífen ou sublinhado."
            : "É o que ela digita para entrar."
        }
      >
        <Input value={usuario} onChange={onUsuario} placeholder="ex: joao" autoComplete="off" />
      </Field>
      <Field label="Nome exibido" hint="Se ficar vazio, repete o usuário.">
        <Input value={nome} onChange={onNome} placeholder="ex: João" autoComplete="off" />
      </Field>
      <Field label="Senha inicial">
        <Input
          type="password"
          value={senha}
          onChange={onSenha}
          placeholder="senha provisória"
          autoComplete="new-password"
        />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------- editor de bolso

type PropsEditor = Readonly<{
  u: UsuarioAdmin;
  ocupado: boolean;
  /** Botões de acesso e confirmações: os MESMOS do cartão do monitor, vindos do painel. */
  acoes: ReactNode;
  confirmacoes: ReactNode;
  onSalvarEscopos: (escopos: string[]) => Promise<boolean>;
  onFechar: () => void;
}>;

/**
 * A conta aberta no celular, numa folha de tela cheia.
 *
 * Aqui as permissões viram RASCUNHO com "Salvar" no rodapé, ao contrário do monitor, onde
 * cada clique grava na hora. O motivo é o dedo: numa lista de onze linhas tocáveis, rolar a
 * tela com o polegar esbarra numa caixa — e um esbarrão gravando na hora mudaria o que uma
 * conta real pode fazer sem ninguém perceber. Cada toque também esperava a ida e volta ao
 * servidor antes do próximo, o que no 4G virava uma fila.
 *
 * O rascunho guarda só o que foi TOCADO (mesma ideia da gaveta do inscrito): o que ninguém
 * tocou acompanha o servidor a cada recarga, e sair com mudança pendente pergunta antes.
 */
function EditorDaConta({ u, ocupado, acoes, confirmacoes, onSalvarEscopos, onFechar }: PropsEditor) {
  const [toques, setToques] = useState<Toques>({});
  const [pedindoSaida, setPedindoSaida] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const idPermissoes = useId();
  const idAcesso = useId();

  // Lista recarregada (depois de salvar, ou de uma ação nesta conta): sai do rascunho o que
  // o servidor já tem. Ajuste durante a render, e não num efeito — mesmo padrão da gaveta
  // do inscrito, que `react-hooks/set-state-in-effect` exige.
  const [visto, setVisto] = useState(u);
  if (visto !== u) {
    setVisto(u);
    setToques((atual) => podarToques(atual, u.scopes));
  }

  const noServidor = (chave: string) => u.scopes.includes(chave);
  const marcado = (chave: string) => toques[chave] ?? noServidor(chave);
  const mudadas = ASSIGNABLE_SCOPES.filter((chave) => toques[chave] !== undefined && toques[chave] !== noServidor(chave));
  const sujo = mudadas.length > 0;

  const alternar = (chave: string) => {
    const quer = !marcado(chave);
    setPedindoSaida(false);
    // Voltou ao valor do servidor: o escopo SAI do rascunho e torna a acompanhar o banco.
    setToques((atual) => {
      const novo = { ...atual };
      if (quer === noServidor(chave)) delete novo[chave];
      else novo[chave] = quer;
      return novo;
    });
  };

  const salvar = async () => {
    if (!sujo || ocupado || salvando) return;
    // Só o que foi tocado muda; as outras permissões vão como vieram na última leitura —
    // a mesma conta que o clique do monitor faz.
    const tirar = new Set<string>(mudadas.filter((chave) => !toques[chave]));
    const por = mudadas.filter((chave) => toques[chave]);
    const escopos = [...u.scopes.filter((chave) => !tirar.has(chave)), ...por];
    setSalvando(true);
    try {
      const ok = await onSalvarEscopos(escopos);
      // Falhou: o rascunho fica, para a pessoa não perder o que marcou.
      if (ok) setToques({});
    } finally {
      setSalvando(false);
    }
  };

  /*
   * Esc, toque no fundo e o X passam por aqui. Com rascunho, pergunta antes (a folha não
   * descarta nada sozinha); com a pergunta já na tela, um novo Esc desiste dela e volta à
   * edição — o mesmo que a gaveta do inscrito faz. Salvando, espera a resposta.
   */
  const tentarFechar = () => {
    if (pedindoSaida) {
      setPedindoSaida(false);
      return;
    }
    if (!sujo) {
      onFechar();
      return;
    }
    if (ocupado || salvando) return;
    setPedindoSaida(true);
  };

  const quantas = mudadas.length === 1 ? "a mudança" : `as ${mudadas.length} mudanças`;

  const rodape = u.isMaster ? undefined : pedindoSaida ? (
    <div role="alert" style={{ width: "100%" }}>
      <p style={{ margin: "0 0 10px", fontSize: 13.5, fontWeight: 700, color: C.ink }}>
        Sair sem salvar {quantas} nas permissões?
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button tone="danger" onClick={onFechar} style={{ flex: "1 1 140px" }}>
          Descartar e fechar
        </Button>
        <Button tone="ghost" onClick={() => setPedindoSaida(false)} style={{ flex: "1 1 140px" }}>
          Continuar editando
        </Button>
      </div>
    </div>
  ) : (
    <>
      <Button
        tone="gold"
        disabled={!sujo || ocupado || salvando}
        onClick={() => void salvar()}
        style={{ flex: "1 1 180px" }}
      >
        <Save size={16} aria-hidden />
        {salvando ? "Salvando..." : sujo ? `Salvar permissões (${mudadas.length})` : "Salvar permissões"}
      </Button>
      {sujo ? (
        <Button tone="ghost" disabled={ocupado || salvando} onClick={() => setToques({})} style={{ flex: "0 1 auto" }}>
          Desfazer
        </Button>
      ) : null}
    </>
  );

  return (
    <Folha
      aberta
      cheia
      titulo={u.displayName}
      subtitulo={`@${u.username} · ${resumoDasPermissoes(u)}`}
      icone={UserRoundCog}
      rotuloFechar="Fechar a conta"
      onFechar={tentarFechar}
      rodape={rodape}
    >
      <div style={{ display: "grid", gap: 22 }}>
        <ChipsDaConta u={u} />

        <section aria-labelledby={idPermissoes}>
          <h3 id={idPermissoes} style={ROTULO_DE_GRUPO}>
            Permissões
          </h3>
          {u.isMaster ? (
            <p style={{ margin: 0, fontSize: 13, color: C.ink3, lineHeight: 1.6 }}>
              O master faz tudo, sempre. A conta não pode ser desativada, removida nem ter permissões
              alteradas por aqui — só direto no banco, de propósito.
            </p>
          ) : (
            <>
              <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.ink3, lineHeight: 1.55 }}>
                Toque para conceder ou tirar. Nada muda até você salvar no rodapé.
              </p>
              <EscoposNoCelular
                marcado={marcado}
                alterado={(chave) => mudadas.includes(chave as Scope)}
                onAlternar={alternar}
                disabled={ocupado || salvando}
              />
            </>
          )}
        </section>

        {u.isMaster ? null : (
          <section aria-labelledby={idAcesso}>
            <h3 id={idAcesso} style={ROTULO_DE_GRUPO}>
              Acesso da conta
            </h3>
            <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.ink3, lineHeight: 1.55 }}>
              Estas ações valem na hora, cada uma depois de uma confirmação com o nome da conta.
            </p>
            {acoes}
            {confirmacoes}
          </section>
        )}
      </div>
    </Folha>
  );
}

// ---------------------------------------------------------------- painel

export function AdminUsersPanel({ onAlert }: Readonly<{ onAlert: (kind: "ok" | "erro", text: string) => void }>) {
  const compacto = useCompacto();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const [novoUsuario, setNovoUsuario] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novosEscopos, setNovosEscopos] = useState<string[]>([]);
  // Trava do envio: sem isso dava para clicar duas vezes e criar a mesma conta duplicada.
  const [criando, setCriando] = useState(false);

  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  // Para remover é preciso digitar o @usuário: é a única ação sem volta do painel.
  const [textoRemocao, setTextoRemocao] = useState("");
  /** A provisória recém-gerada, mostrada uma vez para a conta `id`. Nunca vai para o navegador além disto. */
  const [senhaGerada, setSenhaGerada] = useState<Readonly<{ id: string; senha: string }> | null>(null);

  // Celular: a conta aberta na folha e a folha de conta nova. O formulário continua aqui no
  // painel, então fechar a folha não perde o que foi digitado.
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [novaAberta, setNovaAberta] = useState(false);

  /*
   * O aviso vai por REF, e `carregar` não depende dele.
   *
   * Com `onAlert` nas dependências, uma listagem que FALHA virava laço infinito: o
   * catch chama `onAlert`, que muda o estado do pai; o pai re-renderiza e cria um
   * `onAlert` novo; `carregar` ganha identidade nova; o efeito abaixo dispara de novo;
   * a busca falha outra vez. O navegador passava a martelar /api/admin/users dezenas de
   * vezes por segundo enquanto a faixa de erro piscava — e o gatilho é justamente o
   * cenário que já aconteceu neste projeto (Supabase pausado devolvendo 500) ou um 403
   * de quem não é master.
   *
   * Mesmo padrão de e4/painel-edicao.tsx.
   */
  const refAlerta = useRef(onAlert);
  useEffect(() => {
    refAlerta.current = onAlert;
  });

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/admin/users", { credentials: "same-origin", cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Falha ao listar usuários.");
      setUsuarios(d.users ?? []);
    } catch (e) {
      refAlerta.current("erro", e instanceof Error ? e.message : "Falha ao listar usuários.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const regras = avaliarSenha(novaSenha);
  const senhaOk = novaSenha.length > 0 && regras.every((r) => r.ok);
  const podeCriar = usuarioValido(novoUsuario.trim()) && senhaOk && !criando;

  /** Devolve se deu certo — a folha do celular só fecha quando a conta existe de fato. */
  const criar = async (): Promise<boolean> => {
    if (criando) return false; // guarda extra: Enter repetido não passa pelo disabled do botão
    setCriando(true);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: novoUsuario.trim(),
          displayName: novoNome.trim() || novoUsuario.trim(),
          password: novaSenha,
          scopes: novosEscopos,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Falha ao criar usuário.");
      onAlert("ok", "Usuário criado. Entregue a senha por um canal seguro — ele terá que trocá-la no 1º acesso.");
      setNovoUsuario("");
      setNovoNome("");
      setNovaSenha("");
      setNovosEscopos([]);
      await carregar();
      return true;
    } catch (e) {
      onAlert("erro", e instanceof Error ? e.message : "Falha ao criar usuário.");
      return false;
    } finally {
      setCriando(false);
    }
  };

  /** Devolve se deu certo — o rascunho de permissões do celular só some quando gravou. */
  const atualizar = async (id: string, patch: Record<string, unknown>, aviso: string): Promise<boolean> => {
    setSalvandoId(id);
    try {
      const r = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Falha ao atualizar.");
      onAlert("ok", aviso);
      setConfirmacao(null);
      await carregar();
      return true;
    } catch (e) {
      onAlert("erro", e instanceof Error ? e.message : "Falha ao atualizar.");
      return false;
    } finally {
      setSalvandoId(null);
    }
  };

  /** «Esqueci a senha» de admin: o servidor sorteia a provisória e a devolve só nesta resposta. */
  const gerarSenha = async (u: UsuarioAdmin) => {
    setSalvandoId(u.id);
    try {
      const r = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gerarSenhaProvisoria: true }),
        cache: "no-store",
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string; senhaProvisoria?: unknown };
      if (!r.ok || typeof d.senhaProvisoria !== "string") {
        onAlert("erro", d.error ?? "Não foi possível gerar a senha provisória.");
        return;
      }
      setSenhaGerada({ id: u.id, senha: d.senhaProvisoria });
      setConfirmacao(null);
      await carregar();
    } catch {
      // A resposta pode ter se perdido DEPOIS de a senha mudar: gerar de novo resolve.
      onAlert("erro", "Não foi possível falar com o servidor. Se a senha chegou a mudar, gere de novo: vale sempre a última.");
    } finally {
      setSalvandoId(null);
    }
  };

  const remover = async (u: UsuarioAdmin) => {
    setSalvandoId(u.id);
    try {
      const r = await fetch(`/api/admin/users/${u.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Falha ao remover usuário.");
      onAlert("ok", `Conta de ${u.displayName} removida.`);
      setConfirmacao(null);
      setTextoRemocao("");
      await carregar();
    } catch (e) {
      onAlert("erro", e instanceof Error ? e.message : "Falha ao remover usuário.");
    } finally {
      setSalvandoId(null);
    }
  };

  const alternarEscopo = (u: UsuarioAdmin, escopo: string) => {
    const novos = u.scopes.includes(escopo)
      ? u.scopes.filter((s) => s !== escopo)
      : [...u.scopes, escopo];
    void atualizar(u.id, { scopes: novos }, `Permissões de ${u.displayName} atualizadas.`);
  };

  const alternarEscopoNovo = (chave: string) =>
    setNovosEscopos((prev) => (prev.includes(chave) ? prev.filter((x) => x !== chave) : [...prev, chave]));

  const abrirConfirmacao = (id: string, tipo: Confirmacao["tipo"]) => {
    setTextoRemocao("");
    setSenhaGerada(null);
    setConfirmacao((atual) => (atual?.id === id && atual.tipo === tipo ? null : { id, tipo }));
  };

  const cancelarConfirmacao = () => {
    setConfirmacao(null);
    setTextoRemocao("");
  };

  /** Fechar a folha da conta leva junto a confirmação pendente: ela era daquela tela. */
  const fecharConta = () => {
    setAbertaId(null);
    setSenhaGerada(null);
    cancelarConfirmacao();
  };

  /** Botões e confirmações de UMA conta — os mesmos no cartão do monitor e na folha. */
  const acoesDe = (u: UsuarioAdmin) => (
    <AcoesDaConta
      u={u}
      ocupado={salvandoId === u.id}
      compacto={compacto}
      onConfirmar={(tipo) => abrirConfirmacao(u.id, tipo)}
      onReativar={() => void atualizar(u.id, { disabled: false }, `${u.displayName} reativado.`)}
    />
  );

  const confirmacoesDe = (u: UsuarioAdmin) => (
    <ConfirmacoesDaConta
      u={u}
      confirmando={confirmacao?.id === u.id ? confirmacao.tipo : null}
      ocupado={salvandoId === u.id}
      compacto={compacto}
      textoRemocao={textoRemocao}
      onTextoRemocao={setTextoRemocao}
      senhaGerada={senhaGerada?.id === u.id ? senhaGerada.senha : null}
      onEncerrarSessoes={() =>
        void atualizar(u.id, { revokeSessions: true }, `Sessões de ${u.displayName} encerradas.`)
      }
      onGerarSenha={() => void gerarSenha(u)}
      onEsquecerSenha={() => setSenhaGerada(null)}
      onDesativar={() => void atualizar(u.id, { disabled: true }, `${u.displayName} desativado.`)}
      onRemover={() => void remover(u)}
      onCancelar={cancelarConfirmacao}
    />
  );

  // A conta some da lista (removida) → a folha fecha sozinha, sem apontar para o vazio.
  const contaAberta = compacto && abertaId ? (usuarios.find((u) => u.id === abertaId) ?? null) : null;

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <SectionHead
        eyebrow="Acesso"
        title="Contas e permissões"
        description="Cada conta enxerga só o que está marcado em verde. O que aparece apagado é o que ela não pode fazer."
        actions={
          <>
            {/* No celular o formulário de conta nova mora numa folha: aberto na página, os
                três campos e as onze permissões empurravam a lista de contas para longe. */}
            {compacto ? (
              <Button tone="gold" small onClick={() => setNovaAberta(true)} style={{ flex: "1 1 auto" }}>
                <UserPlus size={16} aria-hidden />
                Nova conta
              </Button>
            ) : null}
            <Button
              tone="ghost"
              small
              onClick={() => void carregar()}
              disabled={carregando}
              style={compacto ? { flex: "1 1 auto" } : undefined}
            >
              {carregando ? "Carregando..." : "Atualizar lista"}
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------------------ nova conta */}
      {compacto ? null : (
        <Card padding="18px 18px 20px">
          <CardHead
            eyebrow="Cadastro"
            title="Nova conta"
            description="Marque só o que a pessoa precisa. Ela é obrigada a trocar a senha no primeiro acesso."
          />

          <CamposNovaConta
            usuario={novoUsuario}
            onUsuario={setNovoUsuario}
            nome={novoNome}
            onNome={setNovoNome}
            senha={novaSenha}
            onSenha={setNovaSenha}
            compacto={false}
          />

          <RegrasDaSenha regras={regras} compacto={false} />

          <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            {GRUPOS.map((grupo) => (
              <div key={grupo}>
                <p style={ROTULO_DE_GRUPO}>{grupo}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {ESCOPOS_ATRIBUIVEIS.filter((s) => s.group === grupo).map((s) => (
                    <ChipToggle
                      key={s.key}
                      icone={iconeDoEscopo(s.key)}
                      ativo={novosEscopos.includes(s.key)}
                      onClick={() => alternarEscopoNovo(s.key)}
                    >
                      {s.label}
                    </ChipToggle>
                  ))}
                </div>
              </div>
            ))}

            {/* Escopos masterOnly: apareciam escondidos, então dava para marcar no formulário e o
                servidor descartava calado. Agora ficam visíveis e explicitamente indisponíveis. */}
            <div>
              <p style={{ ...ROTULO_DE_GRUPO, color: C.ink4 }}>Exclusivo do master · não pode ser concedido</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {ESCOPOS_DO_MASTER.map((s) => (
                  <Chip key={s.key} tone="off" title="Só a conta master exerce esta permissão.">
                    <Lock size={11} aria-hidden style={{ flexShrink: 0 }} />
                    {s.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <Button tone="gold" onClick={() => void criar()} disabled={!podeCriar}>
              {criando ? "Criando..." : "Criar conta"}
            </Button>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------------ lista */}
      <div>
        <Eyebrow>Contas</Eyebrow>

        {usuarios.length === 0 && !carregando ? (
          <Empty title="Nenhuma conta cadastrada">
            {compacto
              ? "Crie a primeira em «Nova conta», acima. O master continua existindo mesmo sem nenhuma conta comum."
              : "Crie a primeira conta acima. O master continua existindo mesmo sem nenhuma conta comum."}
          </Empty>
        ) : null}

        {compacto ? (
          // No celular cada conta é um cartão que abre a folha de edição: o cartão do monitor,
          // com três botões e onze chips de permissão, ocupava a tela inteira por pessoa.
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {usuarios.map((u) => (
              <li key={u.id}>
                <CartaoLinha
                  idAlvo={`conta-${u.id}`}
                  abreDialogo
                  selecionado={u.id === abertaId}
                  rotuloAlvo={`Abrir a conta de ${u.displayName} (@${u.username})`}
                  onClick={() => setAbertaId(u.id)}
                  destaque={u.disabled ? C.warn : u.isMaster ? C.bronze : undefined}
                  inicio={<AvatarDaConta u={u} />}
                  titulo={u.displayName}
                  subtitulo={
                    <>
                      @{u.username} · <span style={tabular}>{resumoDasPermissoes(u)}</span>
                    </>
                  }
                >
                  <ChipsDaConta u={u} />
                </CartaoLinha>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {usuarios.map((u) => {
              const ocupado = salvandoId === u.id;

              return (
                <Card key={u.id} padding="16px 16px 18px" style={{ opacity: u.disabled ? 0.62 : 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 13, flexWrap: "wrap" }}>
                    <AvatarDaConta u={u} />

                    <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: display, fontSize: 17, color: C.ink }}>{u.displayName}</span>
                        <span style={{ fontSize: 12, color: C.ink3 }}>@{u.username}</span>
                      </div>

                      <ChipsDaConta u={u} style={{ marginTop: 7 }} />
                    </div>

                    {!u.isMaster ? acoesDe(u) : null}
                  </div>

                  {/* ---------------------------------------- confirmações nomeadas */}
                  {confirmacoesDe(u)}

                  {/* ---------------------------------------- permissões */}
                  <div style={{ marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 13 }}>
                    {u.isMaster ? (
                      <p style={{ margin: 0, fontSize: 12.5, color: C.ink3, lineHeight: 1.6 }}>
                        O master faz tudo, sempre. A conta não pode ser desativada, removida nem ter permissões
                        alteradas por aqui — só direto no banco, de propósito.
                      </p>
                    ) : (
                      <>
                        <p style={{ ...ROTULO_DE_GRUPO, margin: "0 0 8px", color: C.ink4 }}>
                          Permissões · clique para conceder ou tirar
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          {ASSIGNABLE_SCOPES.map((escopo) => {
                            const ativo = u.scopes.includes(escopo);
                            return (
                              <ChipToggle
                                key={escopo}
                                icone={iconeDoEscopo(escopo)}
                                ativo={ativo}
                                disabled={ocupado}
                                onClick={() => alternarEscopo(u, escopo)}
                                title={ativo ? "Tirar esta permissão" : "Conceder esta permissão"}
                              >
                                {scopeLabel(escopo)}
                              </ChipToggle>
                            );
                          })}
                          {/* Deixa claro o teto: estes escopos nunca valem para uma conta comum. */}
                          {ESCOPOS_DO_MASTER.map((s) => (
                            <Chip
                              key={s.key}
                              tone="off"
                              title="Exclusivo do master — o servidor descarta se for atribuído."
                            >
                              <Lock size={11} aria-hidden style={{ flexShrink: 0 }} />
                              {s.label}
                            </Chip>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------ folhas do celular */}
      {contaAberta ? (
        <EditorDaConta
          key={contaAberta.id}
          u={contaAberta}
          ocupado={salvandoId === contaAberta.id}
          acoes={acoesDe(contaAberta)}
          confirmacoes={confirmacoesDe(contaAberta)}
          onSalvarEscopos={(escopos) =>
            atualizar(contaAberta.id, { scopes: escopos }, `Permissões de ${contaAberta.displayName} atualizadas.`)
          }
          onFechar={fecharConta}
        />
      ) : null}

      {compacto ? (
        <Folha
          aberta={novaAberta}
          cheia
          titulo="Nova conta"
          subtitulo="Ela é obrigada a trocar a senha no primeiro acesso."
          icone={UserPlus}
          rotuloFechar="Fechar nova conta"
          onFechar={() => setNovaAberta(false)}
          rodape={
            <Button
              tone="gold"
              fullWidth
              disabled={!podeCriar}
              onClick={() => {
                void criar().then((ok) => {
                  if (ok) setNovaAberta(false);
                });
              }}
            >
              <UserPlus size={16} aria-hidden />
              {criando ? "Criando..." : "Criar conta"}
            </Button>
          }
        >
          <p style={{ margin: "0 0 16px", fontSize: 12.5, color: C.ink3, lineHeight: 1.55 }}>
            Marque só o que a pessoa precisa. Fechar esta folha não apaga o que você digitou.
          </p>

          <CamposNovaConta
            usuario={novoUsuario}
            onUsuario={setNovoUsuario}
            nome={novoNome}
            onNome={setNovoNome}
            senha={novaSenha}
            onSenha={setNovaSenha}
            compacto
          />

          <RegrasDaSenha regras={regras} compacto />

          <div style={{ marginTop: 22 }}>
            <EscoposNoCelular marcado={(chave) => novosEscopos.includes(chave)} onAlternar={alternarEscopoNovo} />
          </div>
        </Folha>
      ) : null}
    </div>
  );
}
