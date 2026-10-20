import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Field, Icon, Input, Modal, Select, Textarea } from '../../components/ui'
import type { Absence, Klass, ScheduleEntry, Student } from '../../lib/types'
import { DnTable, EmptyRow, FilterButton, Num, StudentCell, TB, Th, Toolbar, dateOnly } from './shared'
import { addDays, ddmm, mondayOf } from '../../lib/week'

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

// ── Цял екран: седмичен режим (само класен ръководител / администратор) ─────
function WeekAdminPage({
  klass, students, absences, onDone, onBack,
}: {
  klass: Klass
  students: Student[]
  absences: Absence[]
  onDone: (added: number, removed: number) => void
  onBack: () => void
}) {
  const { db, user, isAdmin, addAbsences, deleteAbsence } = useApp()
  const isClassTeacher = klass.homeroomTeacherId === user?.id
  const canEditAbsence = (a: Absence) => isAdmin || isClassTeacher || a.teacherId === user?.id
  const [monday, setMonday] = useState(() => mondayOf(new Date()))
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(monday, i)), [monday])
  const [cells, setCells] = useState<Record<string, number>>({})

  /** Колко часа е отсъствал ученикът за всеки ден от тази седмица. */
  useEffect(() => {
    const next: Record<string, number> = {}
    for (const a of absences) {
      const idx = days.findIndex((d) => isoOf(d) === a.date)
      if (idx < 0) continue
      const key = `${a.studentId}|${idx}`
      next[key] = (next[key] ?? 0) + (a.wholeDay ? HOURS_PER_DAY : 1)
    }
    setCells(next)
  }, [days, absences])

  const cycleCount = (key: string) => setCells((p) => {
    const n = ((p[key] ?? 0) + 1) % 4
    const copy = { ...p }
    if (n === 0) delete copy[key]
    else copy[key] = n
    return copy
  })

  const [wholeDayNumbers, setWholeDayNumbers] = useState('')

  /**
   * Записва разликата, а не нова порция: ако в деня вече има 2 часа
   * отсъствие, а на екрана пише 3 — добавя се само един. Така отваряне и
   * „Запази" без промяна не удвоява отсъствията.
   */
  const save = () => {
    const rows: Omit<Absence, 'id' | 'createdAt'>[] = []
    let removed = 0

    days.forEach((d, idx) => {
      const iso = isoOf(d)
      const wd = weekdayOf(iso)
      const periods = db.schedule
        .filter((s) => s.classId === klass.id && s.day === wd)
        .sort((a, b) => a.period - b.period)

      students.forEach((s) => {
        const target = cells[`${s.id}|${idx}`] ?? 0
        const existing = absences.filter((a) => a.date === iso && a.studentId === s.id)
        const have = existing.reduce((sum, a) => sum + (a.wholeDay ? HOURS_PER_DAY : 1), 0)

        if (target > have) {
          for (let i = have; i < target; i++) {
            const entry = periods[i]
            rows.push({
              studentId: s.id, classId: klass.id, date: iso,
              period: entry?.period ?? i + 1,
              subjectId: entry?.subjectId ?? klass.subjectIds[0] ?? '',
              reason: 'неизвинено', excused: false, wholeDay: false,
              teacherId: user!.id,
            })
          }
        } else if (target < have) {
          // махаме първо неуважените и то поотделно, а не „целия ден"
          const removable = existing
            .filter((a) => canEditAbsence(a))
            .sort((a, b) => Number(a.excused) - Number(b.excused) || Number(!!a.wholeDay) - Number(!!b.wholeDay))
          let left = have
          for (const a of removable) {
            if (left <= target) break
            deleteAbsence(a.id)
            left -= a.wholeDay ? HOURS_PER_DAY : 1
            removed++
          }
        }
      })
    })

    if (rows.length) addAbsences(rows)
    onDone(rows.length, removed)
  }

  const applyWholeDay = () => {
    const nums = wholeDayNumbers.split(/[,\s;]+/).map((x) => parseInt(x, 10)).filter((n) => !Number.isNaN(n))
    if (!nums.length) return
    setCells((p) => {
      const copy = { ...p }
      students.forEach((s) => {
        if (!nums.includes(s.number)) return
        days.forEach((_, idx) => { copy[`${s.id}|${idx}`] = HOURS_PER_DAY })
      })
      return copy
    })
    setWholeDayNumbers('')
  }

  const total = Object.values(cells).reduce((a, b) => a + b, 0)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#eef1f2]">
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-200 bg-white px-4 py-2.5 shadow-sm">
        <h2 className="flex min-w-0 items-center gap-2 truncate text-[14.5px] font-bold text-ink-800">
          <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-[#337ab7] text-[11px] font-bold leading-none text-[#337ab7]">i</span>
          Администриране на отсъствия за {klass.name}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-[2px] bg-[#e6f4ea] px-2 py-1 text-[11.5px] font-bold text-[#1f7a45]">Общо {total}</span>
          <button type="button" onClick={onBack} className="db border border-ink-200 bg-ink-50 !text-ink-600 hover:bg-ink-100">
            <Icon name="chevronLeft" size={14} strokeWidth={2.2} /> Назад
          </button>
          <button type="button" onClick={save} className="db db-green">
            <Icon name="check" size={14} strokeWidth={2.4} /> Запази
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-ink-200 bg-white px-4 py-2.5">
        <button type="button" onClick={() => setMonday(addDays(monday, -7))} className="db db-blue" title="Предишна седмица">
          <span className="text-[15px] leading-none">‹</span>
        </button>
        <span className="text-[13px] font-semibold text-ink-800">
          {ddmm(days[0])} – {ddmm(days[4])}.{days[4].getFullYear()}
        </span>
        <button type="button" onClick={() => setMonday(addDays(monday, 7))} className="db db-blue" title="Следваща седмица">
          <span className="text-[15px] leading-none">›</span>
        </button>
        <span className="ml-4 text-[12.5px] text-ink-600">Цял ден за номера:</span>
        <Input
          value={wholeDayNumbers}
          onChange={(e) => setWholeDayNumbers(e.target.value)}
          placeholder="напр. 3, 5, 12"
          className="!w-[150px] !py-1"
        />
        <button type="button" onClick={applyWholeDay} className="db db-teal">Приложи</button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <table className="w-full border-collapse bg-white" style={{ minWidth: 720 }}>
          <thead>
            <tr className="bg-[#fbfcfd]">
              <th className="th w-[42px]">№</th>
              <th className="th min-w-[190px] text-left">Ученик</th>
              {days.map((d) => (
                <th key={isoOf(d)} className="th w-[110px] text-center">
                  {['Пон', 'Вто', 'Сря', 'Чет', 'Пет'][days.indexOf(d)]} {ddmm(d)}
                </th>
              ))}
              <th className="th w-[100px] text-center">Цял ден</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-[#f7fbfd]">
                <td className="td text-[12px] font-bold text-ink-400">{s.number}</td>
                <td className="td whitespace-nowrap text-[13px]">
                  {s.firstName} {s.middleName ? `${s.middleName[0]}. ` : ''}{s.lastName}
                </td>
                {days.map((_, idx) => {
                  const n = cells[`${s.id}|${idx}`] ?? 0
                  return (
                    <td key={idx} className="border-l border-ink-100 p-0">
                      <button
                        type="button"
                        onClick={() => cycleCount(`${s.id}|${idx}`)}
                        className={`grid h-[32px] w-full place-items-center transition ${
                          n ? 'bg-[#fdf6d7] hover:brightness-[0.97]' : 'bg-[#f7f9fa] text-[#9aa7b0] hover:bg-[#eef3f6]'
                        }`}
                      >
                        {n ? (
                          <span className="inline-grid h-[22px] w-[22px] place-items-center rounded-full bg-[#e7505a] text-[11.5px] font-bold text-white">
                            {n}
                          </span>
                        ) : '0'}
                      </button>
                    </td>
                  )
                })}
                <td className="border-l border-ink-100 p-0">
                  <button
                    type="button"
                    onClick={() => setCells((p) => {
                      const copy = { ...p }
                      const on = days.every((_, idx) => (copy[`${s.id}|${idx}`] ?? 0) >= HOURS_PER_DAY)
                      days.forEach((_, idx) => {
                        if (on) delete copy[`${s.id}|${idx}`]
                        else copy[`${s.id}|${idx}`] = HOURS_PER_DAY
                      })
                      return copy
                    })}
                    className={`h-[32px] w-full text-[11.5px] font-semibold transition ${
                      days.every((_, idx) => (cells[`${s.id}|${idx}`] ?? 0) >= HOURS_PER_DAY)
                        ? 'bg-[#e7505a] text-white'
                        : 'bg-[#f7f9fa] text-[#7d8c98] hover:bg-[#eef3f6]'
                    }`}
                  >
                    {days.every((_, idx) => (cells[`${s.id}|${idx}`] ?? 0) >= HOURS_PER_DAY) ? 'цяла седмица' : '—'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11.5px] text-ink-500">
          Клик върху числото увеличава отсъствията за деня (0 → 1 → 2 → 3 → 0). Числото е
          колко часа е отсъствал ученикът. „Цяла седмица" маркира всички дни наведнъж.
        </p>
      </div>
    </div>
  )
}

// ── Жълт панел с подробности за отсъствията на един ученик ──────────────────
function AbsenceDetail({
  list, canExcuse, canEdit, onExcuse, onDelete, onClose,
}: {
  list: Absence[]
  canExcuse: boolean
  canEdit: (a: Absence) => boolean
  onExcuse: (a: Absence) => void
  onDelete: (a: Absence) => void
  onClose: () => void
}) {
  const { subjectName, userName } = useApp()

  if (!list.length) {
    return (
      <div className="relative border-y border-[#f5dfa0] bg-[#fdf6d7] px-4 py-3 text-[12.5px] text-[#7a6317]">
        За този ученик няма въведени отсъствия.
        <button onClick={onClose} className="absolute right-2 top-2 text-[#7a6317] hover:opacity-70">
          <Icon name="close" size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="border-y border-[#f5dfa0] bg-[#fdf6d7]">
      <div className="flex items-center justify-end px-3 pt-1.5">
        <button onClick={onClose} title="Затвори" className="text-[#7a6317] hover:opacity-70">
          <Icon name="close" size={13} />
        </button>
      </div>
      <div className="divide-y divide-[#f0e3b4] pb-1">
        {list.map((a) => {
          const kind = a.reason === 'закъснение'
            ? 'ЗАКЪСНЕНИЕ'
            : a.excused ? 'УВАЖЕНО ОТСЪСТВИЕ' : 'ОТСЪСТВИЕ'
          const created = (a.createdAt ?? '').replace('T', ' ').slice(0, 19)
          return (
            <div key={a.id} className="flex flex-wrap items-start gap-2 px-3 py-2">
              <Icon name="warn" size={15} className="mt-0.5 shrink-0 text-[#b58b00]" strokeWidth={2.2} />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] text-ink-800">
                  <b>({kind})</b>{' '}
                  <span>{subjectName(a.subjectId)} - Час {a.period}</span>
                  <span className="mx-1.5 text-[#b58b00]">|</span>
                  <Icon name="calendar" size={12} className="mr-1 inline align-[-1px] text-[#b58b00]" />
                  {dateOnly(a.date)}
                </p>
                <p className="mt-0.5 text-[11.5px] text-ink-600">
                  <span className="italic">Въведено от:</span>{' '}
                  <Icon name="user" size={11} className="mr-1 inline align-[-1px] text-[#2b6ca3]" />
                  <span className="text-[#2b6ca3]">{userName(a.teacherId)}</span>
                  <span className="mx-1 text-ink-300">/</span>
                  <Icon name="clock" size={11} className="mr-1 inline align-[-1px] text-ink-400" />
                  {created || '—'}
                  {a.excuseReason && <span className="ml-2">· Мотив: {a.excuseReason}</span>}
                  {a.note && <span className="ml-2">· {a.note}</span>}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
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
  const [notesOpen, setNotesOpen] = useState(false)
  const [filter, setFilter] = useState<'всички' | 'неуважителни' | 'закъснения' | 'уважени'>('всички')
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [date, setDate] = useState(todayISO())
  const [detailFor, setDetailFor] = useState<string | null>(null)
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
  const stats = (sid: string) => {
    const list = all.filter((a) => a.studentId === sid)
    const late = list.filter((a) => a.reason === 'закъснение')
    const unexcused = list.filter((a) => !a.excused)
    const excused = list.filter((a) => a.excused)
    return {
      late: late.length,
      unexcused: unexcused.length,
      unexcusedHours: unexcused.reduce((s, a) => s + hours(a), 0),
      excusedHours: excused.reduce((s, a) => s + hours(a), 0),
    }
  }

  const rowsForFilter = (sid: string) => {
    const list = all.filter((a) => a.studentId === sid)
    if (filter === 'неуважителни') return list.filter((a) => !a.excused)
    if (filter === 'закъснения') return list.filter((a) => a.reason === 'закъснение')
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
    excuseAbsences([excuseFor.id], excuse.reason, excuse.note || undefined)
    setExcuseFor(null)
    setExcuse({ reason: 'извинено', note: '' })
    setToast('Отсъствието е уважено.')
  }

  const notedAbsences = all
    .filter((a) => a.note || a.excuseReason)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 200)

  const detailList = detailFor
    ? all
      .filter((a) => a.studentId === detailFor)
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
                  icon="check" tone="green" disabled={!pickedIds.length}
                  onClick={() => {
                    const list = all.filter((a) => pickedIds.includes(a.studentId) && !a.excused && a.reason !== 'закъснение')
                    if (!list.length) { setToast('Няма неуважителни отсъствия за избраните ученици.'); return }
                    list.forEach((a) => excuseAbsences([a.id], 'извинено'))
                    setPicked({})
                    setToast(`Уважени ${list.length} отсъствия.`)
                  }}
                >
                  Уважи
                </TB>
                <TB icon="settings" tone="blue" onClick={() => setAdminOpen(true)}>Администрирай</TB>
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
          Клик върху числата на ученик показва подробности за отсъствията му.
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
          const open = detailFor === s.id
          return (
            <Fragment key={s.id}>
              <tr className={`${on ? 'bg-[#eef7fb]' : open ? 'bg-[#fdf6d7]/40' : ''} hover:bg-[#f7fbfd]`}>
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
                  <button onClick={() => setDetailFor(open ? null : s.id)} className="text-left">
                    <StudentCell student={s} showNumber={false} />
                  </button>
                  {filter !== 'всички' && (
                    <span className="ml-1.5 text-[11px] text-ink-400">({shown} по филтъра)</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => setDetailFor(open ? null : s.id)}
                    className={on ? 'opacity-40 transition-opacity' : 'transition-opacity'}
                  >
                    <Num value={st.late} tone={st.late ? 'olive' : 'zero'} />
                  </button>
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => setDetailFor(open ? null : s.id)}
                    className={on ? 'opacity-40 transition-opacity' : 'transition-opacity'}
                  >
                    <Num value={st.unexcused} tone={st.unexcused ? 'salmon' : 'zero'} />
                  </button>
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => setDetailFor(open ? null : s.id)}
                    className={on ? 'opacity-40 transition-opacity' : 'transition-opacity'}
                  >
                    <Num value={st.unexcusedHours} tone={st.unexcusedHours ? 'salmon' : 'zero'} />
                  </button>
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => setDetailFor(open ? null : s.id)}
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
                      canExcuse={canAdmin}
                      canEdit={canEditAbsence}
                      onExcuse={(a) => { setExcuseFor(a); setExcuse({ reason: 'извинено', note: '' }) }}
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

      {/* ── цял екран: седмичен режим ── */}
      {adminOpen && klass && (
        <WeekAdminPage
          klass={klass}
          students={students}
          absences={all}
          onDone={(added, removed) => {
            setAdminOpen(false)
            setToast(
              added
                ? `Успешно добавихте ${added} ${added === 1 ? 'отсъствие' : 'отсъствия'}.`
                : removed
                  ? `Премахнахте ${removed} ${removed === 1 ? 'отсъствие' : 'отсъствия'}.`
                  : 'Няма промени за запазване.',
            )
          }}
          onBack={() => setAdminOpen(false)}
        />
      )}

      {/* ── Уважи едно отсъствие ── */}
      <Modal
        open={!!excuseFor} onClose={() => setExcuseFor(null)} title="Уважаване на отсъствие"
        footer={
          <>
            <button onClick={() => setExcuseFor(null)} className="btn-ghost">Отказ</button>
            <button className="btn-primary" onClick={doExcuse}>Запази</button>
          </>
        }
      >
        {excuseFor && (
          <p className="mb-3 rounded-[3px] bg-[#fdf6d7] px-3 py-2 text-[12.5px] text-[#7a6317]">
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
