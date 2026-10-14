import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, Select, Stat, Table, Tabs, formatDate } from '../components/ui'

export default function Sklad() {
  const { db, update, className } = useApp()
  const [tab, setTab] = useState('rooms')
  const [openFloor, setOpenFloor] = useState(false)
  const [openRoom, setOpenRoom] = useState(false)
  const [scheduleRoom, setScheduleRoom] = useState<string | null>(null)
  const [form, setForm] = useState({ floor: 4, name: '', kind: 'кабинет' as const, capacity: 26 })
  const [dayFilter, setDayFilter] = useState(1)

  const byFloor = useMemo(() => {
    const map = new Map<number, typeof db.rooms>()
    db.rooms.forEach((r) => {
      map.set(r.floor, [...(map.get(r.floor) ?? []), r])
    })
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [db.rooms])

  const room = db.rooms.find((r) => r.id === scheduleRoom)
  const roomSchedule = db.schedule.filter((s) => s.roomId === scheduleRoom && s.day === dayFilter).sort((a, b) => a.period - b.period)

  return (
    <>
      <PageHeader
        title="Склад и помещения"
        subtitle="Етажи, кабинети, лаборатории, зали и разписание на залите."
        icon="building"
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setOpenFloor(true)} className="btn-ghost"><Icon name="plus" size={15} /> Нов етаж</button>
            <button onClick={() => setOpenRoom(true)} className="btn-primary"><Icon name="plus" size={15} /> Ново помещение</button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Помещения" value={db.rooms.length} icon="building" />
        <Stat label="Етажи" value={byFloor.length} icon="grid" tone="brand" />
        <Stat label="Лаборатории" value={db.rooms.filter((r) => r.kind === 'лаборатория').length} icon="spark" tone="purple" />
        <Stat label="Общ капацитет" value={db.rooms.reduce((a, r) => a + r.capacity, 0)} icon="person" tone="ok" />
      </div>

      <Tabs
        tabs={[
          { id: 'rooms', label: 'Помещения', count: db.rooms.length },
          { id: 'floors', label: 'Етажи', count: byFloor.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'rooms' && (
        <Table
          head={<><th className="th">Помещение</th><th className="th w-24">Етаж</th><th className="th w-44">Вид</th><th className="th w-28">Капацитет</th><th className="th w-28">Заети часове</th><th className="th w-32"></th></>}
        >
          {db.rooms.map((r) => (
            <tr key={r.id} className="hover:bg-ink-50/60">
              <td className="td font-medium">{r.name}</td>
              <td className="td">{r.floor}</td>
              <td className="td"><Badge tone={r.kind === 'кабинет' ? 'neutral' : 'brand'}>{r.kind}</Badge></td>
              <td className="td">{r.capacity}</td>
              <td className="td">{db.schedule.filter((s) => s.roomId === r.id).length}</td>
              <td className="td">
                <button onClick={() => setScheduleRoom(r.id)} className="text-[12px] font-semibold text-brand-700 hover:underline">Разписание</button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {tab === 'floors' && (
        <div className="space-y-5">
          {byFloor.map(([floor, rooms]) => (
            <Card key={floor} pad={false}>
              <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
                <h2 className="font-bold text-ink-900">Етаж {floor}</h2>
                <div className="flex items-center gap-2">
                  <Badge tone="brand">{rooms.length} помещения</Badge>
                  <button
                    onClick={() => {
                      if (!confirm(`Да се изтрие ли етаж ${floor} с всички негови помещения?`)) return
                      update((d) => { d.rooms = d.rooms.filter((r) => r.floor !== floor) })
                    }}
                    className="text-ink-300 hover:text-danger"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-3 lg:grid-cols-5">
                {rooms.map((r) => (
                  <div key={r.id} className="rounded-lg border border-ink-200 px-3 py-2.5">
                    <p className="font-semibold text-ink-900">{r.name}</p>
                    <p className="text-[11px] text-ink-500">{r.kind}</p>
                    <p className="mt-1 text-[11px] text-ink-400">{r.capacity} места · {db.schedule.filter((s) => s.roomId === r.id).length} часа</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!scheduleRoom} onClose={() => setScheduleRoom(null)} wide title={`Разписание — ${room?.name ?? ''}`}
        footer={<button onClick={() => setScheduleRoom(null)} className="btn-primary">Затвори</button>}
      >
        <div className="mb-4 flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5].map((d) => (
            <button
              key={d}
              onClick={() => setDayFilter(d)}
              className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium ${
                dayFilter === d ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-ink-200 text-ink-600'
              }`}
            >
              {['', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък'][d]}
            </button>
          ))}
        </div>
        {roomSchedule.length === 0 ? (
          <EmptyState title="Няма часове" text="Залата е свободна през целия ден." icon="building" />
        ) : (
          <Table head={<><th className="th w-16">Час</th><th className="th">Паралелка</th><th className="th">Предмет</th><th className="th">Учител</th></>}>
            {roomSchedule.map((s) => (
              <tr key={s.id}>
                <td className="td font-bold text-ink-500">{s.period}</td>
                <td className="td font-medium">{className(s.classId)}</td>
                <td className="td">{db.subjects.find((x) => x.id === s.subjectId)?.name}</td>
                <td className="td text-[13px] text-ink-600">
                  {db.users.find((u) => u.id === s.teacherId)?.firstName} {db.users.find((u) => u.id === s.teacherId)?.lastName}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Modal>

      <Modal
        open={openRoom} onClose={() => setOpenRoom(false)} title="Ново помещение"
        footer={
          <>
            <button onClick={() => setOpenRoom(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!form.name) return
                update((d) => { d.rooms.push({ id: `room_${Date.now()}`, ...form }) })
                setForm({ ...form, name: '' })
                setOpenRoom(false)
              }}
              className="btn-primary"
            >
              Създай
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Наименование"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="напр. 401" /></Field>
          <Field label="Етаж"><Input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })} /></Field>
          <Field label="Вид">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as typeof form.kind })}>
              <option value="кабинет">Кабинет</option><option value="лаборатория">Лаборатория</option>
              <option value="спортна зала">Спортна зала</option><option value="актова зала">Актова зала</option>
              <option value="библиотека">Библиотека</option><option value="кабинет по ИТ">Кабинет по ИТ</option>
            </Select>
          </Field>
          <Field label="Капацитет"><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></Field>
        </div>
      </Modal>

      <Modal
        open={openFloor} onClose={() => setOpenFloor(false)} title="Нов етаж"
        footer={
          <>
            <button onClick={() => setOpenFloor(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                const f = Number(prompt('Номер на етажа:', '4'))
                if (!f) return
                update((d) => {
                  for (let i = 1; i <= 6; i++) {
                    d.rooms.push({ id: `room_${Date.now()}_${i}`, floor: f, name: `${f}${String(i).padStart(2, '0')}`, kind: 'кабинет', capacity: 26 })
                  }
                })
                setOpenFloor(false)
              }}
              className="btn-primary"
            >
              Създай етаж с 6 кабинета
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-600">Ще бъде създаден нов етаж с шест стандартни кабинета, които после може да редактирате.</p>
      </Modal>
    </>
  )
}
