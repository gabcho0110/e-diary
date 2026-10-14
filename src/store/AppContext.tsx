import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type {
  DB, User, RoleId, Grade, Absence, Message, Task, Material, EventItem,
  Test, Note, MeetingSlot, Fee, Student, Klass, Subject, AuditEntry,
} from '../lib/types'
import { storage, type StorageMode } from '../lib/storage'
import { MODULES, type ModuleDef } from '../lib/modules'
import { isAdmin, isStaff, hasAnyRole, ROLE_MAP } from '../lib/roles'

interface Ctx {
  db: DB
  user: User | null
  mode: StorageMode
  ready: boolean
  warning: string | null
  dismissWarning: () => void

  login: (username: string, password: string) => { ok: boolean; error?: string }
  loginAs: (userId: string) => void
  logout: () => void
  register: (payload: {
    firstName: string; lastName: string; username: string; password: string
    email: string; phone: string; role: RoleId
  }) => { ok: boolean; error?: string }

  resetDemo: () => void
  update: (fn: (db: DB) => void) => void

  // права и филтри
  isAdmin: boolean
  isStaff: boolean
  can: (moduleId: string) => boolean
  myModules: ModuleDef[]
  myClasses: Klass[]
  mySubjects: Subject[]
  myChildren: Student[]
  myStudent: Student | null
  className: (id: string) => string
  subjectName: (id: string) => string
  subjectShort: (id: string) => string
  userName: (id: string) => string
  studentName: (id: string) => string
  studentsOf: (classId: string) => Student[]
  gradesOf: (studentId: string, subjectId?: string) => Grade[]
  average: (studentId: string, subjectId?: string) => number | null
  absencesOf: (studentId: string) => Absence[]
  unexcusedCount: (studentId: string) => number

  // действия
  addGrades: (g: Omit<Grade, 'id' | 'createdAt'>[]) => void
  updateGrade: (id: string, patch: Partial<Grade>) => void
  deleteGrade: (id: string) => void
  addAbsences: (a: Omit<Absence, 'id' | 'createdAt'>[]) => void
  setAbsenceReason: (id: string, reason: Absence['reason'], excused: boolean) => void
  deleteAbsence: (id: string) => void
  addNote: (n: Omit<Note, 'id'>) => void
  deleteNote: (id: string) => void
  sendMessage: (m: Omit<Message, 'id' | 'date' | 'readBy' | 'archived' | 'folder'>) => void
  markRead: (id: string) => void
  archiveMessage: (id: string, archived: boolean) => void
  deleteMessage: (id: string) => void
  addTask: (t: Omit<Task, 'id' | 'createdAt' | 'status'>) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  addMaterial: (m: Omit<Material, 'id' | 'date' | 'likes'>) => void
  likeMaterial: (id: string) => void
  deleteMaterial: (id: string) => void
  addTest: (t: Omit<Test, 'id' | 'createdAt' | 'attempts'>) => void
  deleteTest: (id: string) => void
  addEvent: (e: Omit<EventItem, 'id' | 'createdById'>) => void
  bookMeeting: (id: string, parentId: string, topic: string) => void
  cancelMeeting: (id: string) => void
  addStudent: (s: Omit<Student, 'id' | 'parentIds'>) => void
  updateStudent: (id: string, patch: Partial<Student>) => void
  addUser: (u: Omit<User, 'id' | 'createdAt' | 'active'>) => void
  updateUser: (id: string, patch: Partial<User>) => void
  updateFee: (id: string, patch: Partial<Fee>) => void
  log: (action: string, target: string) => void
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB | null>(null)
  const [mode, setMode] = useState<StorageMode>('local')
  const [user, setUser] = useState<User | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const saveTimer = useRef<number | null>(null)

  // ── първоначално зареждане ────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    storage.load().then((res) => {
      if (!alive) return
      setDb(res.db)
      setMode(res.mode)
      if (res.warning) setWarning(res.warning)
      const sid = storage.session.get()
      if (sid) {
        const u = res.db.users.find((x) => x.id === sid)
        if (u) setUser(u)
      }
    })
    return () => {
      alive = false
    }
  }, [])

  // ── запазване (с отлагане) ───────────────────────────────────────────────
  const persist = useCallback((next: DB) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      void storage.save(next).then((r) => {
        if (!r.ok && r.warning) setWarning(r.warning)
        setMode(storage.mode())
      })
    }, 500)
  }, [])

  const update = useCallback(
    (fn: (d: DB) => void) => {
      setDb((prev) => {
        if (!prev) return prev
        const next: DB = JSON.parse(JSON.stringify(prev))
        fn(next)
        persist(next)
        return next
      })
    },
    [persist],
  )

  const log = useCallback(
    (action: string, target: string) => {
      if (!user) return
      update((d) => {
        const entry: AuditEntry = {
          id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          userId: user.id, action, target, date: new Date().toISOString(),
        }
        d.audit = [entry, ...d.audit].slice(0, 500)
      })
    },
    [update, user],
  )

  // ── автентикация ─────────────────────────────────────────────────────────
  const login = useCallback(
    (username: string, password: string) => {
      if (!db) return { ok: false, error: 'Данните още се зареждат.' }
      const u = db.users.find(
        (x) => x.username.toLowerCase() === username.trim().toLowerCase() && x.password === password,
      )
      if (!u) return { ok: false, error: 'Грешно потребителско име или парола.' }
      if (!u.active) return { ok: false, error: 'Профилът е деактивиран. Обърнете се към администратора.' }
      setUser(u)
      storage.session.set(u.id)
      return { ok: true }
    },
    [db],
  )

  const loginAs = useCallback(
    (userId: string) => {
      const u = db?.users.find((x) => x.id === userId)
      if (u) {
        setUser(u)
        storage.session.set(u.id)
      }
    },
    [db],
  )

  const logout = useCallback(() => {
    setUser(null)
    storage.session.clear()
  }, [])

  const register = useCallback(
    (p: { firstName: string; lastName: string; username: string; password: string; email: string; phone: string; role: RoleId }) => {
      if (!db) return { ok: false, error: 'Данните още се зареждат.' }
      if (db.users.some((u) => u.username.toLowerCase() === p.username.toLowerCase()))
        return { ok: false, error: 'Това потребителско име вече е заето.' }
      if (db.users.some((u) => u.email.toLowerCase() === p.email.toLowerCase()))
        return { ok: false, error: 'Този имейл вече е регистриран.' }
      const nu: User = {
        id: `usr_${Date.now()}`, username: p.username, password: p.password,
        firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone,
        roles: [p.role], active: true, createdAt: new Date().toISOString().slice(0, 10),
      }
      update((d) => { d.users.push(nu) })
      setUser(nu)
      storage.session.set(nu.id)
      return { ok: true }
    },
    [db, update],
  )

  const resetDemo = useCallback(() => {
    void storage.reset().then((fresh) => {
      setDb(fresh)
      setUser(null)
      setWarning(null)
      setMode(storage.mode())
    })
  }, [])

  // ── производни стойности и права ─────────────────────────────────────────
  const value = useMemo<Ctx | null>(() => {
    if (!db) return null
    const roles = user?.roles ?? []
    const adm = isAdmin(roles)
    const stf = isStaff(roles)

    const can = (moduleId: string) => {
      const m = MODULES.find((x) => x.id === moduleId)
      if (!m) return false
      if (!user) return false
      return m.roles.some((r) => roles.includes(r))
    }

    const myModules = user ? MODULES.filter((m) => m.roles.some((r) => roles.includes(r))) : []

    const myClasses: Klass[] = !user
      ? []
      : adm
        ? db.classes
        : user.roles.includes('parent') || user.roles.includes('student')
          ? db.classes.filter((c) => {
              const sids = user.childrenIds ?? (user.studentId ? [user.studentId] : [])
              return sids.some((sid) => c.studentIds.includes(sid))
            })
          : db.classes.filter((c) => (user.classIds ?? []).includes(c.id) || c.homeroomTeacherId === user.id)

    const mySubjects: Subject[] = !user
      ? []
      : adm
        ? db.subjects
        : db.subjects.filter((s) => (user.subjectIds ?? []).includes(s.id))

    const myChildren: Student[] = !user
      ? []
      : (user.childrenIds ?? (user.studentId ? [user.studentId] : []))
          .map((id) => db.students.find((s) => s.id === id))
          .filter(Boolean) as Student[]

    const myStudent: Student | null = user?.studentId
      ? db.students.find((s) => s.id === user.studentId) ?? null
      : null

    const className = (id: string) => db.classes.find((c) => c.id === id)?.name ?? '—'
    const subjectName = (id: string) => db.subjects.find((s) => s.id === id)?.name ?? '—'
    const subjectShort = (id: string) => db.subjects.find((s) => s.id === id)?.short ?? '—'
    const userName = (id: string) => {
      const u = db.users.find((x) => x.id === id)
      return u ? `${u.firstName} ${u.lastName}` : '—'
    }
    const studentName = (id: string) => {
      const s = db.students.find((x) => x.id === id)
      return s ? `${s.firstName} ${s.lastName}` : '—'
    }
    const studentsOf = (classId: string) =>
      db.students
        .filter((s) => s.classId === classId && s.status === 'активен')
        .sort((a, b) => a.number - b.number)

    const gradesOf = (studentId: string, subjectId?: string) =>
      db.grades
        .filter((g) => g.studentId === studentId && (!subjectId || g.subjectId === subjectId))
        .sort((a, b) => a.date.localeCompare(b.date))

    const average = (studentId: string, subjectId?: string) => {
      const gs = gradesOf(studentId, subjectId).filter(
        (g) => !g.draft && !['Входно ниво', 'Междинно ниво', 'Изходно ниво'].includes(g.type),
      )
      if (!gs.length) return null
      return gs.reduce((a, g) => a + g.value, 0) / gs.length
    }

    const absencesOf = (studentId: string) =>
      db.absences.filter((a) => a.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date))

    const unexcusedCount = (studentId: string) =>
      db.absences.filter((a) => a.studentId === studentId && !a.excused).length

    return {
      db, user, mode, ready: true, warning,
      dismissWarning: () => setWarning(null),
      login, loginAs, logout, register, resetDemo, update,
      isAdmin: adm, isStaff: stf, can, myModules, myClasses, mySubjects,
      myChildren, myStudent, className, subjectName, subjectShort, userName,
      studentName, studentsOf, gradesOf, average, absencesOf, unexcusedCount,

      addGrades: (gs) =>
        update((d) => {
          gs.forEach((g) =>
            d.grades.push({
              ...g,
              id: `grd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              createdAt: new Date().toISOString().slice(0, 10),
            }),
          )
        }),
      updateGrade: (id, patch) => update((d) => {
        const i = d.grades.findIndex((g) => g.id === id)
        if (i >= 0) d.grades[i] = { ...d.grades[i], ...patch }
      }),
      deleteGrade: (id) => update((d) => { d.grades = d.grades.filter((g) => g.id !== id) }),

      addAbsences: (as) =>
        update((d) => {
          as.forEach((a) =>
            d.absences.push({
              ...a,
              id: `abs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              createdAt: new Date().toISOString().slice(0, 10),
            }),
          )
        }),
      setAbsenceReason: (id, reason, excused) =>
        update((d) => {
          const i = d.absences.findIndex((a) => a.id === id)
          if (i >= 0) d.absences[i] = { ...d.absences[i], reason, excused }
        }),
      deleteAbsence: (id) => update((d) => { d.absences = d.absences.filter((a) => a.id !== id) }),

      addNote: (n) => update((d) => { d.notes.unshift({ ...n, id: `nte_${Date.now()}` }) }),
      deleteNote: (id) => update((d) => { d.notes = d.notes.filter((n) => n.id !== id) }),

      sendMessage: (m) =>
        update((d) => {
          d.messages.unshift({
            ...m,
            id: `msg_${Date.now()}`,
            date: new Date().toISOString().slice(0, 10),
            readBy: [],
            archived: false,
            folder: 'sent',
          })
        }),
      markRead: (id) =>
        update((d) => {
          const i = d.messages.findIndex((m) => m.id === id)
          if (i >= 0 && user && !d.messages[i].readBy.includes(user.id))
            d.messages[i].readBy.push(user.id)
        }),
      archiveMessage: (id, archived) =>
        update((d) => {
          const i = d.messages.findIndex((m) => m.id === id)
          if (i >= 0) {
            d.messages[i].archived = archived
            d.messages[i].folder = archived ? 'archive' : 'inbox'
          }
        }),
      deleteMessage: (id) => update((d) => { d.messages = d.messages.filter((m) => m.id !== id) }),

      addTask: (t) =>
        update((d) => {
          d.tasks.unshift({
            ...t, id: `tsk_${Date.now()}`, status: 'нова',
            createdAt: new Date().toISOString().slice(0, 10),
          })
        }),
      updateTask: (id, patch) =>
        update((d) => {
          const i = d.tasks.findIndex((t) => t.id === id)
          if (i >= 0) d.tasks[i] = { ...d.tasks[i], ...patch }
        }),

      addMaterial: (m) =>
        update((d) => {
          d.materials.unshift({ ...m, id: `mat_${Date.now()}`, date: new Date().toISOString().slice(0, 10), likes: 0 })
        }),
      likeMaterial: (id) =>
        update((d) => {
          const i = d.materials.findIndex((m) => m.id === id)
          if (i >= 0) d.materials[i].likes += 1
        }),
      deleteMaterial: (id) => update((d) => { d.materials = d.materials.filter((m) => m.id !== id) }),

      addTest: (t) =>
        update((d) => {
          d.tests.unshift({ ...t, id: `tst_${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10), attempts: [] })
        }),
      deleteTest: (id) => update((d) => { d.tests = d.tests.filter((t) => t.id !== id) }),

      addEvent: (e) =>
        update((d) => {
          d.events.unshift({ ...e, id: `evt_${Date.now()}`, createdById: user?.id ?? '' })
        }),
      bookMeeting: (id, parentId, topic) =>
        update((d) => {
          const i = d.meetings.findIndex((m) => m.id === id)
          if (i >= 0) d.meetings[i] = { ...d.meetings[i], parentId, topic, status: 'зает' }
        }),
      cancelMeeting: (id) =>
        update((d) => {
          const i = d.meetings.findIndex((m) => m.id === id)
          if (i >= 0) d.meetings[i] = { ...d.meetings[i], parentId: null, topic: undefined, status: 'свободен' }
        }),

      addStudent: (s) =>
        update((d) => {
          const ns: Student = { ...s, id: `std_${Date.now()}`, parentIds: [] }
          d.students.push(ns)
          const k = d.classes.find((c) => c.id === s.classId)
          if (k) k.studentIds.push(ns.id)
        }),
      updateStudent: (id, patch) =>
        update((d) => {
          const i = d.students.findIndex((s) => s.id === id)
          if (i >= 0) d.students[i] = { ...d.students[i], ...patch }
        }),
      addUser: (u) =>
        update((d) => {
          d.users.push({
            ...u, id: `usr_${Date.now()}`, active: true,
            createdAt: new Date().toISOString().slice(0, 10),
          })
        }),
      updateUser: (id, patch) =>
        update((d) => {
          const i = d.users.findIndex((u) => u.id === id)
          if (i >= 0) d.users[i] = { ...d.users[i], ...patch }
        }),
      updateFee: (id, patch) =>
        update((d) => {
          const i = d.fees.findIndex((f) => f.id === id)
          if (i >= 0) {
            const merged = { ...d.fees[i], ...patch }
            merged.status = merged.paid >= merged.amount ? 'платена' : merged.paid > 0 ? 'частична' : 'неплатена'
            d.fees[i] = merged
          }
        }),
      log,
    }
  }, [db, user, mode, warning, login, loginAs, logout, register, resetDemo, update, log])

  if (!value) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="text-sm text-ink-500">Зареждане на училищните данни…</p>
        </div>
      </div>
    )
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

export { hasAnyRole, ROLE_MAP }
