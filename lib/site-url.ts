/**
 * Endereço oficial do site.
 *
 * Desde 05/10/2026 é o domínio próprio (comprado na Vercel e ligado ao projeto
 * `league-of-bronze`); o `leagueofbronze.xyz` sem www redireciona pra cá (308), e o
 * `league-of-bronze.vercel.app` continua respondendo. É este endereço que aparece no
 * trailer, no sitemap, no robots.txt e nas prévias de link — um lugar só pra trocar.
 *
 * NÃO é usado pra decidir ambiente (produção × teste): isso é `problemaDeAmbiente`, em
 * lib/data-store.ts, que lê o domínio do próprio deploy.
 */
export const SITE_URL = "https://www.leagueofbronze.xyz";

/** O mesmo endereço, sem protocolo nem www, do jeito que se escreve pra alguém. */
export const SITE_DOMINIO = "leagueofbronze.xyz";
