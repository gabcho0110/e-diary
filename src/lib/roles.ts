import type { Role, RoleId } from './types'

/** Всички роли в системата — 16 на брой. */
export const ROLES: Role[] = [
  {
    id: 'sysadmin',
    name: 'Системен администратор',
    short: 'Сис. админ',
    group: 'Управление',
    desc: 'Пълен достъп до всички модули, настройки на училището, права и учебни години.',
  },
  {
    id: 'director',
    name: 'Директор',
    short: 'Директор',
    group: 'Управление',
    desc: 'Ръководи училището, вижда всички паралелки, справки, деловодство и персонал.',
  },
  {
    id: 'deputy',
    name: 'Зам.-директор',
    short: 'Зам.-директор',
    group: 'Управление',
    desc: 'Администрира разписания, замествания, контролна дейност и справки.',
  },
  {
    id: 'teacher',
    name: 'Учител',
    short: 'Учител',
    group: 'Педагогически',
    desc: 'Въвежда оценки, отсъствия, теми, материали и тестове по своите предмети.',
  },
  {
    id: 'educator',
    name: 'Възпитател',
    short: 'Възпитател',
    group: 'Педагогически',
    desc: 'Води занимания в целодневна организация и отчита присъствие.',
  },
  {
    id: 'resource_teacher',
    name: 'Ресурсен учител',
    short: 'Ресурсен',
    group: 'Педагогически',
    desc: 'Работи с ученици със СОП, попълва ИФО и ДПЛР дневници.',
  },
  {
    id: 'psychologist',
    name: 'Психолог',
    short: 'Психолог',
    group: 'Подпомагащи',
    desc: 'Достъп до ученическа подкрепа, характеристики и срещи с родители.',
  },
  {
    id: 'speech_therapist',
    name: 'Логопед',
    short: 'Логопед',
    group: 'Подпомагащи',
    desc: 'Достъп до ученическа подкрепа и ИФО/ДПЛР дневници.',
  },
  {
    id: 'nurse',
    name: 'Медицинска сестра',
    short: 'Мед. сестра',
    group: 'Подпомагащи',
    desc: 'Вижда медицинските бележки и данните за личните лекари.',
  },
  {
    id: 'librarian',
    name: 'Библиотекар',
    short: 'Библиотекар',
    group: 'Подпомагащи',
    desc: 'Управлява учебни материали и библиотечен фонд.',
  },
  {
    id: 'accountant',
    name: 'Счетоводител',
    short: 'Счетоводител',
    group: 'Подпомагащи',
    desc: 'Модул „Такси“ — такси, стипендии, отстъпки, банкови сметки.',
  },
  {
    id: 'secretary',
    name: 'Технически секретар',
    short: 'Секретар',
    group: 'Подпомагащи',
    desc: 'Деловодство, ученически документи, книги и протоколи.',
  },
  {
    id: 'parent',
    name: 'Родител',
    short: 'Родител',
    group: 'Ученици и родители',
    desc: 'Вижда оценките, отсъствията, отзивите и разписанието на детето си.',
  },
  {
    id: 'student',
    name: 'Ученик',
    short: 'Ученик',
    group: 'Ученици и родители',
    desc: 'Вижда своите оценки, отсъствия, разписание, задачи и тестове.',
  },
  {
    id: 'guest',
    name: 'Гост / Наблюдател',
    short: 'Гост',
    group: 'Други',
    desc: 'Достъп само за четене до общоучилищния календар и обяви.',
  },
]

export const ROLE_MAP: Record<RoleId, Role> = ROLES.reduce(
  (acc, r) => ({ ...acc, [r.id]: r }),
  {} as Record<RoleId, Role>,
)

export function roleNames(ids: RoleId[]): string {
  return ids.map((id) => ROLE_MAP[id]?.name ?? id).join(', ')
}

/** Дали потребителят има поне една от подадените роли. */
export function hasAnyRole(userRoles: RoleId[], allowed: RoleId[]): boolean {
  return userRoles.some((r) => allowed.includes(r))
}

/** Роли с пълен административен достъп. */
export const ADMIN_ROLES: RoleId[] = ['sysadmin', 'director', 'deputy']

/** Педагогически състав. */
export const STAFF_ROLES: RoleId[] = [
  'sysadmin',
  'director',
  'deputy',
  'teacher',
  'educator',
  'resource_teacher',
  'psychologist',
  'speech_therapist',
  'nurse',
  'librarian',
  'accountant',
  'secretary',
]

export function isAdmin(roles: RoleId[]): boolean {
  return hasAnyRole(roles, ADMIN_ROLES)
}

export function isStaff(roles: RoleId[]): boolean {
  return hasAnyRole(roles, STAFF_ROLES)
}

export function isTeacherLike(roles: RoleId[]): boolean {
  return hasAnyRole(roles, ['teacher', 'educator', 'resource_teacher', 'deputy', 'director', 'sysadmin'])
}
