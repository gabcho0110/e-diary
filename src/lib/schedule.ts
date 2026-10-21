import type { DB, DayRegime, Klass, RegimeHour, Subject, User } from './types'

/**
 * Помощни функции за модул „Разписания".
 *
 * Правилото, което се спазва навсякъде: **предмет и учител се взимат само от
 * паралелката**, за която се прави разписанието. Никакви глобални списъци —
 * иначе в 5-Б се появява учител по химия, който никога не е влизал там.
 */

export const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
export const DAY_LONG = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя']

/** „2026-10-21" от локална дата — без `toISOString()`, той мести деня при GMT+3. */
export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayIso(): string {
  return isoOf(new Date())
}

/** Ден от седмицата по ISO: 1 = понеделник … 7 = неделя. */
export function weekdayOf(iso: string): number {
  const d = new Date(`${iso}T00:00:00`)
  return d.getDay() || 7
}

/** Дата ± дни, пак като „2026-10-21". */
export function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return isoOf(d)
}

/** „21.10.2026" */
export function bgDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

/** „Пн, 21.10.2026" */
export function bgDateShort(iso: string): string {
  return `${DAY_SHORT[weekdayOf(iso) - 1]}, ${bgDate(iso)}`
}

/** Всички дати в периода, без събота и неделя. */
export function schoolDays(from: string, to: string): string[] {
  if (!from || !to || to < from) return []
  const out: string[] = []
  const d = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  let guard = 0
  while (d <= end && guard++ < 400) {
    const wd = d.getDay() || 7
    if (wd <= 5) out.push(isoOf(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

/** Понеделникът на седмицата, в която е датата. */
export function mondayIso(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return isoOf(d)
}

/** Часовете за конкретен ден от режима. */
export function hoursFor(regime: DayRegime | undefined, weekday: number): RegimeHour[] {
  if (!regime) return []
  if (regime.different) return regime.byDay?.[String(weekday)] ?? []
  return regime.hours ?? []
}

/** Край на часа по начало и продължителност в минути. */
export function endTime(start: string, duration: number): string {
  const [h, m] = start.split(':').map(Number)
  const total = h * 60 + m + (duration || 40)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Предметите, които се изучават в паралелката. */
export function classSubjects(db: DB, classId: string): Subject[] {
  const k = db.classes.find((c) => c.id === classId)
  if (!k) return []
  return k.subjectIds
    .map((id) => db.subjects.find((s) => s.id === id))
    .filter((s): s is Subject => !!s)
}

/**
 * Учителите по даден предмет **в тази паралелка**.
 *
 * Редът е: учебният план на паралелката (`klass.plan`) → седмичното
 * разписание (`db.schedule`) → учители, които имат предмета и паралелката в
 * профила си. Празен списък е валиден отговор — по-добре нищо, отколкото
 * учител, който не преподава тук.
 */
export function classTeachers(db: DB, classId: string, subjectId: string): User[] {
  const k: Klass | undefined = db.classes.find((c) => c.id === classId)
  const out: User[] = []
  const add = (id: string | undefined) => {
    if (!id || out.some((u) => u.id === id)) return
    const u = db.users.find((x) => x.id === id)
    if (u) out.push(u)
  }
  ;(k?.plan ?? []).filter((r) => r.subjectId === subjectId).forEach((r) => add(r.teacherId))
  if (out.length) return out
  db.schedule
    .filter((s) => s.classId === classId && s.subjectId === subjectId)
    .forEach((s) => add(s.teacherId))
  if (out.length) return out
  db.users
    .filter(
      (u) =>
        (u.classIds ?? []).includes(classId) && (u.subjectIds ?? []).includes(subjectId),
    )
    .forEach((u) => add(u.id))
  return out
}

/** Всички учители, които влизат в паралелката (за проверка при създаване). */
export function classTeacherIds(db: DB, classId: string): Set<string> {
  const k = db.classes.find((c) => c.id === classId)
  const ids = new Set<string>()
  ;(k?.plan ?? []).forEach((r) => ids.add(r.teacherId))
  db.schedule.filter((s) => s.classId === classId).forEach((s) => ids.add(s.teacherId))
  db.users.filter((u) => (u.classIds ?? []).includes(classId)).forEach((u) => ids.add(u.id))
  if (k?.homeroomTeacherId) ids.add(k.homeroomTeacherId)
  return ids
}
