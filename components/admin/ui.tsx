"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * Kit visual do painel administrativo — linguagem "Bronze Hextech", a mesma do site público,
 * porém calibrada para uma ferramenta de trabalho densa em vez de uma página de leitura.
 *
 * Duas decisões que valem para tudo aqui:
 *
 * 1. O BRONZE É A COR DA AÇÃO. Cores de estado (salvo, conflito, destrutivo) são separadas de
 *    propósito — se tudo for bronze, nada chama atenção quando precisa. O teal de "salvo" já
 *    existe na paleta do site (é o brilho do fundo), então não é cor estrangeira.
 *
 * 2. NÚMERO EM COLUNA USA FONTE TABULAR. O painel é feito de grades de abates/mortes/
 *    assistências; sem `tabular-nums` os dígitos dançam e conferir o que foi digitado fica
 *    mais difícil do que precisa.
 *
 * Estilos em objeto (e não classes utilitárias) para acompanhar o resto do projeto, que já é
 * assim no site público.
 */

// ---------------------------------------------------------------- paleta

export const C = {
  ground: "#0b0804",
  panel: "#15100a",
  panel2: "#1c1610",
  line: "rgba(201,138,75,.16)",
  line2: "rgba(201,138,75,.30)",

  bronze: "#c98a4b",
  bronzeLit: "#e6c592",
  bronzeHi: "#f0c88a",
  bronzeDeep: "#b97e40",

  ink: "#f3ece0",
  ink2: "#b8ab97",
  ink3: "#8f8472",
  ink4: "#6f6656",

  ok: "#46d6c8",
  okSoft: "#9fe8e0",
  warn: "#e0a33a",
  warnSoft: "#f3d69a",
  danger: "#d4574a",
  dangerSoft: "#f0a79e",
} as const;

export const display = "var(--font-display)";
export const tabular: CSSProperties = { fontVariantNumeric: "tabular-nums" };

// ---------------------------------------------------------------- superfícies

export function Card({
  children,
  style,
  padding = 0,
}: Readonly<{ children: ReactNode; style?: CSSProperties; padding?: number | string }>) {
  return (
    <div
      style={{
        background: `linear-gradient(180deg, rgba(28,22,16,.9), rgba(21,16,10,.9))`,
        border: `1px solid ${C.line}`,
        borderRadius: 4,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Rótulo pequeno com traço, igual ao do site público. */
export function Eyebrow({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        fontSize: 10,
        letterSpacing: ".22em",
        textTransform: "uppercase",
        color: C.bronze,
        marginBottom: 8,
      }}
    >
      <span style={{ width: 22, height: 1, background: C.bronze, flexShrink: 0 }} />
      {children}
    </div>
  );
}

/** Cabeçalho de uma seção do painel. */
export function SectionHead({
  eyebrow,
  title,
  description,
  actions,
}: Readonly<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}>) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 20,
      }}
    >
      <div>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h2
          style={{
            fontFamily: display,
            fontSize: "clamp(24px,3.4vw,34px)",
            lineHeight: 1.05,
            color: C.ink,
            margin: "0 0 6px",
          }}
        >
          {title}
        </h2>
        {description ? (
          <p style={{ margin: 0, fontSize: 13, color: C.ink3, maxWidth: "62ch" }}>{description}</p>
        ) : null}
      </div>
      {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
    </header>
  );
}

/** Título interno com régua, para separar blocos dentro de uma seção. */
export function BlockTitle({
  children,
  right,
}: Readonly<{ children: ReactNode; right?: ReactNode }>) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "24px 0 12px" }}>
      <h3 style={{ fontFamily: display, fontSize: 17, color: C.bronze, margin: 0 }}>{children}</h3>
      <div
        style={{
          flex: 1,
          height: 1,
          background: `linear-gradient(90deg, ${C.line2}, transparent)`,
        }}
      />
      {right}
    </div>
  );
}

// ---------------------------------------------------------------- botões

type ButtonTone = "gold" | "ghost" | "danger";

export function Button({
  children,
  onClick,
  tone = "ghost",
  disabled,
  small,
  type = "button",
  title,
  style,
  fullWidth,
}: Readonly<{
  children: ReactNode;
  onClick?: () => void;
  tone?: ButtonTone;
  disabled?: boolean;
  small?: boolean;
  type?: "button" | "submit";
  title?: string;
  style?: CSSProperties;
  fullWidth?: boolean;
}>) {
  const tons: Record<ButtonTone, CSSProperties> = {
    gold: {
      background: `linear-gradient(180deg, ${C.bronzeHi}, ${C.bronzeDeep})`,
      color: "#160f06",
      borderColor: "transparent",
    },
    ghost: {
      background: "rgba(201,138,75,.07)",
      color: C.ink2,
      borderColor: C.line2,
    },
    danger: {
      background: "rgba(212,87,74,.12)",
      color: C.dangerSoft,
      borderColor: "rgba(212,87,74,.45)",
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: fullWidth ? "100%" : undefined,
        padding: small ? "7px 12px" : "10px 16px",
        borderRadius: 3,
        border: "1px solid",
        fontFamily: "inherit",
        fontWeight: 700,
        fontSize: small ? 11.5 : 12.5,
        letterSpacing: ".05em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        ...tons[tone],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- campos

/**
 * Campo com rótulo SEMPRE associado. O `label` envolve o controle, então não existe campo
 * órfão nem rótulo apontando para um id que mudou — problema comum em formulário longo.
 */
export function Field({
  label,
  children,
  hint,
  style,
}: Readonly<{ label: string; children: ReactNode; hint?: string; style?: CSSProperties }>) {
  return (
    <label style={{ display: "block", minWidth: 0, ...style }}>
      <span
        style={{
          display: "block",
          fontSize: 10,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: C.bronze,
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {children}
      {hint ? (
        <span style={{ display: "block", marginTop: 5, fontSize: 11, color: C.ink4 }}>{hint}</span>
      ) : null}
    </label>
  );
}

const campoBase: CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  fontFamily: "inherit",
  fontSize: 13,
  color: C.ink,
  background: "rgba(0,0,0,.34)",
  border: `1px solid ${C.line}`,
  borderRadius: 3,
  minWidth: 0,
};

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  numeric,
  disabled,
  style,
  ariaLabel,
  autoComplete,
}: Readonly<{
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  numeric?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  ariaLabel?: string;
  autoComplete?: string;
}>) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel}
      autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)}
      // inputMode numérico abre o teclado de números no celular — o painel é usado assim
      // entre uma rodada e outra.
      inputMode={numeric ? "numeric" : undefined}
      style={{
        ...campoBase,
        ...(numeric ? { ...tabular, textAlign: "center" } : null),
        ...style,
      }}
    />
  );
}

export function Textarea({
  value,
  onChange,
  placeholder,
  rows = 10,
  mono,
  disabled,
  style,
  ariaLabel,
}: Readonly<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  /** Conteúdo técnico (JSON) fica em monoespaçada: erro de vírgula fica visível. */
  mono?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  ariaLabel?: string;
}>) {
  return (
    <textarea
      value={value}
      rows={rows}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...campoBase,
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" : "inherit",
        fontSize: mono ? 11.5 : 13,
        lineHeight: 1.55,
        resize: "vertical",
        ...style,
      }}
    />
  );
}

export function Select({
  value,
  onChange,
  children,
  disabled,
  style,
  ariaLabel,
}: Readonly<{
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  disabled?: boolean;
  style?: CSSProperties;
  ariaLabel?: string;
}>) {
  return (
    <select
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...campoBase, cursor: disabled ? "not-allowed" : "pointer", ...style }}
    >
      {children}
    </select>
  );
}

// ---------------------------------------------------------------- selos e estados

type ChipTone = "neutro" | "gold" | "ok" | "warn" | "danger" | "off";

export function Chip({
  children,
  tone = "neutro",
  title,
}: Readonly<{ children: ReactNode; tone?: ChipTone; title?: string }>) {
  const tons: Record<ChipTone, CSSProperties> = {
    neutro: { border: `1px solid ${C.line2}`, color: C.ink2, background: "rgba(201,138,75,.06)" },
    gold: {
      border: "1px solid transparent",
      background: `linear-gradient(180deg, ${C.bronzeHi}, ${C.bronzeDeep})`,
      color: "#160f06",
      fontWeight: 700,
    },
    ok: { border: "1px solid rgba(70,214,200,.40)", color: C.okSoft, background: "rgba(70,214,200,.09)" },
    warn: { border: "1px solid rgba(224,163,58,.45)", color: C.warnSoft, background: "rgba(224,163,58,.10)" },
    danger: { border: "1px solid rgba(212,87,74,.45)", color: C.dangerSoft, background: "rgba(212,87,74,.10)" },
    // "off" = a pessoa NÃO tem esta permissão. Apagado, mas presente: mostrar o que falta
    // informa melhor do que esconder.
    off: { border: `1px solid ${C.line}`, color: C.ink4, background: "transparent", opacity: 0.55 },
  };

  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 2,
        fontSize: 10.5,
        letterSpacing: ".04em",
        whiteSpace: "nowrap",
        ...tons[tone],
      }}
    >
      {children}
    </span>
  );
}

/** Aviso com faixa lateral colorida — o tom carrega o significado antes da leitura. */
export function Banner({
  tone,
  title,
  children,
  actions,
}: Readonly<{
  tone: "ok" | "warn" | "danger";
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}>) {
  const cor = tone === "ok" ? C.ok : tone === "warn" ? C.warn : C.danger;
  const fundo =
    tone === "ok" ? "rgba(70,214,200,.08)" : tone === "warn" ? "rgba(224,163,58,.09)" : "rgba(212,87,74,.09)";

  return (
    <div
      role={tone === "ok" ? "status" : "alert"}
      style={{
        display: "flex",
        gap: 14,
        padding: "14px 16px",
        borderRadius: 4,
        border: `1px solid ${cor}66`,
        background: fundo,
        marginBottom: 16,
      }}
    >
      <div style={{ width: 3, borderRadius: 2, background: cor, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: C.ink }}>{title}</p>
        {children ? (
          <div style={{ marginTop: 5, fontSize: 12.5, color: C.ink3, lineHeight: 1.6 }}>{children}</div>
        ) : null}
        {actions ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

/** Métrica grande da visão geral. */
export function Metric({
  label,
  value,
  detail,
  small,
}: Readonly<{ label: string; value: ReactNode; detail?: string; small?: boolean }>) {
  return (
    <Card padding="15px 16px">
      <div style={{ fontSize: 9.5, letterSpacing: ".16em", textTransform: "uppercase", color: C.ink4 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: display,
          fontSize: small ? 19 : 30,
          lineHeight: 1.1,
          color: C.bronzeHi,
          marginTop: 8,
          ...tabular,
        }}
      >
        {value}
      </div>
      {detail ? (
        <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 3, ...tabular }}>{detail}</div>
      ) : null}
    </Card>
  );
}

/** Envelope de conteúdo largo (tabelas), para a página nunca rolar de lado. */
export function ScrollX({ children }: Readonly<{ children: ReactNode }>) {
  return <div style={{ overflowX: "auto", maxWidth: "100%" }}>{children}</div>;
}

// ---------------------------------------------------------------- arranjo e listas

/**
 * Faixa de controles (botões, filtros) de uma seção ou bloco.
 *
 * Existe porque a mesma linha `display:flex; gap:8; flex-wrap:wrap` estava sendo repetida em
 * todo painel — e quando ela é repetida à mão, cedo ou tarde alguém esquece o `flex-wrap` e a
 * faixa estoura a largura no celular, que é onde este painel mais é usado.
 * `right` empurra o que vier nele para a ponta oposta.
 */
export function Toolbar({
  children,
  right,
  style,
}: Readonly<{ children?: ReactNode; right?: ReactNode; style?: CSSProperties }>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        ...style,
      }}
    >
      {children}
      {right ? <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>{right}</div> : null}
    </div>
  );
}

/**
 * Grade de campos de formulário. Quebra sozinha em uma coluna quando não cabem duas, sem
 * media query — o painel é editado tanto no monitor quanto no celular.
 */
export function FieldGrid({
  children,
  min = 200,
  style,
}: Readonly<{ children: ReactNode; min?: number; style?: CSSProperties }>) {
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Layout "lista + editor", o padrão de Times, Jogadores, Séries e Usuários.
 *
 * `auto-fit` com dois filhos rende no máximo duas colunas (faixas vazias colapsam), então dá
 * o empilhamento no telefone de graça, sem media query em objeto de estilo — que não existe.
 */
export function SplitPane({
  children,
  min = 320,
  style,
}: Readonly<{ children: ReactNode; min?: number; style?: CSSProperties }>) {
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        alignItems: "start",
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Linha de lista selecionável (o item que abre alguém no editor ao lado).
 *
 * É um <button> de verdade, e não uma <div> com onClick, para funcionar no teclado e ser
 * anunciada como controle. `aria-pressed` diz qual está aberto — a borda dourada sozinha não
 * chega a quem não enxerga a cor.
 *
 * O anel de foco é desenhado por estado (onFocus/onBlur) porque estilo em objeto não tem
 * pseudo-classe, e um item de lista sem foco visível deixa a navegação por Tab às cegas.
 */
export function ListRow({
  title,
  meta,
  right,
  selected,
  onClick,
  tone,
  style,
}: Readonly<{
  title: ReactNode;
  meta?: ReactNode;
  right?: ReactNode;
  selected?: boolean;
  onClick: () => void;
  /** Pontinho de cor à esquerda (cor do time, por exemplo). */
  tone?: string;
  style?: CSSProperties;
}>) {
  const [focado, setFocado] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      onFocus={() => setFocado(true)}
      onBlur={() => setFocado(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textAlign: "left",
        padding: "9px 12px",
        borderRadius: 3,
        border: `1px solid ${selected ? C.line2 : C.line}`,
        background: selected ? "rgba(201,138,75,.12)" : "rgba(0,0,0,.22)",
        color: "inherit",
        fontFamily: "inherit",
        cursor: "pointer",
        outline: focado ? `2px solid ${C.bronzeHi}` : "2px solid transparent",
        outlineOffset: 2,
        ...style,
      }}
    >
      {tone ? (
        <span
          aria-hidden
          style={{ width: 7, height: 7, borderRadius: 999, background: tone, flexShrink: 0 }}
        />
      ) : null}
      <span style={{ minWidth: 0, flex: 1 }}>
        <span
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: selected ? 700 : 600,
            color: selected ? C.bronzeLit : C.ink,
          }}
        >
          {title}
        </span>
        {meta ? (
          <span style={{ display: "block", marginTop: 2, fontSize: 11, color: C.ink4 }}>{meta}</span>
        ) : null}
      </span>
      {right ? <span style={{ flexShrink: 0 }}>{right}</span> : null}
    </button>
  );
}

// ---------------------------------------------------------------- download sem sair da página

/**
 * Transforma uma resposta já baixada em arquivo salvo, devolvendo o nome usado.
 *
 * Existe porque "Exportar backup" era um `<a href="/api/admin/export">`: uma NAVEGAÇÃO. Se o
 * servidor respondesse erro (ou 403 por falta de `dataset:export`), o navegador saía do
 * painel e levava junto o rascunho não salvo. Com fetch + blob a pessoa continua na página,
 * e o erro pode ser mostrado como aviso.
 */
export async function baixarBackupDoServidor(response: Response): Promise<string> {
  const disposicao = response.headers.get("Content-Disposition") ?? "";
  const casado = /filename="?([^";]+)"?/i.exec(disposicao);
  const nome = casado?.[1] ?? `leagueofbronze-backup-${new Date().toISOString().slice(0, 10)}.json`;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement("a");
  ancora.href = url;
  ancora.download = nome;
  document.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
  // Sem revogar, o blob fica preso na memória da aba até recarregar.
  URL.revokeObjectURL(url);
  return nome;
}

/**
 * Botão "exportar backup" pronto para uso, com o download já feito por fetch + blob.
 *
 * Existe para os cartões que só precisam do botão e não têm (nem devem ter) o estado de aviso
 * do painel inteiro: ele carrega o próprio rótulo de progresso e mostra a falha logo abaixo,
 * em vez de tirar a pessoa da página. Assim os três lugares que exportam — barra de comando,
 * Importar/Exportar e a trava de segurança do Torneio — se comportam igual.
 */
export function BotaoExportarBackup({
  children = "Exportar backup",
  tone = "gold",
  small,
}: Readonly<{ children?: ReactNode; tone?: ButtonTone; small?: boolean }>) {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const exportar = async () => {
    setBaixando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/admin/export", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => ({}))) as { error?: string };
        throw new Error(corpo.error || `Falha ao exportar o backup (HTTP ${resposta.status}).`);
      }
      await baixarBackupDoServidor(resposta);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao exportar o backup.");
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div>
      <Button
        tone={tone}
        small={small}
        disabled={baixando}
        onClick={() => {
          void exportar();
        }}
      >
        {baixando ? "Baixando..." : children}
      </Button>
      {erro ? (
        <p role="alert" style={{ margin: "7px 0 0", fontSize: 11.5, color: C.dangerSoft }}>
          {erro}
        </p>
      ) : null}
    </div>
  );
}

/** Estado vazio: diz o que fazer, em vez de só informar que não há nada. */
export function Empty({
  title,
  children,
  action,
}: Readonly<{ title: string; children?: ReactNode; action?: ReactNode }>) {
  return (
    <Card padding="34px 24px" style={{ textAlign: "center" }}>
      <p style={{ margin: 0, fontFamily: display, fontSize: 16, color: C.ink2 }}>{title}</p>
      {children ? (
        <p style={{ margin: "8px auto 0", maxWidth: "44ch", fontSize: 12.5, color: C.ink4, lineHeight: 1.6 }}>
          {children}
        </p>
      ) : null}
      {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
    </Card>
  );
}

// ---------------------------------------------------------------- ações de risco

/**
 * Caixa de marcação com rótulo clicável inteiro (o <label> envolve o controle, mesma regra do
 * `Field`). O alvo do dedo é a frase toda, não um quadradinho de 15px.
 *
 * `tone="danger"` pinta a marca de vermelho: quando a confirmação é de algo destrutivo, a cor
 * do estado precisa vencer o bronze — bronze aqui leria como "só mais um campo".
 */
export function Check({
  checked,
  onChange,
  children,
  disabled,
  tone = "gold",
}: Readonly<{
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
  tone?: "gold" | "danger";
}>) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 9,
        fontSize: 12.5,
        lineHeight: 1.5,
        color: C.ink2,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          width: 15,
          height: 15,
          marginTop: 1,
          flexShrink: 0,
          accentColor: tone === "danger" ? C.danger : C.bronze,
          cursor: "inherit",
        }}
      />
      <span style={{ minWidth: 0 }}>{children}</span>
    </label>
  );
}

/**
 * Cartão de UMA ação, com faixa de cor no topo.
 *
 * A faixa existe para o risco ser lido antes do texto: dourada = ação comum, âmbar = exige
 * atenção, vermelha = destrutiva. Cada ação perigosa mora no seu próprio cartão justamente
 * para que ninguém clique no botão errado achando que era o de cima.
 */
export function ActionCard({
  tone = "neutro",
  title,
  description,
  badge,
  children,
  style,
}: Readonly<{
  tone?: "gold" | "warn" | "danger" | "neutro";
  title: string;
  description?: ReactNode;
  /** Selo à direita do título (estado da ação, por exemplo). */
  badge?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
}>) {
  const cor =
    tone === "gold" ? C.bronze : tone === "warn" ? C.warn : tone === "danger" ? C.danger : C.line2;

  return (
    <Card style={{ overflow: "hidden", display: "flex", flexDirection: "column", ...style }}>
      <div
        aria-hidden
        style={{ height: 3, flexShrink: 0, background: `linear-gradient(90deg, ${cor}, transparent)` }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          flex: 1,
          padding: "16px 18px 18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <h3 style={{ fontFamily: display, fontSize: 18, color: C.ink, margin: 0 }}>{title}</h3>
          {badge}
        </div>
        {description ? (
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: C.ink3 }}>{description}</p>
        ) : null}
        {children}
      </div>
    </Card>
  );
}
