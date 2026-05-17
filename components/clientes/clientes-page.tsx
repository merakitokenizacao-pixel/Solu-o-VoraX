"use client";

import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, X, Phone, Calendar, MessageCircle, TrendingUp } from "lucide-react";
import { Tables } from "@/lib/supabase/types";
import { ScoreBadge } from "@/components/ui/score-badge";
import { formatPhone, formatDate, formatCurrency, getAvatarColors, getInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";

type Lead = Tables<"leads">;
type Agendamento = Tables<"agendamentos">;
type SortCol = "score" | "nome" | "criado_em";
type SortDir = "asc" | "desc";

const STATUS_STYLES: Record<string, string> = {
  novo: "bg-info-bg text-info",
  agendado: "bg-[var(--vorax-gold-light)] text-gold",
  convertido: "bg-success-bg text-success",
  realizado: "bg-success-bg text-success",
  cancelado: "bg-danger-bg text-danger",
  cicloencerrado: "bg-surface-3 text-muted-brand",
};

const SEGMENTO_STYLES: Record<string, string> = {
  vip: "bg-brand-light text-brand border border-brand",
  recorrente: "bg-success-bg text-success",
  casual: "bg-info-bg text-info",
  em_risco: "bg-warning-bg text-warning",
  novo: "bg-[var(--vorax-purple-bg)] text-[var(--vorax-purple)]",
};

const SEGMENTO_LABELS: Record<string, string> = {
  vip: "VIP",
  recorrente: "Recorrente",
  casual: "Casual",
  em_risco: "Em risco",
  novo: "Novo",
};

const MOTIVO_LABELS: Record<string, { label: string; color: string }> = {
  preco: { label: "Preço", color: "text-danger" },
  agenda: { label: "Agenda", color: "text-warning" },
  insatisfacao: { label: "Insatisfação", color: "text-danger" },
  circunstancial: { label: "Circunstancial", color: "text-info" },
  indefinido: { label: "Indefinido", color: "text-muted-brand" },
};

function Avatar({ name, url, size = 36 }: { name: string | null; url?: string | null; size?: number }) {
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
    <div className="rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium"
      style={{ width: size, height: size, background: bg + "33", color: fg }}>
      {getInitials(name)}
    </div>
  );
}

function SortIcon({ col, current, dir }: { col: SortCol; current: SortCol; dir: SortDir }) {
  if (col !== current) return <ChevronsUpDown size={12} className="opacity-30" />;
  return dir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />;
}

// — Lead Detail Sheet —
function LeadSheet({
  lead,
  agendamentos,
  onClose,
}: {
  lead: Lead | null;
  agendamentos: Agendamento[];
  onClose: () => void;
}) {
  if (!lead) return null;

  const leadsAgends = agendamentos.filter((a) => a.lead_id === lead.id);
  const ltv = leadsAgends
    .filter((a) => a.status !== "cancelado" && a.valor)
    .reduce((s, a) => s + Number(a.valor ?? 0), 0);
  const realizados = leadsAgends.filter((a) => a.status === "realizado").length;
  const motivo = lead.analise_motivo ? MOTIVO_LABELS[lead.analise_motivo] : null;

  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[420px] overflow-y-auto p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-border-subtle flex items-start gap-4">
          <Avatar name={lead.nome} url={lead.foto_url} size={56} />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[22px] font-medium leading-tight text-text">
              {lead.nome || "—"}
            </h2>
            <p className="text-[11px] text-muted-brand mt-0.5 font-mono">
              {formatPhone(lead.telefone)}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <ScoreBadge score={lead.score} status={lead.status_atividade} breakdown={lead.score_breakdown as Record<string, unknown>} />
              {lead.segmento && (
                <span className={cn("text-[9.5px] font-bold tracking-[0.08em] px-2.5 py-0.5 rounded-full uppercase", SEGMENTO_STYLES[lead.segmento] ?? "bg-surface-2 text-muted-brand")}>
                  {SEGMENTO_LABELS[lead.segmento] ?? lead.segmento}
                </span>
              )}
              <span className={cn("text-[9px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-[0.08em]", STATUS_STYLES[lead.status] ?? "bg-surface-2 text-muted-brand")}>
                {lead.status}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-brand hover:text-text transition-colors shrink-0 mt-0.5">
            <X size={18} />
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 px-6 py-4 border-b border-border-subtle">
          {[
            { label: "LTV", value: ltv > 0 ? formatCurrency(ltv) : "—" },
            { label: "Agendamentos", value: leadsAgends.length },
            { label: "Realizados", value: realizados },
            { label: "Atividade", value: lead.status_atividade },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-2 rounded-xl px-3 py-2.5">
              <div className="text-[9px] font-bold tracking-[0.1em] text-muted-brand mb-1 uppercase">{label}</div>
              <div className="font-mono text-[18px] font-semibold text-brand">{value}</div>
            </div>
          ))}
        </div>

        {/* Contato */}
        <div className="px-6 py-4 border-b border-border-subtle">
          <div className="text-[9px] font-bold tracking-[0.12em] text-muted-brand mb-2.5 uppercase">Contato</div>
          <div className="flex items-center gap-2.5 text-[12.5px] text-text py-1">
            <Phone size={13} className="text-muted-brand" />
            {formatPhone(lead.telefone)}
          </div>
          <div className="flex items-center gap-2.5 text-[12.5px] text-text py-1">
            <Calendar size={13} className="text-muted-brand" />
            Desde {formatDate(lead.criado_em)}
          </div>
          {lead.ia_pausada && (
            <div className="flex items-center gap-2.5 text-[12.5px] text-danger py-1">
              <MessageCircle size={13} />
              IA pausada {lead.motivo_pausa ? `— ${lead.motivo_pausa}` : ""}
            </div>
          )}
        </div>

        {/* Score breakdown */}
        {lead.score_breakdown && typeof lead.score_breakdown === "object" && (
          <div className="px-6 py-4 border-b border-border-subtle">
            <div className="text-[9px] font-bold tracking-[0.12em] text-muted-brand mb-3 uppercase">Score — Composição</div>
            {[
              { k: "valor", label: "Valor", pct: "30%" },
              { k: "frequencia", label: "Frequência", pct: "25%" },
              { k: "engajamento", label: "Engajamento", pct: "20%" },
              { k: "aderencia", label: "Aderência", pct: "15%" },
              { k: "maturidade", label: "Maturidade", pct: "10%" },
            ].map(({ k, label, pct }) => {
              const val = Number((lead.score_breakdown as Record<string, unknown>)?.[k] ?? 0);
              return (
                <div key={k} className="flex items-center gap-3 py-1">
                  <span className="text-[11px] text-muted-brand w-24 shrink-0">{label} ({pct})</span>
                  <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${val}%` }} />
                  </div>
                  <span className="text-[11px] font-mono text-text w-8 text-right">{val}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Análise IA */}
        {lead.analise_resumo && (
          <div className="px-6 py-4 border-b border-border-subtle">
            <div className="text-[9px] font-bold tracking-[0.12em] text-muted-brand mb-2.5 uppercase flex items-center gap-2">
              <TrendingUp size={11} />
              Análise IA — Motivo de sumiço
            </div>
            {motivo && (
              <div className={cn("text-[11px] font-bold mb-1.5", motivo.color)}>
                {motivo.label}
                {lead.analise_confianca != null && (
                  <span className="text-muted-brand font-normal ml-1.5">
                    ({Math.round(lead.analise_confianca * 100)}% confiança)
                  </span>
                )}
              </div>
            )}
            <p className="text-[12.5px] text-text-2 italic leading-relaxed pl-3 border-l-2 border-brand">
              {lead.analise_resumo}
            </p>
            {lead.analise_recomendacao && (
              <p className="text-[11px] text-muted-brand mt-2">{lead.analise_recomendacao}</p>
            )}
          </div>
        )}

        {/* Follow-up opt-out */}
        <div className="px-6 py-4">
          <div className="text-[9px] font-bold tracking-[0.12em] text-muted-brand mb-1 uppercase">Follow-up</div>
          <div className={cn("text-[12.5px]", lead.followup_optout ? "text-danger" : "text-success")}>
            {lead.followup_optout ? "Pausado (opt-out)" : "Ativo"}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// — Main page —
export function ClientesPage({
  leads,
  agendamentos,
}: {
  leads: Lead[];
  agendamentos: Agendamento[];
}) {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Lead | null>(null);

  const toggleSort = (col: SortCol) => {
    if (col === sortCol) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = leads;
    if (q) list = list.filter((l) =>
      (l.nome ?? "").toLowerCase().includes(q) ||
      (l.telefone ?? "").includes(q)
    );
    return list.slice().sort((a, b) => {
      const dir = sortDir === "desc" ? -1 : 1;
      if (sortCol === "score") return (Number(a.score) - Number(b.score)) * dir;
      if (sortCol === "nome") return (a.nome ?? "").localeCompare(b.nome ?? "") * dir;
      if (sortCol === "criado_em") return (new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()) * dir;
      return 0;
    });
  }, [leads, search, sortCol, sortDir]);

  const todayCount = leads.filter((l) => {
    const d = new Date(l.criado_em);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-brand uppercase tracking-wider font-semibold">
            {leads.length} clientes{todayCount > 0 && ` · ${todayCount} novos hoje`}
          </p>
        </div>
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-brand" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full pl-9 pr-4 py-2 bg-surface border border-border-subtle rounded-xl text-sm text-text placeholder:text-muted-brand focus:outline-none focus:border-brand transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-2 border-b border-border-subtle">
                {[
                  { col: "nome", label: "Cliente" },
                  { col: null, label: "Telefone" },
                  { col: null, label: "Canal" },
                  { col: null, label: "Status" },
                  { col: "score", label: "Score" },
                  { col: "criado_em", label: "Captado" },
                ].map(({ col, label }) => (
                  <th
                    key={label}
                    onClick={() => col && toggleSort(col as SortCol)}
                    className={cn(
                      "text-left px-4 py-3 text-[10px] text-muted-brand font-semibold uppercase tracking-wider",
                      col && "cursor-pointer hover:text-text select-none transition-colors"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {col && <SortIcon col={col as SortCol} current={sortCol} dir={sortDir} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-brand text-sm">
                    {search ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelected(l)}
                    className="border-b border-border-subtle last:border-0 cursor-pointer hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={l.nome} url={l.foto_url} size={32} />
                        <span className="text-sm font-medium text-text">{l.nome || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-brand font-mono tabular-nums">
                      {formatPhone(l.telefone)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-brand capitalize">{l.canal}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[9px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider", STATUS_STYLES[l.status] ?? "bg-surface-2 text-muted-brand")}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ScoreBadge score={l.score} status={l.status_atividade} />
                        <span className={cn("text-[9px] font-semibold capitalize", {
                          "text-success": l.status_atividade === "ativa",
                          "text-muted-brand opacity-70": l.status_atividade === "dormente",
                          "text-danger": l.status_atividade === "perdida",
                        })}>
                          {l.status_atividade}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-brand font-mono tabular-nums">
                      {formatDate(l.criado_em)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail sheet */}
      <LeadSheet lead={selected} agendamentos={agendamentos} onClose={() => setSelected(null)} />
    </div>
  );
}
