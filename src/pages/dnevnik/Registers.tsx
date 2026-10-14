import { useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Field, Icon, Input, Modal, Select, Textarea } from '../../components/ui'
import {
  DnTable, EmptyRow, FilterButton, LastEdited, RowActions, StudentCell, TB, Th, Toolbar,
  dateOnly, formatDateTime, nowLocal, periodTime,
} from './shared'

/**
 * Разделите „Контролни", „Родителски срещи", „Ученическа подкрепа", „ВЧК",
 * „Бележки" и „Санкции" имат една и съща логика: лента с „+Добави", таблица с
 * „Операции" (редакция и изтриване) и празно състояние „Все още не са
 * въвеждани …". Тук са събрани на едно място.
 */

interface RegisterProps {
  head: React.ReactNode
  children: React.ReactNode
  colSpan: number
  empty: string
  onAdd?: () => void
  addLabel?: string
  addTone?: 'teal' | 'blue' | 'purple'
  extra?: React.ReactNode
  minWidth?: number
  last?: { when: string; who: string } | false
}

export function Register({
  head, children, colSpan, empty, onAdd, addLabel = 'Добави', addTone = 'teal',
  extra, minWidth, last,
}: RegisterProps) {
  const rows = Array.isArray(children) ? children : [children]
  const isEmpty = rows.filter(Boolean).length === 0
  return (
    <>
      <Toolbar>
        {onAdd && <TB icon="plus" tone={addTone} onClick={onAdd}>{addLabel}</TB>}
        {extra}
        <FilterButton />
      </Toolbar>
      <DnTable head={head} minWidth={minWidth}>
        {isEmpty ? <EmptyRow colSpan={colSpan} text={empty} /> : children}
      </DnTable>
      {last && <LastEdited when={last.when} who={last.who} />}
    </>
  )
}

// ── Контролни работи ────────────────────────────────────────────────────────
export function ExamsTab({ classId }: { classId: string }) {
  const { db, user, isStaff, subjectName, userName, addExam, deleteExam } = useApp()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    subjectId: '', date: nowLocal().slice(0, 10), period: 1,
    kind: 'Контролна работа' as const, topic: '',
  })
  const klass = db.classes.find((c) => c.id === classId)
  const subjects = db.subjects.filter((s) => klass?.subjectIds.includes(s.id))

  const rows = db.exams
    .filter((e) => e.classId === classId)
    .sort((a, b) => b.date.localeCompare(a.date))

  const lastRow = rows[0]

  return (
    <>
      <Register
        onAdd={isStaff ? () => { setForm({ ...form, subjectId: subjects[0]?.id ?? '' }); setOpen(true) } : undefined}
        empty="Все още не са въвеждани контролни работи."
        colSpan={6}
        minWidth={900}
        last={lastRow && {
          when: lastRow.createdAt ?? dateOnly(lastRow.date),
          who: userName(lastRow.createdById ?? lastRow.teacherId),
        }}
        head={
          <>
            <Th className="w-[290px]">Контролна работа</Th>
            <Th className="w-[150px]">Начало</Th>
            <Th className="w-[150px]">Край</Th>
            <Th className="w-[170px]">Добавена от</Th>
            <Th className="w-[150px]">Добавена на</Th>
            <Th className="w-[90px]">Операции</Th>
          </>
        }
      >
        {rows.map((e) => {
          const [from, to] = periodTime(e.period, klass?.shift ?? 1)
          return (
            <tr key={e.id} className="hover:bg-[#f7fbfd]">
              <td className="px-3 py-2 text-[12.5px]">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="clipboard" size={14} className="shrink-0 text-[#3598dc]" strokeWidth={2} />
                  <span className="text-[#2b6ca3]">{e.kind} по {subjectName(e.subjectId)} - {userName(e.teacherId)}</span>
                </span>
              </td>
              <td className="px-3 py-2 text-[12.5px] text-ink-700">{dateOnly(e.date)} {from}</td>
              <td className="px-3 py-2 text-[12.5px] text-ink-700">{dateOnly(e.date)} {to}</td>
              <td className="px-3 py-2 text-[12.5px]"><StudentLike name={userName(e.createdById ?? e.teacherId)} /></td>
              <td className="px-3 py-2 text-[12.5px] text-ink-700">{e.createdAt ?? dateOnly(e.date)}</td>
              <td className="px-3 py-2">
                {isStaff && (
                  <RowActions
                    onEdit={() => setOpen(true)}
                    onDelete={() => { if (window.confirm('Да се изтрие ли контролната работа?')) deleteExam(e.id) }}
                  />
                )}
              </td>
            </tr>
          )
        })}
      </Register>

      <Modal
        open={open} onClose={() => setOpen(false)} title="Нова контролна работа"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              className="btn-primary"
              onClick={() => {
                if (!form.subjectId) return
                addExam({
                  classId, subjectId: form.subjectId, teacherId: user!.id,
                  date: form.date, period: form.period, kind: form.kind,
                  topic: form.topic || `${form.kind} по ${subjectName(form.subjectId)}`,
                  createdById: user!.id,
                  createdAt: `${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 5)}`,
                })
                setOpen(false)
              }}
            >
              Запази
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Предмет">
            <Select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">— изберете —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Вид">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as typeof form.kind })}>
              <option>Контролна работа</option><option>Класна работа</option><option>Тест</option><option>Диктовка</option>
            </Select>
          </Field>
          <Field label="Дата"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Час №">
            <Select value={form.period} onChange={(e) => setForm({ ...form, period: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6, 7].map((p) => <option key={p} value={p}>{p} час</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Тема"><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></Field>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-400">Ще бъде добавена от {user?.firstName} {user?.lastName}.</p>
      </Modal>
    </>
  )
}

/** Малка икона „човек" пред име — както е в колоните „Добавена от". */
function StudentLike({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon name="person" size={13} className="shrink-0 text-[#3598dc]" strokeWidth={2} />
      <span className="text-[#2b6ca3]">{name}</span>
    </span>
  )
}

// ── Родителски срещи ────────────────────────────────────────────────────────
export function MeetingsTab({ classId }: { classId: string }) {
  const { db, isStaff, addClassMeeting, deleteClassMeeting, userName } = useApp()
  const [open, setOpen] = useState(false)
  const klass = db.classes.find((c) => c.id === classId)
  const [form, setForm] = useState({ title: '', from: nowLocal(), to: nowLocal() })

  const rows = db.classMeetings
    .filter((m) => m.classId === classId)
    .sort((a, b) => b.from.localeCompare(a.from))

  return (
    <>
      <Register

        onAdd={isStaff ? () => { setForm({ title: `Родителска среща в ${klass?.name ?? ''}`, from: nowLocal(), to: nowLocal() }); setOpen(true) } : undefined}
        empty="Все още не са въвеждани родителски срещи."
        colSpan={6}
        minWidth={860}
        head={
          <>
            <Th className="w-[300px]">Родителска среща</Th>
            <Th className="w-[170px]">Начало</Th>
            <Th className="w-[170px]">Край</Th>
            <Th className="w-[180px]">Добавена от</Th>
            <Th className="w-[150px]">Добавена на</Th>
            <Th className="w-[90px]">Операции</Th>
          </>
        }
      >
        {rows.map((m) => (
          <tr key={m.id} className="hover:bg-[#f7fbfd]">
            <td className="px-3 py-2 text-[12.5px]">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="calendar" size={14} className="shrink-0 text-[#3598dc]" strokeWidth={2} />
                <span className="text-[#2b6ca3]">{m.title}</span>
              </span>
            </td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{formatDateTime(m.from)}</td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{formatDateTime(m.to)}</td>
            <td className="px-3 py-2 text-[12.5px]"><StudentLike name={userName(m.authorId)} /></td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{formatDateTime(m.createdAt)}</td>
            <td className="px-3 py-2">
              {isStaff && (
                <RowActions
                  onEdit={() => setOpen(true)}
                  onDelete={() => { if (window.confirm('Да се изтрие ли срещата?')) deleteClassMeeting(m.id) }}
                />
              )}
            </td>
          </tr>
        ))}
      </Register>

      <Modal
        open={open} onClose={() => setOpen(false)} title="Нова родителска среща"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              className="btn-primary"
              onClick={() => {
                if (!form.title) return
                addClassMeeting({ classId, title: form.title, from: form.from, to: form.to })
                setOpen(false)
              }}
            >
              Запази
            </button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="Заглавие"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Начало"><Input type="datetime-local" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></Field>
            <Field label="Край"><Input type="datetime-local" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></Field>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ── Ученическа подкрепа ─────────────────────────────────────────────────────
const SUPPORT_ACTIVITIES = [
  'Допълнителна консултация по български език',
  'Допълнителна консултация по математика',
  'Логопедична терапия',
  'Психологическа подкрепа',
  'Ресурсно подпомагане',
  'Социални умения — групова работа',
]
const SUPPORT_GROUNDS = [
  'Оценка на индивидуалните потребности',
  'Заключение от ЕПЛР',
  'Решение на координационния съвет',
  'Заявка от родител',
]

export function SupportTab({ classId }: { classId: string }) {
  const { db, isStaff, addSupportPlan, deleteSupportPlan, userName, studentName, studentsOf } = useApp()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    studentId: '', activity: SUPPORT_ACTIVITIES[0], date: nowLocal().slice(0, 10),
    ground: SUPPORT_GROUNDS[0], team: [] as string[],
  })

  const students = studentsOf(classId)
  const staff = db.users.filter((u) =>
    u.roles.some((r) => ['resource_teacher', 'psychologist', 'speech_therapist', 'teacher', 'class_teacher', 'educator'].includes(r)),
  )
  const rows = db.supportPlans
    .filter((s) => s.classId === classId)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <Register

        onAdd={isStaff ? () => { setForm({ ...form, studentId: students[0]?.id ?? '', team: [] }); setOpen(true) } : undefined}
        empty="Все още не е въвеждана ученическа подкрепа."
        colSpan={6}
        minWidth={900}
        head={
          <>
            <Th className="w-[270px]">Помощни дейности</Th>
            <Th className="w-[120px]">Дата</Th>
            <Th className="w-[230px]">Основание</Th>
            <Th className="w-[240px]">Участници</Th>
            <Th className="w-[160px]">Въведена от</Th>
            <Th className="w-[90px]">Операции</Th>
          </>
        }
      >
        {rows.map((s) => (
          <tr key={s.id} className="hover:bg-[#f7fbfd]">
            <td className="px-3 py-2 text-[12.5px]">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="heart" size={14} className="shrink-0 text-[#e7505a]" strokeWidth={2} />
                <span className="text-[#2b6ca3]">{s.activity}</span>
              </span>
              <p className="mt-0.5 pl-5 text-[11px] text-ink-500">{studentName(s.studentId)}</p>
            </td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{dateOnly(s.date)}</td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{s.ground}</td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">
              {s.participantIds.length ? s.participantIds.map((id) => userName(id)).join(', ') : '—'}
            </td>
            <td className="px-3 py-2 text-[12.5px]"><StudentLike name={userName(s.authorId)} /></td>
            <td className="px-3 py-2">
              {isStaff && <RowActions onEdit={() => setOpen(true)} onDelete={() => deleteSupportPlan(s.id)} />}
            </td>
          </tr>
        ))}
      </Register>

      <Modal
        open={open} onClose={() => setOpen(false)} wide title="Ученическа подкрепа"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              className="btn-primary"
              onClick={() => {
                if (!form.studentId || !form.activity) return
                addSupportPlan({
                  classId, studentId: form.studentId, activity: form.activity,
                  date: form.date, ground: form.ground, participantIds: form.team,
                  authorId: db.users.find((u) => u.roles.includes('class_teacher') || u.roles.includes('teacher'))?.id ?? '',
                })
                setOpen(false)
              }}
            >
              Запази
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ученик">
            <Select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
              <option value="">— изберете —</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.firstName} {s.lastName}</option>)}
            </Select>
          </Field>
          <Field label="Дата"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Помощна дейност">
            <Select value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })}>
              {SUPPORT_ACTIVITIES.map((a) => <option key={a}>{a}</option>)}
            </Select>
          </Field>
          <Field label="Основание">
            <Select value={form.ground} onChange={(e) => setForm({ ...form, ground: e.target.value })}>
              {SUPPORT_GROUNDS.map((g) => <option key={g}>{g}</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          <p className="label">Екип, който работи с ученика</p>
          <div className="grid max-h-[220px] grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-ink-200 p-2.5">
            {staff.map((u) => (
              <label key={u.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-[12.5px] hover:bg-ink-50">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  checked={form.team.includes(u.id)}
                  onChange={(e) => setForm({
                    ...form,
                    team: e.target.checked ? [...form.team, u.id] : form.team.filter((x) => x !== u.id),
                  })}
                />
                <span className="truncate">{u.firstName} {u.lastName}</span>
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </>
  )
}

// ── ВЧК (втори час на класа) ────────────────────────────────────────────────
const VHK_KINDS = [
  'Час на класа',
  'Занимания по интереси',
  'Професионално ориентиране',
  'Превенция на агресията',
  'Кариерно консултиране',
]

export function VhkTab({ classId }: { classId: string }) {
  const { db, isStaff, addVhkLesson, deleteVhkLesson, userName, subjectName } = useApp()
  const klass = db.classes.find((c) => c.id === classId)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    kind: VHK_KINDS[0], from: nowLocal(), to: nowLocal(), takenOn: nowLocal().slice(0, 10),
    roomId: klass?.roomId ?? '', teacherId: klass?.homeroomTeacherId ?? '', description: '',
  })

  const rows = db.vhkLessons
    .filter((v) => v.classId === classId)
    .sort((a, b) => b.from.localeCompare(a.from))

  return (
    <>
      <Register

        onAdd={isStaff ? () => setOpen(true) : undefined}
        empty="Все още не са въвеждани ВЧК часове."
        colSpan={8}
        minWidth={1040}
        extra={
          <TB icon="download" tone="gold" onClick={() => window.alert('Експортът към Excel ще бъде наличен след свързване на Firebase.')}>
            Excel
          </TB>
        }
        head={
          <>
            <Th className="w-[190px]">Тип</Th>
            <Th className="w-[150px]">Начало</Th>
            <Th className="w-[150px]">Край</Th>
            <Th className="w-[150px]">Маркиран като взет на</Th>
            <Th className="w-[170px]">Стая</Th>
            <Th className="w-[180px]">Учител</Th>
            <Th>Описание</Th>
            <Th className="w-[90px]">Операции</Th>
          </>
        }
      >
        {rows.map((v) => (
          <tr key={v.id} className="hover:bg-[#f7fbfd]">
            <td className="px-3 py-2 text-[12.5px]"><span className="text-[#2b6ca3]">{v.kind}</span></td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{formatDateTime(v.from)}</td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{formatDateTime(v.to)}</td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{dateOnly(v.takenOn)}</td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{db.rooms.find((r) => r.id === v.roomId)?.name ?? '—'}</td>
            <td className="px-3 py-2 text-[12.5px]"><StudentLike name={userName(v.teacherId)} /></td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{v.description || '—'}</td>
            <td className="px-3 py-2">
              {isStaff && <RowActions onEdit={() => setOpen(true)} onDelete={() => deleteVhkLesson(v.id)} />}
            </td>
          </tr>
        ))}
      </Register>

      <Modal
        open={open} onClose={() => setOpen(false)} title="ВЧК час"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              className="btn-primary"
              onClick={() => {
                addVhkLesson({
                  classId, kind: form.kind, from: form.from, to: form.to, takenOn: form.takenOn,
                  roomId: form.roomId || undefined, teacherId: form.teacherId, description: form.description,
                })
                setOpen(false)
              }}
            >
              Запази
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Тип">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {VHK_KINDS.map((k) => <option key={k}>{k}</option>)}
            </Select>
          </Field>
          <Field label="Маркиран като взет на"><Input type="date" value={form.takenOn} onChange={(e) => setForm({ ...form, takenOn: e.target.value })} /></Field>
          <Field label="Начало"><Input type="datetime-local" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></Field>
          <Field label="Край"><Input type="datetime-local" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></Field>
          <Field label="Стая">
            <Select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
              <option value="">— без стая —</option>
              {db.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
          <Field label="Учител">
            <Select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
              <option value="">— изберете —</option>
              {db.users.filter((u) => u.roles.some((r) => ['teacher', 'class_teacher', 'educator'].includes(r))).map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Описание"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-400">Клас: {klass?.name} · {subjectName(klass?.subjectIds[0] ?? '')}</p>
      </Modal>
    </>
  )
}

// ── Бележки ─────────────────────────────────────────────────────────────────
export function RemarksTab({ classId }: { classId: string }) {
  const { db, isStaff, user, addClassNote, updateClassNote, deleteClassNote, userName, studentsOf } = useApp()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ studentId: '', text: '', date: nowLocal().slice(0, 10) })
  const students = studentsOf(classId)

  const rows = db.classNotes
    .filter((n) => n.classId === classId)
    .sort((a, b) => b.date.localeCompare(a.date))

  const openNew = () => {
    setEditId(null)
    setForm({ studentId: students[0]?.id ?? '', text: '', date: nowLocal().slice(0, 10) })
    setOpen(true)
  }
  const openEdit = (id: string) => {
    const n = db.classNotes.find((x) => x.id === id)
    if (!n) return
    setEditId(id)
    setForm({ studentId: n.studentId, text: n.text, date: n.date })
    setOpen(true)
  }

  return (
    <>
      <Register

        onAdd={isStaff ? openNew : undefined}
        empty="Все още не са въвеждани бележки."
        colSpan={7}
        minWidth={1000}
        head={
          <>
            <Th className="w-[300px]">Бележка</Th>
            <Th className="w-[230px]">Ученик</Th>
            <Th className="w-[120px]">Дата</Th>
            <Th className="w-[170px]">Въведена от</Th>
            <Th className="w-[170px]">Въведена на</Th>
            <Th className="w-[170px]">Редактирана от</Th>
            <Th className="w-[90px]">Операции</Th>
          </>
        }
      >
        {rows.map((n) => (
          <tr key={n.id} className="hover:bg-[#f7fbfd]">
            <td className="px-3 py-2 text-[12.5px]">
              <span className="inline-flex items-start gap-1.5">
                <Icon name="report" size={14} className="mt-0.5 shrink-0 text-[#3598dc]" strokeWidth={2} />
                <span className="text-[#2b6ca3]">{n.text}</span>
              </span>
            </td>
            <td className="px-3 py-2"><StudentCell student={db.students.find((s) => s.id === n.studentId)} /></td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{dateOnly(n.date)}</td>
            <td className="px-3 py-2 text-[12.5px]"><StudentLike name={userName(n.authorId)} /></td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{n.createdAt}</td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{n.editedById ? userName(n.editedById) : '—'}</td>
            <td className="px-3 py-2">
              {isStaff && (
                <RowActions onEdit={() => openEdit(n.id)} onDelete={() => deleteClassNote(n.id)} />
              )}
            </td>
          </tr>
        ))}
      </Register>

      <Modal
        open={open} onClose={() => setOpen(false)} title={editId ? 'Редакция на бележка' : 'Нова бележка'}
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              className="btn-primary"
              onClick={() => {
                if (!form.studentId || !form.text) return
                if (editId) updateClassNote(editId, { text: form.text, date: form.date, studentId: form.studentId })
                else addClassNote({ classId, studentId: form.studentId, text: form.text, date: form.date, authorId: user!.id })
                setOpen(false)
              }}
            >
              Запази
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ученик">
            <Select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
              <option value="">— изберете —</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.firstName} {s.lastName}</option>)}
            </Select>
          </Field>
          <Field label="Дата"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        </div>
        <div className="mt-3">
          <Field label="Текст на бележката"><Textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></Field>
        </div>
      </Modal>
    </>
  )
}

// ── Санкции ─────────────────────────────────────────────────────────────────
const SANCTION_KINDS = [
  'Забележка',
  'Предупреждение за изключване',
  'Преместване в друга паралелка в същото училище',
  'Преместване в друго училище',
]

export function SanctionsTab({ classId }: { classId: string }) {
  const { db, isStaff, user, addSanctions, deleteSanction, userName, studentsOf } = useApp()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    kind: SANCTION_KINDS[0], orderNo: '', orderDate: nowLocal().slice(0, 10),
    from: nowLocal().slice(0, 10), to: '', studentIds: [] as string[],
  })
  const students = studentsOf(classId)

  const rows = db.sanctions
    .filter((s) => s.classId === classId)
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))

  return (
    <>
      <Register

        onAdd={isStaff ? () => { setForm({ ...form, studentIds: [] }); setOpen(true) } : undefined}
        empty="Все още не са въвеждани санкции."
        colSpan={8}
        minWidth={1100}
        head={
          <>
            <Th className="w-[300px]">Санкция</Th>
            <Th className="w-[230px]">Ученик</Th>
            <Th className="w-[120px]">Номер на заповед</Th>
            <Th className="w-[140px]">Дата на заповед</Th>
            <Th className="w-[110px]">Начало</Th>
            <Th className="w-[110px]">Край</Th>
            <Th className="w-[170px]">Въведена от</Th>
            <Th className="w-[90px]">Операции</Th>
          </>
        }
      >
        {rows.map((s) => (
          <tr key={s.id} className="bg-[#fde8e8]/60 hover:bg-[#fbdcdc]">
            <td className="px-3 py-2 text-[12.5px]">
              <span className="inline-flex items-start gap-1.5">
                <Icon name="warn" size={14} className="mt-0.5 shrink-0 text-[#e7505a]" strokeWidth={2} />
                <span className="text-[#2b6ca3]">{s.kind}</span>
              </span>
            </td>
            <td className="px-3 py-2"><StudentCell student={db.students.find((x) => x.id === s.studentId)} /></td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{s.orderNo}</td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{dateOnly(s.orderDate)}</td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{dateOnly(s.from)}</td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{dateOnly(s.to)}</td>
            <td className="px-3 py-2 text-[12.5px]"><StudentLike name={userName(s.authorId)} /></td>
            <td className="px-3 py-2">
              {isStaff && (
                <RowActions
                  onEdit={() => setOpen(true)}
                  onCopy={() => {
                    const { id: _id, ...rest } = s
                    addSanctions([{ ...rest, orderNo: `${s.orderNo}-копие` }])
                  }}
                  onDelete={() => { if (window.confirm('Да се изтрие ли санкцията?')) deleteSanction(s.id) }}
                />
              )}
            </td>
          </tr>
        ))}
      </Register>

      <Modal
        open={open} onClose={() => setOpen(false)} wide title="Нова санкция"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              className="btn-primary"
              onClick={() => {
                if (!form.studentIds.length) return
                addSanctions(form.studentIds.map((studentId) => ({
                  studentId, classId, kind: form.kind, orderNo: form.orderNo,
                  orderDate: form.orderDate, from: form.from, to: form.to, authorId: user!.id,
                })))
                setOpen(false)
              }}
            >
              Запази
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Санкция">
              <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {SANCTION_KINDS.map((k) => <option key={k}>{k}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Номер на заповед"><Input value={form.orderNo} onChange={(e) => setForm({ ...form, orderNo: e.target.value })} placeholder="напр. РД-006" /></Field>
          <Field label="Дата на заповед"><Input type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} /></Field>
          <Field label="В сила от"><Input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></Field>
          <Field label="В сила до"><Input type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></Field>
        </div>
        <div className="mt-4">
          <p className="label">Ученици</p>
          <div className="grid max-h-[240px] grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-ink-200 p-2.5 sm:grid-cols-3">
            {students.map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-[12.5px] hover:bg-ink-50">
                <input
                  type="checkbox" className="h-3.5 w-3.5"
                  checked={form.studentIds.includes(s.id)}
                  onChange={(e) => setForm({
                    ...form,
                    studentIds: e.target.checked ? [...form.studentIds, s.id] : form.studentIds.filter((x) => x !== s.id),
                  })}
                />
                <span className="truncate">{s.number}. {s.firstName} {s.lastName}</span>
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </>
  )
}
