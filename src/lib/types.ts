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
  /** телефон на личния лекар — задължителен заедно с името */
  doctorPhone?: string
  /** родителска връзка — попълва се при добавяне на родител */
  relation?: string
  photo?: string
  admittedAt: string
  /** място на раждане — показва се в раздел „Ученици" */
  birthPlace?: string
  /** освободен от оценяване по ФВС и др. */
  exemptFromGrades?: boolean
  /** наложена забрана за оценяване */
  gradesBlocked?: boolean
  /** задължителни предмети (ЗП) — утвърдени от педагогическия съвет */
  mandatorySubjects?: boolean
  /** лично дело: код на документ → дата на получаване */
  documents?: Record<string, string>
  /** предмети, по които ученикът е освободен от оценяване (записва се „(осв.)") */
  exemptSubjectIds?: string[]
  /** предмети, по които е забранено въвеждането на оценки */
  blockedSubjectIds?: string[]
  /** предмети, по които ученик със СОП се оценява качествено */
  qualitativeSubjectIds?: string[]
  /** специалност (профилиращ предмет) — попълва се в профила */
  specialty?: string
  /** паралелки, в които ученикът се обучава (ЦДО — може да е в повече от една) */
  extraClassIds?: string[]
  /** съобщение за записване в класа — „номер/дата" */
  enrollmentMessage?: string
  /** снимка, качена от класния ръководител (чака одобрение) */
  photoPending?: boolean
  /** ученическа подкрепа — екипът, който работи с ученика */
  supportTeamIds?: string[]
  /** план за подкрепа — дейностите */
  supportActivities?: string[]
  /** национално външно оценяване (НВО) */
  nvoResults?: NvoResult[]
  /** държавни зрелостни изпити (ДЗИ) */
  dziResults?: DziResult[]
  /** резултати в раздел „Резултати" — годишен успех, ООП, РП, ДО, удостоверение */
  annualResults?: AnnualResults
}

/** Един ред от външното оценяване (НВО) — точки и оценка по предмет. */
export interface NvoResult {
  id: string
  subjectId: string
  points: number
  maxPoints: number
  grade: number
  date: string
}

/** Държавен зрелостен изпит — ООП / ПП. */
export interface DziResult {
  id: string
  /** № на изпита — 1, 2, 3 */
  examNo: number
  subjectId: string
  /** тип на изпита — задължителен (ООП) или профилиращ (ПП) */
  kind: 'ООП' | 'ПП'
  points: number
  grade: number
  date: string
}

/** Раздел „Резултати" — годишен успех, ООП, РП, ДО и удостоверението. */
export interface AnnualResults {
  annualGrade?: number
  /** оценка от ООП */
  oop?: number
  /** резултат от РП */
  rp?: number
  /** резултат от ДО */
  doResult?: number
  /** номер на удостоверението за завършен клас */
  certificateNo?: string
  certificateDate?: string
  /** подготвителна група — способности в началото на годината */
  abilityStart?: string
  /** подготвителна група — способности в края на годината */
  abilityEnd?: string
  /** готовност за постъпване в 1-ви клас (реквизит 3-19) */
  schoolReady?: 'да' | 'не' | 'частично'
  /** дали ученикът полага поправителен изпит */
  correctionalState?: 'полага' | 'завършва' | 'остава'
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
  /** оценката е изтрита — показва се само при филтър „Изтрити оценки" */
  deletedAt?: string
  deletedById?: string
  /** основание при „стриктен режим" */
  deleteReason?: string
  /** дата на въвеждане — за баджа „Нова" */
  enteredAt?: string
  /** оценка от друго училище — не участва в средния успех */
  fromOtherSchool?: boolean
}

/** Освобождаване от оценяване по предмет за даден срок. */
export interface GradeExemption {
  id: string
  studentId: string
  subjectId: string
  term: 1 | 2
  authorId: string
  date: string
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
  /** отсъствал е целия ден — брои се за всички часове */
  wholeDay?: boolean
  /** мотивът, с който е уважено отсъствието */
  excuseReason?: string
  /** изтрито отсъствие — показва се само при филтър „Изтрити отсъствия" */
  deletedAt?: string
  deletedById?: string
  /** бележката, с която е уважено (родителска / медицинска) */
  noteId?: string
}

/** Извинителна бележка към отсъствията — родителска, медицинска или „други". */
export interface AbsenceNote {
  id: string
  classId: string
  studentId: string
  kind: 'родителска' | 'медицинска' | 'друга'
  from: string
  to: string
  text: string
  /** номер/дата на бележката, напр. „№ 1042 / 12.10.2026" */
  number?: string
  attachment?: string
  authorId: string
  createdAt: string
  /** броят отсъствия в периода, които все още не са уважени */
  unexcusedCount?: number
  /** дали вече е приложена към отсъствията */
  applied?: boolean
}

/** Заявка за изтриване при активиран „стриктен режим" в училището. */
export interface DeleteRequest {
  id: string
  kind: 'оценка' | 'отсъствие' | 'отзив'
  entityId: string
  classId: string
  studentId: string
  reason: string
  requestedById: string
  createdAt: string
  status: 'чакаща' | 'одобрена' | 'отхвърлена'
  decidedById?: string
}

/** Критерий за оценяване на спортна подготовка (норматив). */
export interface Norm {
  id: string
  groupId: string
  subjectId: string
  name: string
  /** мерна единица — сек., м, кг, брой… */
  unit: string
}

/** Резултат от тест по норматив. */
export interface NormResult {
  id: string
  groupId: string
  normId: string
  studentId: string
  /** вид на теста */
  kind: string
  date: string
  /** числов резултат (секунди, метри…) */
  value?: number
  /** оценка */
  grade?: number
}

/** Тренировъчен план — по месеци, за сборна група. */
export interface TrainingPlan {
  id: string
  groupId: string
  month: string
  year: string
  /** микроцикъл */
  micro?: string
  /** период */
  period?: string
  /** мезоцикъл */
  mezo?: string
  /** спортен календар по седмици — 1..5 */
  weeks: {
    no: number
    competition: string
    camp?: string
    /** степен на натоварване */
    load?: 'ниска' | 'средна' | 'висока' | 'максимална'
    /** тренировъчен режим по дни — П тренировка, С състезание, Пч почивка */
    days: string[]
  }[]
  /** средства — брой часове */
  means: { name: string; hours: number }[]
  /** контролни нормативи */
  controlNorms: string
  authorId: string
  updatedAt: string
}

/** Сборна група — паралелка, която се води от няколко класа (спортни училища). */
export interface CombinedGroup {
  id: string
  name: string
  subjectId: string
  classIds: string[]
  studentIds: string[]
  teacherId: string
  /** вид — сборна група или спортна паралелка */
  kind: 'сборна група' | 'спортна паралелка'
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
  /** вид обучение — присъствено или онлайн (ОРЕС) */
  studyKind?: 'Присъствено' | 'Онлайн обучение'
  /** разбиване на един час на две групи — напр. БЕЛ Група 1 и Група 2 */
  groups?: { subjectId: string; teacherId: string; roomId?: string; label: string }[]
  /** период, за който важи разписанието */
  validFrom?: string
  validTo?: string
  /** името на разписанието — напр. „Четни седмици" или „Дневен режим 2" */
  planName?: string
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
  /** кога и от кого е добавена — показва се в раздел „Контролни" */
  createdById?: string
  createdAt?: string
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
  rows: {
    no: number
    topic: string
    hours: number
    month: string
    taken: boolean
    date?: string
    /** НЗ — нови знания, УПР — упражнение, ТК — текущ контрол, ДЗ — домашна работа */
    kind?: 'НЗ' | 'УПР' | 'ТК' | 'ДЗ'
  }[]
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

// ── Раздели в модул „Дневник" ───────────────────────────────────────────────

/** Санкции — заповеди по ЗПУО (забележка, преместване, изключване…). */
export interface Sanction {
  id: string
  studentId: string
  classId: string
  /** вид на санкцията, напр. „Забележка", „Преместване в друга паралелка…" */
  kind: string
  /** номер на заповедта, напр. „РД-006" */
  orderNo: string
  orderDate: string
  from: string
  to: string
  /** основание за санкцията */
  ground?: string
  authorId: string
}

/** Бележка до родител — отделна от отзивите. */
export interface ClassNote {
  id: string
  studentId: string
  classId: string
  text: string
  date: string
  authorId: string
  createdAt: string
  editedById?: string
}

/** Ученическа подкрепа — екип, дейности, основание. */
export interface SupportPlan {
  id: string
  classId: string
  studentId: string
  /** помощна дейност, напр. „Допълнителна консултация по математика" */
  activity: string
  date: string
  /** основание — напр. „Оценка на потребностите" */
  ground: string
  /** екипът, който работи с ученика */
  participantIds: string[]
  authorId: string
}

/** ВЧК — втори час на класа (занимания по интереси/класни дейности). */
export interface VhkLesson {
  id: string
  classId: string
  kind: string
  from: string
  to: string
  /** датата, на която е маркиран като взет */
  takenOn: string
  roomId?: string
  teacherId: string
  description: string
}

/** Родителска среща, насрочена от класния ръководител. */
export interface ClassMeeting {
  id: string
  classId: string
  title: string
  from: string
  to: string
  /** дневен ред на срещата */
  description?: string
  authorId: string
  createdAt: string
}

/** Поправителен изпит — три сесии (I, II и допълнителна). */
export interface CorrectionalExam {
  id: string
  classId: string
  studentId: string
  subjectId: string
  session1?: number
  session2?: number
  sessionExtra?: number
}

/** Приравнителен изпит — вписва се като годишна оценка за учебната година. */
export interface EquivalenceExam {
  id: string
  classId: string
  studentId: string
  subjectId: string
  /** учебна година, напр. „2025-2026" */
  year: string
  grade: number
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
  // раздели в „Дневник"
  sanctions: Sanction[]
  classNotes: ClassNote[]
  supportPlans: SupportPlan[]
  vhkLessons: VhkLesson[]
  classMeetings: ClassMeeting[]
  correctionalExams: CorrectionalExam[]
  equivalenceExams: EquivalenceExam[]
  // по статиите от помощния център
  absenceNotes: AbsenceNote[]
  gradeExemptions: GradeExemption[]
  deleteRequests: DeleteRequest[]
  norms: Norm[]
  normResults: NormResult[]
  trainingPlans: TrainingPlan[]
  combinedGroups: CombinedGroup[]
}
