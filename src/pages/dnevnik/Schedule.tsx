import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Icon, Modal, Select } from '../../components/ui'
import { DAY_NAMES, addDays, ddmm, isoWeek, mondayOf, periodRange } from '../../lib/week'
import { classTeachers, endTime, hoursFor, isoOf, weekdayOf } from '../../lib/schedule'
import { LastEdited, TB, Toolbar } from './shared'

/**
 * Раздел „Разписание" — седмичен изглед с по една колона за всеки учебен ден.
 * Навигацията по седмици е като в референтния дневник: « < 39 40 41 42 [43] 44 45 > »,
 * а всеки час показва предмет, учител, стая и часови диапазон.
 *
 * Източникът е `db.lessons` — разписанието, създадено в „Администрация" →
 * „Седмични разписания" за конкретни дати. Ако за тази седмица още няма
 * създадено разписание, се показва седмичният шаблон (`db.schedule`), за да не
 * изглежда разделът празен в демото.
 */

/** Един час, приведен до общ вид — независимо от кой източник идва. */
interface Cell {
  subjectId: string
  teacherId: string
  roomId?: string
  group?: string
  tag?: string
  from: string
  to: string
}

export function ScheduleTab({ classId }: { classId: string }) {
  const { db, isStaff, subjectShort, userName, saveLesson, log } = useApp()
  const [offset, setOffset] = useState(0)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ day: 1, period: 1, subjectId: '', teacherId: '', roomId: '' })
  const [err, setErr] = useState<string | null>(null)

  const klass = db.classes.find((c) => c.id === classId)
  const subjects = db.subjects.filter((s) => klass?.subjectIds.includes(s.id))
  const shift = klass?.shift ?? 1

  const monday = useMemo(() => addDays(mondayOf(new Date()), offset * 7), [offset])
  const week = isoWeek(monday)
  const weekdays = DAY_NAMES.map((_, i) => addDays(monday, i))
  const weekIso = weekdays.map(isoOf)

  /** Разписанието по дати за тази седмица (ако има създадено такова). */
  const dated = useMemo(
    () => db.lessons.filter((l) => l.classId === classId && weekIso.includes(l.date)),
    [db.lessons, classId, weekIso.join()],
  )
  const template = useMemo(
    () => db.schedule.filter((s) => s.classId === classId),
    [db.schedule, classId],
  )
  const useDated = dated.length > 0

  const maxPeriod = useMemo(() => {
    if (useDated) return Math.max(7, ...dated.map((l) => l.period))
    const regime = db.regimes[0]
    return Math.max(7, ...template.map((s) => s.period), hoursFor(regime, 1).length)
  }, [useDated, dated, template, db.regimes])

  const cell = (dayIdx: number, period: number): Cell | undefined => {
    const date = weekIso[dayIdx]
    if (useDated) {
      const l = dated.find((x) => x.date === date && x.period === period)
      if (!l) return undefined
      return {
        subjectId: l.subjectId, teacherId: l.teacherId, roomId: l.roomId,
        group: l.groupLabel, from: l.start, to: l.end,
      }
    }
    const s = template.find((x) => x.day === dayIdx + 1 && x.period === period)
    if (!s) return undefined
    const [from, to] = periodRange(period, shift)
    return { subjectId: s.subjectId, teacherId: s.teacherId, roomId: s.roomId, group: s.group, tag: s.tag, from, to }
  }

  const openAdd = (dayIdx?: number, period?: number) => {
    setErr(null)
    setForm({
      day: (dayIdx ?? 1) + 1,
      period: period ?? 1,
      subjectId: subjects[0]?.id ?? '',
      teacherId: subjects[0] ? classTeachers(db, classId, subjects[0].id)[0]?.id ?? '' : '',
      roomId: '',
    })
    setOpen(true)
  }

  const save = () => {
    const date = weekIso[form.day - 1]
    if (!form.subjectId) { setErr('Изберете предмет.'); return }
    const regime = db.regimes[0]
    const hour = hoursFor(regime, weekdayOf(date))[form.period - 1]
    const [from, to] = hour
      ? [hour.start, endTime(hour.start, hour.duration)]
      : periodRange(form.period, shift)
    saveLesson({
      classId,
      date,
      period: form.period,
      start: from,
      end: to,
      subjectId: form.subjectId,
      teacherId: form.teacherId,
      roomId: form.roomId || undefined,
      studyKind: 'Присъствено',
      regimeId: regime?.id,
      validFrom: weekIso[0],
      validTo: weekIso[weekIso.length - 1],
    })
    log('Добавен час в разписанието', `${klass?.name ?? ''} — ${date}, ${form.period}. час`)
    setOpen(false)
  }

  return (
    <>
      <Toolbar>
        {isStaff && (
          <TB icon="plus" tone="teal" onClick={() => openAdd()}>Добави</TB>
        )}
        <TB icon="print" tone="gold" onClick={() => window.print()}>Принтирай</TB>
      </Toolbar>

      {/* навигация по седмици */}
      <div className="mb-3 flex flex-wrap items-center gap-1">
        <button onClick={() => setOffset(offset - 10)} className="db db-blue" title="−10 седмици">«</button>
        <button onClick={() => setOffset(offset - 1)} className="db db-blue" title="Предишна седмица"><span className="text-[15px] leading-none">‹</span></button>
        {Array.from({ length: 7 }, (_, i) => week - 4 + i).map((w) => (
          <button
            key={w}
            onClick={() => setOffset(offset + (w - week))}
            className={`db ${w === week ? 'db-teal' : 'bg-white !text-[#337ab7] border border-ink-200'}`}
          >
            {w}
          </button>
        ))}
        <button onClick={() => setOffset(offset + 1)} className="db db-blue" title="Следваща седмица"><span className="text-[15px] leading-none">›</span></button>
        <button onClick={() => setOffset(offset + 10)} className="db db-blue" title="+10 седмици">»</button>
        <span className="ml-2 rounded-[3px] border border-ink-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-700">
          Седмица {week} ({ddmm(weekdays[0])}-{ddmm(weekdays[4])})
        </span>
      </div>

      <div className="overflow-x-auto rounded-[3px] border border-[var(--dn-line)] bg-white">
        <table className="w-full border-collapse" style={{ minWidth: 1000 }}>
          <thead>
            <tr className="bg-[#fbfcfd]">
              {weekdays.map((d, i) => (
                <th key={i} className="border-b border-r border-[var(--dn-line)] px-3 py-2 text-center text-[12.5px] font-bold text-ink-800 last:border-r-0">
                  {DAY_NAMES[i]} / {ddmm(d)}.{d.getFullYear()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {weekdays.map((_, di) => (
                <td key={di} className="w-1/5 border-r border-[var(--dn-line)] p-0 align-top last:border-r-0">
                  {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((p) => {
                    const e = cell(di, p)
                    if (!e) {
                      return (
                        <div key={p} className="border-b border-[var(--dn-line)] px-3 py-2.5 last:border-b-0">
                          <span className="text-[12.5px] font-bold text-ink-300">{p}.</span>
                          <span className="ml-2 text-[12px] text-ink-300">свободен час</span>
                        </div>
                      )
                    }
                    const room = db.rooms.find((r) => r.id === e.roomId)
                    return (
                      <div key={p} className="border-b border-[var(--dn-line)] px-3 py-2.5 last:border-b-0 hover:bg-[#f7fbfd]">
                        <p className="text-[12.5px]">
                          <span className="font-bold text-ink-500">{p}.</span>{' '}
                          <Icon name="book" size={13} className="mx-0.5 inline align-[-2px] text-[#3598dc]" strokeWidth={2} />
                          <span className="font-bold text-[#2b6ca3]">{subjectShort(e.subjectId)}</span>
                          {e.tag && <span className="ml-1.5 rounded bg-[#f1eafe] px-1 py-0.5 text-[10px] font-bold text-[#6b21a8]">{e.tag}</span>}
                        </p>
                        <p className="mt-0.5 text-[12px] text-ink-700">
                          <Icon name="person" size={11} className="mr-1 inline align-[-1px] text-ink-400" />
                          {userName(e.teacherId)}
                        </p>
                        <p className="mt-0.5 text-[12px] text-ink-700">
                          <Icon name="grid" size={11} className="mr-1 inline align-[-1px] text-ink-400" />
                          {room ? `${room.name}${room.floor ? ` (Етаж ${room.floor})` : ''}` : '—'}
                        </p>
                        <p className="mt-0.5 text-[12px] text-ink-700">
                          <Icon name="clock" size={11} className="mr-1 inline align-[-1px] text-ink-400" />
                          {e.from} - {e.to}
                        </p>
                        {e.group && <p className="mt-0.5 text-[11px] text-ink-500">{e.group}</p>}
                      </div>
                    )
                  })}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <LastEdited when="2026-10-04 00:11:35" who={userName(klass?.homeroomTeacherId ?? '')} />

      <Modal
        open={open} onClose={() => setOpen(false)} title="Нов час в разписанието"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button className="btn-primary" onClick={save}>Запази</button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-[13px] text-ink-600">
              Часът се записва за конкретна дата в седмица {week}. Пълното разписание се
              създава в „Администрация“ → „Седмични разписания“.
            </p>
            {err && <p className="mt-2 text-[12.5px] font-semibold text-[#b42318]">{err}</p>}
          </div>
          <label className="block">
            <span className="label">Ден</span>
            <Select value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}>
              {DAY_NAMES.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
            </Select>
          </label>
          <label className="block">
            <span className="label">Час №</span>
            <Select value={form.period} onChange={(e) => setForm({ ...form, period: Number(e.target.value) })}>
              {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((p) => <option key={p} value={p}>{p} час</option>)}
            </Select>
          </label>
          <label className="block">
            <span className="label">Предмет</span>
            <Select
              value={form.subjectId}
              onChange={(e) => {
                const sid = e.target.value
                setForm({ ...form, subjectId: sid, teacherId: classTeachers(db, classId, sid)[0]?.id ?? '' })
              }}
            >
              <option value="">— изберете —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </label>
          <label className="block">
            <span className="label">Учител</span>
            <Select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
              <option value="">— изберете —</option>
              {classTeachers(db, classId, form.subjectId).map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="label">Стая</span>
            <Select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
              <option value="">— без стая —</option>
              {db.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </label>
        </div>
      </Modal>
    </>
  )
}
