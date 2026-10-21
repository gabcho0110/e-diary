import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import {
  ChartCard, DASH, KpiCard, LineChart, RankCard, RankColumn, RankRow, bgNum,
  dayLabel, longLabel, shiftDays, type Point,
} from '../components/charts'

/** Оценките за ниво не влизат в средния успех. */
const LEVEL_TYPES = ['Входно ниво', 'Междинно ниво', 'Изходно ниво']

const WEEK_COUNTS: Record<string, number> = { '1м': 5, '3м': 8, '6м': 12, '1г': 16 }

const localISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Понеделникът на седмицата, в която попада датата. */
function weekStart(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return localISO(d)
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

export default function Nachalo() {
  const { db, user, isStaff, myStudent, myChildren, subjectName, className } = useApp()
  const [period, setPeriod] = useState('3м')

  const isFamily = !isStaff && !!(myStudent ?? myChildren[0])

  // ── общи изчисления ───────────────────────────────────────────────────────
  const realGrades = useMemo(
    () => db.grades.filter((g) => !g.draft && !LEVEL_TYPES.includes(g.type)),
    [db.grades],
  )

  /** Най-късната дата в данните — спрямо нея се строят графиките. */
  const asOf = useMemo(() => {
    let m = ''
    for (const g of db.grades) if (g.date > m) m = g.date
    for (const a of db.absences) if (a.date > m) m = a.date
    for (const l of db.lessonAbsences) if (l.date > m) m = l.date
    return m || localISO(new Date())
  }, [db.grades, db.absences, db.lessonAbsences])

  const today = localISO(new Date())

  /** Седмични кофи, подредени от най-старата към най-новата. */
  const buckets = useMemo(() => {
    const n = WEEK_COUNTS[period] ?? 8
    const end = weekStart(asOf)
    return Array.from({ length: n }, (_, i) => shiftDays(end, -7 * (n - 1 - i)))
  }, [asOf, period])

  /** Среден успех по седмици — при празна седмица се пренася последната стойност. */
  function avgSeries(grades: typeof db.grades): Point[] {
    const overall = mean(grades.map((g) => g.value))
    let last = overall
    return buckets.map((start) => {
      const end = shiftDays(start, 6)
      const inWeek = grades.filter((g) => g.date >= start && g.date <= end)
      if (inWeek.length) last = mean(inWeek.map((g) => g.value))
      return { label: dayLabel(start), value: Number(last.toFixed(2)), tip: longLabel(start) }
    })
  }

  function countSeries(items: { date: string }[]): Point[] {
    return buckets.map((start) => {
      const end = shiftDays(start, 6)
      const n = items.filter((x) => x.date >= start && x.date <= end).length
      return { label: dayLabel(start), value: n, tip: longLabel(start) }
    })
  }

  // ── училищни показатели ───────────────────────────────────────────────────
  const school = useMemo(() => {
    const gByStudent = new Map<string, number[]>()
    for (const g of realGrades) {
      const arr = gByStudent.get(g.studentId)
      if (arr) arr.push(g.value)
      else gByStudent.set(g.studentId, [g.value])
    }

    const absByStudent = new Map<string, { total: number; unexcused: number }>()
    for (const a of db.absences) {
      const cur = absByStudent.get(a.studentId) ?? { total: 0, unexcused: 0 }
      cur.total++
      if (!a.excused) cur.unexcused++
      absByStudent.set(a.studentId, cur)
    }

    const headcount = new Map<string, number>()
    for (const s of db.students) headcount.set(s.classId, (headcount.get(s.classId) ?? 0) + 1)

    const classes = db.classes
      .map((k) => {
        const members = db.students.filter((s) => s.classId === k.id)
        const grades = members.flatMap((s) => gByStudent.get(s.id) ?? [])
        const absences = members.reduce((a, s) => a + (absByStudent.get(s.id)?.total ?? 0), 0)
        const count = headcount.get(k.id) ?? 0
        return {
          id: k.id,
          name: `${k.grade}${k.letter}`,
          avg: mean(grades),
          absPerStudent: count ? absences / count : 0,
          count,
        }
      })
      .filter((c) => c.count > 0)

    const students = db.students.map((s) => {
      const k = db.classes.find((x) => x.id === s.classId)
      const a = absByStudent.get(s.id)
      return {
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        cls: `${k?.grade ?? ''}${k?.letter ?? ''}`,
        avg: mean(gByStudent.get(s.id) ?? []),
        grades: (gByStudent.get(s.id) ?? []).length,
        abs: a?.total ?? 0,
        unexcused: a?.unexcused ?? 0,
      }
    })

    // активност на учителите — оценки + отсъствия + отзиви + съобщения
    const activity = new Map<string, number>()
    const bump = (id: string, n = 1) => activity.set(id, (activity.get(id) ?? 0) + n)
    for (const g of db.grades) bump(g.teacherId)
    for (const a of db.absences) bump(a.teacherId)
    for (const n of db.notes) bump(n.teacherId)
    for (const m of db.messages) bump(m.fromId)

    const teachers = db.users
      .filter((u) => u.roles.some((r) => r === 'teacher'))
      .map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        score: activity.get(u.id) ?? 0,
      }))
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score)

    // взети занятия — съпоставя планираните часове за 4 седмици с невзетите
    const plannedPerWeek = db.schedule.length
    const windowFrom = shiftDays(asOf, -27)
    const missed = db.lessonAbsences.filter((l) => l.date >= windowFrom && l.date <= asOf).length
    const planned = plannedPerWeek * 4
    const takenPct = planned
      ? Math.max(0, Math.min(100, Math.round(((planned - missed) / planned) * 100)))
      : 100

    return {
      avg: mean(realGrades.map((g) => g.value)),
      gradesCount: realGrades.length,
      absCount: db.absences.length,
      notesCount: db.notes.length,
      eventsCount: db.events.length,
      takenPct,
      classes,
      students,
      teachers,
    }
  }, [db, realGrades, asOf])

  const byClassAvg = useMemo(
    () => [...school.classes].filter((c) => c.avg > 0).sort((a, b) => b.avg - a.avg),
    [school.classes],
  )
  const byClassAbs = useMemo(
    () => [...school.classes].sort((a, b) => a.absPerStudent - b.absPerStudent),
    [school.classes],
  )
  const byStudentAvg = useMemo(
    () => [...school.students].filter((s) => s.grades > 0).sort((a, b) => b.avg - a.avg),
    [school.students],
  )
  const byStudentAbs = useMemo(
    () => [...school.students]
      .filter((s) => s.abs > 0)
      .sort((a, b) => b.abs - a.abs || b.unexcused - a.unexcused || a.avg - b.avg),
    [school.students],
  )

  // ── личен изглед (родител / ученик) ───────────────────────────────────────
  const me = myStudent ?? myChildren[0] ?? null
  const mine = useMemo(() => {
    if (!me) return null
    const grades = realGrades.filter((g) => g.studentId === me.id)
    const absences = db.absences.filter((a) => a.studentId === me.id)
    const notes = db.notes.filter((n) => n.studentId === me.id)
    const subjects = [...new Set(grades.map((g) => g.subjectId))]
      .map((sid) => ({
        id: sid,
        name: subjectName(sid),
        avg: mean(grades.filter((g) => g.subjectId === sid).map((g) => g.value)),
        count: grades.filter((g) => g.subjectId === sid).length,
      }))
      .sort((a, b) => b.avg - a.avg)
    const unexcused = absences.filter((a) => !a.excused).length
    const upcoming = db.events
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6)
    return { grades, absences, notes, subjects, unexcused, upcoming }
  }, [me, realGrades, db.absences, db.notes, db.events, subjectName, today])

  // ── KPI редове ────────────────────────────────────────────────────────────
  const kpis = isFamily && mine
    ? [
        { value: bgNum(mean(mine.grades.map((g) => g.value)), 2), label: 'Моят успех', icon: 'chart', from: DASH.blueLight, to: DASH.blueDark },
        { value: bgNum(mine.grades.length), label: 'Моите оценки', icon: 'check', from: '#25B4C7', to: DASH.cyan },
        { value: bgNum(mine.absences.length), label: 'Моите отсъствия', icon: 'close', from: '#E4504C', to: DASH.red },
        { value: bgNum(mine.notes.length), label: 'Отзиви и забележки', icon: 'star', from: '#9A9A38', to: DASH.olive },
        { value: `${bgNum(mine.absences.length ? Math.round(((mine.absences.length - mine.unexcused) / mine.absences.length) * 100) : 100)}%`, label: 'Извинени отсъствия', icon: 'clock', from: '#F59A3C', to: DASH.orange },
        { value: bgNum(mine.upcoming.length), label: 'Предстоящи събития', icon: 'calendar', from: '#9B72F8', to: DASH.purple },
      ]
    : [
        { value: bgNum(school.avg, 2), label: 'Успех', icon: 'chart', from: DASH.blueLight, to: DASH.blueDark },
        { value: bgNum(school.gradesCount), label: 'Оценки', icon: 'check', from: '#25B4C7', to: DASH.cyan },
        { value: bgNum(school.absCount), label: 'Отсъствия', icon: 'close', from: '#E4504C', to: DASH.red },
        { value: bgNum(school.notesCount), label: 'Отзива', icon: 'star', from: '#9A9A38', to: DASH.olive },
        { value: `${bgNum(school.takenPct)}%`, label: 'Взети занятия тази седмица', icon: 'clock', from: '#F59A3C', to: DASH.orange },
        { value: bgNum(school.eventsCount), label: 'Събития', icon: 'calendar', from: '#9B72F8', to: DASH.purple },
      ]

  const headerName = isFamily && me
    ? `${me.firstName} ${me.lastName} · ${className(me.classId)}`
    : `${db.school.name} · ${db.school.city}`

  return (
    <>
      {/* заглавие */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[15px] font-bold uppercase tracking-wide text-[#2E7DD1]">
            {isFamily ? 'Начало — моят профил' : 'Начало — училищно табло'}
          </h1>
          <p className="text-[12.5px] text-ink-500">
            {headerName} · учебна {db.school.year} · данни към {longLabel(asOf)}
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="mb-4 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* графики */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title={isFamily ? 'Моят среден успех' : 'Среден успех (училище)'}
          icon="chart"
          period={period}
          onPeriod={setPeriod}
        >
          <LineChart
            points={avgSeries(isFamily && mine ? mine.grades : realGrades)}
            color={DASH.orange}
            yLabel="Среден успех"
            seriesLabel={isFamily ? 'Среден успех (аз)' : 'Среден успех (училище)'}
            format={(v) => bgNum(v, 2)}
            height={200}
          />
        </ChartCard>

        <ChartCard
          title={isFamily ? 'Моите отсъствия (по седмици)' : 'Отсъствия (по седмици)'}
          icon="calendar"
          period={period}
          onPeriod={setPeriod}
        >
          <LineChart
            points={countSeries(isFamily && mine ? mine.absences : db.absences)}
            color="#1B9E77"
            yLabel="Бр. отсъствия"
            seriesLabel={isFamily ? 'Мои отсъствия' : 'Отсъствия'}
            format={(v) => bgNum(v)}
            height={200}
          />
        </ChartCard>
      </div>

      {/* класации */}
      {isFamily && mine ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <RankCard title="Моите предмети" icon="list">
            <RankColumn title="Среден успех">
              {mine.subjects.slice(0, 8).map((s, i) => (
                <RankRow key={s.id} label={s.name} value={bgNum(s.avg, 2)} tone={i < 3 ? 'teal' : i >= mine.subjects.slice(0, 8).length - 3 ? 'bad' : 'blue'} />
              ))}
            </RankColumn>
          </RankCard>

          <RankCard title="Последни оценки" icon="check" className="xl:col-span-2">
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              {[...mine.grades].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((g) => (
                <RankRow
                  key={g.id}
                  label={`${subjectName(g.subjectId)} · ${g.type}`}
                  value={`${bgNum(g.value, 2)} · ${dayLabel(g.date)}`}
                  tone={g.value >= 5 ? 'good' : g.value >= 4 ? 'blue' : 'bad'}
                />
              ))}
            </div>
          </RankCard>

          <RankCard title="Предстоящи събития" icon="calendar">
            <div className="space-y-1">
              {mine.upcoming.length === 0 && (
                <p className="py-3 text-center text-[12px] text-ink-400">Няма предстоящи събития.</p>
              )}
              {mine.upcoming.map((e) => (
                <RankRow key={e.id} label={e.title} value={dayLabel(e.date)} tone="soft" icon="calendar" />
              ))}
            </div>
          </RankCard>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <RankCard title="Най-добри паралелки" icon="chart">
            <div className="grid grid-cols-2 gap-3">
              <RankColumn title="Среден успех">
                {byClassAvg.slice(0, 3).map((c) => (
                  <RankRow key={c.id} label={c.name} value={bgNum(c.avg, 2)} tone="good" />
                ))}
                {byClassAvg.slice(-3).reverse().map((c) => (
                  <RankRow key={`w-${c.id}`} label={c.name} value={bgNum(c.avg, 2)} tone="bad" />
                ))}
              </RankColumn>
              <RankColumn title="Отсъствия">
                {byClassAbs.slice(0, 3).map((c) => (
                  <RankRow key={c.id} label={c.name} value={bgNum(c.absPerStudent, 2)} tone="blue" />
                ))}
                {byClassAbs.slice(-3).reverse().map((c) => (
                  <RankRow key={`w-${c.id}`} label={c.name} value={bgNum(c.absPerStudent, 2)} tone="bad" />
                ))}
              </RankColumn>
            </div>
          </RankCard>

          <RankCard title="Най-добри ученици" icon="badge" className="xl:col-span-2">
            <div className="grid grid-cols-2 gap-3">
              <RankColumn title="Среден успех">
                {byStudentAvg.slice(0, 6).map((s) => (
                  <RankRow key={s.id} label={`${s.name} (${s.cls})`} value={bgNum(s.avg, 2)} tone="teal" />
                ))}
              </RankColumn>
              <RankColumn title="Натрупани отсъствия">
                {byStudentAbs.slice(0, 6).map((s) => (
                  <RankRow key={s.id} label={`${s.name} (${s.cls})`} value={bgNum(s.abs, 2)} tone="bad" />
                ))}
              </RankColumn>
            </div>
          </RankCard>

          <RankCard title="Най-активни учители" icon="person">
            <RankColumn title="Оценки, отсъствия, отзиви, съобщения">
              {school.teachers.slice(0, 7).map((t) => (
                <RankRow key={t.id} label={t.name} value={bgNum(t.score)} tone="soft" icon="report" />
              ))}
            </RankColumn>
          </RankCard>
        </div>
      )}

      {/* долен ред */}
      <div className="mt-5 rounded border border-ink-200 bg-white py-2 text-center text-[11.5px] text-ink-400">
        {db.school.name} е администратор на лични данни и притежава сертификат за информационна сигурност.
      </div>
    </>
  )
}
