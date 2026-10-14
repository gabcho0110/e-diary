import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, Select, Stat, Table, Tabs, Textarea, formatDate } from '../components/ui'

export default function Sreshti() {
  const { db, myClasses, bookMeeting, cancelMeeting, update, user, userName, className } = useApp()
  const [tab, setTab] = useState('schedule')
  const [teacherFilter, setTeacherFilter] = useState('')
  const [bookId, setBookId] = useState<string | null>(null)
  const [topic, setTopic] = useState('')

  const isParent = user?.roles.includes('parent')
  const isTeacher = user?.roles.some((r) => ['teacher', 'class_teacher', 'deputy', 'director', 'sysadmin'].includes(r))

  const slots = useMemo(() => {
    let list = db.meetings
    if (isParent) list = list.filter((m) => m.status === 'свободен' || m.parentId === user!.id)
    if (isTeacher && !user?.roles.includes('sysadmin') && !user?.roles.includes('director')) {
      list = list.filter((m) => m.teacherId === user!.id || m.parentId === user!.id)
    }
    if (teacherFilter) list = list.filter((m) => m.teacherId === teacherFilter)
    return [...list].sort((a, b) => a.from.localeCompare(b.from))
  }, [db.meetings, isParent, isTeacher, user, teacherFilter])

  const myBookings = slots.filter((m) => m.parentId === user?.id)
  const teachers = db.users.filter((u) => u.roles.some((r) => ['teacher', 'class_teacher'].includes(r)))

  return (
    <>
      <PageHeader
        title="Срещи"
        subtitle="Кампании за срещи между учители и родители — свободни часове, резервиране и отказ."
        icon="meet"
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} className="w-auto min-w-[180px]">
              <option value="">Всички учители</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </Select>
            {!isParent && (
              <button
                onClick={() => {
                  update((d) => {
                    const t = user!.id
                    const start = 17
                    for (let i = 0; i < 12; i++) {
                      d.meetings.push({
                        id: `mtg_${Date.now()}_${i}`, teacherId: t, parentId: null,
                        date: new Date().toISOString().slice(0, 10),
                        from: `${start + Math.floor(i / 4)}:${String((i % 4) * 15).padStart(2, '0')}`,
                        to: `${start + Math.floor(i / 4)}:${String((i % 4) * 15 + 15).padStart(2, '0')}`,
                        status: 'свободен',
                      })
                    }
                  })
                  alert('Създадена е кампания с 12 свободни часа (17:00–18:00) за днес.')
                }}
                className="btn-primary"
              >
                <Icon name="plus" size={15} /> Нова кампания
              </button>
            )}
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Часове" value={slots.length} icon="meet" />
        <Stat label="Свободни" value={slots.filter((m) => m.status === 'свободен').length} icon="clock" tone="ok" />
        <Stat label="Заети" value={slots.filter((m) => m.status === 'зает').length} icon="check" tone="warn" />
        <Stat label="Моите резервации" value={myBookings.length} icon="person" tone="brand" />
      </div>

      <Tabs
        tabs={[
          { id: 'schedule', label: 'График', count: slots.length },
          { id: 'mine', label: 'Моите срещи', count: myBookings.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'schedule' && (
        <Table
          head={<><th className="th w-28">Час</th><th className="th">Учител</th><th className="th">Родител</th><th className="th">Тема</th><th className="th w-28">Състояние</th><th className="th w-40"></th></>}
        >
          {slots.slice(0, 150).map((m) => (
            <tr key={m.id} className="hover:bg-ink-50/60">
              <td className="td font-mono text-[13px]">{m.from}–{m.to}</td>
              <td className="td">{userName(m.teacherId)}</td>
              <td className="td">{m.parentId ? userName(m.parentId) : <span className="text-ink-400">—</span>}</td>
              <td className="td text-[13px] text-ink-600">{m.topic ?? '—'}</td>
              <td className="td">
                <Badge tone={m.status === 'свободен' ? 'ok' : m.status === 'зает' ? 'warn' : 'neutral'}>{m.status}</Badge>
              </td>
              <td className="td">
                {m.status === 'свободен' ? (
                  <button onClick={() => { setBookId(m.id); setTopic('') }} className="btn-primary !py-1.5 text-[12px]">
                    Резервирай
                  </button>
                ) : m.parentId === user?.id ? (
                  <button onClick={() => cancelMeeting(m.id)} className="btn-ghost !py-1.5 text-[12px]">Откажи</button>
                ) : (
                  <span className="text-[12px] text-ink-400">зает</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {tab === 'mine' && (
        <>
          {myBookings.length === 0 ? (
            <EmptyState title="Нямате резервирани срещи" text="От графика изберете свободен час и го резервирайте." icon="meet" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {myBookings.map((m) => (
                <Card key={m.id}>
                  <div className="mb-3 flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon name="meet" size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-900">{userName(m.teacherId)}</p>
                      <p className="text-[11px] text-ink-500">{formatDate(m.date)} · {m.from}–{m.to}</p>
                    </div>
                    <Badge tone="warn">зает</Badge>
                  </div>
                  <p className="mb-3 text-[13px] text-ink-600">{m.topic ?? 'Без зададена тема'}</p>
                  <div className="flex gap-2 border-t border-ink-100 pt-3">
                    <button onClick={() => cancelMeeting(m.id)} className="btn-ghost !py-1.5 text-[12px]">Откажи срещата</button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={!!bookId} onClose={() => setBookId(null)} title="Резервиране на среща"
        footer={
          <>
            <button onClick={() => setBookId(null)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!bookId) return
                bookMeeting(bookId, user!.id, topic || 'Среща с учител')
                setBookId(null)
              }}
              className="btn-primary"
            >
              Резервирай
            </button>
          </>
        }
      >
        {bookId && (() => {
          const m = db.meetings.find((x) => x.id === bookId)
          if (!m) return null
          return (
            <>
              <div className="mb-4 grid gap-2 rounded-lg bg-ink-50 px-4 py-3 text-[13px]">
                <div className="flex justify-between"><span className="text-ink-500">Учител</span><b>{userName(m.teacherId)}</b></div>
                <div className="flex justify-between"><span className="text-ink-500">Дата</span><b>{formatDate(m.date)}</b></div>
                <div className="flex justify-between"><span className="text-ink-500">Час</span><b>{m.from}–{m.to}</b></div>
              </div>
              <Field label="Тема на разговора">
                <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="напр. Обсъждане на успеха и отсъствията" />
              </Field>
            </>
          )
        })()}
      </Modal>
    </>
  )
}
