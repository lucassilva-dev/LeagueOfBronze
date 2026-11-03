import { teamColor } from "@/lib/design";
import { corDoTime, partesDoNome, temaDoTime } from "@/lib/temas/registro";
import type { Cenario, ChaveDeFonte } from "@/lib/temas/tipos";

/**
 * A IDENTIDADE DE UM TIME NO SHOW DO SORTEIO — o que a página da partida e a cerimônia precisam
 * para cada time aparecer com a cara dele: cor, brilho, fundo, o metal do nome, a fonte do
 * escudo e o próprio escudo.
 *
 * Sai do TEMA do time (lib/temas, pelo slug), o mesmo da página temática: o show não inventa
 * outra paleta. Time sem tema (edição antiga, time novo ainda sem página) cai no visual do
 * site — bronze e ouro, com a cor do time pelo id —, e nada quebra.
 *
 * Só dados: a fonte vem como CHAVE (`ChaveDeFonte`). Quem a transforma em classe do next/font é
 * a página (servidor), com `FONTES_DOS_TEMAS` — este módulo fica importável em qualquer teste.
 */
export type IdentidadeDoTime = Readonly<{
  id: string;
  nome: string;
  /** O nome partido como no escudo (marca grande + assinatura pequena), quando o tema define. */
  marca: string;
  assinatura: string | null;
  /** A cor do time no site (legível como texto sobre o fundo escuro). */
  cor: string;
  /** O brilho forte do time (raio, neon, aura do escudo). */
  neon: string;
  /** O brilho claro (núcleo da luz, aresta). */
  arco: string;
  /** O fundo escuro com a cor do time (sombra colorida, miolo dos painéis). */
  abismo: string;
  /** O gradiente metálico do nome, pronto para `background` + `background-clip: text`. */
  metal: string;
  /** A cor sólida de reserva do nome (enquanto o gradiente não pinta, e em alto contraste). */
  metalSolido: string;
  escudo: string | null;
  fonteTitulo: ChaveDeFonte | null;
  /** Peso e estilo da fonte do título, como na página do time (o «RX» é itálico 900). */
  pesoTitulo: number;
  estiloTitulo: "normal" | "italic";
  /** Até 3 letras, para quando não há escudo. */
  sigla: string;
  /**
   * As cores do tema que podem representar o time no PALCO (fatias da roda, cabo de guerra), em
   * ordem de preferência — `coresDoConfronto` escolhe a que mais contrasta com o adversário.
   */
  candidatasDePalco: readonly string[];
}>;

/**
 * Peso e estilo do título por cenário — os mesmos `--tm-titulo-peso`/`--tm-titulo-estilo` de
 * components/times/cenarios/*.module.css (o padrão da base, sem cenário que troque, é itálico 900).
 */
const TIPO_DO_TITULO: Readonly<Record<Cenario, { peso: number; estilo: "normal" | "italic" }>> = {
  tempestade: { peso: 900, estilo: "italic" },
  academia: { peso: 900, estilo: "italic" },
  chamada: { peso: 800, estilo: "normal" },
  estacao: { peso: 400, estilo: "normal" },
  boteco: { peso: 400, estilo: "normal" },
  album: { peso: 400, estilo: "normal" },
  estande: { peso: 400, estilo: "normal" },
  picadeiro: { peso: 400, estilo: "normal" },
};

/** O ouro do site, para time sem tema. */
const METAL_DO_SITE =
  "linear-gradient(180deg,#fff3dc 0%,#f6d6a2 24%,#dc9f57 46%,#5a3714 50%,#a5692f 54%,#e8b878 72%,#fff3dc 84%,#b97e40 100%)";

export function siglaDoTime(nome: string): string {
  const palavras = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .split(/\s+/)
    .filter((p) => p && !["DE", "DO", "DA", "DOS", "DAS", "E"].includes(p));
  if (palavras.length === 0) return "?";
  if (palavras.length === 1) return palavras[0]!.slice(0, 3);
  return palavras
    .slice(0, 3)
    .map((p) => (/^\d+$/.test(p) ? p : p[0]))
    .join("");
}

export function identidadeDoTime(
  time: Readonly<{ id: string; name: string; slug?: string | null; imageUrl?: string | null }> | null,
  reservaId = "?",
): IdentidadeDoTime {
  const id = time?.id ?? reservaId;
  const nome = time?.name ?? reservaId;
  const tema = time?.slug ? temaDoTime(time.slug) : null;
  const cor = time ? corDoTime({ id: time.id, slug: time.slug }) : teamColor(reservaId);

  if (!tema) {
    return {
      id,
      nome,
      marca: nome,
      assinatura: null,
      cor,
      neon: cor,
      arco: "#fff3dc",
      abismo: "#1a1108",
      metal: METAL_DO_SITE,
      metalSolido: "#f0c88a",
      escudo: time?.imageUrl ?? null,
      fonteTitulo: null,
      pesoTitulo: 400,
      estiloTitulo: "normal",
      sigla: siglaDoTime(nome),
      candidatasDePalco: [cor],
    };
  }

  const m = tema.metal;
  const { marca, assinatura } = partesDoNome(nome, tema.prefixo, tema.sufixo);
  return {
    id,
    nome,
    marca,
    assinatura,
    cor,
    neon: tema.cores.neon,
    arco: tema.cores.arco,
    abismo: tema.cores.abismo,
    // A mesma receita do título da página temática (components/times/tema.module.css): luz,
    // alto, meio, a faixa escura do bisel (sombra → fundo), volta, luz e base.
    metal: `linear-gradient(180deg,${m.luz} 0%,${m.alto} 24%,${m.meio} 44%,${m.sombra} 50%,${m.fundo} 53%,${m.volta} 70%,${m.luz} 82%,${m.base} 100%)`,
    metalSolido: m.alto,
    escudo: time?.imageUrl ?? null,
    fonteTitulo: tema.fontes.titulo,
    pesoTitulo: TIPO_DO_TITULO[tema.cenario].peso,
    estiloTitulo: TIPO_DO_TITULO[tema.cenario].estilo,
    sigla: siglaDoTime(nome),
    candidatasDePalco: [...new Set([cor, tema.cores.primaria, tema.cores.neon, m.meio].map((c) => c.toLowerCase()))],
  };
}
