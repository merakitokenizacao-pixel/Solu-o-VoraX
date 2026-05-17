export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { ClientesPage } from "@/components/clientes/clientes-page";

export default async function ClientesRoute() {
  const supabase = await createClient();

  const [{ data: leads }, { data: agendamentos }] = await Promise.all([
    supabase.from("leads").select("*").order("score", { ascending: false }),
    supabase.from("agendamentos").select("*"),
  ]);

  return <ClientesPage leads={leads ?? []} agendamentos={agendamentos ?? []} />;
}
