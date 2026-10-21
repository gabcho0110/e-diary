import type {
  DB, User, Subject, Klass, Student, Grade, Absence, Note, ScheduleEntry, Homework,
  Exam, Message, Test, Material, Task, EventItem, MeetingSlot, Activity, ThemePlan,
  Fee, Room, Competition, Portfolio, StudentProfile, Attestation, LessonAbsence,
  GeneratedDoc, VirtualRoom, IfoDiary, SyncLog, GradeType, RoleId,
  Sanction, ClassNote, SupportPlan, VhkLesson, ClassMeeting,
  CorrectionalExam, EquivalenceExam,
  AbsenceNote, GradeExemption, DeleteRequest, Norm, NormResult, TrainingPlan,
  CombinedGroup, DayRegime, Lesson, LessonReport,
} from './types'

// ── Детерминиран генератор, за да е стабилен наборът от данни ────────────────
function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20261014)
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))
const chance = (p: number) => rnd() < p

/**
 * Отсъствията в едно училище не са равномерно разпределени: повечето ученици
 * имат малко, а малка група натрупва много. Равномерното 0–14 правеше
 * класациите безсмислени (десетки ученици с еднакъв максимум).
 */
function skewedAbsences(): number {
  const r = rnd()
  if (r < 0.55) return int(0, 5)
  if (r < 0.85) return int(6, 12)
  if (r < 0.96) return int(13, 22)
  return int(23, 45)
}

const MALE = ['Иван', 'Георги', 'Димитър', 'Петър', 'Николай', 'Стоян', 'Красимир', 'Тодор', 'Христо', 'Васил', 'Атанас', 'Борис', 'Владимир', 'Емил', 'Живко', 'Кирил', 'Любомир', 'Мартин', 'Недялко', 'Огнян', 'Павел', 'Радослав', 'Симеон', 'Теодор', 'Филип', 'Цветан', 'Чавдар', 'Юлиан', 'Явор', 'Александър', 'Божидар', 'Виктор', 'Габриел', 'Даниел', 'Здравко', 'Илия', 'Йордан', 'Константин', 'Лъчезар', 'Мирослав', 'Орлин', 'Пламен', 'Росен', 'Светослав', 'Траян', 'Християн']
const FEMALE = ['Мария', 'Иванка', 'Елена', 'Петя', 'Анна', 'Виктория', 'Габриела', 'Даниела', 'Ева', 'Жанета', 'Зорница', 'Илияна', 'Йоана', 'Калина', 'Лилия', 'Милена', 'Надежда', 'Олга', 'Павлина', 'Радост', 'Симона', 'Теодора', 'Уляна', 'Фани', 'Христина', 'Цветелина', 'Юлия', 'Яна', 'Александра', 'Боряна', 'Валентина', 'Гергана', 'Десислава', 'Емилия', 'Златина', 'Ивелина', 'Красимира', 'Лора', 'Магдалена', 'Невена', 'Полина', 'Ралица', 'Светла', 'Таня', 'Цветана']
const LAST = ['Иванов', 'Георгиев', 'Димитров', 'Петров', 'Николов', 'Стоянов', 'Кръстев', 'Тодоров', 'Христов', 'Василев', 'Атанасов', 'Борисов', 'Владимиров', 'Емилов', 'Желев', 'Кирилов', 'Мартинов', 'Недялков', 'Огнянов', 'Павлов', 'Радославов', 'Симеонов', 'Теодоров', 'Филипов', 'Цветанов', 'Чавдаров', 'Юлианов', 'Яворов', 'Александров', 'Божидаров', 'Викторов', 'Даниелов', 'Здравков', 'Илиев', 'Йорданов', 'Константинов', 'Мирославов', 'Орлинов', 'Пламенов', 'Росенов', 'Светославов', 'Траянов']

const fem = (l: string) => (l.endsWith('ов') ? l + 'а' : l.endsWith('ев') ? l + 'а' : l)
const STREETS = ['ул. „Витоша“', 'бул. „България“', 'ул. „Раковски“', 'бул. „Драган Цанков“', 'ул. „Шипка“', 'бул. „Мария Луиза“', 'ул. „Оборище“', 'бул. „Сливница“', 'ул. „Граф Игнатиев“', 'бул. „Цариградско шосе“']
const DOCTORS = ['д-р Иванова', 'д-р Петров', 'д-р Костова', 'д-р Георгиева', 'д-р Ангелов', 'д-р Стоянова', 'д-р Тодоров']

const d = (y: number, m: number, day: number) => `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
const uid = (p: string, i: number) => `${p}_${String(i).padStart(4, '0')}`

/** Места на раждане — за колоната „Място на раждане" в раздел „Ученици". */
const BIRTH_PLACES = [
  'София', 'Пловдив', 'Варна', 'Бургас', 'Русе', 'Стара Загора', 'Плевен',
  'Сливен', 'Добрич', 'Шумен', 'Перник', 'Хасково', 'Ямбол', 'Пазарджик',
  'Благоевград', 'Велико Търново', 'Враца', 'Габрово', 'Кърджали', 'Монтана',
]

/**
 * Документите в личното дело на ученика. Показват се като тесни колони с дата
 * в раздел „Ученици", точно както е в референтния дневник.
 */
export const STUDENT_DOCS: { key: string; short: string; label: string }[] = [
  { key: 'zayavlenie', short: 'ЗП', label: 'Заявление за прием' },
  { key: 'akt', short: 'АР', label: 'Копие от акт за раждане' },
  { key: 'medic', short: 'МС', label: 'Медицинско свидетелство' },
  { key: 'vaksini', short: 'ВК', label: 'Карта за ваксинации' },
  { key: 'gdpr', short: 'ДД', label: 'Декларация за защита на личните данни' },
  { key: 'karton', short: 'ЛК', label: 'Личен картон на ученика' },
  { key: 'dogovor', short: 'ДГ', label: 'Договор за обучение' },
  { key: 'eplr', short: 'ЕП', label: 'Решение на ЕПЛР' },
  { key: 'podkrepa', short: 'ПП', label: 'План за подкрепа' },
  { key: 'izvan', short: 'СИ', label: 'Съгласие за извънкласни дейности' },
  { key: 'otsastvia', short: 'ДО', label: 'Декларация за отсъствия' },
  { key: 'belezka', short: 'СБ', label: 'Служебна бележка' },
  { key: 'premestvane', short: 'ПР', label: 'Заповед за преместване' },
]

/** Личното дело — част от документите винаги присъстват, други само при СОП. */
function personalFile(sen: boolean): Record<string, string> {
  const out: Record<string, string> = {}
  for (const doc of STUDENT_DOCS) {
    const conditional = ['eplr', 'podkrepa'].includes(doc.key)
    if (conditional && !sen) continue
    if (!conditional && !chance(0.82)) continue
    out[doc.key] = d(2026 - int(0, 2), int(1, 12), int(1, 28))
  }
  return out
}

export function buildDB(): DB {
  const year = '2026/2027'
  const YEAR = 2026

  const school = {
    id: 'sch_1',
    name: 'СУ „Христо Ботев“',
    city: 'София',
    address: 'бул. „България“ 42',
    principal: 'Николай Димитров Петров',
    phone: '+359 2 812 3456',
    email: 'info@su-hristobotev.bg',
    website: 'https://su-hristobotev.bg',
    year,
    term1: { from: d(YEAR, 9, 15), to: d(2027, 1, 31) },
    term2: { from: d(2027, 2, 1), to: d(2027, 6, 30) },
    nonSchoolDays: [d(2026, 12, 24), d(2026, 12, 25), d(2026, 12, 26), d(2026, 12, 31), d(2027, 1, 1), d(2027, 3, 3), d(2027, 5, 1), d(2027, 5, 6), d(2027, 5, 24)],
    strictMode: false,
    autoExcuse: true,
    diaryLockedUntil: null as string | null,
  }

  // ── Предмети ──────────────────────────────────────────────────────────────
  const subjectsRaw: [string, string, Subject['kind'], string][] = [
    ['Български език и литература', 'БЕЛ', 'ЗП', '#1c62f0'],
    ['Математика', 'МАТ', 'ЗП', '#154cdc'],
    ['Английски език', 'АНГ', 'ЗП', '#7b3ff2'],
    ['Немски език', 'НЕМ', 'ЗП', '#9333ea'],
    ['Информационни технологии', 'ИТ', 'ЗП', '#0e7490'],
    ['История и цивилизации', 'ИЦ', 'ЗП', '#b45309'],
    ['География и икономика', 'ГИ', 'ЗП', '#15803d'],
    ['Биология и здравно образование', 'БЗО', 'ЗП', '#1f9d55'],
    ['Физика и астрономия', 'ФА', 'ЗП', '#0891b2'],
    ['Химия и опазване на околната среда', 'ХООС', 'ЗП', '#0d9488'],
    ['Музика', 'МУЗ', 'ЗП', '#db2777'],
    ['Изобразително изкуство', 'ИИ', 'ЗП', '#e11d48'],
    ['Физическо възпитание и спорт', 'ФВС', 'ЗП', '#ea580c'],
    ['Технологии и предприемачество', 'ТП', 'ЗП', '#78716c'],
    ['Чужд език по професията', 'ЧЕП', 'ПП', '#4f46e5'],
    ['Програмиране', 'ПРОГ', 'ПП', '#1d4ed8'],
    ['Уеб дизайн', 'УЕБ', 'ПП', '#2563eb'],
    ['Предприемачество', 'ПРЕД', 'ПП', '#7c3aed'],
    ['Гражданско образование', 'ГО', 'ЗИП', '#a16207'],
    ['Математика — разширена подготовка', 'МАТ-РП', 'ИУЧ', '#1e40af'],
  ]
  const subjects: Subject[] = subjectsRaw.map(([name, short, kind, color], i) => ({
    id: uid('sub', i + 1), name, short, kind, color,
  }))
  const S = (short: string) => subjects.find((s) => s.short === short)!.id

  // ── Помещения ─────────────────────────────────────────────────────────────
  const rooms: Room[] = []
  const roomKinds: Room['kind'][] = ['кабинет', 'лаборатория', 'спортна зала', 'актова зала', 'библиотека', 'кабинет по ИТ']
  let ri = 0
  for (let f = 1; f <= 3; f++) {
    for (let n = 1; n <= 9; n++) {
      ri++
      rooms.push({
        id: uid('room', ri), floor: f, name: `${f}${String(n).padStart(2, '0')}`,
        kind: n % 4 === 0 ? roomKinds[1] : n === 9 ? roomKinds[5] : roomKinds[0],
        capacity: int(24, 32),
      })
    }
  }
  ri++
  rooms.push({ id: uid('room', ri), floor: 1, name: 'Спортна зала', kind: 'спортна зала', capacity: 120 })
  ri++
  rooms.push({ id: uid('room', ri), floor: 2, name: 'Актова зала', kind: 'актова зала', capacity: 200 })
  ri++
  rooms.push({ id: uid('room', ri), floor: 1, name: 'Библиотека', kind: 'библиотека', capacity: 40 })
  const normalRooms = rooms.filter((r) => r.kind === 'кабинет' || r.kind === 'лаборатория' || r.kind === 'кабинет по ИТ')

  // ── Потребители: администрация и учители ─────────────────────────────────
  const users: User[] = []
  const mk = (
    i: number, fn: string, mn: string, ln: string, roles: RoleId[],
    username: string, email: string, phone: string, extra: Partial<User> = {},
  ): User => {
    const u: User = {
      id: uid('usr', i), username, password: 'demo123',
      firstName: fn, middleName: mn, lastName: ln,
      email, phone, roles, active: true, twoFactor: chance(0.3),
      createdAt: d(YEAR, 9, 1), ...extra,
    }
    users.push(u)
    return u
  }

  const admin = mk(1, 'Симеон', 'Ангелов', 'Кръстев', ['sysadmin'], 'admin', 'admin@su-hristobotev.bg', '+359 888 100 001')
  admin.password = 'admin123'

  const principal = mk(2, 'Николай', 'Димитров', 'Петров', ['director'], 'direktor', 'direktor@su-hristobotev.bg', '+359 888 100 002')
  const deputy = mk(3, 'Мария', 'Иванова', 'Георгиева', ['deputy', 'teacher'], 'zam', 'zam@su-hristobotev.bg', '+359 888 100 003')

  const teacherSpecs: [string, string, string[], RoleId[]][] = [
    ['Елена', 'Петрова', ['БЕЛ'], ['teacher']],
    ['Красимир', 'Стоянов', ['МАТ'], ['teacher']],
    ['Виктория', 'Николова', ['АНГ'], ['teacher']],
    ['Тодор', 'Христов', ['ИТ', 'ПРОГ', 'УЕБ'], ['teacher']],
    ['Радост', 'Иванова', ['ИЦ', 'ГО'], ['teacher']],
    ['Пламен', 'Димитров', ['ГИ'], ['teacher']],
    ['Невена', 'Тодорова', ['БЗО'], ['teacher']],
    ['Огнян', 'Василев', ['ФА'], ['teacher']],
    ['Лилия', 'Атанасова', ['ХООС'], ['teacher']],
    ['Цветелина', 'Борисова', ['МУЗ'], ['teacher']],
    ['Габриела', 'Кирилова', ['ИИ'], ['teacher']],
    ['Стоян', 'Мартинов', ['ФВС'], ['teacher']],
    ['Десислава', 'Павлова', ['ТП', 'ПРЕД'], ['teacher']],
    ['Явор', 'Симеонов', ['НЕМ'], ['teacher']],
    ['Ралица', 'Емилова', ['МАТ-РП'], ['teacher']],
  ]
  const teachers: User[] = []
  teacherSpecs.forEach(([fn, ln, subs, roles], i) => {
    const t = mk(10 + i, fn, pick(LAST), ln, roles,
      `u.${ln.toLowerCase()}`, `${fn.toLowerCase()}.${ln.toLowerCase()}@su-hristobotev.bg`,
      `+359 888 200 ${String(i + 10).padStart(3, '0')}`,
      { subjectIds: subs.map(S) })
    teachers.push(t)
  })

  const psychologist = mk(40, 'Ивелина', 'Стоянова', 'Желева', ['psychologist'], 'psiholog', 'psiholog@su-hristobotev.bg', '+359 888 300 001')
  const speech = mk(41, 'Милена', 'Огнянова', 'Радославова', ['speech_therapist'], 'logoped', 'logoped@su-hristobotev.bg', '+359 888 300 002')
  const nurse = mk(42, 'Таня', 'Илиева', 'Цветанова', ['nurse'], 'medsestra', 'medsestra@su-hristobotev.bg', '+359 888 300 003')
  const librarian = mk(43, 'Надежда', 'Филипова', 'Александрова', ['librarian'], 'bibliotekar', 'biblioteka@su-hristobotev.bg', '+359 888 300 004')
  const accountant = mk(44, 'Валентина', 'Петрова', 'Божидарова', ['accountant'], 'schetovoditel', 'schetovodstvo@su-hristobotev.bg', '+359 888 300 005')
  const secretary = mk(45, 'Гергана', 'Тодорова', 'Викторова', ['secretary'], 'sekretar', 'delovodstvo@su-hristobotev.bg', '+359 888 300 006')
  const educator = mk(46, 'Павлина', 'Симеонова', 'Здравкова', ['educator'], 'vazpitatel', 'codo@su-hristobotev.bg', '+359 888 300 007')
  const resource = mk(47, 'Зорница', 'Атанасова', 'Лъчезарова', ['resource_teacher'], 'resursen', 'resursen@su-hristobotev.bg', '+359 888 300 008')
  const guest = mk(48, 'Илия', 'Георгиев', 'Росенов', ['guest'], 'gost', 'gost@su-hristobotev.bg', '+359 888 300 009')

  // ── Паралелки ─────────────────────────────────────────────────────────────
  const classSpecs: [number, string, string, number, number][] = [
    [5, 'А', '', 2, 24], [5, 'Б', '', 2, 23],
    [6, 'А', '', 2, 25], [6, 'Б', '', 2, 22],
    [7, 'А', 'Математика и информатика', 1, 26], [7, 'Б', '', 1, 24],
    [8, 'А', 'Природни науки', 1, 25], [8, 'Б', 'Хуманитарни науки', 1, 23],
    [9, 'А', 'Софтуерни и хардуерни науки', 1, 26], [9, 'Б', 'Предприемачество', 1, 22],
    [10, 'А', 'Софтуерни и хардуерни науки', 1, 24],
    [11, 'А', 'Икономика и управление', 1, 21],
    [12, 'А', 'Софтуерни и хардуерни науки', 1, 20],
  ]

  const classes: Klass[] = []
  const students: Student[] = []
  let si = 0

  const subjectsForGrade = (g: number): string[] => {
    const base = ['БЕЛ', 'МАТ', 'АНГ', 'ИТ', 'ИЦ', 'ГИ', 'БЗО', 'ФА', 'ХООС', 'МУЗ', 'ИИ', 'ФВС', 'ТП']
    const list = g >= 5 ? base : base.filter((x) => !['ФА', 'ХООС'].includes(x))
    const extra: string[] = []
    if (g >= 8) extra.push('НЕМ', 'ГО')
    if (g >= 9) extra.push('ПРОГ', 'УЕБ')
    if (g >= 11) extra.push('ПРЕД')
    return [...list, ...extra].map(S)
  }

  classSpecs.forEach(([grade, letter, profile, shift, count], ci) => {
    const cid = uid('cls', ci + 1)
    const name = `${grade}-${letter}`
    const homeroom = teachers[ci % teachers.length]
    const classSubjectIds = subjectsForGrade(grade)

    for (let n = 1; n <= count; n++) {
      si++
      const isMale = chance(0.51)
      const fn = isMale ? pick(MALE) : pick(FEMALE)
      const father = pick(MALE)
      const lnRaw = pick(LAST)
      const ln = isMale ? lnRaw : fem(lnRaw)
      const sen = chance(0.055)
      const st: Student = {
        id: uid('std', si),
        firstName: fn,
        middleName: isMale ? `${father}ов` : `${father}ова`,
        lastName: ln,
        egn: `${String(int(1, 25)).padStart(2, '0')}${String(int(1, 12)).padStart(2, '0')}${YEAR - grade - 7}`,
        number: n,
        classId: cid,
        gender: isMale ? 'М' : 'Ж',
        birthDate: d(YEAR - grade - 7, int(1, 12), int(1, 28)),
        address: `${pick(STREETS)} ${int(1, 120)}, ${school.city}`,
        phone: `+359 88${int(6, 9)} ${int(100, 999)} ${int(100, 999)}`,
        email: '',
        parentIds: [],
        status: chance(0.08) ? 'преместен' : 'активен',
        sen,
        senNote: sen ? pick(['Специфични обучителни трудности', 'Хиперактивност и дефицит на вниманието', 'Езиково-говорно нарушение', 'Разстройство от аутистичния спектър']) : undefined,
        ifo: sen && chance(0.35),
        cdo: chance(0.28),
        doctor: pick(DOCTORS),
        admittedAt: d(YEAR, 9, 15),
        birthPlace: pick(BIRTH_PLACES),
        exemptFromGrades: chance(0.04),
        gradesBlocked: chance(0.02),
        mandatorySubjects: chance(0.85),
        documents: personalFile(sen),
      }
      students.push(st)
    }

    classes.push({
      id: cid, grade, letter, name, profile,
      homeroomTeacherId: homeroom.id,
      roomId: pick(normalRooms).id,
      studentIds: students.filter((s) => s.classId === cid).map((s) => s.id),
      subjectIds: classSubjectIds,
      shift: shift as 1 | 2,
      form: 'дневна',
    })
    homeroom.homeroomId = cid
    homeroom.classIds = [...(homeroom.classIds ?? []), cid]
  })

  // разпределяне на предмети и паралелки на учителите
  classes.forEach((k) => {
    k.subjectIds.forEach((sid) => {
      const t = teachers.find((tt) => tt.subjectIds?.includes(sid))
      if (t && !t.classIds?.includes(k.id)) t.classIds = [...(t.classIds ?? []), k.id]
    })
  })
  teachers.forEach((t) => {
    if (!t.classIds?.length) t.classIds = [classes[0].id]
  })

  // ── Родители и ученически акаунти ────────────────────────────────────────
  let ui = 100
  students.forEach((st, idx) => {
    // майка
    ui++
    const mlnRaw = pick(LAST)
    const mother = mk(ui, pick(FEMALE), `${pick(MALE)}ова`, fem(mlnRaw), ['parent'],
      `r.${idx + 1}.m`, `parent${idx + 1}m@example.bg`, `+359 87${int(1, 9)} ${int(100, 999)} ${int(100, 999)}`,
      { childrenIds: [st.id], studentId: st.id })
    // баща
    ui++
    const flnRaw = pick(LAST)
    const father = mk(ui, pick(MALE), `${pick(MALE)}ов`, flnRaw, ['parent'],
      `r.${idx + 1}.f`, `parent${idx + 1}f@example.bg`, `+359 87${int(1, 9)} ${int(100, 999)} ${int(100, 999)}`,
      { childrenIds: [st.id], studentId: st.id })
    st.parentIds = [mother.id, father.id]
    st.email = `${st.firstName.toLowerCase()}.${st.lastName.toLowerCase()}${idx}@student.su-hristobotev.bg`

    // акаунт на ученика (само 8+ клас)
    const k = classes.find((c) => c.id === st.classId)!
    if (k.grade >= 8) {
      ui++
      mk(ui, st.firstName, st.middleName, st.lastName, ['student'],
        `u.${st.firstName.toLowerCase()}${idx}`, st.email, st.phone,
        { studentId: st.id, classIds: [st.classId] })
    }
  })

  // демо акаунти за всяка роля
  const demoStudent = students.find((s) => classes.find((c) => c.id === s.classId)!.grade === 9)!
  // внимателно: родителите също носят `studentId`, затова се търси по роля
  const demoStudentUser = users.find((u) => u.roles.includes('student') && u.studentId === demoStudent.id)!
  demoStudentUser.username = 'ucenik'
  demoStudentUser.password = 'demo123'
  const demoParent = users.find((u) => u.roles.includes('parent') && u.childrenIds?.includes(demoStudent.id))!
  demoParent.username = 'roditel'
  demoParent.password = 'demo123'
  const demoTeacher = teachers[0]
  demoTeacher.username = 'ucitel'
  demoTeacher.password = 'demo123'
  // първият учител вече е зает от `ucitel`, иначе двете имена се застъпват
  const demoClass = teachers.find((t) => t.roles.includes('teacher') && t.id !== demoTeacher.id)!
  demoClass.username = 'klasen'
  demoClass.password = 'demo123'

  // ── Оценки ────────────────────────────────────────────────────────────────
  const GRADE_TYPES: GradeType[] = ['Текуща', 'Контролна работа', 'Класна работа', 'Устно изпитване', 'Практическа', 'Проект', 'Домашна работа']
  const grades: Grade[] = []
  let gi = 0
  const activeStudents = students.filter((s) => s.status === 'активен')

  /** Активните ученици на една паралелка, подредени по номер в класа. */
  const studentsOf = (k: Klass): Student[] =>
    students
      .filter((s) => s.classId === k.id && s.status === 'активен')
      .sort((a, b) => a.number - b.number)

  activeStudents.forEach((st) => {
    const k = classes.find((c) => c.id === st.classId)!
    // оценки по всички предмети на паралелката — иначе в класната книга
    // остават предмети с нула оценки
    const subs = k.subjectIds
    subs.forEach((sid) => {
      const teacher = teachers.find((t) => t.subjectIds?.includes(sid)) ?? teachers[0]
      const gradeValue = () => (st.sen ? int(3, 5) : chance(0.14) ? int(2, 4) : int(4, 6))

      // текущи оценки — разпределени между двата срока.
      // Броят е умишлено нисък: базата се пази и в localStorage (лимит ~5 MB).
      const n = int(1, 3)
      const firstTerm = Math.max(1, Math.round(n / 2))
      for (let i = 0; i < n; i++) {
        gi++
        const term: 1 | 2 = i < firstTerm ? 1 : 2
        const when = term === 1 ? d(YEAR, int(9, 12), int(1, 28)) : d(YEAR + 1, int(1, 6), int(1, 28))
        grades.push({
          id: uid('grd', gi),
          studentId: st.id, subjectId: sid, classId: k.id,
          value: gradeValue(),
          type: pick(GRADE_TYPES),
          date: when,
          term,
          comment: chance(0.12) ? pick(['Отлично представяне', 'Да се обърне внимание на задачите', 'Добра подготовка', 'Непълно решение']) : undefined,
          teacherId: teacher.id,
          draft: chance(0.04),
          qualitative: st.sen && chance(0.3) ? pick(['Постига очакваните резултати', 'Постига частично очакваните резултати', 'Надгражда очакваните резултати']) : undefined,
          createdAt: when,
        })
      }

      // срочна оценка — не за всеки ученик/предмет (срокът може да не е приключил)
      ;([1, 2] as const).forEach((term) => {
        if (!chance(term === 1 ? 0.7 : 0.45)) return
        gi++
        const when = term === 1 ? d(YEAR, 12, 20) : d(YEAR + 1, 6, 15)
        grades.push({
          id: uid('grd', gi), studentId: st.id, subjectId: sid, classId: k.id,
          value: gradeValue(), type: 'Срочна', date: when, term,
          teacherId: teacher.id, draft: false, createdAt: when,
        })
      })

      // годишна — само там, където учебната година е приключила
      if (chance(0.18)) {
        gi++
        const when = d(YEAR + 1, 6, 28)
        grades.push({
          id: uid('grd', gi), studentId: st.id, subjectId: sid, classId: k.id,
          value: gradeValue(), type: 'Годишна', date: when, term: 2,
          teacherId: teacher.id, draft: false, createdAt: when,
        })
      }
    })
  })

  // входно/междинно/изходно ниво
  classes.forEach((k) => {
    ;['Входно ниво', 'Междинно ниво'].forEach((t) => {
      k.studentIds.forEach((sid) => {
        const st = students.find((s) => s.id === sid)
        if (!st || st.status !== 'активен') return
        const sub = k.subjectIds[0]
        const teacher = teachers.find((tt) => tt.subjectIds?.includes(sub)) ?? teachers[0]
        gi++
        grades.push({
          id: uid('grd', gi), studentId: sid, subjectId: sub, classId: k.id,
          value: st.sen ? int(3, 5) : int(3, 6), type: t as GradeType,
          date: t === 'Входно ниво' ? d(YEAR, 9, 22) : d(YEAR, 12, 10),
          term: 1, teacherId: teacher.id, draft: false, createdAt: d(YEAR, 9, 22),
        })
      })
    })
  })

  // ── Отсъствия ────────────────────────────────────────────────────────────
  const absences: Absence[] = []
  let ai = 0
  activeStudents.forEach((st) => {
    const k = classes.find((c) => c.id === st.classId)!
    const n = skewedAbsences()
    for (let i = 0; i < n; i++) {
      ai++
      const excused = chance(0.42)
      const sid = pick(k.subjectIds)
      const teacher = teachers.find((t) => t.subjectIds?.includes(sid)) ?? teachers[0]
      // отсъствия през цялата учебна година, не само в първия срок
      const when = chance(0.45) ? d(YEAR, int(9, 12), int(1, 28)) : d(YEAR + 1, int(1, 6), int(1, 28))
      absences.push({
        id: uid('abs', ai), studentId: st.id, classId: k.id,
        date: when,
        period: int(1, 7), subjectId: sid,
        reason: excused ? pick(['извинено', 'семейни причини'] as const) : pick(['неизвинено', 'закъснение'] as const),
        excused,
        // част от отсъствията са за целия ден — броят се за всички часове
        wholeDay: chance(0.22),
        note: excused && chance(0.5) ? pick(['Медицинска бележка №' + int(1000, 9999), 'Родителска бележка', 'Състезание']) : undefined,
        teacherId: teacher.id, createdAt: when,
      })
    }
  })

  // ── Отзиви и забележки ───────────────────────────────────────────────────
  const notes: Note[] = []
  let ni = 0
  activeStudents.forEach((st) => {
    const k = classes.find((c) => c.id === st.classId)!
    const n = int(1, 4)
    for (let i = 0; i < n; i++) {
      ni++
      const r = rnd()
      const kind = r < 0.55 ? 'Похвала' : r < 0.85 ? 'Забележка' : 'Отзив'
      notes.push({
        id: uid('nte', ni), studentId: st.id, classId: k.id,
        text: kind === 'Похвала'
          ? pick(['Отлично представяне в час', 'Помогна на съученик', 'Активна работа в екип', 'Отличен проект'])
          : kind === 'Забележка'
            ? pick(['Разговаря в час', 'Неподготвен урок', 'Забравени материали', 'Закъснение'])
            : pick(['Добър напредък', 'Редовно посещава занимания', 'Участва в инициатива']),
        kind,
        badge: kind === 'Похвала'
          ? pick(['Активна работа в час', 'Отлично представяне', 'Помощ на съученик', 'Отличен проект'])
          : kind === 'Забележка'
            ? pick(['Разговор в час', 'Неподготвен урок', 'Забравени материали', 'Закъснение'])
            : undefined,
        teacherId: pick(teachers).id,
        date: chance(0.5) ? d(YEAR, int(9, 12), int(1, 28)) : d(YEAR + 1, int(1, 6), int(1, 28)),
        visibleToParent: true,
      })
    }
  })

  // ── Седмично разписание ──────────────────────────────────────────────────
  const schedule: ScheduleEntry[] = []
  let schi = 0
  const periodsByGrade = (g: number) => (g <= 7 ? 6 : 7)
  classes.forEach((k) => {
    const maxP = periodsByGrade(k.grade)
    for (let day = 1; day <= 5; day++) {
      for (let p = 1; p <= maxP; p++) {
        const sid = k.subjectIds[(day * maxP + p + k.grade) % k.subjectIds.length]
        const teacher = teachers.find((t) => t.subjectIds?.includes(sid)) ?? teachers[0]
        schi++
        schedule.push({
          id: uid('sch', schi), classId: k.id, day: day as 1 | 2 | 3 | 4 | 5,
          period: p, subjectId: sid, teacherId: teacher.id,
          roomId: (teacher.subjectIds?.includes(S('ФВС')) ? rooms.find((r) => r.kind === 'спортна зала')!.id : pick(normalRooms).id),
        })
      }
    }
    if (k.grade >= 8) {
      schi++
      schedule.push({
        id: uid('sch', schi), classId: k.id, day: 5, period: maxP + 1,
        subjectId: S('ИТ'), teacherId: teachers[3].id,
        roomId: rooms.find((r) => r.kind === 'кабинет по ИТ')?.id ?? pick(normalRooms).id,
        group: 'Профилираща група', tag: 'ОРЕС',
      })
    }
  })

  // ── Дневни режими ────────────────────────────────────────────────────────
  // Колко часа има учебният ден и кога започват — оттук разписанието взима
  // часовете за всеки ден.
  const regimeHours = (from: string, count: number, duration = 40) => {
    const out: { no: number; start: string; duration: number }[] = []
    let [h, m] = from.split(':').map(Number)
    for (let i = 1; i <= count; i++) {
      out.push({ no: i, start: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, duration })
      m += duration
      if (m >= 60) { h += Math.floor(m / 60); m %= 60 }
      // междучасие от 10 минути, както е в повечето училища
      m += 10
      if (m >= 60) { h += Math.floor(m / 60); m %= 60 }
    }
    return out
  }

  const regimes: DayRegime[] = [
    { id: 'rgm_1', name: 'Смяна 1', different: false, hours: regimeHours('08:00', 7), createdAt: '2026-09-01 08:00' },
    { id: 'rgm_2', name: 'Смяна 2', different: false, hours: regimeHours('13:00', 6), createdAt: '2026-09-01 08:00' },
    { id: 'rgm_3', name: 'Методиев', different: false, hours: regimeHours('10:00', 1, 40), createdAt: '2026-09-01 08:00' },
    {
      id: 'rgm_4', name: 'Първи срок (V–VII клас)', different: false,
      hours: regimeHours('08:30', 6), createdAt: '2026-09-01 08:00',
    },
    {
      id: 'rgm_5', name: 'Петък — съкратен', different: true,
      hours: regimeHours('08:00', 7),
      byDay: {
        '1': regimeHours('08:00', 7), '2': regimeHours('08:00', 7), '3': regimeHours('08:00', 7),
        '4': regimeHours('08:00', 7), '5': regimeHours('08:00', 5),
      },
      createdAt: '2026-09-01 08:00',
    },
  ]

  const lessons: Lesson[] = []
  const lessonReports: LessonReport[] = []

  // ── Домашни работи ───────────────────────────────────────────────────────
  const homework: Homework[] = []
  let hi = 0
  classes.slice(0, 8).forEach((k) => {
    for (let i = 0; i < 6; i++) {
      hi++
      const sid = pick(k.subjectIds)
      const teacher = teachers.find((t) => t.subjectIds?.includes(sid)) ?? teachers[0]
      const dt = d(YEAR, int(10, 12), int(1, 28))
      homework.push({
        id: uid('hw', hi), classId: k.id, subjectId: sid, teacherId: teacher.id,
        date: dt, dueDate: dt,
        text: pick([
          'Упражнение 12, стр. 84 — задачи 1 до 5',
          'Прочетете текста и отговорете на въпросите в тетрадката',
          'Подгответе презентация по избрана тема (5 слайда)',
          'Решете задачите от работния лист',
          'Напишете есе до 1 страница по зададена тема',
          'Преговорете материала за контролната работа',
        ]),
      })
    }
  })

  // ── График на контролните ────────────────────────────────────────────────
  const exams: Exam[] = []
  let ei = 0
  classes.forEach((k) => {
    for (let i = 0; i < 4; i++) {
      ei++
      const sid = pick(k.subjectIds)
      const teacher = teachers.find((t) => t.subjectIds?.includes(sid)) ?? teachers[0]
      exams.push({
        id: uid('exm', ei), classId: k.id, subjectId: sid, teacherId: teacher.id,
        date: d(YEAR, int(11, 12), int(1, 28)), period: int(1, 6),
        kind: pick(['Контролна работа', 'Класна работа', 'Тест', 'Диктовка'] as const),
        topic: pick(['Събиране и изваждане на дроби', 'Анализ на литературен текст', 'Present Perfect Tense', 'Алгоритми и блок-схеми', 'Клетка — строеж и функции', 'Османско владичество', 'Промени в климата', 'Създаване на уеб страница']),
        createdById: teacher.id,
        createdAt: `${d(YEAR, int(9, 10), int(1, 28))} ${String(int(8, 20)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}`,
      })
    }
  })

  // ── Съобщения ────────────────────────────────────────────────────────────
  const messages: Message[] = []
  let mi = 0
  const msgTopics: [string, string][] = [
    ['Родителска среща', 'Уважаеми родители, напомням ви, че родителската среща ще се проведе в четвъртък от 18:00 ч. в кабинета на класа. Ще обсъдим успеха и отсъствията за първия срок.'],
    ['Контролна работа по математика', 'Уважаеми родители, на 12 декември ще се проведе контролна работа по математика. Моля, осигурете спокойна подготовка на децата.'],
    ['Екскурзия до Пловдив', 'Скъпи ученици, екскурзията до Пловдив ще се състои на 20 октомври. Сборният пункт е пред училището в 7:30 ч.'],
    ['Заседание на педагогическия съвет', 'Уважаеми колеги, заседанието на педагогическия съвет ще се проведе в понеделник от 14:30 ч. в актовата зала.'],
    ['Ученическа подкрепа', 'Уважаеми колеги, моля попълнете формулярите за ученическа подкрепа до края на седмицата.'],
    ['Отчет за първия срок', 'Уважаеми колеги, срочните оценки трябва да бъдат въведени до 25 януари.'],
    ['Състезание по информатика', 'Скъпи ученици, училищният кръг на състезанието по информатика ще се проведе на 15 ноември от 9:00 ч.'],
    ['Домашно по български език', 'Уважаеми ученици, не забравяйте да предадете есетата си до петък.'],
  ]
  for (let i = 0; i < 40; i++) {
    mi++
    const [subj, body] = msgTopics[i % msgTopics.length]
    const from = pick(users.filter((u) => u.roles.some((r) => r !== 'parent' && r !== 'student')))
    const k = pick(classes)
    const toIds = [pick(teachers).id, admin.id, deputy.id]
    messages.push({
      id: uid('msg', mi), fromId: from.id, toIds,
      subject: subj, body, date: d(YEAR, int(9, 12), int(1, 28)),
      readBy: chance(0.5) ? [admin.id] : [], archived: chance(0.15), folder: 'inbox',
      allowReplies: true, hideRecipients: false, attachments: [],
    })
  }
  // съобщение до класа
  mi++
  messages.push({
    id: uid('msg', mi), fromId: demoClass.id,
    toIds: students.filter((s) => s.classId === demoClass.homeroomId).map((s) => s.id),
    subject: 'Важно за класа',
    body: 'Напомням, че утре имаме час на класа с тема „Превенция на зависимостите“. Моля, бъдете в час.',
    date: d(YEAR, 12, 5), readBy: [], archived: false, folder: 'inbox',
    allowReplies: false, hideRecipients: true, attachments: [],
  })

  // ── Тестове ──────────────────────────────────────────────────────────────
  const tests: Test[] = []
  const testTitles = ['Входно ниво — математика', 'Тест: Литература на Възраждането', 'English Placement Test', 'Тест по информационни технологии', 'Тест: Човешкото тяло', 'Тест: Географски карти', 'Упражнение: Алгебра', 'Тест: Химични елементи']
  testTitles.forEach((title, i) => {
    const k = classes[i % classes.length]
    const sid = k.subjectIds[i % k.subjectIds.length]
    const teacher = teachers.find((t) => t.subjectIds?.includes(sid)) ?? teachers[0]
    const qs = Array.from({ length: int(4, 8) }, (_, qi) => ({
      id: `q_${i}_${qi}`,
      text: pick([
        'Кое от посочените е вярно?',
        'Изчислете стойността на израза.',
        'Кой е авторът на произведението?',
        'Кое твърдение е невярно?',
        'Подредете елементите по големина.',
      ]),
      type: 'single' as const,
      options: ['Отговор А', 'Отговор Б', 'Отговор В', 'Отговор Г'],
      correct: [int(0, 3)],
      points: 1,
    }))
    tests.push({
      id: uid('tst', i + 1), title, classId: k.id, subjectId: sid, teacherId: teacher.id,
      kind: i % 3 === 0 ? 'изпитен' : 'упражнителен', questions: qs,
      timeLimit: int(20, 60),
      visibility: pick(['само учителя', 'класа', 'всички'] as const),
      createdAt: d(YEAR, int(9, 12), int(1, 28)),
      attempts: k.studentIds.slice(0, int(3, 12)).map((s) => ({
        studentId: s, score: int(2, qs.length), max: qs.length, date: d(YEAR, int(10, 12), int(1, 28)),
      })),
    })
  })

  // ── Учебни материали ─────────────────────────────────────────────────────
  const materials: Material[] = []
  const matTitles = ['Работен лист — дроби', 'Презентация: Възраждане', 'Видео урок: Present Perfect', 'Конспект по физика', 'Задачи за упражнение', 'Схема на човешкото сърце', 'Линк към интерактивна карта', 'Примерни тестове за НВО']
  matTitles.forEach((title, i) => {
    const k = classes[i % classes.length]
    const sid = k.subjectIds[i % k.subjectIds.length]
    const teacher = teachers.find((t) => t.subjectIds?.includes(sid)) ?? teachers[0]
    materials.push({
      id: uid('mat', i + 1), title, subjectId: sid, classId: k.id, teacherId: teacher.id,
      kind: pick(['документ', 'презентация', 'видео', 'линк', 'снимка'] as const),
      url: 'https://example.bg/material/' + (i + 1),
      description: 'Допълнителен материал към темата. Подходящ за самоподготовка.',
      date: d(YEAR, int(9, 12), int(1, 28)),
      access: pick(['всички', 'класа', 'избрани'] as const),
      likes: int(0, 24),
    })
  })

  // ── Задачи ───────────────────────────────────────────────────────────────
  const tasks: Task[] = []
  const taskTitles: [string, string, Task['priority']][] = [
    ['Попълване на срочни оценки', 'Въведете срочните оценки по своите предмети до 25 януари.', 'висок'],
    ['Актуализация на тематични разпределения', 'Проверете съответствието на разпределенията с взетите часове.', 'среден'],
    ['Подготовка на справка за НЕИСПУО', 'Изгответе справката за отсъствия и оценки.', 'висок'],
    ['Инвентаризация на библиотечния фонд', 'Преброяване на учебниците в библиотеката.', 'нисък'],
    ['Организиране на родителска среща', 'Насрочване и уведомяване на родителите.', 'среден'],
    ['Проверка на медицинските бележки', 'Въведете новите медицински бележки в дневника.', 'среден'],
    ['Обновяване на училищния сайт', 'Публикуване на новините за месеца.', 'нисък'],
  ]
  taskTitles.forEach(([title, description, priority], i) => {
    const assignee = pick(users.filter((u) => u.roles.some((r) => ['teacher', 'deputy', 'secretary', 'accountant'].includes(r))))
    const status = pick(['нова', 'в процес', 'изпълнена', 'просрочена'] as const)
    tasks.push({
      id: uid('tsk', i + 1), title, description,
      assignedToIds: [assignee.id], assignedById: deputy.id,
      dueDate: d(YEAR, int(11, 12), int(1, 28)), priority, status,
      createdAt: d(YEAR, int(10, 11), int(1, 28)),
      completedAt: status === 'изпълнена' ? d(YEAR, 12, int(1, 20)) : undefined,
      result: status === 'изпълнена' ? 'Изпълнено в срок.' : undefined,
    })
  })

  // ── Събития ──────────────────────────────────────────────────────────────
  type EventSeed = Omit<EventItem, 'id' | 'description' | 'createdById' | 'invitedClassIds' | 'invitedUserIds'>
  const events: EventItem[] = ([
    { title: 'Откриване на учебната година', kind: 'Училищно', date: d(YEAR, 9, 15), place: 'Училищен двор' },
    { title: 'Родителска среща — първи срок', kind: 'Родителска среща', date: d(YEAR, 10, 22), place: 'Актова зала' },
    { title: 'Екскурзия до Пловдив', kind: 'Екскурзия', date: d(YEAR, 10, 20), place: 'Пловдив' },
    { title: 'Ден на народните будители', kind: 'Празник', date: d(YEAR, 11, 1), place: 'Актова зала' },
    { title: 'Училищен кръг по информатика', kind: 'Състезание', date: d(YEAR, 11, 15), place: 'Кабинет по ИТ' },
    { title: 'Коледен концерт', kind: 'Празник', date: d(YEAR, 12, 21), place: 'Актова зала' },
    { title: 'Класна среща 9-А', kind: 'Класно', date: d(YEAR, 12, 8), place: 'Кабинет 208' },
    { title: 'Спортен празник', kind: 'Училищно', date: d(YEAR, 11, 28), place: 'Спортна зала' },
  ] as EventSeed[]).map((e, i) => ({
    ...e, id: uid('evt', i + 1), description: 'Повече информация при класния ръководител.',
    createdById: deputy.id, invitedClassIds: classes.map((c) => c.id), invitedUserIds: [],
  }))

  // ── Срещи ────────────────────────────────────────────────────────────────
  const meetings: MeetingSlot[] = []
  let msi = 0
  teachers.slice(0, 6).forEach((t) => {
    const parents = users.filter((u) => u.roles.includes('parent')).slice(0, 14)
    parents.forEach((p, i) => {
      msi++
      const status = pick(['свободен', 'зает', 'свободен'] as const)
      meetings.push({
        id: uid('mtg', msi), teacherId: t.id,
        parentId: status === 'зает' ? p.id : null,
        date: d(YEAR, 10, 22),
        from: `${String(17 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`,
        to: `${String(17 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15 + 15).padStart(2, '0')}`,
        status,
        topic: status === 'зает' ? 'Обсъждане на успеха и отсъствията' : undefined,
      })
    })
  })

  // ── Извънкласни дейности ─────────────────────────────────────────────────
  const activities: Activity[] = [
    ['Клуб по роботика', 'клуб'], ['Волейболен отбор', 'спорт'], ['Театрално студио', 'изкуство'],
    ['Училищен вестник', 'проект'], ['Програмиране с Python', 'клуб'], ['Хор „Ботевци“', 'изкуство'],
    ['Еко патрул', 'проект'], ['Баскетбол', 'спорт'], ['ДПЛР — логопедична подкрепа', 'ДПЛР'],
  ].map(([name, kind], i) => {
    const k = classes[i % classes.length]
    const leader = pick(teachers)
    return {
      id: uid('act', i + 1), name, kind: kind as Activity['kind'],
      leaderId: leader.id, classIds: [k.id],
      participantIds: k.studentIds.slice(0, int(8, 18)),
      schedule: pick(['вторник 14:30', 'сряда 15:00', 'четвъртък 14:00', 'петък 15:30']),
      room: pick(rooms).name,
    }
  })

  // ── Тематични разпределения ──────────────────────────────────────────────
  const themePlans: ThemePlan[] = []
  let tpi = 0
  teachers.slice(0, 8).forEach((t, ti) => {
    const k = classes[ti % classes.length]
    const sid = t.subjectIds?.[0] ?? S('МАТ')
    const topics = [
      'Повторение на изученото', 'Основни понятия и определения', 'Практически упражнения',
      'Контролна работа', 'Нови знания — първа част', 'Нови знания — втора част',
      'Обобщение и систематизация', 'Проектна дейност',
    ]
    tpi++
    themePlans.push({
      id: uid('thm', tpi), subjectId: sid, classId: k.id, teacherId: t.id, year,
      rows: topics.map((topic, i) => ({
        no: i + 1, topic, hours: int(2, 6),
        month: ['Септември', 'Октомври', 'Ноември', 'Декември', 'Януари', 'Февруари', 'Март', 'Април'][i],
        taken: i < 4, date: i < 4 ? d(YEAR, 9 + i, 10) : undefined,
        // вид на часа по образеца: НЗ — нови знания, УПР — упражнение, ТК — текущ контрол
        kind: (['НЗ', 'НЗ', 'УПР', 'ТК', 'НЗ', 'УПР', 'УПР', 'ДЗ'] as const)[i],
      })),
    })
  })

  // ── Такси ────────────────────────────────────────────────────────────────
  const fees: Fee[] = []
  let fi = 0
  const feeCategories = ['Такса за учебници', 'Такса за екскурзия', 'Такса за занимания по интереси', 'Такса за лагер', 'Такса за изпити']
  students.slice(0, 90).forEach((st) => {
    fi++
    const amount = int(20, 180)
    const paid = pick([0, amount, Math.floor(amount / 2)])
    fees.push({
      id: uid('fee', fi), studentId: st.id, category: pick(feeCategories),
      amount, paid, dueDate: d(YEAR, int(10, 12), int(1, 28)),
      status: paid >= amount ? 'платена' : paid > 0 ? 'частична' : 'неплатена',
      note: paid === 0 ? 'Напомняне изпратено' : undefined,
    })
  })

  // ── Състезания ───────────────────────────────────────────────────────────
  const competitions: Competition[] = [
    ['Училищен кръг по математика', 'МАТ', 'училищен'],
    ['Общински кръг по информатика', 'ПРОГ', 'общински'],
    ['Национално състезание по английски език', 'АНГ', 'национален'],
    ['Областен кръг по биология', 'БЗО', 'областен'],
    ['Международно състезание „Кенгуру“', 'МАТ', 'международен'],
  ].map(([name, sub, level], i) => {
    const k = classes[(i + 2) % classes.length]
    return {
      id: uid('cmp', i + 1), name, subjectId: S(sub), date: d(YEAR, int(10, 12), int(1, 28)),
      place: pick(['София', 'Пловдив', 'Варна', 'Училището']),
      level: level as Competition['level'], active: i < 3,
      results: k.studentIds.slice(0, int(3, 8)).map((s, ri) => ({
        studentId: s, place: ri + 1, points: int(40, 100),
      })),
    }
  })

  // ── Портфолиа ────────────────────────────────────────────────────────────
  const portfolios: Portfolio[] = teachers.slice(0, 6).map((t, i) => ({
    id: uid('prt', i + 1), userId: t.id, kind: 'учителско' as const,
    school: school.name, position: 'Учител',
    startYear: String(YEAR - int(3, 18)),
    sections: {
      'Общи данни': `${t.firstName} ${t.middleName} ${t.lastName}, учител по ${subjects.find((s) => s.id === t.subjectIds?.[0])?.name}.`,
      'Моят опит': 'Преподавателски опит в средното образование, участие в национални програми и проекти.',
      'Компетентности': 'Дигитални компетентности, работа в екип, управление на клас.',
      'Постижения': 'Подготвени ученици за национални състезания и олимпиади.',
      'Самооценка': 'Постоянно усъвършенстване и прилагане на иновативни методи.',
      'Критерии': 'Изпълнени критерии по Наредба № 15.',
    },
    shared: chance(0.6), hideContacts: chance(0.5), likes: Array.from({ length: int(0, 8) }, () => pick(teachers).id),
    updatedAt: d(YEAR, int(10, 12), int(1, 28)),
  }))

  // ── Характеристики на ученика ────────────────────────────────────────────
  const studentProfiles: StudentProfile[] = students.slice(0, 40).map((st, i) => {
    const k = classes.find((c) => c.id === st.classId)!
    return {
      id: uid('spr', i + 1), studentId: st.id, campaign: `Кампания ${year}`,
      subjects: k.subjectIds.slice(0, 4).map((sid) => ({
        subjectId: sid,
        grade: int(3, 6),
        assessorId: teachers.find((t) => t.subjectIds?.includes(sid))?.id ?? teachers[0].id,
      })),
      params: [
        { name: 'Учебна активност', value: int(3, 6), assessorId: teachers[0].id },
        { name: 'Социална адаптация', value: int(3, 6), assessorId: psychologist.id },
        { name: 'Емоционална устойчивост', value: int(3, 6), assessorId: psychologist.id },
      ],
      status: pick(['чернова', 'подадена', 'оценена', 'потвърдена', 'възражение'] as const),
      updatedAt: d(YEAR, int(11, 12), int(1, 28)),
    }
  })

  // ── Атестации ────────────────────────────────────────────────────────────
  const attestations: Attestation[] = teachers.slice(0, 10).map((t, i) => ({
    id: uid('att', i + 1), teacherId: t.id, template: 'Атестационна карта — учител',
    year, status: pick(['чернова', 'самооценка', 'оценяване', 'потвърдена', 'възражение'] as const),
    selfScore: int(60, 95), commissionScore: int(60, 95),
    commissionIds: [deputy.id, principal.id, teachers[(i + 1) % teachers.length].id],
    criteria: [
      { name: 'Планиране и провеждане на урока', weight: 30, score: int(2, 4) },
      { name: 'Оценяване на резултатите', weight: 25, score: int(2, 4) },
      { name: 'Работа с ученици и родители', weight: 25, score: int(2, 4) },
      { name: 'Квалификация и развитие', weight: 20, score: int(2, 4) },
    ],
    updatedAt: d(YEAR, int(10, 12), int(1, 28)),
  }))

  // ── Учителски отсъствия и замествания ────────────────────────────────────
  const lessonAbsences: LessonAbsence[] = teachers.slice(0, 8).map((t, i) => ({
    id: uid('lab', i + 1), teacherId: t.id,
    date: d(YEAR, int(10, 12), int(1, 28)),
    periods: [int(1, 3), int(4, 6)],
    substituteIds: i % 3 === 0 ? [] : [teachers[(i + 5) % teachers.length].id],
    reason: pick(['Болничен', 'Служебна командировка', 'Отпуск', 'Квалификационен курс']),
    kind: i % 3 === 0 ? 'без заместник' : 'със заместник',
    nationalProgram: i === 1,
  }))

  // ── Ученически документи ─────────────────────────────────────────────────
  const docTemplates = [
    ['У-1', 'Удостоверение за редовно обучение'],
    ['У-3', 'Удостоверение за завършен клас'],
    ['3-31', 'Свидетелство за основно образование'],
    ['3-44', 'Диплома за средно образование'],
    ['3-54', 'Свидетелство за професионална квалификация'],
    ['3-103', 'Дубликат на документ'],
    ['ЛК', 'Личен картон на ученик'],
  ]
  const docs: GeneratedDoc[] = students.slice(0, 18).map((st, i) => ({
    id: uid('doc', i + 1),
    templateId: docTemplates[i % docTemplates.length][0],
    studentId: st.id,
    number: `${int(100, 999)}/${d(YEAR, int(9, 12), 1).slice(0, 4)}`,
    date: d(YEAR, int(9, 12), int(1, 28)),
    createdById: secretary.id,
    payload: { среден_успех: (int(40, 60) / 10).toFixed(2), клас: classes.find((c) => c.id === st.classId)!.name },
  }))

  // ── Деловодство: книги и протоколи ──────────────────────────────────────
  const delovodstvoDocs: GeneratedDoc[] = [
    ['ПР-1', 'Протокол № 1 от педагогически съвет'],
    ['ПР-2', 'Протокол № 2 от педагогически съвет'],
    ['ЗП-1', 'Заповед № 1 / записване на ученик'],
    ['ЗП-2', 'Заповед № 2 / назначаване на комисия'],
    ['КР-1', 'Книга за контролна дейност на директора'],
    ['КС-1', 'Книга за решения на педагогическия съвет'],
  ].map(([code, name], i) => ({
    id: uid('dvd', i + 1), templateId: code, number: `${i + 1}`, date: d(YEAR, int(9, 12), int(1, 28)),
    createdById: secretary.id, payload: { име: name },
  }))

  // ── Виртуална класна стая ────────────────────────────────────────────────
  const virtualRooms: VirtualRoom[] = classes.slice(0, 6).map((k, i) => {
    const sid = k.subjectIds[i % k.subjectIds.length]
    const teacher = teachers.find((t) => t.subjectIds?.includes(sid)) ?? teachers[0]
    return {
      id: uid('vcr', i + 1), name: `ВКС ${k.name} — ${subjects.find((s) => s.id === sid)!.short}`,
      classId: k.id, subjectId: sid, teacherId: teacher.id,
      openFrom: d(YEAR, 10, 1), openTo: d(YEAR, 12, 30),
      active: i < 4,
      sessions: Array.from({ length: int(3, 8) }, () => ({
        date: d(YEAR, int(10, 12), int(1, 28)), students: int(12, 26), minutes: int(30, 55),
      })),
    }
  })

  // ── ИФО / ДПЛР дневници ──────────────────────────────────────────────────
  const senStudents = students.filter((s) => s.sen).slice(0, 10)
  const ifoDiaries: IfoDiary[] = senStudents.map((st, i) => {
    const k = classes.find((c) => c.id === st.classId)!
    return {
      id: uid('ifo', i + 1), studentId: st.id, subjectId: k.subjectIds[0],
      teacherId: resource.id, kind: i % 2 === 0 ? 'ИФО' : 'ДПЛР',
      schedule: [{ day: 2, period: 6 }, { day: 4, period: 7 }],
      entries: Array.from({ length: int(3, 7) }, (_, j) => ({
        date: d(YEAR, 10 + Math.floor(j / 4), int(1, 28)),
        topic: pick(['Фонематичен слух', 'Развитие на фината моторика', 'Социални умения', 'Четене с разбиране', 'Математически представи']),
        hours: 1,
      })),
    }
  })

  // ── НЕИСПУО синхронизация ────────────────────────────────────────────────
  const syncLogs: SyncLog[] = [
    { id: 'sync_1', direction: 'качване', entity: 'Оценки — първи срок', count: grades.length, date: d(YEAR, 12, 20), status: 'успех', message: 'Успешно качени записи.' },
    { id: 'sync_2', direction: 'качване', entity: 'Отсъствия', count: absences.length, date: d(YEAR, 12, 20), status: 'успех', message: 'Успешно качени записи.' },
    { id: 'sync_3', direction: 'сваляне', entity: 'Паралелки и групи', count: classes.length, date: d(YEAR, 9, 10), status: 'успех', message: 'Синхронизирани групи.' },
    { id: 'sync_4', direction: 'качване', entity: 'Ученици в СФО', count: 4, date: d(YEAR, 11, 5), status: 'грешка', message: 'Невалиден ЕГН на 2 записа.' },
  ]

  // ── Раздели в „Дневник" ──────────────────────────────────────────────────
  // Въвеждаме само онова, което референтният дневник също показва запълнено:
  // родителски срещи, санкции и бележки към преместените ученици. Останалите
  // раздели (ВЧК, подкрепа, поправителни/приравнителни изпити) остават празни,
  // за да се вижда празното им състояние — точно както в образеца.

  const classMeetings: ClassMeeting[] = classes.map((k, i) => ({
    id: uid('mtg', i + 1),
    classId: k.id,
    title: `Родителска среща в ${k.name}`,
    from: `${d(YEAR, 10, 10)}T20:30`,
    to: `${d(YEAR, 10, 10)}T21:30`,
    authorId: k.homeroomTeacherId ?? admin.id,
    createdAt: d(YEAR, 10, 9),
  }))

  const sanctionKinds = [
    'Забележка',
    'Преместване в друга паралелка в същото училище',
    'Предупреждение за изключване',
  ]
  const sanctions: Sanction[] = []
  let sni = 0
  classes.forEach((k) => {
    // санкции получават само учениците, които вече не са в паралелката
    students.filter((s) => s.classId === k.id && s.status !== 'активен').forEach((st) => {
      const n = int(1, 2)
      for (let i = 0; i < n; i++) {
        sni++
        sanctions.push({
          id: uid('snc', sni),
          studentId: st.id,
          classId: k.id,
          kind: sanctionKinds[Math.min(sni % sanctionKinds.length, sanctionKinds.length - 1)],
          orderNo: `РД-${String(sni + 3).padStart(3, '0')}`,
          orderDate: d(YEAR, 10, 2),
          from: d(YEAR, 10, 2),
          to: d(YEAR + 1, 7, 2),
          authorId: k.homeroomTeacherId ?? admin.id,
        })
      }
    })
  })

  const classNotes: ClassNote[] = []
  const supportPlans: SupportPlan[] = []
  const vhkLessons: VhkLesson[] = []
  const correctionalExams: CorrectionalExam[] = []
  const equivalenceExams: EquivalenceExam[] = []

  // ── Извинителни бележки към отсъствията ──────────────────────────────────
  // Референтният дневник държи три вида: родителски (въведени от родител или
  // класен), медицински (идват от интеграцията с МЗ) и „други".
  const noteTexts = [
    'Ученикът отсъства по семейни причини.',
    'Отсъствие по здравословни причини — в домашни условия.',
    'Отсъствие, уважено от класния ръководител.',
    'Отсъствие по лични причини, съгласувано с родител.',
  ]
  const absenceNotes: AbsenceNote[] = []
  let ani = 0
  classes.forEach((k) => {
    studentsOf(k).slice(0, 6).forEach((st, si) => {
      if (!chance(0.45)) return
      ani++
      const kind: AbsenceNote['kind'] = si % 3 === 0 ? 'медицинска' : si % 3 === 1 ? 'родителска' : 'друга'
      const day = int(2, 24)
      const span = kind === 'родителска' ? int(1, 5) : int(1, 3)
      absenceNotes.push({
        id: uid('abn', ani),
        classId: k.id,
        studentId: st.id,
        kind,
        from: d(YEAR, 10, day),
        to: d(YEAR, 10, Math.min(28, day + span)),
        text: noteTexts[ani % noteTexts.length],
        number: `№ ${1000 + ani} / ${d(YEAR, 10, day)}`,
        authorId: kind === 'медицинска' ? nurse.id : (k.homeroomTeacherId ?? admin.id),
        createdAt: d(YEAR, 10, day),
        applied: kind === 'медицинска',
      })
    })
  })

  // ── Освобождаване от оценяване по предмет (най-често ФВС) ────────────────
  const gradeExemptions: GradeExemption[] = []
  const peSubject = subjects.find((s) => /физическо|фвс/i.test(s.name))
  if (peSubject) {
    studentsOf(classes[0]).slice(0, 3).forEach((st, i) => {
      gradeExemptions.push({
        id: uid('gex', i + 1),
        studentId: st.id,
        subjectId: peSubject.id,
        term: 1,
        authorId: classes[0].homeroomTeacherId ?? admin.id,
        date: d(YEAR, 10, 12),
      })
    })
  }

  // ── Сборни групи (спортни училища) ───────────────────────────────────────
  const combinedGroups: CombinedGroup[] = [
    {
      id: 'cgr_1',
      name: 'ФВС — сборна група (8-А + 8-Б)',
      subjectId: peSubject?.id ?? subjects[0].id,
      classIds: classes.slice(0, 2).map((c) => c.id),
      studentIds: classes.slice(0, 2).flatMap((c) => studentsOf(c).slice(0, 8).map((s) => s.id)),
      teacherId: teachers[0].id,
      kind: 'сборна група',
    },
    {
      id: 'cgr_2',
      name: 'Спортна паралелка — лека атлетика',
      subjectId: peSubject?.id ?? subjects[0].id,
      classIds: classes.slice(0, 1).map((c) => c.id),
      studentIds: studentsOf(classes[0]).slice(0, 10).map((s) => s.id),
      teacherId: teachers[0].id,
      kind: 'спортна паралелка',
    },
  ]

  // Критериите идват от системата за оценяване на спортната подготовка.
  const normDefs = [
    { name: 'Бягане 60 м', unit: 'сек.' },
    { name: 'Скок на дължина от място', unit: 'см' },
    { name: 'Хвърляне на топка 1 кг', unit: 'м' },
    { name: 'Бягане 1000 м', unit: 'мин.' },
    { name: 'Лицеви опори', unit: 'брой' },
  ]
  const norms: Norm[] = normDefs.map((n, i) => ({
    id: uid('nrm', i + 1),
    groupId: 'cgr_1',
    subjectId: combinedGroups[0].subjectId,
    name: n.name,
    unit: n.unit,
  }))

  // ── Резултати в раздел „Резултати" ───────────────────────────────────────
  // Годишен успех, ООП, РП и ДО се нанасят от класния; удостоверението се
  // попълва в края на начален етап (1–3 клас).
  students.forEach((st) => {
    const k = classes.find((c) => c.id === st.classId)
    if (!k) return
    const annual = 4 + Math.round(rnd() * 20) / 10 // 4,0 – 6,0
    st.annualResults = {
      annualGrade: Math.min(6, Math.max(3, Number(annual.toFixed(2)))),
      oop: chance(0.35) ? Math.min(6, Math.max(3, Number((4 + rnd() * 2).toFixed(2)))) : undefined,
      rp: chance(0.25) ? Math.min(6, Math.max(3, Number((4 + rnd() * 2).toFixed(2)))) : undefined,
      doResult: chance(0.2) ? Math.min(6, Math.max(3, Number((4 + rnd() * 2).toFixed(2)))) : undefined,
    }
    if (k.grade <= 3) {
      st.annualResults.certificateNo = `${100 + st.number} / ${d(YEAR + 1, 6, 15)}`
      st.annualResults.certificateDate = d(YEAR + 1, 6, 15)
    }
    if (k.grade >= 7 && chance(0.5)) {
      const subs = k.subjectIds.slice(0, 3)
      st.nvoResults = subs.slice(0, 2).map((sid, i) => ({
        id: uid('nvo', students.indexOf(st) * 10 + i),
        subjectId: sid,
        points: int(40, 95),
        maxPoints: 100,
        grade: Number((3.5 + rnd() * 2.5).toFixed(2)),
        date: d(YEAR + 1, 6, 10),
      }))
    }
  })

  // ── ДЗИ — само за зрелостниците (12 клас) ────────────────────────────────
  classes.filter((k) => k.grade === 12).forEach((k) => {
    studentsOf(k).forEach((st, i) => {
      st.dziResults = [
        { id: uid('dzi', i * 3 + 1), examNo: 1, subjectId: k.subjectIds[0], kind: 'ООП', points: int(50, 92), grade: Number((4 + rnd() * 2).toFixed(2)), date: d(YEAR + 1, 5, 20) },
        { id: uid('dzi', i * 3 + 2), examNo: 2, subjectId: k.subjectIds[1] ?? k.subjectIds[0], kind: 'ПП', points: int(45, 90), grade: Number((4 + rnd() * 2).toFixed(2)), date: d(YEAR + 1, 5, 23) },
      ]
    })
  })

  const deleteRequests: DeleteRequest[] = []
  const normResults: NormResult[] = []
  const trainingPlans: TrainingPlan[] = []

  return {
    school, users, subjects, classes, students, grades, absences, notes, schedule, regimes, lessons, lessonReports,
    homework, exams, messages, tests, materials, tasks, events, meetings, activities,
    themePlans, fees, rooms, competitions, portfolios, studentProfiles, attestations,
    lessonAbsences, docs: [...docs, ...delovodstvoDocs], virtualRooms, ifoDiaries,
    syncLogs, audit: [],
    sanctions, classNotes, supportPlans, vhkLessons, classMeetings,
    correctionalExams, equivalenceExams,
    absenceNotes, gradeExemptions, deleteRequests,
    norms, normResults, trainingPlans, combinedGroups,
  }
}

export const DOC_TEMPLATES = [
  { id: 'У-1', code: 'У-1', name: 'Удостоверение за редовно обучение', category: 'Ученически документ' as const, requires: ['ученик', 'клас', 'учебна година'] },
  { id: 'У-3', code: 'У-3', name: 'Удостоверение за завършен клас', category: 'Ученически документ' as const, requires: ['ученик', 'клас', 'среден успех'] },
  { id: '3-31', code: '3-31', name: 'Свидетелство за основно образование', category: 'Ученически документ' as const, requires: ['ученик', 'оценки', 'среден успех'] },
  { id: '3-44', code: '3-44', name: 'Диплома за средно образование', category: 'Ученически документ' as const, requires: ['ученик', 'оценки от ДЗИ', 'среден успех'] },
  { id: '3-54', code: '3-54', name: 'Свидетелство за професионална квалификация', category: 'Ученически документ' as const, requires: ['ученик', 'професия', 'оценки'] },
  { id: '3-103', code: '3-103', name: 'Дубликат на документ', category: 'Ученически документ' as const, requires: ['ученик', 'номер на оригинал'] },
  { id: 'ЛК', code: 'ЛК', name: 'Личен картон на ученик', category: 'Ученически документ' as const, requires: ['ученик', 'лични данни'] },
  { id: 'ПР-1', code: 'ПР-1', name: 'Протокол от педагогически съвет', category: 'Деловодство' as const, requires: ['дата', 'присъствали', 'решения'] },
  { id: 'ЗП-1', code: 'ЗП-1', name: 'Заповед на директора', category: 'Деловодство' as const, requires: ['номер', 'дата', 'разпореждане'] },
  { id: 'КР-1', code: 'КР-1', name: 'Книга за контролна дейност', category: 'Деловодство' as const, requires: ['проверяващ', 'обект', 'констатации'] },
  { id: 'КС-1', code: 'КС-1', name: 'Книга за решения на ПС', category: 'Деловодство' as const, requires: ['заседание', 'решения'] },
]
