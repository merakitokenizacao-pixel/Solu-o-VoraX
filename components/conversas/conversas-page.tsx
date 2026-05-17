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
        "grid grid-cols-[40px_1fr] gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition-all mb-0.5 relative border-l-2",
        isActive ? "bg-brand-light border-l-brand" : "border-l-transparent hover:bg-surface-2"
      )}
    >
      <Avatar name={lead.nome} url={lead.foto_url} size={40} />
      <div className="min-w-0 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-text truncate">{lead.nome || lead.telefone}</span>
          <span className="text-[10px] text-muted-brand font-mono shrink-0">{relativeTime(lastDate)}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <ScoreBadge score={lead.score} status={lead.status_atividade} />
          <span className={cn("text-[8.5px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-[0.08em]",
            lead.status === "agendado" ? "bg-success-bg text-success" : "bg-surface-2 text-muted-brand")}>
            {lead.status}
          </span>
        </div>
        <div className="text-[11.5px] text-muted-brand truncate">{preview}</div>
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
    <div className={cn("flex gap-2 items-end mb-1.5", right ? "flex-row-reverse self-end max-w-[72%]" : "self-start max-w-[72%]")}>
      <div className="flex flex-col">
        {isAgente && <div className="text-[9px] text-brand font-bold tracking-[0.1em] mb-0.5 text-right">🤖 A VoraX</div>}
        {isHumano && <div className="text-[9px] font-bold tracking-[0.1em] mb-0.5 text-right" style={{ color: "var(--vorax-purple)" }}>👤 Você</div>}
        <div className={cn(
          "px-3.5 py-2.5 text-[13.5px] leading-[1.55] word-break-all",
          isAgente && "bg-brand text-white rounded-[4px_16px_16px_16px]",
          isHumano && "rounded-[4px_16px_16px_16px] border" ,
          !right && "bg-surface border border-border-subtle rounded-[4px_16px_16px_16px]",
          ("optimistic" in msg && msg.optimistic) && "opacity-60"
        )}
          style={isHumano ? { background: "var(--vorax-purple-bg)", color: "var(--vorax-purple)", borderColor: "var(--vorax-purple)" } : undefined}
        >
          {msg.mensagem}
        </div>
        <div className={cn("text-[10px] text-muted-brand mt-1 font-mono px-0.5", right ? "text-right" : "text-left")}>{time}</div>
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
      <div className="flex items-center gap-3.5 px-6 py-3.5 bg-surface border-b border-border-subtle min-h-[72px] shrink-0">
        <button onClick={onBack} className="lg:hidden text-muted-brand hover:text-text">
          <ChevronLeft size={20} />
        </button>
        <Avatar name={lead.nome} url={lead.foto_url} size={40} />
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-[20px] font-medium leading-tight">{lead.nome || lead.telefone}</h3>
          <div className="flex items-center gap-2 text-[11px] text-muted-brand font-mono mt-0.5">
            <span>{formatPhone(lead.telefone)}</span>
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
      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col min-h-0 gap-0.5">
        {grouped.length === 0 ? (
          <div className="m-auto text-center text-muted-brand text-sm">
            <div className="text-4xl mb-3">💬</div>
            Nenhuma mensagem ainda
          </div>
        ) : (
          grouped.map(({ day, msgs: dayMsgs }) => (
            <div key={day}>
              <div className="flex justify-center my-3">
                <span className="text-[10px] text-muted-brand font-mono bg-surface-2 px-3.5 py-1 rounded-full tracking-[0.05em]">{day}</span>
              </div>
              {dayMsgs.map((m) => <MsgBubble key={m.id} msg={m} />)}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="shrink-0 bg-surface border-t border-border-subtle">
        <div className="flex items-center gap-2.5 px-6 py-3.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Digite uma mensagem…"
            className="flex-1 bg-surface-2 border border-border-subtle rounded-xl px-4 py-2.5 text-[13.5px] text-text placeholder:text-muted-brand focus:outline-none focus:border-brand transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand text-white hover:opacity-85 transition-all disabled:opacity-40 shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="px-6 pb-2.5 text-[11px] text-muted-brand flex items-center gap-1.5 justify-center">
          {localLead.ia_pausada ? (
            <>👤 <span>Você está atendendo este cliente.</span>
              <button onClick={toggleIA} className="text-brand font-semibold hover:underline">Retomar a VoraX.</button>
            </>
          ) : (
            <>🔒 <span>A VoraX está gerenciando automaticamente.</span>
              <button onClick={toggleIA} className="text-brand font-semibold hover:underline">Pausar e assumir.</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// — Details panel —
function DetailsPanel({ lead, agendamentos }: { lead: Lead; agendamentos: Agendamento[] }) {
  const leadAgends = agendamentos.filter((a) => a.lead_id === lead.id).sort((a, b) => new Date(b.data_agendamento ?? 0).getTime() - new Date(a.data_agendamento ?? 0).getTime());
  const ltv = leadAgends.filter((a) => a.status !== "cancelado" && a.valor).reduce((s, a) => s + Number(a.valor ?? 0), 0);

  return (
    <div className="bg-surface overflow-y-auto flex flex-col">
      {/* Lead header */}
      <div className="px-5 pt-5 pb-4 border-b border-border-subtle flex items-center gap-3">
        <Avatar name={lead.nome} url={lead.foto_url} size={48} />
        <div className="min-w-0">
          <h4 className="font-display text-[22px] font-medium leading-tight text-text">{lead.nome || "—"}</h4>
          <p className="text-[11px] text-muted-brand mt-0.5">{formatPhone(lead.telefone)}</p>
          {lead.segmento && (
            <span className={cn("inline-block mt-1.5 text-[9.5px] font-bold tracking-[0.08em] px-2.5 py-0.5 rounded-full uppercase", SEGMENTO_STYLES[lead.segmento] ?? "bg-surface-2 text-muted-brand")}>
              {lead.segmento}
            </span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 px-5 py-3 border-b border-border-subtle">
        {[
          { label: "LTV", value: ltv > 0 ? formatCurrency(ltv) : "—" },
          { label: "Agendamentos", value: leadAgends.length },
          { label: "Realizados", value: leadAgends.filter((a) => a.status === "realizado").length },
          { label: "Score", value: lead.score },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-2 rounded-xl px-3 py-2.5">
            <div className="text-[9px] font-bold tracking-[0.1em] text-muted-brand mb-1 uppercase">{label}</div>
            <div className="font-mono text-[16px] font-semibold text-brand">{value}</div>
          </div>
        ))}
      </div>

      {/* IA analysis */}
      {lead.analise_motivo && (
        <div className="px-5 py-4 border-b border-border-subtle">
          <div className="text-[9px] font-bold tracking-[0.12em] text-muted-brand mb-2 uppercase">Análise IA — Sumiço</div>
          <div className="text-[12px] font-semibold text-text capitalize">{lead.analise_motivo}</div>
          {lead.analise_resumo && (
            <p className="text-[11.5px] text-text-2 italic mt-1.5 leading-relaxed pl-2.5 border-l-2 border-brand">{lead.analise_resumo}</p>
          )}
        </div>
      )}

      {/* Recent appointments */}
      {leadAgends.length > 0 && (
        <div className="px-5 py-4 border-b border-border-subtle">
          <div className="text-[9px] font-bold tracking-[0.12em] text-muted-brand mb-2.5 uppercase">Histórico</div>
          <div className="flex flex-col gap-2">
            {leadAgends.slice(0, 4).map((a) => (
              <div key={a.id} className="grid grid-cols-[40px_1fr] gap-2 text-[11.5px]">
                <div className="font-mono text-muted-brand text-[10px] leading-tight">
                  {a.data_agendamento ? new Date(a.data_agendamento).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—"}
                </div>
                <div>
                  <div className="text-text leading-tight">{a.servico || "Serviço"}</div>
                  {a.valor && <div className="text-brand font-semibold font-mono text-[10px]">{formatCurrency(a.valor)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up status */}
      <div className="px-5 py-4">
        <div className="text-[9px] font-bold tracking-[0.12em] text-muted-brand mb-1 uppercase">Follow-up</div>
        <div className={cn("text-[12.5px]", lead.followup_optout ? "text-danger" : "text-success")}>
          {lead.followup_optout ? "Pausado (opt-out)" : "Ativo"}
        </div>
      </div>
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
        "w-[340px] shrink-0 flex flex-col bg-surface border-r border-border-subtle",
        selectedId && "hidden lg:flex"
      )}>
        {/* Inbox header */}
        <div className="px-5 pt-5 pb-3 border-b border-border-subtle shrink-0">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-display text-[24px] font-medium">Conversas</h2>
          </div>
          {/* Tabs */}
          <div className="grid grid-cols-4 gap-1.5">
            {INBOX_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-lg py-2 text-center cursor-pointer transition-all border",
                  tab === key
                    ? "bg-brand-light border-brand"
                    : "bg-surface-2 border-border-subtle hover:border-border-strong"
                )}
              >
                <span className={cn("text-[9px] font-bold tracking-[0.08em] block mb-0.5", tab === key ? "text-brand" : "text-muted-brand")}>{label}</span>
                <span className={cn("font-mono text-[12px] font-semibold", tab === key ? "text-brand" : "text-text")}>{tabCounts[key]}</span>
              </button>
            ))}
          </div>
          {/* Segmento chips */}
          <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-border-subtle">
            <button onClick={() => setSegFilter(null)} className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-xl border transition-all", !segFilter ? "bg-brand-light text-brand border-brand" : "bg-surface-2 text-muted-brand border-transparent hover:bg-surface-3")}>
              Todos
            </button>
            {SEGMENTS.map((s) => (
              <button key={s} onClick={() => setSegFilter(s === segFilter ? null : s)}
                className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-xl border transition-all capitalize", segFilter === s ? "bg-brand-light text-brand border-brand" : "bg-surface-2 text-muted-brand border-transparent hover:bg-surface-3")}>
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        {/* Lead list */}
        <div className="flex-1 overflow-y-auto p-1.5">
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
          <div className="hidden xl:block w-[280px] shrink-0 overflow-y-auto border-l border-border-subtle">
            <DetailsPanel lead={selectedLead} agendamentos={agendamentos} />
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
