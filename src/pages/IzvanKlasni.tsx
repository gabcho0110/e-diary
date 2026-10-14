import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, Select, Stat, Table, Tabs } from '../components/ui'

export default function IzvanKlasni() {
  const { db, myClasses, mySubjects, update, user, className, subjectName, studentName, studentsOf, myStudent, myChildren } = useApp()
  const [tab, setTab] = useState('list')
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)
  const [addPart, setAddPart] = useState<string | null>(null)

  const isFamily = user?.roles.includes('parent') || user?.roles.includes('student')
  const focus = myStudent ?? myChildren[0]

  const activities = isFamily && focus
    ? db.activities.filter((a) => a.participantIds.includes(focus.id))
    : db.activities

  const current = db.activities.find((a) => a.id === detail)

  const [form, setForm] = useState({
    name: '', kind: 'клуб' as const, classIds: [myClasses[0]?.id ?? ''],
    schedule: 'вторник 14:30', room: '',
  })

  const totalParticipants = activities.reduce((a, x) => a + x.participantIds.length, 0)

  return (
    <>
      <PageHeader
        title="Извънкласни дейности"
        subtitle="Клубове, спорт, изкуство, проекти и дейности за подкрепа за личностно развитие."
        icon="star"
        actions={
          !isFamily ? (
            <button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Нова дейност</button>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Дейности" value={activities.length} icon="star" />
        <Stat label="Участници" value={totalParticipants} icon="person" tone="ok" />
        <Stat label="Клубове" value={activities.filter((a) => a.kind === 'клуб').length} icon="spark" tone="purple" />
        <Stat label="ДПЛР" value={activities.filter((a) => a.kind === 'ДПЛР').length} icon="heart" tone="warn" />
      </div>

      <Tabs
        tabs={[
          { id: 'list', label: 'Дейности', count: activities.length },
          { id: 'participants', label: 'Участници' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'list' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activities.map((a) => (
            <Card key={a.id} className="flex flex-col">
              <div className="mb-3 flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f1eafe] text-[#6b21a8]">
                  <Icon name={a.kind === 'спорт' ? 'trophy' : a.kind === 'изкуство' ? 'star' : 'spark'} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-900">{a.name}</p>
                  <p className="text-[11px] text-ink-500">{a.schedule}{a.room ? ` · ${a.room}` : ''}</p>
                </div>
                <Badge tone="purple">{a.kind}</Badge>
              </div>
              <p className="mb-3 text-[12px] text-ink-500">
                Ръководител: {db.users.find((u) => u.id === a.leaderId)?.firstName} {db.users.find((u) => u.id === a.leaderId)?.lastName}
              </p>
              <div className="mt-auto flex items-center gap-2 border-t border-ink-100 pt-3">
                <span className="text-[12px] text-ink-500">{a.participantIds.length} участници</span>
                <button onClick={() => setDetail(a.id)} className="ml-auto text-[12px] font-semibold text-brand-700 hover:underline">Детайли</button>
                {!isFamily && (
                  <button onClick={() => setAddPart(a.id)} className="text-[12px] font-semibold text-brand-700 hover:underline">Участници</button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'participants' && (
        <Table head={<><th className="th">Дейност</th><th className="th">Вид</th><th className="th">Ръководител</th><th className="th w-28">Участници</th><th className="th">График</th></>}>
          {activities.map((a) => (
            <tr key={a.id} className="hover:bg-ink-50/60">
              <td className="td font-medium">{a.name}</td>
              <td className="td"><Badge tone="purple">{a.kind}</Badge></td>
              <td className="td text-[13px]">{db.users.find((u) => u.id === a.leaderId)?.firstName} {db.users.find((u) => u.id === a.leaderId)?.lastName}</td>
              <td className="td">{a.participantIds.length}</td>
              <td className="td text-[13px] text-ink-500">{a.schedule}</td>
            </tr>
          ))}
        </Table>
      )}

      {activities.length === 0 && <EmptyState title="Няма извънкласни дейности" icon="star" />}

      <Modal
        open={open} onClose={() => setOpen(false)} title="Нова извънкласна дейност"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!form.name || !user) return
                update((d) => {
                  d.activities.push({
                    id: `act_${Date.now()}`, name: form.name, kind: form.kind,
                    leaderId: user.id, classIds: form.classIds, participantIds: [],
                    schedule: form.schedule, room: form.room || undefined,
                  })
                })
                setForm({ ...form, name: '' })
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
          <Field label="Вид">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as typeof form.kind })}>
              <option value="клуб">Клуб</option><option value="спорт">Спорт</option>
              <option value="изкуство">Изкуство</option><option value="проект">Проект</option>
              <option value="ДПЛР">ДПЛР</option>
            </Select>
          </Field>
          <Field label="График"><Input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} /></Field>
          <Field label="Помещение"><Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></Field>
          <Field label="Паралелка">
            <Select value={form.classIds[0]} onChange={(e) => setForm({ ...form, classIds: [e.target.value] })}>
              {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!detail} onClose={() => setDetail(null)} title={current?.name ?? ''}
      >
        {current && (
          <>
            <div className="mb-4 grid gap-2 rounded-lg bg-ink-50 px-4 py-3 text-[13px]">
              <div className="flex justify-between"><span className="text-ink-500">Вид</span><b>{current.kind}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">График</span><b>{current.schedule}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Помещение</span><b>{current.room ?? '—'}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Ръководител</span><b>{db.users.find((u) => u.id === current.leaderId)?.firstName} {db.users.find((u) => u.id === current.leaderId)?.lastName}</b></div>
            </div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-500">Участници ({current.participantIds.length})</p>
            <div className="max-h-[300px] space-y-1 overflow-y-auto">
              {current.participantIds.map((id) => (
                <div key={id} className="flex items-center gap-2 rounded-md border border-ink-100 px-3 py-1.5 text-[13px]">
                  <Icon name="person" size={14} className="text-ink-400" />
                  {studentName(id)}
                  <span className="ml-auto text-[11px] text-ink-400">{className(db.students.find((s) => s.id === id)?.classId ?? '')}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!addPart} onClose={() => setAddPart(null)} wide title="Добавяне на участници"
        footer={<button onClick={() => setAddPart(null)} className="btn-primary">Готово</button>}
      >
        {addPart && (() => {
          const act = db.activities.find((a) => a.id === addPart)
          if (!act) return null
          const k = db.classes.find((c) => c.id === act.classIds[0])
          const students = k ? studentsOf(k.id) : []
          return (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {students.map((s) => {
                const on = act.participantIds.includes(s.id)
                return (
                  <label key={s.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-ink-50">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => update((d) => {
                        const a = d.activities.find((x) => x.id === addPart)
                        if (!a) return
                        a.participantIds = on ? a.participantIds.filter((x) => x !== s.id) : [...a.participantIds, s.id]
                      })}
                      className="h-4 w-4 rounded"
                    />
                    <span className="truncate">{s.number}. {s.firstName} {s.lastName}</span>
                  </label>
                )
              })}
            </div>
          )
        })()}
      </Modal>
    </>
  )
}
