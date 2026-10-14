import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { EmptyState, Icon } from '../../components/ui'
import { DnTable, EmptyRow, FilterButton, TB, Th, Toolbar, dateOnly } from './shared'

/**
 * Раздели „Теми" и „Домашни" ползват един и същ изглед от референтния дневник:
 * отляво списък с предметите и брояч „взети / общо", а отдясно таблицата на
 * избрания предмет. Разликата е само в колоните.
 */

/** Ляв панел с предметите и по един брояч за всеки. */
function SubjectPanel({
  items, activeId, onPick,
}: {
  items: { id: string; name: string; done: number; total: number; tone: 'blue' | 'amber' }[]
  activeId: string
  onPick: (id: string) => void
}) {
  return (
    <div className="max-h-[74vh] overflow-y-auto rounded-[3px] border border-[var(--dn-line)] bg-white">
      {items.map((s) => {
        const on = s.id === activeId
        return (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            className={`flex w-full items-center gap-2 border-b border-[var(--dn-line)] px-3 py-2.5 text-left last:border-b-0 transition ${
              on ? 'bg-[#eef7fb]' : 'hover:bg-[#f7fbfd]'
            }`}
          >
            <Icon name="book" size={14} className="shrink-0 text-[#3598dc]" strokeWidth={2} />
            <span className={`min-w-0 flex-1 truncate text-[12.5px] ${on ? 'font-bold text-[#2b6ca3]' : 'text-ink-700'}`}>
              {s.name}
            </span>
            <span className={`shrink-0 rounded-[2px] px-1.5 py-0.5 text-[11px] font-bold text-white ${
              s.tone === 'amber' ? 'bg-[#f1c40f]' : 'bg-[#3598dc]'
            }`}>
              {s.done} / {s.total}
            </span>
          </button>
        )
      })}
      {items.length === 0 && <p className="p-4 text-[13px] text-ink-500">Няма предмети.</p>}
    </div>
  )
}

// ── Теми ────────────────────────────────────────────────────────────────────
export function ThemesTab({ classId }: { classId: string }) {
  const { db, isStaff, subjectName, userName } = useApp()
  const klass = db.classes.find((c) => c.id === classId)
  const subjects = db.subjects.filter((s) => klass?.subjectIds.includes(s.id))

  const plans = useMemo(
    () => db.themePlans.filter((p) => p.classId === classId),
    [db.themePlans, classId],
  )

  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const active = subjectId || subjects[0]?.id || ''
  const plan = plans.find((p) => p.subjectId === active)

  const items = subjects.map((s) => {
    const p = plans.find((x) => x.subjectId === s.id)
    const rows = p?.rows ?? []
    const done = rows.filter((r) => r.taken).length
    return {
      id: s.id, name: s.name, done, total: rows.reduce((a, r) => a + r.hours, 0),
      tone: done ? ('blue' as const) : ('amber' as const),
    }
  })

  return (
    <>
      <Toolbar>
        <TB icon="download" tone="red" onClick={() => window.print()}>PDF</TB>
        <TB icon="download" tone="gold" onClick={() => window.alert('Експортът към Excel ще бъде наличен след свързване на Firebase.')}>Excel</TB>
        {isStaff && (
          <>
            <TB icon="edit" tone="blue" onClick={() => window.alert('Редакторът на тематичното разпределение се отваря в модул „Теми".')}>
              Редактора
            </TB>
            <TB icon="close" tone="red" onClick={() => window.alert('Тематичното разпределение се изтрива от модул „Теми".')}>Изтрий</TB>
          </>
        )}
        <FilterButton />
      </Toolbar>

      <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SubjectPanel items={items} activeId={active} onPick={setSubjectId} />

        <div className="min-w-0">
          {plan ? (
            <>
              <div className="mb-2 text-center">
                <p className="text-[13px] font-bold text-ink-900">
                  {subjectName(active)}
                  <span className="font-normal text-ink-600"> - {userName(plan.teacherId)}</span>
                </p>
                <p className="text-[11.5px] text-ink-500">
                  Последна редакция - {dateOnly([...plan.rows].reverse().find((r) => r.date)?.date)}
                </p>
              </div>

              <DnTable
                minWidth={680}
                head={
                  <>
                    <Th className="w-[40px]" />
                    <Th className="w-[54px]">№</Th>
                    <Th className="w-[110px]">Взета на</Th>
                    <Th className="w-[70px]">Тип</Th>
                    <Th>Тема</Th>
                  </>
                }
              >
                {plan.rows.map((r) => (
                  <tr key={r.no} className={r.taken ? 'bg-[#eafaf0]' : 'hover:bg-[#f7fbfd]'}>
                    <td className="px-3 py-2 text-center">
                      {r.taken && <Icon name="check" size={14} className="inline text-[#26c281]" strokeWidth={3} />}
                    </td>
                    <td className="px-3 py-2 text-[12.5px] text-ink-700">{r.no}</td>
                    <td className="px-3 py-2 text-[12.5px] text-ink-700">{r.date ? dateOnly(r.date) : '—'}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-[2px] bg-[#3598dc] px-1.5 py-0.5 text-[11px] font-bold text-white">
                        {r.kind ?? 'НЗ'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[12.5px] text-[#2b6ca3]">
                      <Icon name="book" size={13} className="mr-1 inline align-[-2px] text-[#3598dc]" strokeWidth={2} />
                      {r.topic}
                      <span className="ml-2 text-[11px] text-ink-400">({r.hours} ч., {r.month})</span>
                    </td>
                  </tr>
                ))}
              </DnTable>
            </>
          ) : (
            <EmptyState
              title="Няма тематично разпределение"
              text="За избрания предмет още не е въведено тематично разпределение."
              icon="list"
            />
          )}
        </div>
      </div>
    </>
  )
}

// ── Домашни работи ──────────────────────────────────────────────────────────
export function HomeworkTab({ classId }: { classId: string }) {
  const { db, subjectName, userName } = useApp()
  const klass = db.classes.find((c) => c.id === classId)
  const subjects = db.subjects.filter((s) => klass?.subjectIds.includes(s.id))

  const all = useMemo(
    () => db.homework.filter((h) => h.classId === classId),
    [db.homework, classId],
  )

  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const active = subjectId || subjects[0]?.id || ''
  const rows = all
    .filter((h) => h.subjectId === active)
    .sort((a, b) => b.date.localeCompare(a.date))
  const teacher = db.users.find((u) => u.id === rows[0]?.teacherId)

  const items = subjects.map((s) => {
    const n = all.filter((h) => h.subjectId === s.id).length
    return { id: s.id, name: s.name, done: n, total: n, tone: (n ? 'blue' : 'amber') as 'blue' | 'amber' }
  })

  return (
    <>
      <Toolbar>
        <FilterButton />
      </Toolbar>

      <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SubjectPanel items={items} activeId={active} onPick={setSubjectId} />

        <div className="min-w-0">
          <div className="mb-2 text-center">
            <p className="text-[13px] font-bold text-ink-900">
              {subjectName(active)}
              {teacher && <span className="font-normal text-ink-600"> - {teacher.firstName} {teacher.lastName}</span>}
            </p>
          </div>

          <DnTable
            minWidth={620}
            head={
              <>
                <Th className="w-[54px]">№</Th>
                <Th className="w-[110px]">Дата</Th>
                <Th>Домашна работа</Th>
                <Th className="w-[90px]">Файл</Th>
                <Th className="w-[110px]">Срок</Th>
              </>
            }
          >
            {rows.map((h, i) => (
              <tr key={h.id} className="hover:bg-[#f7fbfd]">
                <td className="px-3 py-2 text-[12.5px] text-ink-700">{rows.length - i}</td>
                <td className="px-3 py-2 text-[12.5px] text-ink-700">{dateOnly(h.date)}</td>
                <td className="px-3 py-2 text-[12.5px] text-ink-700">{h.text}</td>
                <td className="px-3 py-2 text-[12.5px]">
                  {h.attachment
                    ? <a href={h.attachment} className="dn-link">прикачен</a>
                    : <span className="text-ink-400">—</span>}
                </td>
                <td className="px-3 py-2 text-[12.5px] text-ink-700">{dateOnly(h.dueDate)}</td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyRow colSpan={5} text="Все още не са въвеждани домашни работи по този предмет." />}
          </DnTable>
        </div>
      </div>
    </>
  )
}
