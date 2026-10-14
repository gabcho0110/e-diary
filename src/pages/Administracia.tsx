import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import { ROLES, ROLE_MAP } from '../lib/roles'
import { MODULES } from '../lib/modules'
import type { RoleId, User } from '../lib/types'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, SearchInput, Select, Stat, Table, Tabs, formatDate } from '../components/ui'

export default function Administracia() {
  const { db, update, addUser, updateUser, userName, className, subjectName, resetDemo } = useApp()
  const [tab, setTab] = useState('classes')
  const [q, setQ] = useState('')
  const [openClass, setOpenClass] = useState(false)
  const [openUser, setOpenUser] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)

  const [clsForm, setClsForm] = useState({ grade: 8, letter: 'В', profile: '', homeroom: '', shift: 1 })
  const [usrForm, setUsrForm] = useState({
    firstName: '', lastName: '', username: '', password: 'demo123',
    email: '', phone: '', roles: ['teacher'] as RoleId[],
  })

  const users = useMemo(
    () => db.users.filter((u) => `${u.firstName} ${u.lastName} ${u.username} ${u.email}`.toLowerCase().includes(q.toLowerCase())),
    [db.users, q],
  )

  const teachers = db.users.filter((u) => u.roles.some((r) => ['teacher', 'class_teacher'].includes(r)))

  return (
    <>
      <PageHeader
        title="Администрация"
        subtitle="Паралелки, предмети, потребители, права, учебни срокове и настройки на училището."
        icon="settings"
        actions={
          <div className="flex flex-wrap gap-2">
            {tab === 'classes' && <button onClick={() => setOpenClass(true)} className="btn-primary"><Icon name="plus" size={15} /> Нова паралелка</button>}
            {tab === 'users' && <button onClick={() => setOpenUser(true)} className="btn-primary"><Icon name="plus" size={15} /> Нов потребител</button>}
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Паралелки" value={db.classes.length} icon="grid" />
        <Stat label="Ученици" value={db.students.length} icon="person" tone="brand" />
        <Stat label="Потребители" value={db.users.length} icon="user" tone="ok" />
        <Stat label="Предмети" value={db.subjects.length} icon="list" tone="purple" />
      </div>

      <Tabs
        tabs={[
          { id: 'classes', label: 'Паралелки', count: db.classes.length },
          { id: 'subjects', label: 'Предмети', count: db.subjects.length },
          { id: 'users', label: 'Потребители', count: db.users.length },
          { id: 'rights', label: 'Права и достъп' },
          { id: 'school', label: 'Училище' },
          { id: 'years', label: 'Учебна година' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'classes' && (
        <Table
          head={<><th className="th w-20">Клас</th><th className="th">Профил</th><th className="th">Класен ръководител</th><th className="th w-24">Ученици</th><th className="th w-24">Предмети</th><th className="th w-24">Смяна</th><th className="th w-28">Стая</th><th className="th w-12"></th></>}
        >
          {db.classes.map((k) => (
            <tr key={k.id} className="hover:bg-ink-50/60">
              <td className="td font-bold">{k.name}</td>
              <td className="td text-[13px] text-ink-600">{k.profile || <span className="text-ink-400">общообразователна</span>}</td>
              <td className="td">
                <Select
                  value={k.homeroomTeacherId ?? ''}
                  onChange={(e) => update((d) => {
                    const c = d.classes.find((x) => x.id === k.id)
                    if (c) c.homeroomTeacherId = e.target.value || null
                  })}
                  className="!py-1 text-[12px]"
                >
                  <option value="">— няма —</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </Select>
              </td>
              <td className="td">{k.studentIds.length}</td>
              <td className="td">{k.subjectIds.length}</td>
              <td className="td">{k.shift}</td>
              <td className="td text-[13px] text-ink-500">{db.rooms.find((r) => r.id === k.roomId)?.name ?? '—'}</td>
              <td className="td">
                <button
                  onClick={() => {
                    if (!confirm(`Да се изтрие ли паралелка ${k.name}? Това е необратимо.`)) return
                    update((d) => { d.classes = d.classes.filter((x) => x.id !== k.id) })
                  }}
                  className="text-ink-300 hover:text-danger"
                >
                  <Icon name="trash" size={15} />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {tab === 'subjects' && (
        <Table head={<><th className="th">Предмет</th><th className="th w-24">Съкр.</th><th className="th w-40">Вид подготовка</th><th className="th">Учители</th><th className="th w-24">Паралелки</th></>}>
          {db.subjects.map((s) => {
            const ts = db.users.filter((u) => u.subjectIds?.includes(s.id))
            const ks = db.classes.filter((k) => k.subjectIds.includes(s.id))
            return (
              <tr key={s.id} className="hover:bg-ink-50/60">
                <td className="td font-medium">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: s.color }} />
                  {s.name}
                </td>
                <td className="td font-mono text-[12px]">{s.short}</td>
                <td className="td"><Badge tone="brand">{s.kind}</Badge></td>
                <td className="td text-[13px] text-ink-600">{ts.slice(0, 3).map((t) => `${t.firstName} ${t.lastName}`).join(', ') || '—'}</td>
                <td className="td">{ks.length}</td>
              </tr>
            )
          })}
        </Table>
      )}

      {tab === 'users' && (
        <>
          <div className="mb-3"><SearchInput value={q} onChange={setQ} placeholder="Търсене по име, потребител или имейл…" /></div>
          <Table
            head={<><th className="th">Име</th><th className="th w-40">Потребителско име</th><th className="th">Роли</th><th className="th w-32">Статус</th><th className="th w-28">2FA</th><th className="th w-12"></th></>}
          >
            {users.slice(0, 60).map((u) => (
              <tr key={u.id} className="hover:bg-ink-50/60">
                <td className="td">
                  <p className="font-medium">{u.firstName} {u.lastName}</p>
                  <p className="text-[11px] text-ink-500">{u.email}</p>
                </td>
                <td className="td font-mono text-[12px]">{u.username}</td>
                <td className="td">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => <Badge key={r} tone="neutral">{ROLE_MAP[r]?.short ?? r}</Badge>)}
                  </div>
                </td>
                <td className="td">
                  <button
                    onClick={() => updateUser(u.id, { active: !u.active })}
                    className={`chip ${u.active ? 'bg-[#e6f4ea] text-[#1f7a45]' : 'bg-[#fde8e8] text-[#b42318]'}`}
                  >
                    {u.active ? 'активен' : 'деактивиран'}
                  </button>
                </td>
                <td className="td">{u.twoFactor ? <Badge tone="ok">включена</Badge> : <Badge tone="neutral">изключена</Badge>}</td>
                <td className="td"><button onClick={() => setEditUser(u)} className="text-ink-400 hover:text-brand-700"><Icon name="edit" size={15} /></button></td>
              </tr>
            ))}
          </Table>
          {users.length > 60 && <p className="mt-2 text-[12px] text-ink-400">Показани първите 60 от {users.length} потребители.</p>}
        </>
      )}

      {tab === 'rights' && (
        <Card pad={false}>
          <div className="border-b border-ink-200 px-5 py-3.5">
            <h2 className="font-bold text-ink-900">Матрица на правата по модули</h2>
            <p className="text-[12px] text-ink-500">Кои роли имат достъп до всеки от 29-те модула.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead className="bg-ink-50">
                <tr>
                  <th className="th sticky left-0 bg-ink-50">Модул</th>
                  {ROLES.map((r) => (
                    <th key={r.id} className="th whitespace-nowrap px-1.5 text-center" title={r.name}>
                      {r.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {MODULES.map((m) => (
                  <tr key={m.id} className="hover:bg-ink-50/60">
                    <td className="td sticky left-0 whitespace-nowrap bg-white font-medium">{m.name}</td>
                    {ROLES.map((r) => (
                      <td key={r.id} className="td px-1.5 text-center">
                        {m.roles.includes(r.id)
                          ? <span className="inline-block h-2.5 w-2.5 rounded-full bg-ok" />
                          : <span className="inline-block h-2.5 w-2.5 rounded-full bg-ink-200" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'school' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 font-bold text-ink-900">Данни за училището</h2>
            <div className="grid gap-3">
              <Field label="Наименование">
                <Input defaultValue={db.school.name} onBlur={(e) => update((d) => { d.school.name = e.target.value })} />
              </Field>
              <Field label="Град">
                <Input defaultValue={db.school.city} onBlur={(e) => update((d) => { d.school.city = e.target.value })} />
              </Field>
              <Field label="Адрес">
                <Input defaultValue={db.school.address} onBlur={(e) => update((d) => { d.school.address = e.target.value })} />
              </Field>
              <Field label="Директор">
                <Input defaultValue={db.school.principal} onBlur={(e) => update((d) => { d.school.principal = e.target.value })} />
              </Field>
              <Field label="Телефон">
                <Input defaultValue={db.school.phone} onBlur={(e) => update((d) => { d.school.phone = e.target.value })} />
              </Field>
              <Field label="Имейл">
                <Input defaultValue={db.school.email} onBlur={(e) => update((d) => { d.school.email = e.target.value })} />
              </Field>
              <Field label="Уебсайт">
                <Input defaultValue={db.school.website} onBlur={(e) => update((d) => { d.school.website = e.target.value })} />
              </Field>
            </div>
          </Card>

          <div className="space-y-5">
            <Card>
              <h2 className="mb-4 font-bold text-ink-900">Настройки на дневника</h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between rounded-lg border border-ink-200 px-4 py-3">
                  <span className="text-[13px] font-medium text-ink-700">Стриктен режим (заключване на минали дати)</span>
                  <input
                    type="checkbox"
                    checked={db.school.strictMode}
                    onChange={(e) => update((d) => { d.school.strictMode = e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-ink-200 px-4 py-3">
                  <span className="text-[13px] font-medium text-ink-700">Автоматично уважаване на отсъствия</span>
                  <input
                    type="checkbox"
                    checked={db.school.autoExcuse}
                    onChange={(e) => update((d) => { d.school.autoExcuse = e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                </label>
                <Field label="Дневникът е заключен до">
                  <Input
                    type="date"
                    defaultValue={db.school.diaryLockedUntil ?? ''}
                    onBlur={(e) => update((d) => { d.school.diaryLockedUntil = e.target.value || null })}
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 font-bold text-ink-900">Демо данни</h2>
              <p className="mb-3 text-[13px] text-ink-500">
                Връща училището към първоначалния набор от данни. Всички направени промени ще бъдат загубени.
              </p>
              <button
                onClick={() => { if (confirm('Да се върнат ли демо данните? Промените ще бъдат загубени.')) resetDemo() }}
                className="btn-danger"
              >
                <Icon name="sync" size={15} /> Върни демо данните
              </button>
            </Card>
          </div>
        </div>
      )}

      {tab === 'years' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 font-bold text-ink-900">Учебни срокове</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Първи срок — от">
                <Input type="date" defaultValue={db.school.term1.from} onBlur={(e) => update((d) => { d.school.term1.from = e.target.value })} />
              </Field>
              <Field label="Първи срок — до">
                <Input type="date" defaultValue={db.school.term1.to} onBlur={(e) => update((d) => { d.school.term1.to = e.target.value })} />
              </Field>
              <Field label="Втори срок — от">
                <Input type="date" defaultValue={db.school.term2.from} onBlur={(e) => update((d) => { d.school.term2.from = e.target.value })} />
              </Field>
              <Field label="Втори срок — до">
                <Input type="date" defaultValue={db.school.term2.to} onBlur={(e) => update((d) => { d.school.term2.to = e.target.value })} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Учебна година">
                <Input defaultValue={db.school.year} onBlur={(e) => update((d) => { d.school.year = e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card pad={false}>
            <div className="border-b border-ink-200 px-5 py-3.5">
              <h2 className="font-bold text-ink-900">Неучебни дни</h2>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-5">
              <div className="flex flex-wrap gap-1.5">
                {db.school.nonSchoolDays.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1 text-[12px]">
                    {formatDate(d)}
                    <button
                      onClick={() => update((x) => { x.school.nonSchoolDays = x.school.nonSchoolDays.filter((y) => y !== d) })}
                      className="text-ink-400 hover:text-danger"
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Input
                  type="date"
                  id="new-nonschool"
                  className="flex-1"
                />
                <button
                  onClick={() => {
                    const el = document.getElementById('new-nonschool') as HTMLInputElement
                    if (el?.value) update((d) => { d.school.nonSchoolDays = [...d.school.nonSchoolDays, el.value].sort() })
                  }}
                  className="btn-primary shrink-0"
                >
                  Добави
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={openClass} onClose={() => setOpenClass(false)} title="Нова паралелка"
        footer={
          <>
            <button onClick={() => setOpenClass(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                update((d) => {
                  d.classes.push({
                    id: `cls_${Date.now()}`, grade: clsForm.grade, letter: clsForm.letter,
                    name: `${clsForm.grade}-${clsForm.letter}`, profile: clsForm.profile,
                    homeroomTeacherId: clsForm.homeroom || null,
                    studentIds: [], subjectIds: d.subjects.slice(0, 10).map((s) => s.id),
                    shift: clsForm.shift as 1 | 2, form: 'дневна',
                  })
                })
                setOpenClass(false)
              }}
              className="btn-primary"
            >
              Създай
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Клас (число)"><Input type="number" value={clsForm.grade} onChange={(e) => setClsForm({ ...clsForm, grade: Number(e.target.value) })} /></Field>
          <Field label="Буква"><Input value={clsForm.letter} onChange={(e) => setClsForm({ ...clsForm, letter: e.target.value })} maxLength={2} /></Field>
          <div className="sm:col-span-2">
            <Field label="Профил"><Input value={clsForm.profile} onChange={(e) => setClsForm({ ...clsForm, profile: e.target.value })} placeholder="напр. Софтуерни и хардуерни науки" /></Field>
          </div>
          <Field label="Класен ръководител">
            <Select value={clsForm.homeroom} onChange={(e) => setClsForm({ ...clsForm, homeroom: e.target.value })}>
              <option value="">— няма —</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </Select>
          </Field>
          <Field label="Смяна">
            <Select value={clsForm.shift} onChange={(e) => setClsForm({ ...clsForm, shift: Number(e.target.value) })}>
              <option value={1}>Първа</option><option value={2}>Втора</option>
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={openUser} onClose={() => setOpenUser(false)} title="Нов потребител"
        footer={
          <>
            <button onClick={() => setOpenUser(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!usrForm.firstName || !usrForm.username) return
                addUser({ ...usrForm, roles: usrForm.roles })
                setOpenUser(false)
              }}
              className="btn-primary"
            >
              Създай
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Име"><Input value={usrForm.firstName} onChange={(e) => setUsrForm({ ...usrForm, firstName: e.target.value })} /></Field>
          <Field label="Фамилия"><Input value={usrForm.lastName} onChange={(e) => setUsrForm({ ...usrForm, lastName: e.target.value })} /></Field>
          <Field label="Потребителско име"><Input value={usrForm.username} onChange={(e) => setUsrForm({ ...usrForm, username: e.target.value })} /></Field>
          <Field label="Парола"><Input value={usrForm.password} onChange={(e) => setUsrForm({ ...usrForm, password: e.target.value })} /></Field>
          <Field label="Имейл"><Input value={usrForm.email} onChange={(e) => setUsrForm({ ...usrForm, email: e.target.value })} /></Field>
          <Field label="Телефон"><Input value={usrForm.phone} onChange={(e) => setUsrForm({ ...usrForm, phone: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Field label="Роли" hint="Може да изберете повече от една роля.">
              <div className="grid max-h-[180px] grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-ink-200 p-2.5">
                {ROLES.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-ink-50">
                    <input
                      type="checkbox"
                      checked={usrForm.roles.includes(r.id)}
                      onChange={(e) => setUsrForm({
                        ...usrForm,
                        roles: e.target.checked
                          ? [...usrForm.roles, r.id]
                          : usrForm.roles.filter((x) => x !== r.id),
                      })}
                      className="h-4 w-4 rounded"
                    />
                    <span className="truncate">{r.name}</span>
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!editUser} onClose={() => setEditUser(null)} title="Редакция на потребител"
        footer={<button onClick={() => setEditUser(null)} className="btn-primary">Готово</button>}
      >
        {editUser && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Име"><Input defaultValue={editUser.firstName} onBlur={(e) => updateUser(editUser.id, { firstName: e.target.value })} /></Field>
            <Field label="Фамилия"><Input defaultValue={editUser.lastName} onBlur={(e) => updateUser(editUser.id, { lastName: e.target.value })} /></Field>
            <Field label="Имейл"><Input defaultValue={editUser.email} onBlur={(e) => updateUser(editUser.id, { email: e.target.value })} /></Field>
            <Field label="Телефон"><Input defaultValue={editUser.phone} onBlur={(e) => updateUser(editUser.id, { phone: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Field label="Нова парола" hint="Оставете празно, за да не се променя.">
                <Input type="text" onBlur={(e) => { if (e.target.value) updateUser(editUser.id, { password: e.target.value }) }} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Роли">
                <div className="grid max-h-[180px] grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-ink-200 p-2.5">
                  {ROLES.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-ink-50">
                      <input
                        type="checkbox"
                        checked={editUser.roles.includes(r.id)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...editUser.roles, r.id]
                            : editUser.roles.filter((x) => x !== r.id)
                          updateUser(editUser.id, { roles: next })
                          setEditUser({ ...editUser, roles: next })
                        }}
                        className="h-4 w-4 rounded"
                      />
                      <span className="truncate">{r.name}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
