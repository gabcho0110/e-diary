import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Icon } from '../../components/ui'
import { DAY_LONG, addDaysIso, bgDate, todayIso, weekdayOf } from '../../lib/schedule'
import { PRAISE_BADGES, REMARK_BADGES, TONE, type ReviewKind } from '../../lib/reviews'
import type { Absence, GradeType, Student } from '../../lib/types'

/**
 * „Моят час" — екранът, от който учителят въвежда проведения час.
 *
 * Часовете НЕ се измислят тук: падащият списък идва от разписанието, което е
 * създадено в „Администрация" → „Седмични разписания". Щом учителят има час в
 * някоя паралелка, той се появява в този списък за съответната дата.
 *
 * Всичко въведено тук отива в „Дневник" при „Запази промените":
 *  • отсъствие → раздел „Отсъствия"
 *  • оценка    → раздел „Оценки"
 *  • отзив     → раздел „Отзиви"
 *  • тема      → раздел „Теми"
 *  • домашна   → раздел „Домашни работи"
 */

// ── отсъствие ──────────────────────────────────────────────────────────────

type AbsMark = 'Присъс' | 'Закъс' | 'Неуваж' | 'Уваж'

const ABS_STATES: {
  id: AbsMark
  bg: string
  fg: string
  reason?: Absence['reason']
  excused?: boolean
  title: string
}[] = [
  { id: 'Присъс', bg: '#26c281', fg: '#ffffff', title: 'Присъства' },
  { id: 'Закъс', bg: '#eeb667', fg: '#5b4410', reason: 'закъснение', excused: false, title: 'Закъснение' },
  { id: 'Неуваж', bg: '#f4726d', fg: '#ffffff', reason: 'неизвинено', excused: false, title: 'Неуважено отсъствие' },
  { id: 'Уваж', bg: '#2fa8a0', fg: '#ffffff', reason: 'извинено', excused: true, title: 'Уважено отсъствие' },
]

const absState = (id: AbsMark) => ABS_STATES.find((s) => s.id === id) ?? ABS_STATES[0]

// ── оценки ─────────────────────────────────────────────────────────────────

/** Етикетите от падащото меню → типа, който моделът разбира. */
const GRADE_TYPES: { label: string; type: GradeType }[] = [
  { label: 'Устно изпитване', type: 'Устно изпитване' },
  { label: 'Писмено изпитване', type: 'Текуща' },
  { label: 'Практическо изпитване', type: 'Практическа' },
  { label: 'Тест', type: 'Текуща' },
  { label: 'Активно участие', type: 'Текуща' },
  { label: 'Проект', type: 'Проект' },
  { label: 'Самостоятелна работа', type: 'Текуща' },
  { label: 'Домашна работа', type: 'Домашна работа' },
  { label: 'Контролна работа', type: 'Контролна работа' },
  { label: 'Класна работа', type: 'Класна работа' },
  { label: 'Входно ниво', type: 'Входно ниво' },
  { label: 'Междинно ниво', type: 'Междинно ниво' },
  { label: 'Изходно ниво', type: 'Изходно ниво' },
]

/** „НЗ / УПР / ТК / ДЗ" — както е в тематичното разпределение. */
const TOPIC_KINDS: { id: string; label: string }[] = [
  { id: 'НЗ', label: 'НЗ — нови знания' },
  { id: 'УПР', label: 'УПР — упражнение' },
  { id: 'ТК', label: 'ТК — текущ контрол' },
  { id: 'ДЗ', label: 'ДЗ — домашна работа' },
]

/** Едно отметнато нещо за ученик в текущия час. */
interface Mark {
  absence: AbsMark
  absenceId?: string
  grade: number | null
  gradeId?: string
  type: string
  badge: string | null
  badgeKind: ReviewKind
  noteId?: string
  /** какво е било записано в базата — за да не се пише два пъти */
  savedBadge?: string | null
  savedValue?: number | null
}

const emptyMark = (): Mark => ({
  absence: 'Присъс', grade: null, type: '', badge: null, badgeKind: 'Похвала',
})

export function MyLesson() {
  const {
    db, user, isAdmin, studentsOf, className, subjectShort, userName,
    addAbsences, setAbsenceReason, deleteAbsence,
    addGrades, updateGrade, deleteGrade,
    addNotes, deleteNote,
    saveLessonReport, log,
  } = useApp()

  const isFamily = !!user?.roles.some((r) => r === 'parent' || r === 'student')

  const [date, setDate] = useState(todayIso())
  const [teacherId, setTeacherId] = useState(user?.id ?? '')
  const [pickedKey, setPickedKey] = useState('')
  const [taken, setTaken] = useState(true)
  const [studyKind, setStudyKind] = useState('Присъствено')
  const [topic, setTopic] = useState('')
  const [topicKind, setTopicKind] = useState('НЗ')
  const [homework, setHomework] = useState('')
  const [due, setDue] = useState('')
  const [marks, setMarks] = useState<Record<string, Mark>>({})
  const [badgeFor, setBadgeFor] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<number | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  // учителят, чиито часове гледаме (админът може да надникне при колега)
  const teachersWithLessons = useMemo(() => {
    const ids = new Set(db.lessons.map((l) => l.teacherId))
    return db.users.filter((u) => ids.has(u.id))
  }, [db.lessons, db.users])

  const lessons = useMemo(
    () =>
      db.lessons
        .filter((l) => l.teacherId === teacherId && l.date === date)
        .sort((a, b) => a.period - b.period),
    [db.lessons, teacherId, date],
  )

  const lesson = lessons.find((l) => `${l.classId}|${l.period}` === pickedKey) ?? lessons[0]
  const lessonKey = lesson ? `${lesson.classId}|${lesson.period}` : ''

  const students = useMemo(
    () =>
      lesson
        ? [...studentsOf(lesson.classId)].sort((a, b) => a.number - b.number)
        : [],
    [lesson, studentsOf],
  )

  // ── зареждане на записаното за този час ──────────────────────────────────
  useEffect(() => {
    if (!lesson) { setMarks({}); return }
    const out: Record<string, Mark> = {}
    students.forEach((s) => { out[s.id] = emptyMark() })

    db.absences
      .filter(
        (a) =>
          a.classId === lesson.classId && a.date === lesson.date &&
          a.period === lesson.period && !a.deletedAt,
      )
      .forEach((a) => {
        const m = out[a.studentId]
        if (!m) return
        m.absenceId = a.id
        m.absence = a.reason === 'закъснение' ? 'Закъс' : a.excused ? 'Уваж' : 'Неуваж'
      })

    db.grades
      .filter(
        (g) =>
          g.classId === lesson.classId && g.subjectId === lesson.subjectId &&
          g.date === lesson.date && !g.deletedAt,
      )
      .forEach((g) => {
        const m = out[g.studentId]
        if (!m) return
        m.gradeId = g.id
        m.grade = g.value
        m.savedValue = g.value
      })

    db.notes
      .filter((n) => n.classId === lesson.classId && n.date === lesson.date)
      .forEach((n) => {
        const m = out[n.studentId]
        if (!m) return
        m.noteId = n.id
        m.badge = n.badge ?? null
        m.savedBadge = n.badge ?? null
        m.badgeKind = n.kind === 'Похвала' ? 'Похвала' : 'Забележка'
      })

    setMarks(out)

    const rep = db.lessonReports.find(
      (r) =>
        r.classId === lesson.classId && r.date === lesson.date && r.period === lesson.period,
    )
    setTaken(rep?.taken ?? true)
    setStudyKind(rep?.studyKind || lesson.studyKind || 'Присъствено')
    setTopic(rep?.topic ?? '')
    setTopicKind(rep?.kind || 'НЗ')
    setHomework(rep?.homework ?? '')
    setDue(rep?.homeworkDue ?? addDaysIso(lesson.date, 1))
    // нарочно: презареждаме само при смяна на часа
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonKey, lesson?.date, students.length])

  /** Предишните теми по предмета — за подсказка при въвеждане. */
  const topicHistory = useMemo(() => {
    if (!lesson) return []
    const plan = db.themePlans.find(
      (p) => p.classId === lesson.classId && p.subjectId === lesson.subjectId,
    )
    return (plan?.rows ?? []).filter((r) => r.topic)
  }, [db.themePlans, lesson])

  const setMark = (studentId: string, patch: Partial<Mark>) =>
    setMarks((p) => ({ ...p, [studentId]: { ...(p[studentId] ?? emptyMark()), ...patch } }))

  const cycleAbsence = (studentId: string) =>
    setMarks((p) => {
      const cur = p[studentId]?.absence ?? 'Присъс'
      const i = ABS_STATES.findIndex((s) => s.id === cur)
      return {
        ...p,
        [studentId]: {
          ...(p[studentId] ?? emptyMark()),
          absence: ABS_STATES[(i + 1) % ABS_STATES.length].id,
        },
      }
    })

  const gradeAll = (value: number | null) =>
    setMarks((p) => {
      const next: Record<string, Mark> = {}
      Object.entries(p).forEach(([id, m]) => {
        next[id] = { ...m, grade: value, type: m.type || 'Текуща' }
      })
      return next
    })

  // ── запис ────────────────────────────────────────────────────────────────
  const save = () => {
    if (!lesson) return
    const list = students.map((s) => ({ s, m: marks[s.id] ?? emptyMark() }))

    // 1. отсъствия
    const existingAbs = db.absences.filter(
      (a) =>
        a.classId === lesson.classId && a.date === lesson.date &&
        a.period === lesson.period && !a.deletedAt,
    )
    existingAbs.forEach((a) => {
      const m = marks[a.studentId]
      if (!m || m.absence === 'Присъс') { deleteAbsence(a.id); return }
      const st = absState(m.absence)
      if (a.reason !== st.reason || a.excused !== !!st.excused) {
        setAbsenceReason(a.id, st.reason!, !!st.excused)
      }
    })
    const toAdd = list.filter(
      ({ s, m }) =>
        m.absence !== 'Присъс' && !existingAbs.some((a) => a.studentId === s.id),
    )
    if (toAdd.length) {
      addAbsences(
        toAdd.map(({ s, m }) => {
          const st = absState(m.absence)
          return {
            studentId: s.id,
            classId: lesson.classId,
            date: lesson.date,
            period: lesson.period,
            subjectId: lesson.subjectId,
            reason: st.reason!,
            excused: !!st.excused,
            teacherId: lesson.teacherId,
          }
        }),
      )
    }

    // 2. оценки
    const term: 1 | 2 = lesson.date <= (db.school.term1?.to ?? '') ? 1 : 2
    list.forEach(({ s, m }) => {
      const type = GRADE_TYPES.find((g) => g.label === m.type)?.type ?? 'Текуща'
      if (m.grade == null) {
        if (m.gradeId) deleteGrade(m.gradeId)
        return
      }
      if (m.gradeId) {
        const old = db.grades.find((g) => g.id === m.gradeId)
        if (old && (old.value !== m.grade || (m.type && old.type !== type))) {
          updateGrade(m.gradeId, { value: m.grade, ...(m.type ? { type } : {}) })
        }
        return
      }
      addGrades([{
        studentId: s.id,
        subjectId: lesson.subjectId,
        classId: lesson.classId,
        value: m.grade,
        type,
        date: lesson.date,
        term,
        teacherId: lesson.teacherId,
        draft: false,
      }])
    })

    // 3. отзиви
    list.forEach(({ s, m }) => {
      if ((m.savedBadge ?? null) === (m.badge ?? null)) return
      if (m.noteId) deleteNote(m.noteId)
      if (!m.badge) return
      const pool = m.badgeKind === 'Похвала' ? PRAISE_BADGES : REMARK_BADGES
      const def = pool.find((b) => b.name === m.badge)
      addNotes([{
        studentId: s.id,
        classId: lesson.classId,
        text: def?.text ?? m.badge,
        kind: m.badgeKind,
        badge: m.badge,
        teacherId: lesson.teacherId,
        date: lesson.date,
        subjectId: lesson.subjectId,
        visibleToParent: true,
      }])
    })

    // 4. проведеният час → „Теми" и „Домашни работи"
    saveLessonReport({
      classId: lesson.classId,
      subjectId: lesson.subjectId,
      teacherId: lesson.teacherId,
      date: lesson.date,
      period: lesson.period,
      taken,
      studyKind,
      topic,
      kind: topicKind,
      homework,
      homeworkDue: due || undefined,
    })

    log(
      'Проведен час',
      `${className(lesson.classId)} · ${subjectShort(lesson.subjectId)} · ${bgDate(lesson.date)}, ${lesson.period}. час`,
    )
    setFlash('Промените са записани в „Дневник".')
    window.setTimeout(() => setFlash(null), 3200)
  }

  // ── екрани без съдържание ────────────────────────────────────────────────
  if (isFamily) {
    return (
      <Empty
        title="Екранът е само за учители"
        text="Екранът се използва от преподавателите, за да въвеждат проведения час."
      />
    )
  }

  if (!lessons.length) {
    return (
      <>
        <Header
          title={`Моят час${teacherId ? ` — ${userName(teacherId)}` : ''}`}
          date={date}
          onDate={setDate}
          onSave={undefined}
          teachers={isAdmin ? teachersWithLessons : []}
          teacherId={teacherId}
          onTeacher={setTeacherId}
        />
        <Empty
          title={`Няма часове на ${bgDate(date)}`}
          text={`Разписанието се създава в „Администрация" → „Седмични разписания". Щом там имате час за ${DAY_LONG[weekdayOf(date) - 1].toLowerCase()}, той се появява тук автоматично.`}
        />
      </>
    )
  }

  const badgeStudent = badgeFor ? students.find((s) => s.id === badgeFor) : undefined

  return (
    <>
      <Header
        title={`Моят час — ${userName(teacherId)}`}
        date={date}
        onDate={setDate}
        onSave={save}
        teachers={isAdmin ? teachersWithLessons : []}
        teacherId={teacherId}
        onTeacher={setTeacherId}
      />

      {flash && (
        <div className="mb-3 flex items-center gap-2 rounded-[3px] border border-[#b9e3c6] bg-[#e8f7ee] px-3 py-2 text-[12.5px] font-semibold text-[#1f7a45]">
          <Icon name="check" size={14} strokeWidth={2.6} /> {flash}
        </div>
      )}

      {/* ── избор на час ── */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[3px] border border-ink-200 bg-white px-3 py-2.5">
        <Icon name="clock" size={15} className="shrink-0 text-[#5b6b78]" />
        <select
          value={lessonKey}
          onChange={(e) => setPickedKey(e.target.value)}
          className="min-w-0 flex-1 rounded-[3px] border border-[#c7d0d8] bg-white px-2 py-[6px] text-[13px] font-semibold text-ink-900 outline-none focus:border-[#3598dc]"
        >
          {lessons.map((l) => (
            <option key={`${l.classId}|${l.period}`} value={`${l.classId}|${l.period}`}>
              Час {l.period} / {l.start} — {subjectShort(l.subjectId)} в {className(l.classId)}
            </option>
          ))}
        </select>
        <span className="rounded-[3px] bg-[#eef2f5] px-2 py-1 text-[11.5px] font-semibold text-[#5b6b78]">
          {lessons.length} {lessons.length === 1 ? 'час' : 'часа'} за деня
        </span>
      </div>

      {/* ── часът ── */}
      <div className="mb-3 rounded-[3px] border border-ink-200 bg-white px-3 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-semibold text-[#3d4a56]">Маркирай часа като взет:</span>
            <button
              type="button"
              onClick={() => setTaken((v) => !v)}
              title="Дали часът е проведен"
              className="rounded-[3px] px-3 py-[5px] text-[12px] font-bold text-white"
              style={{ background: taken ? '#26c281' : '#e7505a' }}
            >
              {taken ? 'ДА' : 'НЕ'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-semibold text-[#3d4a56]">Вид обучение:</span>
            <select
              value={studyKind}
              onChange={(e) => setStudyKind(e.target.value)}
              className="rounded-[3px] border border-[#c7d0d8] bg-white px-2 py-[5px] text-[12.5px] outline-none focus:border-[#3598dc]"
            >
              <option value="Присъствено">Присъствено</option>
              <option value="Онлайн обучение">Онлайн обучение</option>
              <option value="Смесено">Смесено</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!students.length) return
              const pick = students[Math.floor(Math.random() * students.length)]
              setHighlight(pick.number)
              window.setTimeout(() => setHighlight(null), 2500)
            }}
            className="ml-auto rounded-[3px] border border-[#c7d0d8] bg-[#f3f5f7] px-3 py-[5px] text-[12px] font-semibold text-[#3d4a56] hover:bg-white"
          >
            Случаен номер
          </button>
        </div>

        {/* тема */}
        <div className="mt-3 flex flex-wrap items-start gap-2">
          <div className="relative min-w-[260px] flex-1">
            <div className="flex items-center gap-1.5 rounded-[3px] border border-[#c7d0d8] bg-white px-2">
              <Icon name="list" size={13} className="shrink-0 text-ink-400" />
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Въведете тема на часа"
                className="w-full bg-transparent py-[7px] text-[13px] outline-none placeholder:text-ink-400"
              />
            </div>
            {!!topicHistory.length && !topic && (
              <div className="mt-1 max-h-[132px] overflow-y-auto rounded-[3px] border border-[#e4e9ee] bg-white">
                {topicHistory.slice(-8).reverse().map((r) => (
                  <button
                    key={`${r.no}-${r.topic}`}
                    type="button"
                    onClick={() => { setTopic(r.topic); setTopicKind(r.kind ?? 'НЗ') }}
                    className="flex w-full items-center gap-2 border-b border-[#f0f3f5] px-2 py-[5px] text-left text-[12px] text-ink-700 last:border-b-0 hover:bg-[#eef6fb]"
                  >
                    <span className="min-w-0 flex-1 truncate">{r.topic}</span>
                    <span className="shrink-0 text-[10.5px] text-ink-400">
                      ({r.kind ?? 'НЗ'}){r.date ? ` · ${bgDate(r.date)}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <select
            value={topicKind}
            onChange={(e) => setTopicKind(e.target.value)}
            title="Вид на занятието"
            className="rounded-[3px] border border-[#c7d0d8] bg-white px-2 py-[7px] text-[12.5px] outline-none focus:border-[#3598dc]"
          >
            {TOPIC_KINDS.map((k) => (
              <option key={k.id} value={k.id}>{k.label}</option>
            ))}
          </select>
        </div>

        {/* домашна */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex min-w-[260px] flex-1 items-center gap-1.5 rounded-[3px] border border-[#c7d0d8] bg-white px-2">
            <Icon name="clipboard" size={13} className="shrink-0 text-ink-400" />
            <input
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder="Въведете домашна работа"
              className="w-full bg-transparent py-[7px] text-[13px] outline-none placeholder:text-ink-400"
            />
          </div>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            title="Краен срок за домашната"
            className="rounded-[3px] border border-[#c7d0d8] bg-white px-2 py-[6px] text-[12.5px] outline-none focus:border-[#3598dc]"
          />
        </div>
      </div>

      {/* ── ученици ── */}
      <div className="overflow-x-auto rounded-[3px] border border-ink-200 bg-white">
        <table className="w-full border-collapse" style={{ minWidth: 860 }}>
          <thead>
            <tr className="bg-[#f7f9fa]">
              <th className="th w-[36px] text-center">№</th>
              <th className="th">Ученик</th>
              <th className="th w-[110px]">Отсъствие</th>
              <th className="th w-[210px]">Оценка за всички</th>
              <th className="th w-[210px]">Текуща оценка</th>
              <th className="th w-[170px]">Вид оценка</th>
              <th className="th w-[90px]">Отзив</th>
            </tr>
            <tr className="bg-[#fbfcfd]">
              <th className="th" />
              <th className="th" />
              <th className="th" />
              <th className="th">
                <div className="flex items-center gap-2">
                  <GradeButtons value={null} onPick={(v) => gradeAll(v)} compact />
                  <span className="text-[10.5px] font-normal text-ink-400">за всички</span>
                </div>
              </th>
              <th className="th text-[10.5px] font-normal text-ink-400">за всеки ученик</th>
              <th className="th" />
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const m = marks[s.id] ?? emptyMark()
              const st = absState(m.absence)
              const on = highlight === s.number
              return (
                <tr
                  key={s.id}
                  className={on ? 'bg-[#fff7d6]' : 'hover:bg-[#f9fbfc]'}
                  style={s.status !== 'активен' ? { background: on ? '#fff7d6' : '#fdeaea' } : undefined}
                >
                  <td className="td text-center text-[12px] font-bold text-ink-500">{s.number}</td>
                  <td className="td text-[12.5px]">
                    <span className="font-semibold text-ink-900">
                      {s.firstName} {s.middleName ? `${s.middleName.charAt(0)}. ` : ''}{s.lastName}
                    </span>
                    {s.sen && (
                      <span className="ml-1.5 rounded bg-[#f1eafe] px-1 py-0.5 text-[10px] font-bold text-[#6b21a8]">СОП</span>
                    )}
                    {s.status !== 'активен' && (
                      <span className="ml-1 text-[11px] text-[#b42318]">({s.status})</span>
                    )}
                  </td>

                  <td className="td">
                    <button
                      type="button"
                      onClick={() => cycleAbsence(s.id)}
                      title={`${st.title} — кликнете, за да смените`}
                      className="w-full rounded-[2px] px-2 py-[4px] text-[11.5px] font-bold"
                      style={{ background: st.bg, color: st.fg }}
                    >
                      {m.absence}
                    </button>
                  </td>

                  <td className="td" />

                  <td className="td">
                    <div className="flex items-center gap-1">
                      <GradeButtons
                        value={m.grade}
                        onPick={(v) => setMark(s.id, { grade: v, type: m.type || 'Текуща' })}
                      />
                      <span className="ml-1 inline-grid h-[24px] w-[52px] place-items-center rounded-[2px] border border-ink-200 bg-[#fbfcfd] text-[12px] font-bold text-ink-800">
                        {m.grade != null ? m.grade.toFixed(2).replace('.', ',') : ''}
                      </span>
                    </div>
                  </td>

                  <td className="td">
                    <select
                      value={m.type}
                      onChange={(e) => setMark(s.id, { type: e.target.value })}
                      className="w-full rounded-[2px] border border-[#c7d0d8] bg-white px-1.5 py-[4px] text-[12px] outline-none focus:border-[#3598dc]"
                    >
                      <option value="">Изберете</option>
                      {GRADE_TYPES.map((g) => (
                        <option key={g.label} value={g.label}>{g.label}</option>
                      ))}
                    </select>
                  </td>

                  <td className="td">
                    <button
                      type="button"
                      onClick={() => setBadgeFor(s.id)}
                      title={m.badge ? `Отзив: ${m.badge}` : 'Избери значка'}
                      className={`grid h-[26px] w-full place-items-center rounded-[2px] border ${
                        m.badge ? 'border-[#b9e3c6] bg-[#e8f7ee]' : 'border-ink-200 bg-white hover:bg-[#f2f8fd]'
                      }`}
                    >
                      {m.badge ? (
                        <span className="text-[14px]">
                          {(m.badgeKind === 'Похвала' ? PRAISE_BADGES : REMARK_BADGES)
                            .find((b) => b.name === m.badge)?.emoji ?? '🎖️'}
                        </span>
                      ) : (
                        <Icon name="badge" size={14} className="text-[#3598dc]" />
                      )}
                    </button>
                  </td>
                </tr>
              )
            })}
            {!students.length && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[12.5px] text-ink-400">
                  В паралелката няма ученици.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
        Отсъствията, оценките, отзивите, темата и домашната се записват в „Дневник" след
        натискане на „Запази промените". Отсъствието се сменя с клик: Присъс → Закъс →
        Неуваж → Уваж.
      </p>

      {badgeStudent && (
        <BadgePicker
          student={badgeStudent}
          mark={marks[badgeStudent.id] ?? emptyMark()}
          onClose={() => setBadgeFor(null)}
          onPick={(badge, kind) => {
            setMark(badgeStudent.id, { badge, badgeKind: kind })
            setBadgeFor(null)
          }}
        />
      )}
    </>
  )
}

// ── горна лента ────────────────────────────────────────────────────────────

function Header({
  title, date, onDate, onSave, teachers, teacherId, onTeacher,
}: {
  title: string
  date: string
  onDate: (v: string) => void
  onSave?: () => void
  teachers: { id: string; firstName: string; lastName: string }[]
  teacherId: string
  onTeacher: (id: string) => void
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-ink-200 pb-2.5">
      <Icon name="edit" size={16} className="shrink-0 text-[#5b6b78]" />
      <h1 className="min-w-0 truncate text-[15px] font-bold text-ink-900">{title}</h1>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {teachers.length > 1 && (
          <select
            value={teacherId}
            onChange={(e) => onTeacher(e.target.value)}
            title="Часове на учител (само за администратори)"
            className="rounded-[3px] border border-[#c7d0d8] bg-white px-2 py-[6px] text-[12.5px] outline-none focus:border-[#3598dc]"
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
            ))}
          </select>
        )}
        <input
          type="date"
          value={date}
          onChange={(e) => onDate(e.target.value)}
          className="rounded-[3px] border border-[#3598dc] bg-white px-2 py-[5px] text-[12.5px] font-semibold text-[#2b6ca3] outline-none"
        />
        {onSave && (
          <button type="button" onClick={onSave} className="db db-teal">
            <Icon name="check" size={14} strokeWidth={2.6} /> Запази промените
          </button>
        )}
      </div>
    </div>
  )
}

// ── оценка 2–6 ─────────────────────────────────────────────────────────────

const GRADE_COLORS: Record<number, string> = {
  2: '#e7505a', 3: '#f2784b', 4: '#f7ca18', 5: '#3598dc', 6: '#26c281',
}

function GradeButtons({
  value, onPick, compact,
}: { value: number | null; onPick: (v: number | null) => void; compact?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[2, 3, 4, 5, 6].map((g) => {
        const on = value === g
        return (
          <button
            key={g}
            type="button"
            onClick={() => onPick(on ? null : g)}
            title={on ? 'Премахни оценката' : `Оценка ${g}`}
            className={`grid place-items-center rounded-[2px] font-bold transition ${compact ? 'h-[18px] w-[18px] text-[10.5px]' : 'h-[20px] w-[20px] text-[11.5px]'} ${on ? 'text-white ring-2 ring-[#2b3d4d] ring-offset-1' : 'bg-white hover:brightness-95'}`}
            style={on
              ? { background: GRADE_COLORS[g] }
              : { color: GRADE_COLORS[g], boxShadow: `inset 0 0 0 1.5px ${GRADE_COLORS[g]}` }}
          >
            {g}
          </button>
        )
      })}
    </div>
  )
}

// ── избор на значка ────────────────────────────────────────────────────────

function BadgePicker({
  student, mark, onPick, onClose,
}: {
  student: Student
  mark: Mark
  onPick: (badge: string | null, kind: ReviewKind) => void
  onClose: () => void
}) {
  const [kind, setKind] = useState<ReviewKind>(mark.badgeKind)
  const pool = kind === 'Похвала' ? PRAISE_BADGES : REMARK_BADGES
  const tone = TONE[kind]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 py-10">
      <div className="w-full max-w-[760px] overflow-hidden rounded-[4px] bg-white shadow-[0_18px_50px_rgba(20,35,50,0.3)]">
        <div className="flex items-center border-b border-ink-200 px-4 py-2.5">
          <h2 className="text-[15px] font-bold text-ink-900">Избери значки</h2>
          <button type="button" onClick={onClose} className="ml-auto text-ink-400 hover:text-ink-700" title="Затвори">
            <Icon name="close" size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="flex">
          {(['Похвала', 'Забележка'] as ReviewKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className="flex-1 py-2.5 text-[13px] font-bold"
              style={{
                background: kind === k ? TONE[k].panel : '#fff',
                color: kind === k ? TONE[k].label : '#5b6b78',
              }}
            >
              {k === 'Похвала' ? 'Похвали' : 'Забележки'}
            </button>
          ))}
        </div>

        <div className="max-h-[430px] overflow-y-auto px-3 py-3">
          <p className="mb-2 px-1 text-[12px] text-ink-500">
            {student.firstName} {student.lastName}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {pool.map((b) => {
              const on = mark.badge === b.name && mark.badgeKind === kind
              return (
                <button
                  key={b.name}
                  type="button"
                  onClick={() => onPick(on ? null : b.name, kind)}
                  className="flex flex-col items-center gap-1 rounded-[3px] px-1 py-2 text-center transition hover:bg-[#f5f8fa]"
                  style={on ? { background: '#dceafb' } : undefined}
                  title={b.text}
                >
                  <span
                    className="grid h-[46px] w-[46px] place-items-center rounded-full text-[22px]"
                    style={{ background: tone.fill, border: `2px solid ${tone.ring}` }}
                  >
                    {b.emoji}
                  </span>
                  <span className="text-[10.5px] leading-tight text-ink-700">{b.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-ink-200 px-4 py-2.5">
          <button type="button" onClick={onClose} className="rounded-[3px] border border-ink-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-700">
            Затвори
          </button>
          <button type="button" onClick={onClose} className="db db-teal">
            <Icon name="check" size={13} strokeWidth={2.6} /> Запази
          </button>
        </div>
      </div>
    </div>
  )
}

// ── празно състояние ───────────────────────────────────────────────────────

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[3px] border border-dashed border-ink-200 bg-white px-4 py-12 text-center">
      <Icon name="calendar" size={22} className="mx-auto text-ink-300" />
      <p className="mt-2 text-[13.5px] font-semibold text-ink-700">{title}</p>
      <p className="mx-auto mt-1 max-w-[520px] text-[12.5px] leading-[19px] text-ink-500">{text}</p>
    </div>
  )
}
