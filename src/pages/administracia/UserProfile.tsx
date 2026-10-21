import { useMemo, useState, type ReactNode } from 'react'
import { useApp } from '../../store/AppContext'
import { ROLE_MAP, isAdmin, isStaff, isTeacherLike } from '../../lib/roles'
import type { RoleId, Student, User } from '../../lib/types'
import { GradePill, Icon } from '../../components/ui'
import { dateOnly, formatDateTime, periodTime } from '../dnevnik/shared'
import { Dash } from './shared'

/**
 * Профил на потребител — екранът, който се отваря при клик върху име в
 * „Администрация → Потребители".
 *
 * Подредбата следва референтния дневник: заглавие с ролите и лента с действия,
 * под него раздели (Основни данни, Роля, Достъп, Учител, Оценки, Отсъствия,
 * Отзиви, Разписание, Събития, Единици, Дипломи, Още), а съдържанието е в две
 * колони — снимка и данни.
 */

// ── дребни елементи ─────────────────────────────────────────────────────────

/** Ред „етикет : стойност" — етикетът е дясно подравнен, както в образеца. */
function InfoRow({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex items-start py-[6px]">
      <span
        className={`shrink-0 border-r border-[#e4e9ee] pr-3 text-right text-[12.5px] font-semibold leading-[19px] text-[#3d4a56] ${
          wide ? 'w-[365px]' : 'w-[190px]'
        }`}
      >
        {label}:
      </span>
      <span className="min-w-0 flex-1 pl-3 text-[12.5px] leading-[19px] text-ink-800">{children}</span>
    </div>
  )
}

/** Малък бадж за паралелка — икона на мрежа + име. */
function ClassBadge({ name }: { name: string }) {
  const label = (name ?? '').trim()
  if (!label || label === '—') return <span className="mr-1.5 text-ink-300">—</span>
  return (
    <span className="mr-1.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#337ab7]">
      <Icon name="grid" size={13} className="text-[#337ab7]" />
      {label}
    </span>
  )
}

/** Ляво подменю на раздели „Роля" и „Достъп". */
function SideNav({
  items, active, onChange,
}: { items: { id: string; label: string; icon: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="w-[215px] shrink-0 border border-[#d7dee4] border-r-0 bg-white py-1">
      {items.map((it) => {
        const on = active === it.id
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={`flex w-full items-center gap-2 border-l-[3px] px-3 py-[7px] text-left text-[12.5px] transition ${
              on
                ? 'border-[#3598dc] bg-[#eaf4fb] font-semibold text-[#2b6ca3]'
                : 'border-transparent text-ink-600 hover:bg-[#f6fafd]'
            }`}
          >
            <Icon name={it.icon} size={14} className={on ? 'text-[#3598dc]' : 'text-[#8593a0]'} />
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

/** Празен раздел — когато за този потребител няма въведени данни. */
function EmptyPane({ text }: { text: string }) {
  return (
    <div className="grid place-items-center border border-[#d7dee4] bg-white py-16 text-center">
      <Icon name="info" size={22} className="text-ink-300" />
      <p className="mt-2 text-[12.5px] text-ink-500">{text}</p>
    </div>
  )
}

/** Таблица в профила — същият вид като таблиците в „Дневник". */
function PTable({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[#d7dee4] bg-white">
      <table className="w-full border-collapse">
        <thead className="bg-[#f5f7f9]">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-[#eef1f4]">{children}</tbody>
      </table>
    </div>
  )
}

/** Голяма бройка в началото на раздел „Оценки"/„Отсъствия"/„Отзиви". */
function BigStat({ value, label, icon, color }: { value: string; label: string; icon: string; color: string }) {
  return (
    <div className="flex-1 px-2 py-3 text-center">
      <div className="flex items-center justify-center gap-2">
        <Icon name={icon} size={34} className={color} strokeWidth={1.5} />
        <span className={`text-[34px] font-bold leading-none ${color}`}>{value}</span>
      </div>
      <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-500">{label}</p>
    </div>
  )
}

/** Просто модално прозорче за действията от лентата. */
function Dialog({
  title, onClose, children, footer, width = 420,
}: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink-900/45 p-4">
      <div className="w-full rounded-[3px] bg-white shadow-pop" style={{ maxWidth: width }}>
        <div className="flex items-center justify-between border-b border-[#e4e9ee] px-4 py-2.5">
          <h3 className="text-[13.5px] font-bold text-[#3d4a56]">{title}</h3>
          <button type="button" onClick={onClose} className="grid h-6 w-6 place-items-center rounded text-ink-500 hover:bg-ink-100">
            <Icon name="close" size={14} strokeWidth={2.4} />
          </button>
        </div>
        <div className="px-4 py-3">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-[#e4e9ee] px-4 py-2.5">{footer}</div>}
      </div>
    </div>
  )
}

// ── помощни функции ─────────────────────────────────────────────────────────

const ROLE_ICON: Record<RoleId, string> = {
  sysadmin: 'settings',
  director: 'badge',
  deputy: 'users',
  teacher: 'cap',
  class_teacher: 'users',
  educator: 'person',
  resource_teacher: 'cap',
  psychologist: 'heart',
  speech_therapist: 'meet',
  nurse: 'heart',
  librarian: 'book',
  accountant: 'wallet',
  secretary: 'clipboard',
  parent: 'person',
  student: 'user',
  guest: 'eye',
}

const REASON: Record<string, { label: string; color: string }> = {
  'неизвинено': { label: 'Неуважително', color: '#e7505a' },
  'извинено': { label: 'Уважително', color: '#26c281' },
  'закъснение': { label: 'Закъснение', color: '#c49f47' },
  'семейни причини': { label: 'Семейни причини', color: '#32c5d2' },
}

const DAY_NAMES = ['', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя']

/** Име с инициали на презимето — „Алекс Г. Тодоров". */
function shortPerson(u: User): string {
  const mid = u.middleName ? `${u.middleName[0]}.` : ''
  return [u.firstName, mid, u.lastName].filter(Boolean).join(' ')
}

/**
 * Стаж между две дати в години, месеци и дни.
 *
 * Датите се разчитат ръчно: `new Date('2026-04-19')` се тълкува като UTC и при
 * GMT+3 измества деня с едно назад.
 */
function seniority(fromIso: string): { years: number; months: number; days: number } | null {
  const [y, m, d] = fromIso.split('-').map(Number)
  if (!y || !m || !d) return null
  const now = new Date()
  let years = now.getFullYear() - y
  let months = now.getMonth() + 1 - m
  let days = now.getDate() - d
  if (days < 0) {
    months -= 1
    const prev = new Date(now.getFullYear(), now.getMonth(), 0)
    days += prev.getDate()
  }
  if (months < 0) { years -= 1; months += 12 }
  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) }
}

const TABS = [
  { id: 'main', label: 'Основни данни', icon: 'grid' },
  { id: 'role', label: 'Роля', icon: 'users' },
  { id: 'access', label: 'Достъп', icon: 'lock' },
  { id: 'teacher', label: 'Учител', icon: 'cap' },
  { id: 'grades', label: 'Оценки', icon: 'edit' },
  { id: 'absences', label: 'Отсъствия', icon: 'warn' },
  { id: 'notes', label: 'Отзиви', icon: 'star' },
  { id: 'schedule', label: 'Разписание', icon: 'calendar' },
  { id: 'events', label: 'Събития', icon: 'meet' },
  { id: 'units', label: 'Единици', icon: 'list' },
  { id: 'diplomas', label: 'Дипломи', icon: 'certificate' },
]

const MORE_TABS = [
  { id: 'logins', label: 'Влизания', icon: 'clock' },
  { id: 'actions', label: 'Действия', icon: 'clipboard' },
]

const ROLE_SIDE = [
  { id: 'data', label: 'Данни за ролята', icon: 'users' },
  { id: 'exp', label: 'Трудов стаж', icon: 'archive' },
  { id: 'extra', label: 'Допълнителни данни', icon: 'info' },
  { id: 'pos', label: 'Длъжност', icon: 'certificate' },
  { id: 'edu', label: 'Образование', icon: 'cap' },
  { id: 'card', label: 'Работна карта', icon: 'card' },
]

const ACCESS_SIDE = [
  { id: 'msg', label: 'Съобщения', icon: 'mail' },
  { id: 'admin', label: 'Администрация', icon: 'settings' },
  { id: 'docs', label: 'Деловодство', icon: 'report' },
  { id: 'lecture', label: 'Лекторски часове', icon: 'clock' },
]

// ── екранът ─────────────────────────────────────────────────────────────────

export default function UserProfile({
  user, tab, onTab, onBack, onEdit,
}: {
  user: User
  tab: string
  onTab: (t: string) => void
  onBack: () => void
  onEdit: () => void
}) {
  const { db, update, className: klassName, subjectName, studentName } = useApp()
  const [roleSide, setRoleSide] = useState('data')
  const [accessSide, setAccessSide] = useState('msg')
  const [moreOpen, setMoreOpen] = useState(false)
  const [dialog, setDialog] = useState<'' | 'pass' | 'roles' | 'child'>('')
  const [newPass, setNewPass] = useState('')
  const [dropRoles, setDropRoles] = useState<RoleId[]>([])
  const [childQuery, setChildQuery] = useState('')
  const [msg, setMsg] = useState('')

  const u = user
  const isTeacher = isTeacherLike(u.roles)
  const admin = isAdmin(u.roles)
  const staff = isStaff(u.roles)
  const secretary = u.roles.includes('secretary')
  const isParent = u.roles.includes('parent')

  const homerooms = useMemo(() => db.classes.filter((k) => k.homeroomTeacherId === u.id), [db.classes, u.id])
  const children = useMemo(
    () => (u.childrenIds ?? []).map((id) => db.students.find((s) => s.id === id)).filter(Boolean) as Student[],
    [db.students, u.childrenIds],
  )
  /** учениците, чиито оценки/отсъствия вижда този профил (ученик или родител) */
  const familyStudentIds = useMemo(() => {
    const ids = new Set<string>()
    if (u.studentId) ids.add(u.studentId)
    ;(u.childrenIds ?? []).forEach((id) => ids.add(id))
    return ids
  }, [u.studentId, u.childrenIds])

  // ── предмети и паралелки, в които преподава ──────────────────────────────
  const teachRows = useMemo(() => {
    const out: { classId: string; subjectId: string; h1: number; h2: number }[] = []
    const seen = new Set<string>()
    db.classes.forEach((k) => (k.plan ?? []).forEach((p) => {
      if (p.teacherId !== u.id) return
      const key = `${k.id}|${p.subjectId}`
      if (seen.has(key)) return
      seen.add(key)
      out.push({
        classId: k.id,
        subjectId: p.subjectId,
        h1: (p.weeks1a ?? 0) + (p.weeks1b ?? 0),
        h2: (p.weeks2a ?? 0) + (p.weeks2b ?? 0),
      })
    }))
    // паралелките, създадени от демото, нямат учебен план — тогава броим по
    // седмичното разписание, иначе разделът „Учител" остава празен.
    if (!out.length) {
      const map = new Map<string, { classId: string; subjectId: string; h1: number; h2: number }>()
      db.schedule.forEach((s) => {
        if (s.teacherId !== u.id) return
        const key = `${s.classId}|${s.subjectId}`
        const cur = map.get(key) ?? { classId: s.classId, subjectId: s.subjectId, h1: 0, h2: 0 }
        cur.h1 += 1
        map.set(key, cur)
      })
      out.push(...map.values())
    }
    return out.sort((a, b) => {
      const byClass = klassName(a.classId).localeCompare(klassName(b.classId), 'bg')
      return byClass || subjectName(a.subjectId).localeCompare(subjectName(b.subjectId), 'bg')
    })
  }, [db.classes, db.schedule, u.id, klassName, subjectName])

  const teachClassIds = useMemo(() => new Set(teachRows.map((r) => r.classId)), [teachRows])
  const teachStudentCount = useMemo(
    () => db.students.filter((s) => teachClassIds.has(s.classId)).length,
    [db.students, teachClassIds],
  )

  // ── оценки, отсъствия, отзиви ────────────────────────────────────────────
  const grades = useMemo(
    () => db.grades.filter((g) => !g.deletedAt && (isTeacher ? g.teacherId === u.id : familyStudentIds.has(g.studentId))),
    [db.grades, isTeacher, u.id, familyStudentIds],
  )
  const absences = useMemo(
    () => db.absences.filter((a) => !a.deletedAt && (isTeacher ? a.teacherId === u.id : familyStudentIds.has(a.studentId))),
    [db.absences, isTeacher, u.id, familyStudentIds],
  )
  const notes = useMemo(
    () => db.notes.filter((n) => (isTeacher ? n.teacherId === u.id : familyStudentIds.has(n.studentId))),
    [db.notes, isTeacher, u.id, familyStudentIds],
  )

  const avgGrade = useMemo(() => {
    if (!grades.length) return '—'
    const sum = grades.reduce((a, g) => a + g.value, 0)
    return (sum / grades.length).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }, [grades])

  const mySchedule = useMemo(
    () => db.schedule.filter((s) => s.teacherId === u.id),
    [db.schedule, u.id],
  )

  const myEvents = useMemo(() => {
    const classIds = new Set<string>([
      ...homerooms.map((k) => k.id),
      ...(u.classIds ?? []),
      ...teachClassIds,
    ])
    return db.events.filter(
      (e) => e.createdById === u.id
        || e.invitedUserIds.includes(u.id)
        || e.invitedClassIds.some((c) => classIds.has(c)),
    )
  }, [db.events, homerooms, u.classIds, u.id, teachClassIds])

  const audit = useMemo(
    () => db.audit.filter((a) => a.userId === u.id).sort((a, b) => b.date.localeCompare(a.date)),
    [db.audit, u.id],
  )

  const senior = seniority(u.createdAt)

  // ── действия от лентата ──────────────────────────────────────────────────
  const savePassword = () => {
    if (newPass.trim().length < 6) { setMsg('Паролата трябва да е поне 6 символа.'); return }
    update((d) => {
      const i = d.users.findIndex((x) => x.id === u.id)
      if (i >= 0) d.users[i].password = newPass.trim()
    })
    setDialog('')
    setNewPass('')
    setMsg('Паролата е сменена.')
  }

  const removeRoles = () => {
    if (!dropRoles.length) { setMsg('Отбележете поне една роля.'); return }
    if (dropRoles.length >= u.roles.length) { setMsg('Трябва да остане поне една роля.'); return }
    update((d) => {
      const i = d.users.findIndex((x) => x.id === u.id)
      if (i >= 0) d.users[i].roles = d.users[i].roles.filter((r) => !dropRoles.includes(r))
    })
    setDialog('')
    setDropRoles([])
    setMsg('Ролите са премахнати.')
  }

  const addChild = (st: Student) => {
    update((d) => {
      const i = d.users.findIndex((x) => x.id === u.id)
      if (i < 0) return
      const next = new Set([...(d.users[i].childrenIds ?? []), st.id])
      d.users[i].childrenIds = [...next]
      if (!d.users[i].roles.includes('parent')) d.users[i].roles = [...d.users[i].roles, 'parent']
    })
    setDialog('')
    setChildQuery('')
    setMsg(`Ученикът е добавен към профила.`)
  }

  const removeUser = () => {
    if (!window.confirm(`Да се изтрие ли потребителят ${u.firstName} ${u.lastName}?`)) return
    update((d) => { d.users = d.users.filter((x) => x.id !== u.id) })
    onBack()
  }

  const counts: Record<string, number | undefined> = {
    grades: grades.length,
    absences: absences.length,
    notes: notes.length,
  }

  // ── раздели ──────────────────────────────────────────────────────────────
  const roleNotes = (() => {
    if (children.length) {
      return `Родител на ${children.map((c) => `${c.firstName} ${c.lastName} от ${klassName(c.classId)}`).join(', ')}`
    }
    if (homerooms.length) return `Класен ръководител на ${homerooms.map((k) => klassName(k.id)).join(', ')}`
    return ''
  })()

  const renderMain = () => (
    <div className="border border-[#d7dee4] bg-white">
      <div className="flex flex-col gap-6 p-4 md:flex-row">
        {/* снимка и имена */}
        <div className="w-full shrink-0 text-center md:w-[210px]">
          <div className="mx-auto grid h-[185px] w-[185px] place-items-center overflow-hidden rounded-[3px] border border-[#d7dee4] bg-[#eef2f6]">
            {u.avatar ? (
              <img src={u.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[52px] font-bold text-[#9aa7b0]">
                {(u.firstName[0] ?? '') + (u.lastName[0] ?? '')}
              </span>
            )}
          </div>
          <p className="mt-3 text-[16px] font-bold leading-tight text-[#337ab7]">{shortPerson(u)}</p>
          <p className="mt-1.5 text-[10.5px] font-bold uppercase leading-[15px] tracking-wide text-[#337ab7]">
            {u.roles.map((r) => ROLE_MAP[r]?.name ?? r).join(', ')}
          </p>
        </div>

        {/* данни */}
        <div className="min-w-0 flex-1">
          <InfoRow label="Научно звание"><Dash>{u.title}</Dash></InfoRow>
          <InfoRow label="Име">{u.firstName}</InfoRow>
          <InfoRow label="Презиме"><Dash>{u.middleName}</Dash></InfoRow>
          <InfoRow label="Фамилия">{u.lastName}</InfoRow>
          <InfoRow label="Пол">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="user" size={13} className="text-[#5b6b78]" />
              {u.gender ?? '—'}
            </span>
          </InfoRow>
          <InfoRow label="Дата на раждане">
            {u.birthDate ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="calendar" size={13} className="text-[#5b6b78]" />
                {dateOnly(u.birthDate)}
              </span>
            ) : <Dash />}
          </InfoRow>
          <InfoRow label="Място на раждане"><Dash>{u.birthPlace}</Dash></InfoRow>
          <InfoRow label="Гражданство"><Dash>{u.citizenship}</Dash></InfoRow>
          <InfoRow label="Телефон">
            {u.phone ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="meet" size={13} className="text-[#337ab7]" />
                <span className="text-[#337ab7]">{u.phone}</span>
              </span>
            ) : <Dash />}
          </InfoRow>
          <InfoRow label="Ел. поща">
            {u.email ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="mail" size={13} className="text-[#337ab7]" />
                <span className="text-[#337ab7]">{u.email}</span>
              </span>
            ) : <Dash />}
          </InfoRow>
          <InfoRow label="Потребителско име">{u.username || '—'}</InfoRow>
          <InfoRow label="Статус">
            <span
              className="inline-block rounded-[2px] px-2 py-[2px] text-[11.5px] font-semibold text-white"
              style={{ background: u.active ? '#32c5d2' : '#aab5c8' }}
            >
              {u.active ? 'Активен' : 'Неактивен'}
            </span>
          </InfoRow>
          <InfoRow label="Дата на създаване">{dateOnly(u.createdAt)}</InfoRow>
          <InfoRow label="Настоящ адрес">
            {[u.address, u.city].filter(Boolean).join(', ') || <Dash />}
          </InfoRow>
          <InfoRow label="Класен ръководител">
            {homerooms.length ? homerooms.map((k) => <ClassBadge key={k.id} name={klassName(k.id)} />) : <Dash />}
          </InfoRow>
          {children.length > 0 && (
            <InfoRow label="Данни за деца">
              <div className="space-y-1">
                {children.map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5">
                    <ClassBadge name={klassName(c.classId)} />
                    <span className="text-[12.5px] text-[#337ab7]">
                      {c.firstName} {c.middleName} {c.lastName}
                    </span>
                  </div>
                ))}
              </div>
            </InfoRow>
          )}
        </div>
      </div>
    </div>
  )

  const renderRole = () => (
    <div className="flex">
      <SideNav items={ROLE_SIDE} active={roleSide} onChange={setRoleSide} />
      <div className="min-w-0 flex-1 border border-[#d7dee4] bg-white p-4">
        <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#3d4a56]">
          <Icon name="users" size={14} />
          {ROLE_SIDE.find((s) => s.id === roleSide)?.label}
        </p>

        {roleSide === 'data' && (
          <PTable
            head={
              <>
                <th className="th w-[130px]">Учебна година</th>
                <th className="th w-[240px]">Роля</th>
                <th className="th">Пояснение</th>
              </>
            }
          >
            <tr>
              <td className="td">
                <span className="inline-flex items-center gap-1.5 text-[#337ab7]">
                  <Icon name="calendar" size={13} /> {db.school.year}
                </span>
              </td>
              <td className="td">
                {u.roles.map((r) => (
                  <div key={r} className="flex items-center gap-1.5 py-[2px] text-[12.5px]">
                    <Icon name={ROLE_ICON[r] ?? 'user'} size={13} className="text-[#5b6b78]" />
                    {ROLE_MAP[r]?.name ?? r}
                  </div>
                ))}
              </td>
              <td className="td text-[12px] text-ink-600">{roleNotes || '—'}</td>
            </tr>
          </PTable>
        )}

        {roleSide === 'exp' && (
          <div className="max-w-[720px]">
            <InfoRow label="Постъпил">{u.createdAt ? `${u.createdAt.slice(0, 4)} г.` : '—'}</InfoRow>
            <InfoRow label="Общ (години, месеци, дни)">
              {senior ? `${senior.years} г. ${senior.months} м. ${senior.days} д.` : '—'}
            </InfoRow>
            <InfoRow label="По специалността (години, месеци, дни)">
              {isTeacher && senior ? `${senior.years} г. ${senior.months} м. ${senior.days} д.` : '—'}
            </InfoRow>
            <InfoRow label="Учителски (години, месеци, дни)">
              {isTeacher && senior ? `${senior.years} г. ${senior.months} м. ${senior.days} д.` : '—'}
            </InfoRow>
          </div>
        )}

        {roleSide === 'extra' && (
          <div className="max-w-[720px]">
            <InfoRow label="Работещ пенсионер">{u.retired ? 'Да' : 'Не'}</InfoRow>
            <InfoRow label="Пътуващ от друго населено място">{u.commuter ? 'Да' : 'Не'}</InfoRow>
          </div>
        )}

        {roleSide === 'pos' && (
          <div className="max-w-[760px]">
            <InfoRow label="Дата на назначаване">{dateOnly(u.createdAt)}</InfoRow>
            <InfoRow label="Педагогически персонал">{isTeacher ? 'Да' : 'Не'}</InfoRow>
            <InfoRow label="Вид"><Dash>{isTeacher ? 'Педагогически специалист' : undefined}</Dash></InfoRow>
            <InfoRow label="Титуляр/заместник"><Dash /></InfoRow>
            <InfoRow label="Щат"><Dash>{isTeacher ? '1' : undefined}</Dash></InfoRow>
            <InfoRow label="Професионален опит"><Dash /></InfoRow>
            <InfoRow label="Водещ за текущата учебна година">{isTeacher ? 'Да' : 'Не'}</InfoRow>
            <InfoRow label="Наименование">{u.roles.map((r) => ROLE_MAP[r]?.name ?? r).join(', ')}</InfoRow>
            <InfoRow label="Бележки"><Dash /></InfoRow>
            <InfoRow label="Болничен учител">Не</InfoRow>
          </div>
        )}

        {(roleSide === 'edu' || roleSide === 'card') && (
          <EmptyPane text="Няма въведени данни за този раздел." />
        )}
      </div>
    </div>
  )

  const accessSections = [
    {
      id: 'msg', title: 'Съобщения', icon: 'mail',
      rows: [
        { label: 'Изпращане на съобщения до ученици във видими паралелки', on: staff },
        { label: 'Изпращане на съобщения до всички ученици', on: admin },
        { label: 'Изпращане на съобщения до родители във видими паралелки', on: staff },
        { label: 'Изпращане на съобщения до всички родители', on: admin },
        { label: 'Изпращане на съобщения до видимите учители', on: isTeacher },
        { label: 'Изпращане на съобщения до всички учители', on: admin },
        { label: 'Изпращане на съобщения до видимия персонал', on: staff },
        { label: 'Изпращане на съобщения до целия персонал', on: admin },
      ],
    },
    {
      id: 'admin', title: 'Администрация', icon: 'settings',
      rows: [
        { label: 'Седмични разписания — преглед на разписанията във всички паралелки', on: admin },
        { label: 'Седмични разписания — редакция на разписанията във всички паралелки', on: admin },
        { label: 'Генератор на седмични разписания — редакция на шаблон', on: admin },
      ],
    },
    {
      id: 'docs', title: 'Деловодство', icon: 'report',
      rows: [
        { label: 'Ученически документи', on: admin || secretary },
        { label: 'Книга за заповеди', on: admin },
        { label: 'Книга за кореспонденция', on: admin || secretary },
        { label: 'Книга за решения на педагогическия съвет', on: admin },
        { label: 'Училищни протоколи', on: admin || secretary },
      ],
    },
    {
      id: 'lecture', title: 'Лекторски часове', icon: 'clock',
      rows: [
        { label: 'Всички отсъствия', on: admin },
        { label: 'Всички над хорариума', on: admin },
      ],
    },
  ]

  const renderAccess = () => {
    const section = accessSections.find((s) => s.id === accessSide) ?? accessSections[0]
    return (
      <div className="flex">
        <SideNav items={ACCESS_SIDE} active={accessSide} onChange={setAccessSide} />
        <div className="min-w-0 flex-1 border border-[#d7dee4] bg-white p-4">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#3d4a56]">
            <Icon name={section.icon} size={14} />
            {section.title}
          </p>
          <div className="border border-[#e4e9ee]">
            <div className="flex items-center gap-2 border-b border-[#e4e9ee] bg-[#f5f7f9] px-3 py-2 text-[12.5px] font-bold text-[#3d4a56]">
              <Icon name={section.icon} size={14} />
              {section.title}
            </div>
            <div className="px-3 py-1">
              {section.rows.map((r) => (
                <InfoRow key={r.label} label={r.label} wide>
                  <span className={r.on ? 'font-semibold text-[#1f7a45]' : 'text-ink-500'}>{r.on ? 'Да' : 'Не'}</span>
                </InfoRow>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
            Правата са изведени от ролите на профила. За да ги промените, използвайте „Редактирай" или
            „Премахни роли".
          </p>
        </div>
      </div>
    )
  }

  const renderTeacher = () => {
    if (!teachRows.length) return <EmptyPane text="Този потребител не преподава в нито една паралелка." />
    return (
      <div className="space-y-3">
        <div className="max-w-[820px] border border-[#d7dee4] bg-white px-4 py-3">
          <InfoRow label="Номер по образец"><Dash>{u.sampleNo}</Dash></InfoRow>
          <InfoRow label="Класен ръководител">
            {homerooms.length ? homerooms.map((k) => <ClassBadge key={k.id} name={klassName(k.id)} />) : <Dash />}
          </InfoRow>
          <InfoRow label="Преподава на">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="grid" size={13} className="text-[#5b6b78]" />
              {teachClassIds.size} паралелки,
              <Icon name="users" size={13} className="text-[#5b6b78]" />
              {teachStudentCount} ученици
            </span>
          </InfoRow>
          <InfoRow label="Преподавател по">
            <div className="flex flex-wrap gap-1">
              {(u.subjectIds ?? []).length
                ? (u.subjectIds ?? []).map((sid) => (
                  <span key={sid} className="rounded-[2px] px-1.5 py-[1px] text-[11.5px] font-semibold text-white" style={{ background: '#9b7bc4' }}>
                    {subjectName(sid)}
                  </span>
                ))
                : <Dash />}
            </div>
          </InfoRow>
        </div>

        <PTable
          head={
            <>
              <th className="th w-10">№</th>
              <th className="th w-28">Паралелка</th>
              <th className="th">Предмет</th>
              <th className="th w-36">Хорариум (срок I)</th>
              <th className="th w-36">Хорариум (срок II)</th>
            </>
          }
        >
          {teachRows.slice(0, 200).map((r, i) => (
            <tr key={`${r.classId}-${r.subjectId}`} className="hover:bg-[#f6fafd]">
              <td className="td text-[12.5px] text-ink-500">{i + 1}</td>
              <td className="td"><ClassBadge name={klassName(r.classId)} /></td>
              <td className="td text-[12.5px]">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="book" size={13} className="text-[#8593a0]" />
                  {subjectName(r.subjectId)}
                </span>
              </td>
              <td className="td text-[12.5px]">{r.h1}</td>
              <td className="td text-[12.5px]">{r.h2}</td>
            </tr>
          ))}
        </PTable>
      </div>
    )
  }

  const renderGrades = () => (
    <div className="space-y-3">
      <div className="flex flex-wrap border border-[#d7dee4] bg-white">
        <BigStat value={String(grades.length)} label="въведени оценки" icon="edit" color="text-[#3598dc]" />
        <div className="w-px bg-[#eef1f4]" />
        <BigStat value={String(new Set(grades.map((g) => g.classId)).size)} label="паралелки" icon="users" color="text-[#3598dc]" />
        <div className="w-px bg-[#eef1f4]" />
        <BigStat value={avgGrade} label="среден успех" icon="star" color="text-[#3598dc]" />
      </div>

      {grades.length === 0 ? <EmptyPane text="Няма въведени оценки." /> : (
        <PTable
          head={
            <>
              <th className="th w-24">Паралелка</th>
              <th className="th">Предмет</th>
              <th className="th">Ученик</th>
              <th className="th w-32">Тип</th>
              <th className="th w-20">Оценка</th>
              <th className="th w-32">Дата на оценяване</th>
              <th className="th w-40">Дата на добавяне</th>
            </>
          }
        >
          {grades.slice(0, 200).map((g) => (
            <tr key={g.id} className="hover:bg-[#f6fafd]">
              <td className="td"><ClassBadge name={klassName(g.classId)} /></td>
              <td className="td text-[12.5px]">{subjectName(g.subjectId)}</td>
              <td className="td text-[12.5px] text-[#337ab7]">{studentName(g.studentId)}</td>
              <td className="td whitespace-nowrap text-[12.5px]">{g.type}</td>
              <td className="td"><GradePill value={g.value} /></td>
              <td className="td text-[12.5px]">{dateOnly(g.date)}</td>
              <td className="td text-[12.5px] text-ink-500">{formatDateTime(g.createdAt)}</td>
            </tr>
          ))}
        </PTable>
      )}
      {grades.length > 200 && (
        <p className="text-[11.5px] text-ink-400">Показани първите 200 от общо {grades.length} оценки.</p>
      )}
    </div>
  )

  const renderAbsences = () => {
    const unexcused = absences.filter((a) => a.reason === 'неизвинено').length
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap border border-[#d7dee4] bg-white">
          <BigStat value={String(absences.length)} label="въведени отсъствия" icon="warn" color="text-[#3598dc]" />
          <div className="w-px bg-[#eef1f4]" />
          <BigStat value={String(new Set(absences.map((a) => a.classId)).size)} label="паралелки" icon="users" color="text-[#3598dc]" />
          <div className="w-px bg-[#eef1f4]" />
          <BigStat value={String(unexcused)} label="неуважени" icon="ban" color="text-[#e7505a]" />
        </div>

        {absences.length === 0 ? <EmptyPane text="Няма въведени отсъствия." /> : (
          <PTable
            head={
              <>
                <th className="th w-24">Паралелка</th>
                <th className="th">Предмет</th>
                <th className="th">Ученик</th>
                <th className="th w-36">Тип</th>
                <th className="th w-32">Дата на отсъствие</th>
                <th className="th w-40">Дата на добавяне</th>
              </>
            }
          >
            {absences.slice(0, 200).map((a) => {
              const r = REASON[a.reason] ?? { label: a.reason, color: '#8593a0' }
              return (
                <tr key={a.id} className="hover:bg-[#f6fafd]">
                  <td className="td"><ClassBadge name={klassName(a.classId)} /></td>
                  <td className="td text-[12.5px]">{subjectName(a.subjectId)}</td>
                  <td className="td text-[12.5px] text-[#337ab7]">{studentName(a.studentId)}</td>
                  <td className="td text-[12.5px] font-semibold" style={{ color: r.color }}>{r.label}</td>
                  <td className="td text-[12.5px]">{dateOnly(a.date)}</td>
                  <td className="td text-[12.5px] text-ink-500">{formatDateTime(a.createdAt)}</td>
                </tr>
              )
            })}
          </PTable>
        )}
        {absences.length > 200 && (
          <p className="text-[11.5px] text-ink-400">Показани първите 200 от общо {absences.length} отсъствия.</p>
        )}
      </div>
    )
  }

  const renderNotes = () => {
    const praise = notes.filter((n) => n.kind === 'Похвала').length
    const remarks = notes.filter((n) => n.kind === 'Забележка').length
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap border border-[#d7dee4] bg-white">
          <BigStat value={String(notes.length)} label="въведени отзиви" icon="star" color="text-[#3598dc]" />
          <div className="w-px bg-[#eef1f4]" />
          <BigStat value={String(praise)} label="похвали" icon="heart" color="text-[#26c281]" />
          <div className="w-px bg-[#eef1f4]" />
          <BigStat value={String(remarks)} label="забележки" icon="warn" color="text-[#e7505a]" />
        </div>

        {notes.length === 0 ? <EmptyPane text="Няма въведени отзиви." /> : (
          <PTable
            head={
              <>
                <th className="th w-24">Паралелка</th>
                <th className="th w-40">Предмет</th>
                <th className="th">Ученик</th>
                <th className="th w-36">Тип</th>
                <th className="th">Коментар</th>
                <th className="th w-40">Дата на добавяне</th>
              </>
            }
          >
            {notes.slice(0, 200).map((n) => (
              <tr key={n.id} className="hover:bg-[#f6fafd]">
                <td className="td"><ClassBadge name={klassName(n.classId)} /></td>
                <td className="td text-[12.5px] text-ink-500">Общ отзив</td>
                <td className="td text-[12.5px] text-[#337ab7]">{studentName(n.studentId)}</td>
                <td className="td">
                  <span
                    className="inline-block rounded-full px-2 py-[2px] text-[11.5px] font-semibold text-white"
                    style={{ background: n.kind === 'Забележка' ? '#e7505a' : '#a6c62c' }}
                  >
                    {n.badge || n.kind}
                  </span>
                </td>
                <td className="td text-[12.5px] text-ink-600">{n.text}</td>
                <td className="td text-[12.5px] text-ink-500">{formatDateTime(n.date)}</td>
              </tr>
            ))}
          </PTable>
        )}
        {notes.length > 200 && (
          <p className="text-[11.5px] text-ink-400">Показани първите 200 от общо {notes.length} отзива.</p>
        )}
      </div>
    )
  }

  const renderSchedule = () => {
    if (!mySchedule.length) return <EmptyPane text="Този потребител няма часове в седмичното разписание." />
    const periods = [...new Set(mySchedule.map((s) => s.period))].sort((a, b) => a - b)
    const days = [1, 2, 3, 4, 5]
    return (
      <div className="overflow-x-auto border border-[#d7dee4] bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="th w-16 border-r border-[#eef1f4]">Час</th>
              {days.map((d) => (
                <th key={d} className="th border-r border-[#eef1f4] last:border-r-0">{DAY_NAMES[d]}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef1f4]">
            {periods.map((p) => (
              <tr key={p}>
                <td className="td border-r border-[#eef1f4] text-center text-[12px] font-bold text-ink-500">{p}</td>
                {days.map((d) => {
                  const items = mySchedule.filter((s) => s.day === d && s.period === p)
                  return (
                    <td key={d} className="border-r border-[#eef1f4] p-1.5 align-top last:border-r-0">
                      {items.map((s) => {
                        const shift = db.classes.find((k) => k.id === s.classId)?.shift ?? 1
                        const [from, to] = periodTime(s.period, shift)
                        return (
                          <div key={s.id} className="mb-1 rounded-[2px] bg-[#eaf6ef] px-1.5 py-1 last:mb-0">
                            <p className="text-[12px] font-semibold text-[#1f7a45]">{subjectName(s.subjectId)}</p>
                            <p className="text-[11.5px] text-[#337ab7]">{klassName(s.classId)}</p>
                            <p className="text-[10.5px] text-ink-500">{from} - {to}</p>
                          </div>
                        )
                      })}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderEvents = () => {
    if (!myEvents.length) return <EmptyPane text="Няма събития за този потребител." />
    return (
      <PTable
        head={
          <>
            <th className="th">Събитие</th>
            <th className="th w-40">Дата на провеждане</th>
            <th className="th w-40">Място</th>
            <th className="th w-32">Вид</th>
          </>
        }
      >
        {myEvents.map((e) => (
          <tr key={e.id} className="hover:bg-[#f6fafd]">
            <td className="td text-[12.5px]">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="calendar" size={13} className="text-[#8593a0]" />
                {e.title}
              </span>
            </td>
            <td className="td text-[12.5px]">{formatDateTime(e.date)}</td>
            <td className="td text-[12.5px]"><Dash>{e.place}</Dash></td>
            <td className="td text-[12.5px]">{e.kind}</td>
          </tr>
        ))}
      </PTable>
    )
  }

  const renderAudit = (onlyLogins: boolean) => {
    const rows = onlyLogins ? audit.filter((a) => a.action.toLowerCase().includes('вход')) : audit
    if (!rows.length) {
      return <EmptyPane text={onlyLogins ? 'Няма записани влизания.' : 'Няма записани действия.'} />
    }
    return (
      <>
        <div className="mb-2 flex items-start gap-2 border border-[#bcdcff] bg-[#eef6ff] px-3 py-2 text-[12.5px] text-[#2b6ca3]">
          <Icon name="info" size={14} className="mt-0.5 shrink-0" />
          {onlyLogins
            ? 'Това е списък с последните влизания на потребителя в платформата.'
            : 'Това е списък с последните действия на потребителя в платформата.'}
        </div>
        <PTable
          head={
            <>
              <th className="th w-48">Дата и час</th>
              <th className="th w-56">Действие</th>
              <th className="th">Обект</th>
            </>
          }
        >
          {rows.slice(0, 20).map((a) => (
            <tr key={a.id} className="hover:bg-[#f6fafd]">
              <td className="td text-[12.5px]">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="clock" size={13} className="text-[#8593a0]" />
                  {formatDateTime(a.date)}
                </span>
              </td>
              <td className="td text-[12.5px]">{a.action}</td>
              <td className="td text-[12.5px] text-ink-600"><Dash>{a.target}</Dash></td>
            </tr>
          ))}
        </PTable>
      </>
    )
  }

  const content = (() => {
    switch (tab) {
      case 'role': return renderRole()
      case 'access': return renderAccess()
      case 'teacher': return renderTeacher()
      case 'grades': return renderGrades()
      case 'absences': return renderAbsences()
      case 'notes': return renderNotes()
      case 'schedule': return renderSchedule()
      case 'events': return renderEvents()
      case 'units': return <EmptyPane text="Няма въведени единици." />
      case 'diplomas': return <EmptyPane text="Няма въведени дипломи." />
      case 'logins': return renderAudit(true)
      case 'actions': return renderAudit(false)
      default: return renderMain()
    }
  })()

  const childCandidates = childQuery.trim()
    ? db.students
      .filter((s) => !(u.childrenIds ?? []).includes(s.id))
      .filter((s) => `${s.firstName} ${s.middleName} ${s.lastName}`.toLowerCase().includes(childQuery.trim().toLowerCase()))
      .slice(0, 8)
    : []

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#eef1f2]">
      {/* заглавие и действия */}
      <div className="shrink-0 border-b border-[#d7dee4] bg-white px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Icon name="settings" size={15} className="shrink-0 text-[#5b6b78]" />
          <Icon name="user" size={15} className="shrink-0 text-[#5b6b78]" />
          <h2 className="min-w-0 truncate text-[14.5px] font-bold text-[#337ab7]">
            {shortPerson(u)}{' '}
            <span className="font-normal text-ink-600">
              ({u.roles.map((r) => ROLE_MAP[r]?.name ?? r).join(', ')})
            </span>
          </h2>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 rounded-[3px] border border-[#c7d0d8] bg-[#f7f9fa] px-2.5 py-1.5 text-[12.5px] font-semibold text-[#3d4a56] hover:bg-white"
            >
              <Icon name="chevronLeft" size={14} strokeWidth={2.2} /> Назад
            </button>
            <button type="button" onClick={onEdit} className="db db-blue">
              <Icon name="edit" size={14} strokeWidth={2.2} /> Редактирай
            </button>
            {isParent && (
              <button type="button" onClick={() => { setMsg(''); setDialog('child') }} className="db db-green">
                <Icon name="userPlus" size={14} strokeWidth={2.2} /> Ученик
              </button>
            )}
            <button type="button" onClick={() => { setMsg(''); setNewPass(''); setDialog('pass') }} className="db db-purple">
              <Icon name="lock" size={14} strokeWidth={2.2} /> Смени парола
            </button>
            <button type="button" onClick={() => { setMsg(''); setDropRoles([]); setDialog('roles') }} className="db db-gold">
              <Icon name="users" size={14} strokeWidth={2.2} /> Премахни роли
            </button>
            <button type="button" onClick={removeUser} className="db db-red">
              <Icon name="close" size={14} strokeWidth={2.6} /> Изтрий
            </button>
          </div>
        </div>
        {msg && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[#1f7a45]">
            <Icon name="check" size={13} strokeWidth={2.4} /> {msg}
          </p>
        )}
      </div>

      {/* раздели */}
      <div className="flex shrink-0 items-stretch overflow-x-auto border-b border-[var(--dn-line)] bg-white">
        {TABS.map((t) => {
          const on = tab === t.id
          const count = counts[t.id]
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={`dt gap-1 px-2 text-[12px] ${on ? 'dt-on' : ''}`}
            >
              <Icon name={t.icon} size={12.5} />
              {t.label}
              {count !== undefined && (
                <span className={`dt-c ${count === 0 ? 'dt-c0' : ''}`}>{count}</span>
              )}
            </button>
          )
        })}

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`dt gap-1 px-2 text-[12px] ${tab === 'logins' || tab === 'actions' ? 'dt-on' : ''}`}
          >
            Още
            <Icon name="chevronDown" size={13} />
          </button>
          {moreOpen && (
            <>
              <button type="button" aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={() => setMoreOpen(false)} />
              <div className="absolute right-0 top-full z-20 w-[190px] border border-[#d7dee4] bg-white py-1 shadow-pop">
                {MORE_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { onTab(t.id); setMoreOpen(false) }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-ink-700 hover:bg-[#f2fafb]"
                  >
                    <Icon name={t.icon} size={13} className="text-[#5b6b78]" />
                    {t.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* съдържание */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-[1260px]">{content}</div>
      </div>

      {/* прозорчета */}
      {dialog === 'pass' && (
        <Dialog
          title="Смяна на парола"
          onClose={() => setDialog('')}
          footer={
            <>
              <button type="button" onClick={() => setDialog('')} className="rounded-[3px] border border-[#c7d0d8] px-3 py-1.5 text-[12.5px] font-semibold text-[#3d4a56] hover:bg-[#f7f9fa]">
                Отказ
              </button>
              <button type="button" onClick={savePassword} className="db db-green">Запази</button>
            </>
          }
        >
          <p className="mb-2 text-[12.5px] text-ink-600">
            Нова парола за <b>{u.username || shortPerson(u)}</b>:
          </p>
          <input
            type="text"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="поне 6 символа"
            className="w-full rounded-[3px] border border-[#c7d0d8] px-2.5 py-[7px] text-[13px] outline-none focus:border-[#3598dc]"
          />
          {msg && <p className="mt-2 text-[12px] font-semibold text-[#e7505a]">{msg}</p>}
        </Dialog>
      )}

      {dialog === 'roles' && (
        <Dialog
          title="Премахване на роли"
          onClose={() => setDialog('')}
          footer={
            <>
              <button type="button" onClick={() => setDialog('')} className="rounded-[3px] border border-[#c7d0d8] px-3 py-1.5 text-[12.5px] font-semibold text-[#3d4a56] hover:bg-[#f7f9fa]">
                Отказ
              </button>
              <button type="button" onClick={removeRoles} className="db db-red">Премахни избраните</button>
            </>
          }
        >
          <p className="mb-2 text-[12.5px] text-ink-600">Отбележете ролите, които да бъдат премахнати:</p>
          <div className="space-y-1">
            {u.roles.map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12.5px] hover:bg-[#f2fafb]">
                <input
                  type="checkbox"
                  checked={dropRoles.includes(r)}
                  onChange={() => setDropRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))}
                  className="h-[13px] w-[13px] accent-[#3598dc]"
                />
                <Icon name={ROLE_ICON[r] ?? 'user'} size={13} className="text-[#5b6b78]" />
                {ROLE_MAP[r]?.name ?? r}
              </label>
            ))}
          </div>
          {msg && <p className="mt-2 text-[12px] font-semibold text-[#e7505a]">{msg}</p>}
        </Dialog>
      )}

      {dialog === 'child' && (
        <Dialog
          title="Добавяне на ученик към профила"
          onClose={() => setDialog('')}
          width={520}
        >
          <input
            type="text"
            value={childQuery}
            onChange={(e) => setChildQuery(e.target.value)}
            placeholder="Търсене по име на ученик…"
            className="w-full rounded-[3px] border border-[#c7d0d8] px-2.5 py-[7px] text-[13px] outline-none focus:border-[#3598dc]"
          />
          <div className="mt-2 max-h-[280px] overflow-y-auto">
            {childCandidates.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => addChild(s)}
                className="flex w-full items-center gap-2 border-b border-[#eef1f4] px-1.5 py-1.5 text-left text-[12.5px] last:border-b-0 hover:bg-[#f2fafb]"
              >
                <ClassBadge name={klassName(s.classId)} />
                <span>{s.firstName} {s.middleName} {s.lastName}</span>
              </button>
            ))}
            {childQuery.trim() && !childCandidates.length && (
              <p className="py-4 text-center text-[12.5px] text-ink-400">Няма намерени ученици.</p>
            )}
            {!childQuery.trim() && (
              <p className="py-4 text-center text-[12.5px] text-ink-400">Започнете да пишете име, за да търсите.</p>
            )}
          </div>
        </Dialog>
      )}
    </div>
  )
}
