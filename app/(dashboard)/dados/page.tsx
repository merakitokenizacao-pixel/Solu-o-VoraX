export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { DadosPage } from "@/components/dados/dados-page";

export default async function DadosRoute() {
  const supabase = await createClient();

  const [
    { data: followUps },
    { data: agendamentos },
    { data: leads },
    { data: templates },
    { data: conversas },
  ] = await Promise.all([
    supabase.from("follow_ups").select("*"),
    supabase.from("agendamentos").select("*"),
    supabase.from("leads").select("id, nome, status, segmento, analise_motivo, analise_calculada_em"),
    supabase.from("followup_templates").select("id, segmento, tentativa, mensagem, qtd_envios, qtd_conversoes, ativo"),
    supabase.from("conversas").select("id, lead_id, origem, enviado_em"),
  ]);

  return (
    <DadosPage
      followUps={followUps ?? []}
      agendamentos={agendamentos ?? []}
      leads={leads ?? []}
      templates={templates ?? []}
      conversas={conversas ?? []}
    />
  );
}
