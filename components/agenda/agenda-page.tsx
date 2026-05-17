"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/types";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Agendamento = Tables<"agendamentos"> & {
  leads?: { nome: string | null; telefone: string; foto_url: string | null } | null;
};
type Lead = Tables<"leads">;

const HOUR_START = 8;
const HOUR_END = 20;
const CELL_H = 60; // px
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  pendente:   { bg: "bg-warning-bg",  border: "border-warning/30",   text: "text-warning",  dot: "bg-warning" },
  confirmado: { bg: "bg-[var(--vorax-purple-bg)]", border: "border-[var(--vorax-purple)]/30", text: "text-[var(--vorax-purple)]", dot: "bg-[var(--vorax-purple)]" },
  realizado:  { bg: "bg-success-bg",  border: "border-success/30",   text: "text-success",  dot: "bg-success" },
  cancelado:  { bg: "bg-danger-bg",   border: "border-danger/30",    text: "text-danger",   dot: "bg-danger" },
  faltou:     { bg: "bg-surface-2",   border: "border-border-subtle", text: "text-muted-brand", dot: "bg-muted-brand" },
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// — Edit sheet —
function AgendSheet({
  agend,
  onClose,
  onUpdate,
}: {
  agend: Agendamento | null;
  onClose: () => void;
  onUpdate: (id: string, status: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  if (!agend) return null;

  const dt = agend.data_agendamento ? new Date(agend.data_agendamento) : null;
  const sc = STATUS_CONFIG[agend.status] ?? STATUS_CONFIG.pendente;

  async function updateStatus(status: string) {
    if (!agend) return;
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from("agendamentos").update({ status }).eq("id", agend.id);
    if (error) { toast.error("Erro ao atualizar: " + error.message); }
    else { toast.success("Status atualizado"); onUpdate(agend.id, status); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md mx-4 sm:mx-auto overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border-subtle flex items-start justify-between">
          <div>
            <h3 className="font-display text-[20px] font-medium text-text">
              {agend.leads?.nome || "Cliente"}
            </h3>
            <p className="text-[11px] text-muted-brand font-mono mt-0.5">
              {agend.leads?.telefone}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-brand hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-3 gap-2 px-6 py-4 border-b border-border-subtle">
          {[
            { label: "Serviço", value: agend.servico || "—" },
            { label: "Data", value: dt ? dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—" },
            { label: "Horário", value: dt ? dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-2 rounded-xl px-3 py-2.5">
              <div className="text-[9px] font-bold tracking-[0.1em] text-muted-brand mb-1 uppercase">{label}</div>
              <div className="text-[12px] font-medium text-brand">{value}</div>
            </div>
          ))}
        </div>

        {agend.valor && (
          <div className="px-6 py-3 border-b border-border-subtle">
            <span className="text-[11px] text-muted-brand">Valor: </span>
            <span className="text-[13px] font-semibold text-success font-mono">{formatCurrency(agend.valor)}</span>
          </div>
        )}

        {/* Status buttons */}
        <div className="px-6 py-4">
          <p className="text-[9px] font-bold tracking-[0.12em] text-muted-brand mb-3 uppercase">Atualizar status</p>
          <div className="flex flex-wrap gap-2">
            {["pendente", "confirmado", "realizado", "cancelado", "faltou"].map((s) => {
              const cfg = STATUS_CONFIG[s] ?? STATUS_CONFIG.pendente;
              return (
                <button
                  key={s}
                  disabled={saving}
                  onClick={() => updateStatus(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-semibold border capitalize transition-all",
                    agend.status === s
                      ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-1 ring-current`
                      : "bg-surface-2 text-muted-brand border-border-subtle hover:border-border-strong"
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// — New appointment form —
function NewAgendSheet({
  defaultDate,
  defaultHour,
  leads,
  onClose,
  onCreated,
}: {
  defaultDate: string;
  defaultHour: number;
  leads: Lead[];
  onClose: () => void;
  onCreated: (a: Agendamento) => void;
}) {
  const [leadId, setLeadId] = useState("");
  const [servico, setServico] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [hour, setHour] = useState(String(defaultHour).padStart(2, "0") + ":00");
  const [status, setStatus] = useState("pendente");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!leadId || !servico || !date || !hour) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSaving(true);
    const sb = createClient();
    const { data, error } = await sb
      .from("agendamentos")
      .insert({ lead_id: leadId, servico, data_agendamento: `${date}T${hour}:00`, status, origem: "manual" })
      .select()
      .single();
    if (error) { toast.error("Erro: " + error.message); setSaving(false); return; }
    await sb.from("leads").update({ status: "agendado" }).eq("id", leadId);
    toast.success("Agendamento criado!");
    onCreated(data as Agendamento);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md mx-4 sm:mx-auto overflow-hidden shadow-xl">
        <div className="px-6 pt-6 pb-4 border-b border-border-subtle flex justify-between items-center">
          <h3 className="font-display text-[20px] font-medium text-text">Novo agendamento</h3>
          <button onClick={onClose} className="text-muted-brand hover:text-text"><X size={18} /></button>
        </div>

        <div className="px-6 py-4 flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-semibold text-muted-brand uppercase tracking-[0.08em] mb-1 block">Cliente</label>
            <select value={leadId} onChange={(e) => setLeadId(e.target.value)}
              className="w-full bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-brand">
              <option value="">Selecione...</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.nome || l.telefone}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-brand uppercase tracking-[0.08em] mb-1 block">Serviço</label>
            <input value={servico} onChange={(e) => setServico(e.target.value)}
              placeholder="Ex: Botox, Preenchimento..."
              className="w-full bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text placeholder:text-muted-brand focus:outline-none focus:border-brand" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-brand uppercase tracking-[0.08em] mb-1 block">Data</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-brand uppercase tracking-[0.08em] mb-1 block">Horário</label>
              <input type="time" value={hour} onChange={(e) => setHour(e.target.value)}
                className="w-full bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-brand" />
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="w-full bg-brand text-white rounded-xl py-2.5 text-[13px] font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60">
            {saving ? "Salvando..." : "Criar agendamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// — Week grid —
function WeekGrid({
  weekDays,
  agendamentos,
  onCellClick,
  onEventClick,
}: {
  weekDays: Date[];
  agendamentos: Agendamento[];
  onCellClick: (date: string, hour: number) => void;
  onEventClick: (a: Agendamento) => void;
}) {
  const today = new Date();

  const eventsByDayHour = useMemo(() => {
    const map: Record<string, Record<number, Agendamento[]>> = {};
    const weekStart = weekDays[0].getTime();
    const weekEnd = new Date(weekDays[6]).setHours(23, 59, 59, 999);

    agendamentos.forEach((a) => {
      if (!a.data_agendamento) return;
      const dt = new Date(a.data_agendamento);
      if (dt.getTime() < weekStart || dt.getTime() > weekEnd) return;
      const dayKey = dt.toISOString().split("T")[0];
      const h = dt.getHours();
      if (h < HOUR_START || h > HOUR_END) return;
      if (!map[dayKey]) map[dayKey] = {};
      if (!map[dayKey][h]) map[dayKey][h] = [];
      map[dayKey][h].push(a);
    });
    return map;
  }, [agendamentos, weekDays]);

  return (
    <div className="overflow-x-auto border border-border-subtle rounded-[18px] bg-surface">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `60px repeat(7, minmax(100px, 1fr))`,
          minWidth: 820,
        }}
      >
        {/* Header row */}
        <div className="border-b border-r border-border-subtle h-16 bg-surface" />
        {weekDays.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div
              key={i}
              className={cn(
                "h-16 border-b border-r border-border-subtle last:border-r-0 flex flex-col items-center justify-center gap-1",
                isToday && "bg-brand-light"
              )}
            >
              <span className={cn("text-[10px] font-medium tracking-[0.14em] uppercase", isToday ? "text-brand" : "text-muted-brand")}>
                {WEEKDAYS[d.getDay()]}
              </span>
              <span
                className={cn(
                  "font-display text-[20px] font-light leading-none",
                  isToday
                    ? "w-8 h-8 flex items-center justify-center rounded-full bg-brand text-white text-[16px]"
                    : "text-text"
                )}
              >
                {d.getDate()}
              </span>
            </div>
          );
        })}

        {/* Hour rows */}
        {HOURS.map((h) => (
          <>
            <div
              key={`hour-${h}`}
              className="border-r border-b border-border-subtle flex items-start justify-end pr-2 pt-1"
              style={{ height: CELL_H }}
            >
              <span className="text-[10px] font-mono text-muted-brand">{String(h).padStart(2, "0")}:00</span>
            </div>
            {weekDays.map((d, di) => {
              const dateStr = d.toISOString().split("T")[0];
              const isToday = isSameDay(d, today);
              const events = eventsByDayHour[dateStr]?.[h] ?? [];
              const isCurrentHour = isToday && new Date().getHours() === h;

              return (
                <div
                  key={`${h}-${di}`}
                  className={cn(
                    "border-r border-b border-border-subtle last:border-r-0 relative cursor-pointer hover:bg-surface-2 transition-colors",
                    isToday && "bg-brand-light/30"
                  )}
                  style={{ height: CELL_H }}
                  onClick={() => onCellClick(dateStr, h)}
                >
                  {/* Current time line */}
                  {isCurrentHour && (
                    <div
                      className="absolute inset-x-0 h-[2px] bg-brand z-10 pointer-events-none"
                      style={{ top: `${(new Date().getMinutes() / 60) * CELL_H}px` }}
                    />
                  )}
                  {/* Events */}
                  {events.map((a) => {
                    const dt = new Date(a.data_agendamento!);
                    const top = (dt.getMinutes() / 60) * CELL_H;
                    const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.pendente;
                    return (
                      <div
                        key={a.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick(a); }}
                        className={cn(
                          "absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 border text-left overflow-hidden z-20 hover:z-30 hover:scale-[1.02] transition-all cursor-pointer",
                          cfg.bg, cfg.border
                        )}
                        style={{ top, height: CELL_H - 6, minHeight: 24 }}
                      >
                        <div className={cn("text-[9px] font-mono leading-tight", cfg.text)}>
                          {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-[10px] font-medium text-text leading-tight truncate">
                          {a.leads?.nome || "Cliente"}
                        </div>
                        <div className={cn("text-[9px] leading-tight truncate", cfg.text)}>
                          {a.servico || "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

// — Main —
export function AgendaPage({
  initialAgendamentos,
  leads,
}: {
  initialAgendamentos: Agendamento[];
  leads: Lead[];
}) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [agendamentos, setAgendamentos] = useState(initialAgendamentos);
  const [editAgend, setEditAgend] = useState<Agendamento | null>(null);
  const [newAgend, setNewAgend] = useState<{ date: string; hour: number } | null>(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const monthLabel = useMemo(() => {
    const months = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    const s = weekDays[0].getMonth(), e = weekDays[6].getMonth();
    const y = weekDays[6].getFullYear();
    if (s === e) return `${months[s]} de ${y}`;
    const short = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
    return `${short[s]} – ${short[e]} ${y}`;
  }, [weekDays]);

  const upcomingToday = useMemo(() => {
    const today = new Date();
    return agendamentos
      .filter((a) => a.data_agendamento && isSameDay(new Date(a.data_agendamento), today) && a.status !== "cancelado")
      .sort((a, b) => new Date(a.data_agendamento!).getTime() - new Date(b.data_agendamento!).getTime());
  }, [agendamentos]);

  function handleUpdate(id: string, status: string) {
    setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    setEditAgend((prev) => (prev?.id === id ? { ...prev, status } : prev));
  }

  function handleCreated(a: Agendamento) {
    setAgendamentos((prev) => [...prev, a]);
  }

  return (
    <div className="p-6 lg:p-10 pb-24 lg:pb-10">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekStart((d) => addDays(d, -7))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-2 border border-border-subtle text-muted-brand hover:text-text transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="px-3 py-1.5 rounded-lg bg-surface-2 border border-border-subtle text-[11px] font-medium text-muted-brand hover:text-text transition-colors">
            Hoje
          </button>
          <button onClick={() => setWeekStart((d) => addDays(d, 7))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-2 border border-border-subtle text-muted-brand hover:text-text transition-colors">
            <ChevronRight size={16} />
          </button>
          <span className="font-display text-[18px] font-light text-text capitalize ml-1">{monthLabel}</span>
        </div>
        <button
          onClick={() => setNewAgend({ date: new Date().toISOString().split("T")[0], hour: new Date().getHours() || 9 })}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-xl text-[13px] font-semibold hover:bg-brand-dark transition-colors"
        >
          <Plus size={14} /> Novo agendamento
        </button>
      </div>

      {/* Today's strip */}
      {upcomingToday.length > 0 && (
        <div className="mb-6 p-4 bg-brand-light border border-brand/20 rounded-[18px]">
          <p className="text-[10px] font-bold tracking-[0.12em] text-brand uppercase mb-3">Hoje — {upcomingToday.length} agendamentos</p>
          <div className="flex flex-wrap gap-2">
            {upcomingToday.map((a) => {
              const dt = new Date(a.data_agendamento!);
              const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.pendente;
              return (
                <button
                  key={a.id}
                  onClick={() => setEditAgend(a)}
                  className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] transition-colors hover:opacity-80", cfg.bg, cfg.border)}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                  <span className="font-mono text-muted-brand">{dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="text-text font-medium">{a.leads?.nome || "Cliente"}</span>
                  <span className={cfg.text}>{a.servico || "—"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Week grid */}
      <WeekGrid
        weekDays={weekDays}
        agendamentos={agendamentos}
        onCellClick={(date, hour) => setNewAgend({ date, hour })}
        onEventClick={(a) => setEditAgend(a)}
      />

      {/* Modals */}
      {editAgend && (
        <AgendSheet agend={editAgend} onClose={() => setEditAgend(null)} onUpdate={handleUpdate} />
      )}
      {newAgend && (
        <NewAgendSheet
          defaultDate={newAgend.date}
          defaultHour={newAgend.hour}
          leads={leads}
          onClose={() => setNewAgend(null)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
