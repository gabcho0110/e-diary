import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Field, Icon, Modal, Select, Textarea } from '../../components/ui'
import { DnTable, EmptyRow, FilterButton, Num, StudentCell, TB, Th, Toolbar } from './shared'

/**
 * Раздел „Отзиви" — таблица с по един ред на ученик и две колони с бройки:
 * „Забележки" и „Похвали". Клик върху бройка отваря списъка с отзивите на
 * ученика, а „+Добави" минава през стъпките от референтния дневник:
 * предмет → ученик → значки (може и похвала, и забележка) → коментар.
 */

const PRAISE = [
  'Активна работа в час',
  'Отлично представяне',
  'Помощ на съученик',
  'Отличен проект',
  'Участие в инициатива',
  'Постижение в състезание',
]
const REMARK = [
  'Разговор в час',
  'Неподготвен урок',
  'Забравени материали',
  'Закъснение',
  'Неспазване на правилата',
]

export function ReviewsTab({ classId }: { classId: string }) {
  const { db, isStaff, user, studentsOf, addNote, deleteNote, subjectName } = useApp()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<{ studentId: string; kind: 'Похвала' | 'Забележка' } | null>(null)
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState({
    subjectId: '', studentId: '', praise: [] as string[], remark: [] as string[], comment: '',
  })

  const students = studentsOf(classId)
  const klass = db.classes.find((c) => c.id === classId)
  const subjects = db.subjects.filter((s) => klass?.subjectIds.includes(s.id))

  const notes = useMemo(
    () => db.notes.filter((n) => n.classId === classId),
    [db.notes, classId],
  )
  const countOf = (studentId: string, kind: 'Похвала' | 'Забележка') =>
    notes.filter((n) => n.studentId === studentId && n.kind === kind).length

  const pickedIds = Object.entries(picked).filter(([, v]) => v).map(([k]) => k)

  const removePicked = () => {
    const doomed = notes.filter((n) => pickedIds.includes(n.studentId))
    if (!doomed.length) return
    if (!window.confirm(`Да се изтрият ли ${doomed.length} отзива за избраните ученици?`)) return
    doomed.forEach((n) => deleteNote(n.id))
    setPicked({})
  }

  const save = () => {
    if (!form.studentId) return
    const rows = [
      ...form.praise.map((b) => ({ kind: 'Похвала' as const, badge: b })),
      ...form.remark.map((b) => ({ kind: 'Забележка' as const, badge: b })),
    ]
    if (!rows.length) return
    rows.forEach((r) => addNote({
      studentId: form.studentId,
      classId,
      text: form.comment || r.badge,
      kind: r.kind,
      badge: r.badge,
      teacherId: user!.id,
      date: new Date().toISOString().slice(0, 10),
      visibleToParent: true,
    }))
    setForm({ ...form, studentId: '', praise: [], remark: [], comment: '' })
    setOpen(false)
  }

  const detailList = detail
    ? notes.filter((n) => n.studentId === detail.studentId && n.kind === detail.kind)
    : []

  return (
    <>
      <Toolbar>
        {isStaff && (
          <>
            <TB icon="plus" tone="teal" onClick={() => { setForm({ ...form, subjectId: subjects[0]?.id ?? '' }); setOpen(true) }}>
              Добави
            </TB>
            <TB icon="close" tone="red" disabled={!pickedIds.length} onClick={removePicked}>
              Изтрий{pickedIds.length ? ` (${pickedIds.length})` : ''}
            </TB>
          </>
        )}
        <FilterButton />
      </Toolbar>

      <DnTable
        minWidth={620}
        head={
          <>
            {isStaff && <Th className="w-[36px]" />}
            <Th className="w-[54px]">№</Th>
            <Th>Ученик</Th>
            <Th className="w-[120px] text-center">Забележки</Th>
            <Th className="w-[110px] text-center">Похвали</Th>
          </>
        }
      >
        {students.length === 0 && (
          <EmptyRow colSpan={isStaff ? 5 : 4} text="В паралелката няма активни ученици." />
        )}
        {students.map((s) => {
          const bad = countOf(s.id, 'Забележка')
          const good = countOf(s.id, 'Похвала')
          const on = !!picked[s.id]
          return (
            <tr key={s.id} className={s.status !== 'активен' ? 'bg-[#fde8e8]/70' : on ? 'bg-[#eef7fb]' : 'hover:bg-[#f7fbfd]'}>
              {isStaff && (
                <td className="px-3 py-2">
                  <input
                    type="checkbox" className="h-3.5 w-3.5"
                    checked={on}
                    onChange={(e) => setPicked((p) => ({ ...p, [s.id]: e.target.checked }))}
                  />
                </td>
              )}
              <td className="px-3 py-2 text-[12.5px] font-bold text-ink-400">{s.number}</td>
              <td className="px-3 py-2"><StudentCell student={s} showNumber={false} /></td>
              <td className="px-3 py-2 text-center">
                <button type="button" disabled={!bad} onClick={() => setDetail({ studentId: s.id, kind: 'Забележка' })}>
                  <Num value={bad} tone={bad ? 'salmon' : 'zero'} title="Виж забележките" />
                </button>
              </td>
              <td className="px-3 py-2 text-center">
                <button type="button" disabled={!good} onClick={() => setDetail({ studentId: s.id, kind: 'Похвала' })}>
                  <Num value={good} tone={good ? 'green' : 'zero'} title="Виж похвалите" />
                </button>
              </td>
            </tr>
          )
        })}
      </DnTable>

      {/* ── Нов отзив: предмет → ученик → значки → коментар ── */}
      <Modal
        open={open} onClose={() => setOpen(false)} wide title="Нов отзив"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button className="btn-primary" onClick={save}>Запази</button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="1. Предмет">
            <Select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">— изберете —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="2. Ученик">
            <Select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
              <option value="">— изберете —</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.firstName} {s.lastName}</option>)}
            </Select>
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <BadgeGroup
            title="3. Похвали"
            tone="green"
            items={PRAISE}
            selected={form.praise}
            onToggle={(b) => setForm({
              ...form,
              praise: form.praise.includes(b) ? form.praise.filter((x) => x !== b) : [...form.praise, b],
            })}
          />
          <BadgeGroup
            title="Забележки"
            tone="red"
            items={REMARK}
            selected={form.remark}
            onToggle={(b) => setForm({
              ...form,
              remark: form.remark.includes(b) ? form.remark.filter((x) => x !== b) : [...form.remark, b],
            })}
          />
        </div>

        <div className="mt-4">
          <Field label="4. Коментар (по избор)">
            <Textarea
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder="напр. Отлично представяне на проекта пред класа"
            />
          </Field>
        </div>
        <p className="mt-2 text-xs text-ink-400">
          Може да изберете едновременно похвала и забележка — всяка значка се записва като отделен отзив.
        </p>
      </Modal>

      {/* ── Детайли на отзивите ── */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.kind === 'Похвала' ? 'Похвали' : 'Забележки'}
        footer={<button onClick={() => setDetail(null)} className="btn-primary">Затвори</button>}
      >
        <div className="space-y-2">
          {detailList.map((n) => (
            <div key={n.id} className="flex items-start gap-2.5 rounded-lg border border-ink-200 px-3 py-2.5">
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${
                n.kind === 'Похвала' ? 'bg-[#26c281]' : 'bg-[#e7505a]'
              }`}>
                {n.kind === 'Похвала' ? '✓' : '!'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink-800">{n.badge ?? n.kind}</p>
                <p className="text-[12px] text-ink-500">
                  {n.text} · {n.date}
                </p>
              </div>
              {isStaff && (
                <button onClick={() => deleteNote(n.id)} className="shrink-0 text-ink-300 hover:text-danger">
                  <Icon name="trash" size={14} />
                </button>
              )}
            </div>
          ))}
          {detailList.length === 0 && <p className="py-6 text-center text-[13px] text-ink-500">Няма записи.</p>}
        </div>
      </Modal>
    </>
  )
}

function BadgeGroup({
  title, items, selected, onToggle, tone,
}: {
  title: string
  items: string[]
  selected: string[]
  onToggle: (b: string) => void
  tone: 'green' | 'red'
}) {
  const on = tone === 'green'
  return (
    <div>
      <p className="label">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((b) => {
          const active = selected.includes(b)
          return (
            <button
              key={b}
              type="button"
              onClick={() => onToggle(b)}
              className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold transition ${
                active
                  ? on
                    ? 'border-[#26c281] bg-[#e6f7ef] text-[#1a8a5b]'
                    : 'border-[#e7505a] bg-[#fde8e8] text-[#b42318]'
                  : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
              }`}
            >
              {b}
            </button>
          )
        })}
      </div>
    </div>
  )
}
