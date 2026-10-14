import { useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { GROUPS, type ModuleDef } from '../lib/modules'
import { ROLE_MAP, roleNames } from '../lib/roles'
import { Avatar, Badge, Icon } from './ui'

function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const { db, user, myModules, logout } = useApp()
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return term ? myModules.filter((m) => m.name.toLowerCase().includes(term)) : myModules
  }, [q, myModules])

  const byGroup = useMemo(() => {
    const map = new Map<string, ModuleDef[]>()
    GROUPS.forEach((g) => {
      const items = filtered.filter((m) => m.group === g)
      if (items.length) map.set(g, items)
    })
    return map
  }, [filtered])

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-ink-800/40 bg-ink-900 transition-[width] duration-200 ${
        collapsed ? 'w-[68px]' : 'w-[248px]'
      }`}
    >
      {/* училище */}
      <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-white">
          <Icon name="school" size={19} />
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold leading-tight text-white">{db.school.name}</p>
            <p className="truncate text-[11px] text-white/50">Учебна {db.school.year}</p>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"><Icon name="search" size={15} /></span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Търсене в модулите…"
              className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-2 text-[13px] text-white placeholder:text-white/35 outline-none focus:border-brand-500/60"
            />
          </div>
        </div>
      )}

      <nav className="mt-2 flex-1 overflow-y-auto px-2 pb-4">
        {[...byGroup.entries()].map(([group, items]) => (
          <div key={group} className="mb-1">
            {!collapsed && (
              <p className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-white/35">{group}</p>
            )}
            {items.map((m) => (
              <NavLink
                key={m.id}
                to={m.path}
                title={collapsed ? m.name : undefined}
                className={({ isActive }) =>
                  `group mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                    isActive ? 'bg-brand-600 text-white' : 'text-white/70 hover:bg-white/8 hover:text-white'
                  }`
                }
              >
                <span className="shrink-0"><Icon name={m.icon} size={17} /></span>
                {!collapsed && <span className="truncate">{m.name}</span>}
              </NavLink>
            ))}
          </div>
        ))}
        {filtered.length === 0 && !collapsed && (
          <p className="px-2 py-6 text-center text-xs text-white/40">Няма намерен модул</p>
        )}
      </nav>

      <div className="border-t border-white/10 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mb-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-white/60 hover:bg-white/8 hover:text-white"
        >
          <Icon name="chevron" size={17} className={collapsed ? '' : 'rotate-180'} />
          {!collapsed && <span>Свий менюто</span>}
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-white/60 hover:bg-white/8 hover:text-white"
        >
          <Icon name="logout" size={17} />
          {!collapsed && <span>Изход</span>}
        </button>
        {!collapsed && user && (
          <p className="px-2.5 pt-2 text-[10px] leading-tight text-white/30">
            {roleNames(user.roles)}
          </p>
        )}
      </div>
    </aside>
  )
}

function UserMenu() {
  const { db, user, logout, loginAs } = useApp()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  if (!user) return null

  const demoUsers = db.users.filter((u) =>
    ['admin', 'direktor', 'zam', 'ucitel', 'klasen', 'roditel', 'ucenik', 'psiholog', 'logoped',
      'schetovoditel', 'sekretar', 'bibliotekar', 'medsestra', 'vazpitatel', 'resursen', 'gost'].includes(u.username),
  )

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-ink-100"
      >
        <Avatar name={`${user.firstName} ${user.lastName}`} size={30} />
        <span className="hidden text-left sm:block">
          <span className="block text-[13px] font-semibold leading-tight text-ink-900">
            {user.firstName} {user.lastName}
          </span>
          <span className="block text-[11px] leading-tight text-ink-500">{ROLE_MAP[user.roles[0]]?.name ?? '—'}</span>
        </span>
        <Icon name="chevronDown" size={15} className="text-ink-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1.5 w-[300px] rounded-xl border border-ink-200 bg-white p-1.5 shadow-pop">
            <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
              <Avatar name={`${user.firstName} ${user.lastName}`} size={38} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {user.firstName} {user.middleName} {user.lastName}
                </p>
                <p className="truncate text-xs text-ink-500">{user.email}</p>
              </div>
            </div>
            <div className="my-1 border-t border-ink-100" />
            <button
              onClick={() => { setOpen(false); navigate('/profil') }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
            >
              <Icon name="person" size={16} /> Моят профил
            </button>
            <button
              onClick={() => { setOpen(false); navigate('/profil?tab=security') }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
            >
              <Icon name="lock" size={16} /> Сигурност и 2FA
            </button>

            <div className="my-1 border-t border-ink-100" />
            <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
              Влез като (демо роли)
            </p>
            <div className="max-h-[240px] overflow-y-auto">
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { loginAs(u.id); setOpen(false) }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-ink-50 ${
                    u.id === user.id ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-700'
                  }`}
                >
                  <Avatar name={`${u.firstName} ${u.lastName}`} size={24} />
                  <span className="min-w-0 flex-1 truncate">{ROLE_MAP[u.roles[0]]?.name}</span>
                  <span className="shrink-0 font-mono text-[10px] text-ink-400">{u.username}</span>
                </button>
              ))}
            </div>

            <div className="my-1 border-t border-ink-100" />
            <button
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-danger hover:bg-[#fde8e8]"
            >
              <Icon name="logout" size={16} /> Изход
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { db, user, mode, warning, dismissWarning } = useApp()
  const [collapsed, setCollapsed] = useState(false)
  const loc = useLocation()

  const unread = user
    ? db.messages.filter((m) => m.toIds.includes(user.id) && !m.readBy.includes(user.id) && !m.archived).length
    : 0
  const openTasks = user
    ? db.tasks.filter((t) => t.assignedToIds.includes(user.id) && t.status !== 'изпълнена').length
    : 0

  const crumbs = loc.pathname.split('/').filter(Boolean)

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* горна лента */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-ink-200 bg-white px-4">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Link to="/" className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100">
              <Icon name="home" size={17} />
            </Link>
            {crumbs.length > 0 && <Icon name="chevron" size={14} className="shrink-0 text-ink-300" />}
            <span className="truncate font-semibold text-ink-800">
              {crumbs.length === 0
                ? 'Начало'
                : crumbs[0].charAt(0).toUpperCase() + crumbs[0].slice(1)}
            </span>
            {mode === 'local' && (
              <Badge tone="warn" className="ml-2 hidden md:inline-flex">
                локални данни
              </Badge>
            )}
            {mode === 'cloud' && (
              <Badge tone="ok" className="ml-2 hidden md:inline-flex">
                синхронизирано с Firebase
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Link
              to="/saobshtenia"
              title="Съобщения"
              className="relative grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100"
            >
              <Icon name="mail" size={18} />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
            <Link
              to="/zadachi"
              title="Задачи"
              className="relative grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100"
            >
              <Icon name="bell" size={18} />
              {openTasks > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-warn px-1 text-[10px] font-bold text-white">
                  {openTasks}
                </span>
              )}
            </Link>
            <div className="mx-1 h-6 w-px bg-ink-200" />
            <UserMenu />
          </div>
        </header>

        {warning && (
          <div className="flex items-center gap-2 border-b border-[#f3d9b5] bg-[#fdf7ee] px-4 py-2 text-[13px] text-[#8a5a12]">
            <Icon name="warn" size={15} />
            <span className="flex-1">{warning}</span>
            <button onClick={dismissWarning} className="text-[#8a5a12] hover:opacity-70"><Icon name="close" size={14} /></button>
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
