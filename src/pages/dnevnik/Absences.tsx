import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Field, Icon, Input, Modal, Select, Textarea } from '../../components/ui'
import type { Absence } from '../../lib/types'
import { DnTable, EmptyRow, FilterButton, Num, StudentCell, TB, Th, Toolbar, dateOnly } from './shared'

/**
 * Раздел „Отсъствия".
 *
 * Логиката е по референтния дневник:
 *  • „Добави" → избира се дата; всеки ученик е „Присъства" по подразбиране и
 *    при клик върху клетката минава през: Присъства → Неуважително → Закъснение.
 *  • има колона „Цял ден" — отсъствие за всички часове.
 *  • „Уважи" се отнася само за отсъствия (не за закъснения) и иска мотив.
 *  • „Администрирай" въвежда групово отсъствия за период.
 *  • „Бележки" показва мотивите, с които са уважени отсъствията.
 */

type Status = 'присъства' | 'неуважително' | 'закъснение'

const HOURS_PER_DAY = 7

const cycle = (s: Status): Status =>
  s === 'присъства' ? 'неуважително' : s === 'неуважително' ? 'закъснение' : 'присъства'

const STATUS_STYLE: Record<Status, string> = {
  'присъства': 'border-[#cfe0ec] bg-[#f4f9fc] text-[#5b7f9c]',
  'неуважително': 'border-[#e7505a] bg-[#fde8e8] text-[#b42318]',
  'закъснение': 'border-[#d8b03c] bg-[#fdf7e0] text-[#8a6d05]',
}

export function AbsencesTab({ classId }: { classId: string }) {
  const { db, user, isStaff, studentsOf, addAbsences, deleteAbsence, excuseAbsences, subjectName } = useApp()

  const [open, setOpen] = useState(false)
  const [excuseOpen, setExcuseOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [filter, setFilter] = useState<'всички' | 'неуважителни' | 'закъснения' | 'уважени'>('всички')
  const [picked, setPicked] = useState<Record<string, boolean>>({})

  // ── „Добави" ──
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    period: 1,
    subjectId: '',
    status: {} as Record<string, Status>,
    wholeDay: {} as Record<string, boolean>,
  })

  // ── „Уважи" ──
  const [excuse, setExcuse] = useState({ reason: 'извинено' as Absence['reason'], note: '' })
  // ── „Администрирай" ──
  const [admin, setAdmin] = useState({
    from: new Date().toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    reason: 'неизвинено' as Absence['reason'],
    period: 1,
    studentIds: [] as string[],
  })

  const klass = db.classes.find((c) => c.id === classId)
  const students = studentsOf(classId)
  const subjects = db.subjects.filter((s) => klass?.subjectIds.includes(s.id))
  const all = useMemo(
    () => db.absences.filter((a) => a.classId === classId),
    [db.absences, classId],
  )

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

  const saveNew = () => {
    const rows: Omit<Absence, 'id' | 'createdAt'>[] = []
    Object.entries(form.status).forEach(([sid, st]) => {
      if (st === 'присъства') return
      rows.push({
        studentId: sid,
        classId,
        date: form.date,
        period: form.period,
        subjectId: form.subjectId || subjects[0]?.id || '',
        reason: st === 'закъснение' ? 'закъснение' : 'неизвинено',
        excused: false,
        wholeDay: !!form.wholeDay[sid],
        teacherId: user!.id,
      })
    })
    if (!rows.length) return
    addAbsences(rows)
    setForm({ ...form, status: {}, wholeDay: {} })
    setOpen(false)
  }

  const saveExcuse = () => {
    if (!pickedIds.length) return
    const ids = all
      .filter((a) => pickedIds.includes(a.studentId) && a.reason !== 'закъснение')
      .map((a) => a.id)
    if (!ids.length) return
    excuseAbsences(ids, excuse.reason, excuse.note || undefined)
    setPicked({})
    setExcuseOpen(false)
  }

  const saveAdmin = () => {
    if (!admin.studentIds.length) return
    const rows: Omit<Absence, 'id' | 'createdAt'>[] = []
    const from = new Date(admin.from + 'T00:00:00')
    const to = new Date(admin.to + 'T00:00:00')
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const day = d.getDay()
      if (day === 0 || day === 6) continue // без събота и неделя
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      admin.studentIds.forEach((sid) => rows.push({
        studentId: sid, classId, date: iso, period: admin.period,
        subjectId: subjects[0]?.id ?? '', reason: admin.reason,
        excused: admin.reason === 'извинено' || admin.reason === 'семейни причини',
        wholeDay: true, teacherId: user!.id,
      }))
    }
    if (!rows.length) return
    addAbsences(rows)
    setAdmin({ ...admin, studentIds: [] })
    setAdminOpen(false)
  }

  const notedAbsences = all
    .filter((a) => a.note || a.excuseReason)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 200)

  return (
    <>
      <Toolbar>
        {isStaff && (
          <>
            <TB icon="plus" tone="teal" onClick={() => {
              setForm({ ...form, subjectId: subjects[0]?.id ?? '', status: {}, wholeDay: {} })
              setOpen(true)
            }}>
              Добави
            </TB>
            <TB icon="check" tone="green" disabled={!pickedIds.length} onClick={() => setExcuseOpen(true)}>
              Уважи
            </TB>
            <TB icon="settings" tone="blue" onClick={() => setAdminOpen(true)}>Администрирай</TB>
          </>
        )}
        <TB icon="report" tone="purple" onClick={() => setNotesOpen(true)}>Бележки</TB>
        {isStaff && (
          <TB
            icon="close" tone="red" disabled={!pickedIds.length}
            onClick={() => {
              const doomed = all.filter((a) => pickedIds.includes(a.studentId))
              if (!doomed.length) return
              if (!window.confirm(`Да се изтрият ли ${doomed.length} отсъствия за избраните ученици?`)) return
              doomed.forEach((a) => deleteAbsence(a.id))
              setPicked({})
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
            <Th className="w-[100px] text-center">Общо неуч.</Th>
            <Th className="w-[100px] text-center">Общо уваж.</Th>
          </>
        }
      >
        {students.map((s) => {
          const st = stats(s.id)
          const shown = rowsForFilter(s.id).length
          const on = !!picked[s.id]
          return (
            <tr key={s.id} className={on ? 'bg-[#eef7fb]' : 'hover:bg-[#f7fbfd]'}>
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
                <StudentCell student={s} showNumber={false} />
                {filter !== 'всички' && (
                  <span className="ml-1.5 text-[11px] text-ink-400">({shown} по филтъра)</span>
                )}
              </td>
              <td className="px-3 py-2 text-center"><Num value={st.late} tone={st.late ? 'olive' : 'zero'} /></td>
              <td className="px-3 py-2 text-center"><Num value={st.unexcused} tone="zero" /></td>
              <td className="px-3 py-2 text-center"><Num value={st.unexcusedHours} tone={st.unexcusedHours ? 'salmon' : 'zero'} /></td>
              <td className="px-3 py-2 text-center"><Num value={st.excusedHours} tone={st.excusedHours ? 'green' : 'zero'} /></td>
            </tr>
          )
        })}
        {students.length === 0 && <EmptyRow colSpan={isStaff ? 7 : 6} text="В паралелката няма активни ученици." />}
      </DnTable>

      {/* ── Добави отсъствия ── */}
      <Modal
        open={open} onClose={() => setOpen(false)} wide title="Добавяне на отсъствия"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button className="btn-primary" onClick={saveNew}>Запази</button>
          </>
        }
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Field label="Дата"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Час №">
            <Select value={form.period} onChange={(e) => setForm({ ...form, period: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6, 7].map((p) => <option key={p} value={p}>{p} час</option>)}
            </Select>
          </Field>
          <Field label="Предмет">
            <Select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.short} — {s.name}</option>)}
            </Select>
          </Field>
        </div>

        <p className="mb-2 text-[12px] text-ink-500">
          Всички ученици са „Присъства". Клик върху клетката: веднъж → <b className="text-[#b42318]">Неуважително</b>,
          втори път → <b className="text-[#8a6d05]">Закъснение</b>, трети път → отново присъства.
        </p>

        <div className="max-h-[400px] overflow-y-auto rounded-lg border border-ink-200">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-ink-50">
              <tr>
                <th className="th w-10">№</th>
                <th className="th">Ученик</th>
                <th className="th w-24 text-center">Цял ден</th>
                <th className="th w-[190px] text-center">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {students.map((s) => {
                const st = form.status[s.id] ?? 'присъства'
                return (
                  <tr key={s.id}>
                    <td className="td text-[12px] font-bold text-ink-400">{s.number}</td>
                    <td className="td text-[13px]">{s.firstName} {s.lastName}</td>
                    <td className="td text-center">
                      <input
                        type="checkbox" className="h-3.5 w-3.5"
                        checked={!!form.wholeDay[s.id]}
                        disabled={st === 'присъства'}
                        onChange={(e) => setForm({ ...form, wholeDay: { ...form.wholeDay, [s.id]: e.target.checked } })}
                      />
                    </td>
                    <td className="td">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, status: { ...form.status, [s.id]: cycle(st) } })}
                        className={`w-full rounded border px-2 py-1 text-[12px] font-semibold transition ${STATUS_STYLE[st]}`}
                      >
                        {st === 'присъства' ? 'Присъства' : st === 'неуважително' ? 'Неуважително' : 'Закъснение'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* ── Уважи ── */}
      <Modal
        open={excuseOpen} onClose={() => setExcuseOpen(false)} title="Уважаване на отсъствия"
        footer={
          <>
            <button onClick={() => setExcuseOpen(false)} className="btn-ghost">Отказ</button>
            <button className="btn-primary" onClick={saveExcuse}>Уважи</button>
          </>
        }
      >
        <p className="mb-3 text-[13px] text-ink-600">
          Ще бъдат уважени всички <b>неуважителни отсъствия</b> на избраните ученици
          ({pickedIds.length}). Закъсненията не се уважават.
        </p>
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

      {/* ── Администрирай ── */}
      <Modal
        open={adminOpen} onClose={() => setAdminOpen(false)} wide title="Администриране на отсъствия"
        footer={
          <>
            <button onClick={() => setAdminOpen(false)} className="btn-ghost">Отказ</button>
            <button className="btn-primary" onClick={saveAdmin}>Запази</button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="От"><Input type="date" value={admin.from} onChange={(e) => setAdmin({ ...admin, from: e.target.value })} /></Field>
          <Field label="До"><Input type="date" value={admin.to} onChange={(e) => setAdmin({ ...admin, to: e.target.value })} /></Field>
          <Field label="Причина">
            <Select value={admin.reason} onChange={(e) => setAdmin({ ...admin, reason: e.target.value as Absence['reason'] })}>
              <option value="неизвинено">Неизвинено</option>
              <option value="извинено">Извинено</option>
              <option value="семейни причини">Семейни причини</option>
            </Select>
          </Field>
          <Field label="Час №">
            <Select value={admin.period} onChange={(e) => setAdmin({ ...admin, period: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6, 7].map((p) => <option key={p} value={p}>{p} час</option>)}
            </Select>
          </Field>
        </div>
        <p className="mt-2 text-xs text-ink-400">Въвежда се „цял ден" за всеки учебен ден в периода (без събота и неделя).</p>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="label !mb-0">Ученици</p>
            <div className="flex gap-2 text-[12px] font-semibold">
              <button onClick={() => setAdmin({ ...admin, studentIds: students.map((s) => s.id) })} className="text-brand-700 hover:underline">Маркирай всички</button>
              <button onClick={() => setAdmin({ ...admin, studentIds: [] })} className="text-ink-500 hover:underline">Изчисти</button>
            </div>
          </div>
          <div className="grid max-h-[240px] grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-ink-200 p-2.5 sm:grid-cols-3">
            {students.map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-[12.5px] hover:bg-ink-50">
                <input
                  type="checkbox" className="h-3.5 w-3.5"
                  checked={admin.studentIds.includes(s.id)}
                  onChange={(e) => setAdmin({
                    ...admin,
                    studentIds: e.target.checked ? [...admin.studentIds, s.id] : admin.studentIds.filter((x) => x !== s.id),
                  })}
                />
                <span className="truncate">{s.number}. {s.firstName} {s.lastName}</span>
              </label>
            ))}
          </div>
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
    </>
  )
}
