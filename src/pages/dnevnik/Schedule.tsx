import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Icon, Modal, Select } from '../../components/ui'
import { LastEdited, TB, Toolbar } from './shared'

/**
 * Раздел „Разписание" — седмичен изглед с по една колона за всеки учебен ден.
 * Навигацията по седмици е като в референтния дневник: « < 39 40 41 42 [43] 44 45 > »,
 * а всеки час показва предмет, учител, стая и часови диапазон.
 */

const DAY_NAMES = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък']

/** ISO номер на седмицата. */
function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function mondayOf(d: Date): Date {
  const t = new Date(d)
  const day = (t.getDay() + 6) % 7
  t.setDate(t.getDate() - day)
  t.setHours(0, 0, 0, 0)
  return t
}

function addDays(d: Date, n: number): Date {
  const t = new Date(d)
  t.setDate(t.getDate() + n)
  return t
}

const ddmm = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`

function periodRange(period: number, shift: 1 | 2): [string, string] {
  const base = shift === 1 ? 8 * 60 : 13 * 60
  const starts = [0, 45, 95, 140, 190, 235, 285, 330]
  const start = base + starts[Math.min(period, starts.length - 1)]
  const end = start + 35
  const f = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  return [f(start), f(end)]
}

export function ScheduleTab({ classId }: { classId: string }) {
  const { db, isStaff, subjectShort, subjectName, userName } = useApp()
  const [offset, setOffset] = useState(0)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ day: 1, period: 1, subjectId: '', roomId: '' })

  const klass = db.classes.find((c) => c.id === classId)
  const subjects = db.subjects.filter((s) => klass?.subjectIds.includes(s.id))
  const shift = klass?.shift ?? 1

  const monday = useMemo(() => addDays(mondayOf(new Date()), offset * 7), [offset])
  const week = isoWeek(monday)
  const weekdays = DAY_NAMES.map((_, i) => addDays(monday, i))
  const maxPeriod = Math.max(7, ...db.schedule.filter((s) => s.classId === classId).map((s) => s.period))

  const rows = db.schedule.filter((s) => s.classId === classId)
  const entry = (day: number, period: number) => rows.find((r) => r.day === day && r.period === period)

  return (
    <>
      <Toolbar>
        {isStaff && (
          <>
            <TB icon="plus" tone="teal" onClick={() => { setForm({ ...form, subjectId: subjects[0]?.id ?? '' }); setOpen(true) }}>
              Добави
            </TB>
            <TB icon="edit" tone="blue" onClick={() => window.alert('Изберете час и натиснете иконата за редакция върху него.')}>
              Редактирай
            </TB>
            <TB icon="archive" tone="purple" onClick={() => window.alert('Копира се разписанието на текущата седмица за следващата.')}>
              Дублирай
            </TB>
            <TB icon="close" tone="red" onClick={() => window.alert('За изтриване изберете конкретен час.')}>Изтрий</TB>
          </>
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
                    const e = entry(di + 1, p)
                    if (!e) {
                      return (
                        <div key={p} className="border-b border-[var(--dn-line)] px-3 py-2.5 last:border-b-0">
                          <span className="text-[12.5px] font-bold text-ink-300">{p}.</span>
                          <span className="ml-2 text-[12px] text-ink-300">свободен час</span>
                        </div>
                      )
                    }
                    const [from, to] = periodRange(p, shift)
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
                          {from} - {to}
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
            <button className="btn-primary" onClick={() => setOpen(false)}>Запази</button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-[13px] text-ink-600">
              Разписанието се утвърждава от зам.-директора в модул „Администрация → Разписания".
              Тук можете да добавите час за {klass?.name} — той се вижда веднага от учениците и родителите.
            </p>
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
            <Select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">— изберете —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
