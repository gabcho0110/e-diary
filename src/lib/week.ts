/**
 * Работа с учебни седмици и часове.
 *
 * Датите се смятат локално (без `toISOString()`), защото при GMT+3 UTC
 * измества деня назад. Функциите се ползват от разписанието в „Дневник" и от
 * „Моето разписание".
 */

export const DAY_NAMES = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък']

/** ISO номер на седмицата. */
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function mondayOf(d: Date): Date {
  const t = new Date(d)
  const day = (t.getDay() + 6) % 7
  t.setDate(t.getDate() - day)
  t.setHours(0, 0, 0, 0)
  return t
}

export function addDays(d: Date, n: number): Date {
  const t = new Date(d)
  t.setDate(t.getDate() + n)
  return t
}

export const ddmm = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`

/** Начален и краен час на даден период (35-минутни часове, както в референтния дневник). */
export function periodRange(period: number, shift: 1 | 2): [string, string] {
  const base = shift === 1 ? 8 * 60 : 13 * 60
  const starts = [0, 45, 95, 140, 190, 235, 285, 330]
  const start = base + starts[Math.min(period, starts.length - 1)]
  const end = start + 35
  const f = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  return [f(start), f(end)]
}
