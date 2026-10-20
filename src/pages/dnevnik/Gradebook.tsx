import { Fragment, useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import type { Grade, GradeType, Student, Klass, Subject } from '../../lib/types'
import {
  Badge, Field, GradePill, Icon, Input, Modal, Select, Textarea, avgFmt, formatDate,
} from '../../components/ui'
import { AddPage, SaveBtn, WarnBanner } from './forms'


const GRADE_TYPES: GradeType[] = [
  'Текуща', 'Контролна работа', 'Класна работа', 'Устно изпитване', 'Практическа',
  'Проект', 'Домашна работа', 'Входно ниво', 'Междинно ниво', 'Изходно ниво',
  'Срочна', 'Годишна', 'Поправителен изпит',
]
const todayISO = () => new Date().toISOString().slice(0, 10)

// ── Цял екран: въвеждане на оценки ───────────────────────────────────────────
/** Определя срока по датата според учебната година (I: септ.–ян., II: февр.–юни). */
const termOf = (iso: string): 1 | 2 => {
  const m = Number(iso.slice(5, 7))
  return m <= 1 || m >= 8 ? 1 : 2
}

function GradesAddPage({
  students, subjectId, classId, klass, subjects, onChangeSubject, onBack,
}: {
  students: Student[]
  subjectId: string
  classId: string
  klass: Klass
  subjects: Subject[]
  onChangeSubject: (id: string) => void
  onBack: () => void
}) {
  const { addGrades, user } = useApp()
  const [type, setType] = useState<GradeType>('Текуща')
  const [date, setDate] = useState(todayISO())
  const [grade, setGrade] = useState<Record<string, string>>({})
  const [comment, setComment] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState<Record<string, boolean>>({})

  const filled = students.filter((s) => grade[s.id] && !Number.isNaN(parseFloat(grade[s.id])))

  const buildRows = () =>
    filled.map((s) => ({
      studentId: s.id, subjectId, classId,
      value: parseFloat(grade[s.id]), type, date, term: termOf(date),
      comment: comment[s.id] || undefined,
      teacherId: user!.id, draft: !!draft[s.id],
    }))

  const save = (andAdd: boolean) => {
    const rows = buildRows()
    if (rows.length) addGrades(rows as Omit<Grade, 'id' | 'createdAt'>[])
    setGrade({}); setComment({}); setDraft({})
    if (!andAdd) onBack()
  }

  const setAll = (v: string) => {
    const next: Record<string, string> = {}
    students.forEach((s) => { next[s.id] = v })
    setGrade(next)
  }

  return (
    <AddPage
      title={`Въвеждане на оценки за ${klass.name}`}
      onBack={onBack}
      onSave={() => save(false)}
      onSaveAdd={() => save(true)}
      banner={
        <WarnBanner>
          ВНИМАНИЕ! Оценките, маркирани като <b>„Чернова"</b>, са видими само за вас, докато не ги
          редактирате. За добавяне на оценки в групи (часове, разбити на групи) се обърнете към
          администратор на училището.
        </WarnBanner>
      }
    >
      {/* горен контрол: оценка за всички + тип + дата + предмет */}
      <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-3 rounded border border-ink-200 bg-white px-4 py-3">
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-ink-600">Оценка за всички</label>
          <div className="flex items-center gap-1">
            <span className="mr-1 text-[12.5px] text-ink-500">Оцени всички с</span>
            {[2, 3, 4, 5, 6].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setAll(String(g))}
                className={`h-8 w-8 rounded-[2px] text-[13.5px] font-bold transition hover:brightness-105 g${g}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <Field label="Тип">
          <Select value={type} onChange={(e) => setType(e.target.value as GradeType)} className="!w-[190px]">
            {GRADE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Дата">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="!w-[150px]" />
        </Field>
        <Field label="Предмет">
          <Select value={subjectId} onChange={(e) => onChangeSubject(e.target.value)} className="!w-[260px]">
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
      </div>

      {/* таблица с ученици */}
      <div className="overflow-x-auto rounded border border-ink-200 bg-white">
        <table className="w-full border-collapse">
          <thead className="bg-ink-50">
            <tr>
              <th className="th w-12">№</th>
              <th className="th">Ученик</th>
              <th className="th w-[190px]">Оценка</th>
              <th className="th w-[160px]">Тип</th>
              <th className="th w-[130px]">Дата</th>
              <th className="th w-[180px]">Коментар</th>
              <th className="th w-16 text-center">Чернова</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {students.map((s) => {
              const val = grade[s.id] ?? ''
              const left = s.status !== 'активен'
              return (
                <tr key={s.id} className={left ? 'bg-[#fde8e8]/60' : ''}>
                  <td className="td text-[12px] font-bold text-ink-400">{s.number}</td>
                  <td className="td">
                    <span className="font-medium">{nameOf(s)}</span>
                    {s.sen && <Badge tone="purple" className="ml-1.5">СОП</Badge>}
                    {left && <span className="ml-1.5 text-[11px] text-[#b42318]">({s.status})</span>}
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1">
                      {[2, 3, 4, 5, 6].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGrade((p) => ({ ...p, [s.id]: String(g) }))}
                          className={`h-7 w-7 rounded-[2px] text-[12.5px] font-bold transition ${
                            val === String(g) ? `g${g} ring-2 ring-brand-500/50` : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                      <input
                        value={val}
                        onChange={(e) => setGrade((p) => ({ ...p, [s.id]: e.target.value }))}
                        placeholder="—"
                        className="ml-0.5 h-7 w-11 rounded border border-ink-200 px-1 text-center text-[12.5px] outline-none focus:border-brand-500"
                      />
                    </div>
                  </td>
                  <td className="td">
                    <Select value={type} onChange={(e) => setType(e.target.value as GradeType)} className="!py-1 !text-[12px]">
                      {GRADE_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </Select>
                  </td>
                  <td className="td">
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="!py-1 !text-[12px]" />
                  </td>
                  <td className="td">
                    <Input
                      value={comment[s.id] ?? ''}
                      onChange={(e) => setComment((p) => ({ ...p, [s.id]: e.target.value }))}
                      className="!py-1 !text-[12px]"
                      placeholder="коментар…"
                    />
                  </td>
                  <td className="td text-center">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 align-middle"
                      checked={!!draft[s.id]}
                      onChange={(e) => setDraft((p) => ({ ...p, [s.id]: e.target.checked }))}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-ink-500">
          Поставете бутона <b>ENTER</b> и <b>TAB</b> за по-бързо въвеждане на оценки.
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onBack} className="btn-ghost">Отказ</button>
          <SaveBtn onClick={() => save(false)}>Запази ({filled.length})</SaveBtn>
        </div>
      </div>
    </AddPage>
  )
}

// ── Модал: редактиране на оценка ─────────────────────────────────────────────
function EditGradeModal({ grade, onClose }: { grade: Grade | null; onClose: () => void }) {
  const { updateGrade, deleteGrade, subjectName, studentName, userName } = useApp()
  const [value, setValue] = useState(grade?.value ?? 4)
  const [type, setType] = useState<GradeType>(grade?.type ?? 'Текуща')
  const [date, setDate] = useState(grade?.date ?? todayISO())
  const [comment, setComment] = useState(grade?.comment ?? '')
  const [draft, setDraft] = useState(grade?.draft ?? false)

  if (!grade) return null
  return (
    <Modal
      open={!!grade} onClose={onClose} title="Оценка"
      footer={
        <>
          <button
            onClick={() => { deleteGrade(grade.id); onClose() }}
            className="btn-danger mr-auto"
          >
            <Icon name="trash" size={15} /> Изтрий
          </button>
          <button onClick={onClose} className="btn-ghost">Отказ</button>
          <button
            onClick={() => {
              updateGrade(grade.id, { value, type, date, comment: comment || undefined, draft })
              onClose()
            }}
            className="btn-primary"
          >
            Запази
          </button>
        </>
      }
    >
      <div className="mb-4 rounded-lg bg-ink-50 px-4 py-3">
        <p className="text-sm font-semibold text-ink-900">{studentName(grade.studentId)}</p>
        <p className="text-xs text-ink-500">
          {subjectName(grade.subjectId)} · въведена от {userName(grade.teacherId)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Оценка">
          <div className="flex gap-1.5">
            {[2, 3, 4, 5, 6].map((g) => (
              <button
                key={g}
                onClick={() => setValue(g)}
                className={`h-9 flex-1 rounded-[2px] text-sm font-bold transition ${
                  value === g ? `g${g} ring-2 ring-brand-500/40` : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Тип">
          <Select value={type} onChange={(e) => setType(e.target.value as GradeType)}>
            {GRADE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Дата">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Чернова">
          <Select value={draft ? 'да' : 'не'} onChange={(e) => setDraft(e.target.value === 'да')}>
            <option value="не">Не</option>
            <option value="да">Да</option>
          </Select>
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Коментар">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

// ── Панел с подробности за оценка (появява се под реда на ученика) ───────────
function GradeDetail({
  grade, onClose, onEdit,
}: { grade: Grade; onClose: () => void; onEdit: () => void }) {
  const { subjectName, userName, isStaff, deleteGrade } = useApp()
  const created = (grade.createdAt ?? '').replace('T', ' ').slice(0, 19)

  return (
    <div className="relative border-t border-ink-100 bg-[#fbfcfd] py-2 pl-3 pr-3 text-[12.5px] leading-[1.62] text-ink-700">
      <p className="text-[13px] font-bold text-ink-900">
        Оценка: {grade.value.toFixed(2)}
        <Icon name="calendar" size={12} className="mx-1.5 inline align-[-1px] text-ink-400" />
        {formatDate(grade.date)}
        {grade.draft && <span className="ml-2 rounded-[2px] bg-[#fdf0e3] px-1.5 py-0.5 text-[11px] font-bold text-[#b25e09]">чернова</span>}
      </p>
      <p><span className="italic">Тип:</span> {grade.type}</p>
      <p><span className="italic">Предмет:</span> {subjectName(grade.subjectId)}</p>
      <p>
        <span className="italic">Въведена от:</span>{' '}
        <Icon name="user" size={12} className="mx-1 inline align-[-1px] text-[#2b6ca3]" />
        <span className="text-[#2b6ca3]">{userName(grade.teacherId)}</span>
        <span className="mx-1.5 text-ink-300">/</span>
        <Icon name="clock" size={12} className="mr-1 inline align-[-1px] text-ink-400" />
        {created || '—'}
      </p>
      {grade.comment && <p><span className="italic">Коментар:</span> {grade.comment}</p>}

      <div className="absolute right-3 top-2 flex items-center gap-1.5">
        {isStaff && (
          <>
            <button
              onClick={onEdit}
              className="rounded-[2px] border border-ink-200 bg-white px-2 py-1 text-[12px] font-semibold text-ink-600 hover:bg-ink-50"
            >
              Редактирай
            </button>
            <button
              onClick={() => {
                if (!window.confirm('Да се изтрие ли тази оценка?')) return
                deleteGrade(grade.id)
                onClose()
              }}
              className="inline-flex items-center gap-1 rounded-[2px] bg-[#e7505a] px-2 py-1 text-[12px] font-semibold text-white hover:brightness-95"
            >
              <Icon name="close" size={12} /> Изтрий
            </button>
          </>
        )}
        <button
          onClick={onClose}
          title="Затвори"
          className="grid h-6 w-6 place-items-center rounded-[2px] text-ink-400 hover:bg-ink-100 hover:text-ink-700"
        >
          <Icon name="close" size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Таб: Оценки (класна книга) ───────────────────────────────────────────────
/** Оценки, които не са „текущи" — срочни, годишни, изпити за ниво. */
const NON_CURRENT: GradeType[] = [
  'Срочна', 'Годишна', 'Входно ниво', 'Междинно ниво', 'Изходно ниво', 'Поправителен изпит',
]
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const nameOf = (s: Student) =>
  `${s.firstName} ${s.middleName ? `${s.middleName[0]}. ` : ''}${s.lastName}`

export function GradebookTab({
  classId, subjectId, klass, subjects, onSelectSubject,
}: {
  classId: string
  subjectId: string
  klass: Klass
  subjects: Subject[]
  onSelectSubject: (id: string) => void
}) {
  const { db, subjectName, user, isAdmin, isStaff, deleteGrade } = useApp()
  const [adding, setAdding] = useState(false)
  const [edit, setEdit] = useState<Grade | null>(null)
  const [detail, setDetail] = useState<Grade | null>(null)
  const [showDrafts, setShowDrafts] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [picked, setPicked] = useState<Record<string, boolean>>({})

  // всички ученици на паралелката, включително преместените — те се показват в червено,
  // както е в референтния дневник
  const students = useMemo(
    () => db.students.filter((s) => s.classId === classId).sort((a, b) => a.number - b.number),
    [db.students, classId],
  )
  const grades = useMemo(
    () => db.grades.filter((g) => g.classId === classId && g.subjectId === subjectId),
    [db.grades, classId, subjectId],
  )

  /** оценките на ученик за срок и вид (текущи / срочна / годишна) */
  const cell = (sid: string, term: 1 | 2, kind: 'cur' | 'sro' | 'god') =>
    grades
      .filter((g) => {
        if (g.studentId !== sid) return false
        if (g.draft && !showDrafts) return false
        if (kind === 'god') return g.type === 'Годишна'
        if (kind === 'sro') return g.type === 'Срочна' && g.term === term
        return !NON_CURRENT.includes(g.type) && g.term === term
      })
      .sort((a, b) => a.date.localeCompare(b.date))

  const classAvg = mean(
    students.flatMap((s) => [...cell(s.id, 1, 'cur'), ...cell(s.id, 2, 'cur')].map((g) => g.value)),
  )

  /** брой оценки по предмет за двата срока — за левия панел.
   *  Броят се вписванията (дата + вид), не отделните оценки на всеки ученик. */
  const subjectCount = (sid: string) => {
    const list = db.grades.filter(
      (g) =>
        g.classId === classId &&
        g.subjectId === sid &&
        (showDrafts || !g.draft) &&
        !NON_CURRENT.includes(g.type),
    )
    const events = (term: 1 | 2) =>
      new Set(list.filter((g) => g.term === term).map((g) => `${g.date}|${g.type}`)).size
    return { t1: events(1), t2: events(2) }
  }

  /*
    Истинският учител по предмета — този, който е назначен в паралелката
    („Администрация → Паралелки → Предмети и учители"). Преди тук се взимаше
    първият учител в базата, който преподава предмета, и в паралелката пишеше
    чуждо име. Резервно: разписанието, после никой.
  */
  const assignedId =
    klass.plan?.find((p) => p.subjectId === subjectId)?.teacherId ||
    db.schedule.find((s) => s.classId === classId && s.subjectId === subjectId)?.teacherId ||
    ''
  const teacher = assignedId ? db.users.find((u) => u.id === assignedId) : undefined
  /*
    „Заместители" са вторите учители по СЪЩИЯ предмет в ТАЗИ паралелка (два
    реда в „Предмети и учители", напр. разпределени по групи). Преди тук се
    показваха произволни учители на предмета от цялото училище.
  */
  const deputies = (klass.plan ?? [])
    .filter((p) => p.subjectId === subjectId && p.teacherId && p.teacherId !== assignedId)
    .map((p) => db.users.find((u) => u.id === p.teacherId))
    .filter((u): u is NonNullable<typeof u> => !!u)

  const pickedIds = Object.entries(picked).filter(([, v]) => v).map(([k]) => k)
  const removePicked = () => {
    const doomed = grades.filter((g) => pickedIds.includes(g.studentId))
    if (!doomed.length) return
    if (!window.confirm(`Да се изтрият ли ${doomed.length} оценки по „${subjectName(subjectId)}" за избраните ученици?`)) return
    doomed.forEach((g) => deleteGrade(g.id))
    setPicked({})
  }

  const gradeCell = (list: Grade[], showAvg = true) => {
    const av = mean(list.map((g) => g.value))
    return (
      <div className="flex flex-wrap items-center gap-1">
        {list.map((g) => {
          const tip = `${g.type} · ${formatDate(g.date)}${g.draft ? ' · чернова' : ''}`
          const pill = <span className={g.draft ? 'opacity-60' : ''}><GradePill value={g.value} /></span>
          // клик върху оценката отваря панела с подробности под реда на ученика
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setDetail((d) => (d?.id === g.id ? null : g))}
              title={tip}
              className={`rounded-[2px] transition hover:brightness-110 ${
                detail?.id === g.id ? 'ring-2 ring-[#337ab7] ring-offset-1' : ''
              }`}
            >
              {pill}
            </button>
          )
        })}
        {showAvg && av !== null && <span className="text-[11px] text-ink-400">({av.toFixed(2)})</span>}
      </div>
    )
  }

  return (
    <>
      {/* действия */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {isStaff && (
          <>
            <button onClick={() => setAdding(true)} className="btn bg-ok text-white hover:brightness-95">
              <Icon name="plus" size={15} /> Добави
            </button>
            <button
              onClick={removePicked}
              disabled={!pickedIds.length}
              className="btn bg-danger text-white hover:brightness-95"
            >
              <Icon name="close" size={15} /> Изтрий{pickedIds.length ? ` (${pickedIds.length})` : ''}
            </button>
          </>
        )}
        <button onClick={() => window.print()} className="btn bg-warn text-white hover:brightness-95">
          <Icon name="print" size={15} /> Принтирай
        </button>
        <button onClick={() => setShowFilter((v) => !v)} className="btn-ghost ml-auto">
          <Icon name="filter" size={15} /> Филтър
        </button>
      </div>

      {showFilter && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 text-[13px] text-ink-600">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showDrafts} onChange={(e) => setShowDrafts(e.target.checked)} className="h-4 w-4 rounded" />
            Покажи черновите
          </label>
          <span className="h-4 w-px bg-ink-200" />
          <span>{students.length} ученика</span>
          <span className="h-4 w-px bg-ink-200" />
          <span>Среден успех на класа: <b className="text-ink-800">{avgFmt(classAvg)}</b></span>
          {isStaff && (
            <button
              onClick={() => setPicked({})}
              className="ml-auto text-[12px] font-semibold text-brand-700 hover:underline"
            >
              Изчисти избора
            </button>
          )}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* предмети */}
        <div className="card max-h-[72vh] overflow-y-auto p-1.5">
          {subjects.map((s) => {
            const c = subjectCount(s.id)
            const on = s.id === subjectId
            return (
              <button
                key={s.id}
                onClick={() => onSelectSubject(s.id)}
                className={`flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition ${
                  on ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-700 hover:bg-ink-50'
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <span className="cnt1 shrink-0 rounded-[2px] px-1.5 py-0.5 text-[11px] font-bold">{c.t1}</span>
                <span className="cnt2 shrink-0 rounded-[2px] px-1.5 py-0.5 text-[11px] font-bold">{c.t2}</span>
              </button>
            )
          })}
        </div>

        {/* класна книга */}
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[13px] font-bold text-ink-900">
              {subjectName(subjectId)}
              {teacher && <span className="font-normal text-ink-600"> — {teacher.firstName} {teacher.lastName}</span>}
            </p>
            <p className="text-[11px] text-ink-500">
              Заместители:{' '}
              {deputies.length
                ? deputies.map((d) => `${d.firstName} ${d.lastName}`).join(', ')
                : '—'}
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
            <table className="w-full border-collapse">
              <thead className="bg-ink-50">
                <tr>
                  <th className="th w-14" rowSpan={2}>№</th>
                  <th className="th" rowSpan={2}>Ученик</th>
                  <th className="th border-l border-ink-200 text-center" colSpan={2}>Първи срок</th>
                  <th className="th border-l border-ink-200 text-center" colSpan={2}>Втори срок</th>
                  <th className="th border-l border-ink-200 text-center" rowSpan={2}>Годишна</th>
                </tr>
                <tr>
                  <th className="th border-l border-ink-200 text-center">Текущи</th>
                  <th className="th text-center">Срочна</th>
                  <th className="th border-l border-ink-200 text-center">Текущи</th>
                  <th className="th text-center">Срочна</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {students.map((s) => {
                  const isPicked = !!picked[s.id]
                  const left = s.status !== 'активен'
                  const openGrade = detail && detail.studentId === s.id ? detail : null
                  return (
                    <Fragment key={s.id}>
                    <tr
                      className={`${left ? 'bg-[#fde8e8]/70' : isPicked ? 'bg-brand-50/60' : ''} hover:bg-ink-50/60`}
                    >
                      <td className="td">
                        <div className="flex items-center gap-2">
                          {isStaff && (
                            <input
                              type="checkbox"
                              checked={isPicked}
                              onChange={(e) => setPicked((p) => ({ ...p, [s.id]: e.target.checked }))}
                              className="h-3.5 w-3.5 rounded border-ink-300"
                            />
                          )}
                          <span className="text-[12px] font-bold text-ink-400">{s.number}</span>
                        </div>
                      </td>
                      <td className="td">
                        <span className="font-medium">{nameOf(s)}</span>
                        {s.sen && <Badge tone="purple" className="ml-1.5">СОП</Badge>}
                        {left && <span className="ml-1.5 text-[11px] text-[#b42318]">({s.status})</span>}
                      </td>
                      {([1, 2] as const).map((term) => (
                        <Fragment key={term}>
                          <td className="td border-l border-ink-100 align-top">
                            {gradeCell(cell(s.id, term, 'cur'))}
                          </td>
                          <td className="td align-top">
                            {gradeCell(cell(s.id, term, 'sro'), false)}
                          </td>
                        </Fragment>
                      ))}
                      <td className="td border-l border-ink-100 align-top">
                        {gradeCell(cell(s.id, 1, 'god'), false)}
                      </td>
                    </tr>

                    {openGrade && (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <GradeDetail
                            grade={openGrade}
                            onClose={() => setDetail(null)}
                            onEdit={() => setEdit(openGrade)}
                          />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!teacher && (
            <div className="mt-3">
              <Badge tone="warn">Няма назначен учител по този предмет в паралелката</Badge>
            </div>
          )}
        </div>
      </div>

      {isStaff && (
        <>
          {adding && (
            <GradesAddPage
              students={students}
              subjectId={subjectId}
              classId={classId}
              klass={klass}
              subjects={subjects}
              onChangeSubject={onSelectSubject}
              onBack={() => setAdding(false)}
            />
          )}
          <EditGradeModal grade={edit} onClose={() => { setEdit(null); setDetail(null) }} />
        </>
      )}
    </>
  )
}
