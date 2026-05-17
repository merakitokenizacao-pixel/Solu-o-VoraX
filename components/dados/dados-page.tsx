"use client";

import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────

interface FollowUp {
  id: string;
  lead_id: string;
  tentativa: number;
  converteu: boolean;
  enviado_em: string | null;
}

interface Agendamento {
  id: string;
  lead_id: string | null;
  origem: string | null;
  valor: number | null;
  criado_em: string | null;
  status: string | null;
}

interface Lead {
  id: string;
  nome: string | null;
  status: string | null;
  segmento: string | null;
  analise_motivo: string | null;
  analise_calculada_em: string | null;
}

interface Template {
  id: string;
  segmento: string;
  tentativa: number;
  mensagem: string;
  qtd_envios: number;
  qtd_conversoes: number;
  ativo: boolean;
}

interface Conversa {
  id: string;
  lead_id: string;
  origem: string | null;
  enviado_em: string | null;
}

interface Props {
  followUps: FollowUp[];
  agendamentos: Agendamento[];
  leads: Lead[];
  templates: Template[];
  conversas: Conversa[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: "7d", dias: 7 },
  { label: "30d", dias: 30 },
  { label: "90d", dias: 90 },
  { label: "180d", dias: 180 },
];

function calcDelta(antes: number, depois: number) {
  if (antes === 0 && depois === 0) return { pct: 0, dir: "neutral" as const };
  if (antes === 0) return { pct: 100, dir: "up" as const };
  const pct = Math.round(((depois - antes) / antes) * 100);
  return { pct: Math.abs(pct), dir: pct > 0 ? ("up" as const) : pct < 0 ? ("down" as const) : ("neutral" as const) };
}

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Sub-components ──────────────────────────────────────────────────

function DeltaBadge({ delta }: { delta: { pct: number; dir: "up" | "down" | "neutral" } }) {
  const arrow = delta.dir === "up" ? "↗" : delta.dir === "down" ? "↘" : "→";
  if (delta.dir === "neutral" && delta.pct === 0) {
    return <span className="text-[11px] text-muted">— sem dados anteriores</span>;
  }
  const color = delta.dir === "up" ? "text-green" : delta.dir === "down" ? "text-red" : "text-muted";
  return (
    <span className={`text-[12px] font-medium ${color}`}>
      {arrow} {delta.pct}%
    </span>
  );
}

function KPICard({
  label,
  value,
  unit,
  sub,
  delta,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  delta: { pct: number; dir: "up" | "down" | "neutral" };
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted uppercase tracking-wide">{label}</span>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-[28px] font-semibold text-text font-mono leading-none">{value}</span>
        {unit && <span className="text-[16px] text-muted">{unit}</span>}
        <DeltaBadge delta={delta} />
      </div>
      <span className="text-[11px] text-muted mt-0.5">{sub}</span>
    </div>
  );
}

// ─── 1. KPI Section ──────────────────────────────────────────────────

function KPISection({
  fupsAtual,
  fupsAnterior,
  agendsAtual,
  agendsAnterior,
}: {
  fupsAtual: FollowUp[];
  fupsAnterior: FollowUp[];
  agendsAtual: Agendamento[];
  agendsAnterior: Agendamento[];
}) {
  const recAtual = agendsAtual
    .filter((a) => a.origem === "followup")
    .reduce((s, a) => s + (Number(a.valor) || 0), 0);
  const recAnterior = agendsAnterior
    .filter((a) => a.origem === "followup")
    .reduce((s, a) => s + (Number(a.valor) || 0), 0);

  const enviosAtual = fupsAtual.length;
  const conversaoAtual = fupsAtual.filter((f) => f.converteu === true).length;
  const taxaAtual = enviosAtual > 0 ? (conversaoAtual / enviosAtual) * 100 : 0;

  const enviosAnterior = fupsAnterior.length;
  const conversaoAnterior = fupsAnterior.filter((f) => f.converteu === true).length;
  const taxaAnterior = enviosAnterior > 0 ? (conversaoAnterior / enviosAnterior) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KPICard
        label="Receita recuperada"
        value={`R$ ${fmtBRL(recAtual)}`}
        sub="via follow-up no período"
        delta={calcDelta(recAnterior, recAtual)}
      />
      <KPICard
        label="Taxa de conversão"
        value={taxaAtual.toFixed(1)}
        unit="%"
        sub={`${conversaoAtual} conversões em ${enviosAtual} envios`}
        delta={calcDelta(taxaAnterior, taxaAtual)}
      />
      <KPICard
        label="Total de envios"
        value={enviosAtual.toLocaleString("pt-BR")}
        sub="mensagens automáticas enviadas"
        delta={calcDelta(enviosAnterior, enviosAtual)}
      />
    </div>
  );
}

// ─── 2. Funil ────────────────────────────────────────────────────────

function FunilSection({ fups }: { fups: FollowUp[] }) {
  const leadsContactados = new Set(fups.map((f) => f.lead_id));
  const tent1 = new Set(fups.filter((f) => f.tentativa === 1).map((f) => f.lead_id));
  const tent2 = new Set(fups.filter((f) => f.tentativa === 2).map((f) => f.lead_id));
  const tent3 = new Set(fups.filter((f) => f.tentativa === 3).map((f) => f.lead_id));
  const convertidos = new Set(fups.filter((f) => f.converteu === true).map((f) => f.lead_id));
  const total = leadsContactados.size;

  const estagios = [
    { label: "Contactados", count: total },
    { label: "1ª tentativa", count: tent1.size },
    { label: "2ª tentativa", count: tent2.size },
    { label: "3ª tentativa", count: tent3.size },
    { label: "Converteram", count: convertidos.size },
  ];

  if (total === 0) {
    return <p className="text-muted text-sm py-4">Sem follow-ups no período selecionado.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {estagios.map((e) => {
        const pct = total > 0 ? Math.round((e.count / total) * 100) : 0;
        return (
          <div key={e.label} className="flex items-center gap-3">
            <span className="w-28 text-[12px] text-muted shrink-0">{e.label}</span>
            <div className="flex-1 h-5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: "var(--accent)" }}
              />
            </div>
            <span className="w-8 text-right font-mono text-[13px] text-text2 shrink-0">{e.count}</span>
            <span className="w-8 text-right text-[11px] text-muted shrink-0">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── 3. Motivos donut ────────────────────────────────────────────────

const MOTIVO_CORES: Record<string, string> = {
  preco: "#b5600a",
  agenda: "#2a5278",
  insatisfacao: "#b03030",
  circunstancial: "#3a6b4f",
  indefinido: "#9a9088",
};

const MOTIVO_LABELS: Record<string, string> = {
  preco: "Preço",
  agenda: "Agenda",
  insatisfacao: "Insatisfação",
  circunstancial: "Circunstancial",
  indefinido: "Indefinido",
};

function MotivosSection({ leads }: { leads: Lead[] }) {
  const analisados = leads.filter((l) => l.analise_motivo);

  if (!analisados.length) {
    return (
      <p className="text-muted text-sm py-4">
        Ainda não há análises de motivo concluídas.
      </p>
    );
  }

  const contagem: Record<string, number> = {
    preco: 0,
    agenda: 0,
    insatisfacao: 0,
    circunstancial: 0,
    indefinido: 0,
  };
  analisados.forEach((l) => {
    const m = l.analise_motivo!;
    contagem[m] = (contagem[m] || 0) + 1;
  });

  const total = analisados.length;
  const ordem = (["preco", "insatisfacao", "circunstancial", "agenda", "indefinido"] as const).filter(
    (k) => contagem[k] > 0
  );

  const pieData = ordem.map((k) => ({
    name: MOTIVO_LABELS[k],
    value: contagem[k],
    color: MOTIVO_CORES[k],
  }));

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center">
      <div className="w-[160px] h-[160px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value}`, ""]}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {ordem.map((k) => {
          const pct = Math.round((contagem[k] / total) * 100);
          return (
            <div key={k} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: MOTIVO_CORES[k] }}
              />
              <span className="text-[13px] text-text2 flex-1">{MOTIVO_LABELS[k]}</span>
              <span className="font-mono text-[12px] text-muted">
                {contagem[k]} · {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 4. Taxa por tentativa ───────────────────────────────────────────

const TENT_COLORS = ["#9b7d5a", "#3a6b4f", "#2a5278"];

function TentativasSection({ fups }: { fups: FollowUp[] }) {
  const rows = [1, 2, 3].map((t) => {
    const envios = fups.filter((f) => f.tentativa === t);
    const convs = envios.filter((f) => f.converteu === true).length;
    const taxa = envios.length > 0 ? (convs / envios.length) * 100 : 0;
    return { tent: t, envios: envios.length, convs, taxa };
  });

  const temDados = rows.some((r) => r.envios > 0);
  if (!temDados) {
    return <p className="text-muted text-sm py-4">Sem dados de tentativa no período.</p>;
  }

  const maxTaxa = Math.max(1, ...rows.map((r) => r.taxa));

  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => {
        const pctBar = (r.taxa / maxTaxa) * 100;
        return (
          <div key={r.tent} className="flex items-center gap-3">
            <span className="w-24 text-[12px] text-muted shrink-0">{r.tent}ª tentativa</span>
            <div className="flex-1 h-5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pctBar}%`, background: TENT_COLORS[r.tent - 1] }}
              />
            </div>
            <span
              className="w-12 text-right font-mono text-[13px] shrink-0"
              title={`${r.convs} conv. em ${r.envios} envios`}
              style={{ color: TENT_COLORS[r.tent - 1] }}
            >
              {r.taxa.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── 5. Heatmap ──────────────────────────────────────────────────────

const DIAS_NOMES = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function HeatmapSection({ conversas, inicio }: { conversas: Conversa[]; inicio: Date }) {
  const msgs = conversas.filter(
    (c) => c.origem === "cliente" && c.enviado_em && new Date(c.enviado_em) >= inicio
  );

  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  msgs.forEach((c) => {
    const d = new Date(c.enviado_em!);
    grid[d.getDay()][d.getHours()]++;
  });

  const max = Math.max(1, ...grid.flat());

  function nivelOpacity(v: number) {
    if (v === 0) return 0;
    const ratio = v / max;
    if (ratio >= 0.8) return 1;
    if (ratio >= 0.6) return 0.75;
    if (ratio >= 0.4) return 0.55;
    if (ratio >= 0.2) return 0.35;
    return 0.15;
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-0.5 min-w-[520px]"
        style={{ gridTemplateColumns: "36px repeat(24, 1fr)" }}
      >
        {/* Header row */}
        <div />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="text-center text-[9px] text-muted leading-none pb-1">
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </div>
        ))}
        {/* Day rows */}
        {DIAS_NOMES.map((dia, d) => (
          <>
            <div key={`label-${d}`} className="text-[10px] text-muted flex items-center justify-end pr-1.5">
              {dia}
            </div>
            {Array.from({ length: 24 }, (_, h) => {
              const v = grid[d][h];
              const opacity = nivelOpacity(v);
              return (
                <div
                  key={`cell-${d}-${h}`}
                  title={v > 0 ? `${dia} ${h}h: ${v} msg` : ""}
                  className="h-4 rounded-[2px]"
                  style={{
                    background: opacity > 0 ? `rgba(155, 125, 90, ${opacity})` : "var(--surface-3)",
                  }}
                />
              );
            })}
          </>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[11px] text-muted">
        <span>Menos</span>
        <div className="flex gap-1">
          {[0, 0.15, 0.35, 0.55, 0.75, 1].map((op, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-[2px]"
              style={{
                background: op > 0 ? `rgba(155, 125, 90, ${op})` : "var(--surface-3)",
              }}
            />
          ))}
        </div>
        <span>Mais</span>
        {msgs.length === 0 && (
          <span className="ml-3 text-muted italic">Sem mensagens no período</span>
        )}
      </div>
    </div>
  );
}

// ─── 6. Top Templates ────────────────────────────────────────────────

const RANK_COLORS = ["#b8955a", "#9a9088", "#b5600a"];

function TopTemplatesSection({ templates }: { templates: Template[] }) {
  const comDados = templates.filter((t) => (t.qtd_envios || 0) > 0);

  if (!comDados.length) {
    return (
      <p className="text-muted text-sm py-4">
        Templates ainda em warm-up — sem dados suficientes para ranking.
      </p>
    );
  }

  const sorted = [...comDados].sort((a, b) => {
    const ta = a.qtd_envios > 0 ? (a.qtd_conversoes || 0) / a.qtd_envios : 0;
    const tb = b.qtd_envios > 0 ? (b.qtd_conversoes || 0) / b.qtd_envios : 0;
    if (tb !== ta) return tb - ta;
    return (b.qtd_envios || 0) - (a.qtd_envios || 0);
  });

  const top5 = sorted.slice(0, 5);

  return (
    <div className="flex flex-col gap-3">
      {top5.map((t, idx) => {
        const envios = t.qtd_envios || 0;
        const convs = t.qtd_conversoes || 0;
        const taxa = envios > 0 ? (convs / envios) * 100 : 0;
        const rankColor = idx < 3 ? RANK_COLORS[idx] : "var(--muted)";

        return (
          <div
            key={t.id}
            className="flex items-start gap-3 p-3 bg-surface-2 rounded-lg border border-border"
          >
            <span
              className="text-[22px] font-bold font-mono shrink-0 leading-none mt-0.5"
              style={{ color: rankColor }}
            >
              {idx + 1}
            </span>
            <p className="flex-1 text-[12px] text-text2 leading-relaxed line-clamp-2">
              {t.mensagem}
            </p>
            <div className="flex gap-3 shrink-0">
              <div className="text-center">
                <div className="font-mono text-[14px] font-semibold text-text">{envios}</div>
                <div className="text-[10px] text-muted">Envios</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-[14px] font-semibold text-text">{convs}</div>
                <div className="text-[10px] text-muted">Conv.</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-[14px] font-semibold" style={{ color: "var(--accent)" }}>
                  {taxa.toFixed(1)}%
                </div>
                <div className="text-[10px] text-muted">Taxa</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <h3 className="text-[13px] font-semibold text-text2 uppercase tracking-wide mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export function DadosPage({ followUps, agendamentos, leads, templates, conversas }: Props) {
  const [periodo, setPeriodo] = useState(30);

  const { fupsAtual, fupsAnterior, agendsAtual, agendsAnterior, inicio } = useMemo(() => {
    const agora = new Date();
    const inicio = new Date(agora.getTime() - periodo * 24 * 60 * 60 * 1000);
    const inicioAnterior = new Date(agora.getTime() - 2 * periodo * 24 * 60 * 60 * 1000);

    const fupsAtual = followUps.filter(
      (f) => f.enviado_em && new Date(f.enviado_em) >= inicio
    );
    const fupsAnterior = followUps.filter((f) => {
      if (!f.enviado_em) return false;
      const d = new Date(f.enviado_em);
      return d >= inicioAnterior && d < inicio;
    });
    const agendsAtual = agendamentos.filter(
      (a) => a.criado_em && new Date(a.criado_em) >= inicio
    );
    const agendsAnterior = agendamentos.filter((a) => {
      if (!a.criado_em) return false;
      const d = new Date(a.criado_em);
      return d >= inicioAnterior && d < inicio;
    });

    return { fupsAtual, fupsAnterior, agendsAtual, agendsAnterior, inicio };
  }, [followUps, agendamentos, periodo]);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-text">Dados & Análise</h1>
          <p className="text-sm text-muted mt-0.5">Dashboard analítico do sistema de follow-up</p>
        </div>
        {/* Period filter */}
        <div className="flex gap-1 bg-surface-2 rounded-lg p-1 border border-border">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.dias}
              onClick={() => setPeriodo(opt.dias)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                periodo === opt.dias
                  ? "bg-surface text-accent shadow-sm border border-border"
                  : "text-muted hover:text-text2"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. KPIs */}
      <KPISection
        fupsAtual={fupsAtual}
        fupsAnterior={fupsAnterior}
        agendsAtual={agendsAtual}
        agendsAnterior={agendsAnterior}
      />

      {/* 2+3: Funil + Motivos side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Funil de follow-up">
          <FunilSection fups={fupsAtual} />
        </SectionCard>
        <SectionCard title="Motivos de sumiço">
          <MotivosSection leads={leads} />
        </SectionCard>
      </div>

      {/* 4. Taxa por tentativa */}
      <SectionCard title="Taxa de conversão por tentativa">
        <TentativasSection fups={fupsAtual} />
      </SectionCard>

      {/* 5. Heatmap */}
      <SectionCard title="Heatmap de atividade — mensagens dos clientes">
        <HeatmapSection conversas={conversas} inicio={inicio} />
      </SectionCard>

      {/* 6. Top templates */}
      <SectionCard title="Top 5 templates por conversão">
        <TopTemplatesSection templates={templates} />
      </SectionCard>
    </div>
  );
}
