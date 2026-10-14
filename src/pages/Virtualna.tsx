import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, Select, Stat, Table, Tabs, Textarea, formatDate } from '../components/ui'

export default function Virtualna() {
  const { db, myClasses, mySubjects, update, user, className, subjectName, userName } = useApp()
  const [tab, setTab] = useState('rooms')
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)

  const isFamily = user?.roles.includes('parent') || user?.roles.includes('student')
  const rooms = isFamily
    ? db.virtualRooms.filter((r) => myClasses.some((c) => c.id === r.classId))
    : db.virtualRooms

  const [form, setForm] = useState({
    name: '', classId: myClasses[0]?.id ?? '', subjectId: mySubjects[0]?.id ?? '',
    openFrom: new Date().toISOString().slice(0, 10),
    openTo: new Date(Date.now() + 86400000 * 90).toISOString().slice(0, 10),
  })

  const active = db.virtualRooms.find((r) => r.id === activeId)
  const report = db.virtualRooms.find((r) => r.id === reportId)

  const totalSessions = rooms.reduce((a, r) => a + r.sessions.length, 0)
  const totalStudents = rooms.reduce((a, r) => a + r.sessions.reduce((x, s) => x + s.students, 0), 0)
  const totalMinutes = rooms.reduce((a, r) => a + r.sessions.reduce((x, s) => x + s.minutes, 0), 0)

  return (
    <>
      <PageHeader
        title="Виртуална класна стая"
        subtitle="Онлайн уроци, график на активност, запис на урока и справки за участие."
        icon="video"
        actions={
          !isFamily ? (
            <button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Нова стая</button>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Виртуални стаи" value={rooms.length} icon="video" />
        <Stat label="Проведени уроци" value={totalSessions} icon="clock" tone="brand" />
        <Stat label="Участия на ученици" value={totalStudents} icon="person" tone="ok" />
        <Stat label="Общо време" value={`${Math.round(totalMinutes / 60)} ч.`} icon="chart" tone="purple" />
      </div>

      <Tabs
        tabs={[
          { id: 'rooms', label: 'Стаи', count: rooms.length },
          { id: 'activity', label: 'Активност' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'rooms' && (
        <>
          {rooms.length === 0 ? (
            <EmptyState title="Няма виртуални стаи" text="Създайте стая за вашия клас и насрочете кога е отключена." icon="video" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rooms.map((r) => (
                <Card key={r.id} className="flex flex-col">
                  <div className="mb-3 flex items-start gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${r.active ? 'bg-[#e6f4ea] text-[#1f7a45]' : 'bg-ink-100 text-ink-500'}`}>
                      <Icon name="video" size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-900">{r.name}</p>
                      <p className="text-[11px] text-ink-500">{className(r.classId)} · {subjectName(r.subjectId)}</p>
                    </div>
                    <Badge tone={r.active ? 'ok' : 'neutral'}>{r.active ? 'активна' : 'затворена'}</Badge>
                  </div>

                  <p className="mb-3 text-[12px] text-ink-500">
                    Отключена: {formatDate(r.openFrom)} — {formatDate(r.openTo)}
                  </p>

                  <div className="mt-auto flex items-center gap-2 border-t border-ink-100 pt-3">
                    <span className="text-[12px] text-ink-500">{r.sessions.length} уроци</span>
                    <button
                      onClick={() => {
                        if (!isFamily) { setActiveId(r.id); return }
                        alert(`Влизане във виртуалната стая „${r.name}“. Ще се отвори онлайн урокът.`)
                      }}
                      className="ml-auto btn-primary !py-1.5 text-[12px]"
                    >
                      <Icon name="video" size={13} /> Влез
                    </button>
                    <button onClick={() => setReportId(r.id)} className="btn-ghost !py-1.5 text-[12px]">Справка</button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'activity' && (
        <Table head={<><th className="th">Стая</th><th className="th w-28">Дата</th><th className="th w-28">Ученици</th><th className="th w-28">Минути</th><th className="th w-32">Активност</th></>}>
          {rooms.flatMap((r) => r.sessions.map((s) => ({ r, s }))).sort((a, b) => b.s.date.localeCompare(a.s.date)).slice(0, 100).map(({ r, s }, i) => (
            <tr key={`${r.id}_${i}`} className="hover:bg-ink-50/60">
              <td className="td font-medium">{r.name}</td>
              <td className="td text-[12px] text-ink-500">{formatDate(s.date)}</td>
              <td className="td">{s.students}</td>
              <td className="td">{s.minutes}</td>
              <td className="td">
                <Badge tone={s.students > 18 ? 'ok' : s.students > 10 ? 'warn' : 'danger'}>
                  {s.students > 18 ? 'висока' : s.students > 10 ? 'средна' : 'ниска'}
                </Badge>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Modal
        open={!!activeId} onClose={() => setActiveId(null)} wide title={active?.name ?? ''}
        footer={active && <button onClick={() => setActiveId(null)} className="btn-primary">Затвори</button>}
      >
        {active && (
          <>
            <div className="mb-4 grid gap-2 rounded-lg bg-ink-50 px-4 py-3 text-[13px]">
              <div className="flex justify-between"><span className="text-ink-500">Паралелка</span><b>{className(active.classId)}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Предмет</span><b>{subjectName(active.subjectId)}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Учител</span><b>{userName(active.teacherId)}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Период на активност</span><b>{formatDate(active.openFrom)} — {formatDate(active.openTo)}</b></div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button onClick={() => alert('Записът на урока е стартиран. Файлът ще бъде достъпен след приключване на урока.')} className="btn-ghost !py-1.5 text-[12px]">
                <Icon name="video" size={13} /> Започни запис
              </button>
              <button onClick={() => alert('Споделен е екранът с учениците.')} className="btn-ghost !py-1.5 text-[12px]">
                <Icon name="eye" size={13} /> Сподели екран
              </button>
              <button onClick={() => alert('Отворена е бяла дъска за рисуване.')} className="btn-ghost !py-1.5 text-[12px]">
                <Icon name="edit" size={13} /> Бяла дъска
              </button>
            </div>

            <Field label="Настройки на стаята">
              <div className="space-y-2">
                {[
                  ['Отключи стаята', active.active],
                  ['Разреши на учениците да влизат без покана', true],
                  ['Разреши чат по време на урока', true],
                  ['Записвай урока автоматично', false],
                  ['Заглуши учениците при влизане', true],
                ].map(([label, on]) => (
                  <label key={label as string} className="flex items-center justify-between rounded-lg border border-ink-200 px-4 py-2.5">
                    <span className="text-[13px] text-ink-700">{label as string}</span>
                    <input type="checkbox" defaultChecked={on as boolean} className="h-4 w-4 rounded" />
                  </label>
                ))}
              </div>
            </Field>

            <div className="mt-4">
              <Field label="Бележки към урока">
                <Textarea placeholder="напр. Днес разгледахме алгоритми за сортиране…" />
              </Field>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!reportId} onClose={() => setReportId(null)} wide title={`Справка за активност — ${report?.name ?? ''}`}
        footer={<button onClick={() => setReportId(null)} className="btn-primary">Затвори</button>}
      >
        {report && (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <Card className="!p-3.5"><p className="text-[11px] uppercase text-ink-500">Уроци</p><p className="text-xl font-bold">{report.sessions.length}</p></Card>
              <Card className="!p-3.5"><p className="text-[11px] uppercase text-ink-500">Средно ученици</p><p className="text-xl font-bold">{(report.sessions.reduce((a, s) => a + s.students, 0) / Math.max(1, report.sessions.length)).toFixed(1)}</p></Card>
              <Card className="!p-3.5"><p className="text-[11px] uppercase text-ink-500">Средно минути</p><p className="text-xl font-bold">{(report.sessions.reduce((a, s) => a + s.minutes, 0) / Math.max(1, report.sessions.length)).toFixed(0)}</p></Card>
            </div>
            <Table head={<><th className="th">Дата</th><th className="th w-28">Ученици</th><th className="th w-28">Минути</th><th className="th">Състояние</th></>}>
              {report.sessions.map((s, i) => (
                <tr key={i}>
                  <td className="td">{formatDate(s.date)}</td>
                  <td className="td">{s.students}</td>
                  <td className="td">{s.minutes}</td>
                  <td className="td"><Badge tone="ok">проведен</Badge></td>
                </tr>
              ))}
            </Table>
          </>
        )}
      </Modal>

      <Modal
        open={open} onClose={() => setOpen(false)} title="Нова виртуална стая"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!user) return
                update((d) => {
                  d.virtualRooms.push({
                    id: `vcr_${Date.now()}`, name: form.name || `ВКС ${className(form.classId)}`,
                    classId: form.classId, subjectId: form.subjectId, teacherId: user.id,
                    openFrom: form.openFrom, openTo: form.openTo, active: true, sessions: [],
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
            <Field label="Наименование"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="напр. ВКС 9-А — Програмиране" /></Field>
          </div>
          <Field label="Паралелка">
            <Select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
              {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Предмет">
            <Select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              {mySubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Отключена от"><Input type="date" value={form.openFrom} onChange={(e) => setForm({ ...form, openFrom: e.target.value })} /></Field>
          <Field label="Отключена до"><Input type="date" value={form.openTo} onChange={(e) => setForm({ ...form, openTo: e.target.value })} /></Field>
        </div>
      </Modal>
    </>
  )
}
