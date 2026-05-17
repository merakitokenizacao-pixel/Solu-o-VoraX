"use client";

import { useState } from "react";
import { Plus, Pencil, X, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/types";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Servico = Tables<"servicos">;
type ClinicaInfo = Tables<"clinica_info">;

const CATEGORIA_LABELS: Record<string, string> = {
  facial: "Facial",
  corporal: "Corporal",
  injetavel: "Injetável",
  depilacao: "Depilação",
  capilar: "Capilar",
  outros: "Outros",
};

const CATEGORIA_COLORS: Record<string, string> = {
  facial:    "bg-info-bg text-info",
  corporal:  "bg-success-bg text-success",
  injetavel: "bg-[var(--vorax-purple-bg)] text-[var(--vorax-purple)]",
  depilacao: "bg-warning-bg text-warning",
  capilar:   "bg-brand-light text-brand",
  outros:    "bg-surface-2 text-muted-brand",
};

// — Serviço card —
function ServicoCard({ servico, onEdit }: { servico: Servico; onEdit: () => void }) {
  return (
    <div className={cn("bg-surface border border-border-subtle rounded-[18px] p-5 flex flex-col gap-3 transition-all hover:border-border-strong hover:shadow-md", !servico.ativo && "opacity-50")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-text leading-tight">{servico.nome}</h3>
          {servico.categoria && (
            <span className={cn("inline-block text-[9px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full mt-1", CATEGORIA_COLORS[servico.categoria] ?? "bg-surface-2 text-muted-brand")}>
              {CATEGORIA_LABELS[servico.categoria] ?? servico.categoria}
            </span>
          )}
        </div>
        <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-brand hover:text-brand hover:bg-brand-light transition-colors shrink-0">
          <Pencil size={13} />
        </button>
      </div>

      {servico.descricao && (
        <p className="text-[12px] text-muted-brand leading-relaxed line-clamp-2">{servico.descricao}</p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <div className="text-[9px] text-muted-brand font-semibold uppercase tracking-[0.1em]">Preço</div>
          <div className="font-mono text-[22px] font-light text-brand">{formatCurrency(servico.preco)}</div>
        </div>
        {servico.preco_pacote && (
          <div>
            <div className="text-[9px] text-muted-brand font-semibold uppercase tracking-[0.1em]">Pacote</div>
            <div className="font-mono text-[18px] font-light text-success">{formatCurrency(servico.preco_pacote)}</div>
          </div>
        )}
        <div className="ml-auto text-right">
          <div className="text-[9px] text-muted-brand font-semibold uppercase tracking-[0.1em]">Duração</div>
          <div className="text-[13px] font-mono text-text">{servico.duracao_minutos}min</div>
        </div>
        {servico.sessoes_recomendadas > 1 && (
          <div className="text-right">
            <div className="text-[9px] text-muted-brand font-semibold uppercase tracking-[0.1em]">Sessões</div>
            <div className="text-[13px] font-mono text-text">{servico.sessoes_recomendadas}x</div>
          </div>
        )}
      </div>

      {!servico.ativo && (
        <div className="flex items-center gap-1.5 text-[11px] text-danger">
          <AlertCircle size={12} /> Inativo
        </div>
      )}
    </div>
  );
}

// — Edit modal —
function ServicoModal({ servico, onClose, onSave }: { servico: Partial<Servico> | null; onClose: () => void; onSave: (s: Servico) => void }) {
  const [form, setForm] = useState<Partial<Servico>>(servico ?? {
    nome: "", preco: 0, duracao_minutos: 60, ativo: true, sessoes_recomendadas: 1, recuperacao_dias: 0, categoria: null, descricao: null,
  });
  const [saving, setSaving] = useState(false);

  function set(key: keyof Servico, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.nome || form.preco == null) { toast.error("Nome e preço são obrigatórios"); return; }
    setSaving(true);
    const sb = createClient();
    let result;
    if (form.id) {
      const { id, criado_em, ...rest } = form as Servico;
      result = await sb.from("servicos").update(rest).eq("id", id!).select().single();
    } else {
      result = await sb.from("servicos").insert({ nome: form.nome!, preco: form.preco!, ...form }).select().single();
    }
    if (result.error) { toast.error("Erro: " + result.error.message); setSaving(false); return; }
    toast.success(form.id ? "Serviço atualizado" : "Serviço criado");
    onSave(result.data as Servico);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg mx-4 sm:mx-auto overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
          <h3 className="font-display text-[20px] font-medium text-text">{form.id ? "Editar serviço" : "Novo serviço"}</h3>
          <button onClick={onClose} className="text-muted-brand hover:text-text"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-4">
          {[
            { label: "Nome", key: "nome" as keyof Servico, type: "text" },
          ].map(({ label, key, type }) => (
            <div key={key as string}>
              <label className="text-[11px] font-semibold text-muted-brand uppercase tracking-[0.08em] mb-1 block">{label}</label>
              <input type={type} value={(form[key] as string) ?? ""}
                onChange={(e) => set(key, e.target.value)}
                className="w-full bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-brand" />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-brand uppercase tracking-[0.08em] mb-1 block">Preço (R$)</label>
              <input type="number" step="0.01" value={form.preco ?? 0}
                onChange={(e) => set("preco", Number(e.target.value))}
                className="w-full bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-brand uppercase tracking-[0.08em] mb-1 block">Duração (min)</label>
              <input type="number" value={form.duracao_minutos ?? 60}
                onChange={(e) => set("duracao_minutos", Number(e.target.value))}
                className="w-full bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-brand" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-brand uppercase tracking-[0.08em] mb-1 block">Categoria</label>
            <select value={form.categoria ?? ""} onChange={(e) => set("categoria", e.target.value || null)}
              className="w-full bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-brand">
              <option value="">Sem categoria</option>
              {Object.entries(CATEGORIA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-brand uppercase tracking-[0.08em] mb-1 block">Descrição</label>
            <textarea value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value || null)} rows={3}
              className="w-full bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-brand resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-brand uppercase tracking-[0.08em] mb-1 block">Preço pacote (R$)</label>
              <input type="number" step="0.01" value={form.preco_pacote ?? ""} placeholder="—"
                onChange={(e) => set("preco_pacote", e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-brand uppercase tracking-[0.08em] mb-1 block">Sessões recomendadas</label>
              <input type="number" value={form.sessoes_recomendadas ?? 1}
                onChange={(e) => set("sessoes_recomendadas", Number(e.target.value))}
                className="w-full bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-brand" />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <div onClick={() => set("ativo", !form.ativo)}
              className={cn("w-9 h-5 rounded-full transition-colors relative", form.ativo ? "bg-success" : "bg-surface-3")}>
              <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform", form.ativo ? "left-[18px]" : "left-0.5")} />
            </div>
            <span className="text-[13px] text-text">Ativo</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-border-subtle shrink-0">
          <button onClick={save} disabled={saving}
            className="w-full bg-brand text-white rounded-xl py-2.5 text-[13px] font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60">
            {saving ? "Salvando..." : "Salvar serviço"}
          </button>
        </div>
      </div>
    </div>
  );
}

// — Clinica config —
function ClinicaConfig({ clinica: initialClinica }: { clinica: ClinicaInfo | null }) {
  const [clinica, setClinica] = useState(initialClinica);
  const [saving, setSaving] = useState(false);
  if (!clinica) return <div className="text-muted-brand text-sm py-8 text-center">Configurações da clínica não encontradas.</div>;

  function set(key: keyof ClinicaInfo, value: unknown) {
    setClinica((c) => c ? { ...c, [key]: value } : c);
  }

  async function save() {
    if (!clinica) return;
    setSaving(true);
    const sb = createClient();
    const { id, ...rest } = clinica;
    const { error } = await sb.from("clinica_info").update({ ...rest, atualizado_em: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Erro: " + error.message); } else { toast.success("Configurações salvas!"); }
    setSaving(false);
  }

  const fields: { label: string; key: keyof ClinicaInfo; type?: string }[] = [
    { label: "Nome da clínica", key: "nome_clinica" },
    { label: "Proprietária", key: "proprietario_nome" },
    { label: "Telefone", key: "telefone" },
    { label: "WhatsApp", key: "whatsapp" },
    { label: "Email", key: "email" },
    { label: "Instagram", key: "instagram" },
    { label: "Endereço", key: "endereco" },
    { label: "Bairro", key: "bairro" },
    { label: "Cidade", key: "cidade" },
    { label: "Estado", key: "estado" },
    { label: "CEP", key: "cep" },
  ];

  return (
    <div className="bg-surface border border-border-subtle rounded-[18px] p-7">
      <h3 className="font-display text-[20px] font-light text-text mb-6">Configurações da Clínica</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {fields.map(({ label, key }) => (
          <div key={key as string}>
            <label className="text-[11px] font-semibold text-muted-brand uppercase tracking-[0.08em] mb-1 block">{label}</label>
            <input
              value={(clinica[key] as string) ?? ""}
              onChange={(e) => set(key, e.target.value || null)}
              className="w-full bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-brand"
            />
          </div>
        ))}
      </div>
      <div className="mb-4">
        <label className="text-[11px] font-semibold text-muted-brand uppercase tracking-[0.08em] mb-1 block">Diferenciais</label>
        <textarea value={clinica.diferenciais ?? ""} onChange={(e) => set("diferenciais", e.target.value || null)} rows={3}
          className="w-full bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-brand resize-none" />
      </div>
      <div className="mb-6">
        <label className="text-[11px] font-semibold text-muted-brand uppercase tracking-[0.08em] mb-1 block">Política de cancelamento</label>
        <textarea value={clinica.politica_cancelamento ?? ""} onChange={(e) => set("politica_cancelamento", e.target.value || null)} rows={2}
          className="w-full bg-surface-2 border border-border-subtle rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-brand resize-none" />
      </div>
      <button onClick={save} disabled={saving}
        className="px-6 py-2.5 bg-brand text-white rounded-xl text-[13px] font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60">
        {saving ? "Salvando..." : "Salvar configurações"}
      </button>
    </div>
  );
}

// — Main —
export function ServicosPage({ servicos: initial, clinica }: { servicos: Servico[]; clinica: ClinicaInfo | null }) {
  const [tab, setTab] = useState<"catalogo" | "config">("catalogo");
  const [servicos, setServicos] = useState(initial);
  const [editing, setEditing] = useState<Partial<Servico> | null | "new">(null);

  const categorias = Object.keys(CATEGORIA_LABELS);
  const totalReceita = servicos.filter((s) => s.ativo).reduce((sum, s) => sum + s.preco, 0);

  function handleSave(s: Servico) {
    setServicos((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id);
      if (idx >= 0) return prev.map((x) => x.id === s.id ? s : x);
      return [...prev, s];
    });
  }

  return (
    <div className="p-6 lg:p-10 pb-24 lg:pb-10">
      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-surface-2 p-1 rounded-xl w-fit">
        {(["catalogo", "config"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-5 py-2 rounded-lg text-[13px] font-medium capitalize transition-all",
              tab === t ? "bg-surface text-text shadow-sm" : "text-muted-brand hover:text-text")}>
            {t === "catalogo" ? "Catálogo" : "Configurações"}
          </button>
        ))}
      </div>

      {tab === "catalogo" && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Serviços ativos", value: servicos.filter((s) => s.ativo).length },
              { label: "Categorias", value: new Set(servicos.filter((s) => s.categoria).map((s) => s.categoria)).size },
              { label: "Ticket médio", value: formatCurrency(servicos.filter((s) => s.ativo).length ? totalReceita / servicos.filter((s) => s.ativo).length : 0) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface border border-border-subtle rounded-[18px] px-5 py-4">
                <div className="text-[9px] text-muted-brand font-semibold uppercase tracking-[0.14em] mb-2">{label}</div>
                <div className="font-mono text-[28px] font-light text-text">{value}</div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mb-5">
            <button onClick={() => setEditing("new")}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-xl text-[13px] font-semibold hover:bg-brand-dark transition-colors">
              <Plus size={14} /> Novo serviço
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {servicos
              .sort((a, b) => a.ordem_exibicao - b.ordem_exibicao)
              .map((s) => (
                <ServicoCard key={s.id} servico={s} onEdit={() => setEditing(s)} />
              ))}
          </div>
        </>
      )}

      {tab === "config" && <ClinicaConfig clinica={clinica} />}

      {editing && (
        <ServicoModal
          servico={editing === "new" ? {} : editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
