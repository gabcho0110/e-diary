import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../../store/AppContext'
import { ROLES, ROLE_MAP } from '../../lib/roles'
import type { RoleId, User } from '../../lib/types'
import { Avatar, Icon, Input, PageHeader, Table } from '../../components/ui'
import { AddPage, Toggle, WarnBanner } from '../dnevnik/forms'
import UserProfile from './UserProfile'
import {
  AInput, ASelect, Dash, EmptyRow, FormRow, FormTabs, ListHead, SquareAction, SubjectPicker, ToolBtn, Toolbar,
} from './shared'

/** Ред на ролите като в референтния дневник. */
const ROLE_ORDER: RoleId[] = [
  'sysadmin', 'director', 'deputy', 'accountant', 'secretary', 'librarian',
  'teacher', 'parent', 'student', 'educator', 'resource_teacher',
  'psychologist', 'speech_therapist', 'nurse', 'guest',
]
const ROLE_LIST = [...ROLES].sort((a, b) => ROLE_ORDER.indexOf(a.id) - ROLE_ORDER.indexOf(b.id))
const TEACH_ROLES: RoleId[] = ['teacher', 'resource_teacher', 'educator']
/** Празният низ е ред „Изберете" — новата роля не се подразбира. */
type RoleDraft = RoleId | ''

interface Draft {
  title: string
  firstName: string
  middleName: string
  lastName: string
  idType: string
  egn: string
  birthDate: string
  birthPlace: string
  citizenship: string
  gender: 'М' | 'Ж'
  phone: string
  email: string
  mapMode: boolean
  address: string
  city: string
  roles: RoleDraft[]
  subjectIds: string[]
  initialTeacher: boolean
  externalLecturer: boolean
  sampleNo: string
  username: string
  password: string
  active: boolean
}

function draftOf(u?: User): Draft {
  return {
    title: u?.title ?? '',
    firstName: u?.firstName ?? '',
    middleName: u?.middleName ?? '',
    lastName: u?.lastName ?? '',
    idType: u?.idType ?? 'ЕГН',
    egn: u?.egn ?? '',
    birthDate: u?.birthDate ?? '',
    birthPlace: u?.birthPlace ?? '',
    citizenship: u?.citizenship ?? 'Българско',
    gender: u?.gender ?? 'Ж',
    phone: u?.phone ?? '',
    email: u?.email ?? '',
    mapMode: u?.mapMode ?? false,
    address: u?.address ?? '',
    city: u?.city ?? '',
    roles: u?.roles?.length ? u.roles : [''],
    subjectIds: u?.subjectIds ?? [],
    initialTeacher: u?.initialTeacher ?? false,
    externalLecturer: u?.externalLecturer ?? false,
    sampleNo: u?.sampleNo ?? '',
    username: u?.username ?? '',
    password: u?.password ?? 'demo123',
    active: u?.active ?? true,
  }
}

// ── Форма за потребител ─────────────────────────────────────────────────────
function UserForm({ editing, onClose }: { editing?: User; onClose: () => void }) {
  const { db, update } = useApp()
  const [tab, setTab] = useState<'main' | 'role' | 'access'>('main')
  const [d, setD] = useState<Draft>(draftOf(editing))
  const [err, setErr] = useState('')
  const [roleSide, setRoleSide] = useState('data')

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))
  const subjects = useMemo(() => [...db.subjects].sort((a, b) => a.name.localeCompare(b.name, 'bg')), [db.subjects])
  const roleIds = useMemo(() => d.roles.filter((r): r is RoleId => !!r), [d.roles])
  const isTeacher = roleIds.some((r) => TEACH_ROLES.includes(r))

  const save = (again: boolean) => {
    if (!d.firstName.trim() || !d.lastName.trim()) { setErr('Попълнете име и фамилия.'); setTab('main'); return }
    if (!d.username.trim()) { setErr('Попълнете потребителско име (раздел „Достъп“).'); setTab('access'); return }
    if (!editing && db.users.some((u) => u.username.toLowerCase() === d.username.trim().toLowerCase())) {
      setErr('Това потребителско име вече е заето.'); setTab('access'); return
    }

    const base = {
      firstName: d.firstName.trim(),
      middleName: d.middleName.trim() || undefined,
      lastName: d.lastName.trim(),
      email: d.email.trim(),
      phone: d.phone.trim(),
      roles: roleIds.length ? roleIds : (['guest'] as RoleId[]),
      subjectIds: isTeacher ? d.subjectIds : [],
      title: d.title || undefined,
      idType: d.idType,
      egn: d.egn,
      birthDate: d.birthDate,
      birthPlace: d.birthPlace,
      citizenship: d.citizenship,
      gender: d.gender,
      address: d.address,
      city: d.city,
      mapMode: d.mapMode,
      initialTeacher: d.initialTeacher,
      externalLecturer: d.externalLecturer,
      sampleNo: d.sampleNo,
      username: d.username.trim(),
      password: d.password,
      active: d.active,
    }

    if (editing) {
      update((x) => {
        const i = x.users.findIndex((u) => u.id === editing.id)
        if (i >= 0) x.users[i] = { ...x.users[i], ...base }
      })
    } else {
      const nu: User = {
        ...base,
        id: `usr_${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 10),
        classIds: [],
      }
      update((x) => { x.users.push(nu) })
    }

    if (again) {
      setErr('')
      setD(draftOf(undefined))
      setTab('main')
      return
    }
    onClose()
  }

  return (
    <AddPage
      title={editing ? 'Редакция на потребител' : 'Добавяне на потребител'}
      onBack={onClose}
      onSave={() => save(false)}
      onSaveAdd={() => save(true)}
    >
      <div className="mx-auto max-w-[1120px]">
        {err && <div className="mb-3"><WarnBanner>{err}</WarnBanner></div>}
        <div className="border border-[#d7dee4] bg-white">
          <FormTabs
            active={tab}
            onChange={(id) => setTab(id as 'main' | 'role' | 'access')}
            tabs={[
              { id: 'main', label: 'Основни данни', icon: 'grid' },
              { id: 'role', label: 'Роля', icon: 'users' },
              { id: 'access', label: 'Достъп', icon: 'lock' },
            ]}
          />

          {tab === 'main' && (
            <div className="px-4 py-5">
              <FormRow label="Научно звание">
                <div className="flex items-center gap-1">
                  <ASelect value={d.title} onChange={(e) => set('title', e.target.value)}>
                    <option value="">Изберете</option>
                    <option value="д-р">д-р</option>
                    <option value="доц.">доц.</option>
                    <option value="проф.">проф.</option>
                  </ASelect>
                  <button type="button" className="grid h-[31px] w-[30px] shrink-0 place-items-center rounded-[3px] text-white" style={{ background: '#e7505a' }}>
                    <Icon name="close" size={13} strokeWidth={2.6} />
                  </button>
                  <button type="button" className="grid h-[31px] w-[30px] shrink-0 place-items-center rounded-[3px] text-white" style={{ background: '#36c6d3' }}>
                    <Icon name="plus" size={13} strokeWidth={2.6} />
                  </button>
                </div>
              </FormRow>
              <FormRow label="Име" required>
                <AInput value={d.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Име на потребителя" />
              </FormRow>
              <FormRow label="Презиме">
                <AInput value={d.middleName} onChange={(e) => set('middleName', e.target.value)} placeholder="Презиме на потребителя" />
              </FormRow>
              <FormRow label="Фамилия" required>
                <AInput value={d.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Фамилия на потребителя" />
              </FormRow>
              <FormRow label="Идентификатор">
                <ASelect value={d.idType} onChange={(e) => set('idType', e.target.value)}>
                  <option value="ЕГН">ЕГН</option>
                  <option value="ЛНЧ">ЛНЧ</option>
                  <option value="Друг">Друг</option>
                </ASelect>
              </FormRow>
              <FormRow label="ЕГН/ЛНЧ">
                <AInput value={d.egn} onChange={(e) => set('egn', e.target.value)} placeholder="ЕГН, ЛНЧ на потребителя" />
              </FormRow>
              <FormRow label="Дата на раждане">
                <AInput type="date" value={d.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
              </FormRow>
              <FormRow label="Място на раждане (град)">
                <AInput value={d.birthPlace} onChange={(e) => set('birthPlace', e.target.value)} placeholder="напр. София" />
              </FormRow>
              <FormRow label="Гражданство">
                <ASelect value={d.citizenship} onChange={(e) => set('citizenship', e.target.value)}>
                  <option value="Българско">Българско</option>
                  <option value="Друго">Друго</option>
                </ASelect>
              </FormRow>
              <FormRow label="Пол">
                <div className="flex items-center gap-2 pt-1">
                  {(['М', 'Ж'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => set('gender', g)}
                      className={`h-[27px] w-[34px] rounded-[3px] text-[12.5px] font-bold text-white ${d.gender === g ? '' : 'opacity-45'}`}
                      style={{ background: g === 'М' ? '#3598dc' : '#e7505a' }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </FormRow>
              <FormRow label="Телефон">
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0 rounded-[3px] border border-[#c7d0d8] bg-[#f7f9fa] px-2 py-[7px] text-[12.5px] text-ink-600">🇧🇬 +359</span>
                  <AInput value={d.phone} onChange={(e) => set('phone', e.target.value)} placeholder="48 123 456" />
                </div>
              </FormRow>
              <FormRow label="Ел. поща">
                <AInput type="email" value={d.email} onChange={(e) => set('email', e.target.value)} placeholder="Имейл на потребителя" />
              </FormRow>

              <div className="my-3 border-t border-[#e4e9ee] pt-3">
                <p className="mb-2 flex items-center gap-2 text-[13px] font-bold text-[#3d4a56]">
                  <Icon name="grid" size={14} /> Настоящ адрес
                </p>
                <FormRow label="Режим Карта">
                  <div className="pt-1"><Toggle on={d.mapMode} onChange={(v) => set('mapMode', v)} /></div>
                </FormRow>
                <FormRow label="Адрес">
                  <AInput value={d.address} onChange={(e) => set('address', e.target.value)} placeholder="Адрес" />
                </FormRow>
                <FormRow label="Населено място">
                  <AInput value={d.city} onChange={(e) => set('city', e.target.value)} placeholder="Населено място" />
                </FormRow>
              </div>

              <div className="mt-3 rounded-[3px] border border-[#e4e9ee] bg-[#fafbfc] px-4 py-3 text-[12px] leading-relaxed text-ink-600">
                <p>
                  Ако желаете, може да зададете парола и да активирате профила. След това потребителят ще има
                  възможност да влезе в системата с въведените от вас потребителско име и парола.
                </p>
                <p className="mt-1.5">
                  <span className="text-[#e7505a]">*</span> Имайте предвид, че системата <b>няма да извести</b> потребителя,
                  че акаунтът му е активиран.
                </p>
                <p className="mt-1 text-[#e7505a]">
                  * Регистрация на ученици под 14 години изисква допълнително одобрение на профила от родител.
                </p>
                <div className="mt-2.5 flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-[#3d4a56]">Активен:</span>
                  <Toggle on={d.active} onChange={(v) => set('active', v)} />
                </div>
              </div>
            </div>
          )}

          {tab === 'role' && (
            <div className="flex min-h-[420px]">
              <div className="w-[210px] shrink-0 border-r border-[#e4e9ee] bg-[#fafbfc] py-2">
                {[
                  { id: 'data', label: 'Данни за ролята', icon: 'users' },
                  { id: 'experience', label: 'Трудов стаж', icon: 'archive' },
                  { id: 'extra', label: 'Допълнителни данни', icon: 'info' },
                  { id: 'position', label: 'Длъжност', icon: 'certificate' },
                  { id: 'education', label: 'Образование', icon: 'cap' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setRoleSide(s.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] ${
                      roleSide === s.id ? 'border-l-2 border-[#3598dc] bg-white font-semibold text-[#2b6ca3]' : 'text-ink-600 hover:bg-white'
                    }`}
                  >
                    <Icon name={s.icon} size={14} /> {s.label}
                  </button>
                ))}
              </div>

              <div className="min-w-0 flex-1 px-4 py-4">
                {roleSide === 'data' ? (
                  <>
                    <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#3d4a56]">
                      <Icon name="users" size={14} /> Данни за ролята
                    </p>

                    {d.roles.map((role, idx) => (
                      <div key={`${role || 'empty'}-${idx}`} className="mb-3 rounded-[3px] border border-[#e4e9ee] p-3">
                        <FormRow label="Роля" required>
                          <div className="flex items-center gap-1">
                            <ASelect
                              value={role}
                              onChange={(e) => {
                                const next = [...d.roles]
                                next[idx] = e.target.value as RoleDraft
                                set('roles', [...new Set(next)])
                              }}
                            >
                              <option value="">— Изберете роля —</option>
                              {ROLE_LIST.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </ASelect>
                            <button
                              type="button"
                              title="Премахни ролята"
                              onClick={() => {
                                const next = d.roles.filter((_, i) => i !== idx)
                                set('roles', next.length ? next : [''])
                              }}
                              className="grid h-[31px] w-[30px] shrink-0 place-items-center rounded-[3px] text-white"
                              style={{ background: '#e7505a' }}
                            >
                              <Icon name="close" size={13} strokeWidth={2.6} />
                            </button>
                          </div>
                        </FormRow>

                        {role !== '' && TEACH_ROLES.includes(role) && (
                          <>
                            <FormRow label="Начален учител" required>
                              <div className="pt-1"><Toggle on={d.initialTeacher} onChange={(v) => set('initialTeacher', v)} /></div>
                            </FormRow>
                            <FormRow label="Външен лектор" required>
                              <div className="pt-1"><Toggle on={d.externalLecturer} onChange={(v) => set('externalLecturer', v)} /></div>
                            </FormRow>
                            <FormRow label="Номер по образец">
                              <AInput value={d.sampleNo} onChange={(e) => set('sampleNo', e.target.value)} placeholder="Номер" />
                            </FormRow>
                            <FormRow
                              label="Предмети"
                              required
                              hint="Избраните предмети определят по кои предмети учителят вижда паралелките в „Дневник“. С „+“ добавяте още предмети към профила."
                            >
                              <SubjectPicker
                                items={subjects.map((s) => ({ id: s.id, label: s.name }))}
                                selected={d.subjectIds}
                                onChange={(ids) => set('subjectIds', ids)}
                              />
                            </FormRow>
                          </>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => set('roles', [...d.roles, ''])}
                      className="inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1.5 text-[12.5px] font-semibold text-white"
                      style={{ background: '#3598dc' }}
                    >
                      <Icon name="users" size={13} /> Добави роля
                    </button>
                  </>
                ) : (
                  <div className="grid place-items-center py-16 text-center">
                    <Icon name="info" size={22} className="text-ink-300" />
                    <p className="mt-2 text-[13px] font-semibold text-ink-700">Разделът е в подготовка</p>
                    <p className="mt-1 max-w-sm text-[12px] text-ink-500">
                      Тук ще се въвеждат данните от „{['Трудов стаж', 'Допълнителни данни', 'Длъжност', 'Образование'][['experience', 'extra', 'position', 'education'].indexOf(roleSide)]}“.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'access' && (
            <div className="px-4 py-5">
              <FormRow label="Потребителско име" required>
                <AInput value={d.username} onChange={(e) => set('username', e.target.value)} placeholder="напр. ivanova" />
              </FormRow>
              <FormRow label="Парола" hint="Минимум 6 символа. Потребителят може да я смени след първия вход.">
                <AInput value={d.password} onChange={(e) => set('password', e.target.value)} />
              </FormRow>
              <FormRow label="Активен профил">
                <div className="pt-1"><Toggle on={d.active} onChange={(v) => set('active', v)} /></div>
              </FormRow>
              <FormRow label="Роли">
                <div className="flex flex-wrap gap-1 pt-1">
                  {roleIds.map((r) => (
                    <span key={r} className="chip bg-brand-50 text-brand-700">{ROLE_MAP[r]?.name ?? r}</span>
                  ))}
                </div>
              </FormRow>
            </div>
          )}
        </div>
      </div>
    </AddPage>
  )
}

// ── Списък с потребители ────────────────────────────────────────────────────
export default function Potrebiteli() {
  const { db, update } = useApp()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [roleFilter, setRoleFilter] = useState('')
  const [form, setForm] = useState<{ open: boolean; editing?: User }>({ open: false })
  const [importOpen, setImportOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)

  /**
   * Отвореният профил и разделът в него живеят в адреса — така „Назад" в
   * браузъра връща към списъка, а връзката може да се сподели.
   */
  const setView = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    })
    setParams(next, { replace: true })
  }

  const openUser = db.users.find((u) => u.id === params.get('user'))
  const profileTab = params.get('utab') ?? 'main'

  const classOf = (u: User): string => {
    const sids = u.childrenIds ?? (u.studentId ? [u.studentId] : [])
    for (const sid of sids) {
      const st = db.students.find((s) => s.id === sid)
      if (st) return db.classes.find((c) => c.id === st.classId)?.name ?? '—'
    }
    const cid = u.classIds?.[0]
    if (cid) return db.classes.find((c) => c.id === cid)?.name ?? '—'
    return '—'
  }

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return db.users
      .filter((u) => {
        if (status === 'active' && !u.active) return false
        if (status === 'inactive' && u.active) return false
        if (roleFilter && !u.roles.includes(roleFilter as RoleId)) return false
        if (!term) return true
        return `${u.firstName} ${u.middleName ?? ''} ${u.lastName} ${u.username} ${u.email}`
          .toLowerCase().includes(term)
      })
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'bg'))
  }, [db.users, q, status, roleFilter])

  const remove = (u: User) => {
    if (!confirm(`Да се изтрие ли потребителят ${u.firstName} ${u.lastName}?`)) return
    update((d) => { d.users = d.users.filter((x) => x.id !== u.id) })
  }

  // ── отворен профил ───────────────────────────────────────────────────────
  if (openUser) {
    return (
      <>
        <UserProfile
          key={openUser.id}
          user={openUser}
          tab={profileTab}
          onTab={(t) => setView({ utab: t })}
          onBack={() => setView({ user: null, utab: null })}
          onEdit={() => setForm({ open: true, editing: openUser })}
        />
        {form.open && <UserForm editing={form.editing} onClose={() => setForm({ open: false })} />}
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Потребители"
        subtitle="Учители, ученици, родители и служители. Предметите на учителя се задават в раздел „Роля“ при създаването."
        icon="user"
      />

      <ListHead icon="user" title="Всички потребители" count={db.users.length} />

      <Toolbar>
        <ToolBtn tone="green" icon="plus" onClick={() => setForm({ open: true })}>Добави</ToolBtn>
        <ToolBtn tone="green" icon="upload" onClick={() => setImportOpen(true)}>Импорт Excel</ToolBtn>
        <ToolBtn tone="purple" icon="users" onClick={() => setMergeOpen(true)}>Обедини потребители</ToolBtn>
      </Toolbar>

      <div className="mb-0 flex flex-wrap items-center gap-1.5 border border-[#d7dee4] border-b-0 bg-white px-2 py-1.5">
        <span className="rounded-[2px] border border-[#c7d0d8] px-2 py-1 text-[11.5px] text-[#5b6b78]">50 реда</span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <span className="text-[11.5px] text-[#5b6b78]">Филтри</span>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Търсене…"
            className="!w-[180px] !rounded-[2px] !py-1 !text-[12px]"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="rounded-[2px] border border-[#c7d0d8] px-1.5 py-1 text-[11.5px] text-[#3d4a56]"
          >
            <option value="all">Всички статуси</option>
            <option value="active">Активни</option>
            <option value="inactive">Неактивни</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-[2px] border border-[#c7d0d8] px-1.5 py-1 text-[11.5px] text-[#3d4a56]"
          >
            <option value="">Всички роли</option>
            {ROLE_LIST.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      <Table
        className="!rounded-none"
        head={
          <>
            <th className="th">Име</th>
            <th className="th">Презиме</th>
            <th className="th">Фамилия</th>
            <th className="th">Роля</th>
            <th className="th w-28">Паралелка</th>
            <th className="th w-36">Телефон</th>
            <th className="th w-32">Статус</th>
            <th className="th w-24">Операции</th>
          </>
        }
      >
        {rows.map((u) => (
          <tr key={u.id} className="hover:bg-[#f6fafd]">
            <td className="td">
              <button
                onClick={() => setView({ user: u.id, utab: null })}
                className="flex items-center gap-2 text-left"
                title="Отвори профила"
              >
                <Avatar name={`${u.firstName} ${u.lastName}`} size={22} />
                <span className="dn-link font-semibold">{u.firstName}</span>
              </button>
            </td>
            <td className="td"><Dash>{u.middleName}</Dash></td>
            <td className="td">{u.lastName}</td>
            <td className="td text-[12.5px] text-ink-600">
              {u.roles.map((r) => ROLE_MAP[r]?.name ?? r).join(', ')}
            </td>
            <td className="td"><Dash>{classOf(u) === '—' ? undefined : classOf(u)}</Dash></td>
            <td className="td text-[12.5px]"><Dash>{u.phone}</Dash></td>
            <td className="td">
              {u.active ? (
                <span className="text-[12.5px] font-semibold text-[#1f7a45]">Активен</span>
              ) : (
                <span className="text-[12.5px] text-ink-500">Нов<br />(неактивен)</span>
              )}
            </td>
            <td className="td">
              <div className="flex items-center gap-1">
                <SquareAction tone="blue" title="Редакция" onClick={() => setForm({ open: true, editing: u })} />
                <SquareAction tone="red" icon="close" title="Изтриване" onClick={() => remove(u)} />
              </div>
            </td>
          </tr>
        ))}
        {!rows.length && <EmptyRow colSpan={8} text="Няма намерени потребители." />}
      </Table>

      {form.open && <UserForm editing={form.editing} onClose={() => setForm({ open: false })} />}
      {importOpen && <ImportUsers onClose={() => setImportOpen(false)} />}
      {mergeOpen && <MergeUsers onClose={() => setMergeOpen(false)} />}
    </>
  )
}

/** Импорт на потребители от списък, копиран от Excel (разделител — табулация или „;"). */
function ImportUsers({ onClose }: { onClose: () => void }) {
  const { update } = useApp()
  const [text, setText] = useState('')
  const [result, setResult] = useState('')

  const run = () => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) { setResult('Няма редове за импорт.'); return }

    // първо подготвяме записите — така броят е сигурен, преди да пишем в базата
    const prepared = lines
      .map((line, i) => {
        const parts = line.split(/\t|;/).map((p) => p.trim())
        if (parts.length < 2) return null
        const [firstName, lastName, roleName, email] = parts
        const role = ROLE_LIST.find((r) => r.name.toLowerCase() === (roleName ?? '').toLowerCase())?.id ?? 'teacher'
        const user: User = {
          id: `usr_imp_${Date.now()}_${i}`,
          username: `imp${Date.now().toString().slice(-5)}${i + 1}`,
          password: 'demo123',
          firstName,
          lastName,
          email: email ?? '',
          phone: '',
          roles: [role],
          classIds: [],
          subjectIds: [],
          active: true,
          createdAt: new Date().toISOString().slice(0, 10),
        }
        return user
      })
      .filter(Boolean) as User[]

    update((d) => { d.users.push(...prepared) })
    setResult(`Добавени ${prepared.length} потребителя. Паролата за всички е demo123.`)
    setText('')
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink-900/45 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-pop">
        <h3 className="mb-1 text-[14px] font-bold text-ink-900">Импорт на потребители</h3>
        <p className="mb-3 text-[12px] text-ink-500">
          Копирайте редовете от Excel. Колони: <b>Име</b>, <b>Фамилия</b>, <b>Роля</b>, <b>Имейл</b> — разделени с табулация или „;“.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder={'Мария\tИванова\tУчител\tmaria@school.bg\nПетър\tГеоргиев\tУченик\t'}
          className="w-full rounded-[3px] border border-[#c7d0d8] px-2.5 py-2 font-mono text-[12px] outline-none focus:border-[#3598dc]"
        />
        {result && <p className="mt-2 text-[12px] font-semibold text-[#1f7a45]">{result}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[3px] border border-ink-200 px-3 py-1.5 text-[12.5px] font-semibold text-ink-600 hover:bg-ink-50">Затвори</button>
          <button type="button" onClick={run} className="rounded-[3px] px-3 py-1.5 text-[12.5px] font-semibold text-white" style={{ background: '#26c281' }}>Импортирай</button>
        </div>
      </div>
    </div>
  )
}

/** Откриване на дублирани потребители (едно и също име) и обединяване. */
function MergeUsers({ onClose }: { onClose: () => void }) {
  const { db, update } = useApp()
  const [done, setDone] = useState<string[]>([])

  const pairs = useMemo(() => {
    const map = new Map<string, User[]>()
    db.users.forEach((u) => {
      const key = `${u.firstName} ${u.lastName}`.toLowerCase().trim()
      if (!key) return
      map.set(key, [...(map.get(key) ?? []), u])
    })
    return [...map.entries()].filter(([, list]) => list.length > 1)
  }, [db.users])

  const merge = (list: User[]) => {
    const [keep, ...rest] = list
    update((d) => {
      const k = d.users.find((u) => u.id === keep.id)
      if (!k) return
      rest.forEach((r) => {
        k.childrenIds = [...new Set([...(k.childrenIds ?? []), ...(r.childrenIds ?? [])])]
        k.subjectIds = [...new Set([...(k.subjectIds ?? []), ...(r.subjectIds ?? [])])]
        k.classIds = [...new Set([...(k.classIds ?? []), ...(r.classIds ?? [])])]
        k.roles = [...new Set([...k.roles, ...r.roles])]
        if (!k.email && r.email) k.email = r.email
        if (!k.phone && r.phone) k.phone = r.phone
      })
      d.users = d.users.filter((u) => !rest.some((r) => r.id === u.id))
    })
    setDone((v) => [...v, keep.id])
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink-900/45 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-4 shadow-pop">
        <h3 className="mb-1 text-[14px] font-bold text-ink-900">Обединяване на потребители</h3>
        <p className="mb-3 text-[12px] text-ink-500">
          Открити са {pairs.length} групи с еднакви имена. При обединяване се запазва първият профил и
          към него се добавят децата, предметите и паралелките на останалите.
        </p>
        <div className="max-h-[320px] space-y-2 overflow-y-auto">
          {pairs.map(([name, list]) => (
            <div key={name} className="flex items-center justify-between gap-3 rounded-[3px] border border-[#e4e9ee] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-ink-900">{list[0].firstName} {list[0].lastName}</p>
                <p className="truncate text-[11.5px] text-ink-500">
                  {list.map((u) => u.username || '—').join(', ')} · {list.length} профила
                </p>
              </div>
              {done.includes(list[0].id) ? (
                <span className="text-[11.5px] font-semibold text-[#1f7a45]">обединени</span>
              ) : (
                <button
                  type="button"
                  onClick={() => merge(list)}
                  className="shrink-0 rounded-[3px] px-2.5 py-1 text-[11.5px] font-semibold text-white"
                  style={{ background: '#3598dc' }}
                >
                  Обедини
                </button>
              )}
            </div>
          ))}
          {!pairs.length && <p className="py-6 text-center text-[12.5px] text-ink-400">Няма дублирани потребители.</p>}
        </div>
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-[3px] border border-ink-200 px-3 py-1.5 text-[12.5px] font-semibold text-ink-600 hover:bg-ink-50">Затвори</button>
        </div>
      </div>
    </div>
  )
}
