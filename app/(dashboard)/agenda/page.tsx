export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { AgendaPage } from "@/components/agenda/agenda-page";

export default async function AgendaRoute() {
  const supabase = await createClient();

  const [{ data: agendamentos }, { data: leads }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("*, leads(nome, telefone, foto_url)")
      .order("data_agendamento", { ascending: true }),
    supabase.from("leads").select("*").order("nome"),
  ]);

  return (
    <AgendaPage
      initialAgendamentos={(agendamentos ?? []) as never}
      leads={leads ?? []}
    />
  );
}
