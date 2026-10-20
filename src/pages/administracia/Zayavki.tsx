import { useMemo } from 'react'
import { useApp } from '../../store/AppContext'
import { ROLES, ROLE_MAP } from '../../lib/roles'
import { MODULES } from '../../lib/modules'
import { Avatar, PageHeader, Table } from '../../components/ui'
import { Dash, EmptyRow, ListHead, SquareAction, ToolBtn, Toolbar } from './shared'

/** „Потребителски групи" — групите по роля и достъпът им до модулите. */
export function Grupi() {
  const { db } = useApp()

  const groups = useMemo(() => {
    const map = new Map<string, { users: number; roles: string[] }>()
    ROLES.forEach((r) => {
      const g = map.get(r.group) ?? { users: 0, roles: [] }
      g.users += db.users.filter((u) => u.roles.includes(r.id)).length
      g.roles.push(r.name)
      map.set(r.group, g)
    })
    return [...map.entries()]
  }, [db.users])

  const modulesForRole = (roleName: string) => {
    const role = ROLES.find((r) => r.name === roleName)
    if (!role) return 0
    return MODULES.filter((m) => m.roles.includes(role.id)).length
  }

  return (
    <>
      <PageHeader
        title="Потребителски групи"
        subtitle="Групите се образуват от ролите. Всяка роля вижда само модулите, които ѝ са разрешени."
        icon="meet"
      />

      <ListHead icon="meet" title="Групи по роли" count={groups.length} />

      <Table
        head={
          <>
            <th className="th">Група</th>
            <th className="th">Роли</th>
            <th className="th w-32">Потребители</th>
            <th className="th w-28">Модули</th>
          </>
        }
      >
        {groups.map(([name, g]) => (
          <tr key={name} className="hover:bg-[#f6fafd]">
            <td className="td font-semibold">{name}</td>
            <td className="td text-[12.5px] text-ink-600">{g.roles.join(', ')}</td>
            <td className="td"><span className="dn-num dn-olive">{g.users}</span></td>
            <td className="td">
              {Math.max(...g.roles.map(modulesForRole))}
            </td>
          </tr>
        ))}
        {!groups.length && <EmptyRow colSpan={4} text="Няма групи." />}
      </Table>

      <div className="mt-4 rounded border border-[#d7dee4] bg-white">
        <p className="border-b border-[#e4e9ee] px-4 py-2.5 text-[13px] font-bold text-[#3d4a56]">Роли и достъп</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-ink-50">
              <tr>
                <th className="th">Роля</th>
                <th className="th">Описание</th>
                <th className="th w-28">Потребители</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {ROLES.map((r) => (
                <tr key={r.id} className="hover:bg-[#f6fafd]">
                  <td className="td font-semibold">{r.name}</td>
                  <td className="td text-[12.5px] text-ink-600">{r.desc}</td>
                  <td className="td">{db.users.filter((u) => u.roles.includes(r.id)).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

/** „Заявки за изтриване" — искания на учители при включен стриктен режим. */
export function Zayavki() {
  const { db, update } = useApp()

  const decide = (id: string, status: 'одобрена' | 'отхвърлена') =>
    update((d) => {
      const r = d.deleteRequests.find((x) => x.id === id)
      if (r) r.status = status
    })

  const pending = db.deleteRequests.filter((r) => r.status === 'чакаща').length

  return (
    <>
      <PageHeader title="Заявки за изтриване" subtitle="Искания за премахване на оценки, отсъствия и отзиви, когато е включен стриктен режим." icon="close" />

      <ListHead icon="close" title="Всички заявки" count={db.deleteRequests.length} />

      <Toolbar>
        <ToolBtn tone="gold" icon="filter">Чакащи: {pending}</ToolBtn>
      </Toolbar>

      <Table
        head={
          <>
            <th className="th">Вид</th>
            <th className="th">Ученик</th>
            <th className="th">Паралелка</th>
            <th className="th">Основание</th>
            <th className="th">Подадена от</th>
            <th className="th w-28">Статус</th>
            <th className="th w-28">Операции</th>
          </>
        }
      >
        {db.deleteRequests.map((r) => {
          const student = db.students.find((s) => s.id === r.studentId)
          const author = db.users.find((u) => u.id === r.requestedById)
          return (
            <tr key={r.id} className="hover:bg-[#f6fafd]">
              <td className="td font-semibold">{r.kind}</td>
              <td className="td"><Dash>{student ? `${student.firstName} ${student.lastName}` : undefined}</Dash></td>
              <td className="td"><Dash>{db.classes.find((c) => c.id === r.classId)?.name}</Dash></td>
              <td className="td text-[12.5px] text-ink-600"><Dash>{r.reason}</Dash></td>
              <td className="td text-[12.5px]"><Dash>{author ? `${author.firstName} ${author.lastName}` : undefined}</Dash></td>
              <td className="td">
                <span className={`chip ${r.status === 'одобрена' ? 'bg-[#e6f4ea] text-[#1f7a45]' : r.status === 'отхвърлена' ? 'bg-[#fde8e8] text-[#b42318]' : 'bg-[#fdf0e3] text-[#b25e09]'}`}>
                  {r.status}
                </span>
              </td>
              <td className="td">
                {r.status === 'чакаща' ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => decide(r.id, 'одобрена')}
                      className="rounded-[3px] px-2 py-1 text-[11.5px] font-semibold text-white"
                      style={{ background: '#26c281' }}
                    >
                      Одобри
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(r.id, 'отхвърлена')}
                      className="rounded-[3px] px-2 py-1 text-[11.5px] font-semibold text-white"
                      style={{ background: '#e7505a' }}
                    >
                      Откажи
                    </button>
                  </div>
                ) : (
                  <span className="text-[11.5px] text-ink-400">приключена</span>
                )}
              </td>
            </tr>
          )
        })}
        {!db.deleteRequests.length && <EmptyRow colSpan={7} text="Няма подадени заявки." />}
      </Table>
    </>
  )
}

/** „Нови регистрации" — профили, които чакат активиране. */
export function Registracii() {
  const { db, update } = useApp()

  const rows = db.users
    .filter((u) => !u.active || !u.username)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

  return (
    <>
      <PageHeader title="Нови регистрации" subtitle="Профили, създадени от родител или от училището, които още не са активирани." icon="userPlus" />

      <ListHead icon="userPlus" title="Чакащи активиране" count={rows.length} />

      <Table
        head={
          <>
            <th className="th">Име</th>
            <th className="th">Роля</th>
            <th className="th">Имейл</th>
            <th className="th w-32">Създаден</th>
            <th className="th w-32">Операции</th>
          </>
        }
      >
        {rows.map((u) => (
          <tr key={u.id} className="hover:bg-[#f6fafd]">
            <td className="td">
              <span className="flex items-center gap-2">
                <Avatar name={`${u.firstName} ${u.lastName}`} size={22} />
                <span className="font-medium">{u.firstName} {u.lastName}</span>
              </span>
            </td>
            <td className="td text-[12.5px]">{u.roles.map((r) => ROLE_MAP[r]?.name ?? r).join(', ')}</td>
            <td className="td text-[12.5px]"><Dash>{u.email}</Dash></td>
            <td className="td text-[12.5px]">{u.createdAt}</td>
            <td className="td">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => update((d) => {
                    const x = d.users.find((y) => y.id === u.id)
                    if (x) {
                      x.active = true
                      if (!x.username) x.username = `u${Date.now().toString().slice(-5)}`
                      if (!x.password) x.password = 'demo123'
                    }
                  })}
                  className="rounded-[3px] px-2 py-1 text-[11.5px] font-semibold text-white"
                  style={{ background: '#26c281' }}
                >
                  Активирай
                </button>
                <SquareAction
                  tone="red"
                  icon="close"
                  title="Изтриване"
                  onClick={() => update((d) => { d.users = d.users.filter((x) => x.id !== u.id) })}
                />
              </div>
            </td>
          </tr>
        ))}
        {!rows.length && <EmptyRow colSpan={5} text="Няма чакащи регистрации." />}
      </Table>
    </>
  )
}

/** „Нови снимки" — качени от класния ръководител снимки, чакащи одобрение. */
export function Snimki() {
  const { db, update } = useApp()
  const rows = db.students.filter((s) => s.photoPending)

  return (
    <>
      <PageHeader title="Нови снимки" subtitle="Снимки на ученици, качени от класния ръководител и чакащи одобрение." icon="upload" />

      <ListHead icon="upload" title="Чакащи одобрение" count={rows.length} />

      <Table
        head={
          <>
            <th className="th">Ученик</th>
            <th className="th">Паралелка</th>
            <th className="th w-32">Номер</th>
            <th className="th w-40">Операции</th>
          </>
        }
      >
        {rows.map((s) => (
          <tr key={s.id} className="hover:bg-[#f6fafd]">
            <td className="td">
              <span className="flex items-center gap-2">
                <Avatar name={`${s.firstName} ${s.lastName}`} size={22} />
                <span className="font-medium">{s.firstName} {s.lastName}</span>
              </span>
            </td>
            <td className="td"><Dash>{db.classes.find((c) => c.id === s.classId)?.name}</Dash></td>
            <td className="td">{s.number}</td>
            <td className="td">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => update((d) => {
                    const x = d.students.find((y) => y.id === s.id)
                    if (x) x.photoPending = false
                  })}
                  className="rounded-[3px] px-2 py-1 text-[11.5px] font-semibold text-white"
                  style={{ background: '#26c281' }}
                >
                  Одобри
                </button>
                <button
                  type="button"
                  onClick={() => update((d) => {
                    const x = d.students.find((y) => y.id === s.id)
                    if (x) { x.photoPending = false; x.photo = undefined }
                  })}
                  className="rounded-[3px] px-2 py-1 text-[11.5px] font-semibold text-white"
                  style={{ background: '#e7505a' }}
                >
                  Откажи
                </button>
              </div>
            </td>
          </tr>
        ))}
        {!rows.length && <EmptyRow colSpan={4} text="Няма снимки, чакащи одобрение." />}
      </Table>
    </>
  )
}
