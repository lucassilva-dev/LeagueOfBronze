import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <PageShell className="space-y-6">
      <PageHero
        badge="Admin"
        title="Painel de atualização"
        description="Gerencie times, jogadores e séries da fase regular, semifinal e final em MD3 ou MD5."
      />
      <AdminDashboardClient />
    </PageShell>
  );
}
