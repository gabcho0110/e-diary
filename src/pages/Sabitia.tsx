import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import type { EventItem } from '../lib/types'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, Select, Stat, Textarea, formatDate } from '../components/ui'

const DAYS_BG = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MONTHS_BG = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември']

const KIND_TONE: Record<string, 'brand' | 'ok' | 'warn' | 'danger' | 'purple' | 'neutral'> = {
  'Училищно': 'brand', 'Класно': 'purple', 'Родителска среща': 'warn',
  'Екскурзия': 'ok', 'Празник': 'danger', 'Състезание': 'neutral',
}

export default function Sabitia() {
  const { db, myClasses, addEvent, user, className } = useApp()
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)

  const isFamily = user?.roles.includes('parent') || user?.roles.includes('student')
  const myClassIds = myClasses.map((c) => c.id)

  const events = useMemo(
    () => db.events.filter((e) => (isFamily ? e.invitedClassIds.some((c) => myClassIds.includes(c)) : true)),
    [db.events, isFamily, myClassIds],
  )

  const [form, setForm] = useState({
    title: '', description: '', date: new Date().toISOString().slice(0, 10), endDate: '',
    place: '', kind: 'Училищно' as EventItem['kind'], classId: myClasses[0]?.id ?? '',
  })

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const iso = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const eventsOn = (d: number) => events.filter((e) => e.date === iso(d))

  const upcoming = [...events].filter((e) => e.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date))
  const current = db.events.find((e) => e.id === detail)

  return (
    <>
      <PageHeader
        title="Събития и училищен календар"
        subtitle="Училищни и класни събития, родителски срещи, екскурзии, празници и състезания."
        icon="calendar"
        actions={<button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Ново събитие</button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Събития" value={events.length} icon="calendar" />
        <Stat label="Предстоящи" value={upcoming.length} icon="clock" tone="brand" />
        <Stat label="Родителски срещи" value={events.filter((e) => e.kind === 'Родителска среща').length} icon="meet" tone="warn" />
        <Stat label="Екскурзии" value={events.filter((e) => e.kind === 'Екскурзия').length} icon="star" tone="ok" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card pad={false}>
          <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
            <h2 className="font-bold capitalize text-ink-900">{MONTHS_BG[month]} {year}</h2>
            <div className="flex gap-1">
              <button
                onClick={() => { if (month === 0) { setMonth(11); setYear(year - 1) } else setMonth(month - 1) }}
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100"
              >
                <Icon name="chevron" size={16} className="rotate-180" />
              </button>
              <button
                onClick={() => { if (month === 11) { setMonth(0); setYear(year + 1) } else setMonth(month + 1) }}
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100"
              >
                <Icon name="chevron" size={16} />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-1.5 grid grid-cols-7 gap-1">
              {DAYS_BG.map((d) => (
                <div key={d} className="py-1 text-center text-[11px] font-bold uppercase tracking-wide text-ink-400">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => (
                <div
                  key={i}
                  className={`min-h-[76px] rounded-lg border p-1.5 ${
                    d ? 'border-ink-100 bg-white' : 'border-transparent'
                  } ${d && iso(d) === new Date().toISOString().slice(0, 10) ? 'ring-2 ring-brand-500/30' : ''}`}
                >
                  {d && (
                    <>
                      <span className="text-[11px] font-semibold text-ink-400">{d}</span>
                      <div className="mt-0.5 space-y-0.5">
                        {eventsOn(d).slice(0, 2).map((e) => (
                          <button
                            key={e.id}
                            onClick={() => setDetail(e.id)}
                            className="block w-full truncate rounded bg-brand-50 px-1 py-0.5 text-left text-[10px] font-medium text-brand-800 hover:bg-brand-100"
                          >
                            {e.title}
                          </button>
                        ))}
                        {eventsOn(d).length > 2 && (
                          <span className="block px-1 text-[10px] text-ink-400">+{eventsOn(d).length - 2}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card pad={false}>
          <div className="border-b border-ink-200 px-5 py-3.5"><h2 className="font-bold text-ink-900">Предстоящи събития</h2></div>
          <ul className="divide-y divide-ink-100">
            {upcoming.map((e) => (
              <li key={e.id}>
                <button onClick={() => setDetail(e.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-ink-50">
                  <span className="grid h-10 w-12 shrink-0 place-items-center rounded-lg bg-ink-100 text-[11px] font-bold leading-tight text-ink-600">
                    {formatDate(e.date).slice(0, 5)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink-800">{e.title}</p>
                    <p className="truncate text-[11px] text-ink-500">{e.place}</p>
                  </div>
                  <Badge tone={KIND_TONE[e.kind]}>{e.kind}</Badge>
                </button>
              </li>
            ))}
            {upcoming.length === 0 && <li className="p-5"><EmptyState title="Няма предстоящи събития" icon="calendar" /></li>}
          </ul>
        </Card>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={current?.title ?? ''}>
        {current && (
          <>
            <div className="mb-4 grid gap-2 rounded-lg bg-ink-50 px-4 py-3 text-[13px]">
              <div className="flex justify-between"><span className="text-ink-500">Дата</span><b>{formatDate(current.date)}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Място</span><b>{current.place}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Вид</span><b>{current.kind}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Поканени паралелки</span><b>{current.invitedClassIds.length}</b></div>
            </div>
            <p className="text-sm leading-relaxed text-ink-700">{current.description}</p>
          </>
        )}
      </Modal>

      <Modal
        open={open} onClose={() => setOpen(false)} title="Ново събитие"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!form.title) return
                addEvent({
                  title: form.title, description: form.description, date: form.date,
                  endDate: form.endDate || undefined, place: form.place, kind: form.kind,
                  invitedClassIds: [form.classId], invitedUserIds: [],
                })
                setForm({ ...form, title: '', description: '' })
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
            <Field label="Наименование"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          </div>
          <Field label="Дата"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Крайна дата (по избор)"><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
          <Field label="Вид">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as EventItem['kind'] })}>
              <option>Училищно</option><option>Класно</option><option>Родителска среща</option>
              <option>Екскурзия</option><option>Празник</option><option>Състезание</option>
            </Select>
          </Field>
          <Field label="Място"><Input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Field label="Поканена паралелка">
              <Select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Описание"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          </div>
        </div>
      </Modal>
    </>
  )
}
