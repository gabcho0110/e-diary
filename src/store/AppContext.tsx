import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type {
  DB, User, RoleId, Grade, Absence, Message, Task, Material, EventItem,
  Test, Note, MeetingSlot, Fee, Student, Klass, Subject, AuditEntry, Exam,
  Sanction, ClassNote, SupportPlan, VhkLesson, ClassMeeting,
  CorrectionalExam, EquivalenceExam, AbsenceNote, DeleteRequest, Norm,
  NormResult, TrainingPlan, ThemePlan, ScheduleEntry, AnnualResults,
  NvoResult, DziResult,
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
  /** групово уважаване — действието „Уважи" от лентата на раздел Отсъствия */
  excuseAbsences: (ids: string[], reason: Absence['reason'], note?: string) => void
  addNote: (n: Omit<Note, 'id'>) => void
  deleteNote: (id: string) => void
  addExam: (e: Omit<Exam, 'id'>) => void
  deleteExam: (id: string) => void
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

  // ── раздели в модул „Дневник" ────────────────────────────────────────────
  addSanctions: (s: Omit<Sanction, 'id'>[]) => void
  deleteSanction: (id: string) => void
  addClassNote: (n: Omit<ClassNote, 'id' | 'createdAt'>) => void
  updateClassNote: (id: string, patch: Partial<ClassNote>) => void
  deleteClassNote: (id: string) => void
  addSupportPlan: (s: Omit<SupportPlan, 'id'>) => void
  deleteSupportPlan: (id: string) => void
  addVhkLesson: (v: Omit<VhkLesson, 'id'>) => void
  deleteVhkLesson: (id: string) => void
  addClassMeeting: (m: Omit<ClassMeeting, 'id' | 'createdAt' | 'authorId'>) => void
  deleteClassMeeting: (id: string) => void
  /** поправителен изпит — създава се при първо въведена оценка */
  setCorrectionalExam: (
    classId: string, studentId: string, subjectId: string, patch: Partial<CorrectionalExam>,
  ) => void
  /** приравнителен изпит — `grade === null` изтрива записа */
  setEquivalenceExam: (
    classId: string, studentId: string, subjectId: string, year: string, grade: number | null,
  ) => void

  // ── права в дневника ─────────────────────────────────────────────────────
  /** класен ръководител на паралелката */
  isHomeroom: (classId: string) => boolean
  /** учител, който преподава в паралелката */
  teachesIn: (classId: string) => boolean
  /**
   * Учителят може да трие само свои записи; класният ръководител и
   * администраторът — всички. Точно както е описано в помощния център.
   */
  canDeleteAuthored: (authorId: string, classId?: string) => boolean

  // ── отсъствия и извинителни бележки ──────────────────────────────────────
  addAbsenceNotes: (n: Omit<AbsenceNote, 'id' | 'createdAt'>[]) => void
  updateAbsenceNote: (id: string, patch: Partial<AbsenceNote>) => void
  deleteAbsenceNote: (id: string) => void
  /** уважава всички неуважени отсъствия на ученик в периода на бележката */
  applyAbsenceNote: (noteId: string) => number
  /** „Уважи всички неуважени" — връща колко са уважени */
  excuseAllUnexcused: (classId: string, reason: Absence['reason'], note?: string) => number
  /** меко изтриване — записът остава видим през филтър „Изтрити" */
  softDeleteAbsence: (id: string, reason?: string) => void
  restoreAbsence: (id: string) => void

  // ── оценки ───────────────────────────────────────────────────────────────
  softDeleteGrade: (id: string, reason?: string) => void
  restoreGrade: (id: string) => void
  setGradeExemption: (studentId: string, subjectId: string, term: 1 | 2, on: boolean) => void
  updateNote: (id: string, patch: Partial<Note>) => void

  // ── заявки за изтриване („стриктен режим") ───────────────────────────────
  addDeleteRequest: (r: Omit<DeleteRequest, 'id' | 'createdAt' | 'status'>) => void
  decideDeleteRequest: (id: string, approve: boolean) => void

  // ── теми ─────────────────────────────────────────────────────────────────
  updateThemeRows: (planId: string, rows: ThemePlan['rows']) => void
  setThemeTaken: (planId: string, no: number, taken: boolean, when?: string) => void

  // ── разписание ───────────────────────────────────────────────────────────
  updateScheduleEntry: (id: string, patch: Partial<ScheduleEntry>) => void
  addScheduleEntries: (e: Omit<ScheduleEntry, 'id'>[]) => void
  /** изтрива разписанието за период; връща броя засегнати часа */
  deleteScheduleRange: (classId: string, from: string, to: string) => number
  /** копира разписанието на един период върху друг */
  duplicateSchedule: (classId: string, from: string, to: string) => number

  updateExam: (id: string, patch: Partial<Exam>) => void

  // ── ученици ──────────────────────────────────────────────────────────────
  /** преномерира класа по подадения ред (или по азбучен ред) */
  renumberStudents: (classId: string, orderedIds: string[]) => void
  setAnnualResults: (studentId: string, patch: Partial<AnnualResults>) => void
  addNvoResult: (studentId: string, r: Omit<NvoResult, 'id'>) => void
  deleteNvoResult: (studentId: string, id: string) => void
  addDziResult: (studentId: string, r: Omit<DziResult, 'id'>) => void
  deleteDziResult: (studentId: string, id: string) => void
  /** преместване: в друга паралелка, в друго училище или отписване */
  moveStudent: (
    studentId: string,
    kind: 'паралелка' | 'училище' | 'отписан',
    targetClassId?: string,
    note?: string,
  ) => void
  restoreStudent: (studentId: string) => void
  /** заличава ученика само от тази паралелка (само администратор) */
  purgeStudent: (studentId: string) => void
  /** какво ще се изтрие, ако ученикът се заличи — показва се преди потвърждение */
  purgeImpact: (studentId: string) => Record<string, number>
  addParent: (
    studentId: string,
    p: { firstName: string; lastName: string; phone: string; email: string; relation: string },
  ) => void
  setDoctor: (studentId: string, name: string, phone: string) => void
  updateStudentDocs: (studentId: string, patch: Record<string, string>) => void

  // ── нормативи и тренировъчен план ────────────────────────────────────────
  addNorm: (n: Omit<Norm, 'id'>) => void
  deleteNorm: (id: string) => void
  addNormResults: (r: Omit<NormResult, 'id'>[]) => void
  deleteNormResult: (id: string) => void
  saveTrainingPlan: (
    p: Omit<TrainingPlan, 'id' | 'updatedAt' | 'authorId'> & { id?: string },
  ) => void
  deleteTrainingPlan: (id: string) => void

  // ── ВЧК / родителски срещи / подкрепа ────────────────────────────────────
  updateVhkLesson: (id: string, patch: Partial<VhkLesson>) => void
  updateClassMeeting: (id: string, patch: Partial<ClassMeeting>) => void
  updateSupportPlan: (id: string, patch: Partial<SupportPlan>) => void
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
      excuseAbsences: (ids, reason, note) =>
        update((d) => {
          const set = new Set(ids)
          d.absences = d.absences.map((a) =>
            set.has(a.id)
              ? {
                  ...a,
                  reason,
                  excused: reason !== 'неизвинено' && reason !== 'закъснение',
                  excuseReason: reason === 'извинено' ? 'Извинено' : reason === 'семейни причини' ? 'Семейни причини' : a.excuseReason,
                  note: note ?? a.note,
                }
              : a,
          )
        }),

      addNote: (n) => update((d) => { d.notes.unshift({ ...n, id: `nte_${Date.now()}` }) }),
      deleteNote: (id) => update((d) => { d.notes = d.notes.filter((n) => n.id !== id) }),
      addExam: (e) => update((d) => { d.exams.unshift({ ...e, id: `exm_${Date.now()}` }) }),
      deleteExam: (id) => update((d) => { d.exams = d.exams.filter((e) => e.id !== id) }),

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

      // ── раздели в модул „Дневник" ──────────────────────────────────────────
      addSanctions: (items) =>
        update((d) => {
          items.forEach((s, i) =>
            d.sanctions.unshift({ ...s, id: `snc_${Date.now()}_${i}` }),
          )
        }),
      deleteSanction: (id) => update((d) => { d.sanctions = d.sanctions.filter((s) => s.id !== id) }),

      addClassNote: (n) =>
        update((d) => {
          d.classNotes.unshift({
            ...n,
            id: `cbn_${Date.now()}`,
            createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          })
        }),
      updateClassNote: (id, patch) =>
        update((d) => {
          const i = d.classNotes.findIndex((n) => n.id === id)
          if (i >= 0) d.classNotes[i] = { ...d.classNotes[i], ...patch, editedById: user?.id }
        }),
      deleteClassNote: (id) => update((d) => { d.classNotes = d.classNotes.filter((n) => n.id !== id) }),

      addSupportPlan: (s) =>
        update((d) => { d.supportPlans.unshift({ ...s, id: `sup_${Date.now()}` }) }),
      deleteSupportPlan: (id) =>
        update((d) => { d.supportPlans = d.supportPlans.filter((s) => s.id !== id) }),

      addVhkLesson: (v) =>
        update((d) => { d.vhkLessons.unshift({ ...v, id: `vhk_${Date.now()}` }) }),
      deleteVhkLesson: (id) =>
        update((d) => { d.vhkLessons = d.vhkLessons.filter((v) => v.id !== id) }),

      addClassMeeting: (m) =>
        update((d) => {
          d.classMeetings.unshift({
            ...m,
            id: `mtg_${Date.now()}`,
            authorId: user?.id ?? '',
            createdAt: new Date().toISOString().slice(0, 10),
          })
        }),
      deleteClassMeeting: (id) =>
        update((d) => { d.classMeetings = d.classMeetings.filter((m) => m.id !== id) }),

      setCorrectionalExam: (classId, studentId, subjectId, patch) =>
        update((d) => {
          const i = d.correctionalExams.findIndex(
            (c) => c.studentId === studentId && c.subjectId === subjectId,
          )
          if (i >= 0) {
            d.correctionalExams[i] = { ...d.correctionalExams[i], ...patch }
            const row = d.correctionalExams[i]
            if (!row.session1 && !row.session2 && !row.sessionExtra)
              d.correctionalExams.splice(i, 1)
          } else {
            d.correctionalExams.push({ id: `cor_${Date.now()}`, classId, studentId, subjectId, ...patch })
          }
        }),
      setEquivalenceExam: (classId, studentId, subjectId, year, grade) =>
        update((d) => {
          const i = d.equivalenceExams.findIndex(
            (e) => e.studentId === studentId && e.subjectId === subjectId && e.year === year,
          )
          if (grade === null) {
            if (i >= 0) d.equivalenceExams.splice(i, 1)
            return
          }
          if (i >= 0) d.equivalenceExams[i] = { ...d.equivalenceExams[i], grade }
          else d.equivalenceExams.push({ id: `eqv_${Date.now()}`, classId, studentId, subjectId, year, grade })
        }),

      // ── права в дневника ─────────────────────────────────────────────────
      // Помощният център е категоричен: учителят пипа само своите записи,
      // класният ръководител и администраторът — всички.
      isHomeroom: (classId) => {
        if (!user) return false
        if (adm) return true
        const k = db.classes.find((c) => c.id === classId)
        return !!k && k.homeroomTeacherId === user.id
      },
      teachesIn: (classId) => {
        if (!user) return false
        if (adm) return true
        return (user.classIds ?? []).includes(classId)
      },
      canDeleteAuthored: (authorId, classId) => {
        if (!user) return false
        if (adm) return true
        if (classId && db.classes.find((c) => c.id === classId)?.homeroomTeacherId === user.id) return true
        return authorId === user.id
      },

      // ── отсъствия и извинителни бележки ──────────────────────────────────
      addAbsenceNotes: (items) =>
        update((d) => {
          items.forEach((n, i) =>
            d.absenceNotes.unshift({
              ...n,
              id: `abn_${Date.now()}_${i}`,
              createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            }),
          )
        }),
      updateAbsenceNote: (id, patch) =>
        update((d) => {
          const i = d.absenceNotes.findIndex((n) => n.id === id)
          if (i >= 0) d.absenceNotes[i] = { ...d.absenceNotes[i], ...patch }
        }),
      deleteAbsenceNote: (id) =>
        update((d) => { d.absenceNotes = d.absenceNotes.filter((n) => n.id !== id) }),

      applyAbsenceNote: (noteId) => {
        const note = db.absenceNotes.find((n) => n.id === noteId)
        if (!note) return 0
        const targets = db.absences.filter(
          (a) =>
            a.studentId === note.studentId &&
            a.date >= note.from &&
            a.date <= note.to &&
            !a.excused &&
            !a.deletedAt,
        )
        if (!targets.length) return 0
        const ids = new Set(targets.map((a) => a.id))
        const reason: Absence['reason'] = note.kind === 'медицинска' ? 'извинено' : 'семейни причини'
        const label = note.kind === 'медицинска' ? 'Извинено (медицинска бележка)' : 'Семейни причини'
        update((d) => {
          d.absences = d.absences.map((a) =>
            ids.has(a.id)
              ? { ...a, excused: true, reason, excuseReason: label, noteId: note.id, note: note.number ?? a.note }
              : a,
          )
          const i = d.absenceNotes.findIndex((n) => n.id === note.id)
          if (i >= 0) d.absenceNotes[i] = { ...d.absenceNotes[i], applied: true, unexcusedCount: 0 }
        })
        return targets.length
      },

      excuseAllUnexcused: (classId, reason, note) => {
        const targets = db.absences.filter(
          (a) => a.classId === classId && !a.excused && a.reason !== 'закъснение' && !a.deletedAt,
        )
        if (!targets.length) return 0
        const ids = new Set(targets.map((a) => a.id))
        update((d) => {
          d.absences = d.absences.map((a) =>
            ids.has(a.id)
              ? { ...a, excused: true, reason, excuseReason: reason === 'семейни причини' ? 'Семейни причини' : 'Извинено', note: note ?? a.note }
              : a,
          )
        })
        return targets.length
      },

      softDeleteAbsence: (id, reason) =>
        update((d) => {
          const i = d.absences.findIndex((a) => a.id === id)
          if (i < 0) return
          d.absences[i] = {
            ...d.absences[i],
            deletedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            deletedById: user?.id ?? '',
            note: reason ?? d.absences[i].note,
          }
        }),
      restoreAbsence: (id) =>
        update((d) => {
          const i = d.absences.findIndex((a) => a.id === id)
          if (i < 0) return
          const { deletedAt: _d, deletedById: _b, ...rest } = d.absences[i]
          d.absences[i] = rest as typeof d.absences[number]
        }),

      // ── оценки ───────────────────────────────────────────────────────────
      softDeleteGrade: (id, reason) =>
        update((d) => {
          const i = d.grades.findIndex((g) => g.id === id)
          if (i < 0) return
          d.grades[i] = {
            ...d.grades[i],
            deletedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            deletedById: user?.id ?? '',
            deleteReason: reason,
          }
        }),
      restoreGrade: (id) =>
        update((d) => {
          const i = d.grades.findIndex((g) => g.id === id)
          if (i < 0) return
          const { deletedAt: _d, deletedById: _b, deleteReason: _r, ...rest } = d.grades[i]
          d.grades[i] = rest as typeof d.grades[number]
        }),
      setGradeExemption: (studentId, subjectId, term, on) =>
        update((d) => {
          const i = d.gradeExemptions.findIndex(
            (e) => e.studentId === studentId && e.subjectId === subjectId && e.term === term,
          )
          if (on && i < 0) {
            d.gradeExemptions.push({
              id: `gex_${Date.now()}`, studentId, subjectId, term,
              authorId: user?.id ?? '', date: new Date().toISOString().slice(0, 10),
            })
          } else if (!on && i >= 0) {
            d.gradeExemptions.splice(i, 1)
          }
        }),
      updateNote: (id, patch) =>
        update((d) => {
          const i = d.notes.findIndex((n) => n.id === id)
          if (i >= 0) d.notes[i] = { ...d.notes[i], ...patch }
        }),

      // ── заявки за изтриване („стриктен режим") ───────────────────────────
      addDeleteRequest: (r) =>
        update((d) => {
          d.deleteRequests.unshift({
            ...r,
            id: `dlr_${Date.now()}`,
            createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            status: 'чакаща',
          })
        }),
      decideDeleteRequest: (id, approve) =>
        update((d) => {
          const i = d.deleteRequests.findIndex((r) => r.id === id)
          if (i < 0) return
          const req = d.deleteRequests[i]
          d.deleteRequests[i] = { ...req, status: approve ? 'одобрена' : 'отхвърлена', decidedById: user?.id }
          if (!approve) return
          // одобрена заявка → записът най-после се изтрива
          if (req.kind === 'оценка') d.grades = d.grades.filter((g) => g.id !== req.entityId)
          if (req.kind === 'отсъствие') d.absences = d.absences.filter((a) => a.id !== req.entityId)
          if (req.kind === 'отзив') d.notes = d.notes.filter((n) => n.id !== req.entityId)
        }),

      // ── теми ─────────────────────────────────────────────────────────────
      updateThemeRows: (planId, rows) =>
        update((d) => {
          const i = d.themePlans.findIndex((p) => p.id === planId)
          if (i >= 0) d.themePlans[i] = { ...d.themePlans[i], rows }
        }),
      setThemeTaken: (planId, no, taken, when) =>
        update((d) => {
          const p = d.themePlans.find((x) => x.id === planId)
          if (!p) return
          const row = p.rows.find((r) => r.no === no)
          if (!row) return
          row.taken = taken
          row.date = taken ? when : undefined
        }),

      // ── разписание ───────────────────────────────────────────────────────
      updateScheduleEntry: (id, patch) =>
        update((d) => {
          const i = d.schedule.findIndex((s) => s.id === id)
          if (i >= 0) d.schedule[i] = { ...d.schedule[i], ...patch }
        }),
      addScheduleEntries: (items) =>
        update((d) => {
          items.forEach((e, i) => d.schedule.push({ ...e, id: `sch_${Date.now()}_${i}` }))
        }),
      deleteScheduleRange: (classId, from, to) => {
        const doomed = db.schedule.filter(
          (s) => s.classId === classId && (!s.validFrom || (s.validFrom <= to && (s.validTo ?? s.validFrom) >= from)),
        )
        if (!doomed.length) return 0
        const ids = new Set(doomed.map((s) => s.id))
        update((d) => {
          d.schedule = d.schedule.filter((s) => !ids.has(s.id))
          // изтриването на часове отнася и въведените в тях отсъствия
          d.absences = d.absences.filter(
            (a) => !(a.classId === classId && a.date >= from && a.date <= to && !a.wholeDay),
          )
        })
        return doomed.length
      },
      duplicateSchedule: (classId, from, to) => {
        const source = db.schedule.filter((s) => s.classId === classId)
        if (!source.length) return 0
        update((d) => {
          const fresh = source.map((s, i) => ({
            ...s,
            id: `sch_dup_${Date.now()}_${i}`,
            validFrom: from,
            validTo: to,
          }))
          d.schedule.push(...fresh)
        })
        return source.length
      },

      updateExam: (id, patch) =>
        update((d) => {
          const i = d.exams.findIndex((e) => e.id === id)
          if (i >= 0) d.exams[i] = { ...d.exams[i], ...patch }
        }),

      // ── ученици ──────────────────────────────────────────────────────────
      renumberStudents: (classId, orderedIds) =>
        update((d) => {
          orderedIds.forEach((sid, i) => {
            const st = d.students.find((s) => s.id === sid)
            if (st && st.classId === classId) st.number = i + 1
          })
        }),
      setAnnualResults: (studentId, patch) =>
        update((d) => {
          const st = d.students.find((s) => s.id === studentId)
          if (st) st.annualResults = { ...(st.annualResults ?? {}), ...patch }
        }),
      addNvoResult: (studentId, r) =>
        update((d) => {
          const st = d.students.find((s) => s.id === studentId)
          if (!st) return
          st.nvoResults = [...(st.nvoResults ?? []), { ...r, id: `nvo_${Date.now()}` }]
        }),
      deleteNvoResult: (studentId, id) =>
        update((d) => {
          const st = d.students.find((s) => s.id === studentId)
          if (st) st.nvoResults = (st.nvoResults ?? []).filter((r) => r.id !== id)
        }),
      addDziResult: (studentId, r) =>
        update((d) => {
          const st = d.students.find((s) => s.id === studentId)
          if (!st) return
          st.dziResults = [...(st.dziResults ?? []), { ...r, id: `dzi_${Date.now()}` }]
        }),
      deleteDziResult: (studentId, id) =>
        update((d) => {
          const st = d.students.find((s) => s.id === studentId)
          if (st) st.dziResults = (st.dziResults ?? []).filter((r) => r.id !== id)
        }),

      moveStudent: (studentId, kind, targetClassId, note) =>
        update((d) => {
          const st = d.students.find((s) => s.id === studentId)
          if (!st) return
          const oldClass = d.classes.find((c) => c.id === st.classId)
          if (kind === 'отписан') {
            st.status = 'отписан'
            if (note) st.senNote = note
            return
          }
          if (kind === 'училище') {
            st.status = 'преместен'
            if (note) st.senNote = note
            return
          }
          if (!targetClassId || targetClassId === st.classId) return
          // преместване в друга паралелка — реквизитите се пренасят ръчно
          st.status = 'преместен'
          const target = d.classes.find((c) => c.id === targetClassId)
          if (!target) return
          const moved: Student = { ...st, classId: target.id, number: target.studentIds.length + 1, status: 'активен' }
          d.students[d.students.findIndex((s) => s.id === studentId)] = moved
          target.studentIds.push(st.id)
          if (oldClass) oldClass.studentIds = oldClass.studentIds.filter((x) => x !== st.id)
        }),
      restoreStudent: (studentId) =>
        update((d) => {
          const st = d.students.find((s) => s.id === studentId)
          if (!st) return
          st.status = 'активен'
          const k = d.classes.find((c) => c.id === st.classId)
          if (k && !k.studentIds.includes(st.id)) k.studentIds.push(st.id)
        }),
      purgeStudent: (studentId) =>
        update((d) => {
          const st = d.students.find((s) => s.id === studentId)
          if (!st) return
          const cid = st.classId
          // заличава само от тази паралелка — реквизитите остават по другите
          d.students = d.students.filter((s) => s.id !== studentId)
          const k = d.classes.find((c) => c.id === cid)
          if (k) k.studentIds = k.studentIds.filter((x) => x !== studentId)
          d.grades = d.grades.filter((g) => g.studentId !== studentId)
          d.absences = d.absences.filter((a) => a.studentId !== studentId)
          d.notes = d.notes.filter((n) => n.studentId !== studentId)
          d.classNotes = d.classNotes.filter((n) => n.studentId !== studentId)
          d.supportPlans = d.supportPlans.filter((s) => s.studentId !== studentId)
          d.sanctions = d.sanctions.filter((s) => s.studentId !== studentId)
          d.absenceNotes = d.absenceNotes.filter((n) => n.studentId !== studentId)
          d.gradeExemptions = d.gradeExemptions.filter((e) => e.studentId !== studentId)
          d.correctionalExams = d.correctionalExams.filter((e) => e.studentId !== studentId)
          d.equivalenceExams = d.equivalenceExams.filter((e) => e.studentId !== studentId)
        }),
      purgeImpact: (studentId) => ({
        'Оценки': db.grades.filter((g) => g.studentId === studentId).length,
        'Отсъствия': db.absences.filter((a) => a.studentId === studentId).length,
        'Отзиви': db.notes.filter((n) => n.studentId === studentId).length,
        'Бележки': db.classNotes.filter((n) => n.studentId === studentId).length,
        'Подкрепа': db.supportPlans.filter((s) => s.studentId === studentId).length,
        'Санкции': db.sanctions.filter((s) => s.studentId === studentId).length,
        'Извинителни бележки': db.absenceNotes.filter((n) => n.studentId === studentId).length,
      }),
      addParent: (studentId, p) =>
        update((d) => {
          const st = d.students.find((s) => s.id === studentId)
          if (!st) return
          const nu: User = {
            id: `usr_par_${Date.now()}`,
            username: '', password: '',
            firstName: p.firstName, lastName: p.lastName,
            email: p.email, phone: p.phone,
            roles: ['parent'], childrenIds: [studentId],
            active: false,
            createdAt: new Date().toISOString().slice(0, 10),
          }
          d.users.push(nu)
          st.parentIds.push(nu.id)
          st.relation = p.relation
        }),
      setDoctor: (studentId, name, phone) =>
        update((d) => {
          const st = d.students.find((s) => s.id === studentId)
          if (!st) return
          st.doctor = name
          st.doctorPhone = phone
        }),
      updateStudentDocs: (studentId, patch) =>
        update((d) => {
          const st = d.students.find((s) => s.id === studentId)
          if (st) st.documents = { ...(st.documents ?? {}), ...patch }
        }),

      // ── нормативи и тренировъчен план ────────────────────────────────────
      addNorm: (n) => update((d) => { d.norms.push({ ...n, id: `nrm_${Date.now()}` }) }),
      deleteNorm: (id) =>
        update((d) => {
          d.norms = d.norms.filter((n) => n.id !== id)
          d.normResults = d.normResults.filter((r) => r.normId !== id)
        }),
      addNormResults: (rows) =>
        update((d) => {
          rows.forEach((r, i) => d.normResults.push({ ...r, id: `nrs_${Date.now()}_${i}` }))
        }),
      deleteNormResult: (id) =>
        update((d) => { d.normResults = d.normResults.filter((r) => r.id !== id) }),
      saveTrainingPlan: (p) =>
        update((d) => {
          const i = p.id ? d.trainingPlans.findIndex((x) => x.id === p.id) : -1
          const row: TrainingPlan = {
            ...p,
            id: p.id ?? `trp_${Date.now()}`,
            authorId: user?.id ?? '',
            updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          } as TrainingPlan
          if (i >= 0) d.trainingPlans[i] = row
          else d.trainingPlans.unshift(row)
        }),
      deleteTrainingPlan: (id) =>
        update((d) => { d.trainingPlans = d.trainingPlans.filter((p) => p.id !== id) }),

      // ── ВЧК / родителски срещи / подкрепа ────────────────────────────────
      updateVhkLesson: (id, patch) =>
        update((d) => {
          const i = d.vhkLessons.findIndex((v) => v.id === id)
          if (i >= 0) d.vhkLessons[i] = { ...d.vhkLessons[i], ...patch }
        }),
      updateClassMeeting: (id, patch) =>
        update((d) => {
          const i = d.classMeetings.findIndex((m) => m.id === id)
          if (i >= 0) d.classMeetings[i] = { ...d.classMeetings[i], ...patch }
        }),
      updateSupportPlan: (id, patch) =>
        update((d) => {
          const i = d.supportPlans.findIndex((s) => s.id === id)
          if (i >= 0) d.supportPlans[i] = { ...d.supportPlans[i], ...patch }
        }),
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
