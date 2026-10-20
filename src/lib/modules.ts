import type { RoleId } from './types'

export interface ModuleDef {
  id: string
  name: string
  path: string
  icon: string
  /** роли, които виждат модула */
  roles: RoleId[]
  desc: string
}

const ALL: RoleId[] = [
  'sysadmin',
  'director',
  'deputy',
  'teacher',
  'class_teacher',
  'parent',
  'student',
  'psychologist',
  'speech_therapist',
  'accountant',
  'secretary',
  'librarian',
  'nurse',
  'educator',
  'resource_teacher',
  'guest',
]
const TEACH: RoleId[] = ['sysadmin', 'director', 'deputy', 'teacher', 'class_teacher', 'educator', 'resource_teacher']
const FAMILY: RoleId[] = ['parent', 'student']
const ADMIN: RoleId[] = ['sysadmin', 'director', 'deputy', 'secretary']

/**
 * Модулите на дневника — само три.
 *
 *  • „Начало"         — обобщеното табло
 *  • „Дневник"        — оценки, отсъствия, отзиви, разписание и останалите раздели
 *  • „Администрация"  — настройки на училището; подменюто е в `ADMIN_MENU`
 *
 * Всички останали модули от референтния дневник са премахнати по изрично искане.
 */
export const MODULES: ModuleDef[] = [
  {
    id: 'nachalo',
    name: 'Начало',
    path: '/nachalo',
    icon: 'home',
    roles: ALL,
    desc: 'Обобщено табло — успех, оценки, отсъствия, отзиви и активност.',
  },
  {
    id: 'dnevnik',
    name: 'Дневник',
    path: '/dnevnik',
    icon: 'book',
    roles: [...TEACH, ...FAMILY],
    desc: 'Оценки, отсъствия, разписание, домашни, контролни, отзиви и ученици.',
  },
  {
    id: 'administracia',
    name: 'Администрация',
    path: '/administracia',
    icon: 'settings',
    roles: ADMIN,
    desc: 'Потребители, паралелки, предмети, разписания, заявки и настройки на училището.',
  },
]

export const MODULE_MAP: Record<string, ModuleDef> = MODULES.reduce(
  (a, m) => ({ ...a, [m.id]: m }),
  {} as Record<string, ModuleDef>,
)

export function modulesFor(roles: RoleId[]): ModuleDef[] {
  return MODULES.filter((m) => m.roles.some((r) => roles.includes(r)))
}

// ── Подменю на „Администрация" ──────────────────────────────────────────────
//
// Точно подредбата от референтния дневник: пет секции, всяка с по няколко
// екрана. Секциите се показват с главни букви, екраните — с икона и име.

export interface AdminItem {
  id: string
  name: string
  path: string
  icon: string
}

export interface AdminGroup {
  id: string
  name: string
  items: AdminItem[]
}

export const ADMIN_MENU: AdminGroup[] = [
  {
    id: 'users',
    name: 'Потребители',
    items: [
      { id: 'potrebiteli', name: 'Потребители', path: '/administracia/potrebiteli', icon: 'user' },
      { id: 'grupi', name: 'Потребителски групи', path: '/administracia/grupi', icon: 'meet' },
    ],
  },
  {
    id: 'classes',
    name: 'Класове',
    items: [
      { id: 'paralelki', name: 'Паралелки', path: '/administracia/paralelki', icon: 'grid' },
      { id: 'predmeti', name: 'Предмети', path: '/administracia/predmeti', icon: 'book' },
      { id: 'planove', name: 'Учебни планове', path: '/administracia/planove', icon: 'list' },
    ],
  },
  {
    id: 'schedules',
    name: 'Разписания',
    items: [
      { id: 'razpisania', name: 'Седмични разписания', path: '/administracia/razpisania', icon: 'calendar' },
      { id: 'rezhimi', name: 'Дневни режими', path: '/administracia/rezhimi', icon: 'clock' },
      { id: 'shabloni', name: 'Шаблони', path: '/administracia/shabloni', icon: 'clipboard' },
      { id: 'neuchebni', name: 'Неучебни дни', path: '/administracia/neuchebni', icon: 'ban' },
      { id: 'srokove', name: 'Учебни срокове', path: '/administracia/srokove', icon: 'calendar' },
    ],
  },
  {
    id: 'requests',
    name: 'Заявки',
    items: [
      { id: 'zayavki', name: 'Заявки за изтриване', path: '/administracia/zayavki-iztrivane', icon: 'close' },
      { id: 'registracii', name: 'Нови регистрации', path: '/administracia/registracii', icon: 'userPlus' },
      { id: 'snimki', name: 'Нови снимки', path: '/administracia/snimki', icon: 'upload' },
    ],
  },
  {
    id: 'school',
    name: 'Училище',
    items: [
      { id: 'uchilishte', name: 'Училище', path: '/administracia/uchilishte', icon: 'school' },
      { id: 'obrazec1', name: 'Образец №1', path: '/administracia/obrazec1', icon: 'report' },
    ],
  },
]

export const ADMIN_ITEMS: AdminItem[] = ADMIN_MENU.flatMap((g) => g.items)

/** Заглавие за горната лента — търси първо в подменюто, после в модулите. */
export function pageTitle(pathname: string): string {
  const item = ADMIN_ITEMS.find((i) => i.path === pathname)
  if (item) return item.name
  const mod = MODULES.find((m) => m.path === pathname)
  return mod?.name ?? ''
}
