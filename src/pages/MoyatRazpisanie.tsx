import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import { Icon, Select } from '../components/ui'
import { ScheduleTab } from './dnevnik/Schedule'
import { shortClassName } from '../lib/classes'
import { DAY_NAMES, addDays, ddmm, isoWeek, mondayOf, periodRange } from '../lib/week'

/**
 * „Моето разписание" — седмицата на самия потребител.
 *
 * Учителят вижда часовете, които преподава (по всички паралелки), а родителят
 * и ученикът — разписанието на своето дете. Ако профилът не води часове
 * (напр. системен администратор), екранът предлага избор на паралелка, за да
 * не остава празен.
 */
export default function MoyatRazpisanie() {
  const { db, user, myClasses, myChildren, isStaff } = useApp()
  const [offset, setOffset] = useState(0)

  const isFamily = !!user?.roles.some((r) => r === 'parent' || r === 'student')
  const child = isFamily ? myChildren[0] : undefined

  const myLessons = useMemo(() => {
    if (!user) return []
    if (isFamily) {
      const classIds = new Set(
        (user.childrenIds ?? (user.studentId ? [user.studentId] : []))
          .map((sid) => db.students.find((s) => s.id === sid)?.classId)
          .filter(Boolean) as string[],
      )
      return db.schedule.filter((s) => classIds.has(s.classId))
    }
    return db.schedule.filter((s) => s.teacherId === user.id)
  }, [db.schedule, db.students, user, isFamily])

  const [fallbackClass, setFallbackClass] = useState(myClasses[0]?.id ?? '')
  const empty = myLessons.length === 0

  const monday = useMemo(() => addDays(mondayOf(new Date()), offset * 7), [offset])
  const week = isoWeek(monday)
  const weekdays = DAY_NAMES.map((_, i) => addDays(monday, i))

  const maxPeriod = Math.max(4, ...myLessons.map((s) => s.period))

  /**
   * Часовете се групират по (ден, час), а не се взима само първият.
   * В демото един учител преподава на няколко паралелки и се случва два
   * урока да попаднат в един и същ слот — ако показвахме само първия, от
   * „34 часа седмично" на екрана щяха да се виждат едва 11.
   */
  const bySlot = useMemo(() => {
    const m = new Map<string, typeof myLessons>()
    for (const s of myLessons) {
      const key = `${s.day}-${s.period}`
      const arr = m.get(key)
      if (arr) arr.push(s)
      else m.set(key, [s])
    }
    return m
  }, [myLessons])

  const slot = (day: number, period: number) => bySlot.get(`${day}-${period}`) ?? []

  const className = (id: string) => {
    const k = db.classes.find((c) => c.id === id)
    return k ? shortClassName(k.name) : '—'
  }

  const title = isFamily && child
    ? `${child.firstName} ${child.lastName}`
    : user
      ? `${user.firstName} ${user.middleName ? `${user.middleName.charAt(0)}. ` : ''}${user.lastName}`
      : ''

  // ── празно разписание: показваме избраната паралелка ─────────────────────
  if (empty) {
    return (
      <>
        <div className="mb-4">
          <h1 className="text-[20px] font-bold tracking-tight text-ink-900">Моето разписание</h1>
          <p className="mt-0.5 text-[12.5px] text-ink-500">
            {isStaff
              ? 'Към профила ви няма назначени часове. Изберете паралелка, за да видите нейното разписание.'
              : 'За вашия профил няма въведено разписание.'}
          </p>
        </div>

        {isStaff && myClasses.length > 0 ? (
          <>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[12.5px] text-ink-500">Паралелка:</span>
              <Select value={fallbackClass} onChange={(e) => setFallbackClass(e.target.value)} className="w-auto min-w-[160px]">
                {myClasses.map((c) => <option key={c.id} value={c.id}>{shortClassName(c.name)}</option>)}
              </Select>
            </div>
            {fallbackClass && <ScheduleTab classId={fallbackClass} />}
          </>
        ) : (
          <div className="rounded border border-dashed border-ink-200 bg-white px-4 py-14 text-center">
            <Icon name="calendar" size={22} className="mx-auto text-ink-300" />
            <p className="mt-2 text-[13px] font-semibold text-ink-700">Няма часове за показване</p>
            <p className="mt-1 text-[12.5px] text-ink-500">
              Разписанието се въвежда от администрацията в „Администрация → Разписания".
            </p>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {/* заглавие на екрана */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-ink-900">{title}</h1>
          <p className="mt-0.5 text-[12.5px] text-ink-500">
            {isFamily ? 'Разписание на класа' : 'Разписание на часовете, които преподавате'}
            {' · '}
            {myLessons.length} часа седмично
          </p>
        </div>
      </div>

      {/* навигация по седмици */}
      <div className="mb-3 flex flex-wrap items-center gap-1">
        <button onClick={() => setOffset(offset - 10)} className="db db-blue" title="−10 седмици">«</button>
        <button onClick={() => setOffset(offset - 1)} className="db db-blue" title="Предишна седмица">
          <span className="text-[15px] leading-none">‹</span>
        </button>
        {Array.from({ length: 7 }, (_, i) => week - 4 + i).map((w) => (
          <button
            key={w}
            onClick={() => setOffset(offset + (w - week))}
            className={`db ${w === week ? 'db-teal' : 'border border-ink-200 bg-white !text-[#337ab7]'}`}
          >
            {w}
          </button>
        ))}
        <button onClick={() => setOffset(offset + 1)} className="db db-blue" title="Следваща седмица">
          <span className="text-[15px] leading-none">›</span>
        </button>
        <button onClick={() => setOffset(offset + 10)} className="db db-blue" title="+10 седмици">»</button>
        <span className="ml-2 rounded-[3px] border border-ink-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-700">
          Седмица {week} ({ddmm(weekdays[0])}-{ddmm(weekdays[4])})
        </span>
      </div>

      {/* седмична мрежа */}
      <div className="overflow-x-auto rounded-[3px] border border-[var(--dn-line)] bg-white">
        <table className="w-full border-collapse" style={{ minWidth: 900 }}>
          <thead>
            <tr className="bg-[#fbfcfd]">
              {weekdays.map((d, i) => (
                <th
                  key={i}
                  className="border-b border-r border-[var(--dn-line)] px-3 py-2 text-center text-[12.5px] font-bold text-ink-800 last:border-r-0"
                >
                  {DAY_NAMES[i]} / {ddmm(d)}.{d.getFullYear()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {weekdays.map((_, di) => (
                <td key={di} className="w-1/5 border-r border-[var(--dn-line)] p-0 align-top last:border-r-0">
                  {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((p) => {
                    const list = slot(di + 1, p)
                    const multi = list.length > 1
                    if (!list.length) {
                      return (
                        <div key={p} className="min-h-[86px] border-b border-[var(--dn-line)] px-3 py-2.5 last:border-b-0">
                          <span className="text-[12.5px] font-bold text-ink-300">{p}.</span>
                        </div>
                      )
                    }
                    return (
                      <div
                        key={p}
                        className="min-h-[86px] border-b border-[var(--dn-line)] px-3 py-2.5 last:border-b-0"
                        style={{ background: '#c9ecab' }}
                      >
                        {list.map((e, li) => {
                          const klass = db.classes.find((c) => c.id === e.classId)
                          const [from, to] = periodRange(p, klass?.shift ?? 1)
                          const room = db.rooms.find((r) => r.id === e.roomId)
                          const subject = db.subjects.find((s) => s.id === e.subjectId)
                          const roomText = room ? `${room.name}${room.floor ? ` (Етаж ${room.floor})` : ''}` : '—'

                          // няколко паралелки в един час → един ред на урок, иначе
                          // клетката става твърде висока, за да се чете
                          if (multi) {
                            return (
                              <p
                                key={e.id}
                                className={`truncate text-[11.5px] leading-[17px] text-ink-800 ${li ? 'border-t border-white/70' : ''}`}
                                title={`${p}. ${subject?.name ?? ''} · ${className(e.classId)} · ${roomText} · ${from} - ${to}`}
                              >
                                <span className="font-bold text-ink-600">{p}.</span>{' '}
                                <span className="font-bold text-[#2b6ca3]">{subject?.short ?? '—'}</span>
                                <span className="mx-1 text-ink-400">·</span>
                                {className(e.classId)}
                                <span className="mx-1 text-ink-400">·</span>
                                {room?.name ?? '—'}
                              </p>
                            )
                          }

                          return (
                            <div key={e.id}>
                              <p className="text-[12.5px]">
                                <span className="font-bold text-ink-600">{p}.</span>{' '}
                                <Icon name="book" size={13} className="mx-0.5 inline align-[-2px] text-[#2b6ca3]" strokeWidth={2} />
                                <span className="font-bold text-[#2b6ca3]">{subject?.short ?? '—'}</span>
                                {e.tag && (
                                  <span className="ml-1.5 rounded bg-white/70 px-1 py-0.5 text-[10px] font-bold text-[#6b21a8]">{e.tag}</span>
                                )}
                              </p>
                              <p className="mt-0.5 text-[12px] leading-[17px] text-ink-800">
                                <Icon name="users" size={11} className="mr-1 inline align-[-1px] text-ink-500" />
                                {className(e.classId)}
                                <span className="mx-1 text-ink-400">·</span>
                                <Icon name="grid" size={11} className="mr-1 inline align-[-1px] text-ink-500" />
                                {roomText}
                              </p>
                              <p className="mt-0.5 text-[12px] leading-[17px] text-ink-800">
                                <Icon name="clock" size={11} className="mr-1 inline align-[-1px] text-ink-500" />
                                {from} - {to}
                                {e.group && <span className="ml-1.5 text-[11px] text-ink-600">{e.group}</span>}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11.5px] text-ink-400">
        Показани са само часовете, които са ви назначени в седмичното разписание. Ако в един час
        преподавате на повече от една паралелка, уроците са подредени един под друг в клетката.
        Промени се правят от „Администрация → Разписания".
      </p>
    </>
  )
}
