import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { Badge, EmptyState, Icon, PageHeader, Select } from '../components/ui'
import { GradebookTab } from './dnevnik/Gradebook'
import { AbsencesTab } from './dnevnik/Absences'
import { ReviewsTab } from './dnevnik/Reviews'
import { ScheduleTab } from './dnevnik/Schedule'
import { ThemesTab, HomeworkTab } from './dnevnik/Subjects'
import {
  ExamsTab, MeetingsTab, SupportTab, VhkTab, RemarksTab, SanctionsTab,
} from './dnevnik/Registers'
import { ResultsTab, CorrectionalTab, EquivalenceTab } from './dnevnik/Exams2'
import { StudentsTab } from './dnevnik/Students'

/**
 * Модул „Дневник" — лента с 16 раздела, подредени както в референтния дневник:
 * Оц. · Отс. · Отз. · Раз. · Тем. · Дом. · Кон. · Род. · Под. · ВЧК · Бел. ·
 * Сан. · Рез. · Поп. · Прир. · Уч.
 *
 * Броячът до всеки раздел е светъл (teal), когато има данни, и жълт, когато
 * разделът е празен — така веднага се вижда къде има въведена информация.
 * Активният раздел се пази в адреса (`?tab=`), за да могат връзките от
 * страничното меню да водят направо до него.
 */

interface TabDef {
  id: string
  short: string
  full: string
  icon: string
  /** без брояч — напр. разписанието */
  noCount?: boolean
}

const TABS: TabDef[] = [
  { id: 'grades', short: 'Оц.', full: 'Оценки', icon: 'edit' },
  { id: 'absences', short: 'Отс.', full: 'Отсъствия', icon: 'warn' },
  { id: 'reviews', short: 'Отз.', full: 'Отзиви', icon: 'badge' },
  { id: 'schedule', short: 'Раз.', full: 'Разписание', icon: 'grid', noCount: true },
  { id: 'themes', short: 'Тем.', full: 'Теми', icon: 'list' },
  { id: 'homework', short: 'Дом.', full: 'Домашни работи', icon: 'clipboard' },
  { id: 'exams', short: 'Кон.', full: 'Контролни работи', icon: 'task' },
  { id: 'meetings', short: 'Род.', full: 'Родителски срещи', icon: 'calendar' },
  { id: 'support', short: 'Под.', full: 'Ученическа подкрепа', icon: 'heart' },
  { id: 'vhk', short: 'ВЧК', full: 'Втори час на класа', icon: 'school' },
  { id: 'remarks', short: 'Бел.', full: 'Бележки', icon: 'report' },
  { id: 'sanctions', short: 'Сан.', full: 'Санкции', icon: 'zap' },
  { id: 'results', short: 'Рез.', full: 'Резултати', icon: 'lines' },
  { id: 'correctional', short: 'Поп.', full: 'Поправителни изпити', icon: 'wrench' },
  { id: 'equivalence', short: 'Прир.', full: 'Приравнителни изпити', icon: 'equals' },
  { id: 'students', short: 'Уч.', full: 'Ученици', icon: 'cap' },
]

/** Часовете за едно отсъствие — „цял ден" се брои за всички часове. */
const HOURS_PER_DAY = 7

export default function Dnevnik() {
  const { db, myClasses, user } = useApp()
  const [params, setParams] = useSearchParams()

  const setView = (next: { tab?: string; klass?: string; subject?: string }) => {
    const p = new URLSearchParams(params)
    if (next.tab !== undefined) { if (next.tab) p.set('tab', next.tab); else p.delete('tab') }
    if (next.klass !== undefined) { if (next.klass) p.set('class', next.klass); else p.delete('class') }
    if (next.subject !== undefined) { if (next.subject) p.set('subject', next.subject); else p.delete('subject') }
    setParams(p, { replace: true })
  }

  const requested = params.get('class') ?? ''
  const classId = myClasses.some((c) => c.id === requested) ? requested : (myClasses[0]?.id ?? '')
  const tab = params.get('tab') ?? 'grades'
  const subjectId = params.get('subject') ?? ''

  const klass = db.classes.find((c) => c.id === classId)
  const classSubjects = useMemo(
    () => (klass ? db.subjects.filter((s) => klass.subjectIds.includes(s.id)) : []),
    [klass, db.subjects],
  )
  const activeSubject = subjectId || classSubjects[0]?.id || ''

  const [showEmpty, setShowEmpty] = useState(true)

  /** Броячите в лентата с раздели. */
  const counts = useMemo<Partial<Record<string, number>>>(() => {
    if (!klass) return {}
    const inClass = <T extends { classId: string }>(rows: T[]) => rows.filter((r) => r.classId === classId)
    const themeRows = inClass(db.themePlans).flatMap((p) => p.rows).filter((r) => r.taken)
    return {
      grades: inClass(db.grades).filter((g) => !g.draft).length,
      absences: inClass(db.absences).reduce((s, a) => s + (a.wholeDay ? HOURS_PER_DAY : 1), 0),
      reviews: inClass(db.notes).filter((n) => n.kind === 'Похвала' || n.kind === 'Забележка').length,
      themes: themeRows.length,
      homework: inClass(db.homework).length,
      exams: inClass(db.exams).length,
      meetings: inClass(db.classMeetings).length,
      support: inClass(db.supportPlans).length,
      vhk: inClass(db.vhkLessons).length,
      remarks: inClass(db.classNotes).length,
      sanctions: inClass(db.sanctions).length,
      results: inClass(db.correctionalExams).length,
      correctional: inClass(db.correctionalExams).length,
      equivalence: inClass(db.equivalenceExams).length,
      students: klass.studentIds.length,
    }
  }, [db, classId, klass])

  if (!myClasses.length) {
    return <EmptyState title="Няма достъпни паралелки" text="За вашия профил не са назначени паралелки." icon="grid" />
  }

  const isFamily = user?.roles.includes('parent') || user?.roles.includes('student')
  const active = TABS.find((t) => t.id === tab) ?? TABS[0]
  const visibleTabs = showEmpty ? TABS : TABS.filter((t) => t.noCount || (counts[t.id] ?? 0) > 0)

  return (
    <>
      <PageHeader
        title="Дневник"
        subtitle="Оценки, отсъствия, отзиви, разписание, теми, домашни, контролни, санкции и изпити по паралелки."
        icon="book"
        actions={
          <Select value={classId} onChange={(e) => setView({ klass: e.target.value, subject: '' })} className="w-auto min-w-[150px]">
            {myClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.profile ? ` — ${c.profile}` : ''}</option>
            ))}
          </Select>
        }
      />

      {klass && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-ink-500">
          <Badge tone="brand">{klass.name}</Badge>
          <span>{klass.studentIds.length} ученика</span>
          <span className="h-4 w-px bg-ink-200" />
          <span>
            Класен ръководител:{' '}
            <b className="text-ink-700">
              {db.users.find((u) => u.id === klass.homeroomTeacherId)?.firstName}{' '}
              {db.users.find((u) => u.id === klass.homeroomTeacherId)?.lastName}
            </b>
          </span>
          {klass.profile && <><span className="h-4 w-px bg-ink-200" /><span>Профил: <b className="text-ink-700">{klass.profile}</b></span></>}
          <span className="h-4 w-px bg-ink-200" />
          <span>Смяна: <b className="text-ink-700">{klass.shift}</b></span>
        </div>
      )}

      {/* ── Лента с раздели ── */}
      <div className="mb-0 flex items-stretch overflow-x-auto border-b border-[var(--dn-line)] bg-white">
        {visibleTabs.map((t) => {
          const n = counts[t.id]
          const on = active.id === t.id
          return (
            <button
              key={t.id}
              onClick={() => setView({ tab: t.id })}
              title={t.full}
              className={`dt ${on ? 'dt-on' : ''}`}
            >
              <Icon name={t.icon} size={15} strokeWidth={2} />
              <span>{t.short}</span>
              {!t.noCount && n !== undefined && (
                <span className={`dt-c ${n > 0 ? '' : 'dt-c0'}`}>{n}</span>
              )}
            </button>
          )
        })}
        <button
          onClick={() => setShowEmpty((v) => !v)}
          title={showEmpty ? 'Скрий празните раздели' : 'Покажи всички раздели'}
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 px-3 text-[11.5px] font-semibold text-ink-500 hover:text-ink-700"
        >
          <Icon name={showEmpty ? 'eye' : 'filter'} size={13} strokeWidth={2.2} />
          {showEmpty ? 'Всички раздели' : 'Само с данни'}
        </button>
      </div>

      <div className="mb-4 border-b border-[var(--dn-line)] bg-white px-0.5 py-2 text-[11.5px] text-ink-500">
        Раздел: <b className="text-ink-700">{active.full}</b>
      </div>

      {/* ── Съдържание ── */}
      {tab === 'grades' && (
        klass && activeSubject ? (
          <GradebookTab
            classId={classId}
            subjectId={activeSubject}
            klass={klass}
            subjects={classSubjects}
            onSelectSubject={(id) => setView({ subject: id })}
          />
        ) : (
          <EmptyState title="Няма предмети" text="За тази паралелка не са зададени предмети." icon="list" />
        )
      )}

      {tab === 'absences' && <AbsencesTab classId={classId} />}
      {tab === 'reviews' && <ReviewsTab classId={classId} />}
      {tab === 'schedule' && <ScheduleTab classId={classId} />}
      {tab === 'themes' && <ThemesTab classId={classId} />}
      {tab === 'homework' && <HomeworkTab classId={classId} />}
      {tab === 'exams' && <ExamsTab classId={classId} />}
      {tab === 'meetings' && <MeetingsTab classId={classId} />}
      {tab === 'support' && <SupportTab classId={classId} />}
      {tab === 'vhk' && <VhkTab classId={classId} />}
      {tab === 'remarks' && <RemarksTab classId={classId} />}
      {tab === 'sanctions' && <SanctionsTab classId={classId} />}
      {tab === 'results' && <ResultsTab classId={classId} />}
      {tab === 'correctional' && <CorrectionalTab classId={classId} />}
      {tab === 'equivalence' && <EquivalenceTab classId={classId} />}
      {tab === 'students' && <StudentsTab classId={classId} />}

      {isFamily && (
        <div className="mt-5">
          <Badge tone="neutral">Режим на четене — като родител/ученик виждате само данните на своето дете</Badge>
        </div>
      )}
    </>
  )
}
