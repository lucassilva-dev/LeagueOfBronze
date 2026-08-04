import type { MetadataRoute } from "next";

/**
 * Sitemap das páginas públicas.
 *
 * Só rotas fixas: as páginas de detalhe (jogador, time, série) derivam do dataset e mudam a
 * cada rodada — deixá-las de fora evita um sitemap que aponta para coisa que já saiu do ar.
 * O painel de administração fica de fora de propósito.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://league-of-bronze.vercel.app";
  const agora = new Date();

  const rotas = [
    { caminho: "/", prioridade: 1 },
    { caminho: "/times", prioridade: 0.8 },
    { caminho: "/jogadores", prioridade: 0.8 },
    { caminho: "/calendario", prioridade: 0.8 },
    { caminho: "/tabela", prioridade: 0.9 },
    { caminho: "/stats", prioridade: 0.7 },
    { caminho: "/cartas", prioridade: 0.6 },
    { caminho: "/regras", prioridade: 0.7 },
    { caminho: "/temporadas", prioridade: 0.6 },
    { caminho: "/legal", prioridade: 0.3 },
  ];

  return rotas.map(({ caminho, prioridade }) => ({
    url: `${base}${caminho}`,
    lastModified: agora,
    changeFrequency: "weekly" as const,
    priority: prioridade,
  }));
}
