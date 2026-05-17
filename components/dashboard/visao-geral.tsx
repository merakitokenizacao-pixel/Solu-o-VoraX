"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Tables } from "@/lib/supabase/types";
import { ScoreBadge } from "@/components/ui/score-badge";
import {
  formatCurrency,
  formatDate,
  getAvatarColors,
  getInitials,
  timeAgo,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Lead = Tables<"leads">;
type Agendamento = Tables<"agendamentos">;
type Period = "hoje" | "semana" | "mes" | "tudo";

const PERIOD_LABELS: Record<Period, string> = {
  hoje: "Hoje",
  semana: "7 dias",
  mes: "Mês",
  tudo: "Tudo",
};

const CHART_COLORS = ["#9b7d5a", "#3a6b4f", "#2a5278", "#b8955a", "#6c5ce7", "#e74c3c"];

function periodStart(period: Period): Date | null {
  if (period === "tudo") return null;
  const now = new Date();
  if (period === "hoje") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "semana") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (period === "mes") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d;
  }
  return null;
}

function filterByPeriod<T extends Record<string, unknown>>(
  items: T[],
  key: keyof T,
  period: Period
): T[] {
  const start = periodStart(period);
  if (!start) return items;
  return items.filter((item) => {
    const v = item[key];
    if (!v) return false;
    return new Date(v as string) >= start;
  });
}

// — Avatar —
function Avatar({ name, url, size = 36 }: { name: string | null; url?: string | null; size?: number }) {
  const initials = getInitials(name);
  const [bg, fg] = getAvatarColors(name);
  if (url && url !== "null" && url !== "undefined" && url !== "=") {
    return (
      <img
        src={url}
        alt={name ?? ""}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 text-[11px] font-medium"
      style={{ width: size, height: size, background: bg + "33", color: fg }}
    >
      {initials}
    </div>
  );
}

// — Status badge —
const STATUS_STYLES: Record<string, string> = {
  novo: "bg-info-bg text-info",
  agendado: "bg-[var(--vorax-gold-light)] text-gold",
  convertido: "bg-success-bg text-success",
  realizado: "bg-success-bg text-success",
  cancelado: "bg-danger-bg text-danger",
  confirmado: "bg-[var(--vorax-purple-bg)] text-[var(--vorax-purple)]",
  pendente: "bg-warning-bg text-warning",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "text-[9px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-[0.08em] shrink-0",
        STATUS_STYLES[status] ?? "bg-surface-2 text-muted-brand"
      )}
    >
      {status}
    </span>
  );
}

// — Alertas Banner —
function AlertasBanner({ leads }: { leads: Lead[] }) {
  const now = Date.now();
  const limit24h = now - 24 * 60 * 60 * 1000;

  const candidates = leads
    .filter(
      (l) =>
        Number(l.score) >= 60 &&
        l.status_atividade === "dormente" &&
        l.status_transicao_em &&
        new Date(l.status_transicao_em).getTime() >= limit24h
    )
    .sort((a, b) => Number(b.score) - Number(a.score));

  if (!candidates.length) return null;

  const top = candidates.slice(0, 3);

  return (
    <div className="mb-6 rounded-xl border border-warning bg-warning-bg/50 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-warning/30">
        <div className="flex items-center gap-2">
          <span className="text-warning">⚠</span>
          <span className="font-semibold text-[13px] text-text">Atenção imediata</span>
          <span className="text-[11px] font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
            {candidates.length} {candidates.length === 1 ? "cliente valioso" : "clientes valiosos"}
          </span>
        </div>
        <span className="text-[10px] text-muted-brand font-mono">atualizado agora</span>
      </div>

      <div className="divide-y divide-warning/20">
        {top.map((l) => {
          const dias = l.status_transicao_em
            ? Math.floor((now - new Date(l.status_transicao_em).getTime()) / 86_400_000)
            : 0;
          const diasTxt =
            dias === 0 ? "transitou hoje" : dias === 1 ? "há 1 dia" : `há ${dias} dias`;

          return (
            <div key={l.id} className="flex items-center gap-3 px-5 py-3">
              <ScoreBadge score={l.score} status={l.status_atividade} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-text truncate">
                  {l.nome || l.telefone} dormente {diasTxt}
                </div>
                <div className="text-[11px] text-muted-brand">score {l.score}</div>
              </div>
              <Link
                href="/conversas"
                className="text-[11px] font-semibold text-warning border border-warning px-3 py-1 rounded-lg hover:bg-warning hover:text-white transition-colors shrink-0"
              >
                Abordar
              </Link>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-2.5 flex items-center justify-between text-[11px] text-muted-brand">
        <span>Diamond/Gold que transicionaram pra dormente nas últimas 24h</span>
        {candidates.length > 3 && (
          <Link href="/clientes" className="text-brand hover:underline font-semibold">
            Ver todos →
          </Link>
        )}
      </div>
    </div>
  );
}

// — Metric Card —
function MetricCard({
  label,
  value,
  sub,
  subVariant = "muted",
}: {
  label: string;
  value: string | number;
  sub: string;
  subVariant?: "muted" | "up" | "down";
}) {
  return (
    <div className="bg-surface border border-border-subtle rounded-[18px] p-7 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-border-strong group">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 group-hover:opacity-60 transition-opacity" />
      <div className="text-[9px] text-muted-brand font-medium uppercase tracking-[0.18em] mb-3.5">
        {label}
      </div>
      <div className="font-display text-[44px] font-light leading-none mb-2.5 text-text">
        {value}
      </div>
      <div className="w-6 h-px bg-gold opacity-50 mb-2.5" />
      <div
        className={cn(
          "text-[11px] tracking-[0.03em]",
          subVariant === "up" && "text-success",
          subVariant === "down" && "text-danger",
          subVariant === "muted" && "text-muted-brand"
        )}
      >
        {sub}
      </div>
    </div>
  );
}

// — Funnel —
function Funnel({
  leads,
  agendamentos,
}: {
  leads: Lead[];
  agendamentos: Agendamento[];
}) {
  const total = leads.length;
  const engajados = leads.filter((l) => l.status !== "novo").length;
  const agendados = leads.filter((l) => l.status === "agendado").length;
  const realizados = agendamentos.filter((a) => a.status === "realizado").length;

  const steps = [
    { label: "Clientes", count: total, pct: 100, color: "#2a5278" },
    {
      label: "Engajados",
      count: engajados,
      pct: total ? Math.round((engajados / total) * 100) : 0,
      color: "#9b7d5a",
    },
    {
      label: "Agendados",
      count: agendados,
      pct: total ? Math.round((agendados / total) * 100) : 0,
      color: "#b8955a",
    },
    {
      label: "Realizados",
      count: realizados,
      pct: total ? Math.round((realizados / total) * 100) : 0,
      color: "#3a6b4f",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {steps.map((s) => (
        <div key={s.label} className="flex flex-col gap-2">
          <div className="flex justify-between items-baseline">
            <span className="text-[11px] text-muted-brand uppercase tracking-[0.08em]">
              {s.label}
            </span>
            <span className="font-display text-[22px] font-light text-text">{s.count}</span>
          </div>
          <div className="h-0.5 bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-[1400ms] ease-out"
              style={{ width: `${s.pct}%`, background: s.color }}
            />
          </div>
          <div className="text-[10px] text-muted-brand text-right font-mono">{s.pct}%</div>
        </div>
      ))}
    </div>
  );
}

// — Service Chart —
function ServiceChart({ agendamentos }: { agendamentos: Agendamento[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    agendamentos.forEach((a) => {
      if (a.servico) {
        const s = a.servico.trim();
        counts[s] = (counts[s] ?? 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [agendamentos]);

  if (!data.length) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-brand text-sm">
        Nenhum agendamento ainda
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />
          ))}
        </Pie>
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: 11, color: "var(--vorax-muted)" }}>{value}</span>
          )}
        />
        <Tooltip
          formatter={(value) => [value, "agendamentos"]}
          contentStyle={{
            background: "var(--vorax-surface)",
            border: "1px solid var(--vorax-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// — Timeline Chart —
function TimelineChart({ leads }: { leads: Lead[] }) {
  const data = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days[key] = 0;
    }
    leads.forEach((l) => {
      if (l.criado_em) {
        const key = l.criado_em.split("T")[0];
        if (key in days) days[key]++;
      }
    });
    return Object.entries(days).map(([date, count]) => ({
      date: new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      }),
      count,
    }));
  }, [leads]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--vorax-border)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--vorax-muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--vorax-muted)" }}
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(v) => [v, "leads"]}
          contentStyle={{
            background: "var(--vorax-surface)",
            border: "1px solid var(--vorax-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--vorax-accent)"
          strokeWidth={2}
          dot={{ fill: "var(--vorax-accent)", r: 4 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// — Recent Leads —
function RecentLeads({ leads }: { leads: Lead[] }) {
  return (
    <div className="bg-surface border border-border-subtle rounded-[18px] p-7 mt-5">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-border-subtle">
        <h2 className="font-display text-[17px] font-normal text-text tracking-[0.02em]">
          Clientes recentes
        </h2>
        <Link href="/clientes" className="text-[11px] text-muted-brand hover:text-brand font-medium tracking-[0.05em] transition-colors">
          Ver todos →
        </Link>
      </div>
      <div className="flex flex-col gap-0.5">
        {leads.map((l) => (
          <div
            key={l.id}
            className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl border border-transparent hover:bg-surface-2 hover:border-border-subtle cursor-pointer transition-all"
          >
            <Avatar name={l.nome} url={l.foto_url} size={38} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-text truncate">
                {l.nome || l.telefone}
              </div>
              <div className="text-[11px] text-muted-brand">{formatDate(l.criado_em)}</div>
            </div>
            <ScoreBadge score={l.score} status={l.status_atividade} />
            <StatusBadge status={l.status} />
          </div>
        ))}
        {!leads.length && (
          <div className="py-10 text-center text-muted-brand text-sm">
            Nenhum cliente ainda
          </div>
        )}
      </div>
    </div>
  );
}

// — Main Component —
export function VisaoGeral({
  leads,
  agendamentos,
}: {
  leads: Lead[];
  agendamentos: Agendamento[];
}) {
  const [period, setPeriod] = useState<Period>("tudo");

  const filteredLeads = useMemo(
    () => filterByPeriod(leads as unknown as Record<string, unknown>[], "criado_em", period) as unknown as Lead[],
    [leads, period]
  );

  const filteredAgendsForRevenue = useMemo(
    () =>
      filterByPeriod(
        agendamentos as unknown as Record<string, unknown>[],
        "data_agendamento",
        period
      ) as unknown as Agendamento[],
    [agendamentos, period]
  );

  const metrics = useMemo(() => {
    const total = filteredLeads.length;
    const agendados = filteredLeads.filter((l) => l.status === "agendado").length;
    const convertidos = filteredLeads.filter((l) => l.status === "convertido").length;
    const taxa = total > 0 ? Math.round(((agendados + convertidos) / total) * 100) : 0;
    const receita = filteredAgendsForRevenue
      .filter((a) => a.status !== "cancelado" && a.valor)
      .reduce((sum, a) => sum + Number(a.valor ?? 0), 0);
    return { total, agendados, taxa, receita };
  }, [filteredLeads, filteredAgendsForRevenue]);

  const h = new Date().getHours();
  const greet = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="p-6 lg:p-10 pb-24 lg:pb-10">
      {/* Header */}
      <div className="mb-10 pb-7 border-b border-border-subtle flex flex-wrap gap-4 items-end justify-between">
        <div>
          <h2 className="font-display text-[38px] font-light text-text leading-none tracking-[-0.5px]">
            {greet} <em className="italic text-brand">hoje</em>
          </h2>
          <p className="text-[11px] text-muted-brand tracking-[0.12em] uppercase mt-1.5">
            Sistema de Relacionamento — VoraX
          </p>
        </div>

        {/* Period filter */}
        <div className="flex gap-1.5">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                period === p
                  ? "bg-brand text-white"
                  : "bg-surface-2 text-muted-brand border border-border-subtle hover:border-border-strong hover:text-text"
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Alertas */}
      <AlertasBanner leads={leads} />

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <MetricCard
          label="Clientes captados"
          value={metrics.total}
          sub="via WhatsApp"
        />
        <MetricCard
          label="Consultas agendadas"
          value={metrics.agendados}
          sub="clientes confirmados"
          subVariant="up"
        />
        <MetricCard
          label="Taxa de conversão"
          value={`${metrics.taxa}%`}
          sub="do total de clientes"
        />
        <MetricCard
          label="Receita estimada"
          value={formatCurrency(metrics.receita)}
          sub="em agendamentos"
          subVariant="up"
        />
      </div>

      {/* Charts + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5 mb-5">
        {/* Charts col */}
        <div className="flex flex-col gap-5">
          <div className="bg-surface border border-border-subtle rounded-[18px] p-7">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-border-subtle">
              <h2 className="font-display text-[17px] font-normal text-text tracking-[0.02em]">
                Serviços mais agendados
              </h2>
            </div>
            <ServiceChart agendamentos={agendamentos} />
          </div>

          <div className="bg-surface border border-border-subtle rounded-[18px] p-7">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-border-subtle">
              <h2 className="font-display text-[17px] font-normal text-text tracking-[0.02em]">
                Novos leads (7 dias)
              </h2>
            </div>
            <TimelineChart leads={leads} />
          </div>
        </div>

        {/* Funnel col */}
        <div className="bg-surface border border-border-subtle rounded-[18px] p-7">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-border-subtle">
            <h2 className="font-display text-[17px] font-normal text-text tracking-[0.02em]">
              Funil de conversão
            </h2>
          </div>
          <Funnel leads={filteredLeads} agendamentos={agendamentos} />
        </div>
      </div>

      {/* Recent leads */}
      <RecentLeads leads={leads.slice(0, 6)} />
    </div>
  );
}
