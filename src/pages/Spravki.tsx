import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, PageHeader, SearchInput, Select, Stat, Table, avgFmt, formatDate } from '../components/ui'

interface ReportDef {
  id: string
  name: string
  group: string
  desc: string
}

const REPORTS: ReportDef[] = [
  { id: 'avg', name: 'Среден успех (разбивка по оценки)', group: 'Успех', desc: 'Среден успех по паралелки и предмети с разбивка по оценки.' },
  { id: 'avg-class', name: 'Среден успех по паралелки', group: 'Успех', desc: 'Сравнение на средния успех между паралелките.' },
  { id: 'weak', name: 'Слаби оценки', group: 'Успех', desc: 'Ученици с оценки 2 и 3 и брой слаби оценки.' },
  { id: 'rhythm', name: 'Ритмичност на оценяване', group: 'Успех', desc: 'Разпределение на оценките по месеци и предмети.' },
  { id: 'levels', name: 'Резултати от обучението', group: 'Успех', desc: 'Входно, междинно и изходно ниво по предмети.' },
  { id: 'grades-print', name: 'Принтиране на оценки по предмет', group: 'Успех', desc: 'Печат на оценките по избран предмет и паралелка.' },

  { id: 'absences', name: 'Отсъствия (25% от хорариум)', group: 'Отсъствия', desc: 'Ученици с отсъствия над 25% от хорариума.' },
  { id: 'absences-neispuo', name: 'Отсъствия за НЕИСПУО', group: 'Отсъствия', desc: 'Експорт на отсъствия във формат за НЕИСПУО.' },
  { id: 'book', name: 'Ученическа книжка', group: 'Отсъствия', desc: 'Справка за издаване на ученическа книжка.' },
  { id: 'notes-report', name: 'Забележки', group: 'Отсъствия', desc: 'Всички забележки и отзиви по паралелки.' },
  { id: 'support', name: 'Ученическа подкрепа', group: 'Отсъствия', desc: 'Ученици със СОП, ИФО и планове за подкрепа.' },

  { id: 'movement', name: 'Движение на ученици', group: 'Администрация', desc: 'Приети, преместени и отписани ученици.' },
  { id: 'unformed', name: 'Неоформени ученици', group: 'Администрация', desc: 'Ученици без пълен набор документи.' },
  { id: 'count', name: 'Брой ученици към дата', group: 'Администрация', desc: 'Брой ученици по паралелки към конкретна дата.' },
  { id: 'doctors', name: 'Ученици и лични лекари', group: 'Администрация', desc: 'Списък на учениците с данни за личен лекар.' },
  { id: 'health', name: 'Здравно осигуряване (18+)', group: 'Администрация', desc: 'Ученици, навършили 18 години.' },
  { id: 'engagement', name: 'Родителска ангажираност', group: 'Администрация', desc: 'Активност на родителите в платформата.' },

  { id: 'taken', name: 'Взети занятия', group: 'Учебен процес', desc: 'Взети и невзети занятия по предмети.' },
  { id: 'taken-no-topic', name: 'Взети занятия без тема', group: 'Учебен процес', desc: 'Занятия, отбелязани като взети без въведена тема.' },
  { id: 'ores', name: 'Взети занятия в ОРЕС', group: 'Учебен процес', desc: 'Отчет на часовете, провеждани в ОРЕС.' },
  { id: 'extra', name: 'Взети допълнителни занятия', group: 'Учебен процес', desc: 'Допълнителни занятия и консултации.' },
  { id: 'exam-schedule', name: 'График за контролни и класни работи', group: 'Учебен процес', desc: 'Пълен график на контролните по паралелки.' },
  { id: 'second-hour', name: 'Втори час на класа', group: 'Учебен процес', desc: 'Отчет на втория час на класа.' },
  { id: 'activities', name: 'Извънкласни дейности', group: 'Учебен процес', desc: 'Участници и дейности по паралелки.' },
  { id: 'sen-activities', name: 'Занятия СОП', group: 'Учебен процес', desc: 'Занятия с ученици със специални образователни потребности.' },
  { id: 'teacher-activity', name: 'Учителска активност', group: 'Учебен процес', desc: 'Активност на учителите при въвеждане на данни.' },
  { id: 'teacher-absent', name: 'Отсъстващи учители', group: 'Учебен процес', desc: 'Учителски отсъствия и замествания.' },
  { id: 'book2', name: 'Справка за ученическа книжка', group: 'Учебен процес', desc: 'Данни за попълване на ученическа книжка.' },
]

export default function Spravki() {
  const { db, myClasses, average, studentsOf, className, subjectName, unexcusedCount } = useApp()
  const [q, setQ] = useState('')
  const [active, setActive] = useState<string>('avg')
  const [classId, setClassId] = useState(myClasses[0]?.id ?? '')
  const [subjectId, setSubjectId] = useState('')

  const filtered = useMemo(
    () => REPORTS.filter((r) => !q.trim() || r.name.toLowerCase().includes(q.toLowerCase()) || r.desc.toLowerCase().includes(q.toLowerCase())),
    [q],
  )
  const groups = [...new Set(filtered.map((r) => r.group))]

  const klass = db.classes.find((c) => c.id === classId)
  const students = studentsOf(classId)
  const subjects = klass ? db.subjects.filter((s) => klass.subjectIds.includes(s.id)) : []

  // ── съдържание на избраната справка ─────────────────────────────────────
  const content = () => {
    if (active === 'avg' || active === 'avg-class' || active === 'grades-print') {
      const rows = active === 'avg-class' ? db.classes : db.classes.slice(0, 1)
      if (active === 'avg-class') {
        return (
          <Table head={<><th className="th">Паралелка</th><th className="th w-28">Ученици</th><th className="th w-32">Среден успех</th><th className="th w-32">Слаби оценки</th><th className="th w-32">Отсъствия</th></>}>
            {rows.map((k) => {
              const sts = studentsOf(k.id)
              const avgs = sts.map((s) => average(s.id)).filter((a): a is number => a !== null)
              return (
                <tr key={k.id} className="hover:bg-ink-50/60">
                  <td className="td font-bold">{k.name}</td>
                  <td className="td">{sts.length}</td>
                  <td className="td font-bold">{avgFmt(avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null)}</td>
                  <td className="td">{db.grades.filter((g) => g.classId === k.id && g.value <= 3).length}</td>
                  <td className="td">{db.absences.filter((a) => a.classId === k.id).length}</td>
                </tr>
              )
            })}
          </Table>
        )
      }
      return (
        <Table head={<><th className="th w-12">№</th><th className="th">Ученик</th>{subjects.slice(0, 8).map((s) => <th key={s.id} className="th w-20">{s.short}</th>)}<th className="th w-24">Среден</th></>}>
          {students.map((s) => (
            <tr key={s.id} className="hover:bg-ink-50/60">
              <td className="td font-bold text-ink-400">{s.number}</td>
              <td className="td font-medium">{s.firstName} {s.lastName}</td>
              {subjects.slice(0, 8).map((sub) => (
                <td key={sub.id} className="td">{avgFmt(average(s.id, sub.id))}</td>
              ))}
              <td className="td font-bold">{avgFmt(average(s.id))}</td>
            </tr>
          ))}
        </Table>
      )
    }

    if (active === 'weak') {
      const weak = students
        .map((s) => ({ s, weak: db.grades.filter((g) => g.studentId === s.id && g.value <= 3).length }))
        .filter((x) => x.weak > 0)
        .sort((a, b) => b.weak - a.weak)
      return (
        <Table head={<><th className="th">Ученик</th><th className="th w-32">Слаби оценки</th><th className="th w-32">Среден успех</th><th className="th">Забележка</th></>}>
          {weak.map(({ s, weak: n }) => (
            <tr key={s.id} className="hover:bg-ink-50/60">
              <td className="td font-medium">{s.firstName} {s.lastName}</td>
              <td className="td"><Badge tone="danger">{n}</Badge></td>
              <td className="td font-bold">{avgFmt(average(s.id))}</td>
              <td className="td text-[13px] text-ink-500">{n >= 4 ? 'Изисква допълнителна подкрепа' : 'Наблюдение'}</td>
            </tr>
          ))}
          {weak.length === 0 && <tr><td className="td text-ink-400" colSpan={4}>Няма ученици със слаби оценки.</td></tr>}
        </Table>
      )
    }

    if (active.startsWith('absences') || active === 'notes-report' || active === 'support') {
      return (
        <Table head={<><th className="th w-12">№</th><th className="th">Ученик</th><th className="th w-24">Общо</th><th className="th w-28">Неизвинени</th><th className="th w-32">% от хорариума</th><th className="th">Бележка</th></>}>
          {students.map((s) => {
            const total = db.absences.filter((a) => a.studentId === s.id).length
            const un = unexcusedCount(s.id)
            const pct = ((total / 210) * 100).toFixed(1)
            return (
              <tr key={s.id} className="hover:bg-ink-50/60">
                <td className="td font-bold text-ink-400">{s.number}</td>
                <td className="td font-medium">
                  {s.firstName} {s.lastName}
                  {s.sen && <Badge tone="purple" className="ml-2">СОП</Badge>}
                </td>
                <td className="td">{total}</td>
                <td className="td">{un > 0 ? <Badge tone="danger">{un}</Badge> : '0'}</td>
                <td className="td">{pct}%</td>
                <td className="td text-[13px] text-ink-500">{Number(pct) > 25 ? 'Над допустимия праг' : '—'}</td>
              </tr>
            )
          })}
        </Table>
      )
    }

    if (active === 'movement') {
      return (
        <Table head={<><th className="th">Ученик</th><th className="th">Паралелка</th><th className="th w-32">Статус</th><th className="th w-28">Дата</th></>}>
          {db.students.filter((s) => s.status !== 'активен').map((s) => (
            <tr key={s.id}>
              <td className="td">{s.firstName} {s.lastName}</td>
              <td className="td">{className(s.classId)}</td>
              <td className="td"><Badge tone="danger">{s.status}</Badge></td>
              <td className="td text-[12px] text-ink-500">{formatDate(s.admittedAt)}</td>
            </tr>
          ))}
        </Table>
      )
    }

    if (active === 'doctors' || active === 'health' || active === 'unformed' || active === 'count') {
      return (
        <Table head={<><th className="th w-12">№</th><th className="th">Ученик</th><th className="th">ЕГН</th><th className="th">Личен лекар</th><th className="th">Адрес</th></>}>
          {students.map((s) => (
            <tr key={s.id} className="hover:bg-ink-50/60">
              <td className="td font-bold text-ink-400">{s.number}</td>
              <td className="td font-medium">{s.firstName} {s.lastName}</td>
              <td className="td font-mono text-[12px] text-ink-500">{s.egn}</td>
              <td className="td text-[13px]">{s.doctor ?? '—'}</td>
              <td className="td text-[12px] text-ink-500">{s.address}</td>
            </tr>
          ))}
        </Table>
      )
    }

    if (active === 'engagement') {
      return (
        <Table head={<><th className="th">Паралелка</th><th className="th w-28">Ученици</th><th className="th w-32">Родители</th><th className="th w-32">Регистрирани</th><th className="th w-32">Ангажираност</th></>}>
          {db.classes.map((k) => {
            const sts = studentsOf(k.id)
            const parents = db.users.filter((u) => u.roles.includes('parent') && sts.some((s) => u.childrenIds?.includes(s.id)))
            const pct = Math.round((parents.length / Math.max(1, sts.length * 2)) * 100)
            return (
              <tr key={k.id} className="hover:bg-ink-50/60">
                <td className="td font-bold">{k.name}</td>
                <td className="td">{sts.length}</td>
                <td className="td">{sts.length * 2}</td>
                <td className="td">{parents.length}</td>
                <td className="td">
                  <Badge tone={pct > 70 ? 'ok' : pct > 40 ? 'warn' : 'danger'}>{pct}%</Badge>
                </td>
              </tr>
            )
          })}
        </Table>
      )
    }

    if (active.startsWith('taken') || active === 'ores' || active === 'extra' || active === 'sen-activities') {
      const plans = db.themePlans.filter((p) => !classId || p.classId === classId)
      return (
        <Table head={<><th className="th">Предмет</th><th className="th">Паралелка</th><th className="th w-24">Взети</th><th className="th w-24">Невзети</th><th className="th w-28">Общо часове</th><th className="th w-28">Изпълнение</th></>}>
          {plans.map((p) => {
            const taken = p.rows.filter((r) => r.taken)
            const hours = p.rows.reduce((a, r) => a + r.hours, 0)
            const done = taken.reduce((a, r) => a + r.hours, 0)
            return (
              <tr key={p.id} className="hover:bg-ink-50/60">
                <td className="td font-medium">{subjectName(p.subjectId)}</td>
                <td className="td">{className(p.classId)}</td>
                <td className="td">{taken.length}</td>
                <td className="td">{p.rows.length - taken.length}</td>
                <td className="td">{hours}</td>
                <td className="td">
                  <Badge tone={done / hours > 0.7 ? 'ok' : 'warn'}>{Math.round((done / hours) * 100)}%</Badge>
                </td>
              </tr>
            )
          })}
        </Table>
      )
    }

    if (active === 'teacher-activity' || active === 'teacher-absent') {
      const teachers = db.users.filter((u) => u.roles.some((r) => ['teacher', 'class_teacher'].includes(r)))
      return (
        <Table head={<><th className="th">Учител</th><th className="th w-28">Оценки</th><th className="th w-28">Отсъствия</th><th className="th w-28">Отзиви</th><th className="th w-28">Отсъствия (учител)</th></>}>
          {teachers.map((t) => (
            <tr key={t.id} className="hover:bg-ink-50/60">
              <td className="td font-medium">{t.firstName} {t.lastName}</td>
              <td className="td">{db.grades.filter((g) => g.teacherId === t.id).length}</td>
              <td className="td">{db.absences.filter((a) => a.teacherId === t.id).length}</td>
              <td className="td">{db.notes.filter((n) => n.teacherId === t.id).length}</td>
              <td className="td">{db.lessonAbsences.filter((l) => l.teacherId === t.id).length}</td>
            </tr>
          ))}
        </Table>
      )
    }

    return <EmptyState title="Справката е готова за генериране" text={REPORTS.find((r) => r.id === active)?.desc} icon="report" />
  }

  const activeDef = REPORTS.find((r) => r.id === active)

  return (
    <>
      <PageHeader
        title="Справки"
        subtitle="31 справки за успех, отсъствия, движение на ученици, ангажираност и експорт към НЕИСПУО."
        icon="report"
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => window.print()} className="btn-ghost"><Icon name="print" size={15} /> Принтирай</button>
            <button onClick={() => alert('Справката е експортирана във формат за НЕИСПУО (.xml).')} className="btn-primary">
              <Icon name="download" size={15} /> Експорт
            </button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Налични справки" value={REPORTS.length} icon="report" />
        <Stat label="Паралелки" value={db.classes.length} icon="grid" tone="brand" />
        <Stat label="Ученици" value={db.students.length} icon="person" tone="ok" />
        <Stat label="Записи в дневника" value={db.grades.length + db.absences.length} icon="list" tone="purple" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[330px_1fr]">
        <Card pad={false}>
          <div className="border-b border-ink-200 p-3">
            <SearchInput value={q} onChange={setQ} placeholder="Търсене на справка…" />
          </div>
          <div className="max-h-[620px] overflow-y-auto p-2">
            {groups.map((g) => (
              <div key={g} className="mb-2">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">{g}</p>
                {filtered.filter((r) => r.group === g).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setActive(r.id)}
                    className={`mb-0.5 block w-full rounded-lg px-2.5 py-2 text-left text-[13px] transition ${
                      active === r.id ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-600 hover:bg-ink-50'
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <Card pad={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-5 py-3.5">
            <div>
              <h2 className="font-bold text-ink-900">{activeDef?.name}</h2>
              <p className="text-[12px] text-ink-500">{activeDef?.desc}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-auto min-w-[120px] !py-1.5 text-[12px]">
                {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-auto min-w-[140px] !py-1.5 text-[12px]">
                <option value="">Всички предмети</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
          </div>
          <div className="p-5">{content()}</div>
        </Card>
      </div>
    </>
  )
}
