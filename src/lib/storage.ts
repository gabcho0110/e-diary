import type { DB } from './types'
import { buildDB } from './seed'
import { rtdb, DB_ROOT } from './firebase'

const KEY_LOCAL = 'e-dnevnik.db.v1'
const KEY_AUTH = 'e-dnevnik.session.v1'

export type StorageMode = 'cloud' | 'local'

/** Съобщение за напредъка на дългите стъпки (теглене/качване на базата). */
export type Progress = (message: string) => void

export interface LoadResult {
  db: DB
  mode: StorageMode
  /** true, ако данните са генерирани наново (празна база) */
  seeded: boolean
  warning?: string
}

export interface LoadOptions {
  onProgress?: Progress
}

/** Всички колекции от модела (без `school`, което е единичен обект). */
const COLLECTIONS = [
  'users', 'subjects', 'classes', 'students', 'grades', 'absences', 'notes',
  'schedule', 'regimes', 'lessons', 'homework', 'exams', 'messages', 'tests', 'materials', 'tasks',
  'events', 'meetings', 'activities', 'themePlans', 'fees', 'rooms',
  'competitions', 'portfolios', 'studentProfiles', 'attestations',
  'lessonAbsences', 'docs', 'virtualRooms', 'ifoDiaries', 'syncLogs', 'audit',
  // раздели в „Дневник"
  'sanctions', 'classNotes', 'supportPlans', 'vhkLessons', 'classMeetings',
  'correctionalExams', 'equivalenceExams',
  // по статиите от помощния център
  'absenceNotes', 'gradeExemptions', 'deleteRequests',
  'norms', 'normResults', 'trainingPlans', 'combinedGroups',
] as const

/**
 * По-стари копия на базата (от преди добавянето на новите раздели) нямат тези
 * масиви. Без тази поправка всяко `db.sanctions.map(...)` щеше да гърми.
 */
function hydrate(db: DB): DB {
  const d = db as unknown as Record<string, unknown>
  for (const coll of COLLECTIONS) {
    if (!Array.isArray(d[coll])) d[coll] = []
  }
  if (!Array.isArray(d.audit)) d.audit = []
  return db
}

// ── Преобразуване между модела и това, което се пази във Firebase ───────────
//
// Realtime Database не поддържа масиви: празен масив се превръща в обект или
// изчезва, а полета като `roles: []` или `parentIds: []` са навсякъде в модела.
// Затова всеки запис се пази като JSON низ, а пътят до него е `<колекция>/<id>`.
// Така записът е напълно обратим и могат да се пращат само променените записи.

type Wire = Record<string, string>

function pack(value: unknown): string {
  return JSON.stringify(value)
}

function unpack<T>(raw: unknown): T | null {
  if (typeof raw !== 'string') return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function toWire(db: DB): Wire {
  const wire: Wire = { school: pack(db.school) }
  for (const coll of COLLECTIONS) {
    const items = (db[coll] ?? []) as { id: string }[]
    for (const item of items) {
      if (item && typeof item.id === 'string') wire[`${coll}/${item.id}`] = pack(item)
    }
  }
  return wire
}

function fromWire(wire: Wire): DB {
  const out = { school: unpack(wire.school) } as unknown as DB
  const buckets: Record<string, unknown[]> = {}
  for (const coll of COLLECTIONS) buckets[coll] = []

  for (const [key, raw] of Object.entries(wire)) {
    if (key === 'school') continue
    if (typeof raw === 'string') {
      // плосък формат: ключът е „<колекция>/<id>", стойността е JSON низ
      const coll = key.slice(0, key.indexOf('/'))
      if (!(coll in buckets)) continue
      const item = unpack(raw)
      if (item) buckets[coll].push(item)
    } else if (raw && typeof raw === 'object' && key in buckets) {
      // вложен формат — точно така RTDB връща това, което е писало с flat PATCH:
      // ключът е името на колекцията, стойността е обект „<id> → JSON низ"
      for (const val of Object.values(raw as Record<string, unknown>)) {
        const item = unpack(val)
        if (item) buckets[key].push(item)
      }
    }
  }

  for (const coll of COLLECTIONS) {
    ;(out as unknown as Record<string, unknown>)[coll] = buckets[coll]
  }
  return hydrate(out)
}

function isUsable(db: DB): boolean {
  return !!db?.school?.name && Array.isArray(db.users) && db.users.length > 0
}

// ── Състояние на модула ────────────────────────────────────────────────────

let currentMode: StorageMode = 'local'
let lastWire: Wire | null = null

/** Разликата между последно изпратеното и новото състояние. */
function diff(next: Wire): { patch: Wire | null; skipped: string[]; skippedKeys: string[] } {
  const prev = lastWire
  if (!prev) return { patch: next, skipped: [], skippedKeys: [] }
  const patch: Wire = {}
  let changed = false
  for (const [k, v] of Object.entries(next)) {
    if (prev[k] !== v) { patch[k] = v; changed = true }
  }

  // Предпазна мярка срещу масово изтриване.
  //
  // `diff` трие всеки запис, който е бил в базата, но липсва в паметта. Ако
  // прочитането върне непълна база (или екран я подмени с празна), едно
  // записване изтрива цяла колекция — точно така на 21.10.2026 изчезнаха
  // „classes" и 16 учителски профила. Затова: ако колекция с 3+ записа
  // изчезне наведнъж, изтриванията се пропускат и се връща предупреждение.
  // Изтриване на отделни записи (и на последния останал) продължава да работи.
  const countByCollection = (wire: Wire) => {
    const m = new Map<string, number>()
    for (const k of Object.keys(wire)) {
      const coll = k.includes('/') ? k.slice(0, k.indexOf('/')) : k
      m.set(coll, (m.get(coll) ?? 0) + 1)
    }
    return m
  }
  const prevCount = countByCollection(prev)
  const nextCount = countByCollection(next)
  const skipped: string[] = []
  const skippedKeys: string[] = []

  for (const k of Object.keys(prev)) {
    if (k in next) continue
    const coll = k.includes('/') ? k.slice(0, k.indexOf('/')) : k
    const before = prevCount.get(coll) ?? 0
    const after = nextCount.get(coll) ?? 0
    if (before >= 3 && after === 0) {
      if (!skipped.includes(coll)) skipped.push(coll)
      skippedKeys.push(k)
      continue
    }
    ;(patch as Record<string, string | null>)[k] = null
    changed = true
  }
  return { patch: changed ? patch : null, skipped, skippedKeys }
}

/** Съобщение за пропуснато масово изтриване (показва се като жълт банер). */
function guardWarning(collections: string[]): string {
  return (
    'Предпазна проверка: в паметта липсват всички записи от ' +
    collections.map((c) => `„${c}“`).join(', ') +
    '. Записването им като изтрити е спряно, за да не се загубят данни. ' +
    'Презаредете страницата — записите са си на мястото в базата.'
  )
}

/** Праща ключовете на парчета, за да не е един огромен кадър при първоначално качване. */
async function push(wire: Wire, chunkSize = 120, onProgress?: Progress): Promise<void> {
  const entries = Object.entries(wire)
  const total = Math.max(1, Math.ceil(entries.length / chunkSize))
  for (let i = 0; i < entries.length; i += chunkSize) {
    const slice = Object.fromEntries(entries.slice(i, i + chunkSize))
    await rtdb.patch(DB_ROOT, slice)
    onProgress?.(`Качване на базата… ${Math.min(i / chunkSize + 1, total)} / ${total}`)
  }
}

function readLocalCache(): DB | null {
  try {
    const raw = localStorage.getItem(KEY_LOCAL)
    if (!raw) return null
    const db = JSON.parse(raw) as DB
    return isUsable(db) ? hydrate(db) : null
  } catch {
    return null
  }
}

// ── Публичен интерфейс ─────────────────────────────────────────────────────

export const storage = {
  mode(): StorageMode {
    return currentMode
  },

  /** Чете от Firebase; при празна база я създава и качва. */
  async load(options: LoadOptions = {}): Promise<LoadResult> {
    const p = options.onProgress
    try {
      p?.('Свързване с Firebase…')
      const wire = (await rtdb.get<Wire>(DB_ROOT)) ?? {}
      p?.('Подготовка на данните…')

      if (Object.keys(wire).length > 0) {
        const db = fromWire(wire)
        if (isUsable(db)) {
          // ВАЖНО: `lastWire` трябва да е в същия формат, който произвежда
          // `toWire()` — иначе първият `save()` смята всеки запис за нов и
          // качва цялата база наново (165 последователни PATCH-а).
          lastWire = toWire(db)
          currentMode = 'cloud'
          // снимка за офлайн работа — най-добро усилие, квотата може да не стигне
          try { localStorage.setItem(KEY_LOCAL, JSON.stringify(db)) } catch { /* ignore */ }
          return { db, mode: 'cloud', seeded: false }
        }
      }

      // Базата е празна (или непълна) → създаваме училището и го качваме.
      const fresh = buildDB()
      lastWire = null
      const res = await this.save(fresh, p)
      currentMode = res.ok ? 'cloud' : 'local'
      return {
        db: fresh,
        mode: currentMode,
        seeded: true,
        warning: res.warning,
      }
    } catch (e) {
      // Няма връзка или правилата за достъп отказват четене.
      const cached = readLocalCache()
      if (cached) {
        currentMode = 'local'
        return {
          db: cached,
          mode: 'local',
          seeded: false,
          warning:
            'Няма връзка с Firebase — работите върху копие от локалния кеш. ' +
            'Промените няма да се синхронизират, докато връзката не се възстанови.',
        }
      }
      const fresh = buildDB()
      currentMode = 'local'
      return {
        db: fresh,
        mode: 'local',
        seeded: true,
        warning:
          'Няма връзка с Firebase (' + (e as Error).message + '). ' +
          'Дневникът работи с локални данни и няма да се синхронизира.',
      }
    }
  },

  /** Записва само променените записи (един multi-path update). */
  async save(db: DB, onProgress?: Progress): Promise<{ ok: boolean; warning?: string }> {
    const wire = toWire(db)
    const { patch, skipped, skippedKeys } = diff(wire)
    if (!patch) {
      return skipped.length
        ? { ok: true, warning: guardWarning(skipped) }
        : { ok: true }
    }

    try {
      if (!lastWire) {
        // първоначално качване на цялата база
        await push(wire, 120, onProgress)
      } else {
        onProgress?.('Запис на промените…')
        await rtdb.patch(DB_ROOT, patch as Record<string, unknown>)
      }
      // Пропуснатите ключове остават в `lastWire`, за да не се опитва
      // изтриването им при всяко следващо записване.
      if (skippedKeys.length && lastWire) {
        const keep = lastWire
        lastWire = { ...wire }
        for (const k of skippedKeys) if (k in keep) (lastWire as Wire)[k] = keep[k]
      } else {
        lastWire = wire
      }
      currentMode = 'cloud'
      return skipped.length ? { ok: true, warning: guardWarning(skipped) } : { ok: true }
    } catch (e) {
      currentMode = 'local'
      console.warn('[storage] Firebase запис неуспешен', e)
      return {
        ok: false,
        warning:
          'Промените не бяха синхронизирани с Firebase (' + (e as Error).message + '). ' +
          'Проверете връзката и правилата за достъп на базата.',
      }
    }
  },

  /** Пресъздава демонстрационните данни и ги качва в Firebase. */
  async reset(): Promise<DB> {
    try { localStorage.removeItem(KEY_LOCAL) } catch { /* ignore */ }
    try { localStorage.removeItem(KEY_AUTH) } catch { /* ignore */ }
    const fresh = buildDB()
    lastWire = null
    await this.save(fresh)
    return fresh
  },

  session: {
    get(): string | null {
      try {
        return localStorage.getItem(KEY_AUTH)
      } catch {
        return null
      }
    },
    set(userId: string) {
      try {
        localStorage.setItem(KEY_AUTH, userId)
      } catch {
        /* ignore */
      }
    },
    clear() {
      try {
        localStorage.removeItem(KEY_AUTH)
      } catch {
        /* ignore */
      }
    },
  },
}
