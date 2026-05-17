export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { VisaoGeral } from "@/components/dashboard/visao-geral";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: leads }, { data: agendamentos }] = await Promise.all([
    supabase.from("leads").select("*").order("criado_em", { ascending: false }),
    supabase.from("agendamentos").select("*"),
  ]);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-[260px] min-w-0">
        <Topbar />
        <main className="flex-1 min-w-0">
          <VisaoGeral leads={leads ?? []} agendamentos={agendamentos ?? []} />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
