import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Icon, Modal } from '../../components/ui'
import { DnTable, EmptyRow, FilterButton, Num, StudentCell, TB, Th, Toolbar } from './shared'
import { ReviewWizard } from './ReviewWizard'

/**
 * Раздел „Отзиви" — таблица с по един ред на ученик и две колони с бройки:
 * „Забележки" и „Похвали". Клик върху бройка отваря списъка с отзивите на
 * ученика, а „+Добави" отваря целия екран „Въвеждане на отзиви"
 * (ученик → значка → коментар, по няколко наведнъж).
 */

export function ReviewsTab({ classId }: { classId: string }) {
  const { db, isStaff, studentsOf, deleteNote } = useApp()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<{ studentId: string; kind: 'Похвала' | 'Забележка' } | null>(null)
  const [picked, setPicked] = useState<Record<string, boolean>>({})

  const students = studentsOf(classId)

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

  const detailList = detail
    ? notes.filter((n) => n.studentId === detail.studentId && n.kind === detail.kind)
    : []

  return (
    <>
      <Toolbar>
        {isStaff && (
          <>
            <TB icon="plus" tone="teal" onClick={() => setOpen(true)}>Добави</TB>
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

      {open && <ReviewWizard classId={classId} onClose={() => setOpen(false)} />}

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
