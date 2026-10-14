import { Link } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { ROLE_MAP } from '../lib/roles'
import { Badge, Card, EmptyState, GradePill, Icon, PageHeader, Stat, avgFmt, formatDate } from '../components/ui'

const DAY_NAMES = ['', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя']

export default function Dashboard() {
  const {
    db, user, isAdmin, myClasses, myChildren, myStudent, studentsOf, average,
    gradesOf, absencesOf, unexcusedCount, className, subjectName, subjectShort,
  } = useApp()
  if (!user) return null

  const role = user.roles[0]
  const today = new Date()
  const dayIdx = today.getDay() === 0 || today.getDay() === 6 ? 1 : today.getDay()

  // ── ученик / родител ──────────────────────────────────────────────────────
  const focus: { studentId: string; name: string; classId: string }[] = myStudent
    ? [{ studentId: myStudent.id, name: `${myStudent.firstName} ${myStudent.lastName}`, classId: myStudent.classId }]
    : myChildren.map((c) => ({ studentId: c.id, name: `${c.firstName} ${c.lastName}`, classId: c.classId }))

  if ((role === 'student' || role === 'parent') && focus.length) {
    const f = focus[0]
    const k = db.classes.find((c) => c.id === f.classId)!
    const sched = db.schedule
      .filter((s) => s.classId === k.id && s.day === dayIdx)
      .sort((a, b) => a.period - b.period)
    const allGrades = gradesOf(f.studentId).filter((g) => !g.draft)
    const recent = [...allGrades].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
    const abs = absencesOf(f.studentId)
    const upcoming = db.events
      .filter((e) => e.date >= today.toISOString().slice(0, 10))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4)
    const homework = db.homework
      .filter((h) => h.classId === k.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4)

    return (
      <>
        <PageHeader
          title={role === 'parent' ? `Детето ми — ${f.name}` : `Здравей, ${user.firstName}!`}
          subtitle={`${className(f.classId)}${k.profile ? ' · ' + k.profile : ''} · учебна ${db.school.year}`}
          icon="home"
        />

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Среден успех" value={avgFmt(average(f.studentId))} icon="chart" tone="brand" hint="по всички предмети" />
          <Stat label="Оценки" value={allGrades.length} icon="check" tone="ok" hint="в първия срок" />
          <Stat label="Отсъствия" value={abs.length} icon="clock" tone="warn" hint={`${unexcusedCount(f.studentId)} неизвинени`} />
          <Stat
            label="Задачи за утре"
            value={db.homework.filter((h) => h.classId === k.id && h.dueDate >= today.toISOString().slice(0, 10)).length}
            icon="task"
            tone="purple"
            hint="домашни работи"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Card pad={false}>
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
              <h2 className="font-bold text-ink-900">Разписание — {DAY_NAMES[dayIdx]}</h2>
              <Link to="/dnevnik" className="text-[13px] font-semibold text-brand-700 hover:underline">Цялото разписание</Link>
            </div>
            {sched.length === 0 ? (
              <div className="p-5"><EmptyState title="Няма часове" text="За днес не са насрочени занятия." icon="calendar" /></div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {sched.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-[13px] font-bold text-ink-600">
                      {s.period}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">{subjectName(s.subjectId)}</p>
                      <p className="truncate text-xs text-ink-500">
                        {db.users.find((u) => u.id === s.teacherId)?.firstName} {db.users.find((u) => u.id === s.teacherId)?.lastName}
                        {s.roomId ? ` · каб. ${db.rooms.find((r) => r.id === s.roomId)?.name}` : ''}
                      </p>
                    </div>
                    {s.tag && <Badge tone="purple">{s.tag}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="space-y-5">
            <Card pad={false}>
              <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
                <h2 className="font-bold text-ink-900">Последни оценки</h2>
                <Link to="/dnevnik" className="text-[13px] font-semibold text-brand-700 hover:underline">Всички</Link>
              </div>
              <ul className="divide-y divide-ink-100">
                {recent.slice(0, 6).map((g) => (
                  <li key={g.id} className="flex items-center gap-3 px-5 py-2">
                    <GradePill value={g.value} title={g.type} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink-800">{subjectName(g.subjectId)}</p>
                      <p className="truncate text-[11px] text-ink-500">{g.type} · {formatDate(g.date)}</p>
                    </div>
                  </li>
                ))}
                {recent.length === 0 && <li className="px-5 py-6 text-center text-sm text-ink-400">Няма оценки</li>}
              </ul>
            </Card>

            <Card pad={false}>
              <div className="border-b border-ink-200 px-5 py-3.5">
                <h2 className="font-bold text-ink-900">Домашни работи</h2>
              </div>
              <ul className="divide-y divide-ink-100">
                {homework.map((h) => (
                  <li key={h.id} className="px-5 py-2.5">
                    <p className="text-[13px] font-semibold text-ink-800">{subjectShort(h.subjectId)}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-600">{h.text}</p>
                    <p className="mt-0.5 text-[11px] text-ink-400">за {formatDate(h.dueDate)}</p>
                  </li>
                ))}
                {homework.length === 0 && <li className="px-5 py-6 text-center text-sm text-ink-400">Няма зададени домашни</li>}
              </ul>
            </Card>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card pad={false}>
            <div className="border-b border-ink-200 px-5 py-3.5">
              <h2 className="font-bold text-ink-900">Предстоящи събития</h2>
            </div>
            <ul className="divide-y divide-ink-100">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon name="calendar" size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink-800">{e.title}</p>
                    <p className="text-[11px] text-ink-500">{formatDate(e.date)} · {e.place}</p>
                  </div>
                  <Badge tone="brand">{e.kind}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card pad={false}>
            <div className="border-b border-ink-200 px-5 py-3.5">
              <h2 className="font-bold text-ink-900">Отзиви и забележки</h2>
            </div>
            <ul className="divide-y divide-ink-100">
              {db.notes.filter((n) => n.studentId === f.studentId).slice(0, 5).map((n) => (
                <li key={n.id} className="flex items-start gap-3 px-5 py-2.5">
                  <span className="mt-0.5 text-lg">{n.badge ?? (n.kind === 'Забележка' ? '⚠️' : '💬')}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink-700">{n.text}</p>
                    <p className="text-[11px] text-ink-400">{n.kind} · {formatDate(n.date)}</p>
                  </div>
                </li>
              ))}
              {db.notes.filter((n) => n.studentId === f.studentId).length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-ink-400">Няма отзиви</li>
              )}
            </ul>
          </Card>
        </div>
      </>
    )
  }

  // ── учител / администрация ────────────────────────────────────────────────
  const myStudentIds = new Set(myClasses.flatMap((c) => c.studentIds))
  const gradesToday = db.grades.filter((g) => g.date === today.toISOString().slice(0, 10)).length
  const myTasks = db.tasks.filter((t) => t.assignedToIds.includes(user.id) && t.status !== 'изпълнена')
  const unread = db.messages.filter((m) => m.toIds.includes(user.id) && !m.readBy.includes(user.id))
  const mySched = db.schedule
    .filter((s) => s.day === dayIdx && (isAdmin || s.teacherId === user.id))
    .sort((a, b) => a.period - b.period)

  const topClasses = myClasses
    .slice(0, 6)
    .map((k) => {
      const sts = studentsOf(k.id)
      const avgs = sts.map((s) => average(s.id)).filter((a): a is number => a !== null)
      return {
        k,
        count: sts.length,
        avg: avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null,
        absences: db.absences.filter((a) => a.classId === k.id && !a.excused).length,
      }
    })

  return (
    <>
      <PageHeader
        title={`Добре дошли, ${user.firstName}!`}
        subtitle={`${ROLE_MAP[role]?.name} · ${db.school.name} · учебна ${db.school.year}`}
        icon="home"
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Паралелки" value={myClasses.length} icon="grid" hint={`${myStudentIds.size} ученика`} />
        <Stat label="Оценки, въведени днес" value={gradesToday} icon="check" tone="ok" />
        <Stat label="Непрочетени съобщения" value={unread.length} icon="mail" tone="brand" />
        <Stat label="Отворени задачи" value={myTasks.length} icon="task" tone="warn" hint="възложени на вас" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card pad={false}>
          <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
            <h2 className="font-bold text-ink-900">
              {isAdmin ? 'Днес в училището' : 'Моето разписание'} — {DAY_NAMES[dayIdx]}
            </h2>
            <Link to="/dnevnik" className="text-[13px] font-semibold text-brand-700 hover:underline">Дневник</Link>
          </div>
          {mySched.length === 0 ? (
            <div className="p-5"><EmptyState title="Няма часове за днес" icon="calendar" /></div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {mySched.slice(0, 9).map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-[13px] font-bold text-ink-600">
                    {s.period}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {className(s.classId)} · {subjectName(s.subjectId)}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {db.users.find((u) => u.id === s.teacherId)?.firstName} {db.users.find((u) => u.id === s.teacherId)?.lastName}
                      {s.roomId ? ` · каб. ${db.rooms.find((r) => r.id === s.roomId)?.name}` : ''}
                    </p>
                  </div>
                  {s.tag && <Badge tone="purple">{s.tag}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card pad={false}>
          <div className="border-b border-ink-200 px-5 py-3.5">
            <h2 className="font-bold text-ink-900">Паралелки — среден успех</h2>
          </div>
          <ul className="divide-y divide-ink-100">
            {topClasses.map(({ k, count, avg, absences }) => (
              <li key={k.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="grid h-9 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-[13px] font-bold text-brand-700">
                  {k.name}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink-800">{count} ученика</p>
                  <p className="text-[11px] text-ink-500">{absences} неизвинени отсъствия</p>
                </div>
                <span className="text-sm font-bold text-ink-800">{avgFmt(avg)}</span>
              </li>
            ))}
            {topClasses.length === 0 && <li className="px-5 py-6 text-center text-sm text-ink-400">Няма паралелки</li>}
          </ul>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card pad={false}>
          <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
            <h2 className="font-bold text-ink-900">Моите задачи</h2>
            <Link to="/zadachi" className="text-[13px] font-semibold text-brand-700 hover:underline">Всички</Link>
          </div>
          <ul className="divide-y divide-ink-100">
            {myTasks.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-start gap-3 px-5 py-2.5">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${t.priority === 'висок' ? 'bg-danger' : t.priority === 'среден' ? 'bg-warn' : 'bg-ink-300'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink-800">{t.title}</p>
                  <p className="text-[11px] text-ink-500">до {formatDate(t.dueDate)}</p>
                </div>
                <Badge tone={t.status === 'просрочена' ? 'danger' : 'neutral'}>{t.status}</Badge>
              </li>
            ))}
            {myTasks.length === 0 && <li className="px-5 py-6 text-center text-sm text-ink-400">Няма отворени задачи</li>}
          </ul>
        </Card>

        <Card pad={false}>
          <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
            <h2 className="font-bold text-ink-900">Последни съобщения</h2>
            <Link to="/saobshtenia" className="text-[13px] font-semibold text-brand-700 hover:underline">Всички</Link>
          </div>
          <ul className="divide-y divide-ink-100">
            {db.messages.filter((m) => m.toIds.includes(user.id)).slice(0, 5).map((m) => (
              <li key={m.id} className="px-5 py-2.5">
                <div className="flex items-center gap-2">
                  {!m.readBy.includes(user.id) && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                  <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-800">{m.subject}</p>
                  <span className="shrink-0 text-[11px] text-ink-400">{formatDate(m.date)}</span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[12px] text-ink-500">{m.body}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
