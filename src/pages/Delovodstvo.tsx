import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, Select, Stat, Table, Tabs, Textarea, formatDate } from '../components/ui'

const BOOKS = [
  { id: 'protocol', name: 'Книга за протоколи от педагогически съвет', code: 'ПС' },
  { id: 'orders', name: 'Книга за заповеди на директора', code: 'ЗП' },
  { id: 'decisions', name: 'Книга за решения на педагогическия съвет', code: 'КР' },
  { id: 'control', name: 'Книга за контролна дейност на директора', code: 'КД' },
  { id: 'correspondence', name: 'Книга за кореспонденция (входяща/изходяща)', code: 'КО' },
  { id: 'diary-school', name: 'Училищен дневник (архивен)', code: 'УД' },
  { id: 'diary-class', name: 'Дневник на паралелка', code: 'ДП' },
  { id: 'diary-merged', name: 'Дневник на паралелка със слети класове', code: 'ДС' },
]

export default function Delovodstvo() {
  const { db, update, user, className, studentName, userName } = useApp()
  const [tab, setTab] = useState('protocols')
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)
  const [form, setForm] = useState({
    bookId: 'protocol', number: '', date: new Date().toISOString().slice(0, 10),
    subject: '', body: '', classId: db.classes[0]?.id ?? '',
  })

  const delovodstvoDocs = db.docs.filter((d) => BOOKS.some((b) => b.code === d.templateId.slice(0, 2)))
  const entries = db.docs.filter((d) => !['У-1', 'У-3', '3-31', '3-44', '3-54', '3-103', 'ЛК'].includes(d.templateId))
  const current = db.docs.find((d) => d.id === detail)

  return (
    <>
      <PageHeader
        title="Деловодство"
        subtitle="Училищни протоколи, книги за заповеди и решения, контролна дейност и кореспонденция."
        icon="archive"
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => window.print()} className="btn-ghost"><Icon name="print" size={15} /> Печат</button>
            <button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Нов запис</button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Записи" value={entries.length} icon="archive" />
        <Stat label="Книги" value={BOOKS.length} icon="report" tone="brand" />
        <Stat label="Протоколи" value={entries.filter((e) => e.templateId.startsWith('ПС')).length} icon="clipboard" tone="purple" />
        <Stat label="Заповеди" value={entries.filter((e) => e.templateId.startsWith('ЗП')).length} icon="certificate" tone="warn" />
      </div>

      <Tabs
        tabs={[
          { id: 'protocols', label: 'Протоколи и заповеди', count: entries.length },
          { id: 'books', label: 'Книги', count: BOOKS.length },
          { id: 'diary', label: 'Училищни дневници' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'protocols' && (
        <>
          <Table
            head={<><th className="th w-24">Код</th><th className="th">Документ</th><th className="th w-28">Номер</th><th className="th w-28">Дата</th><th className="th">Създал</th><th className="th w-24"></th></>}
          >
            {entries.map((d) => (
              <tr key={d.id} className="hover:bg-ink-50/60">
                <td className="td font-mono text-[12px] font-bold">{d.templateId}</td>
                <td className="td font-medium">{String(d.payload?.име ?? d.templateId)}</td>
                <td className="td font-mono text-[12px]">{d.number}</td>
                <td className="td text-[12px] text-ink-500">{formatDate(d.date)}</td>
                <td className="td text-[13px]">{userName(d.createdById)}</td>
                <td className="td">
                  <button onClick={() => setDetail(d.id)} className="text-[12px] font-semibold text-brand-700 hover:underline">Отвори</button>
                </td>
              </tr>
            ))}
          </Table>
          {entries.length === 0 && <EmptyState title="Няма записи" text="Все още не са създадени протоколи или заповеди." icon="archive" />}
        </>
      )}

      {tab === 'books' && (
        <Table head={<><th className="th w-24">Код</th><th className="th">Наименование на книгата</th><th className="th w-28">Записи</th><th className="th w-32">Последен запис</th><th className="th w-24"></th></>}>
          {BOOKS.map((b) => {
            const rows = db.docs.filter((d) => d.templateId.startsWith(b.code))
            const last = rows.map((r) => r.date).sort().pop()
            return (
              <tr key={b.id} className="hover:bg-ink-50/60">
                <td className="td font-mono text-[12px] font-bold">{b.code}</td>
                <td className="td font-medium">{b.name}</td>
                <td className="td">{rows.length}</td>
                <td className="td text-[12px] text-ink-500">{last ? formatDate(last) : '—'}</td>
                <td className="td">
                  <button
                    onClick={() => {
                      if (!user) return
                      update((d) => {
                        d.docs.unshift({
                          id: `doc_${Date.now()}`, templateId: `${b.code}-${rows.length + 1}`,
                          number: String(rows.length + 1), date: new Date().toISOString().slice(0, 10),
                          createdById: user.id, payload: { име: `Нов запис в ${b.name}` },
                        })
                      })
                    }}
                    className="text-[12px] font-semibold text-brand-700 hover:underline"
                  >
                    Нов запис
                  </button>
                </td>
              </tr>
            )
          })}
        </Table>
      )}

      {tab === 'diary' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {db.classes.map((k) => (
            <Card key={k.id}>
              <div className="mb-3 flex items-start gap-3">
                <span className="grid h-10 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 font-bold text-brand-700">{k.name}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-900">Дневник на {k.name}</p>
                  <p className="text-[11px] text-ink-500">{k.studentIds.length} ученика · {k.subjectIds.length} предмета</p>
                </div>
              </div>
              <div className="flex gap-2 border-t border-ink-100 pt-3">
                <button
                  onClick={() => alert(`Генериран е архивен дневник за ${k.name} за учебната ${db.school.year} година.`)}
                  className="btn-ghost !py-1.5 text-[12px]"
                >
                  <Icon name="report" size={13} /> Генерирай дневник
                </button>
                <button
                  onClick={() => alert(`Дневникът на ${k.name} е изпратен за печат.`)}
                  className="btn-ghost !py-1.5 text-[12px]"
                >
                  <Icon name="print" size={13} /> Печат
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!current} onClose={() => setDetail(null)} title={String(current?.payload?.име ?? 'Запис')}
        footer={current && <button onClick={() => setDetail(null)} className="btn-primary">Затвори</button>}
      >
        {current && (
          <div className="space-y-3">
            <div className="grid gap-2 rounded-lg bg-ink-50 px-4 py-3 text-[13px]">
              <div className="flex justify-between"><span className="text-ink-500">Код</span><b className="font-mono">{current.templateId}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Номер</span><b>{current.number}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Дата</span><b>{formatDate(current.date)}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Създал</span><b>{userName(current.createdById)}</b></div>
            </div>
            <Field label="Съдържание">
              <Textarea
                defaultValue={
                  `Днес, ${formatDate(current.date)}, се проведе заседание на педагогическия съвет при следния дневен ред:\n` +
                  `1. Отчет на резултатите от първия срок.\n` +
                  `2. Утвърждаване на графика за контролните работи.\n` +
                  `3. Организация на родителската среща.\n\n` +
                  `Решения: приемат се с пълно мнозинство.`
                }
                className="min-h-[220px]"
              />
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={open} onClose={() => setOpen(false)} title="Нов запис в деловодството"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!form.subject || !user) return
                const b = BOOKS.find((x) => x.id === form.bookId)!
                update((d) => {
                  d.docs.unshift({
                    id: `doc_${Date.now()}`, templateId: `${b.code}-${d.docs.length + 1}`,
                    number: form.number || String(d.docs.length + 1), date: form.date,
                    createdById: user.id, payload: { име: form.subject, съдържание: form.body },
                  })
                })
                setForm({ ...form, subject: '', body: '' })
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
          <div className="sm:col-span-2">
            <Field label="Книга">
              <Select value={form.bookId} onChange={(e) => setForm({ ...form, bookId: e.target.value })}>
                {BOOKS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Номер"><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></Field>
          <Field label="Дата"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Field label="Предмет / основание"><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Съдържание"><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
          </div>
        </div>
      </Modal>
    </>
  )
}
