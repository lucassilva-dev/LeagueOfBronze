import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <PageShell className="space-y-6">
      <PageHero
        badge="Admin Fase 1"
        title="Painel de atualização"
        description="Gerencie times, jogadores e séries MD3 sem mexer em código. Proteção simples por senha via ENV (ADMIN_PASSWORD)."
      />
      <AdminDashboardClient />
    </PageShell>
  );
}
