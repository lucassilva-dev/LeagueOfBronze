import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * /admin dentro da moldura do site (DIFF-UI-04).
 *
 * O SiteFrame envolve TODA página no `<main id="conteudo">`, o único do site. A
 * app/admin/page.tsx tinha o próprio `<main>`, que ficava aninhado nele: HTML inválido, e o
 * leitor de tela anunciava duas regiões principais no painel. Aqui a página de verdade é
 * renderizada dentro da moldura de verdade — só o painel em si é trocado por um marcador.
 */

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES } = await import("@/lib/i18n/messages");
  return { getLocale: async () => "pt", getMessages: async () => MESSAGES.pt };
});
vi.mock("@/lib/data-store", async (original) => ({
  ...(await original<typeof import("@/lib/data-store")>()),
  ehAmbienteDeTeste: () => false,
  problemaDeAmbiente: () => null,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin", useRouter: () => ({ refresh() {}, push() {} }) }));
vi.mock("@/components/admin/admin-dashboard-client", () => ({ AdminDashboardClient: () => <p>painel</p> }));

const { SiteFrame } = await import("@/components/site-frame");
const { default: AdminPage } = await import("@/app/admin/page");

describe("/admin na moldura do site", () => {
  it("tem um <main> só — o da moldura — com o painel dentro dele", async () => {
    const html = renderToStaticMarkup(await SiteFrame({ children: <AdminPage /> }));
    expect(html.match(/<main\b/g)).toHaveLength(1);
    const principal = html.indexOf('<main id="conteudo"');
    expect(principal).toBeGreaterThan(-1);
    const painel = html.indexOf("<p>painel</p>");
    expect(painel).toBeGreaterThan(principal);
    expect(painel).toBeLessThan(html.indexOf("</main>"));
  });

  it("o invólucro da página mantém o respiro e o teto de largura", () => {
    const html = renderToStaticMarkup(<AdminPage />);
    expect(html.startsWith("<div")).toBe(true);
    expect(html).toContain("max-width:1520px");
    expect(html).toContain("min-height:100vh");
  });
});
