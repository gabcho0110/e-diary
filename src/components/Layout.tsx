import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { ADMIN_ITEMS, ADMIN_MENU, pageTitle } from '../lib/modules'
import { ROLE_MAP, roleNames } from '../lib/roles'
import { groupClasses, shortClassName, classHeaderTitle } from '../lib/classes'
import type { Klass } from '../lib/types'
import { Avatar, Badge, Icon } from './ui'

// ── Цветове на страничното меню (по образеца на референтния дневник) ────────
const SIDEBAR_BG = 'linear-gradient(180deg,#4380ad 0%,#3a719b 100%)'
const SIDEBAR_ACTIVE = '#4f8fbe'

function SubRow({
  icon, label, active, bold, indent, onClick,
}: {
  icon: string; label: string; active?: boolean; bold?: boolean; indent?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-[3px] py-[7px] pr-2 text-left text-[12.5px] transition ${
        indent ? 'pl-5' : 'pl-2.5'
      } ${active ? 'bg-white/20 font-semibold text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
    >
      <Icon name={icon} size={14} className="shrink-0 opacity-75" />
      <span className={`min-w-0 flex-1 truncate ${bold ? 'font-bold' : ''}`}>{label}</span>
    </button>
  )
}

/**
 * Мрежата с паралелките — по един ред за клас, а буквите една до друга:
 *   8 - А  Б
 *   9 - А  Б
 * Така целият списък се събира в няколко реда, вместо да се спуска надолу.
 */
function ClassGrid({
  classes, activeId, homeroomIds, onPick,
}: {
  classes: Klass[]
  activeId: string
  homeroomIds: Set<string>
  onPick: (id: string) => void
}) {
  const groups = useMemo(() => groupClasses(classes), [classes])

  if (!groups.length) {
    return <p className="px-2 py-1 text-[11.5px] text-white/50">Няма достъпни паралелки</p>
  }

  return (
    <div className="mb-1 space-y-[3px]">
      {groups.map((g) => (
        <div key={g.grade} className="flex items-center gap-1">
          <span className="w-[32px] shrink-0 text-right text-[11.5px] font-semibold leading-[20px] text-white/60">
            {g.grade}
          </span>
          <span className="text-[11px] leading-[20px] text-white/35">-</span>
          <div className="flex flex-wrap gap-[3px]">
            {g.items.map(({ klass, letter }) => {
              const on = klass.id === activeId
              const home = homeroomIds.has(klass.id)
              return (
                <button
                  key={klass.id}
                  onClick={() => onPick(klass.id)}
                  title={`${shortClassName(klass.name)}${home ? ' (мой клас)' : ''}`}
                  aria-current={on ? 'page' : undefined}
                  className={`h-[20px] min-w-[21px] rounded-[2px] px-1 text-[11.5px] font-bold leading-none transition ${
                    on
                      ? 'bg-white text-[#2b6ca3] shadow-sm'
                      : home
                        ? 'bg-white/25 text-white hover:bg-white/35'
                        : 'text-white/85 hover:bg-white/15'
                  }`}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Подменюто на „Дневник" — детето (за родител/ученик), „Моето разписание" и
 * паралелките, подредени по клас.
 */
function DnevnikSubmenu({ onNavigate }: { onNavigate: () => void }) {
  const { user, myClasses, myChildren, className } = useApp()
  const [params] = useSearchParams()
  const loc = useLocation()
  const navigate = useNavigate()

  const onDnevnik = loc.pathname === '/dnevnik'
  const activeClass = params.get('class') ?? myClasses[0]?.id ?? ''

  const isFamily = !!user?.roles.some((r) => r === 'parent' || r === 'student')
  const child = isFamily ? myChildren[0] : undefined

  const homeroomIds = useMemo(
    () => new Set(myClasses.filter((c) => c.homeroomTeacherId === user?.id).map((c) => c.id)),
    [myClasses, user],
  )

  const go = (to: string) => { navigate(to); onNavigate() }

  return (
    <div className="mb-1 ml-[13px] border-l border-white/20 pl-1.5">
      {child && (
        <div className="mb-1 flex items-center gap-2 rounded-[3px] px-2 py-[6px] text-[12.5px] font-semibold text-white">
          <Icon name="person" size={14} className="shrink-0 opacity-70" />
          <span className="truncate">
            {child.firstName} {child.lastName}-{className(child.classId).replace('-', '')}
          </span>
        </div>
      )}

      <SubRow
        icon="calendar"
        label="Моето разписание"
        active={loc.pathname === '/razpisanie'}
        onClick={() => go('/razpisanie')}
      />

      <div className="my-1.5 h-px bg-white/15" />

      <ClassGrid
        classes={myClasses}
        activeId={onDnevnik ? activeClass : ''}
        homeroomIds={homeroomIds}
        onPick={(id) => go(`/dnevnik?class=${id}`)}
      />
    </div>
  )
}

/** Подменюто на „Администрация" — петте секции от референтния дневник. */
function AdminSubmenu({ onNavigate }: { onNavigate: () => void }) {
  const loc = useLocation()
  const navigate = useNavigate()

  return (
    <div className="pb-1">
      {ADMIN_MENU.map((g) => (
        <div key={g.id}>
          <p className="px-3 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-wide text-white/55">
            {g.name}
          </p>
          {g.items.map((it) => {
            const active = loc.pathname === it.path
            return (
              <button
                key={it.id}
                onClick={() => { navigate(it.path); onNavigate() }}
                className={`flex w-full items-center gap-2.5 py-[7px] pl-4 pr-2 text-left text-[12.5px] transition ${
                  active ? 'font-semibold text-white' : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
                style={active ? { background: SIDEBAR_ACTIVE } : undefined}
              >
                <Icon name={it.icon} size={15} className="shrink-0 opacity-80" />
                <span className="min-w-0 flex-1 truncate">{it.name}</span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const { db, user, myModules, logout } = useApp()
  const [q, setQ] = useState('')
  const loc = useLocation()
  const navigate = useNavigate()
  const [openDnevnik, setOpenDnevnik] = useState(loc.pathname === '/dnevnik')
  const [openAdmin, setOpenAdmin] = useState(loc.pathname.startsWith('/administracia'))

  useEffect(() => {
    if (loc.pathname === '/dnevnik' || loc.pathname === '/razpisanie') setOpenDnevnik(true)
    if (loc.pathname.startsWith('/administracia')) setOpenAdmin(true)
  }, [loc.pathname])

  const term = q.trim().toLowerCase()
  const searching = term.length > 0

  const has = (id: string) => myModules.some((m) => m.id === id)
  const hasDnevnik = has('dnevnik')
  const hasAdmin = has('administracia')

  const foundModules = useMemo(
    () => (searching ? myModules.filter((m) => m.name.toLowerCase().includes(term)) : []),
    [searching, term, myModules],
  )
  const foundAdmin = useMemo(
    () => (searching && hasAdmin ? ADMIN_ITEMS.filter((i) => i.name.toLowerCase().includes(term)) : []),
    [searching, term, hasAdmin],
  )

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-[#2e5f85] transition-[width] duration-200 ${
        collapsed ? 'w-[68px]' : 'w-[248px]'
      }`}
      style={{ background: SIDEBAR_BG }}
    >
      {/* училище */}
      <div className="flex h-14 items-center gap-2.5 border-b border-white/15 px-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15 text-white">
          <Icon name="school" size={19} />
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold leading-tight text-white">{db.school.name}</p>
            <p className="truncate text-[11px] text-white/60">Учебна {db.school.year}</p>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50"><Icon name="search" size={15} /></span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Търсене в модулите…"
              className="w-full rounded-lg border border-white/20 bg-white/10 py-1.5 pl-8 pr-2 text-[13px] text-white placeholder:text-white/45 outline-none focus:border-white/40"
            />
          </div>
        </div>
      )}

      <nav className="mt-2 flex-1 overflow-y-auto px-2 pb-4">
        {searching ? (
          <>
            {[...foundModules.map((m) => ({ id: m.id, name: m.name, path: m.path, icon: m.icon })),
              ...foundAdmin].map((it) => (
              <button
                key={it.id}
                onClick={() => { navigate(it.path); setQ('') }}
                className="mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-white/85 hover:bg-white/10 hover:text-white"
              >
                <Icon name={it.icon} size={17} className="shrink-0" />
                {!collapsed && <span className="truncate">{it.name}</span>}
              </button>
            ))}
            {!foundModules.length && !foundAdmin.length && !collapsed && (
              <p className="px-2 py-6 text-center text-xs text-white/50">Няма намерен модул</p>
            )}
          </>
        ) : (
          <>
            {/* Начало */}
            {has('nachalo') && (
              <NavLink
                to="/nachalo"
                title={collapsed ? 'Начало' : undefined}
                className={({ isActive }) =>
                  `mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                    isActive ? 'bg-white/20 font-semibold text-white' : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon name="home" size={17} />
                {!collapsed && <span>Начало</span>}
              </NavLink>
            )}

            {/* Дневник — с подменю */}
            {hasDnevnik && (
              <div className="mb-0.5">
                <button
                  onClick={() => (collapsed ? navigate('/dnevnik') : setOpenDnevnik((v) => !v))}
                  aria-expanded={openDnevnik}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                    loc.pathname === '/dnevnik' || loc.pathname === '/razpisanie'
                      ? 'bg-white/20 font-semibold text-white'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon name="book" size={17} />
                  {!collapsed && <span className="min-w-0 flex-1 truncate text-left">Дневник</span>}
                  {!collapsed && (
                    <Icon name="chevronDown" size={15} className={`shrink-0 transition-transform ${openDnevnik ? 'rotate-180' : ''}`} />
                  )}
                </button>
                {openDnevnik && !collapsed && <DnevnikSubmenu onNavigate={() => setOpenDnevnik(true)} />}
              </div>
            )}

            {/* Администрация — с подменю */}
            {hasAdmin && (
              <div className="mb-0.5">
                <button
                  onClick={() => (collapsed ? navigate('/administracia/paralelki') : setOpenAdmin((v) => !v))}
                  aria-expanded={openAdmin}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                    loc.pathname.startsWith('/administracia')
                      ? 'bg-white/20 font-semibold text-white'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon name="settings" size={17} />
                  {!collapsed && <span className="min-w-0 flex-1 truncate text-left">Администрация</span>}
                  {!collapsed && (
                    <Icon name="chevronDown" size={15} className={`shrink-0 transition-transform ${openAdmin ? 'rotate-180' : ''}`} />
                  )}
                </button>
                {openAdmin && !collapsed && <AdminSubmenu onNavigate={() => setOpenAdmin(true)} />}
              </div>
            )}
          </>
        )}
      </nav>

      <div className="border-t border-white/15 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mb-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-white/70 hover:bg-white/10 hover:text-white"
        >
          <Icon name="chevron" size={17} className={collapsed ? '' : 'rotate-180'} />
          {!collapsed && <span>Свий менюто</span>}
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-white/70 hover:bg-white/10 hover:text-white"
        >
          <Icon name="logout" size={17} />
          {!collapsed && <span>Изход</span>}
        </button>
        {!collapsed && user && (
          <p className="px-2.5 pt-2 text-[10px] leading-tight text-white/45">{roleNames(user.roles)}</p>
        )}
      </div>
    </aside>
  )
}

function UserMenu() {
  const { db, user, logout, loginAs } = useApp()
  const [open, setOpen] = useState(false)
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
            <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
              Влез като (демо роли)
            </p>
            <div className="max-h-[260px] overflow-y-auto">
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
  const { mode, warning, dismissWarning, db, user, myClasses } = useApp()
  const [collapsed, setCollapsed] = useState(false)
  const loc = useLocation()
  const [params] = useSearchParams()

  /**
   * За „Дневник" горната лента показва отворената паралелка, а не думата
   * „Дневник": 8В - Александър Г. Тодоров (класен).
   */
  const classTitle = useMemo(() => {
    if (loc.pathname !== '/dnevnik') return ''
    const id = params.get('class') ?? myClasses[0]?.id ?? ''
    const klass = myClasses.find((c) => c.id === id)
    return klass ? classHeaderTitle(klass, db.users, user?.id) : ''
  }, [loc.pathname, params, myClasses, db.users, user])

  const title = classTitle || pageTitle(loc.pathname) || (loc.pathname === '/' ? 'Начало' : '')

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* горна лента */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-ink-200 bg-white px-4">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Link to="/nachalo" className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100">
              <Icon name="home" size={17} />
            </Link>
            <Icon name="chevron" size={14} className="shrink-0 text-ink-300" />
            <span className="truncate font-semibold text-ink-800">{title || 'Начало'}</span>
            {mode === 'local' && (
              <Badge tone="warn" className="ml-2 hidden md:inline-flex">локални данни</Badge>
            )}
            {mode === 'cloud' && (
              <Badge tone="ok" className="ml-2 hidden md:inline-flex">синхронизирано с Firebase</Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
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
