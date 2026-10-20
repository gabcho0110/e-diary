import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { PageHeader, Select, Table } from '../../components/ui'
import { Dash, EmptyRow, ListHead, ToolBtn, Toolbar } from './shared'

const DAYS = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя']
const PERIODS = [1, 2, 3, 4, 5, 6, 7]

/** „Седмични разписания" — седмичната мрежа на избраната паралелка. */
export function Razpisania() {
  const { db } = useApp()
  const [classId, setClassId] = useState(db.classes[0]?.id ?? '')
  const entries = db.schedule.filter((s) => s.classId === classId)
  const cell = (day: number, period: number) => entries.find((s) => s.day === day && s.period === period)

  return (
    <>
      <PageHeader title="Седмични разписания" subtitle="Разписанието, което се вижда в модул „Дневник“ → раздел „Разписание“." icon="calendar" />

      <ListHead icon="calendar" title="Седмично разписание" count={entries.length} />

      <Toolbar>
        <ToolBtn tone="blue" icon="grid">Печат</ToolBtn>
      </Toolbar>

      <div className="mb-3">
        <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-auto min-w-[180px]">
          {db.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      <Table
        head={
          <>
            <th className="th w-20">Час</th>
            {DAYS.slice(0, 6).map((d) => <th key={d} className="th">{d}</th>)}
          </>
        }
      >
        {PERIODS.map((p) => (
          <tr key={p}>
            <td className="td font-semibold text-ink-500">{p}.</td>
            {DAYS.slice(0, 6).map((_, i) => {
              const e = cell(i + 1, p)
              const subject = e ? db.subjects.find((s) => s.id === e.subjectId) : undefined
              const teacher = e ? db.users.find((u) => u.id === e.teacherId) : undefined
              return (
                <td key={i} className="td text-[12px]">
                  {e ? (
                    <span>
                      <span className="font-semibold text-ink-800">{subject?.short ?? '—'}</span>
                      <span className="block text-[11px] text-ink-500">
                        {teacher ? `${teacher.firstName.charAt(0)}. ${teacher.lastName}` : ''}
                      </span>
                    </span>
                  ) : (
                    <span className="text-ink-300">—</span>
                  )}
                </td>
              )
            })}
          </tr>
        ))}
        {!entries.length && <EmptyRow colSpan={7} text="За тази паралелка още няма въведено разписание." />}
      </Table>
    </>
  )
}

/** „Дневни режими" — организацията на учебния ден по паралелки. */
export function Rezhimi() {
  const { db } = useApp()
  const rows = useMemo(
    () => [...db.classes].sort((a, b) => a.name.localeCompare(b.name, 'bg')),
    [db.classes],
  )

  return (
    <>
      <PageHeader title="Дневни режими" subtitle="Коя паралелка в коя смяна и с каква организация на учебния ден работи." icon="clock" />

      <Table
        head={
          <>
            <th className="th">Паралелка</th>
            <th className="th">Организация на учебния ден</th>
            <th className="th w-28">Смяна</th>
            <th className="th w-28">Часове</th>
            <th className="th">Форма на обучение</th>
          </>
        }
      >
        {rows.map((k) => {
          const hours = db.schedule.filter((s) => s.classId === k.id).length
          return (
            <tr key={k.id} className="hover:bg-[#f6fafd]">
              <td className="td font-semibold">{k.name}</td>
              <td className="td text-[12.5px]"><Dash>{k.dayOrg}</Dash></td>
              <td className="td">{k.shift}</td>
              <td className="td"><span className="dn-num dn-olive">{hours}</span></td>
              <td className="td text-[12.5px]"><Dash>{k.educationForm}</Dash></td>
            </tr>
          )
        })}
        {!rows.length && <EmptyRow colSpan={5} text="Няма паралелки." />}
      </Table>
    </>
  )
}

/** „Шаблони" — готови рамки за разписание. */
export function Shabloni() {
  const { db } = useApp()
  const names = useMemo(() => {
    const set = new Set<string>()
    db.schedule.forEach((s) => { if (s.planName) set.add(s.planName) })
    return [...set]
  }, [db.schedule])

  const templates = [
    { name: 'Основен шаблон', desc: 'Присъствено обучение, първа смяна, 7 часа на ден.', used: db.classes.filter((c) => (c.dayOrg ?? '') === 'Първа смяна').length },
    { name: 'Четни / нечетни седмици', desc: 'Две разписания, които се редуват през седмица.', used: db.schedule.filter((s) => s.week === 'even' || s.week === 'odd').length },
    { name: 'ОРЕС / онлайн обучение', desc: 'Часове, които се провеждат дистанционно.', used: db.schedule.filter((s) => s.studyKind === 'Онлайн обучение').length },
    { name: 'Разделяне на групи', desc: 'Един час, разделен на две групи (напр. БЕЛ и чужд език).', used: db.schedule.filter((s) => (s.groups?.length ?? 0) > 0).length },
  ]

  return (
    <>
      <PageHeader title="Шаблони" subtitle="Готови рамки за седмично разписание и за дневния режим." icon="clipboard" />

      <Table
        head={
          <>
            <th className="th">Шаблон</th>
            <th className="th">Описание</th>
            <th className="th w-32">Използван</th>
          </>
        }
      >
        {templates.map((t) => (
          <tr key={t.name} className="hover:bg-[#f6fafd]">
            <td className="td font-semibold">{t.name}</td>
            <td className="td text-[12.5px] text-ink-600">{t.desc}</td>
            <td className="td"><span className="dn-num dn-olive">{t.used}</span></td>
          </tr>
        ))}
        {names.map((n) => (
          <tr key={n} className="hover:bg-[#f6fafd]">
            <td className="td font-semibold">{n}</td>
            <td className="td text-[12.5px] text-ink-600">Разписание, запазено в паралелките.</td>
            <td className="td">
              <span className="dn-num dn-olive">{db.schedule.filter((s) => s.planName === n).length}</span>
            </td>
          </tr>
        ))}
      </Table>
    </>
  )
}
