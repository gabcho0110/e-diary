import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import { Avatar, Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, SearchInput, Select, Stat, Tabs, Textarea, formatDate } from '../components/ui'

export default function Saobshtenia() {
  const { db, user, sendMessage, markRead, archiveMessage, deleteMessage, userName, myClasses } = useApp()
  const [tab, setTab] = useState<'inbox' | 'sent' | 'archive'>('inbox')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [compose, setCompose] = useState(false)

  const [form, setForm] = useState({
    to: '', subject: '', body: '',
    allowReplies: true, hideRecipients: false, group: '',
  })

  const inbox = useMemo(
    () => db.messages.filter((m) => m.toIds.includes(user!.id) && !m.archived),
    [db.messages, user],
  )
  const sent = useMemo(() => db.messages.filter((m) => m.fromId === user!.id), [db.messages, user])
  const archived = useMemo(() => db.messages.filter((m) => m.toIds.includes(user!.id) && m.archived), [db.messages, user])

  const list = (tab === 'inbox' ? inbox : tab === 'sent' ? sent : archived).filter(
    (m) =>
      !q.trim() ||
      m.subject.toLowerCase().includes(q.toLowerCase()) ||
      m.body.toLowerCase().includes(q.toLowerCase()) ||
      userName(m.fromId).toLowerCase().includes(q.toLowerCase()),
  )

  const open = db.messages.find((m) => m.id === openId)
  const unread = inbox.filter((m) => !m.readBy.includes(user!.id)).length

  const groups: [string, string][] = [
    ['всички-учители', 'Всички учители'],
    ['всички-родители', 'Всички родители'],
    ['клас', 'Родителите в даден клас'],
    ['клас-ученици', 'Учениците в даден клас'],
    ['администрация', 'Администрация'],
  ]

  const recipientsFor = (g: string, classId?: string): string[] => {
    if (g === 'всички-учители')
      return db.users.filter((u) => u.roles.some((r) => ['teacher', 'class_teacher', 'deputy', 'director'].includes(r))).map((u) => u.id)
    if (g === 'всички-родители') return db.users.filter((u) => u.roles.includes('parent')).map((u) => u.id)
    if (g === 'администрация') return db.users.filter((u) => u.roles.some((r) => ['sysadmin', 'director', 'deputy', 'secretary'].includes(r))).map((u) => u.id)
    if ((g === 'клас' || g === 'клас-ученици') && classId) {
      const k = db.classes.find((c) => c.id === classId)
      if (!k) return []
      if (g === 'клас') return db.users.filter((u) => u.roles.includes('parent') && k.studentIds.some((sid) => u.childrenIds?.includes(sid))).map((u) => u.id)
      return db.users.filter((u) => u.roles.includes('student') && u.studentId && k.studentIds.includes(u.studentId)).map((u) => u.id)
    }
    return []
  }

  return (
    <>
      <PageHeader
        title="Съобщения"
        subtitle="Вътрешна поща — съобщения до учители, родители и цели класове, дискусии и архив."
        icon="mail"
        actions={<button onClick={() => setCompose(true)} className="btn-primary"><Icon name="plus" size={15} /> Ново съобщение</button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Входящи" value={inbox.length} icon="mail" />
        <Stat label="Непрочетени" value={unread} icon="bell" tone="danger" />
        <Stat label="Изпратени" value={sent.length} icon="upload" tone="brand" />
        <Stat label="Архивирани" value={archived.length} icon="archive" tone="purple" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card pad={false}>
          <div className="border-b border-ink-200 p-3">
            <SearchInput value={q} onChange={setQ} placeholder="Търсене по автор или тема…" />
          </div>
          <div className="flex border-b border-ink-200">
            {([['inbox', 'Входящи', inbox.length], ['sent', 'Изпратени', sent.length], ['archive', 'Архив', archived.length]] as const).map(([id, label, n]) => (
              <button
                key={id}
                onClick={() => setTab(id as typeof tab)}
                className={`flex-1 border-b-2 px-2 py-2.5 text-[12px] font-semibold transition ${
                  tab === id ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-700'
                }`}
              >
                {label} <span className="text-ink-400">({n})</span>
              </button>
            ))}
          </div>
          <ul className="max-h-[560px] divide-y divide-ink-100 overflow-y-auto">
            {list.map((m) => {
              const isUnread = tab === 'inbox' && !m.readBy.includes(user!.id)
              return (
                <li key={m.id}>
                  <button
                    onClick={() => { setOpenId(m.id); if (isUnread) markRead(m.id) }}
                    className={`w-full px-4 py-3 text-left transition hover:bg-ink-50 ${openId === m.id ? 'bg-brand-50/60' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                      <span className={`min-w-0 flex-1 truncate text-[13px] ${isUnread ? 'font-bold text-ink-900' : 'font-medium text-ink-700'}`}>
                        {m.subject}
                      </span>
                      <span className="shrink-0 text-[11px] text-ink-400">{formatDate(m.date)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-500">
                      {tab === 'sent' ? `до ${m.toIds.length} получатели` : userName(m.fromId)}
                    </p>
                  </button>
                </li>
              )
            })}
            {list.length === 0 && <li className="p-5"><EmptyState title="Няма съобщения" icon="mail" /></li>}
          </ul>
        </Card>

        <Card>
          {open ? (
            <>
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-ink-100 pb-4">
                <div className="flex items-start gap-3">
                  <Avatar name={userName(open.fromId)} size={40} />
                  <div>
                    <h2 className="font-bold text-ink-900">{open.subject}</h2>
                    <p className="text-[12px] text-ink-500">
                      от <b>{userName(open.fromId)}</b> · {formatDate(open.date)} · до {open.toIds.length} получатели
                      {open.hideRecipients && ' (скрити)'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => archiveMessage(open.id, !open.archived)}
                    title={open.archived ? 'Върни от архив' : 'Архивирай'}
                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                  >
                    <Icon name="archive" size={16} />
                  </button>
                  <button
                    onClick={() => { deleteMessage(open.id); setOpenId(null) }}
                    title="Изтрий"
                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-[#fde8e8] hover:text-danger"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{open.body}</p>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
                <Badge tone={open.allowReplies ? 'ok' : 'neutral'}>
                  {open.allowReplies ? 'отговорите са разрешени' : 'отговорите са забранени'}
                </Badge>
                <Badge tone={open.hideRecipients ? 'warn' : 'neutral'}>
                  {open.hideRecipients ? 'получателите са скрити' : 'получателите са видими'}
                </Badge>
                <button
                  onClick={() => {
                    setForm({ ...form, subject: `Отг: ${open.subject}`, body: '' })
                    setCompose(true)
                  }}
                  className="btn-ghost ml-auto !py-1.5 text-[12px]"
                >
                  <Icon name="mail" size={14} /> Отговори
                </button>
              </div>
            </>
          ) : (
            <EmptyState title="Изберете съобщение" text="От списъка вляво изберете съобщение, за да го прочетете." icon="mail" />
          )}
        </Card>
      </div>

      <Modal
        open={compose} onClose={() => setCompose(false)} wide title="Ново съобщение"
        footer={
          <>
            <button onClick={() => setCompose(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                const toIds = form.group ? recipientsFor(form.group, form.to) : form.to ? [form.to] : []
                if (!toIds.length || !form.subject) return
                sendMessage({
                  fromId: user!.id, toIds, subject: form.subject, body: form.body,
                  allowReplies: form.allowReplies, hideRecipients: form.hideRecipients,
                  attachments: [], groupId: form.group || undefined,
                })
                setForm({ to: '', subject: '', body: '', allowReplies: true, hideRecipients: false, group: '' })
                setCompose(false)
                setTab('sent')
              }}
              className="btn-primary"
            >
              Изпрати
            </button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="До (група)">
            <Select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })}>
              <option value="">— отделен получател —</option>
              {groups.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </Select>
          </Field>

          {form.group === 'клас' || form.group === 'клас-ученици' ? (
            <Field label="Паралелка">
              <Select value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })}>
                <option value="">— изберете паралелка —</option>
                {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          ) : (
            !form.group && (
              <Field label="До (потребител)">
                <Select value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })}>
                  <option value="">— изберете получател —</option>
                  {db.users.filter((u) => u.id !== user!.id).slice(0, 200).map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.username})</option>
                  ))}
                </Select>
              </Field>
            )
          )}

          <Field label="Тема"><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
          <Field label="Съобщение"><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="min-h-[160px]" /></Field>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-[13px] text-ink-600">
              <input type="checkbox" checked={form.allowReplies} onChange={(e) => setForm({ ...form, allowReplies: e.target.checked })} className="h-4 w-4 rounded" />
              Разреши отговори (дискусия)
            </label>
            <label className="flex items-center gap-2 text-[13px] text-ink-600">
              <input type="checkbox" checked={form.hideRecipients} onChange={(e) => setForm({ ...form, hideRecipients: e.target.checked })} className="h-4 w-4 rounded" />
              Скрий получателите
            </label>
          </div>

          {form.group && (
            <p className="rounded-lg bg-brand-50 px-3.5 py-2.5 text-[12px] text-brand-900">
              Ще бъде изпратено до <b>{recipientsFor(form.group, form.to).length}</b> получатели.
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}
