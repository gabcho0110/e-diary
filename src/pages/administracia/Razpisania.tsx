import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, PageHeader, Table } from '../../components/ui'
import { useApp } from '../../store/AppContext'
import type { DayRegime, Lesson, RegimeHour } from '../../lib/types'
import {
  DAY_LONG, DAY_SHORT, addDaysIso, bgDate, classSubjects, classTeachers,
  endTime, hoursFor, mondayIso, schoolDays, todayIso, weekdayOf,
} from '../../lib/schedule'
import {
  AInput, ASelect, Dash, EmptyRow, FormRow, ListHead, SquareAction, ToolBtn, Toolbar,
} from './shared'
import { AddPage, Toggle, WarnBanner } from '../dnevnik/forms'

/* ══════════════════════════════════════════════════════════════════════════
 *  Модул „Разписания"
 *
 *  Два екрана, които работят заедно:
 *   • „Дневни режими" — схемата на учебния ден (колко часа, кога започват и
 *     по колко минути). Режимът се създава тук и после се избира при
 *     създаване на разписание.
 *   • „Седмични разписания" — разписанието за конкретен период: избира се
 *     паралелка, начална и крайна дата, дневен режим и после ден по ден се
 *     нареждат часовете.
 *
 *  Важно: предметите и учителите идват **само от избраната паралелка** —
 *  `klass.subjectIds` и `klass.plan`. Няма глобални списъци.
 * ══════════════════════════════════════════════════════════════════════════ */

// ── помощни ────────────────────────────────────────────────────────────────

/** Часове по подразбиране — 08:00, по 40 минути с 10 минути междучасие. */
function defaultHours(count = 7): RegimeHour[] {
  const out: RegimeHour[] = []
  let minutes = 8 * 60
  for (let i = 1; i <= count; i++) {
    out.push({
      no: i,
      start: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
      duration: 40,
    })
    minutes += 50
  }
  return out
}

/** Пренарежда номерата след добавяне/изтриване на ред. */
const renumber = (list: RegimeHour[]): RegimeHour[] => list.map((h, i) => ({ ...h, no: i + 1 }))

/** Следващ начален час — последният + продължителност + междучасие. */
function nextStart(list: RegimeHour[]): string {
  const last = list[list.length - 1]
  if (!last) return '08:00'
  const [h, m] = last.start.split(':').map(Number)
  const total = h * 60 + m + (last.duration || 40) + 10
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** „08:00–08:40" */
const span = (h: RegimeHour) => `${h.start}–${endTime(h.start, h.duration)}`

/** „1 час" / „3 часа", „1 предмет" / „2 предмета". */
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Един ред от списъка с разписания — група часове за паралелка и период. */
interface SchedRow {
  key: string
  classId: string
  from: string
  to: string
  regimeId?: string
  count: number
}

function groupLessons(lessons: Lesson[]): SchedRow[] {
  const map = new Map<string, SchedRow>()
  lessons.forEach((l) => {
    const from = l.validFrom ?? l.date
    const to = l.validTo ?? l.date
    const key = `${l.classId}|${from}|${to}|${l.regimeId ?? ''}`
    const row = map.get(key)
    if (row) row.count += 1
    else map.set(key, { key, classId: l.classId, from, to, regimeId: l.regimeId, count: 1 })
  })
  return [...map.values()].sort(
    (a, b) => a.from.localeCompare(b.from) || a.classId.localeCompare(b.classId),
  )
}

// ══════════════════════════════════════════════════════════════════════════
//  „Седмични разписания" — списък
// ══════════════════════════════════════════════════════════════════════════

export function Razpisania() {
  const { db, className, deleteLessonsRange, log } = useApp()
  const [wizard, setWizard] = useState<{ row?: SchedRow } | null>(null)

  const rows = useMemo(() => groupLessons(db.lessons), [db.lessons])
  const regimeName = (id?: string) => db.regimes.find((r) => r.id === id)?.name ?? '—'

  const remove = (row: SchedRow) => {
    const ok = window.confirm(
      `Да се изтрие ли цялото разписание на ${className(row.classId)} за ${bgDate(row.from)} – ${bgDate(row.to)}?\n\n` +
      `Ще бъдат премахнати ${row.count} часа. Действието не може да се върне.`,
    )
    if (!ok) return
    const n = deleteLessonsRange(row.classId, row.from, row.to)
    log('Изтрито разписание', `${className(row.classId)} — ${bgDate(row.from)} – ${bgDate(row.to)} (${n} часа)`)
  }

  return (
    <>
      <PageHeader
        title="Седмични разписания"
        subtitle="Разписанието се създава за период: избирате паралелка, дати и дневен режим, после нареждате часовете ден по ден. Тук се редактира и трие."
        icon="calendar"
      />

      <ListHead icon="calendar" title="Разписания" count={rows.length} />

      <Toolbar>
        <ToolBtn tone="green" icon="plus" onClick={() => setWizard({})}>Добави</ToolBtn>
        <ToolBtn tone="blue" icon="print" onClick={() => window.print()}>Печат</ToolBtn>
      </Toolbar>

      <Table
        head={
          <>
            <th className="th w-40">Паралелка</th>
            <th className="th w-52">Период</th>
            <th className="th">Дневен режим</th>
            <th className="th w-24">Часове</th>
            <th className="th w-24">Операции</th>
          </>
        }
      >
        {rows.map((r) => (
          <tr key={r.key} className="hover:bg-[#f6fafd]">
            <td className="td font-semibold">{className(r.classId)}</td>
            <td className="td text-[12.5px]">
              {bgDate(r.from)} – {bgDate(r.to)}
            </td>
            <td className="td text-[12.5px]">
              <Dash>{r.regimeId ? regimeName(r.regimeId) : ''}</Dash>
            </td>
            <td className="td"><span className="dn-num dn-olive">{r.count}</span></td>
            <td className="td">
              <div className="flex items-center gap-1.5">
                <SquareAction
                  tone="blue"
                  title="Редакция на разписанието"
                  onClick={() => setWizard({ row: r })}
                />
                <SquareAction
                  tone="red"
                  icon="trash"
                  title="Изтриване на разписанието"
                  onClick={() => remove(r)}
                />
              </div>
            </td>
          </tr>
        ))}
        {!rows.length && (
          <EmptyRow
            colSpan={5}
            text="Още няма създадени разписания. Натиснете „Добави“, за да създадете първото."
          />
        )}
      </Table>

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
        Създаденото разписание се вижда веднага в модул „Дневник“ → раздел „Разписание“,
        както и в „Моето разписание“ на учителите.
      </p>

      {wizard && <ScheduleWizard row={wizard.row} onClose={() => setWizard(null)} />}
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════
//  Създаване / редакция на разписание
// ══════════════════════════════════════════════════════════════════════════

interface CellDraft {
  subjectId: string
  teacherId: string
  roomId: string
  studyKind: string
  groupLabel: string
}

const emptyCell = (): CellDraft => ({
  subjectId: '', teacherId: '', roomId: '', studyKind: 'Присъствено', groupLabel: '',
})

function ScheduleWizard({ row, onClose }: { row?: SchedRow; onClose: () => void }) {
  const { db, className, saveLesson, deleteLesson, retimeLessons, log } = useApp()

  const firstClass = db.classes[0]?.id ?? ''
  const mon = mondayIso(todayIso())

  const [step, setStep] = useState<1 | 2>(row ? 2 : 1)
  const [head, setHead] = useState({
    classId: row?.classId ?? firstClass,
    from: row?.from ?? mon,
    to: row?.to ?? addDaysIso(mon, 4),
    regimeId: row?.regimeId ?? db.regimes[0]?.id ?? '',
  })
  /** ключ „дата|час" → какво ще се запише там */
  const [draft, setDraft] = useState<Record<string, CellDraft>>(() => {
    if (!row) return {}
    const out: Record<string, CellDraft> = {}
    db.lessons
      .filter((l) => l.classId === row.classId && l.date >= row.from && l.date <= row.to)
      .forEach((l) => {
        out[`${l.date}|${l.period}`] = {
          subjectId: l.subjectId,
          teacherId: l.teacherId,
          roomId: l.roomId ?? '',
          studyKind: l.studyKind || 'Присъствено',
          groupLabel: l.groupLabel ?? '',
        }
      })
    return out
  })
  const [editing, setEditing] = useState<string | null>(null)

  const subjects = useMemo(() => classSubjects(db, head.classId), [db, head.classId])
  const days = useMemo(() => schoolDays(head.from, head.to), [head.from, head.to])
  const regime = db.regimes.find((r) => r.id === head.regimeId)
  const klass = db.classes.find((c) => c.id === head.classId)

  const filled = Object.values(draft).filter((c) => c.subjectId).length

  const canContinue =
    !!head.classId && !!head.from && !!head.to && !!head.regimeId && head.to >= head.from

  // ── клетки ───────────────────────────────────────────────────────────────
  const openCell = (key: string) => {
    setDraft((p) => {
      if (p[key]) return p
      const sid = subjects[0]?.id ?? ''
      return {
        ...p,
        [key]: {
          ...emptyCell(),
          subjectId: sid,
          // учителят по първия предмет — веднага попълнен, за да не се избира на ръка
          teacherId: sid ? classTeachers(db, head.classId, sid)[0]?.id ?? '' : '',
        },
      }
    })
    setEditing(key)
  }

  const setCell = (key: string, patch: Partial<CellDraft>) =>
    setDraft((p) => {
      const cur = p[key] ?? emptyCell()
      const next = { ...cur, ...patch }
      // смяна на предмета → учителят се взима от паралелката за новия предмет
      if (patch.subjectId && patch.subjectId !== cur.subjectId) {
        next.teacherId = classTeachers(db, head.classId, patch.subjectId)[0]?.id ?? ''
      }
      return { ...p, [key]: next }
    })

  const clearCell = (key: string) =>
    setDraft((p) => {
      const copy = { ...p }
      delete copy[key]
      return copy
    })

  const cancelCell = (key: string) => {
    if (!draft[key]?.subjectId) clearCell(key)
    setEditing(null)
  }

  // ── запис ────────────────────────────────────────────────────────────────
  const save = () => {
    if (!canContinue) return
    const existing = db.lessons.filter(
      (l) => l.classId === head.classId && l.date >= head.from && l.date <= head.to,
    )
    // периодът се сменя преди всичко останало, иначе часовете извън него „увисват"
    if (row && (row.from !== head.from || row.to !== head.to || row.regimeId !== head.regimeId)) {
      retimeLessons(row.classId, row.from, row.to, head.from, head.to, head.regimeId)
    }
    // каквото е било в базата, но вече не е в черновата — отпада
    const keep = new Set(Object.keys(draft).filter((k) => draft[k]?.subjectId))
    existing.forEach((l) => {
      if (!keep.has(`${l.date}|${l.period}`)) deleteLesson(l.id)
    })
    // и обратно — всичко от черновата се записва
    Object.entries(draft).forEach(([key, cell]) => {
      if (!cell.subjectId) return
      const [date, p] = key.split('|')
      const period = Number(p)
      const hour = hoursFor(regime, weekdayOf(date))[period - 1]
      saveLesson({
        classId: head.classId,
        date,
        period,
        start: hour?.start ?? '',
        end: hour ? endTime(hour.start, hour.duration) : '',
        subjectId: cell.subjectId,
        teacherId: cell.teacherId,
        roomId: cell.roomId || undefined,
        studyKind: cell.studyKind || 'Присъствено',
        groupLabel: cell.groupLabel || undefined,
        regimeId: head.regimeId,
        validFrom: head.from,
        validTo: head.to,
      })
    })
    log(
      row ? 'Редакция на разписание' : 'Създадено разписание',
      `${className(head.classId)} — ${bgDate(head.from)} – ${bgDate(head.to)} (${keep.size} часа)`,
    )
    onClose()
  }

  // ── стъпка 1: паралелка, период, режим ───────────────────────────────────
  if (step === 1) {
    return (
      <AddPage
        title="Ново разписание"
        onBack={onClose}
        onSave={() => { if (canContinue && subjects.length) setStep(2) }}
        saveLabel="Продължи"
        banner={
          !subjects.length ? (
            <WarnBanner>
              Паралелка <b>{klass?.name ?? '—'}</b> няма добавени предмети. Разписанието се
              строи само от предметите на паралелката — добавете ги в „Паралелки“ →
              „Предмети и учители“ и се върнете тук.
            </WarnBanner>
          ) : undefined
        }
      >
        <div className="mx-auto max-w-[720px] rounded-[3px] border border-ink-200 bg-white px-5 py-4">
          <FormRow
            label="Паралелка"
            required
            hint={row ? 'Паралелката не се сменя при редакция — създайте ново разписание.' : undefined}
          >
            <ASelect
              value={head.classId}
              disabled={!!row}
              onChange={(e) => setHead({ ...head, classId: e.target.value })}
            >
              <option value="">— Изберете паралелка —</option>
              {db.classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </ASelect>
          </FormRow>

          <FormRow label="Начална дата" required hint="От кой ден започва разписанието.">
            <AInput
              type="date"
              value={head.from}
              onChange={(e) => setHead({ ...head, from: e.target.value })}
            />
          </FormRow>

          <FormRow label="Крайна дата" required hint="До кой ден (включително) важи разписанието.">
            <AInput
              type="date"
              value={head.to}
              onChange={(e) => setHead({ ...head, to: e.target.value })}
            />
          </FormRow>

          <FormRow
            label="Дневен режим"
            required
            hint="Режимът задава колко часа има денят и кога започват. Създава се в „Администрация“ → „Дневни режими“."
          >
            <RegimePicker
              value={head.regimeId}
              onChange={(id) => setHead({ ...head, regimeId: id })}
            />
          </FormRow>

          {klass && (
            <FormRow label="Какво ще се показва">
              <div className="rounded-[3px] border border-[#e4e9ee] bg-[#f9fbfc] px-3 py-2 text-[12.5px] leading-relaxed text-ink-600">
                <p>
                  <b>{klass.name}</b> · {plural(subjects.length, 'предмет', 'предмета')} ·{' '}
                  {plural(days.length, 'учебен ден', 'учебни дни')} ({bgDate(head.from)} – {bgDate(head.to)})
                </p>
                <p className="mt-1 text-[11.5px] text-ink-500">
                  {subjects.length
                    ? subjects.map((s) => s.short || s.name).join(' · ')
                    : 'Няма предмети в паралелката.'}
                </p>
                {subjects.length > 0 && subjects.length < 3 && (
                  <p className="mt-1.5 text-[11.5px] text-[#b25e09]">
                    В паралелката е добавен само {plural(subjects.length, 'предмет', 'предмета')} —
                    затова списъкът в разписанието е кратък. Останалите се добавят от
                    „Паралелки“ → „Предмети и учители“.
                  </p>
                )}
              </div>
            </FormRow>
          )}
        </div>

        {!canContinue && (
          <p className="mx-auto mt-3 max-w-[720px] text-right text-[11.5px] text-[#b42318]">
            Попълнете паралелка, двете дати и дневен режим.
          </p>
        )}
      </AddPage>
    )
  }

  // ── стъпка 2: ден по ден ─────────────────────────────────────────────────
  return (
    <AddPage
      title={`Разписание — ${className(head.classId)}, ${bgDate(head.from)} – ${bgDate(head.to)}`}
      onBack={() => {
        if (filled && !window.confirm('Промените още не са запазени. Да се върна ли назад без запис?')) return
        setStep(1)
      }}
      onSave={save}
      saveLabel="Запази"
      banner={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-ink-700">
          <span><b>{klass?.name}</b></span>
          <span className="text-ink-400">|</span>
          <span>{bgDate(head.from)} – {bgDate(head.to)}</span>
          <span className="text-ink-400">|</span>
          <span>Режим: <b>{regime?.name ?? '—'}</b></span>
          <span className="text-ink-400">|</span>
          <span>{plural(days.length, 'учебен ден', 'учебни дни')}</span>
          <span className="text-ink-400">|</span>
          <span className="font-semibold text-[#2f6f96]">
            {filled === 1 ? '1 час въведен' : `${filled} часа въведени`}
          </span>
        </div>
      }
    >
      {!days.length && (
        <WarnBanner>
          В избрания период няма учебни дни. Проверете началната и крайната дата.
        </WarnBanner>
      )}

      {days.map((date) => {
        const wd = weekdayOf(date)
        const hours = hoursFor(regime, wd)
        const dayCount = hours.filter((h) => draft[`${date}|${h.no}`]?.subjectId).length
        return (
          <section key={date} className="mb-3 overflow-hidden rounded-[3px] border border-ink-200 bg-white">
            <header className="flex flex-wrap items-center gap-2 border-b border-ink-200 bg-[#f7f9fa] px-3 py-2">
              <Icon name="calendar" size={14} className="text-[#5b6b78]" />
              <h3 className="text-[13px] font-bold text-[#3d4a56]">
                {DAY_LONG[wd - 1]}, {bgDate(date)}
              </h3>
              <span className="rounded bg-[#eef2f5] px-1.5 py-0.5 text-[11px] font-bold text-[#5b6b78]">
                {dayCount} / {hours.length} часа
              </span>
            </header>

            {!hours.length ? (
              <p className="px-3 py-4 text-[12.5px] text-ink-400">
                Дневният режим „{regime?.name ?? '—'}“ няма часове за този ден.
              </p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white">
                    <th className="th w-12">№</th>
                    <th className="th w-32">Час</th>
                    <th className="th">Предмет</th>
                    <th className="th">Учител</th>
                    <th className="th w-32">Стая</th>
                    <th className="th w-36">Вид</th>
                    <th className="th w-32">Група</th>
                    <th className="th w-24" />
                  </tr>
                </thead>
                <tbody>
                  {hours.map((h) => {
                    const key = `${date}|${h.no}`
                    const cell = draft[key]
                    const on = editing === key
                    const subject = cell?.subjectId
                      ? db.subjects.find((s) => s.id === cell.subjectId)
                      : undefined
                    const teacher = cell?.teacherId
                      ? db.users.find((u) => u.id === cell.teacherId)
                      : undefined
                    const room = cell?.roomId ? db.rooms.find((r) => r.id === cell.roomId) : undefined
                    return (
                      <Fragment key={key}>
                        <tr className={on ? 'bg-[#f2f9fe]' : 'hover:bg-[#f9fbfc]'}>
                          <td className="td font-semibold text-ink-500">{h.no}.</td>
                          <td className="td whitespace-nowrap text-[12px] text-ink-600">{span(h)}</td>
                          <td className="td">
                            {subject ? (
                              <button
                                type="button"
                                onClick={() => openCell(key)}
                                className="text-left text-[12.5px] font-semibold text-[#2b6ca3] hover:underline"
                              >
                                {subject.name}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openCell(key)}
                                className="inline-flex items-center gap-1 rounded-[3px] px-2 py-[3px] text-[12px] font-semibold text-white"
                                style={{ background: '#26c281' }}
                              >
                                <Icon name="plus" size={11} strokeWidth={2.8} /> Добави
                              </button>
                            )}
                          </td>
                          <td className="td text-[12px]">
                            {subject
                              ? <Dash>{teacher ? `${teacher.firstName} ${teacher.lastName}` : ''}</Dash>
                              : null}
                          </td>
                          <td className="td text-[12px]">{subject ? <Dash>{room?.name}</Dash> : null}</td>
                          <td className="td text-[12px]">{subject ? <Dash>{cell?.studyKind}</Dash> : null}</td>
                          <td className="td text-[11.5px]">{subject ? <Dash>{cell?.groupLabel}</Dash> : null}</td>
                          <td className="td">
                            {subject && (
                              <div className="flex items-center gap-1">
                                <SquareAction
                                  tone="blue"
                                  title="Редакция на часа"
                                  onClick={() => setEditing(key)}
                                />
                                <SquareAction
                                  tone="red"
                                  icon="trash"
                                  title="Изтриване на часа"
                                  onClick={() => { clearCell(key); setEditing(null) }}
                                />
                              </div>
                            )}
                          </td>
                        </tr>

                        {on && (
                          <tr className="bg-[#f2f9fe]">
                            <td colSpan={8} className="border-b border-[#d6e6f2] px-3 py-3">
                              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                                <label className="block">
                                  <span className="mb-1 block text-[11.5px] font-semibold text-[#3d4a56]">Предмет</span>
                                  <ASelect
                                    value={cell?.subjectId ?? ''}
                                    onChange={(e) => setCell(key, { subjectId: e.target.value })}
                                  >
                                    <option value="">— изберете —</option>
                                    {subjects.map((s) => (
                                      <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                  </ASelect>
                                </label>

                                <label className="block">
                                  <span className="mb-1 block text-[11.5px] font-semibold text-[#3d4a56]">Учител</span>
                                  <ASelect
                                    value={cell?.teacherId ?? ''}
                                    onChange={(e) => setCell(key, { teacherId: e.target.value })}
                                  >
                                    <option value="">— изберете —</option>
                                    {classTeachers(db, head.classId, cell?.subjectId ?? '').map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.firstName} {u.lastName}
                                      </option>
                                    ))}
                                  </ASelect>
                                </label>

                                <label className="block">
                                  <span className="mb-1 block text-[11.5px] font-semibold text-[#3d4a56]">Стая</span>
                                  <ASelect
                                    value={cell?.roomId ?? ''}
                                    onChange={(e) => setCell(key, { roomId: e.target.value })}
                                  >
                                    <option value="">— без стая —</option>
                                    {db.rooms.map((r) => (
                                      <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                  </ASelect>
                                </label>

                                <label className="block">
                                  <span className="mb-1 block text-[11.5px] font-semibold text-[#3d4a56]">Вид обучение</span>
                                  <ASelect
                                    value={cell?.studyKind ?? 'Присъствено'}
                                    onChange={(e) => setCell(key, { studyKind: e.target.value })}
                                  >
                                    <option value="Присъствено">Присъствено</option>
                                    <option value="Онлайн обучение">Онлайн обучение</option>
                                  </ASelect>
                                </label>

                                <label className="block">
                                  <span className="mb-1 block text-[11.5px] font-semibold text-[#3d4a56]">Група</span>
                                  <ASelect
                                    value={cell?.groupLabel ?? ''}
                                    onChange={(e) => setCell(key, { groupLabel: e.target.value })}
                                  >
                                    <option value="">Цялата паралелка</option>
                                    <option value="Група 1">Група 1</option>
                                    <option value="Група 2">Група 2</option>
                                    <option value="Профилираща група">Профилираща група</option>
                                  </ASelect>
                                </label>
                              </div>

                              <div className="mt-2.5 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditing(null)}
                                  className="db db-green"
                                >
                                  <Icon name="check" size={13} strokeWidth={2.6} /> Готово
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelCell(key)}
                                  className="db db-blue"
                                >
                                  Отказ
                                </button>
                                {cell?.subjectId && (
                                  <button
                                    type="button"
                                    onClick={() => { clearCell(key); setEditing(null) }}
                                    className="db db-red"
                                  >
                                    <Icon name="trash" size={13} strokeWidth={2.4} /> Изтрий часа
                                  </button>
                                )}
                                {cell?.subjectId && !classTeachers(db, head.classId, cell.subjectId).length && (
                                  <span className="text-[11.5px] text-[#b25e09]">
                                    Няма учител по този предмет в паралелката — добавете го в „Паралелки“.
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            )}
          </section>
        )
      })}
    </AddPage>
  )
}

// ── избор на дневен режим ──────────────────────────────────────────────────

function RegimePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { db } = useApp()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const chosen = db.regimes.find((r) => r.id === value)
  const needle = q.trim().toLowerCase()
  const shown = needle
    ? db.regimes.filter((r) => r.name.toLowerCase().includes(needle))
    : db.regimes

  return (
    <div className="relative">
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); setQ('') }}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[3px] border border-[#c7d0d8] bg-white px-2.5 py-[7px] text-left text-[13px] transition hover:border-[#3598dc]"
        >
          <span className={`min-w-0 flex-1 truncate ${chosen ? 'text-ink-900' : 'text-ink-400'}`}>
            {chosen ? chosen.name : 'Избери режим'}
          </span>
          <Icon name="chevronDown" size={13} className="shrink-0 text-[#5b6b78]" />
        </button>
        <button
          type="button"
          title="Избери дневен режим"
          onClick={() => { setOpen(true); setQ('') }}
          className="grid w-[31px] shrink-0 place-items-center rounded-[3px] text-white"
          style={{ background: '#3598dc' }}
        >
          <Icon name="search" size={13} strokeWidth={2.4} />
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 z-40 mt-1 rounded-[3px] border border-[#c7d0d8] bg-white shadow-[0_8px_22px_rgba(30,45,60,0.16)]">
            <div className="border-b border-[#e4e9ee] p-1.5">
              <div className="flex items-center gap-1.5 rounded-[3px] border border-[#c7d0d8] px-1.5">
                <Icon name="search" size={12} className="shrink-0 text-ink-400" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Търси режим…"
                  className="w-full bg-transparent py-[5px] text-[12.5px] outline-none placeholder:text-ink-400"
                />
              </div>
            </div>
            <div className="max-h-[220px] overflow-y-auto p-1">
              {shown.map((r) => {
                const on = r.id === value
                const h = r.hours[0]
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { onChange(r.id); setOpen(false) }}
                    className={`flex w-full items-center gap-2 rounded px-1.5 py-[5px] text-left text-[12.5px] hover:bg-[#eef6fb] ${
                      on ? 'bg-[#e6f2fa] font-semibold' : ''
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{r.name}</span>
                    <span className="shrink-0 text-[11px] text-ink-400">
                      {r.different ? 'по дни' : `${r.hours.length} ч.`}
                      {h ? ` от ${h.start}` : ''}
                    </span>
                    {on && <Icon name="check" size={12} className="shrink-0 text-[#26c281]" strokeWidth={3} />}
                  </button>
                )
              })}
              {!shown.length && (
                <p className="px-2 py-3 text-[12px] text-ink-400">Няма намерен режим.</p>
              )}
            </div>
            <div className="border-t border-[#e4e9ee] px-2 py-1.5">
              <Link
                to="/administracia/rezhimi"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#337ab7] hover:underline"
              >
                <Icon name="plus" size={12} strokeWidth={2.6} /> Нов дневен режим
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
//  „Дневни режими"
// ══════════════════════════════════════════════════════════════════════════

export function Rezhimi() {
  const { db, deleteRegime, log } = useApp()
  const [editor, setEditor] = useState<{ regime?: DayRegime } | null>(null)

  const rows = useMemo(
    () => [...db.regimes].sort((a, b) => a.name.localeCompare(b.name, 'bg')),
    [db.regimes],
  )

  const usedBy = (id: string) => db.lessons.filter((l) => l.regimeId === id).length

  const remove = (r: DayRegime) => {
    const n = usedBy(r.id)
    const ok = window.confirm(
      `Да се изтрие ли режимът „${r.name}“?` +
      (n ? `\n\nТой се ползва от ${n} часа в разписанията — те ще останат, но без връзка към режима.` : ''),
    )
    if (!ok) return
    deleteRegime(r.id)
    log('Изтрит дневен режим', r.name)
  }

  return (
    <>
      <PageHeader
        title="Дневни режими"
        subtitle="Колко часа има учебният ден, кога започват и по колко минути. Режимът се избира при създаване на разписание."
        icon="clock"
      />

      <ListHead icon="clock" title="Режими" count={rows.length} />

      <Toolbar>
        <ToolBtn tone="green" icon="plus" onClick={() => setEditor({})}>Добави</ToolBtn>
      </Toolbar>

      <Table
        head={
          <>
            <th className="th">Наименование</th>
            <th className="th w-44">Различен режим за всеки ден</th>
            <th className="th w-24">Часове</th>
            <th className="th w-32">Първи час</th>
            <th className="th w-32">Последен час</th>
            <th className="th w-24">Операции</th>
          </>
        }
      >
        {rows.map((r) => {
          const first = r.hours[0]
          const last = r.hours[r.hours.length - 1]
          return (
            <tr key={r.id} className="hover:bg-[#f6fafd]">
              <td className="td font-semibold">{r.name}</td>
              <td className="td">
                {r.different ? (
                  <span className="inline-flex items-center gap-1 rounded-[3px] bg-[#e6f4ea] px-1.5 py-0.5 text-[11.5px] font-bold text-[#1f7a45]">
                    <Icon name="check" size={11} strokeWidth={3} /> ДА
                  </span>
                ) : (
                  <span className="text-[11.5px] font-semibold text-ink-400">НЕ</span>
                )}
              </td>
              <td className="td">
                <span className="dn-num dn-olive">{hoursLabel(r)}</span>
              </td>
              <td className="td text-[12.5px]"><Dash>{first?.start}</Dash></td>
              <td className="td text-[12.5px]"><Dash>{last ? endTime(last.start, last.duration) : ''}</Dash></td>
              <td className="td">
                <div className="flex items-center gap-1.5">
                  <SquareAction
                    tone="blue"
                    title="Редакция на режима"
                    onClick={() => setEditor({ regime: r })}
                  />
                  <SquareAction
                    tone="red"
                    icon="trash"
                    title="Изтриване на режима"
                    onClick={() => remove(r)}
                  />
                </div>
              </td>
            </tr>
          )
        })}
        {!rows.length && (
          <EmptyRow colSpan={6} text="Няма дневни режими. Натиснете „Добави“, за да създадете първия." />
        )}
      </Table>

      {editor && <RegimeEditor initial={editor.regime} onClose={() => setEditor(null)} />}
    </>
  )
}

/**
 * Колко часа показва режимът в списъка.
 *
 * При „различен всеки ден" сборът (напр. 33) не значи нищо — показва се
 * диапазонът за ден: „5–7".
 */
function hoursLabel(r: DayRegime): string {
  if (!r.different) return String(r.hours.length)
  const lens = Object.values(r.byDay ?? {}).map((h) => h.length)
  if (!lens.length) return '0'
  const min = Math.min(...lens)
  const max = Math.max(...lens)
  return min === max ? String(min) : `${min}–${max}`
}

// ── редактор на режим ──────────────────────────────────────────────────────

function RegimeEditor({ initial, onClose }: { initial?: DayRegime; onClose: () => void }) {
  const { addRegime, updateRegime, log } = useApp()
  const [name, setName] = useState(initial?.name ?? '')
  const [different, setDifferent] = useState(initial?.different ?? false)
  const [hours, setHours] = useState<RegimeHour[]>(initial?.hours?.length ? initial.hours : defaultHours(7))
  const [byDay, setByDay] = useState<Record<string, RegimeHour[]>>(
    initial?.byDay ?? { '1': defaultHours(7), '2': defaultHours(7), '3': defaultHours(7), '4': defaultHours(7), '5': defaultHours(5) },
  )
  const [day, setDay] = useState('1')
  const [err, setErr] = useState<string | null>(null)

  const list = different ? (byDay[day] ?? []) : hours
  const setList = (next: RegimeHour[]) => {
    if (different) setByDay((p) => ({ ...p, [day]: renumber(next) }))
    else setHours(renumber(next))
  }

  const patchRow = (i: number, patch: Partial<RegimeHour>) =>
    setList(list.map((h, j) => (j === i ? { ...h, ...patch } : h)))

  const save = () => {
    if (!name.trim()) { setErr('Въведете наименование на режима.'); return }
    const total = different
      ? Object.values(byDay).reduce((a, h) => a + h.length, 0)
      : hours.length
    if (!total) { setErr('Добавете поне един час.'); return }
    const payload = {
      name: name.trim(),
      different,
      hours: renumber(hours),
      byDay: different ? byDay : undefined,
    }
    if (initial) {
      updateRegime(initial.id, payload)
      log('Редакция на дневен режим', payload.name)
    } else {
      addRegime(payload)
      log('Създаден дневен режим', payload.name)
    }
    onClose()
  }

  return (
    <AddPage title={initial ? `Режим — ${initial.name}` : 'Нов дневен режим'} onBack={onClose} onSave={save}>
      <div className="mx-auto max-w-[760px]">
        {err && (
          <div className="mb-3 rounded border border-[#f3c2c2] bg-[#fdecec] px-3 py-2 text-[12.5px] text-[#b42318]">
            {err}
          </div>
        )}

        <div className="rounded-[3px] border border-ink-200 bg-white px-5 py-4">
          <FormRow label="Наименование" required>
            <AInput
              value={name}
              onChange={(e) => { setName(e.target.value); setErr(null) }}
              placeholder="напр. Смяна 1"
            />
          </FormRow>

          <FormRow
            label="Различен режим за всеки ден"
            hint="Когато е „ДА“, всеки ден от седмицата има собствена схема — напр. петък е съкратен."
          >
            <Toggle on={different} onChange={setDifferent} />
          </FormRow>
        </div>

        {different && (
          <div className="mt-3 flex flex-wrap items-center gap-1">
            {DAY_SHORT.map((d, i) => {
              const key = String(i + 1)
              const on = day === key
              const n = (byDay[key] ?? []).length
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDay(key)}
                  className={`rounded-[3px] border px-2.5 py-1 text-[12.5px] font-semibold transition ${
                    on
                      ? 'border-[#3598dc] bg-[#3598dc] text-white'
                      : 'border-[#c7d0d8] bg-white text-[#3d4a56] hover:bg-[#eef6fb]'
                  }`}
                >
                  {d} <span className={on ? 'text-white/80' : 'text-ink-400'}>({n})</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-3 overflow-hidden rounded-[3px] border border-ink-200 bg-white">
          <table className="w-full border-collapse">
            <thead className="bg-[#f7f9fa]">
              <tr>
                <th className="th w-16">№</th>
                <th className="th w-44">Начален час</th>
                <th className="th w-44">Продължителност</th>
                <th className="th">Край</th>
                <th className="th w-16" />
              </tr>
            </thead>
            <tbody>
              {list.map((h, i) => (
                <tr key={i} className="hover:bg-[#f9fbfc]">
                  <td className="td font-semibold text-ink-500">{h.no}.</td>
                  <td className="td">
                    <AInput
                      type="time"
                      value={h.start}
                      onChange={(e) => patchRow(i, { start: e.target.value })}
                      className="max-w-[120px]"
                    />
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1.5">
                      <AInput
                        type="number"
                        min={1}
                        max={120}
                        value={h.duration}
                        onChange={(e) => patchRow(i, { duration: Number(e.target.value) || 0 })}
                        className="max-w-[80px]"
                      />
                      <span className="text-[12px] text-ink-400">мин.</span>
                    </div>
                  </td>
                  <td className="td text-[12.5px] text-ink-600">{endTime(h.start, h.duration)}</td>
                  <td className="td">
                    <button
                      type="button"
                      title="Изтрий часа"
                      onClick={() => setList(list.filter((_, j) => j !== i))}
                      className="grid h-[24px] w-[24px] place-items-center rounded-[3px] text-white"
                      style={{ background: '#e7505a' }}
                    >
                      <Icon name="close" size={12} strokeWidth={3} />
                    </button>
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[12.5px] text-ink-400">
                    Няма добавени часове.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => setList([...list, { no: list.length + 1, start: nextStart(list), duration: 40 }])}
          className="mt-2 inline-flex items-center gap-1 rounded-[3px] px-2.5 py-1.5 text-[12.5px] font-semibold text-white"
          style={{ background: '#26c281' }}
        >
          <Icon name="plus" size={13} strokeWidth={2.8} /> Добави час
        </button>
      </div>
    </AddPage>
  )
}

// ══════════════════════════════════════════════════════════════════════════
//  „Шаблони"
// ══════════════════════════════════════════════════════════════════════════

export function Shabloni() {
  const { db } = useApp()

  const templates = [
    {
      name: 'Основен шаблон',
      desc: 'Присъствено обучение, първа смяна, 7 часа на ден.',
      used: db.regimes.filter((r) => !r.different && r.hours.length === 7).length,
    },
    {
      name: 'Съкратен ден',
      desc: 'По-малко часове — за петък, празнични дни и методически дни.',
      used: db.regimes.filter((r) => r.different || r.hours.length <= 5).length,
    },
    {
      name: 'ОРЕС / онлайн обучение',
      desc: 'Часове, които се провеждат дистанционно.',
      used: db.lessons.filter((l) => l.studyKind === 'Онлайн обучение').length,
    },
    {
      name: 'Разделяне на групи',
      desc: 'Един час, разделен на две групи (напр. БЕЛ и чужд език).',
      used: db.lessons.filter((l) => !!l.groupLabel && l.groupLabel !== 'Цялата паралелка').length,
    },
  ]

  return (
    <>
      <PageHeader
        title="Шаблони"
        subtitle="Готови рамки за дневния режим и за разписанието."
        icon="clipboard"
      />

      <Table
        head={
          <>
            <th className="th">Шаблон</th>
            <th className="th">Описание</th>
            <th className="th w-32">Използван</th>
          </>
        }
      >
        {templates.map((t) => (
          <tr key={t.name} className="hover:bg-[#f6fafd]">
            <td className="td font-semibold">{t.name}</td>
            <td className="td text-[12.5px] text-ink-600">{t.desc}</td>
            <td className="td"><span className="dn-num dn-olive">{t.used}</span></td>
          </tr>
        ))}
      </Table>
    </>
  )
}
