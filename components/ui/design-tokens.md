# VoraX — Design Tokens (Referência Canônica)

> Qualquer decisão de spacing, tipografia ou cor deve seguir este arquivo.
> Não adicione valores arbitrários — use os tokens abaixo.

---

## Paleta de Cores

```
--bg: #f8f6f2          /* fundo geral, off-white quente */
--surface: #ffffff      /* cards e containers principais */
--surface2: #f2efe9     /* hover states, secondary surfaces */
--surface3: #e8e4dc     /* surfaces terciárias */
--border: #e0dbd2       /* borders sutis */
--border2: #c8c2b8      /* borders fortes (focus, hover) */
--text: #1a1814         /* texto principal */
--text2: #3d3930        /* texto secundário */
--muted: #8a8478        /* labels, hints, placeholders */
--accent: #9b7d5a       /* DOURADO PRINCIPAL — botões, links, ativo */
--accent2: #7a6244      /* dourado escuro pra hover de accent */
--accent-light: #f5ede0 /* fundo claro com toque dourado */
--gold: #b8955a
--gold-light: #f7f0e4
--green: #3a6b4f
--green-bg: #e8f4ed
--amber: #b5600a
--amber-bg: #fdf0e0
--red: #b03030
--red-bg: #fce8e8
--blue: #2a5278
--blue-bg: #e8f0f8
--purple: #5c4fa0
--purple-bg: #eeebf8
```

### Classes Tailwind mapeadas
- `bg-bg`, `bg-surface`, `bg-surface-2`, `bg-surface-3`
- `text-text`, `text-text-2`, `text-muted-brand`
- `border-border-subtle`, `border-border-strong`
- `text-brand` / `bg-brand` / `bg-brand-light` (accent dourado)
- `text-success` / `bg-success-bg`
- `text-warning` / `bg-warning-bg`
- `text-danger` / `bg-danger-bg`
- `text-info` / `bg-info-bg`

---

## Sistema de Espaçamento (8pt grid)

Use APENAS esses valores:

| Token  | px  | Tailwind | Uso |
|--------|-----|----------|-----|
| xs     | 4   | gap-1    | ícone+texto inline, gap mínimo |
| sm     | 8   | gap-2    | dentro de pills/badges |
| md     | 12  | gap-3    | padrão interno, entre meta+nome |
| base   | 16  | gap-4    | entre cards relacionados |
| lg     | 24  | gap-6    | entre seções dentro da mesma página |
| xl     | 32  | gap-8    | entre páginas/seções principais |
| 2xl    | 48  | gap-12   | separadores maiores |

### Padding interno dos cards

| Tipo de card        | Classe     |
|---------------------|------------|
| Card KPI / dashboard | `p-6`     |
| Card lead / serviço  | `p-4` ou `px-4 py-3` |
| Pill / badge / chat  | `px-3 py-2` |
| Linha de tabela      | `py-3 px-4` |

---

## Escala Tipográfica

| Nível         | Fonte          | Size       | Weight  | Classe Tailwind |
|---------------|----------------|------------|---------|-----------------|
| Page title h1 | Cormorant (display) | 30px  | medium  | `font-display text-3xl font-medium text-text` |
| Section h2    | Cormorant (display) | 20px  | medium  | `font-display text-xl font-medium text-text` |
| Card title h3 | Jost (sans)    | 16px (base)| medium  | `font-sans text-base font-medium text-text` |
| Body text     | Jost (sans)    | 14px (sm)  | normal  | `font-sans text-sm text-text` |
| Meta/secondary| Jost (sans)    | 12px (xs)  | normal  | `font-sans text-xs text-muted-brand` |
| Label/uppercase| Jost (sans)   | 10px       | semibold| `text-[10px] font-semibold uppercase tracking-wider text-muted-brand` |
| Números/dados | JetBrains Mono | variável   | —       | `font-mono tabular-nums` |

---

## Chat / Mensagens

| Elemento           | Estilo |
|--------------------|--------|
| Mensagem do cliente (WhatsApp) | `bg-surface-2 text-text rounded-2xl px-4 py-2.5` |
| Mensagem da IA (Laura)         | `bg-accent-light text-text rounded-2xl px-4 py-2.5` |
| Mensagem do humano (CRM)       | `bg-brand-light text-brand rounded-2xl px-4 py-2.5 border border-brand/20` |
| max-width bolha    | `max-w-[70%]` |
| gap entre bolhas   | `mb-2` |

---

## Sidebar

| Elemento | Valor |
|----------|-------|
| Largura desktop | `w-60` (240px) |
| Item nav | `py-2 px-3 rounded-md gap-3` |
| Item ativo | `bg-accent-light text-accent font-medium` |
| Item hover | `hover:bg-surface-2` |
| Section label | `text-[10px] uppercase tracking-wider text-muted-brand mb-2` |

---

## Regras Anti-pattern

- ❌ Nunca use sombras pesadas — `shadow-sm` na maioria, `shadow-md` só em modais
- ❌ Nunca use animações pesadas — só `transition-colors` e `transition-opacity`
- ❌ Nunca use emojis na UI (a Laura pode nas mensagens, a interface não)
- ❌ Nunca use valores de spacing arbitrários (ex: `gap-[13px]`, `p-[7px]`)
- ❌ Nunca use bordas fortes em cards normais — sempre `border-border-subtle`
- ❌ Nunca use `font-display` para números — sempre `font-mono`
