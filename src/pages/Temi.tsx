import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, Select, Stat, Table, Textarea, formatDate } from '../components/ui'

export default function Temi() {
  const { db, myClasses, mySubjects, update, user, className, subjectName } = useApp()
  const [classId, setClassId] = useState(myClasses[0]?.id ?? '')
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ subjectId: mySubjects[0]?.id ?? '', rows: [] as { no: number; topic: string; hours: number; month: string; taken: boolean; date?: string }[] })

  const plans = db.themePlans.filter((p) => p.classId === classId)
  const current = db.themePlans.find((p) => p.id === editId)

  const takenHours = plans.reduce((a, p) => a + p.rows.filter((r) => r.taken).reduce((x, r) => x + r.hours, 0), 0)
  const totalHours = plans.reduce((a, p) => a + p.rows.reduce((x, r) => x + r.hours, 0), 0)

  return (
    <>
      <PageHeader
        title="Тематични разпределения"
        subtitle="Годишни разпределения по предмети — ръчно, от файл, от минала година или в група."
        icon="list"
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-auto min-w-[130px]">
              {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Ново разпределение</button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Разпределения" value={plans.length} icon="list" />
        <Stat label="Общо часове" value={totalHours} icon="clock" />
        <Stat label="Взети часове" value={takenHours} icon="check" tone="ok" />
        <Stat label="Оставащи" value={totalHours - takenHours} icon="warn" tone="warn" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => alert('Шаблон за тематично разпределение (по Наредба № 5) е готов за изтегляне.')} className="btn-ghost">
          <Icon name="download" size={15} /> Шаблон
        </button>
        <button onClick={() => alert('Качване от файл (.docx / .xlsx) — изберете файл с колони: №, тема, часове, месец.')} className="btn-ghost">
          <Icon name="upload" size={15} /> От файл
        </button>
        <button onClick={() => alert('Използване на разпределение от предходна учебна година — ще се копира с актуализирани дати.')} className="btn-ghost">
          <Icon name="sync" size={15} /> От минала година
        </button>
      </div>

      {plans.length === 0 ? (
        <EmptyState title="Няма разпределения" text={`За ${className(classId)} още не е създадено тематично разпределение.`} icon="list" />
      ) : (
        <div className="space-y-5">
          {plans.map((p) => (
            <Card key={p.id} pad={false}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-200 px-5 py-3.5">
                <div>
                  <h2 className="font-bold text-ink-900">{subjectName(p.subjectId)}</h2>
                  <p className="text-[12px] text-ink-500">
                    {className(p.classId)} · учебна {p.year} · {db.users.find((u) => u.id === p.teacherId)?.firstName} {db.users.find((u) => u.id === p.teacherId)?.lastName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="ok">{p.rows.filter((r) => r.taken).length} взети</Badge>
                  <Badge tone="neutral">{p.rows.length} теми</Badge>
                  <button onClick={() => setEditId(p.id)} className="text-ink-400 hover:text-brand-700"><Icon name="edit" size={15} /></button>
                </div>
              </div>
              <Table head={<><th className="th w-12">№</th><th className="th">Тема</th><th className="th w-20">Часове</th><th className="th w-28">Месец</th><th className="th w-28">Дата</th><th className="th w-28">Състояние</th></>}>
                {p.rows.map((r) => (
                  <tr key={r.no} className="hover:bg-ink-50/60">
                    <td className="td font-bold text-ink-400">{r.no}</td>
                    <td className="td">{r.topic}</td>
                    <td className="td">{r.hours}</td>
                    <td className="td text-ink-500">{r.month}</td>
                    <td className="td text-[12px] text-ink-500">{r.date ? formatDate(r.date) : '—'}</td>
                    <td className="td">
                      <button
                        onClick={() => update((d) => {
                          const pl = d.themePlans.find((x) => x.id === p.id)
                          if (pl) {
                            const row = pl.rows.find((x) => x.no === r.no)
                            if (row) {
                              row.taken = !row.taken
                              row.date = row.taken ? new Date().toISOString().slice(0, 10) : undefined
                            }
                          }
                        })}
                        className={`chip ${r.taken ? 'bg-[#e6f4ea] text-[#1f7a45]' : 'bg-ink-100 text-ink-500'}`}
                      >
                        {r.taken ? 'взета' : 'невзета'}
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open} onClose={() => setOpen(false)} wide title="Ново тематично разпределение"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!form.rows.length || !user) return
                update((d) => {
                  d.themePlans.push({
                    id: `thm_${Date.now()}`, subjectId: form.subjectId, classId,
                    teacherId: user.id, year: d.school.year, rows: form.rows,
                  })
                })
                setForm({ subjectId: mySubjects[0]?.id ?? '', rows: [] })
                setOpen(false)
              }}
              className="btn-primary"
            >
              Създай
            </button>
          </>
        }
      >
        <Field label="Предмет">
          <Select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
            {mySubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">Теми</p>
            <button
              onClick={() => setForm({
                ...form,
                rows: [...form.rows, { no: form.rows.length + 1, topic: '', hours: 2, month: 'Септември', taken: false }],
              })}
              className="btn-ghost !py-1.5 text-[12px]"
            >
              <Icon name="plus" size={13} /> Добави тема
            </button>
          </div>
          <div className="space-y-2">
            {form.rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-[12px] font-bold text-ink-400">{r.no}</span>
                <Input
                  value={r.topic}
                  onChange={(e) => {
                    const rows = [...form.rows]
                    rows[i] = { ...r, topic: e.target.value }
                    setForm({ ...form, rows })
                  }}
                  placeholder="Тема"
                />
                <Input
                  type="number"
                  value={r.hours}
                  onChange={(e) => {
                    const rows = [...form.rows]
                    rows[i] = { ...r, hours: Number(e.target.value) }
                    setForm({ ...form, rows })
                  }}
                  className="w-20 shrink-0"
                />
                <Select
                  value={r.month}
                  onChange={(e) => {
                    const rows = [...form.rows]
                    rows[i] = { ...r, month: e.target.value }
                    setForm({ ...form, rows })
                  }}
                  className="w-36 shrink-0"
                >
                  {['Септември', 'Октомври', 'Ноември', 'Декември', 'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни'].map((m) => <option key={m}>{m}</option>)}
                </Select>
                <button onClick={() => setForm({ ...form, rows: form.rows.filter((_, x) => x !== i) })} className="shrink-0 text-ink-300 hover:text-danger">
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!current} onClose={() => setEditId(null)} title="Редакция на разпределение"
        footer={<button onClick={() => setEditId(null)} className="btn-primary">Готово</button>}
      >
        {current && (
          <div className="space-y-3">
            <Field label="Бележка към разпределението">
              <Textarea
                defaultValue={`Разпределение по ${subjectName(current.subjectId)} за ${className(current.classId)}.`}
                onBlur={(e) => update((d) => {
                  const p = d.themePlans.find((x) => x.id === current.id)
                  if (p) p.file = e.target.value
                })}
              />
            </Field>
            <p className="text-[13px] text-ink-500">
              Отметките „взета / невзета“ се управляват директно от таблицата с теми.
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}
