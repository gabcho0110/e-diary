import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import { DOC_TEMPLATES } from '../lib/seed'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, SearchInput, Select, Stat, Table, Tabs, avgFmt, formatDate } from '../components/ui'

export default function Dokumenti() {
  const { db, myClasses, update, user, studentName, className, average, studentsOf } = useApp()
  const [tab, setTab] = useState('generate')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [templateId, setTemplateId] = useState('У-1')
  const [classId, setClassId] = useState(myClasses[0]?.id ?? '')
  const [studentId, setStudentId] = useState('')

  const templates = DOC_TEMPLATES.filter((t) => t.category === 'Ученически документ')
  const docs = db.docs.filter((d) => templates.some((t) => t.id === d.templateId))
  const students = studentsOf(classId)
  const student = db.students.find((s) => s.id === studentId)
  const template = templates.find((t) => t.id === templateId)

  const filteredDocs = useMemo(
    () => docs.filter((d) => !q.trim() || studentName(d.studentId ?? '').toLowerCase().includes(q.toLowerCase()) || d.number.includes(q)),
    [docs, q, studentName],
  )

  return (
    <>
      <PageHeader
        title="Ученически документи"
        subtitle="Удостоверения, свидетелства, дипломи, лични картони, дубликати и печат върху бланка на МОН."
        icon="certificate"
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => window.print()} className="btn-ghost"><Icon name="print" size={15} /> Печат</button>
            <button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Генерирай документ</button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Издадени документи" value={docs.length} icon="certificate" />
        <Stat label="Видове документи" value={templates.length} icon="report" tone="brand" />
        <Stat label="Ученици" value={db.students.length} icon="person" tone="ok" />
        <Stat label="Дубликати" value={docs.filter((d) => d.templateId === '3-103').length} icon="sync" tone="warn" />
      </div>

      <Tabs
        tabs={[
          { id: 'generate', label: 'Генериране' },
          { id: 'registry', label: 'Регистър', count: docs.length },
          { id: 'templates', label: 'Видове документи', count: templates.length },
          { id: 'settings', label: 'Настройки за печат' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'generate' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          <Card>
            <h2 className="mb-4 font-bold text-ink-900">Данни за документа</h2>
            <div className="grid gap-3">
              <Field label="Вид документ">
                <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
                </Select>
              </Field>
              <Field label="Паралелка">
                <Select value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId('') }}>
                  {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Ученик">
                <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                  <option value="">— изберете —</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.firstName} {s.lastName}</option>)}
                </Select>
              </Field>
              <Field label="Номер на документа">
                <Input defaultValue={`${Math.floor(Math.random() * 900 + 100)}/${db.school.year.slice(0, 4)}`} />
              </Field>
              <Field label="Дата на издаване">
                <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </Field>
            </div>
            <button
              disabled={!studentId}
              onClick={() => {
                if (!studentId || !user) return
                update((d) => {
                  d.docs.unshift({
                    id: `doc_${Date.now()}`, templateId, studentId,
                    number: `${Math.floor(Math.random() * 900 + 100)}/${d.school.year.slice(0, 4)}`,
                    date: new Date().toISOString().slice(0, 10), createdById: user.id,
                    payload: { среден_успех: (average(studentId) ?? 4).toFixed(2), клас: className(classId) },
                  })
                })
                setTab('registry')
              }}
              className="btn-primary mt-4 w-full"
            >
              <Icon name="certificate" size={15} /> Генерирай документа
            </button>
          </Card>

          <Card pad={false}>
            <div className="border-b border-ink-200 px-5 py-3.5">
              <h2 className="font-bold text-ink-900">Преглед</h2>
            </div>
            <div className="p-5">
              {student && template ? (
                <div className="rounded-lg border border-ink-200 bg-white p-7">
                  <div className="mb-6 text-center">
                    <p className="text-[11px] uppercase tracking-wider text-ink-400">{db.school.name}</p>
                    <p className="mt-1 text-lg font-bold text-ink-900">{template.name}</p>
                    <p className="text-[11px] text-ink-500">Образец {template.code}</p>
                  </div>

                  <div className="space-y-2.5 text-[13px] leading-relaxed text-ink-700">
                    <p>
                      Удостоверява се, че <b>{student.firstName} {student.middleName} {student.lastName}</b>,
                      ЕГН <span className="font-mono">{student.egn}</span>, е ученик в <b>{className(student.classId)}</b> клас
                      на {db.school.name}, {db.school.city}, през учебната {db.school.year} година.
                    </p>
                    {template.id !== 'У-1' && (
                      <p>
                        Среден успех: <b>{avgFmt(average(student.id))}</b>.
                      </p>
                    )}
                    <p className="text-[12px] text-ink-500">
                      Документът се издава за представяне пред съответните органи.
                    </p>
                  </div>

                  <div className="mt-8 flex items-end justify-between text-[12px] text-ink-500">
                    <span>Дата: {formatDate(new Date().toISOString().slice(0, 10))}</span>
                    <span>Директор: {db.school.principal}</span>
                  </div>
                </div>
              ) : (
                <EmptyState title="Изберете ученик" text="Изберете вид документ и ученик, за да видите преглед на документа." icon="certificate" />
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === 'registry' && (
        <>
          <div className="mb-3"><SearchInput value={q} onChange={setQ} placeholder="Търсене по ученик или номер…" /></div>
          <Table
            head={<><th className="th w-24">Образец</th><th className="th">Документ</th><th className="th">Ученик</th><th className="th w-28">Номер</th><th className="th w-28">Дата</th><th className="th w-12"></th></>}
          >
            {filteredDocs.map((d) => {
              const t = templates.find((x) => x.id === d.templateId)
              return (
                <tr key={d.id} className="hover:bg-ink-50/60">
                  <td className="td font-mono text-[12px]">{d.templateId}</td>
                  <td className="td font-medium">{t?.name ?? '—'}</td>
                  <td className="td">{studentName(d.studentId ?? '')}</td>
                  <td className="td font-mono text-[12px]">{d.number}</td>
                  <td className="td text-[12px] text-ink-500">{formatDate(d.date)}</td>
                  <td className="td">
                    <button
                      onClick={() => {
                        if (!confirm('Да се изтрие ли документът от регистъра?')) return
                        update((x) => { x.docs = x.docs.filter((y) => y.id !== d.id) })
                      }}
                      className="text-ink-300 hover:text-danger"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </Table>
        </>
      )}

      {tab === 'templates' && (
        <Table head={<><th className="th w-24">Образец</th><th className="th">Наименование</th><th className="th">Задължителни данни</th><th className="th w-28">Издадени</th></>}>
          {templates.map((t) => (
            <tr key={t.id} className="hover:bg-ink-50/60">
              <td className="td font-mono text-[12px] font-bold">{t.code}</td>
              <td className="td font-medium">{t.name}</td>
              <td className="td">
                <div className="flex flex-wrap gap-1">
                  {t.requires.map((r) => <Badge key={r} tone="neutral">{r}</Badge>)}
                </div>
              </td>
              <td className="td">{docs.filter((d) => d.templateId === t.id).length}</td>
            </tr>
          ))}
        </Table>
      )}

      {tab === 'settings' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 font-bold text-ink-900">Настройки за печат върху бланка на МОН</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Отместване по хоризонтала (мм)"><Input type="number" defaultValue={0} /></Field>
              <Field label="Отместване по вертикала (мм)"><Input type="number" defaultValue={0} /></Field>
              <Field label="Формат на хартията">
                <Select defaultValue="A4"><option>A4</option><option>A5</option><option>Letter</option></Select>
              </Field>
              <Field label="Ориентация">
                <Select defaultValue="портрет"><option>портрет</option><option>пейзаж</option></Select>
              </Field>
              <Field label="Печат на воден знак">
                <Select defaultValue="не"><option>не</option><option>да</option></Select>
              </Field>
              <Field label="Копия"><Input type="number" defaultValue={1} /></Field>
            </div>
            <p className="mt-4 text-[12px] text-ink-500">
              Отместването се прилага при печат върху предварително отпечатани бланки на МОН, за да се
              изравни текстът с полетата на бланката.
            </p>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold text-ink-900">Стойности по подразбиране</h2>
            <div className="space-y-3">
              <Field label="Място на издаване"><Input defaultValue={db.school.city} /></Field>
              <Field label="Длъжност на подписващия"><Input defaultValue="Директор" /></Field>
              <Field label="Име на подписващия"><Input defaultValue={db.school.principal} /></Field>
              <Field label="Учебна година"><Input defaultValue={db.school.year} /></Field>
            </div>
            <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-[12px] text-brand-900">
              Тези стойности се попълват автоматично при генериране на всеки ученически документ.
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={open} onClose={() => setOpen(false)} title="Генериране на документ"
        footer={<button onClick={() => { setTab('generate'); setOpen(false) }} className="btn-primary">Към генериране</button>}
      >
        <p className="text-sm text-ink-600">
          Изберете вид документ, паралелка и ученик. Системата ще попълни личните данни и успеха автоматично
          от дневника.
        </p>
      </Modal>
    </>
  )
}
