// ── Домейн модел на електронния дневник ─────────────────────────────────────

export type RoleId =
  | 'sysadmin'
  | 'director'
  | 'deputy'
  | 'teacher'
  | 'class_teacher'
  | 'parent'
  | 'student'
  | 'psychologist'
  | 'speech_therapist'
  | 'accountant'
  | 'secretary'
  | 'librarian'
  | 'nurse'
  | 'educator'
  | 'resource_teacher'
  | 'guest'

export interface Role {
  id: RoleId
  name: string
  short: string
  group: 'Управление' | 'Педагогически' | 'Ученици и родители' | 'Подпомагащи' | 'Други'
  desc: string
}

export interface User {
  id: string
  username: string
  password: string
  firstName: string
  lastName: string
  middleName?: string
  email: string
  phone: string
  roles: RoleId[]
  avatar?: string
  /** за ученик/родител — към кого е свързан */
  studentId?: string
  childrenIds?: string[]
  /** предмети, които преподава */
  subjectIds?: string[]
  /** паралелки, в които преподава */
  classIds?: string[]
  /** паралелка, на която е класен ръководител */
  homeroomId?: string
  active: boolean
  twoFactor?: boolean
  createdAt: string
}

export interface School {
  id: string
  name: string
  city: string
  address: string
  principal: string
  phone: string
  email: string
  website: string
  year: string
  term1: { from: string; to: string }
  term2: { from: string; to: string }
  nonSchoolDays: string[]
  strictMode: boolean
  autoExcuse: boolean
  diaryLockedUntil: string | null
}

export interface Subject {
  id: string
  name: string
  short: string
  /** И-Иновативен, П-Профилиращ, З-Задължителноизбираем, Р-Разширена подготовка */
  kind: 'ЗП' | 'ПП' | 'ЗИП' | 'ИУЧ' | 'ФУЧ' | 'ОРЕС'
  color: string
}

export interface Klass {
  id: string
  /** напр. "8" */
  grade: number
  /** напр. "Б" */
  letter: string
  /** напр. "8-Б" */
  name: string
  profile: string
  homeroomTeacherId: string | null
  roomId?: string
  studentIds: string[]
  subjectIds: string[]
  shift: 1 | 2
  form: 'дневна' | 'следобедна' | 'смесена'
}

export interface Student {
  id: string
  firstName: string
  lastName: string
  middleName: string
  egn: string
  /** пореден номер в паралелката */
  number: number
  classId: string
  gender: 'М' | 'Ж'
  birthDate: string
  address: string
  phone: string
  email: string
  parentIds: string[]
  status: 'активен' | 'преместен' | 'отписан' | 'завършил'
  sen: boolean // СОП
  senNote?: string
  ifo?: boolean // индивидуална форма на обучение
  cdo?: boolean
  doctor?: string
  photo?: string
  admittedAt: string
}

export type GradeType =
  | 'Текуща'
  | 'Контролна работа'
  | 'Класна работа'
  | 'Устно изпитване'
  | 'Практическа'
  | 'Проект'
  | 'Домашна работа'
  | 'Входно ниво'
  | 'Междинно ниво'
  | 'Изходно ниво'
  | 'Срочна'
  | 'Годишна'
  | 'Поправителен изпит'

export interface Grade {
  id: string
  studentId: string
  subjectId: string
  classId: string
  value: number
  type: GradeType
  date: string
  term: 1 | 2
  comment?: string
  teacherId: string
  draft: boolean
  /** качествено оценяване (СОП, I-III клас) */
  qualitative?: string
  examId?: string
  createdAt: string
}

export interface Absence {
  id: string
  studentId: string
  classId: string
  date: string
  period: number // час №
  subjectId: string
  reason: 'неизвинено' | 'извинено' | 'закъснение' | 'семейни причини'
  excused: boolean
  note?: string
  teacherId: string
  createdAt: string
}

export interface Note {
  id: string
  studentId: string
  classId: string
  text: string
  kind: 'Отзив' | 'Забележка' | 'Похвала' | 'Други'
  badge?: string
  teacherId: string
  date: string
  visibleToParent: boolean
}

export interface ScheduleEntry {
  id: string
  classId: string
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7
  period: number
  subjectId: string
  teacherId: string
  roomId?: string
  group?: string
  /** ОРЕС / ИУЧ / ЗИП */
  tag?: string
  week?: 'all' | 'even' | 'odd'
}

export interface Homework {
  id: string
  classId: string
  subjectId: string
  teacherId: string
  date: string
  dueDate: string
  text: string
  attachment?: string
}

export interface Exam {
  id: string
  classId: string
  subjectId: string
  teacherId: string
  date: string
  period: number
  kind: 'Контролна работа' | 'Класна работа' | 'Тест' | 'Диктовка'
  topic: string
}

export interface Message {
  id: string
  fromId: string
  toIds: string[]
  subject: string
  body: string
  date: string
  readBy: string[]
  archived: boolean
  folder: 'inbox' | 'sent' | 'archive'
  allowReplies: boolean
  hideRecipients: boolean
  attachments: string[]
  groupId?: string
}

export interface TestQuestion {
  id: string
  text: string
  type: 'single' | 'multiple' | 'open'
  options: string[]
  correct: number[]
  points: number
}

export interface Test {
  id: string
  title: string
  classId: string
  subjectId: string
  teacherId: string
  kind: 'упражнителен' | 'изпитен'
  questions: TestQuestion[]
  timeLimit: number
  visibility: 'само учителя' | 'класа' | 'всички'
  createdAt: string
  attempts: { studentId: string; score: number; max: number; date: string }[]
}

export interface Material {
  id: string
  title: string
  subjectId: string
  classId: string
  teacherId: string
  kind: 'документ' | 'презентация' | 'видео' | 'линк' | 'снимка'
  url: string
  description: string
  date: string
  access: 'всички' | 'класа' | 'избрани';
  likes: number
}

export interface Task {
  id: string
  title: string
  description: string
  assignedToIds: string[]
  assignedById: string
  dueDate: string
  priority: 'нисък' | 'среден' | 'висок'
  status: 'нова' | 'в процес' | 'изпълнена' | 'просрочена'
  createdAt: string
  completedAt?: string
  result?: string
}

export interface EventItem {
  id: string
  title: string
  description: string
  date: string
  endDate?: string
  place: string
  kind: 'Училищно' | 'Класно' | 'Родителска среща' | 'Екскурзия' | 'Празник' | 'Състезание'
  createdById: string
  invitedClassIds: string[]
  invitedUserIds: string[]
}

export interface MeetingSlot {
  id: string
  teacherId: string
  parentId: string | null
  date: string
  from: string
  to: string
  status: 'свободен' | 'зает' | 'отказан'
  topic?: string
}

export interface Activity {
  id: string
  name: string
  kind: 'клуб' | 'спорт' | 'изкуство' | 'проект' | 'ДПЛР'
  leaderId: string
  classIds: string[]
  participantIds: string[]
  schedule: string
  room?: string
}

export interface ThemePlan {
  id: string
  subjectId: string
  classId: string
  teacherId: string
  year: string
  rows: { no: number; topic: string; hours: number; month: string; taken: boolean; date?: string }[]
  file?: string
}

export interface Fee {
  id: string
  studentId: string
  category: string
  amount: number
  paid: number
  dueDate: string
  status: 'платена' | 'частична' | 'неплатена'
  note?: string
}

export interface Room {
  id: string
  floor: number
  name: string
  kind: 'кабинет' | 'лаборатория' | 'спортна зала' | 'актова зала' | 'библиотека' | 'кабинет по ИТ'
  capacity: number
}

export interface Competition {
  id: string
  name: string
  subjectId: string
  date: string
  place: string
  level: 'училищен' | 'общински' | 'областен' | 'национален' | 'международен'
  active: boolean
  results: { studentId: string; place: number; points: number; note?: string }[]
}

export interface Portfolio {
  id: string
  userId: string
  kind: 'учителско' | 'институционално'
  school: string
  position: string
  startYear: string
  sections: Record<string, string>
  shared: boolean
  hideContacts: boolean
  likes: string[]
  updatedAt: string
}

export interface StudentProfile {
  id: string
  studentId: string
  campaign: string
  subjects: { subjectId: string; grade: number; assessorId: string }[]
  params: { name: string; value: number; assessorId: string }[]
  status: 'чернова' | 'подадена' | 'оценена' | 'потвърдена' | 'възражение'
  objection?: string
  updatedAt: string
}

export interface Attestation {
  id: string
  teacherId: string
  template: string
  year: string
  status: 'чернова' | 'самооценка' | 'оценяване' | 'потвърдена' | 'възражение'
  selfScore: number
  commissionScore: number
  commissionIds: string[]
  criteria: { name: string; weight: number; score: number }[]
  objection?: string
  updatedAt: string
}

export interface LessonAbsence {
  id: string
  teacherId: string
  date: string
  periods: number[]
  substituteIds: string[]
  reason: string
  kind: 'със заместник' | 'без заместник' | 'лекторски'
  nationalProgram?: boolean
}

export interface DocTemplate {
  id: string
  code: string
  name: string
  category: 'Ученически документ' | 'Деловодство'
  requires: string[]
}

export interface GeneratedDoc {
  id: string
  templateId: string
  studentId?: string
  number: string
  date: string
  createdById: string
  payload: Record<string, string | number>
}

export interface VirtualRoom {
  id: string
  name: string
  classId: string
  subjectId: string
  teacherId: string
  openFrom: string
  openTo: string
  active: boolean
  sessions: { date: string; students: number; minutes: number }[]
}

export interface IfoDiary {
  id: string
  studentId: string
  subjectId: string
  teacherId: string
  kind: 'ИФО' | 'ДПЛР'
  schedule: { day: number; period: number }[]
  entries: { date: string; topic: string; hours: number }[]
}

export interface SyncLog {
  id: string
  direction: 'качване' | 'сваляне'
  entity: string
  count: number
  date: string
  status: 'успех' | 'грешка'
  message: string
}

export interface AuditEntry {
  id: string
  userId: string
  action: string
  target: string
  date: string
}

export interface DB {
  school: School
  users: User[]
  subjects: Subject[]
  classes: Klass[]
  students: Student[]
  grades: Grade[]
  absences: Absence[]
  notes: Note[]
  schedule: ScheduleEntry[]
  homework: Homework[]
  exams: Exam[]
  messages: Message[]
  tests: Test[]
  materials: Material[]
  tasks: Task[]
  events: EventItem[]
  meetings: MeetingSlot[]
  activities: Activity[]
  themePlans: ThemePlan[]
  fees: Fee[]
  rooms: Room[]
  competitions: Competition[]
  portfolios: Portfolio[]
  studentProfiles: StudentProfile[]
  attestations: Attestation[]
  lessonAbsences: LessonAbsence[]
  docs: GeneratedDoc[]
  virtualRooms: VirtualRoom[]
  ifoDiaries: IfoDiary[]
  syncLogs: SyncLog[]
  audit: AuditEntry[]
}
