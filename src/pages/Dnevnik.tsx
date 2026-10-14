import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import type { Grade, GradeType, Absence, Student } from '../lib/types'
import {
  Badge, Card, EmptyState, Field, GradePill, Icon, Input, Modal, PageHeader,
  SearchInput, Select, Table, Tabs, Textarea, avgFmt, formatDate,
} from '../components/ui'

const DAYS = ['', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък']
const GRADE_TYPES: GradeType[] = [
  'Текуща', 'Контролна работа', 'Класна работа', 'Устно изпитване', 'Практическа',
  'Проект', 'Домашна работа', 'Входно ниво', 'Междинно ниво', 'Изходно ниво',
  'Срочна', 'Годишна', 'Поправителен изпит',
]
const todayISO = () => new Date().toISOString().slice(0, 10)

// ── Модал: добавяне на оценки ────────────────────────────────────────────────
function GradeModal({
  open, onClose, students, subjectId, classId,
}: { open: boolean; onClose: () => void; students: Student[]; subjectId: string; classId: string }) {
  const { addGrades, user } = useApp()
  const [type, setType] = useState<GradeType>('Текуща')
  const [date, setDate] = useState(todayISO())
  const [term, setTerm] = useState<1 | 2>(1)
  const [comment, setComment] = useState('')
  const [draft, setDraft] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})

  const save = () => {
    const rows = Object.entries(values)
      .filter(([, v]) => v.trim() !== '' && !Number.isNaN(parseFloat(v)))
      .map(([studentId, v]) => ({
        studentId, subjectId, classId,
        value: parseFloat(v), type, date, term, comment: comment || undefined,
        teacherId: user!.id, draft,
      }))
    if (!rows.length) return
    addGrades(rows as Omit<Grade, 'id' | 'createdAt'>[])
    setValues({})
    setComment('')
    onClose()
  }

  return (
    <Modal
      open={open} onClose={onClose} wide
      title="Добавяне на оценки"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Отказ</button>
          <button onClick={save} className="btn-primary">Запази</button>
        </>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Field label="Тип">
          <Select value={type} onChange={(e) => setType(e.target.value as GradeType)}>
            {GRADE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Дата">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Срок">
          <Select value={term} onChange={(e) => setTerm(Number(e.target.value) as 1 | 2)}>
            <option value={1}>Първи срок</option>
            <option value={2}>Втори срок</option>
          </Select>
        </Field>
        <Field label="Чернова">
          <Select value={draft ? 'да' : 'не'} onChange={(e) => setDraft(e.target.value === 'да')}>
            <option value="не">Не — видима</option>
            <option value="да">Да — само за мен</option>
          </Select>
        </Field>
      </div>

      <Field label="Коментар (по избор)">
        <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="напр. Отлично представяне" />
      </Field>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">Оценки по ученици</p>
          <button
            onClick={() => {
              const v = prompt('Оценка за целия клас (2–6):')
              if (!v) return
              const next: Record<string, string> = {}
              students.forEach((s) => { next[s.id] = v })
              setValues(next)
            }}
            className="text-[12px] font-semibold text-brand-700 hover:underline"
          >
            Задай на целия клас
          </button>
        </div>
        <div className="max-h-[380px] overflow-y-auto rounded-lg border border-ink-200">
          <table className="w-full">
            <tbody className="divide-y divide-ink-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-ink-50/60">
                  <td className="w-10 px-3 py-1.5 text-[12px] font-bold text-ink-400">{s.number}</td>
                  <td className="px-3 py-1.5 text-sm text-ink-800">
                    {s.firstName} {s.lastName}
                    {s.sen && <Badge tone="purple" className="ml-2">СОП</Badge>}
                  </td>
                  <td className="w-[190px] px-3 py-1.5">
                    <div className="flex items-center gap-1">
                      {[2, 3, 4, 5, 6].map((g) => (
                        <button
                          key={g}
                          onClick={() => setValues((p) => ({ ...p, [s.id]: String(g) }))}
                          className={`h-7 w-7 rounded-md text-[13px] font-bold transition ${
                            values[s.id] === String(g) ? `g${g} ring-2 ring-brand-500/40` : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                      <input
                        value={values[s.id] ?? ''}
                        onChange={(e) => setValues((p) => ({ ...p, [s.id]: e.target.value }))}
                        placeholder="—"
                        className="ml-1 h-7 w-12 rounded-md border border-ink-200 px-1.5 text-center text-[13px] outline-none focus:border-brand-500"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}

// ── Модал: редактиране на оценка ─────────────────────────────────────────────
function EditGradeModal({ grade, onClose }: { grade: Grade | null; onClose: () => void }) {
  const { updateGrade, deleteGrade, subjectName, studentName, userName } = useApp()
  const [value, setValue] = useState(grade?.value ?? 4)
  const [type, setType] = useState<GradeType>(grade?.type ?? 'Текуща')
  const [date, setDate] = useState(grade?.date ?? todayISO())
  const [comment, setComment] = useState(grade?.comment ?? '')
  const [draft, setDraft] = useState(grade?.draft ?? false)

  if (!grade) return null
  return (
    <Modal
      open={!!grade} onClose={onClose} title="Оценка"
      footer={
        <>
          <button
            onClick={() => { deleteGrade(grade.id); onClose() }}
            className="btn-danger mr-auto"
          >
            <Icon name="trash" size={15} /> Изтрий
          </button>
          <button onClick={onClose} className="btn-ghost">Отказ</button>
          <button
            onClick={() => {
              updateGrade(grade.id, { value, type, date, comment: comment || undefined, draft })
              onClose()
            }}
            className="btn-primary"
          >
            Запази
          </button>
        </>
      }
    >
      <div className="mb-4 rounded-lg bg-ink-50 px-4 py-3">
        <p className="text-sm font-semibold text-ink-900">{studentName(grade.studentId)}</p>
        <p className="text-xs text-ink-500">
          {subjectName(grade.subjectId)} · въведена от {userName(grade.teacherId)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Оценка">
          <div className="flex gap-1.5">
            {[2, 3, 4, 5, 6].map((g) => (
              <button
                key={g}
                onClick={() => setValue(g)}
                className={`h-9 flex-1 rounded-lg text-sm font-bold transition ${
                  value === g ? `g${g} ring-2 ring-brand-500/40` : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Тип">
          <Select value={type} onChange={(e) => setType(e.target.value as GradeType)}>
            {GRADE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Дата">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Чернова">
          <Select value={draft ? 'да' : 'не'} onChange={(e) => setDraft(e.target.value === 'да')}>
            <option value="не">Не</option>
            <option value="да">Да</option>
          </Select>
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Коментар">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

// ── Таб: Оценки ──────────────────────────────────────────────────────────────
function GradesTab({ classId, subjectId }: { classId: string; subjectId: string }) {
  const { db, studentsOf, subjectName, userName, user, isAdmin } = useApp()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Grade | null>(null)
  const [showDrafts, setShowDrafts] = useState(false)

  const students = studentsOf(classId)
  const grades = useMemo(
    () => db.grades.filter((g) => g.classId === classId && g.subjectId === subjectId),
    [db.grades, classId, subjectId],
  )

  const byStudent = (sid: string) =>
    grades
      .filter((g) => g.studentId === sid && (showDrafts || !g.draft))
      .sort((a, b) => a.date.localeCompare(b.date))

  const clsAvg = (() => {
    const vals = students.flatMap((s) =>
      byStudent(s.id).filter((g) => !['Входно ниво', 'Междинно ниво', 'Изходно ниво'].includes(g.type)).map((g) => g.value),
    )
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  })()

  const teacher = db.users.find((u) => u.subjectIds?.includes(subjectId) && (isAdmin || u.id === user?.id))
    ?? db.users.find((u) => u.subjectIds?.includes(subjectId))

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Icon name="plus" size={15} /> Добави
        </button>
        <button onClick={() => window.print()} className="btn-ghost">
          <Icon name="print" size={15} /> Принтирай
        </button>
        <label className="ml-1 flex items-center gap-2 text-[13px] text-ink-600">
          <input type="checkbox" checked={showDrafts} onChange={(e) => setShowDrafts(e.target.checked)} className="h-4 w-4 rounded" />
          Покажи черновите
        </label>
        <div className="ml-auto flex items-center gap-3 text-[13px] text-ink-500">
          <span>{students.length} ученика</span>
          <span className="h-4 w-px bg-ink-200" />
          <span>Среден успех на класа: <b className="text-ink-800">{avgFmt(clsAvg)}</b></span>
        </div>
      </div>

      {!teacher && (
        <div className="mb-3">
          <Badge tone="warn">Няма назначен учител по този предмет в паралелката</Badge>
        </div>
      )}

      <Table
        head={
          <>
            <th className="th w-12">№</th>
            <th className="th">Ученик</th>
            <th className="th">Оценки</th>
            <th className="th w-24">Среден</th>
          </>
        }
      >
        {students.map((s) => {
          const gs = byStudent(s.id)
          const real = gs.filter((g) => !['Входно ниво', 'Междинно ниво', 'Изходно ниво'].includes(g.type))
          const avg = real.length ? real.reduce((a, g) => a + g.value, 0) / real.length : null
          return (
            <tr key={s.id} className="hover:bg-ink-50/60">
              <td className="td font-bold text-ink-400">{s.number}</td>
              <td className="td">
                <span className="font-medium">{s.firstName} {s.lastName}</span>
                {s.sen && <Badge tone="purple" className="ml-2">СОП</Badge>}
                {s.status !== 'активен' && <Badge tone="danger" className="ml-2">{s.status}</Badge>}
              </td>
              <td className="td">
                <div className="flex flex-wrap items-center gap-1">
                  {gs.map((g) => (
                    <button key={g.id} onClick={() => setEdit(g)} title={`${g.type} · ${formatDate(g.date)}${g.draft ? ' · чернова' : ''}`}>
                      <span className={g.draft ? 'opacity-50' : ''}>
                        <GradePill value={g.value} />
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => setOpen(true)}
                    className="grid h-7 w-7 place-items-center rounded-md border border-dashed border-ink-300 text-ink-400 hover:border-brand-400 hover:text-brand-600"
                  >
                    <Icon name="plus" size={13} />
                  </button>
                </div>
              </td>
              <td className="td font-bold text-ink-800">{avgFmt(avg)}</td>
            </tr>
          )
        })}
      </Table>

      <GradeModal open={open} onClose={() => setOpen(false)} students={students} subjectId={subjectId} classId={classId} />
      <EditGradeModal grade={edit} onClose={() => setEdit(null)} />
    </>
  )
}

// ── Таб: Отсъствия ───────────────────────────────────────────────────────────
function AbsencesTab({ classId, subjectId }: { classId: string; subjectId: string }) {
  const { db, studentsOf, setAbsenceReason, deleteAbsence, addAbsences, user, subjectName } = useApp()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'всички' | 'неизвинени' | 'извинени'>('всички')
  const [q, setQ] = useState('')
  const [form, setForm] = useState({ date: todayISO(), period: 1, reason: 'неизвинено' as Absence['reason'], note: '', selected: {} as Record<string, boolean> })

  const students = studentsOf(classId)
  const all = db.absences.filter((a) => a.classId === classId)
  const rows = all
    .filter((a) => (filter === 'всички' ? true : filter === 'извинени' ? a.excused : !a.excused))
    .sort((a, b) => b.date.localeCompare(a.date))

  const counts = (sid: string) => {
    const list = all.filter((a) => a.studentId === sid)
    return { total: list.length, unexcused: list.filter((a) => !a.excused).length }
  }

  const save = () => {
    const chosen = Object.entries(form.selected).filter(([, v]) => v).map(([k]) => k)
    if (!chosen.length) return
    addAbsences(
      chosen.map((sid) => ({
        studentId: sid, classId, date: form.date, period: form.period, subjectId,
        reason: form.reason, excused: form.reason === 'извинено' || form.reason === 'семейни причини',
        note: form.note || undefined, teacherId: user!.id,
      })),
    )
    setForm({ ...form, selected: {}, note: '' })
    setOpen(false)
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Отбележи отсъствие</button>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="w-auto">
          <option value="всички">Всички отсъствия</option>
          <option value="неизвинени">Само неизвинени</option>
          <option value="извинени">Само извинени</option>
        </Select>
        <SearchInput value={q} onChange={setQ} placeholder="Търсене по ученик…" />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Card className="!p-3.5"><p className="text-[11px] font-semibold uppercase text-ink-500">Общо отсъствия</p><p className="text-xl font-bold text-ink-900">{all.length}</p></Card>
        <Card className="!p-3.5"><p className="text-[11px] font-semibold uppercase text-ink-500">Неизвинени</p><p className="text-xl font-bold text-danger">{all.filter((a) => !a.excused).length}</p></Card>
        <Card className="!p-3.5"><p className="text-[11px] font-semibold uppercase text-ink-500">Извинени</p><p className="text-xl font-bold text-ok">{all.filter((a) => a.excused).length}</p></Card>
        <Card className="!p-3.5"><p className="text-[11px] font-semibold uppercase text-ink-500">Средно на ученик</p><p className="text-xl font-bold text-ink-900">{(all.length / Math.max(1, students.length)).toFixed(1)}</p></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Table
          head={<><th className="th w-12">№</th><th className="th">Ученик</th><th className="th w-20">Общо</th><th className="th w-24">Неизв.</th></>}
        >
          {students
            .filter((s) => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q.toLowerCase()))
            .map((s) => {
              const c = counts(s.id)
              return (
                <tr key={s.id} className="hover:bg-ink-50/60">
                  <td className="td font-bold text-ink-400">{s.number}</td>
                  <td className="td font-medium">{s.firstName} {s.lastName}</td>
                  <td className="td">{c.total}</td>
                  <td className="td">
                    {c.unexcused > 0 ? <Badge tone="danger">{c.unexcused}</Badge> : <span className="text-ink-400">0</span>}
                  </td>
                </tr>
              )
            })}
        </Table>

        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-500">
            Регистър ({rows.length})
          </p>
          <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
            {rows.slice(0, 120).map((a) => {
              const s = db.students.find((x) => x.id === a.studentId)
              return (
                <div key={a.id} className="flex items-center gap-2.5 rounded-lg border border-ink-200 bg-white px-3 py-2">
                  <span className="w-14 shrink-0 text-[11px] text-ink-500">{formatDate(a.date)}</span>
                  <span className="w-9 shrink-0 text-[11px] font-semibold text-ink-400">{a.period} ч.</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink-800">{s?.firstName} {s?.lastName}</p>
                    <p className="truncate text-[11px] text-ink-500">{subjectName(a.subjectId)}{a.note ? ` · ${a.note}` : ''}</p>
                  </div>
                  <button
                    onClick={() => setAbsenceReason(a.id, a.excused ? 'неизвинено' : 'извинено', !a.excused)}
                    className={`chip shrink-0 ${a.excused ? 'bg-[#e6f4ea] text-[#1f7a45]' : 'bg-[#fde8e8] text-[#b42318]'}`}
                    title="Превключи извинено / неизвинено"
                  >
                    {a.excused ? 'извинено' : 'неизвинено'}
                  </button>
                  <button onClick={() => deleteAbsence(a.id)} className="shrink-0 text-ink-300 hover:text-danger">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              )
            })}
            {rows.length === 0 && <EmptyState title="Няма отсъствия" text="За избраните филтри няма записи." icon="clock" />}
          </div>
        </div>
      </div>

      <Modal
        open={open} onClose={() => setOpen(false)} wide title="Отбелязване на отсъствие"
        footer={<><button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button><button onClick={save} className="btn-primary">Запази</button></>}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          <Field label="Дата"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Час №">
            <Select value={form.period} onChange={(e) => setForm({ ...form, period: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6, 7].map((p) => <option key={p} value={p}>{p} час</option>)}
            </Select>
          </Field>
          <Field label="Причина">
            <Select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value as Absence['reason'] })}>
              <option value="неизвинено">Неизвинено</option>
              <option value="извинено">Извинено (медицинска бележка)</option>
              <option value="семейни причини">Семейни причини</option>
              <option value="закъснение">Закъснение</option>
            </Select>
          </Field>
          <Field label="Бележка"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="№ на бележка" /></Field>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">Изберете ученици</p>
          <div className="flex gap-2 text-[12px] font-semibold">
            <button
              onClick={() => {
                const allSel: Record<string, boolean> = {}
                students.forEach((s) => { allSel[s.id] = true })
                setForm({ ...form, selected: allSel })
              }}
              className="text-brand-700 hover:underline"
            >
              Маркирай всички
            </button>
            <button onClick={() => setForm({ ...form, selected: {} })} className="text-ink-500 hover:underline">Изчисти</button>
          </div>
        </div>
        <div className="grid max-h-[300px] grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-ink-200 p-2.5 sm:grid-cols-3">
          {students.map((s) => (
            <label key={s.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-ink-50">
              <input
                type="checkbox"
                checked={!!form.selected[s.id]}
                onChange={(e) => setForm({ ...form, selected: { ...form.selected, [s.id]: e.target.checked } })}
                className="h-4 w-4 rounded"
              />
              <span className="truncate">{s.number}. {s.firstName} {s.lastName}</span>
            </label>
          ))}
        </div>
      </Modal>
    </>
  )
}

// ── Таб: Разписание ──────────────────────────────────────────────────────────
function ScheduleTab({ classId }: { classId: string }) {
  const { db, subjectShort, subjectName, className } = useApp()
  const rows = db.schedule.filter((s) => s.classId === classId)
  const maxPeriod = Math.max(7, ...rows.map((r) => r.period))

  return (
    <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
      <table className="w-full border-collapse">
        <thead className="bg-ink-50">
          <tr>
            <th className="th w-16">Час</th>
            {DAYS.slice(1).map((d) => <th key={d} className="th">{d}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((p) => (
            <tr key={p}>
              <td className="td bg-ink-50/60 text-center font-bold text-ink-500">{p}</td>
              {DAYS.slice(1).map((_, di) => {
                const e = rows.find((r) => r.day === di + 1 && r.period === p)
                return (
                  <td key={di} className="td align-top">
                    {e ? (
                      <div className="rounded-lg border border-ink-200 px-2.5 py-1.5">
                        <p className="text-[13px] font-semibold text-ink-900">{subjectShort(e.subjectId)}</p>
                        <p className="truncate text-[11px] text-ink-500">{subjectName(e.subjectId)}</p>
                        <p className="mt-0.5 truncate text-[11px] text-ink-400">
                          {db.users.find((u) => u.id === e.teacherId)?.lastName}
                          {e.roomId ? ` · ${db.rooms.find((r) => r.id === e.roomId)?.name}` : ''}
                        </p>
                        {e.tag && <Badge tone="purple" className="mt-1">{e.tag}</Badge>}
                      </div>
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Таб: Ученици ─────────────────────────────────────────────────────────────
function StudentsTab({ classId }: { classId: string }) {
  const { db, studentsOf, average, unexcusedCount, updateStudent, addStudent, className } = useApp()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Student | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [ns, setNs] = useState({ firstName: '', lastName: '', middleName: '', number: 1, gender: 'М' as 'М' | 'Ж', birthDate: '2012-01-01' })

  const students = studentsOf(classId).filter((s) =>
    `${s.firstName} ${s.middleName} ${s.lastName}`.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Търсене на ученик…" />
        <button onClick={() => setAddOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Нов ученик</button>
      </div>

      <Table
        head={
          <>
            <th className="th w-12">№</th>
            <th className="th">Име</th>
            <th className="th">ЕГН</th>
            <th className="th">Родител</th>
            <th className="th w-20">Успех</th>
            <th className="th w-24">Неизв.</th>
            <th className="th w-32">Статус</th>
            <th className="th w-16"></th>
          </>
        }
      >
        {students.map((s) => {
          const parent = db.users.find((u) => s.parentIds.includes(u.id) && u.roles.includes('parent'))
          return (
            <tr key={s.id} className="hover:bg-ink-50/60">
              <td className="td font-bold text-ink-400">{s.number}</td>
              <td className="td">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.firstName} {s.middleName} {s.lastName}</span>
                  {s.sen && <Badge tone="purple">СОП</Badge>}
                  {s.ifo && <Badge tone="brand">ИФО</Badge>}
                  {s.cdo && <Badge tone="neutral">ЦДО</Badge>}
                </div>
              </td>
              <td className="td font-mono text-[12px] text-ink-500">{s.egn}</td>
              <td className="td text-[13px]">{parent ? `${parent.firstName} ${parent.lastName}` : <span className="text-ink-400">няма</span>}</td>
              <td className="td font-bold">{avgFmt(average(s.id))}</td>
              <td className="td">{unexcusedCount(s.id) > 0 ? <Badge tone="danger">{unexcusedCount(s.id)}</Badge> : '0'}</td>
              <td className="td"><Badge tone={s.status === 'активен' ? 'ok' : 'danger'}>{s.status}</Badge></td>
              <td className="td">
                <button onClick={() => setEdit(s)} className="text-ink-400 hover:text-brand-700"><Icon name="edit" size={15} /></button>
              </td>
            </tr>
          )
        })}
      </Table>

      <Modal
        open={!!edit} onClose={() => setEdit(null)} title="Профил на ученик"
        footer={<><button onClick={() => setEdit(null)} className="btn-ghost">Затвори</button><button onClick={() => setEdit(null)} className="btn-primary">Готово</button></>}
      >
        {edit && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Име"><Input defaultValue={edit.firstName} onBlur={(e) => updateStudent(edit.id, { firstName: e.target.value })} /></Field>
            <Field label="Фамилия"><Input defaultValue={edit.lastName} onBlur={(e) => updateStudent(edit.id, { lastName: e.target.value })} /></Field>
            <Field label="Пореден номер"><Input type="number" defaultValue={edit.number} onBlur={(e) => updateStudent(edit.id, { number: Number(e.target.value) })} /></Field>
            <Field label="Дата на раждане"><Input type="date" defaultValue={edit.birthDate} onBlur={(e) => updateStudent(edit.id, { birthDate: e.target.value })} /></Field>
            <Field label="Телефон"><Input defaultValue={edit.phone} onBlur={(e) => updateStudent(edit.id, { phone: e.target.value })} /></Field>
            <Field label="Личен лекар"><Input defaultValue={edit.doctor} onBlur={(e) => updateStudent(edit.id, { doctor: e.target.value })} /></Field>
            <Field label="Статус">
              <Select defaultValue={edit.status} onChange={(e) => updateStudent(edit.id, { status: e.target.value as Student['status'] })}>
                <option>активен</option><option>преместен</option><option>отписан</option><option>завършил</option>
              </Select>
            </Field>
            <Field label="СОП">
              <Select defaultValue={edit.sen ? 'да' : 'не'} onChange={(e) => updateStudent(edit.id, { sen: e.target.value === 'да' })}>
                <option value="не">Не</option><option value="да">Да</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Адрес"><Input defaultValue={edit.address} onBlur={(e) => updateStudent(edit.id, { address: e.target.value })} /></Field>
            </div>
            {edit.senNote && (
              <div className="sm:col-span-2">
                <Field label="Бележка СОП"><Input defaultValue={edit.senNote} onBlur={(e) => updateStudent(edit.id, { senNote: e.target.value })} /></Field>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={addOpen} onClose={() => setAddOpen(false)} title="Нов ученик"
        footer={
          <>
            <button onClick={() => setAddOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                addStudent({
                  ...ns, egn: '', classId, address: '', phone: '', email: '',
                  status: 'активен', sen: false, admittedAt: todayISO(),
                } as Omit<Student, 'id' | 'parentIds'>)
                setAddOpen(false)
              }}
              className="btn-primary"
            >
              Добави
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Име"><Input value={ns.firstName} onChange={(e) => setNs({ ...ns, firstName: e.target.value })} /></Field>
          <Field label="Презиме"><Input value={ns.middleName} onChange={(e) => setNs({ ...ns, middleName: e.target.value })} /></Field>
          <Field label="Фамилия"><Input value={ns.lastName} onChange={(e) => setNs({ ...ns, lastName: e.target.value })} /></Field>
          <Field label="Пореден номер"><Input type="number" value={ns.number} onChange={(e) => setNs({ ...ns, number: Number(e.target.value) })} /></Field>
          <Field label="Пол">
            <Select value={ns.gender} onChange={(e) => setNs({ ...ns, gender: e.target.value as 'М' | 'Ж' })}>
              <option value="М">Момче</option><option value="Ж">Момиче</option>
            </Select>
          </Field>
          <Field label="Дата на раждане"><Input type="date" value={ns.birthDate} onChange={(e) => setNs({ ...ns, birthDate: e.target.value })} /></Field>
        </div>
        <p className="mt-3 text-xs text-ink-400">Ученикът ще бъде добавен в {className(classId)}.</p>
      </Modal>
    </>
  )
}

// ── Таб: Домашни и контролни ─────────────────────────────────────────────────
function HomeworkTab({ classId }: { classId: string }) {
  const { db, subjectName, subjectShort, userName } = useApp()
  const hw = db.homework.filter((h) => h.classId === classId).sort((a, b) => b.date.localeCompare(a.date))
  const exams = db.exams.filter((e) => e.classId === classId).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card pad={false}>
        <div className="border-b border-ink-200 px-5 py-3.5"><h2 className="font-bold text-ink-900">Домашни работи</h2></div>
        <ul className="divide-y divide-ink-100">
          {hw.map((h) => (
            <li key={h.id} className="px-5 py-3">
              <div className="flex items-center gap-2">
                <Badge tone="brand">{subjectShort(h.subjectId)}</Badge>
                <span className="text-[11px] text-ink-400">{formatDate(h.date)}</span>
                <span className="ml-auto text-[11px] text-ink-500">{userName(h.teacherId)}</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-snug text-ink-700">{h.text}</p>
            </li>
          ))}
          {hw.length === 0 && <li className="p-5"><EmptyState title="Няма домашни работи" icon="task" /></li>}
        </ul>
      </Card>

      <Card pad={false}>
        <div className="border-b border-ink-200 px-5 py-3.5"><h2 className="font-bold text-ink-900">График на контролните и класните работи</h2></div>
        <ul className="divide-y divide-ink-100">
          {exams.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-5 py-3">
              <span className="grid h-10 w-12 shrink-0 place-items-center rounded-lg bg-[#fdf0e3] text-[11px] font-bold leading-tight text-[#b25e09]">
                {formatDate(e.date).slice(0, 5)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink-800">{subjectName(e.subjectId)}</p>
                <p className="truncate text-[11px] text-ink-500">{e.topic} · {e.period} час · {userName(e.teacherId)}</p>
              </div>
              <Badge tone="warn">{e.kind}</Badge>
            </li>
          ))}
          {exams.length === 0 && <li className="p-5"><EmptyState title="Няма насрочени работи" icon="calendar" /></li>}
        </ul>
      </Card>
    </div>
  )
}

// ── Таб: Отзиви ──────────────────────────────────────────────────────────────
function NotesTab({ classId }: { classId: string }) {
  const { db, studentsOf, addNote, deleteNote, user } = useApp()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ studentId: '', kind: 'Отзив' as const, text: '', badge: '' })

  const students = studentsOf(classId)
  const notes = db.notes.filter((n) => n.classId === classId).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <div className="mb-3">
        <button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Нов отзив</button>
      </div>

      <Table head={<><th className="th">Ученик</th><th className="th">Текст</th><th className="th w-32">Вид</th><th className="th w-28">Дата</th><th className="th w-12"></th></>}>
        {notes.map((n) => {
          const s = db.students.find((x) => x.id === n.studentId)
          return (
            <tr key={n.id} className="hover:bg-ink-50/60">
              <td className="td font-medium">{s?.firstName} {s?.lastName}</td>
              <td className="td">{n.badge && <span className="mr-1.5">{n.badge}</span>}{n.text}</td>
              <td className="td"><Badge tone={n.kind === 'Забележка' ? 'danger' : n.kind === 'Похвала' ? 'ok' : 'neutral'}>{n.kind}</Badge></td>
              <td className="td text-[12px] text-ink-500">{formatDate(n.date)}</td>
              <td className="td"><button onClick={() => deleteNote(n.id)} className="text-ink-300 hover:text-danger"><Icon name="trash" size={14} /></button></td>
            </tr>
          )
        })}
      </Table>
      {notes.length === 0 && <EmptyState title="Няма отзиви" text="Все още не са добавени отзиви за тази паралелка." icon="spark" />}

      <Modal
        open={open} onClose={() => setOpen(false)} title="Нов отзив"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!form.studentId || !form.text) return
                addNote({ ...form, classId, teacherId: user!.id, date: todayISO(), visibleToParent: true })
                setForm({ studentId: '', kind: 'Отзив', text: '', badge: '' })
                setOpen(false)
              }}
              className="btn-primary"
            >
              Запази
            </button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="Ученик">
            <Select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
              <option value="">— изберете —</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.firstName} {s.lastName}</option>)}
            </Select>
          </Field>
          <Field label="Вид">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as typeof form.kind })}>
              <option>Отзив</option><option>Похвала</option><option>Забележка</option><option>Други</option>
            </Select>
          </Field>
          <Field label="Значка (по избор)" hint="напр. 🌟 🏅 👏">
            <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} maxLength={4} />
          </Field>
          <Field label="Текст">
            <Textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  )
}

// ── Основен компонент ────────────────────────────────────────────────────────
export default function Dnevnik() {
  const { db, myClasses, mySubjects, isAdmin, user, className } = useApp()

  // Състоянието живее в адреса, за да могат връзките от страничното меню
  // да водят направо до паралелка/разписание: /dnevnik?tab=schedule&class=cls_3
  const [params, setParams] = useSearchParams()
  const setView = (next: { tab?: string; klass?: string; subject?: string }) => {
    const p = new URLSearchParams(params)
    if (next.tab !== undefined) { if (next.tab) p.set('tab', next.tab); else p.delete('tab') }
    if (next.klass !== undefined) { if (next.klass) p.set('class', next.klass); else p.delete('class') }
    if (next.subject !== undefined) { if (next.subject) p.set('subject', next.subject); else p.delete('subject') }
    setParams(p, { replace: true })
  }

  const requested = params.get('class') ?? ''
  const classId = myClasses.some((c) => c.id === requested) ? requested : (myClasses[0]?.id ?? '')
  const tab = params.get('tab') ?? 'grades'
  const subjectId = params.get('subject') ?? ''

  const klass = db.classes.find((c) => c.id === classId)
  const classSubjects = useMemo(
    () => (klass ? db.subjects.filter((s) => klass.subjectIds.includes(s.id)) : []),
    [klass, db.subjects],
  )
  const activeSubject = subjectId || classSubjects[0]?.id || ''

  if (!myClasses.length) {
    return <EmptyState title="Няма достъпни паралелки" text="За вашия профил не са назначени паралелки." icon="grid" />
  }

  const isFamily = user?.roles.includes('parent') || user?.roles.includes('student')

  return (
    <>
      <PageHeader
        title="Дневник"
        subtitle="Оценки, отсъствия, разписание, домашни работи и отзиви по паралелки."
        icon="book"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={classId} onChange={(e) => setView({ klass: e.target.value, subject: '' })} className="w-auto min-w-[130px]">
              {myClasses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.profile ? ` — ${c.profile}` : ''}</option>
              ))}
            </Select>
          </div>
        }
      />

      {klass && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-ink-500">
          <Badge tone="brand">{className(klass.id)}</Badge>
          <span>{klass.studentIds.length} ученика</span>
          <span className="h-4 w-px bg-ink-200" />
          <span>Класен ръководител: <b className="text-ink-700">{db.users.find((u) => u.id === klass.homeroomTeacherId)?.firstName} {db.users.find((u) => u.id === klass.homeroomTeacherId)?.lastName}</b></span>
          {klass.profile && <><span className="h-4 w-px bg-ink-200" /><span>Профил: <b className="text-ink-700">{klass.profile}</b></span></>}
          <span className="h-4 w-px bg-ink-200" />
          <span>Смяна: <b className="text-ink-700">{klass.shift}</b></span>
        </div>
      )}

      <Tabs
        tabs={[
          { id: 'grades', label: 'Оценки' },
          { id: 'absences', label: 'Отсъствия' },
          { id: 'schedule', label: 'Разписание' },
          { id: 'homework', label: 'Домашни и контролни' },
          { id: 'notes', label: 'Отзиви' },
          { id: 'students', label: 'Ученици', count: klass?.studentIds.length },
        ]}
        active={tab}
        onChange={(t) => setView({ tab: t })}
      />

      {tab === 'grades' && (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {classSubjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setView({ subject: s.id })}
                className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition ${
                  activeSubject === s.id
                    ? 'border-brand-500 bg-brand-50 text-brand-800'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
          {activeSubject ? (
            <GradesTab classId={classId} subjectId={activeSubject} />
          ) : (
            <EmptyState title="Няма предмети" text="За тази паралелка не са зададени предмети." icon="list" />
          )}
        </>
      )}

      {tab === 'absences' && <AbsencesTab classId={classId} subjectId={activeSubject} />}
      {tab === 'schedule' && <ScheduleTab classId={classId} />}
      {tab === 'homework' && <HomeworkTab classId={classId} />}
      {tab === 'notes' && <NotesTab classId={classId} />}
      {tab === 'students' && <StudentsTab classId={classId} />}

      {isFamily && (
        <div className="mt-5">
          <Badge tone="neutral">Режим на четене — като родител/ученик виждате само данните на своето дете</Badge>
        </div>
      )}
    </>
  )
}
