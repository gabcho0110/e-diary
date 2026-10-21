import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/ui'

/**
 * Общи елементи за екраните в „Администрация".
 *
 * Изгледът следва референтния дневник: тънка лента със заглавие и икона,
 * ред с цветни бутони за действия, бяла лента с филтри и таблица.
 */

/** Заглавие на списък — малка икона + име, както е в референтния дневник. */
export function ListHead({ icon, title, count }: { icon: string; title: string; count?: number }) {
  return (
    <div className="mb-2.5 flex items-center gap-2 text-[13.5px] font-semibold text-[#3d4a56]">
      <Icon name={icon} size={15} className="text-[#5b6b78]" />
      <span>{title}</span>
      {count !== undefined && (
        <span className="rounded bg-[#eef2f5] px-1.5 py-0.5 text-[11px] font-bold text-[#5b6b78]">{count}</span>
      )}
    </div>
  )
}

/** Ред с цветни бутони (Добави, Добави сб. гр., …). */
export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 flex flex-wrap items-center gap-1.5">{children}</div>
}

/** Цветен бутон от лентата с действия — същите цветове като в референтния дневник. */
export function ToolBtn({
  tone = 'green', icon, children, onClick, title,
}: {
  tone?: 'green' | 'teal' | 'blue' | 'purple' | 'gold' | 'red'
  icon?: string
  children: React.ReactNode
  onClick?: () => void
  title?: string
}) {
  return (
    <button type="button" onClick={onClick} title={title} className={`db db-${tone}`}>
      {icon && <Icon name={icon} size={14} strokeWidth={2.2} />}
      {children}
    </button>
  )
}

/** Малък квадратен бутон в колона „Операции" — син (редакция) или червен (изтриване). */
export function SquareAction({
  tone, icon = 'edit', onClick, title,
}: { tone: 'blue' | 'red'; icon?: string; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="inline-grid h-[26px] w-[26px] place-items-center rounded-[3px] text-white transition hover:brightness-95"
      style={{ background: tone === 'blue' ? '#3598dc' : '#e7505a' }}
    >
      <Icon name={icon} size={14} strokeWidth={2.4} />
    </button>
  )
}

/** Лента с раздели на формуляра — „Основни данни | Предмети и учители". */
export function FormTabs({
  tabs, active, onChange,
}: { tabs: { id: string; label: string; icon: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex items-stretch border-b border-ink-200 bg-[#f7f9fa]">
      {tabs.map((t) => {
        const on = active === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`-mb-px inline-flex items-center gap-1.5 border-r border-ink-200 px-3.5 py-2.5 text-[13px] font-semibold transition ${
              on ? 'border-b-2 border-b-white bg-white text-[#2b6ca3]' : 'text-[#5b6b78] hover:bg-white/60'
            }`}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/** Ред от формуляр: етикет вдясно подравнен, поле — както в референтния дневник. */
export function FormRow({
  label, required, children, hint, wide,
}: { label: string; required?: boolean; children: React.ReactNode; hint?: string; wide?: boolean }) {
  return (
    <div className="mb-2.5 flex items-start gap-3">
      <span className="w-[210px] shrink-0 pt-2 text-right text-[13px] font-semibold text-[#3d4a56]">
        {label}
        {required && <span className="ml-0.5 text-[#e7505a]">*</span>}
      </span>
      <div className={wide ? 'min-w-0 flex-1' : 'w-full max-w-[420px]'}>
        {children}
        {hint && <p className="mt-1 text-[11.5px] leading-snug text-ink-400">{hint}</p>}
      </div>
    </div>
  )
}

/** Полето на формулярите в „Администрация" — по-стегнато от основното. */
export function AInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-[3px] border border-[#c7d0d8] bg-white px-2.5 py-[7px] text-[13px] text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-[#3598dc] focus:ring-1 focus:ring-[#3598dc]/30 ${props.className ?? ''}`}
    />
  )
}

export function ASelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-[3px] border border-[#c7d0d8] bg-white px-2 py-[7px] pr-7 text-[13px] text-ink-900 outline-none transition focus:border-[#3598dc] focus:ring-1 focus:ring-[#3598dc]/30 ${props.className ?? ''}`}
    />
  )
}

/** Многоредов избор (напр. предмети на учител) — списък с чекбоксове. */
export function CheckList({
  items, selected, onToggle, height = 150, empty = 'Няма налични',
}: {
  items: { id: string; label: string }[]
  selected: string[]
  onToggle: (id: string) => void
  height?: number
  empty?: string
}) {
  if (!items.length) return <p className="text-[12px] text-ink-400">{empty}</p>
  return (
    <div className="overflow-y-auto rounded-[3px] border border-[#c7d0d8] bg-white p-1" style={{ maxHeight: height }}>
      {items.map((it) => (
        <label
          key={it.id}
          className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-[3px] text-[12.5px] text-ink-800 hover:bg-[#eef6fb]"
        >
          <input
            type="checkbox"
            checked={selected.includes(it.id)}
            onChange={() => onToggle(it.id)}
            className="h-[13px] w-[13px] rounded-sm accent-[#3598dc]"
          />
          <span className="truncate">{it.label}</span>
        </label>
      ))}
    </div>
  )
}

/**
 * Избор на предмети с търсене — падащ панел с поле за търсене и чекбоксове.
 *
 * Бутонът „Избери предмет" отваря панела; „+" до него добавя още предмети към
 * вече избраните. Избраното се вижда като чипове под полето, за да не се губи
 * при затворен панел.
 */
export function SubjectPicker({
  items, selected, onChange, placeholder = 'Избери предмет', empty = 'Няма намерен предмет',
}: {
  items: { id: string; label: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  empty?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    field.current?.focus()
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const needle = q.trim().toLowerCase()
  const shown = needle ? items.filter((it) => it.label.toLowerCase().includes(needle)) : items
  const chosen = items.filter((it) => selected.includes(it.id))
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  return (
    <div ref={box} className="relative">
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); setQ('') }}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[3px] border border-[#c7d0d8] bg-white px-2.5 py-[7px] text-left text-[13px] outline-none transition hover:border-[#3598dc] focus:border-[#3598dc] focus:ring-1 focus:ring-[#3598dc]/30"
        >
          <span className={`min-w-0 flex-1 truncate ${chosen.length ? 'text-ink-900' : 'text-ink-400'}`}>
            {chosen.length
              ? chosen.map((c) => c.label).join(', ')
              : placeholder}
          </span>
          <Icon name="chevronDown" size={13} className="shrink-0 text-[#5b6b78]" />
        </button>
        <button
          type="button"
          title="Добави още предмет"
          onClick={() => { setOpen(true); setQ('') }}
          className="grid w-[31px] shrink-0 place-items-center rounded-[3px] text-white"
          style={{ background: '#26c281' }}
        >
          <Icon name="plus" size={14} strokeWidth={2.6} />
        </button>
      </div>

      {chosen.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {chosen.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1 rounded-[3px] bg-[#eef6fb] px-1.5 py-[2px] text-[11.5px] font-semibold text-[#2f6f96]">
              {c.label}
              <button
                type="button"
                title="Премахни предмета"
                onClick={() => toggle(c.id)}
                className="grid h-[13px] w-[13px] place-items-center rounded-sm text-[#7f9bb0] hover:bg-[#d9e8f3] hover:text-[#2f6f96]"
              >
                <Icon name="close" size={9} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 z-40 mt-1 rounded-[3px] border border-[#c7d0d8] bg-white shadow-[0_8px_22px_rgba(30,45,60,0.16)]">
          <div className="border-b border-[#e4e9ee] p-1.5">
            <div className="flex items-center gap-1.5 rounded-[3px] border border-[#c7d0d8] px-1.5">
              <Icon name="search" size={12} className="shrink-0 text-ink-400" />
              <input
                ref={field}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Търси предмет…"
                className="w-full bg-transparent py-[5px] text-[12.5px] text-ink-900 outline-none placeholder:text-ink-400"
              />
              {q && (
                <button type="button" onClick={() => setQ('')} className="text-ink-400 hover:text-ink-700">
                  <Icon name="close" size={11} strokeWidth={2.6} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[210px] overflow-y-auto p-1">
            {shown.length === 0 && <p className="px-2 py-3 text-[12px] text-ink-400">{empty}</p>}
            {shown.map((it) => (
              <label
                key={it.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-[4px] text-[12.5px] text-ink-800 hover:bg-[#eef6fb]"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(it.id)}
                  onChange={() => toggle(it.id)}
                  className="h-[13px] w-[13px] rounded-sm accent-[#3598dc]"
                />
                <span className="truncate">{it.label}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-[#e4e9ee] px-2 py-1.5">
            <span className="text-[11.5px] text-ink-400">Избрани: {chosen.length}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-[3px] px-2.5 py-1 text-[12px] font-semibold text-white"
              style={{ background: '#3598dc' }}
            >
              Готово
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Празно състояние в таблица. */
export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center text-[13px] text-ink-400">{text}</td>
    </tr>
  )
}

/** Стойност в таблица — „—", когато липсва. */
export function Dash({ children }: { children?: React.ReactNode }) {
  const empty = children === undefined || children === null || children === '' || children === 0
  return <span className={empty ? 'text-ink-300' : undefined}>{empty ? '—' : children}</span>
}
