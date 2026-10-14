import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, Select, Stat, Table, Tabs, Textarea, formatDate } from '../components/ui'

export default function Ifo() {
  const { db, myClasses, update, user, studentName, subjectName, className, studentsOf } = useApp()
  const [tab, setTab] = useState('ifo')
  const [open, setOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const diaries = db.ifoDiaries
  const senStudents = db.students.filter((s) => s.sen)
  const current = diaries.find((d) => d.id === detailId)

  const [form, setForm] = useState({
    studentId: '', subjectId: db.subjects[0]?.id ?? '', kind: 'ИФО' as 'ИФО' | 'ДПЛР',
    day: 2, period: 6,
  })

  const totalEntries = diaries.reduce((a, d) => a + d.entries.length, 0)

  return (
    <>
      <PageHeader
        title="ИФО и ДПЛР"
        subtitle="Индивидуални форми на обучение и дневници за дейности за подкрепа за личностно развитие."
        icon="heart"
        actions={<button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Нов дневник</button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Дневници" value={diaries.length} icon="heart" />
        <Stat label="Ученици със СОП" value={senStudents.length} icon="user" tone="purple" />
        <Stat label="Записани занятия" value={totalEntries} icon="check" tone="ok" />
        <Stat label="Ученици в ИФО" value={db.students.filter((s) => s.ifo).length} icon="report" tone="brand" />
      </div>

      <Tabs
        tabs={[
          { id: 'ifo', label: 'Индивидуални дневници', count: diaries.filter((d) => d.kind === 'ИФО').length },
          { id: 'dplr', label: 'ДПЛР', count: diaries.filter((d) => d.kind === 'ДПЛР').length },
          { id: 'sen', label: 'Ученици със СОП', count: senStudents.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab !== 'sen' && (
        <>
          <Table
            head={<><th className="th">Ученик</th><th className="th">Предмет</th><th className="th w-32">Вид</th><th className="th w-32">Разписание</th><th className="th w-28">Занятия</th><th className="th w-24"></th></>}
          >
            {diaries.filter((d) => (tab === 'ifo' ? d.kind === 'ИФО' : d.kind === 'ДПЛР')).map((d) => (
              <tr key={d.id} className="hover:bg-ink-50/60">
                <td className="td font-medium">{studentName(d.studentId)}</td>
                <td className="td text-[13px]">{subjectName(d.subjectId)}</td>
                <td className="td"><Badge tone={d.kind === 'ИФО' ? 'brand' : 'purple'}>{d.kind}</Badge></td>
                <td className="td text-[12px] text-ink-500">
                  {d.schedule.map((s) => `${['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт'][s.day]} ${s.period} ч.`).join(', ')}
                </td>
                <td className="td">{d.entries.length}</td>
                <td className="td">
                  <button onClick={() => setDetailId(d.id)} className="text-[12px] font-semibold text-brand-700 hover:underline">Отвори</button>
                </td>
              </tr>
            ))}
          </Table>
          {diaries.filter((d) => (tab === 'ifo' ? d.kind === 'ИФО' : d.kind === 'ДПЛР')).length === 0 && (
            <EmptyState title="Няма дневници" icon="heart" />
          )}
        </>
      )}

      {tab === 'sen' && (
        <Table head={<><th className="th">Ученик</th><th className="th">Паралелка</th><th className="th">Основание</th><th className="th w-24">ИФО</th><th className="th w-24">ЦДО</th><th className="th w-32">Ресурсен учител</th></>}>
          {senStudents.map((s) => (
            <tr key={s.id} className="hover:bg-ink-50/60">
              <td className="td font-medium">{s.firstName} {s.lastName}</td>
              <td className="td">{className(s.classId)}</td>
              <td className="td text-[13px] text-ink-600">{s.senNote ?? '—'}</td>
              <td className="td">
                <button
                  onClick={() => update((d) => {
                    const x = d.students.find((y) => y.id === s.id)
                    if (x) x.ifo = !x.ifo
                  })}
                  className={`chip ${s.ifo ? 'bg-brand-50 text-brand-700' : 'bg-ink-100 text-ink-500'}`}
                >
                  {s.ifo ? 'да' : 'не'}
                </button>
              </td>
              <td className="td">{s.cdo ? <Badge tone="neutral">да</Badge> : <span className="text-ink-400">не</span>}</td>
              <td className="td text-[13px]">{db.users.find((u) => u.roles.includes('resource_teacher'))?.lastName ?? '—'}</td>
            </tr>
          ))}
        </Table>
      )}

      <Modal
        open={!!detailId} onClose={() => setDetailId(null)} wide
        title={`Дневник — ${current ? studentName(current.studentId) : ''}`}
        footer={current && (
          <button
            onClick={() => update((d) => {
              const x = d.ifoDiaries.find((y) => y.id === current.id)
              x?.entries.push({
                date: new Date().toISOString().slice(0, 10),
                topic: 'Ново занятие', hours: 1,
              })
            })}
            className="btn-primary"
          >
            <Icon name="plus" size={14} /> Добави занятие
          </button>
        )}
      >
        {current && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone={current.kind === 'ИФО' ? 'brand' : 'purple'}>{current.kind}</Badge>
              <span className="text-[12px] text-ink-500">
                {subjectName(current.subjectId)} · ресурсен учител: {db.users.find((u) => u.id === current.teacherId)?.lastName}
              </span>
            </div>

            <Table head={<><th className="th w-28">Дата</th><th className="th">Тема на занятието</th><th className="th w-24">Часове</th></>}>
              {current.entries.map((e, i) => (
                <tr key={i}>
                  <td className="td text-[12px] text-ink-500">{formatDate(e.date)}</td>
                  <td className="td">
                    <Input
                      defaultValue={e.topic}
                      onBlur={(ev) => update((d) => {
                        const x = d.ifoDiaries.find((y) => y.id === current.id)
                        if (x) x.entries[i].topic = ev.target.value
                      })}
                      className="!py-1 text-[13px]"
                    />
                  </td>
                  <td className="td">{e.hours}</td>
                </tr>
              ))}
            </Table>

            <div className="mt-4">
              <Field label="Бележки към дневника">
                <Textarea placeholder="Напредък, препоръки и наблюдения…" />
              </Field>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={open} onClose={() => setOpen(false)} title="Нов дневник"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!form.studentId || !user) return
                update((d) => {
                  d.ifoDiaries.push({
                    id: `ifo_${Date.now()}`, studentId: form.studentId, subjectId: form.subjectId,
                    teacherId: user.id, kind: form.kind,
                    schedule: [{ day: form.day, period: form.period }], entries: [],
                  })
                })
                setOpen(false)
              }}
              className="btn-primary"
            >
              Създай
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Ученик" hint="Показани са учениците със СОП.">
              <Select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
                <option value="">— изберете —</option>
                {senStudents.map((s) => (
                  <option key={s.id} value={s.id}>{className(s.classId)} · {s.firstName} {s.lastName}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Предмет">
            <Select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              {db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Вид">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as 'ИФО' | 'ДПЛР' })}>
              <option value="ИФО">ИФО — индивидуална форма на обучение</option>
              <option value="ДПЛР">ДПЛР — дейности за подкрепа за личностно развитие</option>
            </Select>
          </Field>
          <Field label="Ден">
            <Select value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}>
              <option value={1}>Понеделник</option><option value={2}>Вторник</option>
              <option value={3}>Сряда</option><option value={4}>Четвъртък</option><option value={5}>Петък</option>
            </Select>
          </Field>
          <Field label="Час №"><Input type="number" min={1} max={7} value={form.period} onChange={(e) => setForm({ ...form, period: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </>
  )
}
