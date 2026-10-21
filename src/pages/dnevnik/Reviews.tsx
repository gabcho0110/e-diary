import { Fragment, useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Icon } from '../../components/ui'
import { ROLE_MAP } from '../../lib/roles'
import { TONE, findBadge, type ReviewKind } from '../../lib/reviews'
import { DnTable, EmptyRow, FilterButton, StudentCell, TB, Th, Toolbar } from './shared'
import { ReviewWizard } from './ReviewWizard'
import type { Note } from '../../lib/types'

/**
 * Раздел „Отзиви" — по образеца на референтния дневник.
 *
 * Таблицата показва по един ред на ученик с две бройки: „Забележки" (червена)
 * и „Похвали" (зелена). Клик върху бройка разгъва **панел под реда** с
 * кръгчетата на значките, които ученикът има, а под тях — карта с предмета,
 * описанието и кой/кога е въвел отзива.
 */

/** Кой ред е разгънат и коя значка е избрана в него. */
type Open = { studentId: string; kind: ReviewKind; badge: string | null } | null

/** Ролята за подписа „(Системен администратор)" — най-важната, не всичките. */
const ROLE_ORDER = ['sysadmin', 'director', 'deputy', 'teacher', 'parent', 'student']

export function ReviewsTab({ classId }: { classId: string }) {
  const { db, isStaff, user, studentsOf, subjectName, deleteNote, updateNote } = useApp()
  const [open, setOpen] = useState<Open>(null)
  const [wizard, setWizard] = useState(false)
  const [editText, setEditText] = useState<string | null>(null)

  const students = studentsOf(classId)
  const klass = db.classes.find((c) => c.id === classId)

  const notes = useMemo(
    () => db.notes.filter((n) => n.classId === classId),
    [db.notes, classId],
  )

  const ofStudent = (sid: string, kind: ReviewKind) =>
    notes.filter((n) => n.studentId === sid && n.kind === kind)

  /** Значките на ученика за даден вид, с бройка — в реда от каталога. */
  const grouped = (sid: string, kind: ReviewKind) => {
    const map = new Map<string, Note[]>()
    for (const n of ofStudent(sid, kind)) {
      const key = n.badge ?? 'Без значка'
      map.set(key, [...(map.get(key) ?? []), n])
    }
    return [...map.entries()]
      .map(([badge, list]) => ({ badge, list }))
      .sort((a, b) => b.list.length - a.list.length)
  }

  /**
   * Панелът се отваря само с кръгчетата — картата с детайлите се показва
   * едва след клик върху конкретна значка (втори клик я скрива).
   */
  const openPanel = (sid: string, kind: ReviewKind) => {
    setEditText(null)
    setOpen((p) => (p && p.studentId === sid && p.kind === kind ? null : { studentId: sid, kind, badge: null }))
  }

  const pickBadge = (badge: string) => {
    setEditText(null)
    setOpen((p) => (p ? { ...p, badge: p.badge === badge ? null : badge } : p))
  }

  const authorOf = (n: Note) => {
    const u = db.users.find((x) => x.id === n.teacherId)
    if (!u) return { name: '—', role: '' }
    const roleId = ROLE_ORDER.find((r) => (u.roles as string[]).includes(r)) ?? u.roles[0]
    return {
      name: `${u.firstName} ${u.middleName ? `${u.middleName[0]}. ` : ''}${u.lastName}`,
      role: ROLE_MAP[roleId as keyof typeof ROLE_MAP]?.name ?? '',
    }
  }

  /** „2026-10-21 16:20" → „21.10.2026 16:20" */
  const whenOf = (n: Note) => {
    const src = n.createdAt ?? n.date
    const [d, t] = src.split(/[T ]/)
    const [y, m, day] = (d ?? '').split('-')
    if (!y || !m || !day) return src
    return `${day}.${m}.${y}${t ? ` ${t.slice(0, 5)}` : ''}`
  }

  /** Панелът: кръгчетата на значките + картата на избраната. */
  const renderPanel = (sid: string, kind: ReviewKind) => {
    const tone = TONE[kind]
    const items = grouped(sid, kind)
    const sel = open?.badge && items.some((i) => i.badge === open.badge) ? open.badge : null
    const list = items.find((i) => i.badge === sel)?.list ?? []
    const note = list[0]
    const badge = sel ? findBadge(sel, kind) : undefined
    const author = note ? authorOf(note) : null

    return (
      <tr>
        <td colSpan={4} className="p-0">
          <div style={{ background: tone.panel }} className="px-5 py-4">
            {items.length === 0 ? (
              <p className="py-2 text-center text-[12.5px] text-ink-600">
                Все още няма {kind === 'Похвала' ? 'похвали' : 'забележки'} за този ученик.
              </p>
            ) : (
              <div className="flex flex-wrap items-start justify-center gap-x-7 gap-y-4">
                {items.map((it) => {
                  const b = findBadge(it.badge, kind)
                  const on = it.badge === sel
                  return (
                    <button
                      key={it.badge}
                      type="button"
                      onClick={() => pickBadge(it.badge)}
                      title={b?.text}
                      className="flex w-[104px] flex-col items-center gap-1.5"
                    >
                      <span className="relative">
                        <span
                          className="grid h-[56px] w-[56px] place-items-center rounded-full border-[4px] text-[30px] leading-none transition"
                          style={{
                            background: tone.fill,
                            borderColor: on ? tone.label : tone.ring,
                            boxShadow: on ? `0 0 0 3px ${tone.ring}80` : undefined,
                          }}
                        >
                          <span>{b?.emoji ?? '•'}</span>
                        </span>
                        <span
                          className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center
                            rounded-full px-1 text-[10.5px] font-bold text-white shadow"
                          style={{ background: kind === 'Похвала' ? '#26c281' : '#e7505a' }}
                        >
                          {it.list.length}
                        </span>
                      </span>
                      <span className={`text-center text-[11.5px] leading-tight text-ink-800 ${on ? 'font-bold' : ''}`}>
                        {it.badge}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {!note && items.length > 0 && (
              <p className="mt-4 text-center text-[11.5px] text-ink-600">
                Кликнете върху значка, за да видите описанието и кой го е въвел.
              </p>
            )}

            {note && (
              <div className="mt-4 rounded-[3px] border border-black/10 bg-white/80 px-3.5 py-2.5">
                <div className="flex items-start gap-2">
                  <Icon name="book" size={15} className="mt-[3px] shrink-0 text-[#337ab7]" strokeWidth={2.2} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-[#2b3a44]">
                      {note.subjectId ? subjectName(note.subjectId) : 'Общ отзив'}
                      <span className="font-normal text-ink-300"> | </span>
                      <span className="font-semibold">{note.badge ?? badge?.name}</span>
                    </p>

                    {editText === null ? (
                      note.text && (
                        <p className="mt-0.5 text-[12px] italic text-ink-700">Описание: {note.text}</p>
                      )
                    ) : (
                      <div className="mt-1.5">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={2}
                          className="w-full max-w-[620px] rounded-[2px] border border-[#cfd8e0] px-2 py-1.5
                            text-[12.5px] text-ink-800 outline-none focus:border-[#3598dc]"
                        />
                        <div className="mt-1.5 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              updateNote(note.id, { text: editText.trim() || note.text })
                              setEditText(null)
                            }}
                            className="rounded-[2px] bg-[#26b3a4] px-2.5 py-[3px] text-[12px] font-semibold text-white hover:brightness-105"
                          >
                            Запази
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditText(null)}
                            className="rounded-[2px] border border-[#ccc] bg-white px-2.5 py-[3px] text-[12px] font-semibold text-[#555] hover:bg-[#f7f7f7]"
                          >
                            Отказ
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="mt-1 text-[11.5px] text-ink-500">
                      Въведен от:{' '}
                      <span className="font-semibold text-[#337ab7]">{author?.name}</span>
                      {author?.role && <span> ({author.role})</span>}
                      <span className="text-ink-300"> / </span>
                      {whenOf(note)}
                    </p>
                  </div>

                  {isStaff && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditText(note.text)}
                        className="inline-flex items-center gap-1 rounded-[2px] bg-[#3598dc] px-2 py-[3px]
                          text-[12px] font-semibold text-white hover:brightness-110"
                      >
                        <Icon name="edit" size={11} strokeWidth={2.4} /> Редактирай
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteNote(note.id)}
                        className="inline-flex items-center gap-1 rounded-[2px] bg-[#e7505a] px-2 py-[3px]
                          text-[12px] font-semibold text-white hover:brightness-110"
                      >
                        <Icon name="close" size={11} strokeWidth={2.6} /> Изтрий
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </td>
      </tr>
    )
  }

  const openItems = open ? ofStudent(open.studentId, open.kind) : []
  const openName = open ? students.find((s) => s.id === open.studentId) : undefined

  const removeAllOpen = () => {
    if (!open || !openItems.length) return
    const who = openName ? `${openName.firstName} ${openName.lastName}` : 'ученика'
    const what = open.kind === 'Похвала' ? 'похвали' : 'забележки'
    if (!window.confirm(`Да се изтрият ли всички ${what} на ${who} (${openItems.length})?`)) return
    openItems.forEach((n) => deleteNote(n.id))
    setOpen(null)
  }

  return (
    <>
      <Toolbar>
        {isStaff && (
          <>
            <TB icon="plus" tone="teal" onClick={() => setWizard(true)}>Добави</TB>
            <TB
              icon="close"
              tone="red"
              disabled={!openItems.length}
              title={open ? 'Изтрий всички отзиви на разгънатия ученик' : 'Разгънете ученик, за да изтриете отзивите му'}
              onClick={removeAllOpen}
            >
              Изтрий
            </TB>
          </>
        )}
        <FilterButton />
      </Toolbar>

      <DnTable
        minWidth={720}
        head={
          <>
            <Th className="w-[54px]">№</Th>
            <Th>Ученик</Th>
            <Th className="w-[120px] text-center">Забележки</Th>
            <Th className="w-[110px] text-center">Похвали</Th>
          </>
        }
      >
        {students.length === 0 && (
          <EmptyRow colSpan={4} text="В паралелката няма активни ученици." />
        )}
        {students.map((s) => {
          const bad = ofStudent(s.id, 'Забележка').length
          const good = ofStudent(s.id, 'Похвала').length
          const isOpen = open?.studentId === s.id
          return (
            <Fragment key={s.id}>
              <tr
                className={s.status !== 'активен' ? 'bg-[#fde8e8]/70' : isOpen ? 'bg-[#f4f9fd]' : 'hover:bg-[#f7fbfd]'}
              >
                <td className="px-3 py-2 text-[12.5px] font-bold text-ink-400">{s.number}</td>
                <td className="px-3 py-2"><StudentCell student={s} showNumber={false} /></td>
                <td className="px-3 py-2 text-center">
                  <CountBadge value={bad} tone="red" onClick={() => bad && openPanel(s.id, 'Забележка')} />
                </td>
                <td className="px-3 py-2 text-center">
                  <CountBadge value={good} tone="green" onClick={() => good && openPanel(s.id, 'Похвала')} />
                </td>
              </tr>
              {isOpen && renderPanel(s.id, open!.kind)}
            </Fragment>
          )
        })}
      </DnTable>

      {wizard && (
        <ReviewWizard
          classId={classId}
          klass={klass}
          onClose={() => setWizard(false)}
        />
      )}
    </>
  )
}

/** Бройката в колоната — плътен цветен правоъгълник, както в образеца. */
function CountBadge({ value, tone, onClick }: {
  value: number
  tone: 'red' | 'green'
  onClick: () => void
}) {
  if (!value) {
    return <span className="inline-block h-[20px] w-[44px] rounded-[2px] bg-[#f1f4f6]" />
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title="Покажи отзивите"
      className="inline-block h-[20px] w-[44px] rounded-[2px] text-[12px] font-bold text-white transition hover:brightness-110"
      style={{ background: tone === 'red' ? '#e7505a' : '#26c281' }}
    >
      {value}
    </button>
  )
}
