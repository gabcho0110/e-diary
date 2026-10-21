import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Field, Icon, Input, Modal, Select, Textarea } from '../../components/ui'
import type { Absence, Klass, ScheduleEntry, Student } from '../../lib/types'
import { DnTable, EmptyRow, FilterButton, Num, StudentCell, TB, Th, Toolbar, dateOnly } from './shared'
import { DAY_NAMES, addDays, ddmm, mondayOf } from '../../lib/week'

/**
 * Раздел „Отсъствия" — по ръководството на референтния дневник.
 *
 *  1. „Добави" отваря цял екран с часовете за избраната дата: редове са
 *     учениците, колоните — часовете от разписанието (с предмет и учител),
 *     плюс колона „Цял ден". Клик върху клетка минава през
 *     Присъства → Отсъства → Закъснение → Присъства.
 *  2. След „Запази" излиза зелено съобщение „Успешно добавихте N отсъствия."
 *  3. Клик върху числата на ученик отваря жълт панел с всяко отсъствие —
 *     кой предмет, кой час, кога и от кого е въведено, с „Уважи" и „Изтрий".
 *  4. „Администрирай" е седмичен режим за класния ръководител — редове
 *     ученици, колони дните от седмицата.
 *
 * Права (по образеца): обикновеният учител въвежда и трие само по своите
 * предмети и само своите отсъствия; класният ръководител и администраторът —
 * по всичко. „Уважи" и „Администрирай" се виждат само от тях.
 */

type Status = 'присъства' | 'неуважително' | 'закъснение'

const HOURS_PER_DAY = 7

const cycle = (s: Status): Status =>
  s === 'присъства' ? 'неуважително' : s === 'неуважително' ? 'закъснение' : 'присъства'

/** „Присъс" / „Отсъства" / „Закъс" — както са в клетките на образеца. */
const CELL_LABEL: Record<Status, string> = {
  'присъства': 'Присъс',
  'неуважително': 'Отсъства',
  'закъснение': 'Закъс',
}

const CELL_STYLE: Record<Status, string> = {
  'присъства': 'bg-[#f7f9fa] text-[#7d8c98] hover:bg-[#eef3f6]',
  'неуважително': 'bg-[#e7505a] text-white hover:brightness-95',
  'закъснение': 'bg-[#e8a33d] text-white hover:brightness-95',
}

const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Какво показва панелът с подробности. Кликът върху конкретна колона филтрира
 * списъка и оцветява панела според вида — както е в референтния дневник:
 *   Закъснения  → жълт
 *   Неуважени   → червеникав
 *   Уважени     → зелен
 *   (ученик)    → неутрален, всички отсъствия
 */
type DetailMode = 'закъснения' | 'неуважени' | 'уважени' | 'всички'

const PANEL: Record<DetailMode, { bg: string; border: string; icon: string; empty: string }> = {
  'закъснения': { bg: '#dfdca7', border: '#c5c065', icon: '#7a7320', empty: 'Няма закъснения за този ученик.' },
  'неуважени': { bg: '#f5c7b6', border: '#e29b82', icon: '#a2452a', empty: 'Няма неуважени отсъствия за този ученик.' },
  'уважени': { bg: '#c0e2d4', border: '#8ec5ab', icon: '#1c5e46', empty: 'Няма уважени отсъствия за този ученик.' },
  'всички': { bg: '#eef3f7', border: '#cfdde8', icon: '#337ab7', empty: 'За този ученик няма въведени отсъствия.' },
}

const todayISO = () => isoOf(new Date())

/** 1 = понеделник … 7 = неделя (българската подредба, не JS-овата). */
const weekdayOf = (iso: string) => ((new Date(iso + 'T00:00:00').getDay() + 6) % 7) + 1

// ── Цял екран: въвеждане на отсъствия за една дата ──────────────────────────
function AbsencesAddPage({
  klass, students, absences, date, setDate, canEditColumn, onSave, onBack, onAdmin,
}: {
  klass: Klass
  students: Student[]
  absences: Absence[]
  date: string
  setDate: (v: string) => void
  canEditColumn: (entry: ScheduleEntry) => boolean
  onSave: (cells: Record<string, Status>, cleared: string[]) => void
  onBack: () => void
  onAdmin: () => void
}) {
  const { db, subjectShort, userName } = useApp()
  const [cells, setCells] = useState<Record<string, Status>>({})
  /**
   * Какво е имало при отварянето. Трием само клетки, които потребителят
   * наистина е върнал на „Присъства" — иначе при два записа в един и същ час
   * (среща се в демото) единият изчезваше, без да е пипан.
   */
  const initialRef = useRef<Record<string, Status>>({})

  /** Колоните са часовете от разписанието за този ден от седмицата. */
  const columns = useMemo(() => {
    const wd = weekdayOf(date)
    const list = db.schedule
      .filter((s) => s.classId === klass.id && s.day === wd)
      .sort((a, b) => a.period - b.period)
    if (list.length) return list
    // ден без разписание (напр. събота) — оставяме часовете, за да може да се въведе
    return Array.from({ length: 7 }, (_, i) => ({
      id: `free-${i + 1}`, classId: klass.id, day: wd as 1, period: i + 1,
      subjectId: '', teacherId: '', roomId: undefined,
    })) as ScheduleEntry[]
  }, [db.schedule, klass.id, date])

  /** При отваряне (и при смяна на датата) показваме вече въведеното. */
  useEffect(() => {
    const next: Record<string, Status> = {}
    for (const a of absences) {
      if (a.date !== date) continue
      const key = `${a.studentId}|${a.wholeDay ? 'day' : a.period}`
      const st: Status = a.reason === 'закъснение' ? 'закъснение' : 'неуважително'
      // закъснението е „по-силно" от отсъствие, ако има дубликат
      if (!next[key] || st === 'закъснение') next[key] = st
    }
    initialRef.current = next
    setCells(next)
  }, [date, absences])

  const statusOf = (key: string) => cells[key] ?? 'присъства'
  const toggle = (key: string, editable: boolean) => {
    if (!editable) return
    setCells((p) => {
      const next = cycle(p[key] ?? 'присъства')
      const copy = { ...p }
      if (next === 'присъства') delete copy[key]
      else copy[key] = next
      return copy
    })
  }

  const chosen = Object.values(cells).filter((s) => s !== 'присъства').length

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#eef1f2]">
      {/* горна лента — точната подредба от образеца */}
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-200 bg-white px-4 py-2.5 shadow-sm">
        <h2 className="flex min-w-0 items-center gap-2 truncate text-[14.5px] font-bold text-ink-800">
          <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-[#337ab7] text-[11px] font-bold leading-none text-[#337ab7]">i</span>
          Въвеждане на отсъствия за {klass.name}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCells({})}
            title="Изчисти избора"
            className="db db-blue"
          >
            Избрани ({chosen})
          </button>
          <button type="button" onClick={onBack} className="db border border-ink-200 bg-ink-50 !text-ink-600 hover:bg-ink-100">
            <Icon name="chevronLeft" size={14} strokeWidth={2.2} /> Назад
          </button>
          <button type="button" onClick={() => onSave(cells, Object.keys(initialRef.current).filter((k) => !cells[k]))} className="db db-green">
            <Icon name="check" size={14} strokeWidth={2.4} /> Запази
          </button>
        </div>
      </div>

      {/* дата + връзка към седмичния режим */}
      <div className="flex flex-wrap items-center gap-4 border-b border-ink-200 bg-white px-4 py-2.5">
        <label className="flex items-center gap-2 text-[13px] font-bold text-ink-800">
          За дата
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="!w-[168px] !py-1" />
        </label>
        <button
          type="button"
          onClick={onAdmin}
          className="ml-auto text-[12.5px] font-semibold text-[#337ab7] hover:underline"
        >
          Администриране в седмичен режим
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <table className="w-full border-collapse bg-white" style={{ minWidth: 760 }}>
          <thead>
            <tr className="bg-[#fbfcfd]">
              <th className="th w-[42px]">№</th>
              <th className="th min-w-[190px] text-left">Ученик</th>
              {columns.map((c) => {
                const editable = canEditColumn(c)
                return (
                  <th key={c.id} className="th w-[78px] p-1 align-bottom">
                    <div className="mx-auto flex h-[108px] items-end justify-center">
                      <span
                        className={`text-[11.5px] font-bold leading-tight ${editable ? 'text-[#337ab7]' : 'text-ink-300'}`}
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                        title={editable ? 'Можете да въвеждате по този предмет' : 'Въвежда само учителят по предмета'}
                      >
                        {c.period}.{' '}
                        <Icon name="book" size={11} className="inline align-[-1px]" strokeWidth={2} />
                        {' '}
                        {c.subjectId ? subjectShort(c.subjectId) : '—'}
                        {c.teacherId ? ` - ${userName(c.teacherId).split(' ').slice(-1)[0]}` : ''}
                      </span>
                    </div>
                  </th>
                )
              })}
              <th className="th w-[92px]">Цял ден</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-[#f7fbfd]">
                <td className="td text-[12px] font-bold text-ink-400">{s.number}</td>
                <td className="td whitespace-nowrap text-[13px]">
                  {s.firstName} {s.middleName ? `${s.middleName[0]}. ` : ''}{s.lastName}
                </td>
                {columns.map((c) => {
                  const key = `${s.id}|${c.period}`
                  const st = statusOf(key)
                  const editable = canEditColumn(c)
                  return (
                    <td key={c.id} className="border-l border-ink-100 p-0">
                      <button
                        type="button"
                        disabled={!editable}
                        onClick={() => toggle(key, editable)}
                        className={`h-[34px] w-full text-[11.5px] font-semibold transition ${
                          editable ? CELL_STYLE[st] : 'cursor-not-allowed bg-[#f4f6f8] text-ink-300'
                        }`}
                      >
                        {editable ? CELL_LABEL[st] : '—'}
                      </button>
                    </td>
                  )
                })}
                <td className="border-l border-ink-100 p-0">
                  {(() => {
                    const key = `${s.id}|day`
                    const st = statusOf(key)
                    return (
                      <button
                        type="button"
                        onClick={() => toggle(key, true)}
                        className={`h-[34px] w-full text-[11.5px] font-semibold transition ${CELL_STYLE[st]}`}
                      >
                        {CELL_LABEL[st]}
                      </button>
                    )
                  })()}
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={columns.length + 3} className="px-3 py-8 text-center text-[13px] text-ink-500">В паралелката няма активни ученици.</td></tr>
            )}
          </tbody>
        </table>

        <p className="mt-3 text-[11.5px] text-ink-500">
          Клик върху клетка: <b>Присъс</b> → <b className="text-[#b42318]">Отсъства</b> →
          {' '}<b className="text-[#a97313]">Закъс</b> → отново присъства.
          Въвеждате само по своите предмети; класният ръководител — по всички.
        </p>
      </div>
    </div>
  )
}

// ── Цял екран: уважаване на отсъствия за една дата ──────────────────────────

/** Причини за уважаване — падащото меню от референтния екран. */
const EXCUSE_REASONS: { label: string; kind: Absence['reason'] }[] = [
  { label: 'Здравословни', kind: 'извинено' },
  { label: 'Семейни причини', kind: 'семейни причини' },
  { label: 'Учебни и спортни дейности', kind: 'извинено' },
  { label: 'Други', kind: 'извинено' },
]

/**
 * Клетка в екрана за уважаване. Цветовете са измерени от образеца:
 * сиво „Присъс", оранжево „Закъс", коралово „Неуваж".
 */
const EXC_CELL: Record<'присъства' | 'закъснение' | 'неуважено' | 'уважено', { label: string; bg: string; fg: string }> = {
  'присъства': { label: 'Присъс', bg: '#e8e8e8', fg: '#8a8a8a' },
  'закъснение': { label: 'Закъс', bg: '#eeb667', fg: '#ffffff' },
  'неуважено': { label: 'Неуваж', bg: '#f4726d', fg: '#ffffff' },
  'уважено': { label: 'Уваж', bg: '#26c281', fg: '#ffffff' },
}

type ExcStatus = keyof typeof EXC_CELL

/**
 * „Уважи" от лентата — цял екран по образеца.
 *
 * Редовете са учениците, колоните — часовете от разписанието за избраната
 * дата. Клетката показва какво е въведено; клик върху „Закъс" или „Неуваж"
 * маркира отсъствието (избледнява), а „✓ Уважи" записва избраните с причината
 * и коментара отгоре.
 */
function ExcusePage({
  klass, students, absences, onDone, onBack,
}: {
  klass: Klass
  students: Student[]
  absences: Absence[]
  onDone: (message: string) => void
  onBack: () => void
}) {
  const { db, subjectShort, userName, excuseAbsences } = useApp()
  const [date, setDate] = useState(todayISO())
  const [reasonIdx, setReasonIdx] = useState(0)
  const [comment, setComment] = useState('')
  const [picked, setPicked] = useState<Record<string, true>>({})
  const [warn, setWarn] = useState('')

  /** Колоните са часовете от разписанието за този ден от седмицата. */
  const columns = useMemo(() => {
    const wd = weekdayOf(date)
    const list = db.schedule
      .filter((s) => s.classId === klass.id && s.day === wd)
      .sort((a, b) => a.period - b.period)
    if (list.length) return list
    return Array.from({ length: 7 }, (_, i) => ({
      id: `free-${i + 1}`, classId: klass.id, day: wd as 1, period: i + 1,
      subjectId: '', teacherId: '',
    })) as ScheduleEntry[]
  }, [db.schedule, klass.id, date])

  /** Всички отсъствия на ученика за дадения час (включително „цял ден"). */
  const cellsOf = (studentId: string, period: number) =>
    absences.filter((a) => a.date === date && a.studentId === studentId && (a.wholeDay || a.period === period))

  const statusOf = (list: Absence[]): ExcStatus => {
    if (list.some((a) => !a.excused && a.reason !== 'закъснение')) return 'неуважено'
    if (list.some((a) => a.reason === 'закъснение' && !a.excused)) return 'закъснение'
    if (list.some((a) => a.excused)) return 'уважено'
    return 'присъства'
  }

  const toggle = (list: Absence[]) => {
    const ids = list.filter((a) => !a.excused).map((a) => a.id)
    if (!ids.length) return
    setWarn('')
    setPicked((p) => {
      const next = { ...p }
      const on = ids.every((id) => next[id])
      ids.forEach((id) => { if (on) delete next[id]; else next[id] = true })
      return next
    })
  }

  const chosen = Object.keys(picked).length
  const total = absences.filter((a) => a.date === date).length

  const save = () => {
    const ids = Object.keys(picked)
    if (!ids.length) {
      setWarn('Изберете поне едно отсъствие — кликнете върху „Закъс" или „Неуваж".')
      return
    }
    const r = EXCUSE_REASONS[reasonIdx]
    excuseAbsences(ids, r.kind, comment || undefined, r.label)
    onDone(`Уважени ${ids.length} ${ids.length === 1 ? 'отсъствие' : 'отсъствия'}.`)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* горна лента */}
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-200 bg-white px-4 py-2.5 shadow-sm">
        <h2 className="flex min-w-0 items-center gap-2 truncate text-[14.5px] font-bold text-ink-800">
          <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-[#337ab7] text-[11px] font-bold leading-none text-[#337ab7]">i</span>
          Уважаване на отсъствия в {klass.name}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPicked({})}
            title="Изчисти избора"
            className="inline-flex items-center gap-1.5 rounded-[2px] bg-[#337ab7] px-2.5 py-[5px] text-[12.5px] font-semibold text-white transition hover:brightness-110"
          >
            Избрани
            <span className="inline-grid h-[17px] min-w-[17px] place-items-center rounded-[2px] bg-white/25 px-1 text-[11px] font-bold">
              {chosen}
            </span>
          </button>
          <button type="button" onClick={onBack} className="db border border-ink-200 bg-ink-50 !text-ink-600 hover:bg-ink-100">
            <Icon name="chevronLeft" size={14} strokeWidth={2.2} /> Назад
          </button>
          <button type="button" onClick={save} className="db db-green">
            <Icon name="check" size={14} strokeWidth={2.4} /> Уважи
          </button>
        </div>
      </div>

      {/* дата / причина / коментар */}
      <div className="border-b border-ink-200 bg-white px-4 py-3">
        <div className="grid items-center gap-y-2" style={{ gridTemplateColumns: '190px 340px' }}>
          <div className="pr-3 text-right text-[12.5px] font-bold text-ink-800">За дата</div>
          <Input
            type="date" value={date}
            onChange={(e) => { setDate(e.target.value); setPicked({}) }}
            className="!py-1"
          />

          <div className="pr-3 text-right text-[12.5px] font-bold text-ink-800">Причини</div>
          <Select value={reasonIdx} onChange={(e) => setReasonIdx(Number(e.target.value))} className="!py-1">
            {EXCUSE_REASONS.map((r, i) => <option key={r.label} value={i}>{r.label}</option>)}
          </Select>

          <div className="pr-3 text-right text-[12.5px] font-bold text-ink-800">Коментар</div>
          <Input value={comment} onChange={(e) => setComment(e.target.value)} className="!py-1" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
        <table className="w-full border-collapse bg-white" style={{ minWidth: 880 }}>
          <thead>
            <tr>
              <th className="w-[290px]" />
              {columns.map((c) => (
                <th key={c.id} className="p-1 align-bottom">
                  <div className="mx-auto flex h-[150px] items-end justify-center">
                    <span
                      className="text-[11.5px] font-bold leading-tight text-[#333333]"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      {c.period}.{' '}
                      <Icon name="book" size={11} className="inline align-[-1px]" strokeWidth={2} />
                      {' '}
                      {c.subjectId ? subjectShort(c.subjectId) : '—'}
                      {c.teacherId ? ` - ${userName(c.teacherId).split(' ').slice(-1)[0]}` : ''}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td className="py-[3px] pr-2 text-[12.5px] whitespace-nowrap">
                  <span className="font-bold text-ink-400">{s.number}.</span>{' '}
                  {s.firstName} {s.middleName ? `${s.middleName[0]}. ` : ''}{s.lastName}
                </td>
                {columns.map((c) => {
                  const list = cellsOf(s.id, c.period)
                  const st = statusOf(list)
                  const style = EXC_CELL[st]
                  const on = list.some((a) => picked[a.id])
                  return (
                    <td key={c.id} className="border-l border-white p-0">
                      <button
                        type="button"
                        disabled={st === 'присъства' || st === 'уважено'}
                        onClick={() => toggle(list)}
                        title={st === 'присъства' ? 'Няма отсъствие' : st === 'уважено' ? 'Вече е уважено' : 'Маркирай за уважаване'}
                        className={`h-[26px] w-full text-[11.5px] font-semibold transition ${
                          st === 'присъства' || st === 'уважено' ? 'cursor-default' : 'hover:brightness-[0.96]'
                        } ${on ? 'opacity-45' : ''}`}
                        style={{ background: style.bg, color: style.fg }}
                      >
                        {style.label}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="py-8 text-center text-[13px] text-ink-500">
                  В паралелката няма активни ученици.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-500">
          Клик върху <b>Закъс</b> или <b>Неуваж</b> маркира отсъствието — то избледнява.
          След това натиснете <b>✓ Уважи</b> и избраните отсъствия се уважават с причината и
          коментара отгоре. За {dateOnly(date)} има {total} {total === 1 ? 'отсъствие' : 'отсъствия'}.
        </p>
        {warn && <p className="mt-1 text-[11.5px] font-semibold text-[#b42318]">{warn}</p>}
      </div>
    </div>
  )
}

// ── Цял екран: администриране по разписанието на класа ──────────────────────

/**
 * Причините за уважаване, както са в референтния дневник — три кръгчета с
 * букви. Съответстват на полетата на `Absence`, за да не се налага ново
 * поле в базата:
 *   З → закъснение (не се уважава, само се отбелязва)
 *   С → семейни причини (уважено)
 *   Д → документ, т.е. извинено (уважено)
 */
const REASONS: {
  code: string
  label: string
  tone: string
  reason: Absence['reason']
  excused: boolean
}[] = [
  { code: 'З', label: 'Закъснение', tone: '#26c281', reason: 'закъснение', excused: false },
  { code: 'С', label: 'Семейни причини', tone: '#3598dc', reason: 'семейни причини', excused: true },
  { code: 'Д', label: 'Документ (извинено)', tone: '#e8a33d', reason: 'извинено', excused: true },
]

/**
 * „Администрирай" — седмичен режим, свързан с **разписанието на паралелката**.
 *
 * Всеки ред е един час от `db.schedule`, а не ученик: „6. 📖 АЕ - Борисова".
 * В полето вдясно се въвеждат номерата на отсъстващите, разделени със запетая
 * („6, 15,"). Под часовете за деня има ред „Цял ден" — числата там маркират
 * отсъствие за целия ден, а не за конкретен час.
 *
 * Числата в кръгчетата до всеки ред са „отсъстващи / присъстващи" за часа —
 * точно както в образеца. Празно поле значи, че за този час още нищо не е
 * въведено.
 *
 * Ако горе е избрана „Причина за уважаване", новите отсъствия се записват
 * направо уважени, а вече въведените неуважени отсъствия за същите часове се
 * уважават със същата причина.
 */
function WeekAdminPage({
  klass, students, absences, onDone, onBack,
}: {
  klass: Klass
  students: Student[]
  absences: Absence[]
  onDone: (message: string) => void
  onBack: () => void
}) {
  const { db, user, addAbsences, excuseAbsences, subjectShort, userName } = useApp()
  const [monday, setMonday] = useState(() => mondayOf(new Date()))
  const [reason, setReason] = useState<string | null>(null)
  const [typed, setTyped] = useState<Record<string, string>>({})

  const byNumber = useMemo(() => new Map(students.map((s) => [s.number, s])), [students])

  /**
   * Редовете идват от разписанието, а не от списък с ученици. Ден без часове
   * пак получава 7 реда „Свободен час", за да може да се въведе отсъствие и в
   * ден, в който разписанието още не е попълнено.
   */
  const groups = useMemo(
    () =>
      [1, 2, 3, 4, 5].map((wd) => {
        const date = addDays(monday, wd - 1)
        const iso = isoOf(date)
        const lessons = db.schedule.filter((s) => s.classId === klass.id && s.day === wd)
        const maxPeriod = Math.max(7, ...lessons.map((l) => l.period))
        const rows = Array.from({ length: maxPeriod }, (_, k) => k + 1).map((period) => ({
          period,
          key: `${iso}|${period}`,
          entries: lessons.filter((l) => l.period === period).sort((a, b) => a.id.localeCompare(b.id)),
        }))
        return { wd, date, iso, rows, dayKey: `${iso}|day` }
      }),
    [db.schedule, klass.id, monday],
  )

  /** „6, 15," → [6, 15] — само номера, които съществуват в паралелката. */
  const numbersOf = (key: string) => {
    const out: number[] = []
    for (const token of (typed[key] ?? '').split(/[^0-9]+/)) {
      if (!token) continue
      const n = parseInt(token, 10)
      if (byNumber.has(n) && !out.includes(n)) out.push(n)
    }
    return out
  }

  /** Кои ученици вече са маркирани за дадения час (или за целия ден). */
  const markedIn = (iso: string, slot: number | 'day') => {
    const set = new Set<string>()
    for (const a of absences) {
      if (a.date !== iso) continue
      if (slot === 'day' ? a.wholeDay : a.wholeDay || a.period === slot) set.add(a.studentId)
    }
    return set
  }

  /** Колко отсъстващи има в реда — от базата плюс написаното, без повторение. */
  const absentCount = (iso: string, slot: number | 'day', key: string) => {
    const set = markedIn(iso, slot)
    let extra = 0
    for (const n of numbersOf(key)) {
      const st = byNumber.get(n)
      if (st && !set.has(st.id)) extra++
    }
    return set.size + extra
  }

  const totalTyped = groups.reduce(
    (sum, g) => sum + g.rows.reduce((s, r) => s + numbersOf(r.key).length, 0) + numbersOf(g.dayKey).length,
    0,
  )

  const save = () => {
    const chosen = REASONS.find((r) => r.code === reason) ?? null
    const rows: Omit<Absence, 'id' | 'createdAt'>[] = []
    const toExcuse = new Set<string>()
    let already = 0

    const add = (iso: string, wholeDay: boolean, period: number, entry: ScheduleEntry | undefined, key: string) => {
      const nums = numbersOf(key)
      if (!nums.length) return
      const existing = new Map<string, Absence>()
      for (const a of absences) {
        if (a.date !== iso) continue
        if (wholeDay || a.wholeDay || a.period === period) existing.set(a.studentId, a)
      }
      for (const n of nums) {
        const st = byNumber.get(n)
        if (!st) continue
        const found = existing.get(st.id)
        if (found) {
          // вече е маркиран — при избрана причина го уважаваме, иначе нищо
          if (chosen && !found.excused && found.reason !== chosen.reason) toExcuse.add(found.id)
          else already++
          continue
        }
        rows.push({
          studentId: st.id,
          classId: klass.id,
          date: iso,
          period: wholeDay ? 1 : period,
          subjectId: entry?.subjectId ?? klass.subjectIds[0] ?? '',
          reason: chosen?.reason ?? 'неизвинено',
          excused: chosen?.excused ?? false,
          wholeDay: wholeDay || undefined,
          teacherId: user!.id,
          excuseReason: chosen?.excused ? chosen.label : undefined,
        })
      }
    }

    for (const g of groups) {
      for (const r of g.rows) {
        const entry = r.entries[0]
        add(g.iso, false, r.period, entry, r.key)
      }
      add(g.iso, true, 1, undefined, g.dayKey)
    }

    if (toExcuse.size && chosen) excuseAbsences([...toExcuse], chosen.reason)
    if (rows.length) addAbsences(rows)

    const parts: string[] = []
    if (rows.length) parts.push(`Успешно добавихте ${rows.length} ${rows.length === 1 ? 'отсъствие' : 'отсъствия'}.`)
    if (toExcuse.size) parts.push(`Уважени ${toExcuse.size} ${toExcuse.size === 1 ? 'отсъствие' : 'отсъствия'}.`)
    if (!parts.length) parts.push(already ? 'Тези отсъствия вече са въведени.' : 'Няма промени за запазване.')
    onDone(parts.join(' '))
  }

  const currentWeek = isoOf(mondayOf(new Date())) === isoOf(monday)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#eef1f2]">
      {/* горна лента */}
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-200 bg-white px-4 py-2.5 shadow-sm">
        <h2 className="flex min-w-0 items-center gap-2 truncate text-[14.5px] font-bold text-ink-800">
          <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-[#337ab7] text-[11px] font-bold leading-none text-[#337ab7]">i</span>
          Администриране на отсъствия в {klass.name}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onBack} className="db border border-ink-200 bg-ink-50 !text-ink-600 hover:bg-ink-100">
            <Icon name="chevronLeft" size={14} strokeWidth={2.2} /> Назад
          </button>
          <button type="button" onClick={save} className="db db-green">
            <Icon name="check" size={14} strokeWidth={2.4} /> Запази
          </button>
        </div>
      </div>

      {/* причина за уважаване + навигатор на седмицата */}
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-200 bg-white px-4 py-2">
        <span className="text-[12.5px] font-bold text-ink-800">Причина за уважаване:</span>
        <div className="flex items-center gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r.code}
              type="button"
              title={r.label}
              onClick={() => setReason(reason === r.code ? null : r.code)}
              className={`grid h-[23px] w-[23px] place-items-center rounded-full border text-[11.5px] font-bold transition ${
                reason === r.code
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-[#c9d4de] bg-white text-[#7d8c98] hover:border-[#9fb3c4] hover:text-ink-700'
              }`}
              style={reason === r.code ? { background: r.tone } : undefined}
            >
              {r.code}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-ink-500">
          {REASONS.find((r) => r.code === reason)?.label ?? 'без уважение — записва се като неуважително'}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {totalTyped > 0 && (
            <button
              type="button"
              onClick={() => setTyped({})}
              className="mr-1 text-[12px] font-semibold text-[#b42318] hover:underline"
            >
              Изчисти ({totalTyped})
            </button>
          )}
          <button
            type="button"
            onClick={() => setMonday(addDays(monday, -7))}
            title="Предишна седмица"
            className="grid h-[23px] w-[23px] place-items-center rounded-[2px] border border-[#c9d4de] bg-white text-[13px] font-bold leading-none text-[#337ab7] hover:bg-[#f2f7fb]"
          >
            ‹
          </button>
          <span className="min-w-[128px] text-center text-[12.5px] font-semibold text-ink-800">
            {ddmm(monday)} – {ddmm(addDays(monday, 4))}.{addDays(monday, 4).getFullYear()}
          </span>
          <button
            type="button"
            onClick={() => setMonday(addDays(monday, 7))}
            title="Следваща седмица"
            className="grid h-[23px] w-[23px] place-items-center rounded-[2px] border border-[#c9d4de] bg-white text-[13px] font-bold leading-none text-[#337ab7] hover:bg-[#f2f7fb]"
          >
            ›
          </button>
          {!currentWeek && (
            <button
              type="button"
              onClick={() => setMonday(mondayOf(new Date()))}
              className="ml-1 text-[12px] font-semibold text-[#337ab7] hover:underline"
            >
              тази седмица
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <table className="w-full border-collapse bg-white" style={{ minWidth: 780 }}>
          <colgroup>
            <col style={{ width: 34 }} />
            <col style={{ width: 400 }} />
            <col style={{ width: 86 }} />
            <col />
          </colgroup>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.iso}>
                {g.rows.map((r, i) => {
                  const absent = absentCount(g.iso, r.period, r.key)
                  return (
                    <tr key={r.key} className="border-b border-[#e7ecf1]">
                      {i === 0 && (
                        <td
                          rowSpan={g.rows.length + 1}
                          className="border-r border-[#cdd9e5] bg-[#dbe5ef] p-0 align-middle"
                        >
                          <span
                            className="block whitespace-nowrap py-2 text-center text-[11.5px] font-bold text-[#3d5a75]"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                          >
                            {DAY_NAMES[g.wd - 1]} {ddmm(g.date)}.{g.date.getFullYear()}
                          </span>
                        </td>
                      )}
                      <td className="px-2 py-[5px] text-[12.5px] text-ink-800">
                        <span className="font-bold text-ink-400">{r.period}.</span>{' '}
                        <Icon name="book" size={12} className="inline align-[-1px] text-[#8a99a6]" strokeWidth={2} />{' '}
                        {r.entries.length === 0 ? (
                          <span className="text-ink-400">Свободен час</span>
                        ) : (
                          r.entries.map((e, k) => (
                            <span key={e.id}>
                              {k > 0 && <span className="text-ink-300"> / </span>}
                              {subjectShort(e.subjectId)}
                              <span className="text-ink-400"> - </span>
                              {userName(e.teacherId).split(' ').slice(-1)[0]}
                            </span>
                          ))
                        )}
                      </td>
                      <td className="border-l border-[#eef2f6] px-1 py-[3px]">
                        <div className="flex items-center justify-center gap-1">
                          {absent > 0 && (
                            <>
                              <span
                                title="Отсъстващи в часа"
                                className="grid h-[19px] min-w-[19px] place-items-center rounded-full bg-[#3598dc] px-1 text-[11px] font-bold text-white"
                              >
                                {absent}
                              </span>
                              <span
                                title="Присъстващи в часа"
                                className="grid h-[19px] min-w-[19px] place-items-center rounded-full bg-[#b6c2cc] px-1 text-[11px] font-bold text-white"
                              >
                                {Math.max(students.length - absent, 0)}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-1 py-[3px]">
                        <input
                          value={typed[r.key] ?? ''}
                          onChange={(e) => setTyped((p) => ({ ...p, [r.key]: e.target.value }))}
                          placeholder="номера, напр. 6, 15"
                          className="h-[26px] w-full rounded-[2px] border border-[#cfd8e0] bg-white px-2 text-[12.5px] text-ink-800 outline-none transition placeholder:text-[11.5px] placeholder:text-ink-300 focus:border-[#3598dc] focus:ring-1 focus:ring-[#3598dc]/25"
                        />
                      </td>
                    </tr>
                  )
                })}

                {/* ред „Цял ден" — отсъствие за всички часове на деня */}
                {(() => {
                  const absent = absentCount(g.iso, 'day', g.dayKey)
                  return (
                    <tr className="border-b-2 border-[#c9d4e0]">
                      <td className="bg-[#dfe3fa] px-2 py-[5px] text-center text-[12px] font-bold text-[#4a5a9c]">
                        Цял ден
                      </td>
                      <td className="bg-[#dfe3fa] px-1 py-[3px]">
                        <div className="flex items-center justify-center gap-1">
                          {absent > 0 && (
                            <>
                              <span
                                title="Отсъстващи за целия ден"
                                className="grid h-[19px] min-w-[19px] place-items-center rounded-full bg-[#3598dc] px-1 text-[11px] font-bold text-white"
                              >
                                {absent}
                              </span>
                              <span
                                title="Присъстващи"
                                className="grid h-[19px] min-w-[19px] place-items-center rounded-full bg-[#b6c2cc] px-1 text-[11px] font-bold text-white"
                              >
                                {Math.max(students.length - absent, 0)}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-1 py-[3px]">
                        <input
                          value={typed[g.dayKey] ?? ''}
                          onChange={(e) => setTyped((p) => ({ ...p, [g.dayKey]: e.target.value }))}
                          placeholder="номера за целия ден"
                          className="h-[26px] w-full rounded-[2px] border border-[#cfd8e0] bg-white px-2 text-[12.5px] text-ink-800 outline-none transition placeholder:text-[11.5px] placeholder:text-ink-300 focus:border-[#3598dc] focus:ring-1 focus:ring-[#3598dc]/25"
                        />
                      </td>
                    </tr>
                  )
                })()}
              </Fragment>
            ))}
          </tbody>
        </table>

        <p className="mt-3 max-w-[900px] text-[11.5px] leading-relaxed text-ink-500">
          Въведете номерата на отсъстващите ученици, разделени със запетая. Редовете са часовете
          от разписанието на паралелката, така че отсъствието се записва за точния предмет и
          учител. За отсъствие през целия ден използвайте реда <b>„Цял ден"</b> под часовете.
          Номерата в кръгчетата показват колко ученика отсъстват и колко присъстват в часа.
        </p>
      </div>
    </div>
  )
}

// ── Панел с подробности за отсъствията на един ученик ───────────────────────
function AbsenceDetail({
  list, mode, canExcuse, canEdit, onExcuse, onEdit, onDelete, onClose,
}: {
  list: Absence[]
  mode: DetailMode
  canExcuse: boolean
  canEdit: (a: Absence) => boolean
  onExcuse: (a: Absence) => void
  onEdit: (a: Absence) => void
  onDelete: (a: Absence) => void
  onClose: () => void
}) {
  const { subjectName, userName } = useApp()
  const p = PANEL[mode]

  if (!list.length) {
    return (
      <div
        className="relative border-y px-4 py-3 text-[12.5px] text-ink-800"
        style={{ background: p.bg, borderColor: p.border }}
      >
        {p.empty}
        <button onClick={onClose} className="absolute right-2 top-2 text-ink-600 hover:opacity-70">
          <Icon name="close" size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="border-y" style={{ background: p.bg, borderColor: p.border }}>
      <div className="flex items-center justify-end px-3 pt-1.5">
        <button onClick={onClose} title="Затвори" className="text-ink-600 hover:opacity-70">
          <Icon name="close" size={13} />
        </button>
      </div>
      <div className="divide-y pb-1" style={{ borderColor: p.border }}>
        {list.map((a) => {
          const kind = a.reason === 'закъснение'
            ? 'ЗАКЪСНЕНИЕ'
            : a.excused ? 'УВАЖЕНО ОТСЪСТВИЕ' : 'ОТСЪСТВИЕ'
          const created = (a.createdAt ?? '').replace('T', ' ').slice(0, 19)
          return (
            <div key={a.id} className="flex flex-wrap items-start gap-2 px-3 py-2">
              <span
                className="mt-[2px] grid h-[14px] w-[14px] shrink-0 place-items-center rounded-full border text-[9px] font-bold leading-none"
                style={{ borderColor: p.icon, color: p.icon }}
              >
                i
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] text-ink-800">
                  <b>({kind})</b>{' '}
                  <span>{subjectName(a.subjectId)} - Час {a.period}</span>
                  <span className="mx-1.5 text-ink-400">|</span>
                  <Icon name="calendar" size={12} className="mr-1 inline align-[-1px] text-ink-500" />
                  {dateOnly(a.date)}
                </p>
                {a.excused && (a.excuseReason || a.note) && (
                  <p className="mt-0.5 text-[11.5px] italic text-ink-700">
                    Уважено поради:{' '}
                    {a.excuseReason
                      ?? (a.reason === 'семейни причини' ? 'Семейни причини' : a.reason === 'извинено' ? 'Извинено' : 'уважителна причина')}
                    {a.note ? ` (${a.note})` : ''}
                  </p>
                )}
                <p className="mt-0.5 text-[11.5px] text-ink-600">
                  <span className="italic">Въведено от:</span>{' '}
                  <Icon name="user" size={11} className="mr-1 inline align-[-1px] text-[#2b6ca3]" />
                  <span className="text-[#2b6ca3]">{userName(a.teacherId)}</span>
                  <span className="mx-1 text-ink-300">/</span>
                  <Icon name="clock" size={11} className="mr-1 inline align-[-1px] text-ink-400" />
                  {created || '—'}
                  {!a.excused && a.excuseReason && <span className="ml-2">· Мотив: {a.excuseReason}</span>}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {canExcuse && a.excused && (
                  <button
                    onClick={() => onEdit(a)}
                    className="inline-flex items-center gap-1 rounded-[2px] bg-[#3598dc] px-2 py-1 text-[11.5px] font-semibold text-white hover:brightness-95"
                  >
                    <Icon name="edit" size={11} strokeWidth={2.4} /> Редактирай
                  </button>
                )}
                {canExcuse && !a.excused && a.reason !== 'закъснение' && (
                  <button
                    onClick={() => onExcuse(a)}
                    className="inline-flex items-center gap-1 rounded-[2px] bg-[#26c281] px-2 py-1 text-[11.5px] font-semibold text-white hover:brightness-95"
                  >
                    <Icon name="check" size={11} strokeWidth={2.6} /> Уважи
                  </button>
                )}
                {canEdit(a) && (
                  <button
                    onClick={() => onDelete(a)}
                    className="inline-flex items-center gap-1 rounded-[2px] bg-[#e7505a] px-2 py-1 text-[11.5px] font-semibold text-white hover:brightness-95"
                  >
                    <Icon name="close" size={11} strokeWidth={2.6} /> Изтрий
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Таб „Отсъствия" ─────────────────────────────────────────────────────────
export function AbsencesTab({ classId }: { classId: string }) {
  const { db, user, isStaff, isAdmin, studentsOf, addAbsences, deleteAbsence, excuseAbsences, subjectName } = useApp()

  const [adding, setAdding] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [excuseOpen, setExcuseOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [filter, setFilter] = useState<'всички' | 'неуважителни' | 'закъснения' | 'уважени'>('всички')
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [date, setDate] = useState(todayISO())
  const [detailFor, setDetailFor] = useState<{ sid: string; mode: DetailMode } | null>(null)
  const [excuseFor, setExcuseFor] = useState<Absence | null>(null)
  const [excuse, setExcuse] = useState({ reason: 'извинено' as Absence['reason'], note: '' })
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const klass = db.classes.find((c) => c.id === classId)
  const students = studentsOf(classId)
  const all = useMemo(
    () => db.absences.filter((a) => a.classId === classId && !a.deletedAt),
    [db.absences, classId],
  )

  // ── права по образеца ──
  const isClassTeacher = !!klass && klass.homeroomTeacherId === user?.id
  const canAdmin = isAdmin || isClassTeacher
  const canEditAbsence = (a: Absence) => isAdmin || isClassTeacher || a.teacherId === user?.id
  const canEditColumn = (s: ScheduleEntry) => canAdmin || s.teacherId === user?.id

  const hours = (a: Absence) => (a.wholeDay ? HOURS_PER_DAY : 1)
  /** Закъснението е отделна категория — не се брои нито към уважените, нито към неуважените. */
  const isLate = (a: Absence) => a.reason === 'закъснение'
  const isUnexcused = (a: Absence) => !a.excused && !isLate(a)

  const stats = (sid: string) => {
    const list = all.filter((a) => a.studentId === sid)
    const late = list.filter(isLate)
    const unexcused = list.filter(isUnexcused)
    const excused = list.filter((a) => a.excused)
    return {
      late: late.length,
      unexcused: unexcused.length,
      unexcusedHours: unexcused.reduce((s, a) => s + hours(a), 0),
      excusedHours: excused.reduce((s, a) => s + hours(a), 0),
    }
  }

  /** Кликът върху колона отваря панела само с нейните отсъствия. */
  const openDetail = (sid: string, mode: DetailMode) =>
    setDetailFor((p) => (p && p.sid === sid && p.mode === mode ? null : { sid, mode }))

  const rowsForFilter = (sid: string) => {
    const list = all.filter((a) => a.studentId === sid)
    if (filter === 'неуважителни') return list.filter(isUnexcused)
    if (filter === 'закъснения') return list.filter(isLate)
    if (filter === 'уважени') return list.filter((a) => a.excused)
    return list
  }

  const pickedIds = Object.entries(picked).filter(([, v]) => v).map(([k]) => k)

  /** Записва клетките от екрана: добавя новите и маха само изрично изчистените. */
  const saveDay = (cells: Record<string, Status>, cleared: string[]) => {
    const existing = all.filter((a) => a.date === date)
    const key = (a: Absence) => `${a.studentId}|${a.wholeDay ? 'day' : a.period}`
    const wanted = new Map<string, Status>(Object.entries(cells).filter(([, v]) => v !== 'присъства'))
    const clearSet = new Set(cleared)

    let removed = 0
    for (const a of existing) {
      if (!clearSet.has(key(a))) continue
      if (!canEditAbsence(a)) continue
      deleteAbsence(a.id)
      removed++
    }

    const have = new Set(existing.map(key))
    const wd = weekdayOf(date)
    const periods = db.schedule
      .filter((s) => s.classId === classId && s.day === wd)
      .sort((a, b) => a.period - b.period)

    const rows: Omit<Absence, 'id' | 'createdAt'>[] = []
    for (const [k, st] of wanted) {
      if (have.has(k)) continue
      const [sid, slot] = k.split('|')
      const wholeDay = slot === 'day'
      const period = wholeDay ? 1 : Number(slot)
      const entry = periods.find((p) => p.period === period)
      if (!canEditColumn(entry ?? ({} as ScheduleEntry))) continue
      rows.push({
        studentId: sid, classId, date, period,
        subjectId: entry?.subjectId ?? klass?.subjectIds[0] ?? '',
        reason: st === 'закъснение' ? 'закъснение' : 'неизвинено',
        excused: false, wholeDay, teacherId: user!.id,
      })
    }
    if (rows.length) addAbsences(rows)

    setAdding(false)
    const added = rows.length
    setToast(
      added
        ? `Успешно добавихте ${added} ${added === 1 ? 'отсъствие' : 'отсъствия'}.`
        : removed
          ? `Премахнахте ${removed} ${removed === 1 ? 'отсъствие' : 'отсъствия'}.`
          : 'Няма промени за запазване.',
    )
  }

  const doExcuse = () => {
    if (!excuseFor) return
    const editing = !!excuseFor.excused
    excuseAbsences([excuseFor.id], excuse.reason, excuse.note || undefined)
    setExcuseFor(null)
    setExcuse({ reason: 'извинено', note: '' })
    setToast(editing ? 'Промените по уважаването са запазени.' : 'Отсъствието е уважено.')
  }

  const notedAbsences = all
    .filter((a) => a.note || a.excuseReason)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 200)

  const detailList = detailFor
    ? all
      .filter((a) => a.studentId === detailFor.sid)
      .filter((a) =>
        detailFor.mode === 'закъснения' ? isLate(a)
          : detailFor.mode === 'уважени' ? a.excused
            : detailFor.mode === 'неуважени' ? isUnexcused(a)
              : true,
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.period - a.period)
    : []

  return (
    <>
      <Toolbar>
        {isStaff && (
          <>
            <TB icon="plus" tone="blue" onClick={() => setAdding(true)}>Добави</TB>
            {canAdmin && (
              <>
                <TB
                  icon="check" tone="green"
                  title="Уважаване по разписанието на класа за избрана дата"
                  onClick={() => setExcuseOpen(true)}
                >
                  Уважи
                </TB>
                <TB
                  icon="calendar" tone="teal"
                  title="Администриране по разписанието на класа — редове по часове, номера на ученици"
                  onClick={() => setAdminOpen(true)}
                >
                  Администрирай
                </TB>
              </>
            )}
          </>
        )}
        <TB icon="report" tone="purple" onClick={() => setNotesOpen(true)}>Бележки</TB>
        {isStaff && (
          <TB
            icon="close" tone="red" disabled={!pickedIds.length}
            onClick={() => {
              const doomed = all.filter((a) => pickedIds.includes(a.studentId) && canEditAbsence(a))
              if (!doomed.length) { setToast('Няма ваши отсъствия за изтриване при избраните ученици.'); return }
              if (!window.confirm(`Да се изтрият ли ${doomed.length} отсъствия за избраните ученици?`)) return
              doomed.forEach((a) => deleteAbsence(a.id))
              setPicked({})
              setToast(`Изтрити ${doomed.length} отсъствия.`)
            }}
          >
            Изтрий{pickedIds.length ? ` (${pickedIds.length})` : ''}
          </TB>
        )}
        <TB icon="print" tone="gold" onClick={() => window.print()}>Принтирай</TB>
        <FilterButton />
      </Toolbar>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-600">
        <span className="font-semibold">Покажи:</span>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="!w-auto !py-1 !text-[12.5px]">
          <option value="всички">Всички отсъствия</option>
          <option value="неуважителни">Само неуважителни</option>
          <option value="закъснения">Само закъснения</option>
          <option value="уважени">Само уважени</option>
        </Select>
        {isStaff && pickedIds.length > 0 && (
          <button onClick={() => setPicked({})} className="text-[12px] font-semibold text-brand-700 hover:underline">
            Изчисти избора
          </button>
        )}
        <span className="ml-auto text-[11.5px] text-ink-400">
          Клик върху число показва само тази колона — закъснения, неуважени или уважени.
        </span>
      </div>

      <DnTable
        minWidth={860}
        head={
          <>
            {isStaff && <Th className="w-[36px]" />}
            <Th className="w-[54px]">№</Th>
            <Th>Ученик</Th>
            <Th className="w-[110px] text-center">Закъснения</Th>
            <Th className="w-[100px] text-center">Неуважит.</Th>
            <Th className="w-[100px] text-center">Общо неув.</Th>
            <Th className="w-[100px] text-center">Общо уваж.</Th>
          </>
        }
      >
        {students.map((s) => {
          const st = stats(s.id)
          const shown = rowsForFilter(s.id).length
          const on = !!picked[s.id]
          const open = detailFor?.sid === s.id
          return (
            <Fragment key={s.id}>
              <tr className={`${on ? 'bg-[#eef7fb]' : open ? 'bg-[#f2f8fc]' : ''} hover:bg-[#f7fbfd]`}>
                {isStaff && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox" className="h-3.5 w-3.5"
                      checked={on}
                      onChange={(e) => setPicked((p) => ({ ...p, [s.id]: e.target.checked }))}
                    />
                  </td>
                )}
                <td className="px-3 py-2 text-[12.5px] font-bold text-ink-400">{s.number}</td>
                <td className="px-3 py-2">
                  <button onClick={() => openDetail(s.id, 'всички')} className="text-left">
                    <StudentCell student={s} showNumber={false} />
                  </button>
                  {filter !== 'всички' && (
                    <span className="ml-1.5 text-[11px] text-ink-400">({shown} по филтъра)</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => openDetail(s.id, 'закъснения')}
                    title="Покажи само закъсненията"
                    className={on ? 'opacity-40 transition-opacity' : 'transition-opacity'}
                  >
                    <Num value={st.late} tone={st.late ? 'olive' : 'zero'} />
                  </button>
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => openDetail(s.id, 'неуважени')}
                    title="Покажи само неуважените отсъствия"
                    className={on ? 'opacity-40 transition-opacity' : 'transition-opacity'}
                  >
                    <Num value={st.unexcused} tone={st.unexcused ? 'salmon' : 'zero'} />
                  </button>
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => openDetail(s.id, 'неуважени')}
                    title="Покажи само неуважените отсъствия"
                    className={on ? 'opacity-40 transition-opacity' : 'transition-opacity'}
                  >
                    <Num value={st.unexcusedHours} tone={st.unexcusedHours ? 'salmon' : 'zero'} />
                  </button>
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => openDetail(s.id, 'уважени')}
                    title="Покажи само уважените отсъствия"
                    className={on ? 'opacity-40 transition-opacity' : 'transition-opacity'}
                  >
                    <Num value={st.excusedHours} tone={st.excusedHours ? 'green' : 'zero'} />
                  </button>
                </td>
              </tr>
              {open && (
                <tr>
                  <td colSpan={isStaff ? 7 : 6} className="p-0">
                    <AbsenceDetail
                      list={detailList}
                      mode={detailFor.mode}
                      canExcuse={canAdmin}
                      canEdit={canEditAbsence}
                      onExcuse={(a) => { setExcuseFor(a); setExcuse({ reason: 'извинено', note: '' }) }}
                      onEdit={(a) => { setExcuseFor(a); setExcuse({ reason: a.reason, note: a.note ?? '' }) }}
                      onDelete={(a) => {
                        if (!window.confirm(`Да се изтрие ли отсъствието от ${dateOnly(a.date)}?`)) return
                        deleteAbsence(a.id)
                        setToast('Отсъствието е изтрито.')
                      }}
                      onClose={() => setDetailFor(null)}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
        {students.length === 0 && <EmptyRow colSpan={isStaff ? 7 : 6} text="В паралелката няма активни ученици." />}
      </DnTable>

      {/* ── цял екран: въвеждане за дата ── */}
      {adding && klass && (
        <AbsencesAddPage
          klass={klass}
          students={students}
          absences={all}
          date={date}
          setDate={setDate}
          canEditColumn={canEditColumn}
          onSave={saveDay}
          onBack={() => setAdding(false)}
          onAdmin={() => { setAdding(false); setAdminOpen(true) }}
        />
      )}

      {/* ── цял екран: уважаване за дата ── */}
      {excuseOpen && klass && (
        <ExcusePage
          klass={klass}
          students={students}
          absences={all}
          onDone={(message) => {
            setExcuseOpen(false)
            setPicked({})
            setToast(message)
          }}
          onBack={() => setExcuseOpen(false)}
        />
      )}

      {/* ── цял екран: седмичен режим ── */}
      {adminOpen && klass && (
        <WeekAdminPage
          klass={klass}
          students={students}
          absences={all}
          onDone={(message) => {
            setAdminOpen(false)
            setToast(message)
          }}
          onBack={() => setAdminOpen(false)}
        />
      )}

      {/* ── Уважи / редактирай уважаване ── */}
      <Modal
        open={!!excuseFor} onClose={() => setExcuseFor(null)}
        title={excuseFor?.excused ? 'Редактиране на уважаване' : 'Уважаване на отсъствие'}
        footer={
          <>
            <button onClick={() => setExcuseFor(null)} className="btn-ghost">Отказ</button>
            <button className="btn-primary" onClick={doExcuse}>Запази</button>
          </>
        }
      >
        {excuseFor && (
          <p
            className="mb-3 rounded-[3px] px-3 py-2 text-[12.5px] text-ink-800"
            style={{ background: excuseFor.excused ? PANEL['уважени'].bg : PANEL['неуважени'].bg }}
          >
            {subjectName(excuseFor.subjectId)} · {dateOnly(excuseFor.date)} · {excuseFor.period} час
          </p>
        )}
        <div className="grid gap-3">
          <Field label="Мотив">
            <Select value={excuse.reason} onChange={(e) => setExcuse({ ...excuse, reason: e.target.value as Absence['reason'] })}>
              <option value="извинено">Извинено (медицинска бележка)</option>
              <option value="семейни причини">Семейни причини</option>
            </Select>
          </Field>
          <Field label="Описание" hint="напр. № 1042 / 12.10.2026, медицинска бележка">
            <Textarea value={excuse.note} onChange={(e) => setExcuse({ ...excuse, note: e.target.value })} />
          </Field>
        </div>
      </Modal>

      {/* ── Бележки към отсъствия ── */}
      <Modal
        open={notesOpen} onClose={() => setNotesOpen(false)} wide title="Бележки към отсъствията"
        footer={<button onClick={() => setNotesOpen(false)} className="btn-primary">Затвори</button>}
      >
        <div className="space-y-2">
          {notedAbsences.map((a) => {
            const s = db.students.find((x) => x.id === a.studentId)
            return (
              <div key={a.id} className="flex items-start gap-2.5 rounded-lg border border-ink-200 px-3 py-2.5">
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${
                  a.excused ? 'bg-[#26c281]' : 'bg-[#e7505a]'
                }`}>
                  <Icon name={a.excused ? 'check' : 'close'} size={12} strokeWidth={2.6} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink-800">
                    {s?.firstName} {s?.lastName}
                    <span className="ml-2 font-normal text-ink-500">
                      {dateOnly(a.date)} · {a.period} ч. · {subjectName(a.subjectId)}
                    </span>
                  </p>
                  <p className="text-[12px] text-ink-600">
                    {a.excuseReason ? `Мотив: ${a.excuseReason}. ` : ''}{a.note}
                  </p>
                </div>
              </div>
            )
          })}
          {notedAbsences.length === 0 && (
            <p className="py-6 text-center text-[13px] text-ink-500">Все още няма уважени отсъствия с бележка.</p>
          )}
        </div>
      </Modal>

      {/* ── зелено съобщение след запис ── */}
      {toast && (
        <div className="fixed right-4 top-4 z-[60] flex items-start gap-2.5 rounded-[3px] bg-[#26c281] px-4 py-3 text-[13px] font-semibold text-white shadow-lg">
          <Icon name="check" size={16} strokeWidth={2.8} className="mt-0.5 shrink-0" />
          <span className="max-w-[320px]">{toast}</span>
          <button onClick={() => setToast(null)} className="ml-1 shrink-0 opacity-80 hover:opacity-100">
            <Icon name="close" size={13} />
          </button>
        </div>
      )}
    </>
  )
}
