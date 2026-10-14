import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, GradePill, Icon, Input, Modal, PageHeader, Select, Stat, Table, Tabs, avgFmt, formatDate } from '../components/ui'

export default function Harakteristika() {
  const { db, myClasses, update, user, studentName, subjectName, className, studentsOf } = useApp()
  const [tab, setTab] = useState('campaigns')
  const [open, setOpen] = useState(false)
  const [fillId, setFillId] = useState<string | null>(null)

  const profiles = db.studentProfiles
  const current = profiles.find((p) => p.id === fillId)

  const [form, setForm] = useState({
    studentId: '', campaign: `Кампания ${db.school.year}`,
    subjectIds: myClasses[0] ? db.classes.find((c) => c.id === myClasses[0].id)!.subjectIds.slice(0, 3) : [],
  })

  const byStatus = (s: string) => profiles.filter((p) => p.status === s).length

  return (
    <>
      <PageHeader
        title="Характеристика на ученика"
        subtitle="Кампании, предмети, параметри, оценяване, потвърждаване и възражения."
        icon="user"
        actions={<button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Нова характеристика</button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Характеристики" value={profiles.length} icon="user" />
        <Stat label="Подадени" value={byStatus('подадена')} icon="upload" tone="brand" />
        <Stat label="Потвърдени" value={byStatus('потвърдена')} icon="check" tone="ok" />
        <Stat label="С възражение" value={byStatus('възражение')} icon="warn" tone="danger" />
      </div>

      <Tabs
        tabs={[
          { id: 'campaigns', label: 'Кампании', count: profiles.length },
          { id: 'params', label: 'Параметри' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'campaigns' && (
        <>
          <Table
            head={<><th className="th">Ученик</th><th className="th">Кампания</th><th className="th w-24">Предмети</th><th className="th w-28">Средна оценка</th><th className="th w-32">Състояние</th><th className="th w-28">Обновено</th><th className="th w-24"></th></>}
          >
            {profiles.map((p) => {
              const avg = p.subjects.length ? p.subjects.reduce((a, s) => a + s.grade, 0) / p.subjects.length : null
              return (
                <tr key={p.id} className="hover:bg-ink-50/60">
                  <td className="td font-medium">{studentName(p.studentId)}</td>
                  <td className="td text-[13px] text-ink-500">{p.campaign}</td>
                  <td className="td">{p.subjects.length}</td>
                  <td className="td font-bold">{avgFmt(avg)}</td>
                  <td className="td">
                    <Badge tone={p.status === 'потвърдена' ? 'ok' : p.status === 'възражение' ? 'danger' : p.status === 'оценена' ? 'brand' : 'neutral'}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="td text-[12px] text-ink-500">{formatDate(p.updatedAt)}</td>
                  <td className="td">
                    <button onClick={() => setFillId(p.id)} className="text-[12px] font-semibold text-brand-700 hover:underline">Отвори</button>
                  </td>
                </tr>
              )
            })}
          </Table>
          {profiles.length === 0 && <EmptyState title="Няма характеристики" icon="user" />}
        </>
      )}

      {tab === 'params' && (
        <Card pad={false}>
          <div className="border-b border-ink-200 px-5 py-3.5"><h2 className="font-bold text-ink-900">Параметри за оценяване</h2></div>
          <Table head={<><th className="th">Параметър</th><th className="th w-24">Тежест</th><th className="th">Описание</th></>}>
            {[
              ['Учебна активност', '30%', 'Участие в час, изпълнение на задачите, самостоятелна работа.'],
              ['Социална адаптация', '25%', 'Взаимоотношения със съученици и учители, работа в екип.'],
              ['Емоционална устойчивост', '25%', 'Справяне със стрес, мотивация, отношение към обратна връзка.'],
              ['Ученическа подкрепа', '20%', 'Напредък спрямо индивидуалния план за подкрепа.'],
            ].map(([n, w, d]) => (
              <tr key={n}>
                <td className="td font-medium">{n}</td>
                <td className="td">{w}</td>
                <td className="td text-[13px] text-ink-500">{d}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Modal
        open={open} onClose={() => setOpen(false)} title="Нова характеристика"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!form.studentId) return
                update((d) => {
                  d.studentProfiles.push({
                    id: `spr_${Date.now()}`, studentId: form.studentId, campaign: form.campaign,
                    subjects: form.subjectIds.map((sid) => ({
                      subjectId: sid, grade: 4,
                      assessorId: d.users.find((u) => u.subjectIds?.includes(sid))?.id ?? user!.id,
                    })),
                    params: [
                      { name: 'Учебна активност', value: 4, assessorId: user!.id },
                      { name: 'Социална адаптация', value: 4, assessorId: user!.id },
                      { name: 'Емоционална устойчивост', value: 4, assessorId: user!.id },
                    ],
                    status: 'чернова', updatedAt: new Date().toISOString().slice(0, 10),
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
        <div className="grid gap-3">
          <Field label="Кампания"><Input value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} /></Field>
          <Field label="Ученик">
            <Select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
              <option value="">— изберете —</option>
              {myClasses.flatMap((k) => studentsOf(k.id).map((s) => (
                <option key={s.id} value={s.id}>{k.name} · {s.firstName} {s.lastName}</option>
              )))}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!current} onClose={() => setFillId(null)} wide title={`Характеристика — ${current ? studentName(current.studentId) : ''}`}
        footer={
          current && (
            <>
              <button
                onClick={() => update((d) => {
                  const p = d.studentProfiles.find((x) => x.id === current.id)
                  if (p) p.status = 'подадена'
                })}
                className="btn-ghost mr-auto"
              >
                Изпрати за оценяване
              </button>
              <button
                onClick={() => update((d) => {
                  const p = d.studentProfiles.find((x) => x.id === current.id)
                  if (p) p.status = 'потвърдена'
                })}
                className="btn-ok"
              >
                Потвърди
              </button>
              <button onClick={() => setFillId(null)} className="btn-primary">Готово</button>
            </>
          )
        }
      >
        {current && (
          <>
            <div className="mb-4 flex items-center gap-2">
              <Badge tone={current.status === 'потвърдена' ? 'ok' : 'brand'}>{current.status}</Badge>
              <span className="text-[12px] text-ink-500">{current.campaign}</span>
            </div>

            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-500">Оценки по предмети</h3>
            <Table head={<><th className="th">Предмет</th><th className="th w-32">Оценка</th><th className="th">Оценяващ</th></>}>
              {current.subjects.map((s, i) => (
                <tr key={s.subjectId}>
                  <td className="td">{subjectName(s.subjectId)}</td>
                  <td className="td">
                    <div className="flex gap-1">
                      {[2, 3, 4, 5, 6].map((g) => (
                        <button
                          key={g}
                          onClick={() => update((d) => {
                            const p = d.studentProfiles.find((x) => x.id === current.id)
                            if (p) p.subjects[i].grade = g
                          })}
                          className={`h-7 w-7 rounded-md text-[12px] font-bold ${s.grade === g ? `g${g} ring-2 ring-brand-500/40` : 'bg-ink-100 text-ink-500'}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="td text-[13px] text-ink-500">{db.users.find((u) => u.id === s.assessorId)?.firstName} {db.users.find((u) => u.id === s.assessorId)?.lastName}</td>
                </tr>
              ))}
            </Table>

            <h3 className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wide text-ink-500">Параметри</h3>
            <div className="space-y-2">
              {current.params.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3 rounded-lg border border-ink-200 px-3.5 py-2">
                  <span className="min-w-0 flex-1 text-[13px] font-medium text-ink-800">{p.name}</span>
                  <div className="flex gap-1">
                    {[2, 3, 4, 5, 6].map((g) => (
                      <button
                        key={g}
                        onClick={() => update((d) => {
                          const sp = d.studentProfiles.find((x) => x.id === current.id)
                          if (sp) sp.params[i].value = g
                        })}
                        className={`h-7 w-7 rounded-md text-[12px] font-bold ${p.value === g ? `g${g} ring-2 ring-brand-500/40` : 'bg-ink-100 text-ink-500'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <span className="shrink-0 text-[11px] text-ink-400">{db.users.find((u) => u.id === p.assessorId)?.lastName}</span>
                </div>
              ))}
            </div>

            {current.status === 'възражение' && (
              <div className="mt-4 rounded-lg border border-[#f5c2c2] bg-[#fde8e8] px-4 py-3 text-[13px] text-[#b42318]">
                <b>Подадено възражение:</b> {current.objection ?? 'няма описание'}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => update((d) => {
                  const p = d.studentProfiles.find((x) => x.id === current.id)
                  if (p) { p.status = 'възражение'; p.objection = 'Оспорване на оценката по учебна активност.' }
                })}
                className="btn-ghost !py-1.5 text-[12px]"
              >
                Подай възражение
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
