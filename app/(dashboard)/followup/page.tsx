export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FollowupPage } from "@/components/followup/followup-page";

export default async function FollowupRoute() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: followups }, { data: agendamentos }, { data: leads }] = await Promise.all([
    supabase.from("follow_ups").select("*, leads(id, nome, telefone, foto_url)").order("enviado_em", { ascending: false }),
    supabase.from("agendamentos").select("*"),
    supabase.from("leads").select("*"),
  ]);

  return (
    <FollowupPage
      followups={(followups ?? []) as never}
      agendamentos={agendamentos ?? []}
      leads={leads ?? []}
    />
  );
}
