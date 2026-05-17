"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MessageCircle, Clock, CheckCircle, XCircle, Bell, BellOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/types";
import { ScoreBadge } from "@/components/ui/score-badge";
import { formatCurrency, formatDate, getAvatarColors, getInitials, formatPhone } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Lead = Tables<"leads">;
type FollowUp = Tables<"follow_ups"> & {
  leads?: { id: string; nome: string | null; telefone: string; foto_url: string | null } | null;
};
type Agendamento = Tables<"agendamentos">;

type FupStatus = "todos" | "aguardando" | "recuperou" | "semresposta" | "cicloencerrado" | "optout";

const MAX_TENTATIVAS = 3;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  aguardando:     { label: "Aguardando",       color: "text-warning",      bg: "bg-warning-bg",      border: "border-warning/30" },
  recuperou:      { label: "Voltou a agendar", color: "text-success",      bg: "bg-success-bg",      border: "border-success/30" },
  semresposta:    { label: "Sem retorno",       color: "text-muted-brand",  bg: "bg-surface-2",       border: "border-border-subtle" },
  cicloencerrado: { label: "Ciclo finalizado",  color: "text-danger",       bg: "bg-danger-bg",       border: "border-danger/30" },
  optout:         { label: "Opt-out",           color: "text-muted-brand",  bg: "bg-surface-3",       border: "border-border-strong" },
};

const FILTER_KEYS: FupStatus[] = ["todos", "aguardando", "recuperou", "semresposta", "cicloencerrado", "optout"];
const FILTER_LABELS: Record<FupStatus, string> = {
  todos: "Todos",
  aguardando: "Aguardando",
  recuperou: "Recuperados",
  semresposta: "Sem retorno",
  cicloencerrado: "Encerrados",
  optout: "Opt-out",
};

function Avatar({ name, url, size = 44 }: { name: string | null; url?: string | null; size?: number }) {
  const [bg, fg] = getAvatarColors(name);
  if (url && url !== "null" && url !== "=" && url !== "undefined") {
    return <img src={url} alt={name ?? ""} width={size} height={size} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 text-[13px] font-medium"
      style={{ width: size, height: size, background: bg + "33", color: fg }}>
      {getInitials(name)}
    </div>
  );
}

interface FupItem {
  lead: Lead | Record<string, unknown>;
  ultimoFup: FollowUp;
  historico: FollowUp[];
  diasDesdeEnvio: number;
  status: string;
  proximoFollowupDias: number | null;
  leadId: string;
  tentativaAtual: number;
}

function computeItems(followups: FollowUp[], agendamentos: Agendamento[], allLeads: Lead[]): FupItem[] {
  const now = new Date();
  const leadsMap: Record<string, Lead> = {};
  allLeads.forEach((l) => { leadsMap[l.id] = l; });

  const agendsByLead: Record<string, Agendamento[]> = {};
  agendamentos.forEach((a) => {
    if (!a.lead_id) return;
    if (!agendsByLead[a.lead_id]) agendsByLead[a.lead_id] = [];
    agendsByLead[a.lead_id].push(a);
  });

  const leadIds = [...new Set(followups.map((f) => f.lead_id))];

  return leadIds.map((lid) => {
    const lead = leadsMap[lid] || {};
    const hist = followups.filter((f) => f.lead_id === lid).sort((a, b) => new Date(b.enviado_em).getTime() - new Date(a.enviado_em).getTime());
    const ultimoFup = hist[0];
    const leadAgends = (agendsByLead[lid] || []).sort((a, b) => new Date(b.data_agendamento ?? 0).getTime() - new Date(a.data_agendamento ?? 0).getTime());
    const ultimoAgend = leadAgends[0] ?? null;
    const diasDesdeEnvio = ultimoFup?.enviado_em ? Math.floor((now.getTime() - new Date(ultimoFup.enviado_em).getTime()) / 86_400_000) : 0;

    const ultimoAgendRealizado = leadAgends.find((a) => a.status === "realizado");
    const dataReferencia = ultimoAgendRealizado
      ? new Date(ultimoAgendRealizado.data_agendamento ?? 0)
      : (lead as Lead).criado_em ? new Date((lead as Lead).criado_em) : null;

    const fupsCiclo = dataReferencia ? hist.filter((f) => new Date(f.enviado_em) > dataReferencia!) : hist;
    const tentativaAtual = fupsCiclo.length;

    let status = "aguardando";
    if ((lead as Lead).followup_optout === true) {
      status = "optout";
    } else if (ultimoAgend && ultimoFup && new Date(ultimoAgend.data_agendamento ?? 0) > new Date(ultimoFup.enviado_em)) {
      status = "recuperou";
    } else if (tentativaAtual >= MAX_TENTATIVAS) {
      status = "cicloencerrado";
    } else {
      const cadencia = (lead as Lead).cadencia_dias ?? 30;
      status = diasDesdeEnvio > cadencia ? "semresposta" : "aguardando";
    }

    const INTERVALO: Record<number, number> = { 1: 7, 2: 14 };
    let proximoFollowupDias: number | null = null;
    if (status !== "optout" && status !== "cicloencerrado") {
      const intervalo = INTERVALO[tentativaAtual] ?? ((lead as Lead).cadencia_dias ?? 30);
      proximoFollowupDias = Math.max(0, intervalo - diasDesdeEnvio);
    }

    return { lead, ultimoFup, historico: hist, diasDesdeEnvio, status, proximoFollowupDias, leadId: lid, tentativaAtual };
  });
}

// — Metric cards (hero + 3 stats) —
function FupMetrics({ items, agendamentos }: { items: FupItem[]; agendamentos: Agendamento[] }) {
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const fimMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const allFups = items.flatMap((i) => i.historico);
  const contactados = new Set(allFups.map((f) => f.lead_id)).size;
  const agendsRecup = agendamentos.filter((a) => a.origem === "followup");
  const recuperados = new Set(agendsRecup.map((a) => a.lead_id)).size;
  const taxa = contactados > 0 ? Math.round((recuperados / contactados) * 100) : 0;
  const receita = agendsRecup.reduce((s, a) => s + Number(a.valor ?? 0), 0);
  const enviadosMes = allFups.filter((f) => f.enviado_em && new Date(f.enviado_em) >= inicioMes).length;
  const enviadosMesAnt = allFups.filter((f) => {
    if (!f.enviado_em) return false;
    const d = new Date(f.enviado_em);
    return d >= inicioMesAnterior && d <= fimMesAnterior;
  }).length;
  const aguardando = contactados - recuperados;

  const C = 2 * Math.PI * 36;
  const offset = C * (1 - taxa / 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-5 mb-8">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-surface to-surface-2 border border-border-subtle rounded-[18px] p-7 overflow-hidden hover:shadow-md hover:border-border-strong transition-all">
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-radial from-brand/12 to-transparent pointer-events-none" />
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-full bg-brand-light text-brand flex items-center justify-center text-[16px]">🎯</div>
          <span className="text-[9px] text-muted-brand font-semibold uppercase tracking-[0.18em]">Taxa de Recuperação</span>
        </div>
        <div className="flex items-center gap-6">
          <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
            <circle cx="42" cy="42" r="36" fill="none" stroke="var(--vorax-surface3)" strokeWidth="6" />
            <circle cx="42" cy="42" r="36" fill="none" stroke="var(--vorax-accent)" strokeWidth="6"
              strokeDasharray={C.toFixed(2)} strokeDashoffset={offset.toFixed(2)} strokeLinecap="round"
              className="transition-all duration-700" />
          </svg>
          <div className="font-display text-[64px] font-light leading-none text-text tracking-[-2px]">
            {taxa}<span className="text-[28px] text-brand align-top leading-[1.2]">%</span>
          </div>
        </div>
        <p className="text-[12px] text-text-2 mt-3 leading-relaxed">
          <strong>{recuperados}</strong> de <strong>{contactados}</strong> clientes contactados voltaram a agendar.
        </p>
      </div>

      {/* Receita */}
      <div className="bg-surface border border-border-subtle rounded-[18px] p-6 flex flex-col gap-2 hover:shadow-md hover:-translate-y-0.5 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-muted-brand font-semibold uppercase tracking-[0.16em]">Receita Recuperada</span>
          <div className="w-6 h-6 rounded-full bg-success-bg text-success flex items-center justify-center text-xs">💰</div>
        </div>
        <div className="font-display text-[32px] font-light text-text leading-none">
          {formatCurrency(receita)}
        </div>
        <span className="text-[11px] text-muted-brand">via follow-ups convertidos</span>
      </div>

      {/* Envios */}
      <div className="bg-surface border border-border-subtle rounded-[18px] p-6 flex flex-col gap-2 hover:shadow-md hover:-translate-y-0.5 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-muted-brand font-semibold uppercase tracking-[0.16em]">Envios Este Mês</span>
          <div className="w-6 h-6 rounded-full bg-info-bg text-info flex items-center justify-center text-xs">✉️</div>
        </div>
        <div className="font-display text-[36px] font-light text-text leading-none">{enviadosMes}</div>
        <div className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit",
          enviadosMes > enviadosMesAnt ? "bg-success-bg text-success" : enviadosMes < enviadosMesAnt ? "bg-danger-bg text-danger" : "bg-surface-2 text-muted-brand")}>
          {enviadosMes > enviadosMesAnt ? "▲" : enviadosMes < enviadosMesAnt ? "▼" : "•"} vs {enviadosMesAnt} mês anterior
        </div>
      </div>

      {/* Aguardando */}
      <div className="bg-surface border border-border-subtle rounded-[18px] p-6 flex flex-col gap-2 hover:shadow-md hover:-translate-y-0.5 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-muted-brand font-semibold uppercase tracking-[0.16em]">Aguardando Resposta</span>
          <div className="w-6 h-6 rounded-full bg-warning-bg text-warning flex items-center justify-center text-xs">⏳</div>
        </div>
        <div className="font-display text-[36px] font-light text-text leading-none">{aguardando}</div>
        <span className="text-[11px] text-muted-brand">{aguardando === 1 ? "cliente" : "clientes"} sem agendamento ainda</span>
      </div>
    </div>
  );
}

// — Card do lead no follow-up —
function FupCard({ item, onOptoutToggle }: { item: FupItem; onOptoutToggle: (id: string) => void }) {
  const lead = item.lead as Lead;
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.aguardando;
  const nome = lead.nome || lead.telefone || "—";

  const diasTxt = item.diasDesdeEnvio === 0 ? "hoje"
    : item.diasDesdeEnvio === 1 ? "há 1 dia"
    : `há ${item.diasDesdeEnvio} dias`;

  let proxTxt = "";
  if (item.status === "optout") proxTxt = "Follow-up pausado";
  else if (item.status === "recuperou") proxTxt = "Cliente voltou — sem novo envio";
  else if (item.status === "cicloencerrado") proxTxt = "Ciclo encerrado";
  else if (item.proximoFollowupDias === 0) proxTxt = "Pronto pra novo envio";
  else if (item.proximoFollowupDias != null) proxTxt = `Próximo em ${item.proximoFollowupDias} dia${item.proximoFollowupDias !== 1 ? "s" : ""}`;

  return (
    <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden hover:border-border-strong transition-all">
      <div className={cn("h-1", item.status === "recuperou" ? "bg-success" : item.status === "cicloencerrado" ? "bg-danger" : item.status === "optout" ? "bg-surface-3" : item.status === "semresposta" ? "bg-muted-brand" : "bg-warning")} />

      {/* Head */}
      <div className="px-5 py-4 flex items-center gap-3.5">
        <Avatar name={lead.nome} url={lead.foto_url} size={44} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-text truncate">{nome}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {lead.segmento && (
              <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-brand">{lead.segmento}</span>
            )}
            {lead.segmento && <span className="text-muted-brand">·</span>}
            <span className="text-[11px] text-muted-brand font-mono">{formatPhone(lead.telefone)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-[9px] font-semibold px-2.5 py-1 rounded-full border capitalize", cfg.color, cfg.bg, cfg.border)}>
            {cfg.label}
          </span>
          <ScoreBadge score={lead.score ?? 0} status={lead.status_atividade ?? "ativa"} />
        </div>
      </div>

      {/* Message preview */}
      {item.ultimoFup?.mensagem && (
        <div className="px-5 pb-3">
          <div className="bg-surface-2 rounded-xl px-4 py-3">
            <p className="text-[12px] text-text-2 italic leading-relaxed line-clamp-2">
              "{item.ultimoFup.mensagem}"
            </p>
            <p className="text-[10px] text-muted-brand mt-1.5 font-mono">Enviada {diasTxt} · {formatDate(item.ultimoFup.enviado_em)}</p>
          </div>
        </div>
      )}

      {/* Progress bar tentativas */}
      {item.status !== "optout" && item.status !== "recuperou" && item.tentativaAtual > 0 && (
        <div className="px-5 pb-3 flex items-center gap-3">
          <span className="text-[11px] text-muted-brand">🎯 Tentativa <strong className="text-text">{item.tentativaAtual} de {MAX_TENTATIVAS}</strong></span>
          <div className="flex gap-1.5 ml-auto">
            {Array.from({ length: MAX_TENTATIVAS }, (_, i) => (
              <div key={i} className={cn("w-2 h-2 rounded-full", i < item.tentativaAtual ? (item.status === "cicloencerrado" ? "bg-danger" : "bg-brand") : "bg-surface-3")} />
            ))}
          </div>
          {item.status === "cicloencerrado" && (
            <span className="text-[9px] font-bold text-danger bg-danger-bg px-2 py-0.5 rounded-full">Encerrado</span>
          )}
          {item.tentativaAtual === MAX_TENTATIVAS - 1 && item.status !== "cicloencerrado" && (
            <span className="text-[9px] font-bold text-warning bg-warning-bg px-2 py-0.5 rounded-full">Última</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 pb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 text-[11px] text-muted-brand">
          <Clock size={11} />
          <span>{proxTxt || "—"}</span>
          <span className="mx-1">·</span>
          <span><strong className="text-text">{item.historico.length}</strong> envio{item.historico.length !== 1 ? "s" : ""} total</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/conversas"
            className="flex items-center gap-1.5 text-[11px] font-semibold text-brand border border-brand/30 bg-brand-light px-3 py-1.5 rounded-lg hover:bg-brand hover:text-white transition-colors"
          >
            <MessageCircle size={12} /> Ver conversa
          </Link>
          <button
            onClick={() => onOptoutToggle(item.leadId)}
            className={cn("flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors",
              item.status === "optout"
                ? "border-success/30 bg-success-bg text-success hover:bg-success hover:text-white"
                : "border-border-subtle bg-surface-2 text-muted-brand hover:border-danger hover:text-danger"
            )}
          >
            {item.status === "optout" ? <><Bell size={12} /> Reativar</> : <><BellOff size={12} /> Pausar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// — Main —
export function FollowupPage({
  followups,
  agendamentos,
  leads,
}: {
  followups: FollowUp[];
  agendamentos: Agendamento[];
  leads: Lead[];
}) {
  const [filter, setFilter] = useState<FupStatus>("todos");
  const [localLeads, setLocalLeads] = useState(leads);

  const items = useMemo(
    () => computeItems(followups, agendamentos, localLeads),
    [followups, agendamentos, localLeads]
  );

  const filtered = useMemo(
    () => filter === "todos" ? items : items.filter((i) => i.status === filter),
    [items, filter]
  );

  const counts: Record<FupStatus, number> = useMemo(() => {
    const c: Record<string, number> = { todos: items.length };
    items.forEach((i) => { c[i.status] = (c[i.status] ?? 0) + 1; });
    return c as Record<FupStatus, number>;
  }, [items]);

  async function toggleOptout(leadId: string) {
    const lead = localLeads.find((l) => l.id === leadId);
    if (!lead) return;
    const next = !lead.followup_optout;
    const sb = createClient();
    const { error } = await sb.from("leads").update({ followup_optout: next }).eq("id", leadId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(next ? "Follow-up pausado" : "Follow-up reativado");
    setLocalLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, followup_optout: next } : l));
  }

  return (
    <div className="p-6 lg:p-10 pb-24 lg:pb-10">
      <FupMetrics items={items} agendamentos={agendamentos} />

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all",
              filter === k
                ? "bg-brand text-white border-brand"
                : "bg-surface-2 text-muted-brand border-border-subtle hover:border-border-strong hover:text-text"
            )}
          >
            {FILTER_LABELS[k]}
            <span className={cn("text-[10px] px-1.5 py-0 rounded-full", filter === k ? "bg-white/20 text-white" : "bg-surface-3 text-muted-brand")}>
              {counts[k] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-5xl mb-4">💬</div>
          <div className="text-[16px] font-medium text-text mb-1">Nada por aqui</div>
          <div className="text-[13px] text-muted-brand">
            {filter === "todos"
              ? "Quando o sistema enviar follow-ups, eles aparecem aqui."
              : "Não há leads no filtro selecionado."}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => (
            <FupCard key={item.leadId} item={item} onOptoutToggle={toggleOptout} />
          ))}
        </div>
      )}
    </div>
  );
}
