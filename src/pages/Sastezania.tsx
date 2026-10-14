import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, Select, Stat, Table, formatDate } from '../components/ui'

export default function Sastezania() {
  const { db, myClasses, update, user, className, subjectName, studentName, studentsOf } = useApp()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)
  const [addRes, setAddRes] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', subjectId: db.subjects[0]?.id ?? '', date: new Date().toISOString().slice(0, 10), place: '', level: 'училищен' as const, active: true })

  const comps = db.competitions
  const current = comps.find((c) => c.id === detail)

  return (
    <>
      <PageHeader
        title="Състезания"
        subtitle="Училищни, общински, областни, национални и международни състезания и резултати."
        icon="trophy"
        actions={<button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Ново състезание</button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Състезания" value={comps.length} icon="trophy" />
        <Stat label="Активни" value={comps.filter((c) => c.active).length} icon="spark" tone="ok" />
        <Stat label="Участници" value={comps.reduce((a, c) => a + c.results.length, 0)} icon="person" tone="brand" />
        <Stat label="Национални" value={comps.filter((c) => c.level === 'национален' || c.level === 'международен').length} icon="star" tone="purple" />
      </div>

      {comps.length === 0 ? (
        <EmptyState title="Няма състезания" icon="trophy" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {comps.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <div className="mb-3 flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#fdf7e0] text-[#8a6d05]"><Icon name="trophy" size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-900">{c.name}</p>
                  <p className="text-[11px] text-ink-500">{subjectName(c.subjectId)} · {formatDate(c.date)}</p>
                </div>
                <Badge tone={c.active ? 'ok' : 'neutral'}>{c.active ? 'активно' : 'приключило'}</Badge>
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[12px]">
                <Badge tone="brand">{c.level}</Badge>
                <span className="text-ink-500">{c.place}</span>
              </div>
              <div className="mt-auto flex items-center gap-2 border-t border-ink-100 pt-3">
                <span className="text-[12px] text-ink-500">{c.results.length} участници</span>
                <button onClick={() => setDetail(c.id)} className="ml-auto text-[12px] font-semibold text-brand-700 hover:underline">Резултати</button>
                <button onClick={() => setAddRes(c.id)} className="text-[12px] font-semibold text-brand-700 hover:underline">Добави</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} wide title={current?.name ?? ''}>
        {current && (
          <Table head={<><th className="th w-16">Място</th><th className="th">Ученик</th><th className="th">Паралелка</th><th className="th w-24">Точки</th></>}>
            {[...current.results].sort((a, b) => a.place - b.place).map((r) => (
              <tr key={r.studentId}>
                <td className="td"><Badge tone={r.place <= 3 ? 'ok' : 'neutral'}>{r.place}</Badge></td>
                <td className="td font-medium">{studentName(r.studentId)}</td>
                <td className="td text-[13px] text-ink-500">{className(db.students.find((s) => s.id === r.studentId)?.classId ?? '')}</td>
                <td className="td font-bold">{r.points}</td>
              </tr>
            ))}
          </Table>
        )}
      </Modal>

      <Modal
        open={open} onClose={() => setOpen(false)} title="Ново състезание"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!form.name) return
                update((d) => { d.competitions.push({ id: `cmp_${Date.now()}`, ...form, results: [] }) })
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
            <Field label="Наименование"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          </div>
          <Field label="Предмет">
            <Select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              {db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Ниво">
            <Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as typeof form.level })}>
              <option value="училищен">Училищен</option><option value="общински">Общински</option>
              <option value="областен">Областен</option><option value="национален">Национален</option>
              <option value="международен">Международен</option>
            </Select>
          </Field>
          <Field label="Дата"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Място"><Input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal
        open={!!addRes} onClose={() => setAddRes(null)} wide title="Добавяне на резултати"
        footer={<button onClick={() => setAddRes(null)} className="btn-primary">Готово</button>}
      >
        {addRes && (() => {
          const c = comps.find((x) => x.id === addRes)
          if (!c) return null
          const all = myClasses.flatMap((k) => studentsOf(k.id).map((s) => ({ s, k })))
          return (
            <div className="max-h-[420px] space-y-1 overflow-y-auto">
              {all.slice(0, 120).map(({ s, k }) => {
                const has = c.results.find((r) => r.studentId === s.id)
                return (
                  <div key={s.id} className="flex items-center gap-2 rounded-md border border-ink-100 px-3 py-1.5 text-[13px]">
                    <input
                      type="checkbox"
                      checked={!!has}
                      onChange={() => update((d) => {
                        const cc = d.competitions.find((x) => x.id === addRes)
                        if (!cc) return
                        cc.results = has
                          ? cc.results.filter((r) => r.studentId !== s.id)
                          : [...cc.results, { studentId: s.id, place: cc.results.length + 1, points: 50 }]
                      })}
                      className="h-4 w-4 shrink-0 rounded"
                    />
                    <span className="min-w-0 flex-1 truncate">{s.firstName} {s.lastName}</span>
                    <span className="shrink-0 text-[11px] text-ink-400">{k.name}</span>
                    {has && (
                      <>
                        <Input
                          type="number"
                          value={has.place}
                          onChange={(e) => update((d) => {
                            const cc = d.competitions.find((x) => x.id === addRes)
                            const r = cc?.results.find((x) => x.studentId === s.id)
                            if (r) r.place = Number(e.target.value)
                          })}
                          className="w-16 shrink-0 !py-1"
                        />
                        <Input
                          type="number"
                          value={has.points}
                          onChange={(e) => update((d) => {
                            const cc = d.competitions.find((x) => x.id === addRes)
                            const r = cc?.results.find((x) => x.studentId === s.id)
                            if (r) r.points = Number(e.target.value)
                          })}
                          className="w-20 shrink-0 !py-1"
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}
      </Modal>
    </>
  )
}
