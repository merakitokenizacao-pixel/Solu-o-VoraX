export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { VisaoGeral } from "@/components/dashboard/visao-geral";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: leads }, { data: agendamentos }] = await Promise.all([
    supabase.from("leads").select("*").order("criado_em", { ascending: false }),
    supabase.from("agendamentos").select("*"),
  ]);

  return (
    <VisaoGeral leads={leads ?? []} agendamentos={agendamentos ?? []} />
  );
}
