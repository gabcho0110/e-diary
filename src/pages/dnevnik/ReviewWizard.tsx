import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Icon } from '../../components/ui'
import { AddPage } from './forms'
import { personShort } from '../../lib/classes'
import { badgesOf, findBadge, type ReviewKind } from '../../lib/reviews'
import type { Klass, Student } from '../../lib/types'

/**
 * „Въвеждане на отзиви" — целият екран по образеца на референтния дневник.
 *
 *   Избери предмет:  [ Английски език - Алекс Г. Тодоров ▾ ]
 *
 *   1. Избери ученик | 2. Избери значка | 3. Въведи коментар
 *
 * Учениците и значките се избират по няколко наведнъж. В третата колона се
 * вижда избраната значка и полето за описание; при забележка описанието е
 * задължително. Записва се по един отзив за всяка двойка ученик × значка.
 */

type PickedBadge = { name: string; kind: ReviewKind }

const keyOf = (b: PickedBadge) => `${b.kind}:${b.name}`

/** „2026-10-21" по местно време — `toISOString()` мести деня при GMT+3. */
function todayIso(): string {
  const n = new Date()
  const p = (x: number) => String(x).padStart(2, '0')
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`
}

function studentLabel(s: Student): string {
  const mid = s.middleName ? ` ${s.middleName[0]}.` : ''
  return `${s.number}. ${s.firstName}${mid} ${s.lastName}${s.sen ? ' (СОП)' : ''}`
}

export function ReviewWizard({ classId, klass, onClose }: {
  classId: string
  klass?: Klass
  onClose: () => void
}) {
  const { db, studentsOf, className, addNotes, user } = useApp()

  const subjects = useMemo(
    () => (klass ? db.subjects.filter((s) => klass.subjectIds.includes(s.id)) : []),
    [db.subjects, klass],
  )

  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const [pickedStudents, setPickedStudents] = useState<Record<string, boolean>>({})
  const [kind, setKind] = useState<ReviewKind>('Похвала')
  const [picked, setPicked] = useState<PickedBadge[]>([])
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const students = useMemo(() => studentsOf(classId), [studentsOf, classId])
  const studentIds = students.map((s) => s.id)
  const allOn = studentIds.length > 0 && studentIds.every((id) => pickedStudents[id])
  const selStudents = studentIds.filter((id) => pickedStudents[id])

  /** „Английски език - Алекс Г. Тодоров" — учителят идва от плана на паралелката. */
  const subjectLabel = (id: string) => {
    const name = db.subjects.find((s) => s.id === id)?.name ?? '—'
    const row = klass?.plan?.find((p) => p.subjectId === id)
    const teacher = row ? db.users.find((u) => u.id === row.teacherId) : undefined
    return teacher ? `${name} - ${personShort(teacher)}` : name
  }

  const toggleStudent = (id: string) =>
    setPickedStudents((p) => ({ ...p, [id]: !p[id] }))

  const toggleAll = () =>
    setPickedStudents(allOn ? {} : Object.fromEntries(studentIds.map((id) => [id, true])))

  const isPicked = (b: PickedBadge) => picked.some((x) => x.name === b.name && x.kind === b.kind)

  /**
   * Избраната значка изчезва от каталога и отива вдясно, при коментара.
   * Връща се обратно само с клик върху кръгчето до полето за описание.
   */
  const toggleBadge = (b: PickedBadge) => {
    setError(null)
    setPicked((list) =>
      list.some((x) => x.name === b.name && x.kind === b.kind)
        ? list.filter((x) => !(x.name === b.name && x.kind === b.kind))
        : [...list, b],
    )
  }

  const textOf = (b: PickedBadge) =>
    texts[keyOf(b)] ?? findBadge(b.name, b.kind)?.text ?? ''

  const setText = (b: PickedBadge, v: string) =>
    setTexts((t) => ({ ...t, [keyOf(b)]: v }))

  const total = selStudents.length * picked.length
  const canSave = total > 0

  const save = () => {
    if (!user) return
    if (!canSave) {
      setError('Изберете поне един ученик и поне една значка.')
      return
    }
    const empty = picked.find((b) => b.kind === 'Забележка' && !textOf(b).trim())
    if (empty) {
      setError(`Въведете описание към забележката „${empty.name}“.`)
      return
    }

    const date = todayIso()
    const items = selStudents.flatMap((studentId) =>
      picked.map((b) => ({
        studentId,
        classId,
        subjectId: subjectId || undefined,
        text: textOf(b).trim(),
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

  const list = badgesOf(kind)
  const shown = list.filter((b) => !isPicked({ name: b.name, kind }))

  return (
    <AddPage
      title={`Въвеждане на отзиви за ${className(classId)}`}
      onBack={onClose}
      onSave={save}
      saveLabel="Запази"
    >
      {error && (
        <div className="mb-2 rounded-[2px] border border-[#f0b8b8] bg-[#fbe9e9] px-3 py-[7px] text-[12.5px] font-semibold text-[#a94442]">
          {error}
        </div>
      )}

      {/* предметът — над трите колони, както в образеца */}
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <span className="text-[12.5px] font-bold text-[#333]">Избери предмет:</span>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="h-[27px] w-full max-w-[430px] rounded-[2px] border border-[#ccc] bg-white px-2
            text-[12.5px] text-[#333] outline-none focus:border-[#337ab7]"
        >
          <option value="">— общ отзив (без предмет) —</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{subjectLabel(s.id)}</option>
          ))}
        </select>
      </div>

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
                  <span className="text-[24px] leading-none">🎓</span>
                  <span className="text-[12px] leading-tight">{studentLabel(s)}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── 2. Избери значка ─────────────────────────────────────────── */}
        <section className="flex min-w-0 flex-col rounded-[3px] border border-[#c8d4dc] bg-white lg:w-[44%]">
          <header className="flex items-center gap-2 bg-[#3d9fd6] px-3 py-[7px] text-white">
            <Icon name="search" size={14} strokeWidth={2.4} />
            <h3 className="text-[13px] font-bold">2. Избери значка</h3>
            {picked.length > 0 && (
              <span className="ml-auto rounded-full bg-white/25 px-2 py-[1px] text-[11px] font-bold">
                {picked.length}
              </span>
            )}
          </header>

          <div className="grid grid-cols-2 border-b border-[#d5e3ea]">
            {(['Похвала', 'Забележка'] as ReviewKind[]).map((k) => {
              const on = kind === k
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`px-3 py-[7px] text-[12.5px] font-bold transition ${
                    on
                      ? k === 'Похвала'
                        ? 'border-b-[3px] border-[#8cc63f] bg-[#cde9a6] text-[#33620d]'
                        : 'border-b-[3px] border-[#e7505a] bg-[#f7c9c6] text-[#7a2a24]'
                      : 'border-b-[3px] border-transparent text-ink-700 hover:bg-[#f5f9fb]'
                  }`}
                >
                  {k === 'Похвала' ? 'Похвали' : 'Забележки'}
                </button>
              )
            })}
          </div>

          <div className="grid flex-1 grid-cols-3 content-start gap-y-4 p-3">
            {shown.length === 0 && (
              <p className="col-span-3 py-10 text-center text-[12.5px] leading-relaxed text-ink-500">
                Всички значки от този раздел са избрани —<br />вижте ги вдясно, при коментара.
              </p>
            )}
            {shown.map((b) => {
              const pb: PickedBadge = { name: b.name, kind }
              const good = kind === 'Похвала'
              return (
                <button
                  key={b.name}
                  type="button"
                  onClick={() => toggleBadge(pb)}
                  title={b.text}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <span
                    className="grid h-[56px] w-[56px] place-items-center rounded-full border-[4px] text-[30px]
                      leading-none transition group-hover:scale-[1.06] group-active:scale-95"
                    style={{
                      background: good ? '#c5df8f' : '#a33a32',
                      borderColor: good ? '#8cc63f' : '#e8887e',
                    }}
                  >
                    <span>{b.emoji}</span>
                  </span>
                  <span className="text-center text-[11.5px] leading-tight text-ink-700 group-hover:text-ink-900">
                    {b.name}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── 3. Въведи коментар ───────────────────────────────────────── */}
        <section className="flex min-w-0 flex-col rounded-[3px] border border-[#c8d4dc] bg-white lg:w-[27%] lg:min-w-[250px]">
          <header className="flex items-center gap-2 bg-[#3d9fd6] px-3 py-[7px] text-white">
            <Icon name="edit" size={14} strokeWidth={2.4} />
            <h3 className="text-[13px] font-bold">3. Въведи коментар</h3>
            {picked.length > 0 && (
              <span className="ml-auto rounded-full bg-white/25 px-2 py-[1px] text-[11px] font-bold">
                {picked.length}
              </span>
            )}
          </header>

          <div className="flex flex-1 flex-col gap-2 p-2.5">
            {picked.length === 0 ? (
              <div className="grid flex-1 place-items-center rounded-[2px] border border-dashed border-[#9fc3de] px-4 py-10 text-center">
                <p className="text-[12.5px] leading-relaxed text-ink-400">
                  Тук се визуализират избраните отзиви.
                </p>
              </div>
            ) : (
              <>
                {picked.map((b) => {
                  const badge = findBadge(b.name, b.kind)
                  const good = b.kind === 'Похвала'
                  const bad = !!error && b.kind === 'Забележка' && !textOf(b).trim()
                  return (
                    <div
                      key={keyOf(b)}
                      className={`rounded-[3px] border p-2 ${
                        bad ? 'border-[#e7505a] bg-[#fdf4f4]' : 'border-[#dbe5ec] bg-[#fbfdfe]'
                      }`}
                    >
                      <div className="mb-1.5 flex items-start gap-2">
                        <span className="min-w-0 flex-1 pt-1 text-[12px] font-bold leading-snug text-ink-800">
                          {b.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleBadge(b)}
                          title="Премахни отзива — значката се връща в средата"
                          className="group relative shrink-0 rounded-full transition hover:scale-105 active:scale-95"
                        >
                          <span
                            className="grid h-[38px] w-[38px] place-items-center rounded-full border-[3px]
                              text-[19px] leading-none"
                            style={{
                              background: good ? '#c5df8f' : '#a33a32',
                              borderColor: good ? '#8cc63f' : '#e8887e',
                            }}
                          >
                            {badge?.emoji}
                          </span>
                          <span
                            className="absolute -right-1 -top-1 grid h-[15px] w-[15px] place-items-center rounded-full
                              bg-[#e7505a] text-white opacity-0 shadow transition group-hover:opacity-100"
                          >
                            <Icon name="close" size={9} strokeWidth={3.2} />
                          </span>
                        </button>
                      </div>
                      <textarea
                        value={textOf(b)}
                        onChange={(e) => { setText(b, e.target.value); setError(null) }}
                        rows={3}
                        placeholder={b.kind === 'Забележка' ? 'Опишете забележката…' : 'Опишете похвалата…'}
                        className={`w-full resize-y rounded-[2px] border bg-white px-2 py-1.5 text-[12.5px]
                          leading-relaxed text-ink-800 outline-none ${
                            bad ? 'border-[#e7505a]' : 'border-[#cfd8e0] focus:border-[#3d9fd6]'
                          }`}
                      />
                    </div>
                  )
                })}
                <p className="mt-auto pt-1 text-[11px] leading-relaxed text-ink-400">
                  Описанието се записва към всички избрани ученици. Клик върху значката я връща в средата.
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </AddPage>
  )
}
