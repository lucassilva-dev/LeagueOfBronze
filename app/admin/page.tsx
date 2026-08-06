import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export const dynamic = "force-dynamic";

/**
 * O painel monta o próprio contorno: barra de comando fixa no topo, trilho lateral e área de
 * trabalho. Por isso esta página não usa PageShell nem PageHero.
 *
 * Dois motivos concretos:
 *  - o PageHero trazia "Painel de atualização" no visual ANTIGO, logo acima do painel novo —
 *    dois cabeçalhos, duas linguagens visuais na mesma tela;
 *  - o PageShell limita a 1160px e anima a partir de opacity 0. A barra de comando precisa
 *    atravessar a largura toda para ficar fixa, e conteúdo que depende de animação para
 *    aparecer já deixou páginas em branco neste projeto mais de uma vez.
 */
export default function AdminPage() {
  return (
    <main style={{ minHeight: "100vh" }}>
      <AdminDashboardClient />
    </main>
  );
}
