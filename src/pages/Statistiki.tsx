import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, GradePill, PageHeader, Progress, Select, Stat, Table, avgFmt } from '../components/ui'

export default function Statistiki() {
  const { db, myClasses, myChildren, myStudent, studentsOf, average, subjectName, className, studentName, gradesOf } = useApp()
  const [classId, setClassId] = useState(myClasses[0]?.id ?? '')
  const [subjectId, setSubjectId] = useState('')

  const klass = db.classes.find((c) => c.id === classId)
  const subjects = useMemo(() => (klass ? db.subjects.filter((s) => klass.subjectIds.includes(s.id)) : []), [klass, db.subjects])
  const students = studentsOf(classId)

  // ── изглед за родител / ученик ───────────────────────────────────────────
  const focus = myStudent ?? myChildren[0]
  if (focus && (myStudent || myChildren.length)) {
    const k = db.classes.find((c) => c.id === focus.classId)!
    const subs = db.subjects.filter((s) => k.subjectIds.includes(s.id))
    const myAvg = average(focus.id)
    const rows = subs.map((s) => {
      const gs = gradesOf(focus.id, s.id).filter((g) => !g.draft)
      const real = gs.filter((g) => !['Входно ниво', 'Междинно ниво', 'Изходно ниво'].includes(g.type))
      const avg = real.length ? real.reduce((a, g) => a + g.value, 0) / real.length : null
      const classAvg = (() => {
        const all = studentsOf(k.id).flatMap((st) =>
          gradesOf(st.id, s.id).filter((g) => !g.draft && !['Входно ниво', 'Междинно ниво', 'Изходно ниво'].includes(g.type)).map((g) => g.value),
        )
        return all.length ? all.reduce((a, b) => a + b, 0) / all.length : null
      })()
      const rank = (() => {
        const list = studentsOf(k.id)
          .map((st) => ({ id: st.id, a: average(st.id, s.id) }))
          .filter((x) => x.a !== null)
          .sort((x, y) => (y.a as number) - (x.a as number))
        const idx = list.findIndex((x) => x.id === focus.id)
        return idx >= 0 ? { place: idx + 1, of: list.length } : null
      })()
      return { s, gs, avg, classAvg, rank }
    })

    const levels = ['Входно ниво', 'Междинно ниво', 'Изходно ниво']

    return (
      <>
        <PageHeader
          title="Статистики"
          subtitle={`${focus.firstName} ${focus.lastName} · ${className(focus.classId)}`}
          icon="chart"
        />

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Общ среден успех" value={avgFmt(myAvg)} icon="chart" tone="brand" />
          <Stat label="Оценки" value={rows.reduce((a, r) => a + r.gs.length, 0)} icon="check" tone="ok" />
          <Stat
            label="Предмети над средното"
            value={rows.filter((r) => r.avg !== null && r.classAvg !== null && r.avg >= r.classAvg).length}
            icon="star"
            tone="purple"
            hint={`от ${rows.length} предмета`}
          />
          <Stat
            label="Най-силен предмет"
            value={(() => {
              const best = [...rows].filter((r) => r.avg !== null).sort((a, b) => (b.avg as number) - (a.avg as number))[0]
              return best ? best.s.short : '—'
            })()}
            icon="trophy"
            tone="warn"
          />
        </div>

        <Card pad={false} className="mb-5">
          <div className="border-b border-ink-200 px-5 py-3.5"><h2 className="font-bold text-ink-900">Успех по предмети и място в класа</h2></div>
          <Table head={<><th className="th">Предмет</th><th className="th">Оценки</th><th className="th w-24">Моят успех</th><th className="th w-28">Средно в класа</th><th className="th w-32">Място</th></>}>
            {rows.map(({ s, gs, avg, classAvg, rank }) => (
              <tr key={s.id} className="hover:bg-ink-50/60">
                <td className="td font-medium">{s.name}</td>
                <td className="td">
                  <div className="flex flex-wrap gap-1">
                    {gs.map((g) => <GradePill key={g.id} value={g.value} title={g.type} />)}
                    {gs.length === 0 && <span className="text-ink-400">—</span>}
                  </div>
                </td>
                <td className="td font-bold">{avgFmt(avg)}</td>
                <td className="td text-ink-500">{avgFmt(classAvg)}</td>
                <td className="td">
                  {rank ? (
                    <div className="flex items-center gap-2">
                      <Badge tone={rank.place <= 3 ? 'ok' : 'neutral'}>{rank.place} от {rank.of}</Badge>
                    </div>
                  ) : <span className="text-ink-400">—</span>}
                </td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card pad={false}>
          <div className="border-b border-ink-200 px-5 py-3.5"><h2 className="font-bold text-ink-900">Нива на постижения</h2></div>
          <div className="p-5">
            <div className="space-y-4">
              {levels.map((lvl) => (
                <div key={lvl}>
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-ink-700">{lvl}</span>
                    <span className="text-ink-500">
                      {subjects.map((s) => {
                        const g = gradesOf(focus.id, s.id).find((x) => x.type === lvl)
                        return g ? `${s.short}: ${g.value}` : null
                      }).filter(Boolean).join(' · ') || 'няма данни'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {subjects.map((s) => {
                      const g = gradesOf(focus.id, s.id).find((x) => x.type === lvl)
                      return (
                        <div key={s.id} className="flex-1">
                          <Progress value={g?.value ?? 0} max={6} tone={g && g.value >= 5 ? 'ok' : g && g.value <= 3 ? 'danger' : 'brand'} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </>
    )
  }

  // ── изглед за учител / администрация ─────────────────────────────────────
  if (!myClasses.length) return <EmptyState title="Няма достъпни паралелки" icon="chart" />

  const dist = [2, 3, 4, 5, 6].map((v) => ({
    v,
    n: db.grades.filter((g) => g.classId === classId && (!subjectId || g.subjectId === subjectId) && !g.draft && Math.round(g.value) === v).length,
  }))
  const total = dist.reduce((a, d) => a + d.n, 0)

  const classAverages = students
    .map((s) => ({ s, avg: average(s.id, subjectId || undefined) }))
    .filter((x) => x.avg !== null)
    .sort((a, b) => (b.avg as number) - (a.avg as number))

  const subjectRanking = subjects
    .map((s) => {
      const vals = db.grades
        .filter((g) => g.classId === classId && g.subjectId === s.id && !g.draft && !['Входно ниво', 'Междинно ниво', 'Изходно ниво'].includes(g.type))
        .map((g) => g.value)
      return { s, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, n: vals.length }
    })
    .filter((r) => r.avg !== null)
    .sort((a, b) => (b.avg as number) - (a.avg as number))

  const overall = classAverages.length
    ? classAverages.reduce((a, x) => a + (x.avg as number), 0) / classAverages.length
    : null

  return (
    <>
      <PageHeader
        title="Статистики"
        subtitle="Успех по предмети, разпределение на оценките и класация на учениците."
        icon="chart"
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId('') }} className="w-auto min-w-[130px]">
              {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-auto min-w-[160px]">
              <option value="">Всички предмети</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Среден успех" value={avgFmt(overall)} icon="chart" tone="brand" />
        <Stat label="Ученици" value={students.length} icon="person" tone="ok" />
        <Stat label="Оценки" value={total} icon="check" tone="purple" />
        <Stat
          label="Слаб успех (2–3)"
          value={dist[0].n + dist[1].n}
          icon="warn"
          tone="danger"
          hint={`${total ? (((dist[0].n + dist[1].n) / total) * 100).toFixed(1) : 0}% от всички`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card pad={false}>
          <div className="border-b border-ink-200 px-5 py-3.5"><h2 className="font-bold text-ink-900">Разпределение на оценките</h2></div>
          <div className="space-y-3 p-5">
            {dist.map((d) => (
              <div key={d.v}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-ink-700">Оценка {d.v}</span>
                  <span className="text-ink-500">{d.n} бр. ({total ? ((d.n / total) * 100).toFixed(1) : 0}%)</span>
                </div>
                <Progress value={d.n} max={Math.max(1, ...dist.map((x) => x.n))} tone={d.v >= 5 ? 'ok' : d.v <= 3 ? 'danger' : 'brand'} />
              </div>
            ))}
          </div>
        </Card>

        <Card pad={false}>
          <div className="border-b border-ink-200 px-5 py-3.5"><h2 className="font-bold text-ink-900">Среден успех по предмети</h2></div>
          <Table head={<><th className="th">Предмет</th><th className="th w-24">Среден</th><th className="th w-20">Оценки</th><th className="th w-40">Спрямо 6.00</th></>}>
            {subjectRanking.map(({ s, avg, n }) => (
              <tr key={s.id} className="hover:bg-ink-50/60">
                <td className="td font-medium">{s.name}</td>
                <td className="td font-bold">{avgFmt(avg)}</td>
                <td className="td text-ink-500">{n}</td>
                <td className="td"><Progress value={avg ?? 0} max={6} tone={(avg ?? 0) >= 5 ? 'ok' : (avg ?? 0) <= 3.5 ? 'warn' : 'brand'} /></td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <div className="mt-5">
        <Card pad={false}>
          <div className="border-b border-ink-200 px-5 py-3.5">
            <h2 className="font-bold text-ink-900">Класация на учениците{subjectId ? ` — ${subjectName(subjectId)}` : ''}</h2>
          </div>
          <Table head={<><th className="th w-16">Място</th><th className="th w-12">№</th><th className="th">Ученик</th><th className="th w-28">Среден успех</th></>}>
            {classAverages.map(({ s, avg }, i) => (
              <tr key={s.id} className="hover:bg-ink-50/60">
                <td className="td">
                  <Badge tone={i < 3 ? 'ok' : 'neutral'}>{i + 1}</Badge>
                </td>
                <td className="td font-bold text-ink-400">{s.number}</td>
                <td className="td font-medium">{studentName(s.id)}</td>
                <td className="td font-bold">{avgFmt(avg)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  )
}
