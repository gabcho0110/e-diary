import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, Select, Stat, Table, Tabs, Textarea, avgFmt, formatDate } from '../components/ui'

export default function Personal() {
  const { db, update, user, userName, isAdmin } = useApp()
  const [tab, setTab] = useState('cards')
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)

  const cards = isAdmin ? db.attestations : db.attestations.filter((a) => a.teacherId === user?.id || a.commissionIds.includes(user!.id))
  const current = db.attestations.find((a) => a.id === detail)

  const teachers = db.users.filter((u) => u.roles.some((r) => ['teacher', 'class_teacher'].includes(r)))

  const [form, setForm] = useState({
    teacherId: '', template: 'Атестационна карта — учител',
    commission: [] as string[],
  })

  const avgScore = (a: typeof cards[number]) => {
    const total = a.criteria.reduce((x, c) => x + c.weight, 0)
    return total ? a.criteria.reduce((x, c) => x + c.score * c.weight, 0) / total : 0
  }

  return (
    <>
      <PageHeader
        title="Оценка на персонала"
        subtitle="Атестационни карти, ДТВ шаблони, самооценка, оценяване от комисия и възражения."
        icon="clipboard"
        actions={<button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Нова атестационна карта</button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Атестационни карти" value={cards.length} icon="clipboard" />
        <Stat label="В самооценка" value={cards.filter((a) => a.status === 'самооценка').length} icon="edit" tone="warn" />
        <Stat label="Потвърдени" value={cards.filter((a) => a.status === 'потвърдена').length} icon="check" tone="ok" />
        <Stat label="С възражение" value={cards.filter((a) => a.status === 'възражение').length} icon="warn" tone="danger" />
      </div>

      <Tabs
        tabs={[
          { id: 'cards', label: 'Атестационни карти', count: cards.length },
          { id: 'templates', label: 'Шаблони' },
          { id: 'dtv', label: 'ДТВ' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'cards' && (
        <>
          <Table
            head={<><th className="th">Учител</th><th className="th w-32">Самооценка</th><th className="th w-32">Комисия</th><th className="th w-28">Обща</th><th className="th w-32">Състояние</th><th className="th w-28">Обновено</th><th className="th w-24"></th></>}
          >
            {cards.map((a) => (
              <tr key={a.id} className="hover:bg-ink-50/60">
                <td className="td font-medium">{userName(a.teacherId)}</td>
                <td className="td">{a.selfScore}</td>
                <td className="td">{a.commissionScore}</td>
                <td className="td font-bold">{avgScore(a).toFixed(2)}</td>
                <td className="td">
                  <Badge tone={a.status === 'потвърдена' ? 'ok' : a.status === 'възражение' ? 'danger' : a.status === 'оценяване' ? 'brand' : 'neutral'}>
                    {a.status}
                  </Badge>
                </td>
                <td className="td text-[12px] text-ink-500">{formatDate(a.updatedAt)}</td>
                <td className="td">
                  <button onClick={() => setDetail(a.id)} className="text-[12px] font-semibold text-brand-700 hover:underline">Отвори</button>
                </td>
              </tr>
            ))}
          </Table>
          {cards.length === 0 && <EmptyState title="Няма атестационни карти" icon="clipboard" />}
        </>
      )}

      {tab === 'templates' && (
        <Table head={<><th className="th">Шаблон</th><th className="th w-24">Критерии</th><th className="th w-28">Използван</th><th className="th w-24"></th></>}>
          {[
            ['Атестационна карта — учител', 4],
            ['Атестационна карта — възпитател', 3],
            ['Атестационна карта — ресурсен учител', 4],
            ['Атестационна карта — директор', 5],
          ].map(([name, n]) => (
            <tr key={name as string} className="hover:bg-ink-50/60">
              <td className="td font-medium">{name as string}</td>
              <td className="td">{n as number}</td>
              <td className="td">{db.attestations.filter((a) => a.template === name).length}</td>
              <td className="td">
                <button
                  onClick={() => {
                    if (!user) return
                    update((d) => {
                      d.attestations.push({
                        id: `att_${Date.now()}`, teacherId: user.id, template: name as string,
                        year: d.school.year, status: 'чернова', selfScore: 0, commissionScore: 0,
                        commissionIds: [],
                        criteria: [
                          { name: 'Планиране и провеждане на урока', weight: 30, score: 0 },
                          { name: 'Оценяване на резултатите', weight: 25, score: 0 },
                          { name: 'Работа с ученици и родители', weight: 25, score: 0 },
                          { name: 'Квалификация и развитие', weight: 20, score: 0 },
                        ],
                        updatedAt: new Date().toISOString().slice(0, 10),
                      })
                    })
                  }}
                  className="text-[12px] font-semibold text-brand-700 hover:underline"
                >
                  Дублирай
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {tab === 'dtv' && (
        <Card>
          <h2 className="mb-3 font-bold text-ink-900">ДТВ — дългосрочна целева подготовка</h2>
          <p className="mb-4 text-[13px] text-ink-500">
            Шаблоните за ДТВ се разпределят между учителите, оценяват се по критерии и се потвърждават от комисията
            и от атестираното лице.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {teachers.slice(0, 6).map((t) => (
              <div key={t.id} className="rounded-lg border border-ink-200 px-4 py-3">
                <p className="text-[13px] font-semibold text-ink-800">{t.firstName} {t.lastName}</p>
                <p className="text-[11px] text-ink-500">
                  {(t.subjectIds ?? []).map((s) => db.subjects.find((x) => x.id === s)?.short).join(', ')}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone="brand">ДТВ {db.school.year}</Badge>
                  <button
                    onClick={() => alert(`Изпратен е ДТВ шаблон за самооценка на ${t.firstName} ${t.lastName}.`)}
                    className="text-[11px] font-semibold text-brand-700 hover:underline"
                  >
                    Изпрати
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={!!current} onClose={() => setDetail(null)} wide
        title={`Атестационна карта — ${current ? userName(current.teacherId) : ''}`}
        footer={
          current && (
            <>
              <button
                onClick={() => update((d) => {
                  const a = d.attestations.find((x) => x.id === current.id)
                  if (a) { a.status = 'възражение'; a.objection = 'Оспорване на оценката по критерий „Работа с ученици и родители“.' }
                })}
                className="btn-ghost mr-auto"
              >
                Подай възражение
              </button>
              <button
                onClick={() => update((d) => {
                  const a = d.attestations.find((x) => x.id === current.id)
                  if (a) a.status = 'самооценка'
                })}
                className="btn-ghost"
              >
                Изпрати за самооценка
              </button>
              <button
                onClick={() => update((d) => {
                  const a = d.attestations.find((x) => x.id === current.id)
                  if (a) a.status = 'потвърдена'
                })}
                className="btn-ok"
              >
                Потвърди
              </button>
            </>
          )
        }
      >
        {current && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone={current.status === 'потвърдена' ? 'ok' : 'brand'}>{current.status}</Badge>
              <span className="text-[12px] text-ink-500">{current.template} · {current.year}</span>
            </div>

            <Table head={<><th className="th">Критерий</th><th className="th w-24">Тежест</th><th className="th w-40">Оценка (2–4)</th><th className="th w-24">Принос</th></>}>
              {current.criteria.map((c, i) => (
                <tr key={c.name}>
                  <td className="td font-medium">{c.name}</td>
                  <td className="td">{c.weight}%</td>
                  <td className="td">
                    <div className="flex gap-1">
                      {[2, 3, 4].map((s) => (
                        <button
                          key={s}
                          onClick={() => update((d) => {
                            const a = d.attestations.find((x) => x.id === current.id)
                            if (a) a.criteria[i].score = s
                          })}
                          className={`h-7 w-7 rounded-md text-[12px] font-bold ${c.score === s ? `g${s + 2} ring-2 ring-brand-500/40` : 'bg-ink-100 text-ink-500'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="td">{(c.score * c.weight / 100).toFixed(2)}</td>
                </tr>
              ))}
            </Table>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Card className="!p-3.5"><p className="text-[11px] uppercase text-ink-500">Самооценка</p><p className="text-xl font-bold">{current.selfScore}</p></Card>
              <Card className="!p-3.5"><p className="text-[11px] uppercase text-ink-500">Комисия</p><p className="text-xl font-bold">{current.commissionScore}</p></Card>
              <Card className="!p-3.5"><p className="text-[11px] uppercase text-ink-500">Обща оценка</p><p className="text-xl font-bold text-brand-700">{avgScore(current).toFixed(2)}</p></Card>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-500">Комисия</p>
              <div className="flex flex-wrap gap-1.5">
                {current.commissionIds.map((id) => (
                  <Badge key={id} tone="neutral">{userName(id)}</Badge>
                ))}
              </div>
            </div>

            {current.status === 'възражение' && (
              <div className="mt-4 rounded-lg border border-[#f5c2c2] bg-[#fde8e8] px-4 py-3 text-[13px] text-[#b42318]">
                <b>Възражение:</b> {current.objection ?? 'няма описание'}
              </div>
            )}

            <div className="mt-4">
              <Field label="Отговор на възражението">
                <Textarea
                  placeholder="Опишете отговора на подаденото възражение…"
                  onBlur={(e) => update((d) => {
                    const a = d.attestations.find((x) => x.id === current.id)
                    if (a) a.objection = (a.objection ?? '') + `\n[Отговор] ${e.target.value}`
                  })}
                />
              </Field>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={open} onClose={() => setOpen(false)} title="Нова атестационна карта"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!form.teacherId) return
                update((d) => {
                  d.attestations.push({
                    id: `att_${Date.now()}`, teacherId: form.teacherId, template: form.template,
                    year: d.school.year, status: 'чернова', selfScore: 0, commissionScore: 0,
                    commissionIds: form.commission,
                    criteria: [
                      { name: 'Планиране и провеждане на урока', weight: 30, score: 0 },
                      { name: 'Оценяване на резултатите', weight: 25, score: 0 },
                      { name: 'Работа с ученици и родители', weight: 25, score: 0 },
                      { name: 'Квалификация и развитие', weight: 20, score: 0 },
                    ],
                    updatedAt: new Date().toISOString().slice(0, 10),
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
          <Field label="Учител">
            <Select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
              <option value="">— изберете —</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </Select>
          </Field>
          <Field label="Шаблон">
            <Select value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })}>
              <option>Атестационна карта — учител</option>
              <option>Атестационна карта — възпитател</option>
              <option>Атестационна карта — ресурсен учител</option>
            </Select>
          </Field>
          <Field label="Комисия">
            <div className="grid max-h-[180px] grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-ink-200 p-2.5">
              {db.users.filter((u) => u.roles.some((r) => ['director', 'deputy', 'teacher', 'class_teacher'].includes(r))).slice(0, 30).map((u) => (
                <label key={u.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-ink-50">
                  <input
                    type="checkbox"
                    checked={form.commission.includes(u.id)}
                    onChange={(e) => setForm({
                      ...form,
                      commission: e.target.checked ? [...form.commission, u.id] : form.commission.filter((x) => x !== u.id),
                    })}
                    className="h-4 w-4 rounded"
                  />
                  <span className="truncate">{u.firstName} {u.lastName}</span>
                </label>
              ))}
            </div>
          </Field>
        </div>
      </Modal>
    </>
  )
}
