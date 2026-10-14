import React, { useEffect } from 'react'

// ── Икони (собствен набор, stroke-based) ─────────────────────────────────────
const PATHS: Record<string, string> = {
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  check: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  star: 'M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.8l6.5-.9z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3',
  badge: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.2 13.9 7 22l5-3 5 3-1.2-8.1',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 7l9 6 9-6',
  calendar: 'M8 2v4M16 2v4M3 6h18a0 0 0 0 1 0 0v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 10h18',
  meet: 'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
  task: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 13l2 2 4-4',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 13.6H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  swap: 'M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16',
  building: 'M3 21h18M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M15 21V9h4a2 2 0 0 1 2 2v10M9 7h2M9 11h2M9 15h2',
  report: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15h6M9 11h3',
  certificate: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8 14l-1 8 5-3 5 3-1-8',
  archive: 'M3 3h18v5H3zM5 8v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4',
  wallet: 'M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M21 9h-5a2 2 0 0 0 0 4h5z',
  clipboard: 'M9 4h6v3H9zM7 5H6a2 2 0 0 0-2 2v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7a2 2 0 0 0-2-2h-1M9 12h6M9 16h4',
  video: 'M23 7l-7 5 7 5zM3 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
  heart: 'M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z',
  sync: 'M21 2v6h-6M3 22v-6h6M3.5 9a9 9 0 0 1 14.9-3.4L21 8M20.5 15a9 9 0 0 1-14.9 3.4L3 16',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1',
  card: 'M2 7h20v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1zM2 10h20M6 15h4',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  plus: 'M12 5v14M5 12h14',
  edit: 'M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z',
  trash: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6M10 11v6M14 11v6',
  close: 'M18 6L6 18M6 6l12 12',
  filter: 'M22 3H2l8 9.5V19l4 2v-8.5z',
  print: 'M6 9V2h12v7M6 18H4a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M6 14h12v8H6z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  chevron: 'M9 18l6-6-6-6',
  chevronDown: 'M6 9l6 6 6-6',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  lock: 'M5 11h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 8 0v4',
  school: 'M12 3l9 5-9 5-9-5zM5 11v6l7 4 7-4v-6',
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  spark: 'M12 2v4M12 18v4M4.9 4.9l2.9 2.9M16.2 16.2l2.9 2.9M2 12h4M18 12h4M4.9 19.1l2.9-2.9M16.2 7.8l2.9-2.9',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8h.01M11 12h1v4h1',
  warn: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
}

export function Icon({
  name, size = 18, className = '', strokeWidth = 1.7,
}: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  const p = PATHS[name] ?? PATHS.info
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      <path d={p} />
    </svg>
  )
}

// ── Основни елементи ────────────────────────────────────────────────────────
export function Card({ children, className = '', pad = true }: { children: React.ReactNode; className?: string; pad?: boolean }) {
  return <div className={`card ${pad ? 'p-5' : ''} ${className}`}>{children}</div>
}

export function PageHeader({
  title, subtitle, icon, actions,
}: { title: string; subtitle?: string; icon?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <Icon name={icon} size={20} />
          </span>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-0.5 max-w-3xl text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Badge({
  children, tone = 'neutral', className = '',
}: { children: React.ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'brand' | 'purple'; className?: string }) {
  const tones: Record<string, string> = {
    neutral: 'bg-ink-100 text-ink-700',
    ok: 'bg-[#e6f4ea] text-[#1f7a45]',
    warn: 'bg-[#fdf0e3] text-[#b25e09]',
    danger: 'bg-[#fde8e8] text-[#b42318]',
    brand: 'bg-brand-50 text-brand-700',
    purple: 'bg-[#f1eafe] text-[#6b21a8]',
  }
  return <span className={`chip ${tones[tone]} ${className}`}>{children}</span>
}

export function GradePill({ value, title }: { value: number | string; title?: string }) {
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  const cls = Number.isFinite(n) && n >= 2 && n <= 6 ? `g${Math.round(n)}` : 'bg-ink-100 text-ink-700'
  return (
    <span
      title={title}
      className={`inline-grid h-7 min-w-[28px] place-items-center rounded-md px-1.5 text-sm font-bold ${cls}`}
    >
      {value}
    </span>
  )
}

export function Stat({
  label, value, hint, tone = 'brand', icon,
}: { label: string; value: React.ReactNode; hint?: string; tone?: 'brand' | 'ok' | 'warn' | 'danger' | 'purple'; icon?: string }) {
  const tones: Record<string, string> = {
    brand: 'text-brand-700 bg-brand-50',
    ok: 'text-[#1f7a45] bg-[#e6f4ea]',
    warn: 'text-[#b25e09] bg-[#fdf0e3]',
    danger: 'text-[#b42318] bg-[#fde8e8]',
    purple: 'text-[#6b21a8] bg-[#f1eafe]',
  }
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        {icon && <span className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone]}`}><Icon name={icon} size={16} /></span>}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-ink-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  )
}

export function EmptyState({ title, text, icon = 'info', action }: { title: string; text?: string; icon?: string; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-6 py-14 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink-400 shadow-card"><Icon name={icon} size={20} /></span>
      <p className="mt-3 text-sm font-semibold text-ink-800">{title}</p>
      {text && <p className="mt-1 max-w-md text-sm text-ink-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ''}`} />
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input min-h-[90px] resize-y ${props.className ?? ''}`} />
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`input pr-8 ${props.className ?? ''}`} />
}

export function Tabs({
  tabs, active, onChange,
}: { tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 border-b border-ink-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px border-b-2 px-3.5 py-2 text-sm font-semibold transition ${
            active === t.id
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-ink-500 hover:border-ink-200 hover:text-ink-700'
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={`ml-1.5 rounded-md px-1.5 py-0.5 text-[11px] ${active === t.id ? 'bg-brand-50 text-brand-700' : 'bg-ink-100 text-ink-500'}`}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Modal({
  open, onClose, title, children, footer, wide,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/45 p-4 py-10">
      <div className={`w-full ${wide ? 'max-w-4xl' : 'max-w-xl'} rounded-xl bg-white shadow-pop`}>
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
          <h2 className="text-base font-bold text-ink-900">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-200 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  )
}

export function Table({ head, children, className = '' }: { head: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-ink-200 bg-white ${className}`}>
      <table className="w-full border-collapse">
        <thead className="bg-ink-50">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-ink-100">{children}</tbody>
      </table>
    </div>
  )
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 45% 42%)` }}
    >
      {initials || '?'}
    </span>
  )
}

export function Progress({ value, max = 6, tone = 'brand' }: { value: number; max?: number; tone?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const colors: Record<string, string> = {
    brand: 'bg-brand-600', ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger',
  }
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
      <div className={`h-full rounded-full ${colors[tone] ?? colors.brand}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Note({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <div className={`flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${
      tone === 'warn'
        ? 'border-[#f3d9b5] bg-[#fdf7ee] text-[#8a5a12]'
        : 'border-brand-200 bg-brand-50/60 text-brand-900'
    }`}>
      <Icon name={tone === 'warn' ? 'warn' : 'info'} size={17} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"><Icon name="search" size={16} /></span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Търсене…'}
        className="input pl-9"
      />
    </div>
  )
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}.${m}.${y}`
}

export function avgFmt(n: number | null): string {
  return n === null ? '—' : n.toFixed(2)
}
