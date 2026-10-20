import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Icon, Input, PageHeader, Select, Table } from '../../components/ui'
import type { Subject } from '../../lib/types'
import { AInput, ASelect, Dash, EmptyRow, FormRow, ListHead, SquareAction, ToolBtn, Toolbar } from './shared'

const KINDS: Subject['kind'][] = ['ЗП', 'ПП', 'ЗИП', 'ИУЧ', 'ФУЧ', 'ОРЕС']
const COLORS = ['#3598dc', '#32c5d2', '#26c281', '#8e44ad', '#e7505a', '#c49f47', '#36c6d3', '#2b6ca3']

/** „Предмети" — списъкът, от който се избира при създаване на паралелка и на учител. */
export function Predmeti() {
  const { db, update } = useApp()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [f, setF] = useState<{ name: string; short: string; kind: Subject['kind']; color: string }>({
    name: '', short: '', kind: 'ЗП', color: COLORS[0],
  })

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return [...db.subjects]
      .filter((s) => !term || s.name.toLowerCase().includes(term) || s.short.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, 'bg'))
  }, [db.subjects, q])

  const add = () => {
    if (!f.name.trim()) return
    update((d) => {
      d.subjects.push({
        id: `sub_${Date.now()}`,
        name: f.name.trim(),
        short: f.short.trim() || f.name.trim().slice(0, 3).toUpperCase(),
        kind: f.kind,
        color: f.color,
      })
    })
    setF({ name: '', short: '', kind: 'ЗП', color: COLORS[0] })
    setOpen(false)
  }

  const remove = (s: Subject) => {
    if (!confirm(`Да се изтрие ли предметът „${s.name}“?`)) return
    update((d) => {
      d.subjects = d.subjects.filter((x) => x.id !== s.id)
      d.classes.forEach((c) => {
        c.subjectIds = c.subjectIds.filter((id) => id !== s.id)
        if (c.plan) c.plan = c.plan.filter((p) => p.subjectId !== s.id)
      })
      d.users.forEach((u) => { u.subjectIds = (u.subjectIds ?? []).filter((id) => id !== s.id) })
    })
  }

  return (
    <>
      <PageHeader title="Предмети" subtitle="Предметите се използват в паралелките, в учебния план и в профила на учителите." icon="book" />

      <ListHead icon="book" title="Всички предмети" count={db.subjects.length} />

      <Toolbar>
        <ToolBtn tone="green" icon="plus" onClick={() => setOpen(true)}>Добави</ToolBtn>
      </Toolbar>

      <div className="mb-0 flex items-center gap-1.5 border border-[#d7dee4] border-b-0 bg-white px-2 py-1.5">
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[11.5px] text-[#5b6b78]">Търсене:</span>
          <Input value={q} onChange={(e) => setQ(e.target.value)} className="!w-[200px] !rounded-[2px] !py-1 !text-[12px]" />
        </div>
      </div>

      <Table
        className="!rounded-none"
        head={
          <>
            <th className="th">Предмет</th>
            <th className="th w-24">Съкращение</th>
            <th className="th w-28">Вид</th>
            <th className="th">Учители</th>
            <th className="th w-28">Паралелки</th>
            <th className="th w-24">Операции</th>
          </>
        }
      >
        {rows.map((s) => {
          const teachers = db.users.filter((u) => u.subjectIds?.includes(s.id))
          const classes = db.classes.filter((c) => c.subjectIds.includes(s.id))
          return (
            <tr key={s.id} className="hover:bg-[#f6fafd]">
              <td className="td">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: s.color }} />
                <span className="font-medium">{s.name}</span>
              </td>
              <td className="td font-mono text-[12px]">{s.short}</td>
              <td className="td"><span className="chip bg-brand-50 text-brand-700">{s.kind}</span></td>
              <td className="td text-[12.5px] text-ink-600">
                <Dash>{teachers.slice(0, 3).map((t) => `${t.firstName} ${t.lastName}`).join(', ')}</Dash>
              </td>
              <td className="td"><span className="dn-num dn-olive">{classes.length}</span></td>
              <td className="td">
                <SquareAction tone="red" icon="close" title="Изтриване" onClick={() => remove(s)} />
              </td>
            </tr>
          )
        })}
        {!rows.length && <EmptyRow colSpan={6} text="Няма намерени предмети." />}
      </Table>

      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink-900/45 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-pop">
            <h3 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-ink-900">
              <Icon name="book" size={15} /> Нов предмет
            </h3>
            <FormRow label="Наименование" required>
              <AInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="напр. Български език и литература" />
            </FormRow>
            <FormRow label="Съкращение">
              <AInput value={f.short} onChange={(e) => setF({ ...f, short: e.target.value })} placeholder="БЕЛ" />
            </FormRow>
            <FormRow label="Вид подготовка">
              <ASelect value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Subject['kind'] })}>
                {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </ASelect>
            </FormRow>
            <FormRow label="Цвят">
              <div className="flex flex-wrap gap-1.5 pt-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setF({ ...f, color: c })}
                    className={`h-6 w-6 rounded-full border-2 ${f.color === c ? 'border-ink-800' : 'border-transparent'}`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </FormRow>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-[3px] border border-ink-200 px-3 py-1.5 text-[12.5px] font-semibold text-ink-600 hover:bg-ink-50">Отказ</button>
              <button type="button" onClick={add} className="rounded-[3px] px-3 py-1.5 text-[12.5px] font-semibold text-white" style={{ background: '#26c281' }}>Запази</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** „Учебни планове" — предметите и часовете по паралелка. */
export function Planove() {
  const { db } = useApp()
  const [classId, setClassId] = useState(db.classes[0]?.id ?? '')
  const klass = db.classes.find((c) => c.id === classId)
  const plan = klass?.plan ?? []

  return (
    <>
      <PageHeader title="Учебни планове" subtitle="Предмети, учители и седмичен брой занятия по срокове за всяка паралелка." icon="list" />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-auto min-w-[180px]">
          {db.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        {klass && <span className="text-[12.5px] text-ink-500">Тип дневник: {klass.journalType ?? '—'}</span>}
      </div>

      {!plan.length ? (
        <div className="rounded border border-dashed border-ink-200 bg-white px-4 py-12 text-center">
          <p className="text-[13px] font-semibold text-ink-700">Планът е празен</p>
          <p className="mt-1 text-[12.5px] text-ink-500">Добавете предмети от „Паралелки“ → раздел „Предмети и учители“.</p>
        </div>
      ) : (
        <Table
          head={
            <>
              <th className="th w-12">#</th>
              <th className="th">Предмет</th>
              <th className="th">Учител</th>
              <th className="th w-28">Вид</th>
              <th className="th w-32">Срок I</th>
              <th className="th w-32">Срок II</th>
              <th className="th w-36">Чужд език</th>
            </>
          }
        >
          {plan.map((p, i) => {
            const subject = db.subjects.find((s) => s.id === p.subjectId)
            const teacher = db.users.find((u) => u.id === p.teacherId)
            return (
              <tr key={`${p.subjectId}-${i}`} className="hover:bg-[#f6fafd]">
                <td className="td text-ink-500">{i + 1}</td>
                <td className="td font-medium">{subject?.name ?? '—'}</td>
                <td className="td text-[12.5px]"><Dash>{teacher ? `${teacher.firstName} ${teacher.lastName}` : undefined}</Dash></td>
                <td className="td"><span className="chip bg-brand-50 text-brand-700">{p.prepKind}</span></td>
                <td className="td text-[12.5px]">{p.weeks1a ?? 0} / {p.weeks1b ?? 0}</td>
                <td className="td text-[12.5px]">{p.weeks2a ?? 0} / {p.weeks2b ?? 0}</td>
                <td className="td text-[12.5px]"><Dash>{p.foreignLang}</Dash></td>
              </tr>
            )
          })}
        </Table>
      )}
    </>
  )
}
