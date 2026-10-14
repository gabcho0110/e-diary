import React from 'react'
import { Icon } from '../../components/ui'
import type { Student } from '../../lib/types'

/**
 * Общи елементи за всичките раздели на модул „Дневник".
 * Изгледът следва референтния дневник: лента с цветни бутони отгоре,
 * таблица с тънки линии и „№ / Ученик" в първите две колони.
 */

/** Бутон от лентата с действия. */
export function TB({
  icon, children, tone = 'teal', onClick, disabled, title,
}: {
  icon?: string
  children: React.ReactNode
  tone?: 'teal' | 'green' | 'blue' | 'purple' | 'red' | 'gold'
  onClick?: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={`db db-${tone}`}>
      {icon && <Icon name={icon} size={14} strokeWidth={2.2} />}
      {children}
    </button>
  )
}

/** Лентата с действия под разделите. */
export function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b border-[var(--dn-line)] pb-2.5">
      {children}
    </div>
  )
}

/** Бутон „Филтри" в дясно, както е в образеца. */
export function FilterButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-auto inline-flex items-center gap-1.5 rounded-[3px] border border-ink-200 bg-ink-50
        px-2.5 py-1.5 text-[12.5px] font-semibold text-ink-600 transition hover:bg-ink-100"
    >
      <Icon name="filter" size={13} strokeWidth={2.2} /> Филтри
    </button>
  )
}

/** Номер на ученик с иконата до него — както е в списъците. */
export function StudentCell({ student, showNumber = true }: { student?: Student; showNumber?: boolean }) {
  if (!student) return <span className="text-ink-400">—</span>
  const left = student.status !== 'активен'
  return (
    <span className="inline-flex items-center gap-1.5">
      {showNumber && <span className="font-bold text-ink-400">{student.number}.</span>}
      <Icon name="person" size={14} className="shrink-0 text-[#3598dc]" strokeWidth={2} />
      <span className={`font-medium ${left ? 'text-[#b42318]' : 'text-[#2b6ca3]'}`}>
        {student.firstName} {student.middleName ? `${student.middleName[0]}. ` : ''}{student.lastName}
      </span>
      {left && <span className="text-[11px] text-[#b42318]">({student.status})</span>}
      {student.sen && <span className="text-[10px] font-bold text-[#6b21a8]">(СОП)</span>}
    </span>
  )
}

/** Клетка с бройка — оцветена според смисъла, както в образеца. */
export function Num({
  value, tone, title,
}: { value: number | string; tone: 'olive' | 'salmon' | 'green' | 'zero'; title?: string }) {
  return <span className={`dn-num dn-${tone}`} title={title}>{value}</span>
}

/** Двойка икони „редактирай / изтрий" в последната колона. */
export function RowActions({
  onEdit, onDelete, onCopy, extra,
}: { onEdit?: () => void; onDelete?: () => void; onCopy?: () => void; extra?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {extra}
      {onEdit && (
        <button type="button" onClick={onEdit} title="Редактирай"
          className="grid h-[19px] w-[19px] place-items-center rounded-[3px] bg-[#3598dc] text-white hover:brightness-110">
          <Icon name="edit" size={11} strokeWidth={2.4} />
        </button>
      )}
      {onCopy && (
        <button type="button" onClick={onCopy} title="Копирай"
          className="grid h-[19px] w-[19px] place-items-center rounded-[3px] bg-[#8e44ad] text-white hover:brightness-110">
          <Icon name="archive" size={11} strokeWidth={2.4} />
        </button>
      )}
      {onDelete && (
        <button type="button" onClick={onDelete} title="Изтрий"
          className="grid h-[19px] w-[19px] place-items-center rounded-[3px] bg-[#e7505a] text-white hover:brightness-110">
          <Icon name="close" size={11} strokeWidth={2.6} />
        </button>
      )}
    </span>
  )
}

/** Таблица в стила на дневника — без вертикални отстъпи, тънки линии. */
export function DnTable({
  head, children, minWidth = 760,
}: { head: React.ReactNode; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-[3px] border border-[var(--dn-line)] bg-white">
      <table className="w-full border-collapse" style={{ minWidth }}>
        <thead className="bg-[#fbfcfd]">
          <tr className="[&>th]:border-b [&>th]:border-[var(--dn-line)]">{head}</tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-[var(--dn-line)]">{children}</tbody>
      </table>
    </div>
  )
}

export function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left text-[12px] font-bold text-ink-800 ${className}`}>{children}</th>
}

/** Празно състояние вътре в таблицата — „Все още не са въвеждани …". */
export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-6 text-center text-[13px] text-ink-500">{text}</td>
    </tr>
  )
}

/** Информационна лента над таблицата (жълтеникава, както в образеца). */
export function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-[3px] border border-[#f3e2b8] bg-[#fffdf3] px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-700">
      <Icon name="info" size={15} className="mt-0.5 shrink-0 text-[#c49f47]" />
      <div>{children}</div>
    </div>
  )
}

/** Долен ред „Последна редакция …". */
export function LastEdited({ when, who }: { when: string; who: string }) {
  return (
    <p className="mt-3 text-center text-[12px] text-ink-500">
      Последна редакция: <span className="text-ink-700">{when}</span> от{' '}
      <span className="text-[#2b6ca3]">{who}</span>
    </p>
  )
}

/** Час във формат „13:00 - 13:35" по образеца. */
export function periodTime(period: number, shift: 1 | 2): [string, string] {
  const base = shift === 1 ? 8 * 60 : 13 * 60
  const starts = [0, 45, 95, 140, 190, 235, 285, 330]
  const start = base + starts[Math.min(period, starts.length - 1)]
  const end = start + 35
  const f = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  return [f(start), f(end)]
}

/** „2026-10-18T11:25" → „18.10.2026 11:25" */
export function formatDateTime(v?: string): string {
  if (!v) return '—'
  const [date, time] = v.split('T')
  const [y, m, d] = date.split('-')
  if (!y || !m || !d) return v
  return `${d}.${m}.${y}${time ? ` ${time.slice(0, 5)}` : ''}`
}

/** „2026-10-18T11:25" → „18.10.2026" */
export function dateOnly(v?: string): string {
  return formatDateTime(v).split(' ')[0]
}

/** Обединен списък от дата и час за `<input type="datetime-local">`. */
export const nowLocal = () => {
  const n = new Date()
  const p = (x: number) => String(x).padStart(2, '0')
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}T${p(n.getHours())}:${p(n.getMinutes())}`
}
