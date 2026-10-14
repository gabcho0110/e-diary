import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, Stat, Textarea, formatDate } from '../components/ui'

const SECTIONS: [string, string][] = [
  ['Начало', 'Кратко представяне и мотивация за участие в атестацията.'],
  ['Общи данни', 'Име, длъжност, училище, педагогически стаж, квалификационна степен.'],
  ['Моят опит', 'Преподавателски опит, класове, предмети, извънкласна работа.'],
  ['Компетентности', 'Професионални и дигитални компетентности, работа в екип.'],
  ['Постижения', 'Успехи на ученици, проекти, награди, публикации.'],
  ['Самооценка', 'Самооценка по критериите на Наредба № 15.'],
  ['Критерии', 'Попълване по критерии с тежест и оценка.'],
]

export default function Portfolio() {
  const { db, user, update, userName } = useApp()
  const [open, setOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('Начало')

  const mine = db.portfolios.find((p) => p.userId === user?.id)
  const all = db.portfolios
  const current = db.portfolios.find((p) => p.id === viewId)

  const create = () => {
    if (!user) return
    update((d) => {
      d.portfolios.push({
        id: `prt_${Date.now()}`, userId: user.id, kind: 'учителско',
        school: d.school.name, position: 'Учител', startYear: '2015',
        sections: Object.fromEntries(SECTIONS.map(([k, v]) => [k, v])),
        shared: false, hideContacts: false, likes: [],
        updatedAt: new Date().toISOString().slice(0, 10),
      })
    })
    setOpen(false)
  }

  if (!mine && !all.length) {
    return (
      <>
        <PageHeader title="Портфолио" subtitle="Учителско и институционално портфолио по секции и критерии." icon="badge" />
        <EmptyState
          title="Нямате портфолио"
          text="Създайте своето учителско портфолио и попълнете секциите по Наредба № 15."
          icon="badge"
          action={<button onClick={create} className="btn-primary">Създай портфолио</button>}
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Портфолио"
        subtitle="Учителско и институционално портфолио — секции, критерии, споделяне и харесвания."
        icon="badge"
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={create} className="btn-ghost"><Icon name="plus" size={15} /> Ново портфолио</button>
            <button onClick={() => alert('Институционално портфолио на училището се създава от директора.')} className="btn-primary">
              <Icon name="school" size={15} /> Институционално
            </button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Портфолиа в училището" value={all.length} icon="badge" />
        <Stat label="Споделени" value={all.filter((p) => p.shared).length} icon="eye" tone="ok" />
        <Stat label="Харесвания" value={all.reduce((a, p) => a + p.likes.length, 0)} icon="heart" tone="danger" />
        <Stat label="Институционални" value={all.filter((p) => p.kind === 'институционално').length} icon="school" tone="purple" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <Card pad={false}>
          <div className="border-b border-ink-200 px-5 py-3.5"><h2 className="font-bold text-ink-900">Всички портфолиа</h2></div>
          <ul className="divide-y divide-ink-100">
            {all.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => { setViewId(p.id); setActiveSection('Начало') }}
                  className={`w-full px-5 py-3 text-left hover:bg-ink-50 ${viewId === p.id ? 'bg-brand-50/60' : ''}`}
                >
                  <p className="truncate text-[13px] font-semibold text-ink-800">
                    {userName(p.userId)}
                    {p.userId === user?.id && <span className="ml-1.5 text-[11px] font-normal text-brand-700">(мое)</span>}
                  </p>
                  <p className="truncate text-[11px] text-ink-500">{p.position} · от {p.startYear}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {p.shared ? <Badge tone="ok">споделено</Badge> : <Badge tone="neutral">лично</Badge>}
                    <span className="flex items-center gap-1 text-[11px] text-ink-400"><Icon name="heart" size={11} /> {p.likes.length}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card pad={false}>
          {current ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-5 py-3.5">
                <div>
                  <h2 className="font-bold text-ink-900">{userName(current.userId)}</h2>
                  <p className="text-[12px] text-ink-500">{current.position} · {current.school} · актуализирано {formatDate(current.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {current.userId === user?.id && (
                    <>
                      <button
                        onClick={() => update((d) => {
                          const p = d.portfolios.find((x) => x.id === current.id)
                          if (p) p.shared = !p.shared
                        })}
                        className="btn-ghost !py-1.5 text-[12px]"
                      >
                        <Icon name="eye" size={14} /> {current.shared ? 'Скрий' : 'Сподели'}
                      </button>
                      <button
                        onClick={() => update((d) => {
                          const p = d.portfolios.find((x) => x.id === current.id)
                          if (p) p.hideContacts = !p.hideContacts
                        })}
                        className="btn-ghost !py-1.5 text-[12px]"
                      >
                        <Icon name="lock" size={14} /> {current.hideContacts ? 'Покажи контакти' : 'Скрий контакти'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => update((d) => {
                      const p = d.portfolios.find((x) => x.id === current.id)
                      if (p && user && !p.likes.includes(user.id)) p.likes.push(user.id)
                    })}
                    className="btn-ghost !py-1.5 text-[12px]"
                  >
                    <Icon name="heart" size={14} /> {current.likes.length}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 border-b border-ink-200 px-5 pt-3">
                {SECTIONS.map(([s]) => (
                  <button
                    key={s}
                    onClick={() => setActiveSection(s)}
                    className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-semibold transition ${
                      activeSection === s ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="p-5">
                <Textarea
                  value={current.sections[activeSection] ?? ''}
                  readOnly={current.userId !== user?.id}
                  onChange={(e) => update((d) => {
                    const p = d.portfolios.find((x) => x.id === current.id)
                    if (p) {
                      p.sections[activeSection] = e.target.value
                      p.updatedAt = new Date().toISOString().slice(0, 10)
                    }
                  })}
                  className="min-h-[220px]"
                />
                {current.userId !== user?.id && (
                  <p className="mt-2 text-[12px] text-ink-400">Преглед на чуждо портфолио — само за четене.</p>
                )}
              </div>
            </>
          ) : (
            <div className="p-5">
              <EmptyState title="Изберете портфолио" text="От списъка вляво изберете портфолио, което да разгледате." icon="badge" />
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={open} onClose={() => setOpen(false)} title="Създаване на портфолио"
        footer={<><button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button><button onClick={create} className="btn-primary">Създай</button></>}
      >
        <p className="text-sm text-ink-600">
          Ще бъде създадено учителско портфолио със секции: {SECTIONS.map(([s]) => s).join(', ')}.
        </p>
        <div className="mt-4">
          <Field label="Училище"><Input defaultValue={db.school.name} readOnly /></Field>
        </div>
      </Modal>
    </>
  )
}
