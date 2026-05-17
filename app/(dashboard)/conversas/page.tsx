export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { ConversasPage } from "@/components/conversas/conversas-page";

export default async function ConversasRoute() {
  const supabase = await createClient();

  const [{ data: leads }, { data: conversas }, { data: agendamentos }] = await Promise.all([
    supabase.from("leads").select("*").order("criado_em", { ascending: false }),
    supabase.from("conversas").select("*").order("enviado_em", { ascending: true }),
    supabase.from("agendamentos").select("*"),
  ]);

  return (
    <ConversasPage
      leads={leads ?? []}
      conversas={conversas ?? []}
      agendamentos={agendamentos ?? []}
    />
  );
}
