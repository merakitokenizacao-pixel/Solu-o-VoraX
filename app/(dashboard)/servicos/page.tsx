export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ServicosPage } from "@/components/servicos/servicos-page";

export default async function ServicosRoute() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: servicos }, { data: clinica }] = await Promise.all([
    supabase.from("servicos").select("*").order("ordem_exibicao", { ascending: true }),
    supabase.from("clinica_info").select("*").limit(1).single(),
  ]);

  return (
    <ServicosPage
      servicos={servicos ?? []}
      clinica={clinica ?? null}
    />
  );
}
