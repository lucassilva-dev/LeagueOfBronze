"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as KeyboardEventReact,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronRight, X } from "lucide-react";

import { useCompacto } from "@/components/admin/responsivo";
import { SeloHex, type Icone } from "@/components/lob/icones";
import { eloSvgUrl, resolveElo } from "@/lib/design";

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

/**
 * Ícone da seção aberta no painel, posto pelo shell. O `SectionHead` usa ele quando não
 * recebe um `icone` próprio — assim toda seção ganha o selo do menu sem cada painel ter de
 * saber qual é o seu.
 */
export const ContextoIconeDaSecao = createContext<Icone | undefined>(undefined);

/**
 * Cabeçalho de uma seção do painel.
 *
 * O selo hexagonal da seção fica ao lado do título — o mesmo do menu, para a pessoa
 * reconhecer onde está pelo desenho antes de ler. `icone={null}` tira o selo (subseção
 * dentro de outra). No celular a descrição encolhe uma linha de fonte: ela é instrução, e
 * instrução longa empurra o trabalho para baixo da dobra.
 */
export function SectionHead({
  eyebrow,
  title,
  description,
  actions,
  icone,
}: Readonly<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  icone?: Icone | null;
}>) {
  const compacto = useCompacto();
  const daSecao = useContext(ContextoIconeDaSecao);
  const desenho = icone === null ? undefined : (icone ?? daSecao);
  return (
    <header
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: compacto ? 12 : 16,
        flexWrap: "wrap",
        marginBottom: compacto ? 16 : 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: compacto ? 12 : 14, minWidth: 0 }}>
        {desenho ? <SeloHex icone={desenho} tamanho={compacto ? 40 : 46} /> : null}
        <div style={{ minWidth: 0 }}>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h2
            style={{
              fontFamily: display,
              fontSize: "clamp(24px,3.4vw,34px)",
              lineHeight: 1.05,
              color: C.ink,
              margin: "0 0 6px",
              overflowWrap: "anywhere",
            }}
          >
            {title}
          </h2>
        </div>
      </div>
      {description ? (
        <p
          style={{
            flexBasis: "100%",
            order: 1,
            margin: desenho && !compacto ? "-6px 0 0 60px" : "-4px 0 0",
            fontSize: compacto ? 12.5 : 13,
            lineHeight: 1.55,
            color: C.ink3,
            maxWidth: "62ch",
          }}
        >
          {description}
        </p>
      ) : null}
      {/* No celular as ações descem para depois da instrução, ocupando a largura toda. */}
      {actions ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            order: compacto ? 2 : 0,
            width: compacto ? "100%" : undefined,
          }}
        >
          {actions}
        </div>
      ) : null}
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

  // No celular o botão vira alvo de dedo: 44px de altura (40 no pequeno), a medida mínima
  // das diretrizes de toque. No monitor continua denso como sempre foi.
  const compacto = useCompacto();
  const medidas: CSSProperties = compacto
    ? {
        padding: small ? "9px 14px" : "11px 18px",
        minHeight: small ? 40 : 44,
        fontSize: small ? 12.5 : 13.5,
      }
    : { padding: small ? "7px 12px" : "10px 16px", fontSize: small ? 11.5 : 12.5 };

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
        borderRadius: 3,
        border: "1px solid",
        fontFamily: "inherit",
        fontWeight: 700,
        letterSpacing: ".05em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        ...medidas,
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

/**
 * No celular o campo tem 16px de fonte: abaixo disso o Safari do iPhone dá zoom na página
 * ao focar e ela não volta sozinha — a pessoa digita um placar e perde a tela de vista.
 */
const campoCompacto: CSSProperties = { ...campoBase, padding: "11px 12px", fontSize: 16, minHeight: 44 };

function useCampoBase(): CSSProperties {
  return useCompacto() ? campoCompacto : campoBase;
}

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
  maxLength,
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
  maxLength?: number;
}>) {
  const base = useCampoBase();
  return (
    <input
      type={type}
      maxLength={maxLength}
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
        ...base,
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
  id,
  maxLength,
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
  id?: string;
  /** O mesmo teto do servidor: passar dele só seria descoberto ao salvar, sem dizer onde. */
  maxLength?: number;
}>) {
  const base = useCampoBase();
  const compacto = useCompacto();
  return (
    <textarea
      id={id}
      value={value}
      rows={rows}
      disabled={disabled}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...base,
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" : "inherit",
        // Monoespaçada fica menor no monitor (JSON longo); no celular vale a regra dos 16px.
        fontSize: compacto ? 16 : mono ? 11.5 : 13,
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
  const base = useCampoBase();
  return (
    <select
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...base, cursor: disabled ? "not-allowed" : "pointer", ...style }}
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
      {/* `anywhere`: um Riot ID inteiro ("nak4y#JPL") não quebra sozinho e vazava do
          cartão na grade de duas colunas do celular. */}
      <div
        style={{
          fontFamily: display,
          fontSize: small ? 19 : 30,
          lineHeight: 1.1,
          color: C.bronzeHi,
          marginTop: 8,
          overflowWrap: "anywhere",
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
  const compacto = useCompacto();

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
        padding: compacto ? "12px 14px" : "9px 12px",
        minHeight: compacto ? 52 : undefined,
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
 * "YYYY-MM-DD-HH-mm-ss" no relógio de Brasília — o mesmo carimbo do nome que o servidor
 * manda no Content-Disposition. Com `toISOString()` (UTC) o backup das 22:30 de 21/11 saía
 * datado de 22/11, e quem procurava o do dia 21 não achava.
 */
export function carimboDeBrasilia(agora: Date): string {
  const partes: Record<string, string> = {};
  for (const parte of new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora)) {
    partes[parte.type] = parte.value;
  }
  return `${partes.year}-${partes.month}-${partes.day}-${partes.hour}-${partes.minute}-${partes.second}`;
}

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
  const nome = casado?.[1] ?? `leagueofbronze-backup-${carimboDeBrasilia(new Date())}.json`;

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
  const compacto = useCompacto();
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: compacto ? 11 : 9,
        fontSize: compacto ? 13.5 : 12.5,
        lineHeight: 1.5,
        color: C.ink2,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        // Alvo de dedo: a linha inteira, com altura mínima de toque.
        padding: compacto ? "6px 0" : undefined,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          width: compacto ? 20 : 15,
          height: compacto ? 20 : 15,
          marginTop: compacto ? 0 : 1,
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

// ---------------------------------------------------------------- celular

const FOCAVEIS_DA_FOLHA =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Folha: o "modal" do painel.
 *
 * No celular sobe de baixo (alcance do polegar) e, com `cheia`, ocupa a tela inteira — é
 * onde moram os editores (time, jogador, série) que no monitor ficam ao lado da lista. No
 * monitor vira gaveta na lateral direita, para quem usar a mesma peça lá.
 *
 * O que ela garante para quem usa:
 *  - foco entra nela ao abrir, não escapa pelo Tab e volta ao botão de origem ao fechar;
 *  - Esc e o toque no fundo escuro chamam `onFechar` — quem tem rascunho decide ali se
 *    pergunta antes (a folha não descarta nada sozinha);
 *  - a página atrás não rola enquanto ela está aberta;
 *  - cabeçalho e rodapé ficam fixos e só o meio rola — o botão de salvar nunca some.
 *
 * Vai para o <body> por portal: o cabeçalho do site cria contexto de empilhamento (tem
 * `backdrop-filter`) e um z-index aqui dentro não venceria ele. Animação só de
 * `transform` — opacidade animada já deixou páginas inteiras em branco neste projeto.
 */
export function Folha({
  aberta,
  titulo,
  subtitulo,
  icone,
  onFechar,
  children,
  rodape,
  cheia = false,
  rotuloFechar = "Fechar",
}: Readonly<{
  aberta: boolean;
  titulo: string;
  subtitulo?: ReactNode;
  icone?: Icone;
  onFechar: () => void;
  children: ReactNode;
  /** Ações fixas embaixo (salvar, aplicar). */
  rodape?: ReactNode;
  /** Tela inteira no celular — para editores longos. */
  cheia?: boolean;
  rotuloFechar?: string;
}>) {
  const compacto = useCompacto();
  const idTitulo = useId();
  const painel = useRef<HTMLDivElement>(null);
  // `onFechar` muda a cada render de quem chama; o efeito de abertura não pode reagir a ele.
  const fechar = useRef(onFechar);
  useEffect(() => {
    fechar.current = onFechar;
  });

  useEffect(() => {
    if (!aberta) return;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    painel.current?.focus();
    const rolagemAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = rolagemAntes;
      // Devolve o foco a quem abriu, se ainda existir: quem usa teclado não se perde.
      if (anterior && document.contains(anterior)) anterior.focus();
    };
  }, [aberta]);

  if (!aberta || typeof document === "undefined") return null;

  const aoTeclar = (evento: KeyboardEventReact<HTMLDivElement>) => {
    if (evento.key === "Escape") {
      evento.stopPropagation();
      fechar.current();
      return;
    }
    if (evento.key !== "Tab" || !painel.current) return;
    const focaveis = Array.from(painel.current.querySelectorAll<HTMLElement>(FOCAVEIS_DA_FOLHA));
    const primeiro = focaveis[0];
    const ultimo = focaveis.at(-1);
    if (!primeiro || !ultimo) {
      evento.preventDefault();
      return;
    }
    const atual = document.activeElement;
    if (evento.shiftKey && (atual === primeiro || atual === painel.current)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && atual === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  };

  const deBaixo = compacto;
  const posicao: CSSProperties = deBaixo
    ? {
        left: 0,
        right: 0,
        bottom: 0,
        top: cheia ? 0 : undefined,
        maxHeight: cheia ? undefined : "92dvh",
        borderRadius: cheia ? 0 : "14px 14px 0 0",
        borderTop: cheia ? undefined : `1px solid ${C.line2}`,
      }
    : {
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(560px, 100vw)",
        borderLeft: `1px solid ${C.line2}`,
      };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 65 }}>
      <div
        aria-hidden
        onClick={() => fechar.current()}
        style={{ position: "absolute", inset: 0, background: "rgba(6,4,2,.74)" }}
      />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        onKeyDown={aoTeclar}
        className={deBaixo ? "adm-folha-baixo" : "adm-folha-lado"}
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg,#1b140c,#0e0905)",
          boxShadow: "0 -18px 50px rgba(0,0,0,.6)",
          outline: "none",
          ...posicao,
        }}
      >
        {deBaixo && !cheia ? (
          <span
            aria-hidden
            style={{ width: 42, height: 4, borderRadius: 99, background: C.line2, margin: "8px auto 0", flexShrink: 0 }}
          />
        ) : null}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: cheia && deBaixo ? "calc(10px + env(safe-area-inset-top)) 12px 10px 16px" : "10px 12px 10px 16px",
            borderBottom: `1px solid ${C.line}`,
            flexShrink: 0,
          }}
        >
          {icone ? <SeloHex icone={icone} tamanho={34} /> : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              id={idTitulo}
              style={{ fontFamily: display, fontSize: 19, lineHeight: 1.1, color: C.ink, margin: 0, overflowWrap: "anywhere" }}
            >
              {titulo}
            </h2>
            {subtitulo ? <div style={{ marginTop: 3, fontSize: 11.5, color: C.ink4 }}>{subtitulo}</div> : null}
          </div>
          <button
            type="button"
            onClick={() => fechar.current()}
            aria-label={rotuloFechar}
            title={rotuloFechar}
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
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "16px 16px 20px" }}>
          {children}
        </div>
        {rodape ? (
          <footer
            style={{
              flexShrink: 0,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
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
    </div>,
    document.body,
  );
}

/**
 * Uma linha de tabela em forma de cartão — o arranjo de bolso das listas do painel.
 *
 * Com `onClick`, o título vira um <button> de verdade e o cartão inteiro responde ao toque
 * (o botão se estica por cima do cartão via CSS, `.adm-cartao__alvo::after`). Assim o
 * cartão pode conter qualquer coisa — chips, emblemas, até outro botão (que precisa de
 * `position: relative; z-index: 1` para ficar por cima) — sem virar botão dentro de botão.
 */
export function CartaoLinha({
  titulo,
  subtitulo,
  inicio,
  fim,
  children,
  onClick,
  selecionado,
  destaque,
  idAlvo,
  rotuloAlvo,
  abreDialogo,
  style,
}: Readonly<{
  titulo: ReactNode;
  subtitulo?: ReactNode;
  /** À esquerda: emblema de elo, logo do time, selo. */
  inicio?: ReactNode;
  /** À direita: estado (chips). */
  fim?: ReactNode;
  /** Linha extra embaixo (requisitos, valores). */
  children?: ReactNode;
  onClick?: () => void;
  selecionado?: boolean;
  /** Faixa de cor à esquerda (cor do time, tom do estado). */
  destaque?: string;
  /** id do botão — para devolver o foco a ele depois de fechar uma folha. */
  idAlvo?: string;
  /** Nome acessível do botão, quando o título visível não basta ("Abrir Fulano"). */
  rotuloAlvo?: string;
  /** O toque abre uma folha/diálogo (anuncia `aria-haspopup`). */
  abreDialogo?: boolean;
  style?: CSSProperties;
}>) {
  const tituloEstilo: CSSProperties = {
    display: "block",
    fontSize: 14,
    fontWeight: selecionado ? 700 : 600,
    color: selecionado ? C.bronzeLit : C.ink,
    lineHeight: 1.3,
    overflowWrap: "anywhere",
  };
  return (
    <div
      className={onClick ? "adm-cartao adm-cartao--toque" : "adm-cartao"}
      style={{
        position: "relative",
        padding: "12px 12px 12px 14px",
        minHeight: 56,
        borderRadius: 4,
        border: `1px solid ${selecionado ? C.line2 : C.line}`,
        background: selecionado ? "rgba(201,138,75,.12)" : "rgba(0,0,0,.24)",
        boxShadow: destaque ? `inset 3px 0 0 ${destaque}` : undefined,
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {inicio ? <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{inicio}</div> : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          {onClick ? (
            <button
              type="button"
              id={idAlvo}
              className="adm-cartao__alvo"
              onClick={onClick}
              aria-label={rotuloAlvo}
              aria-pressed={abreDialogo ? undefined : selecionado}
              aria-haspopup={abreDialogo ? "dialog" : undefined}
              style={{
                ...tituloEstilo,
                width: "100%",
                padding: 0,
                border: "none",
                background: "none",
                textAlign: "left",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              {titulo}
            </button>
          ) : (
            <div style={tituloEstilo}>{titulo}</div>
          )}
          {subtitulo ? (
            <div style={{ marginTop: 3, fontSize: 11.5, lineHeight: 1.4, color: C.ink4, overflowWrap: "anywhere" }}>
              {subtitulo}
            </div>
          ) : null}
        </div>
        {fim ? (
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>{fim}</div>
        ) : null}
        {onClick ? <ChevronRight size={18} aria-hidden style={{ flexShrink: 0, color: C.ink4 }} /> : null}
      </div>
      {/* A linha extra ocupa a largura INTEIRA do cartão: espremida ao lado do emblema e do
          estado, uma fileira de seis chips virava uma coluna. */}
      {children ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </div>
  );
}

/** Pares rótulo → valor em grade (ficha de detalhe no celular, no lugar de colunas). */
export function Dados({
  itens,
  colunas = 2,
}: Readonly<{
  itens: ReadonlyArray<{ rotulo: string; valor: ReactNode; largo?: boolean }>;
  colunas?: number;
}>) {
  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
        gap: "12px 14px",
        margin: 0,
      }}
    >
      {itens.map((item) => (
        <div key={item.rotulo} style={{ gridColumn: item.largo ? "1 / -1" : undefined, minWidth: 0 }}>
          <dt style={{ fontSize: 9.5, letterSpacing: ".16em", textTransform: "uppercase", color: C.ink4 }}>
            {item.rotulo}
          </dt>
          <dd style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.45, color: C.ink2, overflowWrap: "anywhere" }}>
            {item.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Elo pelo emblema oficial (os mesmos de /public/elo que o site usa) no lugar do nome.
 *
 * O nome continua lá para quem não enxerga o desenho: vira o `alt` da imagem (e o `title`
 * no mouse). Com `mostrarNome` ele aparece escrito ao lado — use onde há espaço e a
 * leitura importa (ficha do inscrito). Elo que o sistema não reconhece sai como texto: um
 * dado estranho precisa ficar visível, não sumir.
 */
export function Elo({
  elo,
  tamanho = 26,
  mostrarNome = false,
  detalhe,
}: Readonly<{
  elo?: string | null;
  tamanho?: number;
  mostrarNome?: boolean;
  /** Linha miúda ao lado: divisão, PDL, origem ("II · 45 PDL", "Riot"). */
  detalhe?: ReactNode;
}>) {
  const meta = resolveElo(elo);
  if (!meta) {
    return <span style={{ color: C.ink3, fontSize: 12 }}>{elo?.trim() ? elo : "—"}</span>;
  }
  return (
    <span
      title={meta.label}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0, verticalAlign: "middle" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={eloSvgUrl(meta.key)}
        alt={mostrarNome ? "" : meta.label}
        width={tamanho}
        height={tamanho}
        style={{
          width: tamanho,
          height: tamanho,
          objectFit: "contain",
          flexShrink: 0,
          filter: "drop-shadow(0 2px 5px rgba(0,0,0,.75))",
        }}
      />
      {mostrarNome || detalhe ? (
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, minWidth: 0 }}>
          {mostrarNome ? <span style={{ color: meta.color, fontWeight: 700, fontSize: 12.5 }}>{meta.label}</span> : null}
          {detalhe ? <span style={{ color: C.ink4, fontSize: 10.5, ...tabular }}>{detalhe}</span> : null}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Chip que liga/desliga um filtro (`aria-pressed`). No celular tem altura de toque; em
 * fileira larga, ponha dentro de `RolagemX`.
 */
export function ChipFiltro({
  ativo,
  onClick,
  children,
  title,
  disabled,
  rotulo,
}: Readonly<{
  ativo: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
  disabled?: boolean;
  /** Nome acessível quando o conteúdo é só um emblema. */
  rotulo?: string;
}>) {
  const compacto = useCompacto();
  return (
    <button
      type="button"
      aria-pressed={ativo}
      aria-label={rotulo}
      onClick={onClick}
      title={title ?? rotulo}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
        minHeight: compacto ? 38 : 30,
        padding: compacto ? "6px 12px" : "4px 10px",
        borderRadius: 999,
        border: `1px solid ${ativo ? "transparent" : C.line2}`,
        background: ativo ? `linear-gradient(180deg, ${C.bronzeHi}, ${C.bronzeDeep})` : "rgba(201,138,75,.06)",
        color: ativo ? "#160f06" : C.ink2,
        fontFamily: "inherit",
        fontSize: compacto ? 12.5 : 11.5,
        fontWeight: ativo ? 700 : 500,
        whiteSpace: "nowrap",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

/** Fileira que rola de lado sem barra visível (chips de filtro, abas no celular). */
export function RolagemX({
  children,
  rotulo,
  style,
}: Readonly<{ children: ReactNode; rotulo?: string; style?: CSSProperties }>) {
  return (
    <div
      role={rotulo ? "group" : undefined}
      aria-label={rotulo}
      className="adm-rolagem-x"
      style={{ display: "flex", gap: 6, overflowX: "auto", maxWidth: "100%", paddingBottom: 2, ...style }}
    >
      {children}
    </div>
  );
}
