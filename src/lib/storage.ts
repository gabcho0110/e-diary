import type { DB } from './types'
import { buildDB } from './seed'
import { rtdb, DB_ROOT } from './firebase'

const KEY_LOCAL = 'e-dnevnik.db.v1'
const KEY_AUTH = 'e-dnevnik.session.v1'

export type StorageMode = 'cloud' | 'local'

export interface LoadResult {
  db: DB
  mode: StorageMode
  /** true, ако данните са генерирани наново (празна база) */
  seeded: boolean
  warning?: string
}

/** Всички колекции от модела (без `school`, което е единичен обект). */
const COLLECTIONS = [
  'users', 'subjects', 'classes', 'students', 'grades', 'absences', 'notes',
  'schedule', 'homework', 'exams', 'messages', 'tests', 'materials', 'tasks',
  'events', 'meetings', 'activities', 'themePlans', 'fees', 'rooms',
  'competitions', 'portfolios', 'studentProfiles', 'attestations',
  'lessonAbsences', 'docs', 'virtualRooms', 'ifoDiaries', 'syncLogs', 'audit',
  // раздели в „Дневник"
  'sanctions', 'classNotes', 'supportPlans', 'vhkLessons', 'classMeetings',
  'correctionalExams', 'equivalenceExams',
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

  for (const [path, raw] of Object.entries(wire)) {
    if (path === 'school') continue
    const coll = path.slice(0, path.indexOf('/'))
    if (!(coll in buckets)) continue
    const item = unpack(raw)
    if (item) buckets[coll].push(item)
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
function diff(next: Wire): Wire | null {
  const prev = lastWire
  if (!prev) return next
  const patch: Wire = {}
  let changed = false
  for (const [k, v] of Object.entries(next)) {
    if (prev[k] !== v) { patch[k] = v; changed = true }
  }
  for (const k of Object.keys(prev)) {
    if (!(k in next)) { (patch as Record<string, string | null>)[k] = null; changed = true }
  }
  return changed ? patch : null
}

/** Праща ключовете на парчета, за да не е един огромен кадър при първоначално качване. */
async function push(wire: Wire, chunkSize = 120): Promise<void> {
  const entries = Object.entries(wire)
  for (let i = 0; i < entries.length; i += chunkSize) {
    const slice = Object.fromEntries(entries.slice(i, i + chunkSize))
    await rtdb.patch(DB_ROOT, slice)
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
  async load(): Promise<LoadResult> {
    try {
      const wire = (await rtdb.get<Wire>(DB_ROOT)) ?? {}

      if (Object.keys(wire).length > 0) {
        const db = fromWire(wire)
        if (isUsable(db)) {
          lastWire = wire
          currentMode = 'cloud'
          // снимка за офлайн работа — най-добро усилие, квотата може да не стигне
          try { localStorage.setItem(KEY_LOCAL, JSON.stringify(db)) } catch { /* ignore */ }
          return { db, mode: 'cloud', seeded: false }
        }
      }

      // Базата е празна (или непълна) → създаваме училището и го качваме.
      const fresh = buildDB()
      lastWire = null
      const res = await this.save(fresh)
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
  async save(db: DB): Promise<{ ok: boolean; warning?: string }> {
    const wire = toWire(db)
    const patch = diff(wire)
    if (!patch) return { ok: true }

    try {
      if (!lastWire) {
        // първоначално качване на цялата база
        await push(wire)
      } else {
        await rtdb.patch(DB_ROOT, patch as Record<string, unknown>)
      }
      lastWire = wire
      currentMode = 'cloud'
      return { ok: true }
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
