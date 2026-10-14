import { useId, useState } from 'react'
import { Icon } from './ui'

// ── Цветове на таблото (по модела на референтния изглед) ────────────────────
export const DASH = {
  blue: '#2E7DD1',
  blueLight: '#3D8AE0',
  blueDark: '#2A6FC0',
  cyan: '#1FA5B8',
  red: '#DD3C38',
  olive: '#8A8A2B',
  orange: '#EE8420',
  purple: '#8B5CF6',
}

/** Редове в класациите — добро/лошо, по конвенцията на изгледа. */
export const ROW_TONES = {
  good: { bg: '#D9F2D9', fg: '#2E7D32' },
  teal: { bg: '#D2EFEA', fg: '#00695C' },
  blue: { bg: '#D6E9F8', fg: '#1565C0' },
  bad: { bg: '#FBD9D9', fg: '#C62828' },
  soft: { bg: '#E3EEF9', fg: '#1565C0' },
} as const

export type RowTone = keyof typeof ROW_TONES

// ── Числа по български ──────────────────────────────────────────────────────
export function bgNum(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('bg-BG', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

// ── KPI карта ───────────────────────────────────────────────────────────────
export function KpiCard({
  value, label, icon, from, to,
}: {
  value: string
  label: string
  icon: string
  from: string
  to: string
}) {
  return (
    <div
      className="flex items-center gap-3 rounded px-3.5 py-3 text-white shadow-sm"
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-white/20">
        <Icon name={icon} size={16} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[24px] font-semibold leading-none tracking-tight">
          {value}
        </span>
        <span className="mt-1 block line-clamp-2 text-[12.5px] leading-snug text-white/90">{label}</span>
      </span>
    </div>
  )
}

// ── Линейна графика ─────────────────────────────────────────────────────────
export interface Point {
  label: string
  value: number
  /** ред с дата в подсказката */
  tip?: string
}

function niceScale(min: number, max: number, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { lo: 0, hi: 1, ticks: [0, 1] }
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1
    min -= pad
    max += pad
  }
  const raw = (max - min) / Math.max(1, count - 1)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(6)))
  return { lo, hi: ticks[ticks.length - 1], ticks }
}

export function LineChart({
  points, color, yLabel, seriesLabel, format = (v) => bgNum(v, 2), height = 215,
}: {
  points: Point[]
  color: string
  yLabel: string
  seriesLabel: string
  format?: (v: number) => string
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  // id-то трябва да е валидно в SVG — заглавието съдържа интервали и кирилица,
  // затова се ползва генериран идентификатор, а не текстът на серията.
  const gradId = `grad-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  if (points.length === 0) {
    return (
      <div className="grid h-[215px] place-items-center text-[13px] text-ink-400">
        Няма данни за избрания период.
      </div>
    )
  }

  const W = 620
  const H = height
  const padL = 14
  const padR = 58
  const padT = 30
  const padB = 32
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const scale = niceScale(Math.min(...points.map((p) => p.value)), Math.max(...points.map((p) => p.value)), 5)
  const x = (i: number) =>
    padL + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW)
  const y = (v: number) => padT + plotH - ((v - scale.lo) / (scale.hi - scale.lo)) * plotH

  const active = hover ?? points.length - 1
  const ap = points[active]
  const ax = x(active)
  const ay = y(ap.value)

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)} L${x(0).toFixed(1)},${(padT + plotH).toFixed(1)} Z`

  const tipW = 196
  // подсказката се задържа в полето на графиката, за да не закрива оста Y
  const tipX = Math.min(Math.max(ax - tipW / 2, padL), padL + plotW - tipW)
  const tipY = Math.max(ay - 52, 0)
  const showEvery = points.length > 8 ? 2 : 1

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img" aria-label={seriesLabel}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* мрежа */}
      {scale.ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={padL + plotW} y1={y(t)} y2={y(t)} stroke="#E6EAF0" strokeWidth="1" />
          <text x={W - padR + 10} y={y(t) + 4} fontSize="11" fill="#6B7A8D">
            {bgNum(t, scale.hi < 10 ? 1 : 0)}
          </text>
        </g>
      ))}

      {/* вертикална отметка на активната точка */}
      <line x1={ax} x2={ax} y1={padT} y2={padT + plotH} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />

      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* точки */}
      {points.map((p, i) => (
        <circle
          key={p.label + i}
          cx={x(i)}
          cy={y(p.value)}
          r={i === active ? 5 : 3}
          fill="#fff"
          stroke={color}
          strokeWidth={i === active ? 3 : 2}
        />
      ))}

      {/* зона за посочване */}
      {points.map((p, i) => (
        <rect
          key={`hit-${i}`}
          x={x(i) - plotW / Math.max(1, points.length * 2)}
          y={padT}
          width={plotW / Math.max(1, points.length)}
          height={plotH}
          fill="transparent"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        />
      ))}

      {/* оста X */}
      {points.map((p, i) => {
        if (i % showEvery !== 0 && i !== points.length - 1) return null
        const anchor = i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'
        return (
          <text key={`x-${i}`} x={x(i)} y={H - 10} fontSize="11" fill="#6B7A8D" textAnchor={anchor}>
            {p.label}
          </text>
        )
      })}

      {/* име на оста Y */}
      <text
        x={W - 12}
        y={padT + plotH / 2}
        fontSize="11"
        fill="#8A97A8"
        textAnchor="middle"
        transform={`rotate(90 ${W - 12} ${padT + plotH / 2})`}
      >
        {yLabel}
      </text>

      {/* подсказка */}
      <g pointerEvents="none">
        <rect x={tipX} y={tipY} width={tipW} height={44} rx="3" fill="#fff" stroke="#C9D4E2" />
        <text x={tipX + 8} y={tipY + 17} fontSize="11" fill="#5A6B80">
          {ap.tip ?? ap.label}
        </text>
        <circle cx={tipX + 12} cy={tipY + 31} r="3" fill={color} />
        <text x={tipX + 20} y={tipY + 35} fontSize="11" fill="#5A6B80">
          {seriesLabel}: <tspan fontWeight="600" fill="#2B3A4D">{format(ap.value)}</tspan>
        </text>
      </g>
    </svg>
  )
}

// ── Карта с класация ────────────────────────────────────────────────────────
export function RankCard({
  title, icon, children, className = '',
}: {
  title: string
  icon: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`overflow-hidden rounded border border-ink-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-center gap-2 bg-[#2E7DD1] px-3 py-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-white/25 text-white">
          <Icon name={icon} size={12} />
        </span>
        <h3 className="truncate text-[11.5px] font-bold uppercase tracking-wide text-white">{title}</h3>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

export function RankColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 text-center text-[12px] font-semibold text-[#2E7DD1]">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export function RankRow({
  label, value, tone, icon,
}: {
  label: string
  value: string
  tone: RowTone
  icon?: string
}) {
  const t = ROW_TONES[tone]
  return (
    <div
      className="flex items-center justify-between gap-2 rounded px-2 py-[5px]"
      style={{ background: t.bg }}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {icon && (
          <span className="shrink-0" style={{ color: t.fg }}>
            <Icon name={icon} size={12} />
          </span>
        )}
        <span className="truncate text-[12px] font-medium text-[#33404F]">{label}</span>
      </span>
      <span
        className="shrink-0 rounded bg-white/75 px-1.5 py-[1px] text-[11.5px] font-semibold tabular-nums"
        style={{ color: t.fg }}
      >
        {value}
      </span>
    </div>
  )
}

/** Заглавна лента на карта с графика — икона, заглавие, меню и избор на период. */
export function ChartCard({
  title, icon, period, onPeriod, children,
}: {
  title: string
  icon: string
  period: string
  onPeriod: (p: string) => void
  children: React.ReactNode
}) {
  const periods = ['1м', '3м', '6м', '1г']
  return (
    <div className="overflow-hidden rounded border border-ink-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon name={icon} size={15} className="shrink-0 text-[#2E7DD1]" />
          <h3 className="truncate text-[12px] font-bold uppercase tracking-wide text-[#2E7DD1]">
            {title}
          </h3>
        </div>
        <Icon name="list" size={15} className="shrink-0 text-ink-300" />
      </div>
      <div className="px-4 pb-3 pt-3">
        <div className="mb-1 flex items-center gap-3">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => onPeriod(p)}
              className={`text-[12px] transition ${
                p === period
                  ? 'font-bold text-ink-800'
                  : 'font-medium text-ink-400 hover:text-ink-600'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        {children}
      </div>
    </div>
  )
}

export const MONTHS_SHORT = [
  'Яну', 'Фев', 'Мар', 'Апр', 'Май', 'Юни',
  'Юли', 'Авг', 'Сеп', 'Окт', 'Ное', 'Дек',
]

export function shiftDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  // без toISOString() — той минава през UTC и измества датата назад в GMT+3
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function dayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`
}

export function longLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${MONTHS_SHORT[d.getMonth()]}. ${d.toLocaleDateString('en-GB', {
    month: 'short', day: 'numeric', year: 'numeric',
  })}`
}
