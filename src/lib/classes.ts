import type { Klass, User } from './types'

/**
 * Помощни функции за имената на паралелките.
 *
 * Имената в базата са два вида: „5-А" (от демото) и „11Б" (създадени през
 * „Администрация"). За менюто ни трябват две части — клас и буква, за да се
 * подредят като „8 - А Б" вместо дълъг списък надолу.
 */
export function splitClassName(name: string): { grade: string; letter: string } {
  const m = name.match(/^(.*?)[-\s]?([А-Я])$/u)
  if (!m) return { grade: name, letter: '' }
  return { grade: m[1].trim(), letter: m[2] }
}

/** Ред на класовете: подготвителните първи, после числовите. */
export function gradeOrder(grade: string): number {
  if (/^ПГ/i.test(grade)) return 0
  const n = Number(grade)
  return Number.isFinite(n) ? n : 99
}

export interface GradeGroup {
  grade: string
  items: { klass: Klass; letter: string }[]
}

/** Групира паралелките по клас, сортирани по номер и по буква. */
export function groupClasses(classes: Klass[]): GradeGroup[] {
  const map = new Map<string, GradeGroup>()
  for (const klass of classes) {
    const { grade, letter } = splitClassName(klass.name)
    const g = map.get(grade) ?? { grade, items: [] }
    g.items.push({ klass, letter })
    map.set(grade, g)
  }
  return [...map.values()]
    .sort((a, b) => gradeOrder(a.grade) - gradeOrder(b.grade) || a.grade.localeCompare(b.grade, 'bg'))
    .map((g) => ({ ...g, items: g.items.sort((a, b) => a.letter.localeCompare(b.letter, 'bg')) }))
}

/** Името за показване — без тирето: „8-Б" → „8Б". */
export function shortClassName(name: string): string {
  return name.replace(/-/g, '')
}

/** „Александър Георгиев Тодоров" → „Александър Г. Тодоров". */
export function personShort(u?: User): string {
  if (!u) return ''
  const mid = u.middleName ? `${u.middleName.charAt(0)}. ` : ''
  return `${u.firstName} ${mid}${u.lastName}`.trim()
}

/**
 * Заглавието на отворената паралелка — вместо думата „Дневник":
 *
 *   „8В - Александър Г. Тодоров (класен)"
 *
 * Когато потребителят не е класен ръководител на тази паралелка, в скоби
 * пише „класен ръководител", за да не се заблуди, че е неговият клас.
 */
export function classHeaderTitle(klass: Klass, users: User[], meId?: string): string {
  const name = shortClassName(klass.name)
  const teacher = users.find((u) => u.id === klass.homeroomTeacherId)
  if (!teacher) return name
  const tag = teacher.id === meId ? 'класен' : 'класен ръководител'
  return `${name} - ${personShort(teacher)} (${tag})`
}
