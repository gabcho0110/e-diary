import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, GradePill, Icon, Input, Modal, PageHeader, Select, Table, formatDate } from '../components/ui'
import type { GradeType } from '../lib/types'

const BADGES = ['🌟', '🏅', '👏', '💡', '🎯', '🔥', '📚', '🤝']

export default function MoyatChas() {
  const { db, myClasses, studentsOf, addGrades, addAbsences, addNote, user, subjectName, update, className } = useApp()
  const [classId, setClassId] = useState(myClasses[0]?.id ?? '')
  const [randomStudent, setRandomStudent] = useState<string | null>(null)
  const [gradeOpen, setGradeOpen] = useState(false)
  const [absenceOpen, setAbsenceOpen] = useState(false)
  const [badgeOpen, setBadgeOpen] = useState(false)

  const klass = db.classes.find((c) => c.id === classId)
  const students = studentsOf(classId)
  const today = new Date().toISOString().slice(0, 10)

  const [topic, setTopic] = useState('')
  const [gradeForm, setGradeForm] = useState({ studentId: '', value: 5, type: 'Текуща' as GradeType, comment: '' })
  const [absenceForm, setAbsenceForm] = useState({ studentId: '', period: 6, reason: 'неизвинено' })
  const [badgeForm, setBadgeForm] = useState({ studentId: '', badge: '🌟', text: '' })

  if (!myClasses.length) {
    return <EmptyState title="Нямате паралелка като класен ръководител" icon="clock" />
  }

  const roll = () => {
    if (!students.length) return
    setRandomStudent(students[Math.floor(Math.random() * students.length)].id)
  }

  const sessions = db.notes.filter((n) => n.classId === classId && n.kind === 'Други').length

  return (
    <>
      <PageHeader
        title="Моят час"
        subtitle="Час на класа — тема, оценки, отсъствия, значки и случаен ученик."
        icon="clock"
        actions={
          <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-auto min-w-[130px]">
            {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <h2 className="mb-3 font-bold text-ink-900">Тема на часа</h2>
          <div className="flex gap-2">
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="напр. Превенция на зависимостите" />
            <button
              onClick={() => {
                if (!topic.trim() || !user) return
                addNote({ studentId: '', classId, text: topic, kind: 'Други', teacherId: user.id, date: today, visibleToParent: false })
                setTopic('')
              }}
              className="btn-primary shrink-0"
            >
              <Icon name="check" size={15} /> Отбележи взет
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-500">
            Отбелязани часове с тема: <b>{sessions}</b>
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button onClick={() => setGradeOpen(true)} className="btn-ghost flex-col !py-3">
              <Icon name="check" size={18} /><span className="text-[12px]">Впиши оценка</span>
            </button>
            <button onClick={() => setAbsenceOpen(true)} className="btn-ghost flex-col !py-3">
              <Icon name="clock" size={18} /><span className="text-[12px]">Впиши отсъствие</span>
            </button>
            <button onClick={() => setBadgeOpen(true)} className="btn-ghost flex-col !py-3">
              <Icon name="star" size={18} /><span className="text-[12px]">Раздай значка</span>
            </button>
            <button onClick={roll} className="btn-ghost flex-col !py-3">
              <Icon name="spark" size={18} /><span className="text-[12px]">Случаен ученик</span>
            </button>
          </div>

          {randomStudent && (
            <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/60 px-5 py-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">Избран ученик</p>
              <p className="mt-1 text-xl font-bold text-ink-900">
                {db.students.find((s) => s.id === randomStudent)?.firstName}{' '}
                {db.students.find((s) => s.id === randomStudent)?.lastName}
              </p>
              <button onClick={() => setRandomStudent(null)} className="mt-2 text-[12px] font-semibold text-brand-700 hover:underline">
                Изчисти
              </button>
            </div>
          )}

          <div className="mt-5">
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-500">Отбележи час като ОРЕС</h3>
            <div className="flex flex-wrap gap-1.5">
              {['ОРЕС', 'ИУЧ', 'ЗИП', 'ФУЧ'].map((t) => (
                <button
                  key={t}
                  onClick={() => update((d) => {
                    const e = d.schedule.find((s) => s.classId === classId && s.day === 5 && s.period === 7)
                    if (e) e.tag = e.tag === t ? undefined : t
                  })}
                  className="btn-ghost !py-1.5 text-[12px]"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card pad={false}>
            <div className="border-b border-ink-200 px-5 py-3.5"><h2 className="font-bold text-ink-900">Клас {className(classId)}</h2></div>
            <div className="grid grid-cols-2 divide-x divide-ink-100">
              <div className="px-5 py-4">
                <p className="text-[11px] uppercase tracking-wide text-ink-500">Ученици</p>
                <p className="text-2xl font-bold text-ink-900">{students.length}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-[11px] uppercase tracking-wide text-ink-500">Отсъствия днес</p>
                <p className="text-2xl font-bold text-ink-900">
                  {db.absences.filter((a) => a.classId === classId && a.date === today).length}
                </p>
              </div>
            </div>
          </Card>

          <Card pad={false}>
            <div className="border-b border-ink-200 px-5 py-3.5"><h2 className="font-bold text-ink-900">Значки и отзиви</h2></div>
            <ul className="divide-y divide-ink-100">
              {db.notes.filter((n) => n.classId === classId && n.badge).slice(0, 8).map((n) => {
                const s = db.students.find((x) => x.id === n.studentId)
                return (
                  <li key={n.id} className="flex items-center gap-2.5 px-5 py-2">
                    <span className="text-lg">{n.badge}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-700">
                      {s?.firstName} {s?.lastName} — {n.text}
                    </span>
                    <span className="shrink-0 text-[11px] text-ink-400">{formatDate(n.date)}</span>
                  </li>
                )
              })}
              {db.notes.filter((n) => n.classId === classId && n.badge).length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-ink-400">Няма раздадени значки</li>
              )}
            </ul>
          </Card>
        </div>
      </div>

      {/* модали */}
      <Modal
        open={gradeOpen} onClose={() => setGradeOpen(false)} title="Вписване на оценка"
        footer={
          <>
            <button onClick={() => setGradeOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!gradeForm.studentId || !user) return
                addGrades([{
                  studentId: gradeForm.studentId, subjectId: klass!.subjectIds[0], classId,
                  value: gradeForm.value, type: gradeForm.type, date: today, term: 1,
                  comment: gradeForm.comment || undefined, teacherId: user.id, draft: false,
                }])
                setGradeOpen(false)
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
            <Select value={gradeForm.studentId} onChange={(e) => setGradeForm({ ...gradeForm, studentId: e.target.value })}>
              <option value="">— изберете —</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.firstName} {s.lastName}</option>)}
            </Select>
          </Field>
          <Field label="Предмет">
            <Select defaultValue={klass?.subjectIds[0]}>
              {klass?.subjectIds.map((sid) => <option key={sid} value={sid}>{subjectName(sid)}</option>)}
            </Select>
          </Field>
          <Field label="Оценка">
            <div className="flex gap-1.5">
              {[2, 3, 4, 5, 6].map((g) => (
                <button
                  key={g}
                  onClick={() => setGradeForm({ ...gradeForm, value: g })}
                  className={`h-9 flex-1 rounded-lg text-sm font-bold ${gradeForm.value === g ? `g${g} ring-2 ring-brand-500/40` : 'bg-ink-100 text-ink-500'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Коментар">
            <Input value={gradeForm.comment} onChange={(e) => setGradeForm({ ...gradeForm, comment: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={absenceOpen} onClose={() => setAbsenceOpen(false)} title="Вписване на отсъствие"
        footer={
          <>
            <button onClick={() => setAbsenceOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!absenceForm.studentId || !user) return
                addAbsences([{
                  studentId: absenceForm.studentId, classId, date: today, period: absenceForm.period,
                  subjectId: klass!.subjectIds[0], reason: absenceForm.reason as never,
                  excused: absenceForm.reason !== 'неизвинено', teacherId: user.id,
                }])
                setAbsenceOpen(false)
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
            <Select value={absenceForm.studentId} onChange={(e) => setAbsenceForm({ ...absenceForm, studentId: e.target.value })}>
              <option value="">— изберете —</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.firstName} {s.lastName}</option>)}
            </Select>
          </Field>
          <Field label="Час №">
            <Select value={absenceForm.period} onChange={(e) => setAbsenceForm({ ...absenceForm, period: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6, 7].map((p) => <option key={p} value={p}>{p} час</option>)}
            </Select>
          </Field>
          <Field label="Причина">
            <Select value={absenceForm.reason} onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })}>
              <option value="неизвинено">Неизвинено</option>
              <option value="извинено">Извинено</option>
              <option value="семейни причини">Семейни причини</option>
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={badgeOpen} onClose={() => setBadgeOpen(false)} title="Раздаване на значка"
        footer={
          <>
            <button onClick={() => setBadgeOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!badgeForm.studentId || !user) return
                addNote({
                  studentId: badgeForm.studentId, classId, text: badgeForm.text || 'За отлично представяне',
                  kind: 'Похвала', badge: badgeForm.badge, teacherId: user.id, date: today, visibleToParent: true,
                })
                setBadgeOpen(false)
              }}
              className="btn-primary"
            >
              Раздай
            </button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="Ученик">
            <Select value={badgeForm.studentId} onChange={(e) => setBadgeForm({ ...badgeForm, studentId: e.target.value })}>
              <option value="">— изберете —</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.firstName} {s.lastName}</option>)}
            </Select>
          </Field>
          <Field label="Значка">
            <div className="flex flex-wrap gap-1.5">
              {BADGES.map((b) => (
                <button
                  key={b}
                  onClick={() => setBadgeForm({ ...badgeForm, badge: b })}
                  className={`grid h-10 w-10 place-items-center rounded-lg text-xl ${badgeForm.badge === b ? 'bg-brand-50 ring-2 ring-brand-500/40' : 'bg-ink-100'}`}
                >
                  {b}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Причина">
            <Input value={badgeForm.text} onChange={(e) => setBadgeForm({ ...badgeForm, text: e.target.value })} placeholder="напр. Активна работа в час" />
          </Field>
        </div>
      </Modal>

      <div className="mt-5">
        <h3 className="mb-2 font-bold text-ink-900">Оценки, вписани днес в {className(classId)}</h3>
        <Table head={<><th className="th">Ученик</th><th className="th">Предмет</th><th className="th w-20">Оценка</th><th className="th">Тип</th></>}>
          {db.grades.filter((g) => g.classId === classId && g.date === today).map((g) => {
            const s = db.students.find((x) => x.id === g.studentId)
            return (
              <tr key={g.id}>
                <td className="td">{s?.firstName} {s?.lastName}</td>
                <td className="td">{subjectName(g.subjectId)}</td>
                <td className="td"><GradePill value={g.value} /></td>
                <td className="td"><Badge tone="neutral">{g.type}</Badge></td>
              </tr>
            )
          })}
        </Table>
      </div>
    </>
  )
}
