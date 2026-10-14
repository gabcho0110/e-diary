import { useState } from 'react'
import { useApp } from '../store/AppContext'
import type { Task } from '../lib/types'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, Select, Stat, Table, Tabs, Textarea, formatDate } from '../components/ui'

const PRIORITY_TONE: Record<string, 'danger' | 'warn' | 'neutral'> = { висок: 'danger', среден: 'warn', нисък: 'neutral' }

export default function Zadachi() {
  const { db, user, addTask, updateTask, userName, isAdmin } = useApp()
  const [tab, setTab] = useState<'mine' | 'given' | 'all'>('mine')
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '', description: '', assignedTo: '', dueDate: new Date().toISOString().slice(0, 10),
    priority: 'среден' as Task['priority'],
  })

  const mine = db.tasks.filter((t) => t.assignedToIds.includes(user!.id))
  const given = db.tasks.filter((t) => t.assignedById === user!.id)
  const list = tab === 'mine' ? mine : tab === 'given' ? given : db.tasks

  const current = db.tasks.find((t) => t.id === detail)

  const counts = {
    new: mine.filter((t) => t.status === 'нова').length,
    progress: mine.filter((t) => t.status === 'в процес').length,
    done: mine.filter((t) => t.status === 'изпълнена').length,
    overdue: mine.filter((t) => t.status === 'просрочена').length,
  }

  return (
    <>
      <PageHeader
        title="Задачи"
        subtitle="Поставяне, проследяване и изпълнение на задачи между учители и администрация."
        icon="task"
        actions={<button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Нова задача</button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Нови" value={counts.new} icon="task" />
        <Stat label="В процес" value={counts.progress} icon="clock" tone="warn" />
        <Stat label="Изпълнени" value={counts.done} icon="check" tone="ok" />
        <Stat label="Просрочени" value={counts.overdue} icon="warn" tone="danger" />
      </div>

      <Tabs
        tabs={[
          { id: 'mine', label: 'Моите задачи', count: mine.length },
          { id: 'given', label: 'Възложени от мен', count: given.length },
          ...(isAdmin ? [{ id: 'all', label: 'Всички', count: db.tasks.length }] : []),
        ]}
        active={tab}
        onChange={(v) => setTab(v as typeof tab)}
      />

      {list.length === 0 ? (
        <EmptyState title="Няма задачи" text="Към момента няма задачи по избрания филтър." icon="task" />
      ) : (
        <Table
          head={<><th className="th">Задача</th><th className="th w-32">Приоритет</th><th className="th w-28">Краен срок</th><th className="th w-32">Състояние</th><th className="th">Възложена от</th><th className="th w-32"></th></>}
        >
          {list.map((t) => (
            <tr key={t.id} className="hover:bg-ink-50/60">
              <td className="td">
                <button onClick={() => setDetail(t.id)} className="text-left">
                  <p className="font-medium text-ink-900">{t.title}</p>
                  <p className="line-clamp-1 text-[12px] text-ink-500">{t.description}</p>
                </button>
              </td>
              <td className="td"><Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge></td>
              <td className="td text-[12px] text-ink-500">{formatDate(t.dueDate)}</td>
              <td className="td">
                <Badge tone={t.status === 'изпълнена' ? 'ok' : t.status === 'просрочена' ? 'danger' : t.status === 'в процес' ? 'warn' : 'neutral'}>
                  {t.status}
                </Badge>
              </td>
              <td className="td text-[13px]">{userName(t.assignedById)}</td>
              <td className="td">
                {t.assignedToIds.includes(user!.id) && t.status !== 'изпълнена' && (
                  <button
                    onClick={() => updateTask(t.id, { status: 'изпълнена', completedAt: new Date().toISOString().slice(0, 10), result: 'Отбележена като изпълнена.' })}
                    className="btn-ok !py-1.5 text-[12px]"
                  >
                    Изпълни
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Modal
        open={!!detail} onClose={() => setDetail(null)} title={current?.title ?? ''}
        footer={current && <button onClick={() => setDetail(null)} className="btn-primary">Затвори</button>}
      >
        {current && (
          <>
            <div className="mb-4 grid gap-2 rounded-lg bg-ink-50 px-4 py-3 text-[13px]">
              <div className="flex justify-between"><span className="text-ink-500">Възложена от</span><b>{userName(current.assignedById)}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Изпълнител</span><b>{current.assignedToIds.map(userName).join(', ')}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Краен срок</span><b>{formatDate(current.dueDate)}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Приоритет</span><b>{current.priority}</b></div>
            </div>
            <p className="text-sm leading-relaxed text-ink-700">{current.description}</p>

            <div className="mt-4">
              <Field label="Състояние">
                <Select
                  value={current.status}
                  onChange={(e) => updateTask(current.id, { status: e.target.value as Task['status'] })}
                >
                  <option>нова</option><option>в процес</option><option>изпълнена</option><option>просрочена</option>
                </Select>
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Резултат / коментар">
                <Textarea
                  defaultValue={current.result ?? ''}
                  onBlur={(e) => updateTask(current.id, { result: e.target.value })}
                  placeholder="Опишете резултата от изпълнението…"
                />
              </Field>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={open} onClose={() => setOpen(false)} title="Нова задача"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!form.title || !form.assignedTo) return
                addTask({
                  title: form.title, description: form.description,
                  assignedToIds: [form.assignedTo], assignedById: user!.id,
                  dueDate: form.dueDate, priority: form.priority,
                })
                setForm({ ...form, title: '', description: '' })
                setOpen(false)
              }}
              className="btn-primary"
            >
              Възложи
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Заглавие"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          </div>
          <Field label="Изпълнител">
            <Select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="">— изберете —</option>
              {db.users.filter((u) => u.roles.some((r) => ['teacher', 'class_teacher', 'deputy', 'secretary', 'accountant', 'librarian', 'nurse'].includes(r))).map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </Select>
          </Field>
          <Field label="Краен срок"><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
          <Field label="Приоритет">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })}>
              <option value="нисък">Нисък</option><option value="среден">Среден</option><option value="висок">Висок</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Описание"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          </div>
        </div>
      </Modal>
    </>
  )
}
