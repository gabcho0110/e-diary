/**
 * Firebase — достъп до Realtime Database през REST API.
 *
 * Умишлено без `firebase` SDK:
 *  • дневникът зарежда цялата база в паметта и записва само промените,
 *    което съвпада точно с `PATCH` (multi-path update) на REST API;
 *  • не добавя ~500 KB към bundle-а и не изисква допълнителна зависимост;
 *  • работи с всяка валидна конфигурация, стига `databaseURL` да е верен.
 *
 * ВАЖНО: стойностите по-долу са примерни/публични. Ако базата не отговаря,
 * дневникът стартира с локални данни и показва предупреждение — вижте
 * `storage.load()`.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyAadcNbAJwNjtT9R34X_gwYFvFqOZUu85c',
  authDomain: 'e-diary-2f2cd.firebaseapp.com',
  databaseURL: 'https://e-diary-2f2cd-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'e-diary-2f2cd',
  storageBucket: 'e-diary-2f2cd.firebasestorage.app',
  messagingSenderId: '630236603822',
  appId: '1:630236603822:web:86fda14a50c8b079fc4a5f',
  measurementId: 'G-D2ZBXHTXGF',
}

/** Коренът, под който се пази целият дневник на училището. */
export const SCHOOL_KEY = 'e-dnevnik'
export const DB_ROOT = `schools/${SCHOOL_KEY}`

const BASE = firebaseConfig.databaseURL.replace(/\/+$/, '')

function dbUrl(path: string): string {
  return `${BASE}/${path}.json`
}

async function request<T>(
  path: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<T | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(dbUrl(path), { ...init, signal: ctrl.signal })
    const text = await res.text()
    if (!res.ok) {
      let detail = text.slice(0, 300)
      try {
        const parsed = JSON.parse(text) as { error?: string }
        if (parsed?.error) detail = parsed.error
      } catch {
        /* оставяме суровия текст */
      }
      throw new Error(`${res.status} — ${detail}`)
    }
    return text ? (JSON.parse(text) as T) : null
  } finally {
    clearTimeout(timer)
  }
}

export const rtdb = {
  /** Чете възел. `null` означава, че възелът е празен. */
  get<T>(path: string, timeoutMs = 25000): Promise<T | null> {
    return request<T>(path, undefined, timeoutMs)
  },

  /** Multi-path update — записва само подадените пътища (стойност `null` трие). */
  async patch(path: string, patch: Record<string, unknown>, timeoutMs = 90000): Promise<void> {
    await request<unknown>(
      path,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      },
      timeoutMs,
    )
  },

  /** Пълна замяна на възел. */
  async put(path: string, value: unknown, timeoutMs = 90000): Promise<void> {
    await request<unknown>(
      path,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      },
      timeoutMs,
    )
  },
}

/** Кратка проверка дали базата отговаря (използва се за диагностика). */
export async function probeDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    await rtdb.get<unknown>('', 12000)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
