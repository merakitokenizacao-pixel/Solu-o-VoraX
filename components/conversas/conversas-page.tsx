"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Send, Pause, Play, Lock, Unlock, ChevronLeft, Phone, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/types";
import { ScoreBadge } from "@/components/ui/score-badge";
import { formatDate, formatPhone, formatCurrency, getAvatarColors, getInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Lead = Tables<"leads">;
type ConversaDB = Tables<"conversas">;
type Conversa = ConversaDB | (Omit<ConversaDB, "origem"> & { origem: "humano"; optimistic?: boolean });
type Agendamento = Tables<"agendamentos">;

const N8N_WEBHOOK = "https://n8n-n8n.2ghreo.easypanel.host/webhook/enviar-msg-crm";

type InboxTab = "tudo" | "ia" | "humano" | "inativo";
const INBOX_TABS: { key: InboxTab; label: string }[] = [
  { key: "tudo", label: "Tudo" },
  { key: "ia", label: "IA" },
  { key: "humano", label: "Humano" },
  { key: "inativo", label: "Inativo" },
];

const SEGMENTO_STYLES: Record<string, string> = {
  vip: "bg-brand-light text-brand",
  recorrente: "bg-success-bg text-success",
  casual: "bg-info-bg text-info",
  em_risco: "bg-warning-bg text-warning",
  novo: "bg-[var(--vorax-purple-bg)] text-[var(--vorax-purple)]",
};

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d}d`;
  return formatDate(dateStr);
}

function heatLabel(score: number) {
  if (score >= 80) return { emoji: "🔥", label: "Quente", cls: "text-warning" };
  if (score >= 60) return { emoji: "⚡", label: "Ativo", cls: "text-brand" };
  if (score >= 40) return { emoji: "●", label: "Morno", cls: "text-muted-brand" };
  return { emoji: "❄️", label: "Frio", cls: "text-info" };
}

function dayLabel(d: Date): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cmp = new Date(d); cmp.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - cmp.getTime()) / 86_400_000);
  if (diff === 0) return "HOJE";
  if (diff === 1) return "ONTEM";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function Avatar({ name, url, size = 40 }: { name: string | null; url?: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const [bg, fg] = getAvatarColors(name);
  if (!imgError && url && url !== "null" && url !== "=" && url !== "undefined") {
    return (
      <img src={url} alt={name ?? ""} width={size} height={size}
        className="rounded-full object-cover shrink-0" style={{ width: size, height: size }}
        onError={() => setImgError(true)} />
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 text-[11px] font-medium"
      style={{ width: size, height: size, background: bg + "33", color: fg }}>
      {getInitials(name)}
    </div>
  );
}

// — Inbox lead card —
function InboxCard({
  lead,
  conversas,
  isActive,
  onClick,
}: {
  lead: Lead;
  conversas: Conversa[];
  isActive: boolean;
  onClick: () => void;
}) {
  const sorted = conversas.filter((c) => c.lead_id === lead.id).sort((a, b) => new Date(b.enviado_em).getTime() - new Date(a.enviado_em).getTime());
  const last = sorted[0];
  const lastDate = last?.enviado_em ?? lead.criado_em;
  const preview = last ? (last.origem === "agente" ? "🤖 " : "") + last.mensagem.substring(0, 55) : "Sem mensagens ainda";

  return (
    <div
      onClick={onClick}
      className={cn(
        "grid grid-cols-[36px_1fr] gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors mb-0.5 relative border-l-2",
        isActive ? "bg-brand-light border-l-brand" : "border-l-transparent hover:bg-surface-2"
      )}
    >
      <Avatar name={lead.nome} url={lead.foto_url} size={36} />
      <div className="min-w-0 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-text truncate">{lead.nome || lead.telefone}</span>
          <span className="text-[10px] text-muted-brand font-mono shrink-0">{relativeTime(lastDate)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ScoreBadge score={lead.score} status={lead.status_atividade} />
          <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
            lead.status === "agendado" ? "bg-success-bg text-success" : "bg-surface-2 text-muted-brand")}>
            {lead.status}
          </span>
        </div>
        <div className="text-xs text-muted-brand truncate">{preview}</div>
      </div>
    </div>
  );
}

// — Message bubble —
function MsgBubble({ msg }: { msg: Conversa | { id: string; origem: string; mensagem: string; enviado_em: string; optimistic?: boolean } }) {
  const isAgente = msg.origem === "agente";
  const isHumano = msg.origem === "humano" || msg.origem === "colaborador";
  const right = isAgente || isHumano;
  const time = new Date(msg.enviado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={cn("flex gap-2 items-end mb-2", right ? "flex-row-reverse self-end max-w-[70%]" : "self-start max-w-[70%]")}>
      <div className="flex flex-col">
        {isAgente && <div className="text-[9px] text-brand font-semibold tracking-wider mb-1 text-right uppercase">A VoraX</div>}
        {isHumano && <div className="text-[9px] text-muted-brand font-semibold tracking-wider mb-1 text-right uppercase">Você</div>}
        <div className={cn(
          "px-4 py-2.5 text-sm leading-relaxed break-words",
          isAgente && "bg-accent-light text-text rounded-2xl rounded-tr-sm",
          isHumano && "bg-brand-light text-brand rounded-2xl rounded-tr-sm border border-brand/20",
          !right && "bg-surface-2 text-text rounded-2xl rounded-tl-sm",
          ("optimistic" in msg && msg.optimistic) && "opacity-60"
        )}>
          {msg.mensagem}
        </div>
        <div className={cn("text-[10px] text-muted-brand mt-1 font-mono", right ? "text-right" : "text-left")}>{time}</div>
      </div>
    </div>
  );
}

// — Chat col —
function ChatCol({
  lead,
  conversas,
  agendamentos,
  onBack,
  onLeadUpdate,
}: {
  lead: Lead;
  conversas: Conversa[];
  agendamentos: Agendamento[];
  onBack: () => void;
  onLeadUpdate: (l: Lead) => void;
}) {
  const [msgs, setMsgs] = useState(conversas);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [localLead, setLead] = useState(lead);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLead(lead); }, [lead]);
  useEffect(() => { setMsgs(conversas); }, [conversas]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  // Fetch msgs when lead changes
  useEffect(() => {
    const sb = createClient();
    sb.from("conversas").select("*").eq("lead_id", lead.id).order("enviado_em").then(({ data }) => {
      if (data) setMsgs(data);
    });
  }, [lead.id]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || !lead.telefone) return;
    setSending(true);
    setInput("");

    const tempMsg = { id: `tmp-${Date.now()}`, lead_id: lead.id, origem: "humano" as const, mensagem: text, enviado_em: new Date().toISOString(), optimistic: true };
    setMsgs((prev) => [...prev, tempMsg]);

    try {
      // Auto-pause IA
      if (!localLead.ia_pausada) {
        const sb = createClient();
        const pauseFields = { ia_pausada: true, pausada_em: new Date().toISOString(), pausada_por: "humano", motivo_pausa: "pausada ao enviar mensagem pelo CRM" };
        await sb.from("leads").update(pauseFields).eq("id", lead.id);
        const updated = { ...localLead, ...pauseFields };
        setLead(updated);
        onLeadUpdate(updated);
      }

      const res = await fetch(N8N_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, telefone: lead.telefone, mensagem: text }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);

      setMsgs((prev) => prev.map((m) => (m.id === tempMsg.id ? { ...m, optimistic: false } : m)));
    } catch (err) {
      toast.error("Erro ao enviar: " + (err as Error).message);
      setMsgs((prev) => prev.filter((m) => m.id !== tempMsg.id));
    } finally {
      setSending(false);
    }
  }

  async function toggleIA() {
    const sb = createClient();
    const next = !localLead.ia_pausada;
    const fields = next
      ? { ia_pausada: true, pausada_em: new Date().toISOString(), pausada_por: "humano", motivo_pausa: "pausada manualmente via CRM" }
      : { ia_pausada: false, pausada_em: null, pausada_por: null, motivo_pausa: null };
    const { error } = await sb.from("leads").update(fields).eq("id", lead.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    const updated = { ...localLead, ...fields };
    setLead(updated);
    onLeadUpdate(updated);
    toast.info(next ? "IA pausada — você está no controle" : "IA retomada");
  }

  // Group msgs by day
  const grouped: { day: string; msgs: typeof msgs }[] = [];
  let lastDay = "";
  msgs.forEach((m) => {
    const d = new Date(m.enviado_em);
    const dk = d.toDateString();
    if (dk !== lastDay) { grouped.push({ day: dayLabel(d), msgs: [] }); lastDay = dk; }
    grouped[grouped.length - 1].msgs.push(m);
  });

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg border-r border-border-subtle">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-border-subtle min-h-[64px] shrink-0">
        <button onClick={onBack} className="lg:hidden text-muted-brand hover:text-text">
          <ChevronLeft size={20} />
        </button>
        <Avatar name={lead.nome} url={lead.foto_url} size={40} />
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-[20px] font-medium leading-tight">{lead.nome || lead.telefone}</h3>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-brand font-mono mt-0.5 flex-wrap">
            <span>{formatPhone(lead.telefone)}</span>
            {(() => { const h = heatLabel(lead.score ?? 0); return (
              <><span className="opacity-40">·</span>
              <span>{h.emoji} <span className={h.cls}>{h.label}</span></span>
              <span className="opacity-40">·</span>
              <span>{lead.score ?? 0}</span></>
            ); })()}
            {localLead.ia_pausada && (
              <>
                <span className="opacity-40">·</span>
                <span className="text-danger font-semibold">IA pausada</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={toggleIA}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] font-bold tracking-[0.08em] border transition-all",
            localLead.ia_pausada
              ? "border-border-strong bg-surface-2 text-muted-brand hover:border-brand hover:text-brand"
              : "border-brand bg-brand-light text-brand hover:bg-brand hover:text-white"
          )}
        >
          <div className={cn("w-1.5 h-1.5 rounded-full", localLead.ia_pausada ? "" : "animate-pulse bg-current")} />
          {localLead.ia_pausada ? "IA PAUSADA" : "IA ATIVA"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col min-h-0">
        {grouped.length === 0 ? (
          <div className="m-auto text-center text-muted-brand">
            <p className="text-sm">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          grouped.map(({ day, msgs: dayMsgs }) => (
            <div key={day}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border-subtle" />
                <span className="text-[10px] text-muted-brand font-semibold tracking-wider uppercase">{day}</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
              {dayMsgs.map((m) => <MsgBubble key={m.id} msg={m} />)}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="shrink-0 bg-surface border-t border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Digite uma mensagem…"
            className="flex-1 bg-surface-2 border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-muted-brand focus:outline-none focus:border-brand transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand text-white hover:bg-accent2 transition-colors disabled:opacity-40 shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="mt-2 text-[10px] text-muted-brand flex items-center gap-1 justify-center">
          {localLead.ia_pausada ? (
            <><span>Você está atendendo.</span>
              <button onClick={toggleIA} className="text-brand font-semibold hover:underline ml-1">Retomar a VoraX.</button>
            </>
          ) : (
            <><span>A VoraX está gerenciando automaticamente.</span>
              <button onClick={toggleIA} className="text-brand font-semibold hover:underline ml-1">Pausar e assumir.</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// — Details panel —
function DetailsPanel({ lead, agendamentos, onLeadUpdate }: {
  lead: Lead;
  agendamentos: Agendamento[];
  onLeadUpdate?: (l: Lead) => void;
}) {
  const [localLead, setLocalLead] = useState(lead);
  useEffect(() => { setLocalLead(lead); }, [lead]);

  const leadAgends = agendamentos
    .filter((a) => a.lead_id === lead.id)
    .sort((a, b) => new Date(b.data_agendamento ?? 0).getTime() - new Date(a.data_agendamento ?? 0).getTime());
  const ltv = leadAgends
    .filter((a) => a.status !== "cancelado" && a.valor)
    .reduce((s, a) => s + Number(a.valor ?? 0), 0);

  async function toggleFollowUp() {
    const sb = createClient();
    const next = !localLead.followup_optout;
    const { error } = await sb.from("leads").update({ followup_optout: next }).eq("id", lead.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    const updated = { ...localLead, followup_optout: next };
    setLocalLead(updated);
    onLeadUpdate?.(updated);
    toast.success(next ? "Follow-up pausado" : "Follow-up reativado");
  }

  return (
    <div className="bg-surface overflow-y-auto flex flex-col h-full">
      {/* Lead header */}
      <div className="px-5 pt-6 pb-4 border-b border-border-subtle">
        <div className="flex items-start gap-3 mb-3">
          <Avatar name={lead.nome} url={lead.foto_url} size={52} />
          <div className="min-w-0 flex-1 pt-0.5">
            <h4 className="font-display text-[19px] font-medium leading-tight text-text">{lead.nome || "—"}</h4>
            <p className="text-[11px] text-muted-brand font-mono mt-0.5">{formatPhone(lead.telefone)}</p>
          </div>
        </div>
        {lead.segmento && (
          <span className={cn("inline-block text-[9px] font-bold tracking-[0.1em] px-2.5 py-1 rounded-full uppercase", SEGMENTO_STYLES[lead.segmento] ?? "bg-surface-2 text-muted-brand")}>
            {lead.segmento.replace("_", " ")}
          </span>
        )}
      </div>

      {/* LTV proeminente */}
      <div className="px-5 py-4 border-b border-border-subtle">
        <div className="text-[9px] font-bold tracking-[0.14em] text-muted-brand uppercase mb-1.5">Valor Total do Cliente</div>
        <div className="font-mono text-[28px] font-semibold text-brand leading-none mb-3">
          {ltv > 0 ? formatCurrency(ltv) : "R$ 0"}
        </div>
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[8px] text-muted-brand uppercase tracking-[0.1em]">Agendamentos</div>
            <div className="font-mono text-[15px] font-bold text-text">{leadAgends.length}</div>
          </div>
          <div className="w-px h-7 bg-border-subtle" />
          <div>
            <div className="text-[8px] text-muted-brand uppercase tracking-[0.1em]">Realizados</div>
            <div className="font-mono text-[15px] font-bold text-success">{leadAgends.filter((a) => a.status === "realizado").length}</div>
          </div>
          <div className="w-px h-7 bg-border-subtle" />
          <div>
            <div className="text-[8px] text-muted-brand uppercase tracking-[0.1em]">Score</div>
            <div className="font-mono text-[15px] font-bold text-text">{lead.score ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Contato */}
      <div className="px-5 py-4 border-b border-border-subtle">
        <div className="text-[9px] font-bold tracking-[0.14em] text-muted-brand uppercase mb-2.5">Contato</div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Phone size={11} className="text-muted-brand shrink-0" />
            <span className="font-mono text-[12px] text-text">{formatPhone(lead.telefone)}</span>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-muted-brand text-[10px]">Origem:</span>
            <span className="text-text-2 capitalize">{lead.canal || "whatsapp"}</span>
          </div>
        </div>
      </div>

      {/* Follow-up automático */}
      <div className="px-5 py-4 border-b border-border-subtle">
        <div className="text-[9px] font-bold tracking-[0.14em] text-muted-brand uppercase mb-2.5">Follow-up Automático</div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className={cn("text-[12.5px] font-semibold", localLead.followup_optout ? "text-danger" : "text-success")}>
              {localLead.followup_optout ? "Pausado" : "Ativo"}
            </div>
            <div className="text-[10.5px] text-muted-brand mt-0.5 leading-snug">
              {localLead.followup_optout ? "Sem envios automáticos" : "Conforme cadência"}
            </div>
          </div>
          <button
            onClick={toggleFollowUp}
            className={cn(
              "w-11 h-6 rounded-full transition-all duration-200 relative shrink-0 focus:outline-none",
              localLead.followup_optout ? "bg-surface-3" : "bg-success"
            )}
          >
            <span className={cn(
              "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200",
              localLead.followup_optout ? "left-0.5" : "left-5"
            )} />
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="px-5 py-4 border-b border-border-subtle">
        <div className="text-[9px] font-bold tracking-[0.14em] text-muted-brand uppercase mb-2.5">Tags</div>
        <div className="flex flex-wrap gap-1.5">
          {lead.segmento && (
            <span className={cn("text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.06em]", SEGMENTO_STYLES[lead.segmento] ?? "bg-surface-2 text-muted-brand")}>
              {lead.segmento.replace("_", " ")}
            </span>
          )}
          {(lead.score ?? 0) >= 70 && (
            <span className="text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.06em] bg-brand-light text-brand border border-brand/20">
              Prioridade
            </span>
          )}
          {lead.status_atividade === "dormente" && (
            <span className="text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.06em] bg-warning-bg text-warning">
              Dormente
            </span>
          )}
          {localLead.ia_pausada && (
            <span className="text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.06em] bg-danger-bg text-danger">
              IA pausada
            </span>
          )}
          {!lead.segmento && (lead.score ?? 0) < 70 && !localLead.ia_pausada && lead.status_atividade !== "dormente" && (
            <span className="text-[11px] text-muted-brand">—</span>
          )}
        </div>
      </div>

      {/* Análise IA — sempre visível */}
      <div className="px-5 py-4 border-b border-border-subtle">
        <div className="text-[9px] font-bold tracking-[0.14em] text-muted-brand uppercase mb-2">Análise IA</div>
        {lead.analise_motivo ? (
          <>
            <div className="text-[12px] font-semibold text-text capitalize">{lead.analise_motivo.replace(/_/g, " ")}</div>
            {lead.analise_resumo && (
              <p className="text-[11px] text-text-2 italic mt-1.5 leading-relaxed pl-2.5 border-l-2 border-brand/40">{lead.analise_resumo}</p>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-[11.5px] text-muted-brand">
            <span className="w-1.5 h-1.5 rounded-full bg-surface-3 inline-block shrink-0" />
            Análise não disponível
          </div>
        )}
      </div>

      {/* Histórico */}
      {leadAgends.length > 0 && (
        <div className="px-5 py-4">
          <div className="text-[9px] font-bold tracking-[0.14em] text-muted-brand uppercase mb-2.5">Histórico</div>
          <div className="flex flex-col gap-3">
            {leadAgends.slice(0, 5).map((a) => (
              <div key={a.id} className="grid grid-cols-[44px_1fr] gap-2">
                <div className="font-mono text-muted-brand text-[10px] leading-tight pt-0.5">
                  {a.data_agendamento ? new Date(a.data_agendamento).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—"}
                </div>
                <div>
                  <div className="text-[11.5px] text-text leading-tight">{a.servico || "Serviço"}</div>
                  {a.valor && <div className="text-brand font-semibold font-mono text-[10px] mt-0.5">{formatCurrency(a.valor)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// — Main —
export function ConversasPage({
  leads,
  conversas: initialConversas,
  agendamentos,
}: {
  leads: Lead[];
  conversas: Conversa[];
  agendamentos: Agendamento[];
}) {
  const [tab, setTab] = useState<InboxTab>("tudo");
  const [segFilter, setSegFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localLeads, setLocalLeads] = useState(leads);

  const isInativo = (l: Lead) => {
    const diff = (Date.now() - new Date(l.criado_em).getTime()) / 86_400_000;
    return diff > 30;
  };

  const filteredLeads = useMemo(() => {
    let list = localLeads;
    if (tab === "ia") list = list.filter((l) => !l.ia_pausada && !isInativo(l));
    else if (tab === "humano") list = list.filter((l) => l.ia_pausada);
    else if (tab === "inativo") list = list.filter(isInativo);
    if (segFilter) list = list.filter((l) => l.segmento === segFilter);
    return list;
  }, [localLeads, tab, segFilter]);

  const tabCounts = useMemo(() => ({
    tudo: localLeads.length,
    ia: localLeads.filter((l) => !l.ia_pausada && !isInativo(l)).length,
    humano: localLeads.filter((l) => l.ia_pausada).length,
    inativo: localLeads.filter(isInativo).length,
  }), [localLeads]);

  const selectedLead = localLeads.find((l) => l.id === selectedId) ?? null;

  function handleLeadUpdate(updated: Lead) {
    setLocalLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  const SEGMENTS = ["vip", "recorrente", "casual", "em_risco", "novo"];

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Inbox */}
      <div className={cn(
        "w-80 shrink-0 flex flex-col bg-surface border-r border-border-subtle",
        selectedId && "hidden lg:flex"
      )}>
        {/* Inbox header */}
        <div className="px-4 pt-4 pb-3 border-b border-border-subtle shrink-0">
          <h2 className="font-display text-xl font-medium text-text mb-3">Conversas</h2>
          {/* Tabs */}
          <div className="grid grid-cols-4 gap-1.5">
            {INBOX_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-lg py-1.5 text-center cursor-pointer transition-colors border",
                  tab === key
                    ? "bg-brand-light border-brand"
                    : "bg-surface-2 border-transparent hover:border-border-subtle"
                )}
              >
                <span className={cn("text-[9px] font-semibold tracking-wider uppercase block mb-0.5", tab === key ? "text-brand" : "text-muted-brand")}>{label}</span>
                <span className={cn("font-mono text-xs font-bold", tab === key ? "text-brand" : "text-text")}>{tabCounts[key]}</span>
              </button>
            ))}
          </div>
          {/* Segmento chips */}
          <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-border-subtle">
            <button onClick={() => setSegFilter(null)} className={cn("text-[9px] font-semibold px-2.5 py-1 rounded-full border transition-colors", !segFilter ? "bg-brand-light text-brand border-brand/30" : "bg-surface-2 text-muted-brand border-transparent hover:bg-surface-3")}>
              Todos
            </button>
            {SEGMENTS.map((s) => (
              <button key={s} onClick={() => setSegFilter(s === segFilter ? null : s)}
                className={cn("text-[9px] font-semibold px-2.5 py-1 rounded-full border transition-colors capitalize", segFilter === s ? "bg-brand-light text-brand border-brand/30" : "bg-surface-2 text-muted-brand border-transparent hover:bg-surface-3")}>
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        {/* Lead list */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredLeads.length === 0 ? (
            <div className="py-12 text-center text-muted-brand text-sm">Nenhum cliente</div>
          ) : (
            filteredLeads.map((l) => (
              <InboxCard
                key={l.id}
                lead={l}
                conversas={initialConversas}
                isActive={selectedId === l.id}
                onClick={() => setSelectedId(l.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Chat */}
      {selectedLead ? (
        <>
          <div className={cn("flex-1 min-w-0 flex flex-col", !selectedId && "hidden lg:flex")}>
            <ChatCol
              lead={selectedLead}
              conversas={initialConversas}
              agendamentos={agendamentos}
              onBack={() => setSelectedId(null)}
              onLeadUpdate={handleLeadUpdate}
            />
          </div>
          {/* Details panel */}
          <div className="hidden xl:flex xl:flex-col w-[300px] shrink-0 border-l border-border-subtle overflow-hidden">
            <DetailsPanel lead={selectedLead} agendamentos={agendamentos} onLeadUpdate={handleLeadUpdate} />
          </div>
        </>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-muted-brand flex-col gap-3">
          <div className="text-5xl">💬</div>
          <div className="text-[15px]">Selecione uma conversa</div>
        </div>
      )}
    </div>
  );
}
