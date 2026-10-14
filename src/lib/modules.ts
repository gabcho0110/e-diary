import type { RoleId } from './types'

export interface ModuleDef {
  id: string
  name: string
  path: string
  icon: string
  group: 'Основни' | 'Учебен процес' | 'Комуникация' | 'Администрация' | 'Документи и финанси' | 'Подкрепа и развитие'
  /** роли, които виждат модула */
  roles: RoleId[]
  desc: string
  /** брой статии/функции в референтния модул — за индикация на обхвата */
  features: number
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
const STAFF: RoleId[] = [
  'sysadmin',
  'director',
  'deputy',
  'teacher',
  'class_teacher',
  'educator',
  'resource_teacher',
  'psychologist',
  'speech_therapist',
  'nurse',
  'librarian',
  'accountant',
  'secretary',
]
const ADMIN: RoleId[] = ['sysadmin', 'director', 'deputy']
const TEACH: RoleId[] = ['sysadmin', 'director', 'deputy', 'teacher', 'class_teacher', 'educator', 'resource_teacher']
const FAMILY: RoleId[] = ['parent', 'student']

/**
 * Всичките 28 модула на електронния дневник.
 *
 * Изведено от 30-те секции в категория „Дневник" на help.shkolo.com:
 *   − „Абонаменти"            → премахнат по изрично искане
 *   − „Регистрация и вход"    → това е страницата за вход, не модул в менюто
 *   − „ИФО" и „ДПЛР"          → обединени в един модул (`ifo`)
 *   = 27 модула + „Начало"    = 28
 */
export const MODULES: ModuleDef[] = [
  {
    id: 'nachalo',
    name: 'Начало',
    path: '/nachalo',
    icon: 'home',
    group: 'Основни',
    roles: ALL,
    desc: 'Обобщено табло — успех, оценки, отсъствия, отзиви, класации и активност.',
    features: 6,
  },
  {
    id: 'dnevnik',
    name: 'Дневник',
    path: '/dnevnik',
    icon: 'book',
    group: 'Основни',
    roles: [...TEACH, ...FAMILY],
    desc: 'Оценки, отсъствия, разписание, домашни, контролни, отзиви и ученици.',
    features: 101,
  },
  {
    id: 'moyat-chas',
    name: 'Моят час',
    path: '/moyat-chas',
    icon: 'clock',
    group: 'Учебен процес',
    roles: [...TEACH, 'class_teacher'],
    desc: 'Час на класа — теми, оценки, отсъствия, значки и случаен ученик.',
    features: 7,
  },
  {
    id: 'statistiki',
    name: 'Статистики',
    path: '/statistiki',
    icon: 'chart',
    group: 'Учебен процес',
    roles: [...TEACH, ...FAMILY, 'psychologist'],
    desc: 'Успех по предмети, класации, входно/междинно/изходно ниво.',
    features: 3,
  },
  {
    id: 'testove',
    name: 'Тестове',
    path: '/testove',
    icon: 'check',
    group: 'Учебен процес',
    roles: [...TEACH, ...FAMILY],
    desc: 'Създаване на упражнителни и изпитни тестове и резултати.',
    features: 8,
  },
  {
    id: 'materiali',
    name: 'Учебни материали',
    path: '/materiali',
    icon: 'folder',
    group: 'Учебен процес',
    roles: [...TEACH, ...FAMILY, 'librarian'],
    desc: 'Качване, редактиране, оценяване и ограничаване на достъп.',
    features: 6,
  },
  {
    id: 'temi',
    name: 'Тематични разпределения',
    path: '/temi',
    icon: 'list',
    group: 'Учебен процес',
    roles: [...TEACH],
    desc: 'Годишни разпределения по предмети, от файл или от минала година.',
    features: 7,
  },
  {
    id: 'izvan-klasni',
    name: 'Извънкласни дейности',
    path: '/izvan-klasni',
    icon: 'star',
    group: 'Подкрепа и развитие',
    roles: [...TEACH, ...FAMILY],
    desc: 'Клубове, ДПЛР, участници и отчитане на взети занятия.',
    features: 4,
  },
  {
    id: 'sastezania',
    name: 'Състезания',
    path: '/sastezania',
    icon: 'trophy',
    group: 'Подкрепа и развитие',
    roles: [...TEACH, ...FAMILY],
    desc: 'Училищни, общински и национални състезания и резултати.',
    features: 4,
  },
  {
    id: 'portfolio',
    name: 'Портфолио',
    path: '/portfolio',
    icon: 'badge',
    group: 'Подкрепа и развитие',
    roles: [...STAFF],
    desc: 'Учителско и институционално портфолио по секции и критерии.',
    features: 18,
  },
  {
    id: 'harakteristika',
    name: 'Характеристика на ученика',
    path: '/harakteristika',
    icon: 'user',
    group: 'Подкрепа и развитие',
    roles: [...TEACH, 'psychologist', 'speech_therapist'],
    desc: 'Кампании, параметри, оценяване и потвърждаване.',
    features: 8,
  },
  {
    id: 'saobshtenia',
    name: 'Съобщения',
    path: '/saobshtenia',
    icon: 'mail',
    group: 'Комуникация',
    roles: ALL,
    desc: 'Вътрешна поща, дискусии, архивиране и дневен бюлетин.',
    features: 16,
  },
  {
    id: 'sabitia',
    name: 'Събития',
    path: '/sabitia',
    icon: 'calendar',
    group: 'Комуникация',
    roles: ALL,
    desc: 'Училищен календар, екскурзии, празници и покани.',
    features: 3,
  },
  {
    id: 'sreshti',
    name: 'Срещи',
    path: '/sreshti',
    icon: 'meet',
    group: 'Комуникация',
    roles: [...TEACH, ...FAMILY],
    desc: 'Кампании за родителски срещи и резервиране на часове.',
    features: 6,
  },
  {
    id: 'zadachi',
    name: 'Задачи',
    path: '/zadachi',
    icon: 'task',
    group: 'Комуникация',
    roles: [...STAFF],
    desc: 'Поставяне, проследяване и изпълнение на задачи.',
    features: 4,
  },
  {
    id: 'administracia',
    name: 'Администрация',
    path: '/administracia',
    icon: 'settings',
    group: 'Администрация',
    roles: [...ADMIN, 'secretary'],
    desc: 'Паралелки, предмети, потребители, права, срокове, учебни години.',
    features: 59,
  },
  {
    id: 'generator',
    name: 'Генератор на разписания',
    path: '/generator',
    icon: 'grid',
    group: 'Администрация',
    roles: [...ADMIN, 'teacher', 'class_teacher'],
    desc: 'Седам стъпки — данни, паралелки, групи, режими, стаи, учители, ограничения.',
    features: 14,
  },
  {
    id: 'lektorski',
    name: 'Лекторски часове',
    path: '/lektorski',
    icon: 'swap',
    group: 'Администрация',
    roles: [...ADMIN, 'teacher', 'class_teacher'],
    desc: 'Учителски отсъствия, заместници и часове над хорариума.',
    features: 6,
  },
  {
    id: 'sklad',
    name: 'Склад и помещения',
    path: '/sklad',
    icon: 'building',
    group: 'Администрация',
    roles: [...ADMIN, 'teacher', 'class_teacher'],
    desc: 'Етажи, помещения и разписание на залите.',
    features: 3,
  },
  {
    id: 'spravki',
    name: 'Справки',
    path: '/spravki',
    icon: 'report',
    group: 'Документи и финанси',
    roles: [...ADMIN, 'teacher', 'class_teacher', 'psychologist'],
    desc: '31 справки — успех, отсъствия, движение, ангажираност, НЕИСПУО.',
    features: 31,
  },
  {
    id: 'dokumenti',
    name: 'Ученически документи',
    path: '/dokumenti',
    icon: 'certificate',
    group: 'Документи и финанси',
    roles: [...ADMIN, 'secretary', 'class_teacher'],
    desc: 'Удостоверения, свидетелства, дипломи, лични картони, дубликати.',
    features: 15,
  },
  {
    id: 'delovodstvo',
    name: 'Деловодство',
    path: '/delovodstvo',
    icon: 'archive',
    group: 'Документи и финанси',
    roles: [...ADMIN, 'secretary'],
    desc: 'Училищни протоколи, книги за заповеди, решения и кореспонденция.',
    features: 8,
  },
  {
    id: 'taksi',
    name: 'Такси',
    path: '/taksi',
    icon: 'wallet',
    group: 'Документи и финанси',
    roles: ['sysadmin', 'director', 'accountant'],
    desc: 'Такси, стипендии, отстъпки, данъци и банкови сметки.',
    features: 10,
  },
  {
    id: 'personal',
    name: 'Оценка на персонала',
    path: '/personal',
    icon: 'clipboard',
    group: 'Администрация',
    roles: [...ADMIN, ...STAFF],
    desc: 'Атестационни карти, ДТВ шаблони, самооценка и възражения.',
    features: 13,
  },
  {
    id: 'virtualna',
    name: 'Виртуална класна стая',
    path: '/virtualna',
    icon: 'video',
    group: 'Учебен процес',
    roles: [...TEACH, ...FAMILY],
    desc: 'Онлайн уроци, график на стаята, запис и справка за активност.',
    features: 13,
  },
  {
    id: 'ifo',
    name: 'ИФО и ДПЛР',
    path: '/ifo',
    icon: 'heart',
    group: 'Подкрепа и развитие',
    roles: [...TEACH, 'psychologist', 'speech_therapist', 'resource_teacher'],
    desc: 'Индивидуални форми на обучение и дейности за подкрепа.',
    features: 6,
  },
  {
    id: 'neispuo',
    name: 'Интеграция с НЕИСПУО',
    path: '/neispuo',
    icon: 'sync',
    group: 'Администрация',
    roles: [...ADMIN, 'secretary'],
    desc: 'Синхронизиране на групи и качване на дневници.',
    features: 2,
  },
  {
    id: 'profil',
    name: 'Профил',
    path: '/profil',
    icon: 'person',
    group: 'Основни',
    roles: ALL,
    desc: 'Лични данни, парола, 2FA, деца, училища, черно-бял дневник.',
    features: 23,
  },
]

export const MODULE_MAP: Record<string, ModuleDef> = MODULES.reduce(
  (a, m) => ({ ...a, [m.id]: m }),
  {} as Record<string, ModuleDef>,
)

export function modulesFor(roles: RoleId[]): ModuleDef[] {
  return MODULES.filter((m) => m.roles.some((r) => roles.includes(r)))
}

export const GROUPS: ModuleDef['group'][] = [
  'Основни',
  'Учебен процес',
  'Комуникация',
  'Администрация',
  'Документи и финанси',
  'Подкрепа и развитие',
]
