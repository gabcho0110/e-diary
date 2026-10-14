import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, SearchInput, Select, Stat, Table, Tabs, Textarea, formatDate } from '../components/ui'

export default function Taksi() {
  const { db, update, updateFee, studentName, className } = useApp()
  const [tab, setTab] = useState('fees')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [payId, setPayId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')

  const [form, setForm] = useState({
    studentId: '', category: 'Такса за учебници', amount: 60,
    dueDate: new Date().toISOString().slice(0, 10), note: '',
  })

  const fees = db.fees
  const collected = fees.reduce((a, f) => a + f.paid, 0)
  const expected = fees.reduce((a, f) => a + f.amount, 0)

  const filtered = useMemo(
    () => fees.filter((f) => !q.trim() || studentName(f.studentId).toLowerCase().includes(q.toLowerCase()) || f.category.toLowerCase().includes(q.toLowerCase())),
    [fees, q, studentName],
  )

  const pay = db.fees.find((f) => f.id === payId)

  return (
    <>
      <PageHeader
        title="Такси"
        subtitle="Такси, стипендии, отстъпки, данъци, дружества и банкови сметки."
        icon="wallet"
        actions={<button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Нова такса</button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Събрани средства" value={`${collected.toFixed(0)} лв.`} icon="wallet" tone="ok" />
        <Stat label="Очаквани" value={`${expected.toFixed(0)} лв.`} icon="chart" tone="brand" />
        <Stat label="Неплатени" value={fees.filter((f) => f.status === 'неплатена').length} icon="warn" tone="danger" />
        <Stat label="Събираемост" value={`${expected ? ((collected / expected) * 100).toFixed(0) : 0}%`} icon="check" tone="purple" />
      </div>

      <Tabs
        tabs={[
          { id: 'fees', label: 'Такси', count: fees.length },
          { id: 'categories', label: 'Категории и настройки' },
          { id: 'accounts', label: 'Банкови сметки' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'fees' && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Търсене по ученик или категория…" />
            <Select
              className="w-auto min-w-[170px]"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value
                if (!v) return
                if (v === 'remind') alert('Изпратено е напомняне до родителите на учениците с неплатени такси.')
                if (v === 'export') alert('Списъкът с неплатени такси е експортиран в .xlsx.')
              }}
            >
              <option value="">Действия…</option>
              <option value="remind">Изпрати напомняне до родителите</option>
              <option value="export">Експорт на неплатени такси</option>
            </Select>
          </div>

          <Table
            head={<><th className="th">Ученик</th><th className="th">Паралелка</th><th className="th">Категория</th><th className="th w-24">Сума</th><th className="th w-24">Платено</th><th className="th w-24">Остатък</th><th className="th w-28">Краен срок</th><th className="th w-28">Състояние</th><th className="th w-24"></th></>}
          >
            {filtered.slice(0, 80).map((f) => (
              <tr key={f.id} className="hover:bg-ink-50/60">
                <td className="td font-medium">{studentName(f.studentId)}</td>
                <td className="td text-[13px] text-ink-500">{className(db.students.find((s) => s.id === f.studentId)?.classId ?? '')}</td>
                <td className="td text-[13px]">{f.category}</td>
                <td className="td">{f.amount} лв.</td>
                <td className="td">{f.paid} лв.</td>
                <td className="td font-semibold">{f.amount - f.paid} лв.</td>
                <td className="td text-[12px] text-ink-500">{formatDate(f.dueDate)}</td>
                <td className="td">
                  <Badge tone={f.status === 'платена' ? 'ok' : f.status === 'частична' ? 'warn' : 'danger'}>{f.status}</Badge>
                </td>
                <td className="td">
                  {f.status !== 'платена' && (
                    <button onClick={() => { setPayId(f.id); setPayAmount(String(f.amount - f.paid)) }} className="btn-ok !py-1.5 text-[12px]">
                      Внеси
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
          {filtered.length > 80 && <p className="mt-2 text-[12px] text-ink-400">Показани първите 80 от {filtered.length} записа.</p>}
        </>
      )}

      {tab === 'categories' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card pad={false}>
            <div className="border-b border-ink-200 px-5 py-3.5"><h2 className="font-bold text-ink-900">Категории такси</h2></div>
            <Table head={<><th className="th">Категория</th><th className="th w-24">Записи</th><th className="th w-28">Събрано</th></>}>
              {[...new Set(fees.map((f) => f.category))].map((c) => {
                const rows = fees.filter((f) => f.category === c)
                return (
                  <tr key={c}>
                    <td className="td font-medium">{c}</td>
                    <td className="td">{rows.length}</td>
                    <td className="td">{rows.reduce((a, f) => a + f.paid, 0)} лв.</td>
                  </tr>
                )
              })}
            </Table>
          </Card>

          <div className="space-y-5">
            <Card>
              <h2 className="mb-4 font-bold text-ink-900">Стипендии и отстъпки</h2>
              <div className="space-y-3">
                {[
                  ['Стипендия за отличен успех', '150 лв./месец', 'ok'],
                  ['Социална стипендия', '120 лв./месец', 'brand'],
                  ['Отстъпка за второ дете', '30%', 'warn'],
                  ['Отстъпка за пълен срок', '10%', 'neutral'],
                ].map(([n, v, tone]) => (
                  <div key={n} className="flex items-center justify-between rounded-lg border border-ink-200 px-4 py-3">
                    <span className="text-[13px] font-medium text-ink-700">{n}</span>
                    <Badge tone={tone as 'ok'}>{v}</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 font-bold text-ink-900">Данък и дружества</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="ДДС (%)"><Input type="number" defaultValue={0} /></Field>
                <Field label="Дружество (издател на фактури)"><Input defaultValue={db.school.name} /></Field>
                <Field label="Булстат"><Input defaultValue="175123456" /></Field>
                <Field label="МОЛ"><Input defaultValue={db.school.principal} /></Field>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'accounts' && (
        <Table head={<><th className="th">Банка</th><th className="th">IBAN</th><th className="th">Титуляр</th><th className="th w-28">Валута</th><th className="th w-28">Статус</th></>}>
          {[
            ['Обединена българска банка', 'BG18UBBS80021012345678', db.school.name, 'BGN', 'активна'],
            ['Банка ДСК', 'BG22STSA93000012345678', db.school.name, 'BGN', 'активна'],
            ['Юробанк България', 'BG44BPBI79401012345678', db.school.name, 'EUR', 'неактивна'],
          ].map(([bank, iban, holder, cur, st]) => (
            <tr key={iban} className="hover:bg-ink-50/60">
              <td className="td font-medium">{bank}</td>
              <td className="td font-mono text-[12px]">{iban}</td>
              <td className="td text-[13px]">{holder}</td>
              <td className="td">{cur}</td>
              <td className="td"><Badge tone={st === 'активна' ? 'ok' : 'neutral'}>{st}</Badge></td>
            </tr>
          ))}
        </Table>
      )}

      <Modal
        open={!!payId} onClose={() => setPayId(null)} title="Внасяне на плащане"
        footer={
          <>
            <button onClick={() => setPayId(null)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!pay) return
                updateFee(pay.id, { paid: pay.paid + Number(payAmount || 0) })
                setPayId(null)
              }}
              className="btn-primary"
            >
              Внеси
            </button>
          </>
        }
      >
        {pay && (
          <>
            <div className="mb-4 grid gap-2 rounded-lg bg-ink-50 px-4 py-3 text-[13px]">
              <div className="flex justify-between"><span className="text-ink-500">Ученик</span><b>{studentName(pay.studentId)}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Категория</span><b>{pay.category}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Сума</span><b>{pay.amount} лв.</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Платено до момента</span><b>{pay.paid} лв.</b></div>
            </div>
            <Field label="Сума за внасяне (лв.)">
              <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </Field>
          </>
        )}
      </Modal>

      <Modal
        open={open} onClose={() => setOpen(false)} title="Нова такса"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!form.studentId) return
                update((d) => {
                  d.fees.push({
                    id: `fee_${Date.now()}`, studentId: form.studentId, category: form.category,
                    amount: form.amount, paid: 0, dueDate: form.dueDate, status: 'неплатена',
                    note: form.note || undefined,
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
            <Field label="Ученик">
              <Select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
                <option value="">— изберете —</option>
                {db.students.slice(0, 200).map((s) => (
                  <option key={s.id} value={s.id}>{className(s.classId)} · {s.firstName} {s.lastName}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Категория">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option>Такса за учебници</option><option>Такса за екскурзия</option>
              <option>Такса за занимания по интереси</option><option>Такса за лагер</option>
              <option>Такса за изпити</option>
            </Select>
          </Field>
          <Field label="Сума (лв.)"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
          <Field label="Краен срок"><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
          <Field label="Бележка"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        </div>
      </Modal>
    </>
  )
}
