import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, Select, Stat, Table, Tabs, Textarea, formatDate } from '../components/ui'

export default function Lektorski() {
  const { db, update, user, userName, isAdmin } = useApp()
  const [tab, setTab] = useState('absences')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    teacherId: '', date: new Date().toISOString().slice(0, 10),
    periodFrom: 1, periodTo: 3, reason: 'Болничен',
    kind: 'със заместник' as const, substituteId: '', nationalProgram: false,
  })

  const teachers = db.users.filter((u) => u.roles.some((r) => ['teacher', 'class_teacher'].includes(r)))
  const visible = isAdmin ? db.lessonAbsences : db.lessonAbsences.filter((l) => l.teacherId === user?.id || l.substituteIds.includes(user!.id))

  const totalPeriods = visible.reduce((a, l) => a + (l.periods.length || 0), 0)
  const substituted = visible.filter((l) => l.substituteIds.length > 0).length

  return (
    <>
      <PageHeader
        title="Лекторски часове"
        subtitle="Учителски отсъствия, заместници, часове над хорариума и национални програми."
        icon="swap"
        actions={<button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Ново отсъствие</button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Отсъствия" value={visible.length} icon="swap" />
        <Stat label="Със заместник" value={substituted} icon="person" tone="ok" />
        <Stat label="Без заместник" value={visible.length - substituted} icon="warn" tone="danger" />
        <Stat label="Засегнати часове" value={totalPeriods} icon="clock" tone="warn" />
      </div>

      <Tabs
        tabs={[
          { id: 'absences', label: 'Учителски отсъствия', count: visible.length },
          { id: 'load', label: 'Часове над хорариума' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'absences' && (
        <>
          <Table
            head={<><th className="th">Учител</th><th className="th w-28">Дата</th><th className="th w-24">Часове</th><th className="th">Причина</th><th className="th">Заместник</th><th className="th w-32">Вид</th></>}
          >
            {visible.map((l) => (
              <tr key={l.id} className="hover:bg-ink-50/60">
                <td className="td font-medium">{userName(l.teacherId)}</td>
                <td className="td text-[12px] text-ink-500">{formatDate(l.date)}</td>
                <td className="td">{l.periods.join(', ')} ч.</td>
                <td className="td text-[13px] text-ink-600">
                  {l.reason}
                  {l.nationalProgram && <Badge tone="purple" className="ml-2">Без свободен час</Badge>}
                </td>
                <td className="td text-[13px]">
                  {l.substituteIds.length ? l.substituteIds.map(userName).join(', ') : <span className="text-danger">няма</span>}
                </td>
                <td className="td">
                  <Select
                    value={l.kind}
                    onChange={(e) => update((d) => {
                      const x = d.lessonAbsences.find((y) => y.id === l.id)
                      if (x) x.kind = e.target.value as typeof x.kind
                    })}
                    className="!py-1 text-[12px]"
                  >
                    <option value="със заместник">със заместник</option>
                    <option value="без заместник">без заместник</option>
                    <option value="лекторски">лекторски</option>
                  </Select>
                </td>
              </tr>
            ))}
          </Table>
          {visible.length === 0 && <EmptyState title="Няма учителски отсъствия" icon="swap" />}
        </>
      )}

      {tab === 'load' && (
        <Card pad={false}>
          <div className="border-b border-ink-200 px-5 py-3.5">
            <h2 className="font-bold text-ink-900">Натоварване и часове над хорариума</h2>
          </div>
          <Table head={<><th className="th">Учител</th><th className="th w-28">Редовни часове</th><th className="th w-32">Замествания</th><th className="th w-32">Общо</th><th className="th w-32">Статус</th></>}>
            {teachers.map((t) => {
              const regular = db.schedule.filter((s) => s.teacherId === t.id).length
              const subs = db.lessonAbsences.filter((l) => l.substituteIds.includes(t.id)).reduce((a, l) => a + l.periods.length, 0)
              const total = regular + subs
              return (
                <tr key={t.id} className="hover:bg-ink-50/60">
                  <td className="td font-medium">{t.firstName} {t.lastName}</td>
                  <td className="td">{regular}</td>
                  <td className="td">{subs}</td>
                  <td className="td font-bold">{total}</td>
                  <td className="td">
                    <Badge tone={total > 26 ? 'danger' : total > 20 ? 'warn' : 'ok'}>
                      {total > 26 ? 'над хорариума' : total > 20 ? 'пълна норма' : 'под нормата'}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </Table>
        </Card>
      )}

      <Modal
        open={open} onClose={() => setOpen(false)} title="Ново учителско отсъствие"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!form.teacherId) return
                update((d) => {
                  d.lessonAbsences.push({
                    id: `lab_${Date.now()}`, teacherId: form.teacherId, date: form.date,
                    periods: Array.from({ length: Math.max(1, form.periodTo - form.periodFrom + 1) }, (_, i) => form.periodFrom + i),
                    substituteIds: form.substituteId ? [form.substituteId] : [],
                    reason: form.reason, kind: form.kind, nationalProgram: form.nationalProgram,
                  })
                })
                setOpen(false)
              }}
              className="btn-primary"
            >
              Запази
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Отсъстващ учител">
            <Select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
              <option value="">— изберете —</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </Select>
          </Field>
          <Field label="Дата"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="От час"><Input type="number" min={1} max={7} value={form.periodFrom} onChange={(e) => setForm({ ...form, periodFrom: Number(e.target.value) })} /></Field>
          <Field label="До час"><Input type="number" min={1} max={7} value={form.periodTo} onChange={(e) => setForm({ ...form, periodTo: Number(e.target.value) })} /></Field>
          <Field label="Причина">
            <Select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
              <option>Болничен</option><option>Служебна командировка</option>
              <option>Отпуск</option><option>Квалификационен курс</option><option>Друга</option>
            </Select>
          </Field>
          <Field label="Вид">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as typeof form.kind })}>
              <option value="със заместник">Със заместник</option>
              <option value="без заместник">Без заместник</option>
              <option value="лекторски">Лекторски часове</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Заместник" hint="Оставете празно, ако няма заместник.">
              <Select value={form.substituteId} onChange={(e) => setForm({ ...form, substituteId: e.target.value })}>
                <option value="">— без заместник —</option>
                {teachers.filter((t) => t.id !== form.teacherId).map((t) => (
                  <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2.5 rounded-lg border border-ink-200 px-4 py-3">
              <input
                type="checkbox"
                checked={form.nationalProgram}
                onChange={(e) => setForm({ ...form, nationalProgram: e.target.checked })}
                className="h-4 w-4 rounded"
              />
              <span className="text-[13px] text-ink-700">Отсъствие по Национална програма „Без свободен час“</span>
            </label>
          </div>
        </div>
      </Modal>
    </>
  )
}
