import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Field, GradePill, Icon, Modal, Select } from '../../components/ui'
import type { Student } from '../../lib/types'
import { DnTable, EmptyRow, FilterButton, InfoBanner, StudentCell, TB, Th, Toolbar } from './shared'

/**
 * Раздели „Резултати", „Поправителни изпити" и „Приравнителни изпити".
 *
 * Логиката от референтния дневник:
 *  • поправителен изпит се полага само ако годишната оценка е „Слаб (2)";
 *  • резултатът се въвежда по сесии (I, II и допълнителна);
 *  • приравнителните изпити се вписват като годишни оценки за учебната година
 *    и не се изпращат към НЕИСПУ.
 */

const SESSION_LABELS = ['I сесия', 'II сесия', 'Доп. сесия'] as const

/** Учебните години, показани в раздел „Приравнителни изпити". */
function schoolYears(count = 4): string[] {
  const now = new Date()
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  return Array.from({ length: count }, (_, i) => `${startYear - i}-${startYear - i + 1}`)
}

const nameOf = (s: Student) =>
  `${s.firstName} ${s.middleName ? `${s.middleName[0]}. ` : ''}${s.lastName}`

// ── Резултати ───────────────────────────────────────────────────────────────
export function ResultsTab({ classId }: { classId: string }) {
  const { db, isStaff, studentsOf, subjectName } = useApp()
  const klass = db.classes.find((c) => c.id === classId)
  const subjects = db.subjects.filter((s) => klass?.subjectIds.includes(s.id))
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const active = subjectId || subjects[0]?.id || ''
  const [edit, setEdit] = useState<Student | null>(null)

  const students = studentsOf(classId)

  /** годишната оценка на ученика по предмета */
  const annual = (sid: string) =>
    db.grades
      .filter((g) => g.studentId === sid && g.subjectId === active && g.type === 'Годишна')
      .sort((a, b) => b.date.localeCompare(a.date))[0]

  const examOf = (sid: string) =>
    db.correctionalExams.find((c) => c.studentId === sid && c.subjectId === active)

  const eligible = students.filter((s) => {
    const a = annual(s.id)
    return a !== undefined && a.value <= 2
  })

  return (
    <>
      <Toolbar>
        <div className="flex items-center gap-2 text-[12.5px]">
          <span className="font-semibold text-ink-600">Предмет:</span>
          <Select value={active} onChange={(e) => setSubjectId(e.target.value)} className="!w-auto !py-1 !text-[12.5px]">
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        {isStaff && (
          <TB icon="edit" tone="blue" onClick={() => setEdit(students[0] ?? null)}>Редактирай</TB>
        )}
        <FilterButton />
      </Toolbar>

      <DnTable
        minWidth={820}
        head={
          <>
            <Th className="w-[54px]">№</Th>
            <Th>Ученик</Th>
            <Th className="w-[150px] text-center">
              Резултат <Info />
            </Th>
            <Th className="w-[190px] text-center">
              Резултат (след изпит) <Info />
            </Th>
            <Th className="w-[90px]">Операции</Th>
          </>
        }
      >
        {students.map((s) => {
          const a = annual(s.id)
          const e = examOf(s.id)
          const final = e?.session1 ?? e?.session2 ?? e?.sessionExtra
          return (
            <tr key={s.id} className={s.status !== 'активен' ? 'bg-[#fde8e8]/70' : 'hover:bg-[#f7fbfd]'}>
              <td className="px-3 py-2 text-[12.5px] font-bold text-ink-400">{s.number}</td>
              <td className="px-3 py-2"><StudentCell student={s} showNumber={false} /></td>
              <td className="px-3 py-2 text-center">
                {a ? <GradePill value={a.value} title={`Годишна оценка · ${subjectName(active)}`} /> : <span className="text-ink-400">—</span>}
              </td>
              <td className="px-3 py-2 text-center">
                {final ? <GradePill value={final} title="Оценка от поправителния изпит" /> : <span className="text-ink-400">—</span>}
              </td>
              <td className="px-3 py-2">
                {isStaff && (
                  <button
                    onClick={() => setEdit(s)}
                    title="Полага изпит"
                    className="grid h-[19px] w-[19px] place-items-center rounded-[3px] bg-[#3598dc] text-white hover:brightness-110"
                  >
                    <Icon name="edit" size={11} strokeWidth={2.4} />
                  </button>
                )}
              </td>
            </tr>
          )
        })}
        {students.length === 0 && <EmptyRow colSpan={5} text="В паралелката няма активни ученици." />}
      </DnTable>

      <p className="mt-3 text-[12px] text-ink-500">
        Право на поправителен изпит имат учениците с годишна оценка „Слаб (2)" по предмета
        {eligible.length ? ` — в тази паралелка те са ${eligible.length}.` : ' — в тази паралелка няма такива.'}
      </p>

      <ExamEditModal student={edit} subjectId={active} classId={classId} onClose={() => setEdit(null)} />
    </>
  )
}

function Info() {
  return <Icon name="info" size={12} className="ml-1 inline align-[-1px] text-ink-400" />
}

/** Редакция на поправителен изпит за един ученик. */
function ExamEditModal({
  student, subjectId, classId, onClose,
}: { student: Student | null; subjectId: string; classId: string; onClose: () => void }) {
  const { db, subjectName, setCorrectionalExam } = useApp()
  const row = student
    ? db.correctionalExams.find((c) => c.studentId === student.id && c.subjectId === subjectId)
    : undefined
  const [takes, setTakes] = useState(!!row)
  const [session, setSession] = useState<'session1' | 'session2' | 'sessionExtra'>('session1')
  const [value, setValue] = useState(3)

  if (!student) return null

  return (
    <Modal
      open={!!student}
      onClose={onClose}
      title="Поправителен изпит"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Отказ</button>
          <button
            className="btn-primary"
            onClick={() => {
              if (!takes) setCorrectionalExam(classId, student.id, subjectId, { session1: undefined, session2: undefined, sessionExtra: undefined })
              else setCorrectionalExam(classId, student.id, subjectId, { [session]: value })
              onClose()
            }}
          >
            Запази
          </button>
        </>
      }
    >
      <div className="mb-4 rounded-lg bg-ink-50 px-4 py-3">
        <p className="text-sm font-semibold text-ink-900">{nameOf(student)}</p>
        <p className="text-xs text-ink-500">{subjectName(subjectId)}</p>
      </div>

      <label className="mb-4 flex items-center gap-2 text-[13px]">
        <input type="checkbox" className="h-4 w-4" checked={takes} onChange={(e) => setTakes(e.target.checked)} />
        Полага изпит
      </label>

      {takes && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Сесия">
            <Select value={session} onChange={(e) => setSession(e.target.value as typeof session)}>
              {(['session1', 'session2', 'sessionExtra'] as const).map((s, i) => (
                <option key={s} value={s}>{SESSION_LABELS[i]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Оценка">
            <div className="flex gap-1.5">
              {[2, 3, 4, 5, 6].map((g) => (
                <button
                  key={g}
                  onClick={() => setValue(g)}
                  className={`h-9 flex-1 rounded-lg text-sm font-bold transition ${
                    value === g ? `g${g} ring-2 ring-brand-500/40` : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}
    </Modal>
  )
}

// ── Поправителни изпити ─────────────────────────────────────────────────────
export function CorrectionalTab({ classId }: { classId: string }) {
  const { db, isStaff, studentsOf, subjectName, setCorrectionalExam } = useApp()
  const [open, setOpen] = useState(false)
  const [who, setWho] = useState('')

  const students = studentsOf(classId)
  const rows = useMemo(
    () => db.correctionalExams.filter((c) => c.classId === classId),
    [db.correctionalExams, classId],
  )
  const student = db.students.find((s) => s.id === who) ?? null
  const klass = db.classes.find((c) => c.id === classId)
  const subjects = db.subjects.filter((s) => klass?.subjectIds.includes(s.id))

  return (
    <>
      <InfoBanner>
        Въведете информация за поправителни изпити, ако са се състояли или са преведени такива.
      </InfoBanner>

      <Toolbar>
        {isStaff && (
          <TB icon="settings" tone="blue" onClick={() => { setWho(students[0]?.id ?? ''); setOpen(true) }}>
            Администрирай
          </TB>
        )}
        <FilterButton />
      </Toolbar>

      <DnTable
        minWidth={760}
        head={
          <>
            <Th className="w-[54px]">№</Th>
            <Th>Ученик</Th>
            <Th className="w-[240px]">Предмет</Th>
            <Th className="w-[100px] text-center">I сесия</Th>
            <Th className="w-[100px] text-center">II сесия</Th>
            <Th className="w-[110px] text-center">Доп. сесия</Th>
          </>
        }
      >
        {rows.map((c) => (
          <tr key={c.id} className="hover:bg-[#f7fbfd]">
            <td className="px-3 py-2 text-[12.5px] font-bold text-ink-400">
              {db.students.find((s) => s.id === c.studentId)?.number}
            </td>
            <td className="px-3 py-2"><StudentCell student={db.students.find((s) => s.id === c.studentId)} showNumber={false} /></td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{subjectName(c.subjectId)}</td>
            <td className="px-3 py-2 text-center">{c.session1 ? <GradePill value={c.session1} /> : <span className="text-ink-400">—</span>}</td>
            <td className="px-3 py-2 text-center">{c.session2 ? <GradePill value={c.session2} /> : <span className="text-ink-400">—</span>}</td>
            <td className="px-3 py-2 text-center">{c.sessionExtra ? <GradePill value={c.sessionExtra} /> : <span className="text-ink-400">—</span>}</td>
          </tr>
        ))}
        {rows.length === 0 && <EmptyRow colSpan={6} text="Все още не са въвеждани поправителни изпити." />}
      </DnTable>

      <Modal
        open={open} onClose={() => setOpen(false)} wide title="Администриране на поправителни изпити"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button className="btn-primary" onClick={() => setOpen(false)}>Готово</button>
          </>
        }
      >
        <Field label="Ученик">
          <Select value={who} onChange={(e) => setWho(e.target.value)}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.firstName} {s.lastName}</option>)}
          </Select>
        </Field>

        {student && (
          <div className="mt-4 overflow-hidden rounded-lg border border-ink-200">
            <table className="w-full border-collapse">
              <thead className="bg-ink-50">
                <tr>
                  <th className="th">Предмет</th>
                  {SESSION_LABELS.map((l) => <th key={l} className="th w-[110px] text-center">{l}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {subjects.map((s) => {
                  const row = db.correctionalExams.find((c) => c.studentId === student.id && c.subjectId === s.id)
                  return (
                    <tr key={s.id}>
                      <td className="td text-[12.5px]">{s.name}</td>
                      {(['session1', 'session2', 'sessionExtra'] as const).map((key) => (
                        <td key={key} className="td text-center">
                          <div className="flex justify-center gap-0.5">
                            {[2, 3, 4, 5, 6].map((g) => (
                              <button
                                key={g}
                                onClick={() => setCorrectionalExam(
                                  classId, student.id, s.id,
                                  { [key]: row?.[key] === g ? undefined : g },
                                )}
                                className={`h-6 w-6 rounded text-[11px] font-bold transition ${
                                  row?.[key] === g ? `g${g} ring-1 ring-brand-500/50` : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
                                }`}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-ink-400">Клик върху оценка я вписва; втори клик я изтрива.</p>
      </Modal>
    </>
  )
}

// ── Приравнителни изпити ────────────────────────────────────────────────────
export function EquivalenceTab({ classId }: { classId: string }) {
  const { db, isStaff, studentsOf, subjectName, setEquivalenceExam } = useApp()
  const [open, setOpen] = useState(false)
  const [who, setWho] = useState('')

  const years = schoolYears()
  const students = studentsOf(classId)
  const rows = useMemo(
    () => db.equivalenceExams.filter((e) => e.classId === classId),
    [db.equivalenceExams, classId],
  )
  const student = db.students.find((s) => s.id === who) ?? null
  const klass = db.classes.find((c) => c.id === classId)
  const subjects = db.subjects.filter((s) => klass?.subjectIds.includes(s.id))

  return (
    <>
      <InfoBanner>
        Оценките от тези изпити <b>не се изпращат към НЕИСПУ</b>! Вписват се само годишни оценки за
        съответната учебна година! Ако ученик държи приравнителен изпит по време на учебната година,
        оценката от него трябва да се впише като срочна в таб „Оценки".
      </InfoBanner>

      <Toolbar>
        {isStaff && (
          <TB icon="settings" tone="blue" onClick={() => { setWho(students[0]?.id ?? ''); setOpen(true) }}>
            Администрирай
          </TB>
        )}
        <FilterButton />
      </Toolbar>

      <DnTable
        minWidth={860}
        head={
          <>
            <Th className="w-[54px]">№</Th>
            <Th>Ученик</Th>
            <Th className="w-[220px]">Предмет</Th>
            {years.map((y) => <Th key={y} className="w-[110px] text-center">{y}</Th>)}
          </>
        }
      >
        {rows.map((e) => (
          <tr key={e.id} className="hover:bg-[#f7fbfd]">
            <td className="px-3 py-2 text-[12.5px] font-bold text-ink-400">
              {db.students.find((s) => s.id === e.studentId)?.number}
            </td>
            <td className="px-3 py-2"><StudentCell student={db.students.find((s) => s.id === e.studentId)} showNumber={false} /></td>
            <td className="px-3 py-2 text-[12.5px] text-ink-700">{subjectName(e.subjectId)}</td>
            {years.map((y) => (
              <td key={y} className="px-3 py-2 text-center">
                {e.year === y ? <GradePill value={e.grade} /> : <span className="text-ink-400">—</span>}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && <EmptyRow colSpan={3 + years.length} text="Все още не са въвеждани приравнителни изпити." />}
      </DnTable>

      <Modal
        open={open} onClose={() => setOpen(false)} wide title="Администриране на приравнителни изпити"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button className="btn-primary" onClick={() => setOpen(false)}>Готово</button>
          </>
        }
      >
        <Field label="Ученик">
          <Select value={who} onChange={(e) => setWho(e.target.value)}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.number}. {s.firstName} {s.lastName}</option>)}
          </Select>
        </Field>

        {student && (
          <div className="mt-4 overflow-hidden rounded-lg border border-ink-200">
            <table className="w-full border-collapse">
              <thead className="bg-ink-50">
                <tr>
                  <th className="th">Предмет</th>
                  {years.map((y) => <th key={y} className="th w-[110px] text-center">{y}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <td className="td text-[12.5px]">{s.name}</td>
                    {years.map((y) => {
                      const row = db.equivalenceExams.find(
                        (e) => e.studentId === student.id && e.subjectId === s.id && e.year === y,
                      )
                      return (
                        <td key={y} className="td text-center">
                          <div className="flex justify-center gap-0.5">
                            {[2, 3, 4, 5, 6].map((g) => (
                              <button
                                key={g}
                                onClick={() => setEquivalenceExam(classId, student.id, s.id, y, row?.grade === g ? null : g)}
                                className={`h-6 w-6 rounded text-[11px] font-bold transition ${
                                  row?.grade === g ? `g${g} ring-1 ring-brand-500/50` : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
                                }`}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-ink-400">Клик върху оценка я вписва; втори клик я изтрива.</p>
      </Modal>
    </>
  )
}
