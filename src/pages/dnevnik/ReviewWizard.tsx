import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Icon } from '../../components/ui'
import { AddPage } from './forms'
import type { Student } from '../../lib/types'

/**
 * „Въвеждане на отзиви" — екранът по образеца на референтния дневник.
 *
 * Три стъпки в една страница, всяка в собствена колона с надпис:
 *   1. Избери ученик  — може няколко наведнъж („Избери всички")
 *   2. Избери значка  — раздели „Похвали" / „Забележки", пак няколко
 *   3. Въведи коментар — един текст, който се записва към всички
 *
 * Записва се по един отзив за всяка двойка ученик × значка.
 */

type Kind = 'Похвала' | 'Забележка'

type Badge = { name: string; icon: string }

/** Избрана значка помни и своя раздел, за да не се бъркат еднакви имена. */
type PickedBadge = Badge & { kind: Kind }

/** Значките от образеца — иконата е от собствения набор в `ui.tsx`. */
const PRAISE: Badge[] = [
  { name: 'Активно участие', icon: 'spark' },
  { name: 'Отлично представяне', icon: 'trophy' },
  { name: 'Изпълнена задача', icon: 'task' },
  { name: 'Любознание', icon: 'search' },
  { name: 'Старание', icon: 'book' },
  { name: 'Прогрес', icon: 'chart' },
  { name: 'Работа в екип', icon: 'meet' },
  { name: 'Мислене', icon: 'cap' },
  { name: 'Постигната цел', icon: 'star' },
]

const REMARK: Badge[] = [
  { name: 'Разсейване в час', icon: 'bell' },
  { name: 'Неподготвен урок', icon: 'ban' },
  { name: 'Забравени материали', icon: 'archive' },
  { name: 'Закъснение', icon: 'clock' },
  { name: 'Неспазване на правилата', icon: 'warn' },
  { name: 'Липса на домашно', icon: 'clipboard' },
]

/** Днес във вид `2026-10-21` — ръчно, защото `toISOString()` мести деня. */
function todayIso(): string {
  const n = new Date()
  const p = (x: number) => String(x).padStart(2, '0')
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`
}

function studentLabel(s: Student): string {
  const mid = s.middleName ? ` ${s.middleName[0]}.` : ''
  return `${s.number}. ${s.firstName}${mid} ${s.lastName}${s.sen ? ' (СОП)' : ''}`
}

export function ReviewWizard({ classId, onClose }: { classId: string; onClose: () => void }) {
  const { studentsOf, className, addNotes, user } = useApp()
  const [pickedStudents, setPickedStudents] = useState<Record<string, boolean>>({})
  const [picked, setPicked] = useState<PickedBadge[]>([])
  const [kind, setKind] = useState<Kind>('Похвала')
  const [comment, setComment] = useState('')

  const students = useMemo(() => studentsOf(classId), [studentsOf, classId])
  const studentIds = students.map((s) => s.id)
  const allOn = studentIds.length > 0 && studentIds.every((id) => pickedStudents[id])
  const selStudents = studentIds.filter((id) => pickedStudents[id])

  const toggleStudent = (id: string) =>
    setPickedStudents((p) => ({ ...p, [id]: !p[id] }))

  const toggleAll = () =>
    setPickedStudents(allOn ? {} : Object.fromEntries(studentIds.map((id) => [id, true])))

  const toggleBadge = (b: Badge) =>
    setPicked((list) =>
      list.some((x) => x.name === b.name && x.kind === kind)
        ? list.filter((x) => !(x.name === b.name && x.kind === kind))
        : [...list, { ...b, kind }],
    )

  const isOn = (b: Badge) => picked.some((x) => x.name === b.name && x.kind === kind)

  const total = selStudents.length * picked.length
  const canSave = total > 0

  const save = () => {
    if (!canSave || !user) return
    const date = todayIso()
    const items = selStudents.flatMap((studentId) =>
      picked.map((b) => ({
        studentId,
        classId,
        text: comment.trim() || b.name,
        kind: b.kind,
        badge: b.name,
        teacherId: user.id,
        date,
        visibleToParent: true,
      })),
    )
    addNotes(items)
    onClose()
  }

  const list = kind === 'Похвала' ? PRAISE : REMARK

  return (
    <AddPage
      title={`Въвеждане на отзиви за ${className(classId)}`}
      onBack={onClose}
      onSave={canSave ? save : undefined}
      saveLabel="Запази"
      banner={
        canSave ? undefined : (
          <p className="flex items-center gap-2 text-[12.5px] text-[#8a6d1f]">
            <Icon name="info" size={15} className="shrink-0 text-[#c49f47]" />
            Изберете поне един ученик и поне една значка, за да запазите.
          </p>
        )
      }
    >
      <div className="flex min-h-full flex-col gap-3 lg:flex-row lg:items-stretch">
        {/* ── 1. Избери ученик ─────────────────────────────────────────── */}
        <section className="flex min-w-0 flex-1 flex-col rounded-[3px] border border-[#c8d4dc] bg-white">
          <header className="flex items-center gap-2 bg-[#3d9fd6] px-3 py-[7px] text-white">
            <Icon name="list" size={14} strokeWidth={2.4} />
            <h3 className="text-[13px] font-bold">1. Избери ученик</h3>
            <button
              type="button"
              onClick={toggleAll}
              className="ml-auto inline-flex items-center gap-1.5 rounded-[3px] border border-white/70
                px-2 py-[3px] text-[11.5px] font-semibold text-white transition hover:bg-white/15"
            >
              <span className={`grid h-[11px] w-[11px] place-items-center rounded-[2px] border ${
                allOn ? 'border-white bg-white text-[#3d9fd6]' : 'border-white/80'
              }`}>
                {allOn && <Icon name="check" size={9} strokeWidth={3.4} />}
              </span>
              Избери всички
            </button>
          </header>
          <div className="grid flex-1 auto-rows-min grid-cols-2 gap-y-1 p-2">
            {students.length === 0 && (
              <p className="col-span-2 py-6 text-center text-[12.5px] text-ink-500">
                В паралелката няма активни ученици.
              </p>
            )}
            {students.map((s) => {
              const on = !!pickedStudents[s.id]
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStudent(s.id)}
                  className={`flex w-full flex-col items-center gap-1 rounded-[2px] px-1.5 py-3 text-center
                    transition ${on ? 'bg-[#45b6cf] text-white' : 'text-ink-800 hover:bg-[#f2f7fa]'}`}
                >
                  <Icon
                    name="person"
                    size={26}
                    strokeWidth={1.7}
                    className={on ? 'text-white' : 'text-[#2b3a44]'}
                  />
                  <span className="text-[12px] leading-tight">{studentLabel(s)}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── 2. Избери значка ─────────────────────────────────────────── */}
        <section className="flex min-w-0 flex-col rounded-[3px] border border-[#c8d4dc] bg-white lg:w-[46%]">
          <header className="flex items-center gap-2 bg-[#3d9fd6] px-3 py-[7px] text-white">
            <Icon name="badge" size={14} strokeWidth={2.4} />
            <h3 className="text-[13px] font-bold">2. Избери значка</h3>
            {picked.length > 0 && (
              <span className="ml-auto rounded-full bg-white/25 px-2 py-[1px] text-[11px] font-bold">
                {picked.length}
              </span>
            )}
          </header>

          <div className="grid grid-cols-2 border-b border-[#d5e3ea]">
            {(['Похвала', 'Забележка'] as Kind[]).map((k) => {
              const on = kind === k
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`px-3 py-[7px] text-[12.5px] font-bold transition ${
                    on
                      ? 'border-b-[3px] border-[#8cc63f] bg-[#cde9a6] text-[#33620d]'
                      : 'border-b-[3px] border-transparent text-ink-700 hover:bg-[#f5f9fb]'
                  }`}
                >
                  {k === 'Похвала' ? 'Похвали' : 'Забележки'}
                </button>
              )
            })}
          </div>

          <div className="grid flex-1 grid-cols-3 content-start gap-y-3 p-3">
            {list.map((b) => {
              const on = isOn(b)
              const good = kind === 'Похвала'
              return (
                <button
                  key={b.name}
                  type="button"
                  onClick={() => toggleBadge(b)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span className="relative">
                    <span
                      className="grid h-[62px] w-[62px] place-items-center rounded-full border-[3px] transition"
                      style={{
                        background: good ? '#e4f2c8' : '#fbe2df',
                        borderColor: on ? (good ? '#5f9420' : '#c0392b') : good ? '#8cc63f' : '#e7505a',
                        boxShadow: on ? `0 0 0 3px ${good ? '#d7e9b0' : '#f6d3ce'}` : undefined,
                      }}
                    >
                      <Icon
                        name={b.icon}
                        size={26}
                        strokeWidth={1.8}
                        className={good ? 'text-[#5f9420]' : 'text-[#c0392b]'}
                      />
                    </span>
                    {on && (
                      <span
                        className="absolute -right-0.5 -top-0.5 grid h-[17px] w-[17px] place-items-center
                          rounded-full text-white shadow"
                        style={{ background: good ? '#5f9420' : '#c0392b' }}
                      >
                        <Icon name="check" size={11} strokeWidth={3.4} />
                      </span>
                    )}
                  </span>
                  <span className={`text-center text-[11.5px] leading-tight ${
                    on ? 'font-bold text-ink-900' : 'text-ink-700'
                  }`}>
                    {b.name}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── 3. Въведи коментар ───────────────────────────────────────── */}
        <section className="flex min-w-0 flex-col rounded-[3px] border border-[#c8d4dc] bg-white lg:w-[24%] lg:min-w-[230px]">
          <header className="flex items-center gap-2 bg-[#3d9fd6] px-3 py-[7px] text-white">
            <Icon name="edit" size={14} strokeWidth={2.4} />
            <h3 className="text-[13px] font-bold">3. Въведи коментар</h3>
          </header>

          <div className="flex flex-1 flex-col gap-2.5 p-3">
            <p className="text-[11.5px] leading-relaxed text-ink-500">
              {selStudents.length === 0 || picked.length === 0
                ? 'Изберете ученици и значки — тук ще видите колко отзива ще се запишат.'
                : `Ще се запишат ${total} ${total === 1 ? 'отзив' : 'отзива'} за ${selStudents.length} ${
                    selStudents.length === 1 ? 'ученик' : 'ученици'
                  }.`}
            </p>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ученикът има общ коментар към избраните значки (по избор)…"
              className="min-h-[110px] flex-1 resize-y rounded-[3px] border border-ink-200 px-2.5 py-2
                text-[12.5px] leading-relaxed text-ink-800 outline-none focus:border-[#3d9fd6]"
            />

            {picked.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {picked.map((b) => {
                  const good = b.kind === 'Похвала'
                  return (
                    <span
                      key={`${b.kind}:${b.name}`}
                      className="rounded-full px-2 py-[2px] text-[11px] font-semibold text-white"
                      style={{ background: good ? '#8cc63f' : '#e7505a' }}
                    >
                      {b.name}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </AddPage>
  )
}
