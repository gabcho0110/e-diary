import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Icon, Input, PageHeader, Select, Table } from '../../components/ui'
import { AddPage, Toggle, WarnBanner } from '../dnevnik/forms'
import type { ClassSubjectPlanRow, Klass, User } from '../../lib/types'
import {
  AInput, ASelect, CheckList, Dash, EmptyRow, FormRow, FormTabs, ListHead, SquareAction, ToolBtn, Toolbar,
} from './shared'

// ── Справочници от референтния дневник ──────────────────────────────────────
const GRADE_OPTIONS = ['ПГ(4г.)', 'ПГ(5г.)', 'ПГ(6г.)', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'Й']
const JOURNAL_TYPES = [
  'Дневник на яслена група (0-3)',
  'Дневник на подготвителна група (3-5)',
  'Дневник I – III клас (3-14)',
  'Дневник IV клас (3-16)',
  'Дневник V – XII клас (3-87)',
]
const ORG_FORMS = ['Паралелка', 'Група']
const STUDY_TERMS = ['Една година', 'Две години', 'Три години', 'Четири години']
const EDUCATION_FORMS = ['Дневна', 'Следобедна', 'Смесена', 'Самостоятелна', 'Дистанционна']
const DAY_ORGS = ['Първа смяна', 'Втора смяна', 'Целодневна организация', 'Смесен режим']
const PREP_KINDS = ['Непрофилирана', 'Профилирана', 'Професионална', 'Спортна', 'Дуална']
const PLAN_KINDS = ['ООП', 'РП', 'ЗП', 'ЗИП', 'ИУЧ', 'ФУЧ', 'ОРЕС']
const FOREIGN_LANGS = ['Английски език', 'Немски език', 'Френски език', 'Испански език', 'Руски език', 'Италиански език']

/** Типът дневник се подсказва от класа, но може да се смени ръчно. */
function journalFor(gradeLabel: string): string {
  if (gradeLabel.startsWith('ПГ')) return JOURNAL_TYPES[1]
  const n = Number(gradeLabel)
  if (!Number.isFinite(n)) return JOURNAL_TYPES[4]
  if (n <= 3) return JOURNAL_TYPES[2]
  if (n === 4) return JOURNAL_TYPES[3]
  return JOURNAL_TYPES[4]
}

const TEACHER_ROLES = ['teacher', 'class_teacher', 'deputy', 'director', 'sysadmin', 'educator', 'resource_teacher']

interface PlanDraft extends Omit<ClassSubjectPlanRow, 'weeks1a' | 'weeks1b' | 'weeks2a' | 'weeks2b'> {
  key: string
  weeks1a: string
  weeks1b: string
  weeks2a: string
  weeks2b: string
}

function emptyRow(): PlanDraft {
  return {
    key: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    subjectId: '', teacherId: '', prepKind: 'ООП',
    weeks1a: '0', weeks1b: '0', weeks2a: '0', weeks2b: '0', foreignLang: '',
  }
}

/**
 * Редовете идват само от запазения план. Нова паралелка започва с **нула**
 * предмета — учителят/администраторът ги добавя сам с „Добави учебен
 * предмет". Празни редове не се показват, за да не се създава впечатление,
 * че предметите са зададени.
 */
function draftFrom(k: Klass): PlanDraft[] {
  const rows = k.plan ?? []
  return rows.map((r, i) => ({
    key: `r${i}${r.subjectId}${r.teacherId}`,
    subjectId: r.subjectId,
    teacherId: r.teacherId,
    prepKind: r.prepKind || 'ООП',
    weeks1a: String(r.weeks1a ?? 0),
    weeks1b: String(r.weeks1b ?? 0),
    weeks2a: String(r.weeks2a ?? 0),
    weeks2b: String(r.weeks2b ?? 0),
    foreignLang: r.foreignLang ?? '',
  }))
}

// ── Форма за паралелка ──────────────────────────────────────────────────────
function ClassForm({
  editing, preset, onClose,
}: { editing?: Klass; preset?: 'ifo'; onClose: () => void }) {
  const { db, update, subjectName } = useApp()
  const teachers = useMemo(
    () => db.users.filter((u) => u.roles.some((r) => TEACHER_ROLES.includes(r))),
    [db.users],
  )
  const subjects = useMemo(
    () => [...db.subjects].sort((a, b) => a.name.localeCompare(b.name, 'bg')),
    [db.subjects],
  )

  /**
   * В списъка с учители за даден ред попадат само тези, на които предметът е
   * зададен в профила („Администрация → Потребители → Роля → Предмети").
   * Иначе всеки ред предлагаше всички учители и лесно се избираше човек,
   * който не преподава предмета.
   */
  const teachersFor = (subjectId: string) =>
    subjectId ? teachers.filter((t) => (t.subjectIds ?? []).includes(subjectId)) : []

  const [tab, setTab] = useState<'main' | 'plan'>('main')
  const [err, setErr] = useState('')
  const [gradeLabel, setGradeLabel] = useState(editing?.gradeLabel ?? (preset === 'ifo' ? '1' : '5'))
  const [letter, setLetter] = useState(editing?.letter ?? 'А')
  const [journalType, setJournalType] = useState(editing?.journalType ?? journalFor(gradeLabel))
  const [homeroom, setHomeroom] = useState(editing?.homeroomTeacherId ?? '')
  const [orgForm, setOrgForm] = useState(editing?.orgForm ?? (preset === 'ifo' ? 'Група' : 'Паралелка'))
  const [studyTerm, setStudyTerm] = useState(editing?.studyTerm ?? 'Една година')
  const [educationForm, setEducationForm] = useState(editing?.educationForm ?? '')
  const [dayOrg, setDayOrg] = useState(editing?.dayOrg ?? '')
  const [prepKind, setPrepKind] = useState(editing?.prepKind ?? (preset === 'ifo' ? 'Непрофилирана' : 'Непрофилирана'))
  const [shift, setShift] = useState<1 | 2>(editing?.shift ?? 1)
  const [rows, setRows] = useState<PlanDraft[]>(editing ? draftFrom(editing) : [])
  const [quick, setQuick] = useState<number | null>(null)

  const name = `${gradeLabel}${letter}`

  /** Редовете, които ще влязат в паралелката — за обобщението под таблицата. */
  const filled = rows.filter((r) => r.subjectId)
  const teacherNameOf = (id: string) => {
    const t = teachers.find((x) => x.id === id)
    return t ? `${t.firstName} ${t.lastName}`.trim() : ''
  }

  const patchRow = (i: number, patch: Partial<PlanDraft>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const save = (again: boolean) => {
    if (!gradeLabel || !letter) { setErr('Попълнете клас и паралелка.'); setTab('main'); return }
    if (db.classes.some((c) => c.name === name && c.id !== editing?.id)) {
      setErr(`Паралелка ${name} вече съществува.`); setTab('main'); return
    }
    const noTeacher = rows.filter((r) => r.subjectId && !r.teacherId)
    if (noTeacher.length) {
      setErr(`Изберете учител за: ${noTeacher.map((r) => subjectName(r.subjectId)).join(', ')}.`)
      setTab('plan'); return
    }
    const plan: ClassSubjectPlanRow[] = rows
      .filter((r) => r.subjectId)
      .map((r) => ({
        subjectId: r.subjectId,
        teacherId: r.teacherId,
        prepKind: r.prepKind,
        weeks1a: Number(r.weeks1a) || 0,
        weeks1b: Number(r.weeks1b) || 0,
        weeks2a: Number(r.weeks2a) || 0,
        weeks2b: Number(r.weeks2b) || 0,
        foreignLang: r.foreignLang || undefined,
      }))
    const subjectIds = [...new Set(plan.map((p) => p.subjectId))]

    update((d) => {
      const id = editing?.id ?? `cls_${Date.now()}`
      const next: Klass = {
        id,
        grade: Number.isFinite(Number(gradeLabel)) ? Number(gradeLabel) : 0,
        gradeLabel,
        letter,
        name,
        profile: editing?.profile ?? '',
        homeroomTeacherId: homeroom || null,
        studentIds: editing?.studentIds ?? [],
        subjectIds,
        shift,
        form: educationForm === 'Следобедна' ? 'следобедна' : educationForm === 'Смесена' ? 'смесена' : 'дневна',
        journalType, orgForm, studyTerm,
        educationForm: educationForm || undefined,
        dayOrg: dayOrg || undefined,
        prepKind,
        plan,
      }
      const i = d.classes.findIndex((c) => c.id === id)
      if (i >= 0) d.classes[i] = next
      else d.classes.push(next)

      // ── учителите получават паралелката и предметите си ──────────────────
      // Без това новосъздадената паралелка няма да се появи в „Дневник" при
      // учителя, защото `myClasses` се филтрира по `classIds`.
      const teacherIds = new Set(plan.map((p) => p.teacherId).filter(Boolean))
      if (homeroom) teacherIds.add(homeroom)
      for (const tid of teacherIds) {
        const u = d.users.find((x) => x.id === tid)
        if (!u) continue
        u.classIds = [...new Set([...(u.classIds ?? []), id])]
        const own = plan.filter((p) => p.teacherId === tid).map((p) => p.subjectId)
        if (own.length) u.subjectIds = [...new Set([...(u.subjectIds ?? []), ...own])]
        if (tid === homeroom && !u.roles.includes('class_teacher')) u.roles = [...u.roles, 'class_teacher']
      }
      // класният ръководител, който е сменен, губи класа
      if (editing?.homeroomTeacherId && editing.homeroomTeacherId !== homeroom) {
        const old = d.users.find((x) => x.id === editing.homeroomTeacherId)
        if (old) old.classIds = (old.classIds ?? []).filter((c) => c !== id)
      }
    })

    if (again) {
      setErr('')
      setRows([])
      setHomeroom('')
      setTab('main')
      return
    }
    onClose()
  }

  return (
    <AddPage
      title={editing ? `Редакция на паралелка ${editing.name}` : 'Добавяне на паралелка'}
      onBack={onClose}
      onSave={() => save(false)}
      onSaveAdd={() => save(true)}
    >
      <div className="mx-auto max-w-[1120px]">
        {err && <div className="mb-3"><WarnBanner>{err}</WarnBanner></div>}
        <div className="border border-[#d7dee4] bg-white">
          <FormTabs
            active={tab}
            onChange={(id) => setTab(id as 'main' | 'plan')}
            tabs={[
              { id: 'main', label: 'Основни данни', icon: 'grid' },
              { id: 'plan', label: 'Предмети и учители', icon: 'book' },
            ]}
          />

          {tab === 'main' ? (
            <div className="px-4 py-5">
              <FormRow label="Клас" required>
                <ASelect value={gradeLabel} onChange={(e) => { setGradeLabel(e.target.value); setJournalType(journalFor(e.target.value)) }}>
                  {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </ASelect>
              </FormRow>
              <FormRow label="Паралелка" required>
                <ASelect value={letter} onChange={(e) => setLetter(e.target.value)}>
                  {LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
                </ASelect>
              </FormRow>
              <FormRow label="Тип дневник" required>
                <ASelect value={journalType} onChange={(e) => setJournalType(e.target.value)}>
                  {JOURNAL_TYPES.map((j) => <option key={j} value={j}>{j}</option>)}
                </ASelect>
              </FormRow>
              <FormRow label="Класен ръководител" required>
                <div className="flex items-center gap-1">
                  <ASelect value={homeroom} onChange={(e) => setHomeroom(e.target.value)}>
                    <option value="">Изберете</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                    ))}
                  </ASelect>
                  {homeroom && (
                    <button
                      type="button"
                      title="Изчисти"
                      onClick={() => setHomeroom('')}
                      className="grid h-[31px] w-[30px] shrink-0 place-items-center rounded-[3px] border border-[#c7d0d8] text-ink-500 hover:bg-ink-50"
                    >
                      <Icon name="close" size={13} />
                    </button>
                  )}
                </div>
              </FormRow>
              <FormRow label="Организационна форма" required>
                <ASelect value={orgForm} onChange={(e) => setOrgForm(e.target.value)}>
                  {ORG_FORMS.map((o) => <option key={o} value={o}>{o}</option>)}
                </ASelect>
              </FormRow>
              <FormRow label="Срок на обучение" required>
                <ASelect value={studyTerm} onChange={(e) => setStudyTerm(e.target.value)}>
                  {STUDY_TERMS.map((o) => <option key={o} value={o}>{o}</option>)}
                </ASelect>
              </FormRow>
              <FormRow label="Форма на обучение">
                <ASelect value={educationForm} onChange={(e) => setEducationForm(e.target.value)}>
                  <option value="">Изберете</option>
                  {EDUCATION_FORMS.map((o) => <option key={o} value={o}>{o}</option>)}
                </ASelect>
              </FormRow>
              <FormRow label="Организация на учебния ден">
                <ASelect value={dayOrg} onChange={(e) => setDayOrg(e.target.value)}>
                  <option value="">Изберете</option>
                  {DAY_ORGS.map((o) => <option key={o} value={o}>{o}</option>)}
                </ASelect>
              </FormRow>
              <FormRow label="Вид подготовка" required>
                <ASelect value={prepKind} onChange={(e) => setPrepKind(e.target.value)}>
                  {PREP_KINDS.map((o) => <option key={o} value={o}>{o}</option>)}
                </ASelect>
              </FormRow>
              <FormRow label="Смяна">
                <div className="flex items-center gap-3 pt-1.5">
                  <Toggle on={shift === 2} onChange={(v) => setShift(v ? 2 : 1)} onLabel="Втора" />
                  <span className="text-[12px] text-ink-500">първа / втора смяна</span>
                </div>
              </FormRow>
            </div>
          ) : (
            <div className="px-4 py-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[#f2f5f7] text-[#3d4a56]">
                      <th className="border border-[#dfe5ea] px-2 py-1.5 text-left font-bold">#</th>
                      <th className="border border-[#dfe5ea] px-2 py-1.5 text-left font-bold">Предмет <span className="text-[#e7505a]">*</span></th>
                      <th className="border border-[#dfe5ea] px-2 py-1.5 text-left font-bold">Учител <span className="text-[#e7505a]">*</span></th>
                      <th className="border border-[#dfe5ea] px-2 py-1.5 text-left font-bold">Вид подготовка <span className="text-[#e7505a]">*</span></th>
                      <th className="border border-[#dfe5ea] px-2 py-1.5 text-center font-bold" colSpan={2}>Седмици/Занятия Срок I</th>
                      <th className="border border-[#dfe5ea] px-2 py-1.5 text-center font-bold" colSpan={2}>Седмици/Занятия Срок II</th>
                      <th className="border border-[#dfe5ea] px-2 py-1.5 text-left font-bold">Чужд език</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!rows.length && (
                      <tr>
                        <td colSpan={9} className="border border-[#dfe5ea] px-3 py-6 text-center text-[12.5px] text-ink-500">
                          Няма добавени предмети. Натиснете „Добави учебен предмет“ и изберете предмет и учител.
                        </td>
                      </tr>
                    )}
                    {rows.map((r, i) => (
                      <tr key={r.key} className="align-top">
                        <td className="border border-[#dfe5ea] px-2 py-1.5 text-ink-500">{i + 1}</td>
                        <td className="border border-[#dfe5ea] px-1 py-1" style={{ minWidth: 168 }}>
                          <ASelect
                            value={r.subjectId}
                            onChange={(e) => {
                              const sid = e.target.value
                              // учителят остава само ако преподава новия предмет
                              const stillOk = (teachers.find((t) => t.id === r.teacherId)?.subjectIds ?? []).includes(sid)
                              patchRow(i, { subjectId: sid, teacherId: stillOk ? r.teacherId : '' })
                            }}
                            className={`!py-1 !text-[12px] ${!r.subjectId ? '!border-[#e7505a]' : ''}`}
                          >
                            <option value="">Изберете</option>
                            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </ASelect>
                        </td>
                        <td className="border border-[#dfe5ea] px-1 py-1" style={{ minWidth: 168 }}>
                          <div className="flex items-center gap-1">
                            <ASelect
                              value={r.teacherId}
                              disabled={!r.subjectId}
                              onChange={(e) => patchRow(i, { teacherId: e.target.value })}
                              className={`!py-1 !text-[12px] ${
                                !r.subjectId ? '!bg-[#f2f5f7] !text-ink-400' : !r.teacherId ? '!border-[#e7505a]' : ''
                              }`}
                            >
                              <option value="">
                                {!r.subjectId
                                  ? 'Първо изберете предмет'
                                  : teachersFor(r.subjectId).length
                                    ? 'Изберете'
                                    : 'Няма учител по предмета'}
                              </option>
                              {teachersFor(r.subjectId).map((t) => (
                                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                              ))}
                            </ASelect>
                            <button
                              type="button"
                              title="Нов учител по този предмет"
                              disabled={!r.subjectId}
                              onClick={() => setQuick(i)}
                              className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[3px] text-white disabled:opacity-40"
                              style={{ background: '#36c6d3' }}
                            >
                              <Icon name="plus" size={13} strokeWidth={2.6} />
                            </button>
                          </div>
                        </td>
                        <td className="border border-[#dfe5ea] px-1 py-1">
                          <ASelect
                            value={r.prepKind}
                            onChange={(e) => patchRow(i, { prepKind: e.target.value })}
                            className="!py-1 !text-[12px]"
                          >
                            {PLAN_KINDS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </ASelect>
                        </td>
                        <td className="border border-[#dfe5ea] px-1 py-1" style={{ width: 52 }}>
                          <AInput value={r.weeks1a} onChange={(e) => patchRow(i, { weeks1a: e.target.value })} className="!py-1 !text-[12px]" />
                        </td>
                        <td className="border border-[#dfe5ea] px-1 py-1" style={{ width: 52 }}>
                          <AInput value={r.weeks1b} onChange={(e) => patchRow(i, { weeks1b: e.target.value })} className="!py-1 !text-[12px]" />
                        </td>
                        <td className="border border-[#dfe5ea] px-1 py-1" style={{ width: 52 }}>
                          <AInput value={r.weeks2a} onChange={(e) => patchRow(i, { weeks2a: e.target.value })} className="!py-1 !text-[12px]" />
                        </td>
                        <td className="border border-[#dfe5ea] px-1 py-1" style={{ width: 52 }}>
                          <AInput value={r.weeks2b} onChange={(e) => patchRow(i, { weeks2b: e.target.value })} className="!py-1 !text-[12px]" />
                        </td>
                        <td className="border border-[#dfe5ea] px-1 py-1">
                          <ASelect
                            value={r.foreignLang}
                            onChange={(e) => patchRow(i, { foreignLang: e.target.value })}
                            className="!py-1 !text-[12px]"
                          >
                            <option value="">Изберете</option>
                            {FOREIGN_LANGS.map((f) => <option key={f} value={f}>{f}</option>)}
                          </ASelect>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={() => setRows((rs) => [...rs, emptyRow()])}
                className="mt-3 inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1.5 text-[12.5px] font-semibold text-white"
                style={{ background: '#3598dc' }}
              >
                <Icon name="plus" size={13} strokeWidth={2.6} /> Добави учебен предмет
              </button>

              <p className="mt-3 text-[11.5px] text-ink-400">
                Учителите, избрани тук, получават паралелката в модул „Дневник" и предметите в профила си.
              </p>

              {/*
                Обобщение точно както ще се вижда в паралелката:
                    Английски език — Симеон Кръстев
                Учителят е истинският, зададен в реда по-горе.
              */}
              {filled.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-[3px] border border-[#e3e9ee] bg-[#f5f7f9]">
                  {filled.map((r) => (
                    <div
                      key={r.key}
                      className="flex flex-wrap items-baseline gap-1.5 border-b border-[#e3e9ee] px-3 py-1.5 text-[13px] last:border-b-0"
                    >
                      <b className="text-ink-900">{subjectName(r.subjectId)}</b>
                      <span className="text-ink-400">—</span>
                      <span className={r.teacherId ? 'text-ink-700' : 'text-[#b42318]'}>
                        {r.teacherId ? teacherNameOf(r.teacherId) : 'няма избран учител'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {quick !== null && (
        <QuickTeacher
          subjects={subjects}
          presetSubject={rows[quick]?.subjectId}
          onClose={() => setQuick(null)}
          onCreate={(u) => {
            if (quick === null) return
            patchRow(quick, { teacherId: u.id })
            setQuick(null)
          }}
        />
      )}
    </AddPage>
  )
}

/** Бързо добавяне на учител от реда „Предмети и учители". */
function QuickTeacher({
  subjects, presetSubject, onClose, onCreate,
}: {
  subjects: { id: string; name: string }[]
  presetSubject?: string
  onClose: () => void
  onCreate: (u: User) => void
}) {
  const { update, db } = useApp()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  // предметът от реда е избран предварително — новият учител веднага става
  // кандидат за него
  const [subjectIds, setSubjectIds] = useState<string[]>(presetSubject ? [presetSubject] : [])
  const [err, setErr] = useState('')

  const create = () => {
    if (!firstName.trim() || !lastName.trim()) { setErr('Въведете име и фамилия.'); return }
    const id = `usr_${Date.now()}`
    const user: User = {
      id,
      username: `u${String(db.users.length + 1).padStart(3, '0')}`,
      password: 'demo123',
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: '',
      phone: '',
      roles: ['teacher'],
      subjectIds,
      classIds: [],
      active: true,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    update((d) => { d.users.push(user) })
    onCreate(user)
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink-900/45 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-pop">
        <h3 className="mb-3 text-[14px] font-bold text-ink-900">Нов учител</h3>
        {err && <p className="mb-2 text-[12px] text-[#b42318]">{err}</p>}
        <div className="space-y-2">
          <AInput placeholder="Име" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <AInput placeholder="Фамилия" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <div>
            <p className="mb-1 text-[11.5px] font-semibold text-ink-500">Предмети</p>
            <CheckList
              items={subjects.map((s) => ({ id: s.id, label: s.name }))}
              selected={subjectIds}
              onToggle={(id) => setSubjectIds((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))}
              height={140}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[3px] border border-ink-200 px-3 py-1.5 text-[12.5px] font-semibold text-ink-600 hover:bg-ink-50">
            Отказ
          </button>
          <button type="button" onClick={create} className="rounded-[3px] px-3 py-1.5 text-[12.5px] font-semibold text-white" style={{ background: '#26c281' }}>
            Създай
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Списък с паралелки ──────────────────────────────────────────────────────
export default function Paralelki() {
  const { db, update } = useApp()
  const [q, setQ] = useState('')
  const [form, setForm] = useState<{ open: boolean; editing?: Klass; preset?: 'ifo' }>({ open: false })
  const [changeTeacher, setChangeTeacher] = useState(false)
  const [newGroup, setNewGroup] = useState(false)

  const teachers = db.users.filter((u) => u.roles.some((r) => TEACHER_ROLES.includes(r)))

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return db.classes
      .filter((k) => !term || k.name.toLowerCase().includes(term) ||
        (db.users.find((u) => u.id === k.homeroomTeacherId)?.lastName ?? '').toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, 'bg'))
  }, [db.classes, db.users, q])

  const teacherCount = (k: Klass) => {
    const ids = new Set<string>()
    ;(k.plan ?? []).forEach((p) => p.teacherId && ids.add(p.teacherId))
    if (k.homeroomTeacherId) ids.add(k.homeroomTeacherId)
    return ids.size
  }

  const remove = (k: Klass) => {
    if (!confirm(`Да се изтрие ли паралелка ${k.name}? Учениците ще останат без паралелка.`)) return
    update((d) => {
      d.classes = d.classes.filter((c) => c.id !== k.id)
      d.users.forEach((u) => { u.classIds = (u.classIds ?? []).filter((c) => c !== k.id) })
    })
  }

  return (
    <>
      <PageHeader
        title="Паралелки"
        subtitle="Създадената паралелка влиза веднага в модул „Дневник“ — за администраторите и за учителите, които преподават в нея."
        icon="grid"
      />

      <ListHead icon="grid" title="Всички паралелки" count={db.classes.length} />

      <Toolbar>
        <ToolBtn tone="green" icon="plus" onClick={() => setForm({ open: true })}>Добави</ToolBtn>
        <ToolBtn tone="green" icon="plus" onClick={() => setNewGroup(true)}>Добави сб. гр.</ToolBtn>
        <ToolBtn tone="green" icon="plus" onClick={() => setForm({ open: true, preset: 'ifo' })}>Добави ИФО</ToolBtn>
        <ToolBtn tone="blue" icon="swap" onClick={() => setChangeTeacher(true)}>Смени учител</ToolBtn>
      </Toolbar>

      <div className="mb-0 flex flex-wrap items-center gap-1.5 border border-[#d7dee4] border-b-0 bg-white px-2 py-1.5">
        {['Принтирай', 'Копирай', 'PDF', 'Excel', 'CSV', 'Колони'].map((l) => (
          <button key={l} type="button" className="rounded-[2px] border border-[#c7d0d8] px-2 py-1 text-[11.5px] font-semibold text-[#3d4a56] hover:bg-[#eef2f5]">
            {l}
          </button>
        ))}
        <span className="rounded-[2px] border border-[#c7d0d8] px-2 py-1 text-[11.5px] text-[#5b6b78]">50 реда</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[11.5px] text-[#5b6b78]">Търсене:</span>
          <Input value={q} onChange={(e) => setQ(e.target.value)} className="!w-[190px] !rounded-[2px] !py-1 !text-[12px]" />
        </div>
      </div>

      <Table
        className="!rounded-none"
        head={
          <>
            <th className="th">Клас</th>
            <th className="th">Класен ръководител</th>
            <th className="th">Дневник</th>
            <th className="th w-16">Групи</th>
            <th className="th w-24">Ученици</th>
            <th className="th w-24">Учители</th>
            <th className="th w-24">Предмети</th>
            <th className="th w-24">Операции</th>
          </>
        }
      >
        {rows.map((k) => {
          const homeroom = db.users.find((u) => u.id === k.homeroomTeacherId)
          const groups = db.combinedGroups.filter((g) => g.classIds.includes(k.id)).length
          return (
            <tr key={k.id} className="hover:bg-[#f6fafd]">
              <td className="td">
                <button onClick={() => setForm({ open: true, editing: k })} className="dn-link font-semibold">
                  {k.name.replace(/-/g, '')}
                </button>
              </td>
              <td className="td">
                <Dash>
                  {homeroom ? (
                    <span className="text-[#2b6ca3]">{homeroom.firstName} {homeroom.lastName}</span>
                  ) : undefined}
                </Dash>
              </td>
              <td className="td text-[12.5px] text-ink-600">{k.journalType ?? journalFor(k.gradeLabel ?? String(k.grade))}</td>
              <td className="td"><span className="dn-num dn-olive">{groups}</span></td>
              <td className="td"><span className="dn-num dn-salmon">{k.studentIds.length}</span></td>
              <td className="td"><span className="dn-num dn-green">{teacherCount(k)}</span></td>
              <td className="td"><span className="dn-num dn-olive">{k.subjectIds.length}</span></td>
              <td className="td">
                <div className="flex items-center gap-1">
                  <SquareAction tone="blue" title="Редакция" onClick={() => setForm({ open: true, editing: k })} />
                  <SquareAction tone="red" icon="close" title="Изтриване" onClick={() => remove(k)} />
                </div>
              </td>
            </tr>
          )
        })}
        {!rows.length && <EmptyRow colSpan={8} text="Няма паралелки — добавете първата с бутона „Добави“." />}
      </Table>

      {form.open && (
        <ClassForm
          editing={form.editing}
          preset={form.preset}
          onClose={() => setForm({ open: false })}
        />
      )}

      {changeTeacher && <ChangeTeacher teachers={teachers} onClose={() => setChangeTeacher(false)} />}
      {newGroup && <NewGroup onClose={() => setNewGroup(false)} />}
    </>
  )
}

/** „Смени учител" — сменя класния ръководител на избрана паралелка. */
function ChangeTeacher({ teachers, onClose }: { teachers: User[]; onClose: () => void }) {
  const { db, update } = useApp()
  const [classId, setClassId] = useState(db.classes[0]?.id ?? '')
  const [teacherId, setTeacherId] = useState('')
  const [done, setDone] = useState('')

  const apply = () => {
    if (!classId || !teacherId) return
    update((d) => {
      const k = d.classes.find((c) => c.id === classId)
      if (!k) return
      const old = k.homeroomTeacherId
      k.homeroomTeacherId = teacherId
      const t = d.users.find((u) => u.id === teacherId)
      if (t) {
        t.classIds = [...new Set([...(t.classIds ?? []), classId])]
        if (!t.roles.includes('class_teacher')) t.roles = [...t.roles, 'class_teacher']
      }
      if (old) {
        const o = d.users.find((u) => u.id === old)
        if (o) o.classIds = (o.classIds ?? []).filter((c) => c !== classId)
      }
    })
    setDone('Класният ръководител е сменен.')
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink-900/45 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-pop">
        <h3 className="mb-3 text-[14px] font-bold text-ink-900">Смяна на класен ръководител</h3>
        <div className="space-y-2">
          <ASelect value={classId} onChange={(e) => setClassId(e.target.value)}>
            {db.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </ASelect>
          <ASelect value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">Изберете учител</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
          </ASelect>
          {done && <p className="text-[12px] text-[#1f7a45]">{done}</p>}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[3px] border border-ink-200 px-3 py-1.5 text-[12.5px] font-semibold text-ink-600 hover:bg-ink-50">Затвори</button>
          <button type="button" onClick={apply} className="rounded-[3px] px-3 py-1.5 text-[12.5px] font-semibold text-white" style={{ background: '#26c281' }}>Запази</button>
        </div>
      </div>
    </div>
  )
}

/** „Добави сб. гр." — сборна група от няколко паралелки. */
function NewGroup({ onClose }: { onClose: () => void }) {
  const { db, update } = useApp()
  const [name, setName] = useState('')
  const [subjectId, setSubjectId] = useState(db.subjects[0]?.id ?? '')
  const [classIds, setClassIds] = useState<string[]>([])
  const [teacherId, setTeacherId] = useState('')
  const [err, setErr] = useState('')

  const create = () => {
    if (!name.trim()) { setErr('Въведете име на групата.'); return }
    update((d) => {
      d.combinedGroups.push({
        id: `cg_${Date.now()}`,
        name: name.trim(),
        subjectId,
        classIds,
        studentIds: d.students.filter((s) => classIds.includes(s.classId) && s.status === 'активен').map((s) => s.id),
        teacherId,
        kind: 'сборна група',
      })
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink-900/45 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-pop">
        <h3 className="mb-3 text-[14px] font-bold text-ink-900">Нова сборна група</h3>
        {err && <p className="mb-2 text-[12px] text-[#b42318]">{err}</p>}
        <div className="space-y-2">
          <AInput placeholder="Име на групата" value={name} onChange={(e) => setName(e.target.value)} />
          <ASelect value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </ASelect>
          <ASelect value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">Изберете учител</option>
            {db.users.filter((u) => u.roles.some((r) => TEACHER_ROLES.includes(r))).map((t) => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
            ))}
          </ASelect>
          <div>
            <p className="mb-1 text-[11.5px] font-semibold text-ink-500">Паралелки</p>
            <CheckList
              items={db.classes.map((c) => ({ id: c.id, label: c.name }))}
              selected={classIds}
              onToggle={(id) => setClassIds((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))}
              height={150}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[3px] border border-ink-200 px-3 py-1.5 text-[12.5px] font-semibold text-ink-600 hover:bg-ink-50">Отказ</button>
          <button type="button" onClick={create} className="rounded-[3px] px-3 py-1.5 text-[12.5px] font-semibold text-white" style={{ background: '#26c281' }}>Създай</button>
        </div>
      </div>
    </div>
  )
}

export { JOURNAL_TYPES, journalFor, TEACHER_ROLES }
