import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../store/AppContext'
import { personShort } from '../../lib/classes'
import type { Klass, Student } from '../../lib/types'
import { Icon } from '../../components/ui'
import { Dash } from './shared'

/**
 * Екранът на една паралелка — отваря се при клик върху името в
 * „Администрация → Паралелки".
 *
 * Подредбата следва референтния дневник: заглавие с учебната година и лента с
 * действия, под него раздели (Основни данни, Учители, Ученици, Групи), а
 * съдържанието е списък „етикет : стойност" или таблица.
 */

/** Ред „етикет : стойност" — етикетът е дясно подравнен, както в образеца. */
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start py-[7px]">
      <span className="w-[250px] shrink-0 border-r border-[#e4e9ee] pr-3 text-right text-[12.5px] font-semibold leading-[19px] text-[#3d4a56]">
        {label}:
      </span>
      <span className="min-w-0 flex-1 pl-3 text-[12.5px] leading-[19px] text-ink-800">{children}</span>
    </div>
  )
}

function PTable({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[#d7dee4] bg-white">
      <table className="w-full border-collapse">
        <thead className="bg-[#f5f7f9]">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-[#eef1f4]">{children}</tbody>
      </table>
    </div>
  )
}

function EmptyPane({ text }: { text: string }) {
  return (
    <div className="grid place-items-center border border-[#d7dee4] bg-white py-16 text-center">
      <Icon name="info" size={22} className="text-ink-300" />
      <p className="mt-2 text-[12.5px] text-ink-500">{text}</p>
    </div>
  )
}

function Dialog({
  title, onClose, children, footer, width = 460,
}: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink-900/45 p-4">
      <div className="w-full rounded-[3px] bg-white shadow-pop" style={{ maxWidth: width }}>
        <div className="flex items-center justify-between border-b border-[#e4e9ee] px-4 py-2.5">
          <h3 className="text-[13.5px] font-bold text-[#3d4a56]">{title}</h3>
          <button type="button" onClick={onClose} className="grid h-6 w-6 place-items-center rounded text-ink-500 hover:bg-ink-100">
            <Icon name="close" size={14} strokeWidth={2.4} />
          </button>
        </div>
        <div className="px-4 py-3">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-[#e4e9ee] px-4 py-2.5">{footer}</div>}
      </div>
    </div>
  )
}

const TABS = [
  { id: 'main', label: 'Основни данни', icon: 'grid' },
  { id: 'teachers', label: 'Учители', icon: 'cap' },
  { id: 'students', label: 'Ученици', icon: 'users' },
  { id: 'groups', label: 'Групи', icon: 'meet' },
]

export default function ClassDetail({
  klass, tab, onTab, onBack, onEdit,
}: {
  klass: Klass
  tab: string
  onTab: (t: string) => void
  onBack: () => void
  onEdit: () => void
}) {
  const { db, update, subjectName, className: klassName } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [showAllGroups, setShowAllGroups] = useState(false)
  const [groupQuery, setGroupQuery] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [target, setTarget] = useState('')
  const [msg, setMsg] = useState('')

  const name = klass.name.replace(/-/g, '')
  const homeroom = db.users.find((u) => u.id === klass.homeroomTeacherId)

  const plan = useMemo(
    () => (klass.plan ?? []).filter((p) => p.subjectId),
    [klass.plan],
  )

  const teacherIds = useMemo(() => {
    const ids = new Set<string>()
    plan.forEach((p) => p.teacherId && ids.add(p.teacherId))
    if (klass.homeroomTeacherId) ids.add(klass.homeroomTeacherId)
    return ids
  }, [plan, klass.homeroomTeacherId])

  const students = useMemo(
    () => db.students
      .filter((s) => s.classId === klass.id)
      .sort((a, b) => a.number - b.number),
    [db.students, klass.id],
  )

  const groups = useMemo(() => {
    const base = showAllGroups ? db.combinedGroups : db.combinedGroups.filter((g) => g.classIds.includes(klass.id))
    const term = groupQuery.trim().toLowerCase()
    return base.filter((g) => !term || subjectName(g.subjectId).toLowerCase().includes(term))
  }, [db.combinedGroups, klass.id, showAllGroups, groupQuery, subjectName])

  const otherClasses = db.classes.filter((c) => c.id !== klass.id)

  const remove = () => {
    if (!window.confirm(`Да се изтрие ли паралелка ${name}? Учениците ще останат без паралелка.`)) return
    update((d) => {
      d.classes = d.classes.filter((c) => c.id !== klass.id)
      d.users.forEach((u) => { u.classIds = (u.classIds ?? []).filter((c) => c !== klass.id) })
    })
    onBack()
  }

  const transfer = () => {
    if (!target) { setMsg('Изберете паралелка, в която да се прехвърлят.'); return }
    if (!picked.length) { setMsg('Отбележете поне един ученик.'); return }
    update((d) => {
      const from = d.classes.find((c) => c.id === klass.id)
      const to = d.classes.find((c) => c.id === target)
      if (!from || !to) return
      from.studentIds = from.studentIds.filter((id) => !picked.includes(id))
      to.studentIds = [...new Set([...to.studentIds, ...picked])]
      d.students.forEach((s) => { if (picked.includes(s.id)) s.classId = target })
    })
    setTransferOpen(false)
    setPicked([])
    setTarget('')
    setMsg('')
  }

  const parentsOf = (s: Student) =>
    (s.parentIds ?? [])
      .map((id) => db.users.find((u) => u.id === id))
      .filter(Boolean)
      .map((u) => personShort(u!))
      .join(', ')

  const yearLabel = db.school.year.replace('/', ' - ')
  /** „дневна" → „Дневна", ако формата е зададена само през полето `form`. */
  const educationLabel = klass.educationForm
    ?? (klass.form ? klass.form.charAt(0).toUpperCase() + klass.form.slice(1) : '')
  const counts: Record<string, number> = {
    teachers: teacherIds.size,
    students: students.length,
    groups: db.combinedGroups.filter((g) => g.classIds.includes(klass.id)).length,
  }

  const renderMain = () => (
    <div className="border border-[#d7dee4] bg-white px-4 py-3">
      <InfoRow label="Паралелка">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="grid" size={13} className="text-[#337ab7]" />
          <span className="font-semibold text-ink-900">{name}</span>
          <Link to={`/dnevnik?class=${klass.id}`} className="text-[#337ab7] hover:underline">
            ( виж Дневник )
          </Link>
        </span>
      </InfoRow>
      <InfoRow label="Тип дневник"><Dash>{klass.journalType}</Dash></InfoRow>
      <InfoRow label="Класен ръководител">
        {homeroom ? (
          <span className="inline-flex items-center gap-1.5 text-[#337ab7]">
            <Icon name="cap" size={13} />
            {personShort(homeroom)}
          </span>
        ) : <Dash />}
      </InfoRow>
      <InfoRow label="Организационна форма"><Dash>{klass.orgForm}</Dash></InfoRow>
      <InfoRow label="Форма на обучение"><Dash>{educationLabel}</Dash></InfoRow>
      <InfoRow label="Срок на обучение"><Dash>{klass.studyTerm}</Dash></InfoRow>
      <InfoRow label="Организация на учебния ден"><Dash>{klass.dayOrg}</Dash></InfoRow>
      <InfoRow label="Финансира се от"><Dash>{klass.funding ?? 'Държавно финансиране'}</Dash></InfoRow>
      <InfoRow label="Слята паралелка">{klass.merged ? 'Да' : 'Не'}</InfoRow>
      <InfoRow label="Специална паралелка/група (за деца със СОП)">{klass.special ? 'Да' : 'Не'}</InfoRow>
      <InfoRow label="Вид подготовка"><Dash>{klass.prepKind}</Dash></InfoRow>
      <InfoRow label="Профил"><Dash>{klass.profile}</Dash></InfoRow>
      <InfoRow label="Смяна">{klass.shift}</InfoRow>
    </div>
  )

  const renderTeachers = () => {
    if (!plan.length) return <EmptyPane text="Няма въведени предмети и учители за тази паралелка." />
    return (
      <PTable
        head={
          <>
            <th className="th w-10">№</th>
            <th className="th">Предмет</th>
            <th className="th w-56">Учител</th>
            <th className="th w-36">Вид подготовка</th>
            <th className="th w-36">Хорариум (срок I)</th>
            <th className="th w-36">Хорариум (срок II)</th>
          </>
        }
      >
        {plan.map((p, i) => {
          const t = db.users.find((u) => u.id === p.teacherId)
          return (
            <tr key={`${p.subjectId}-${i}`} className="hover:bg-[#f6fafd]">
              <td className="td text-[12.5px] text-ink-500">{i + 1}</td>
              <td className="td text-[12.5px]">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="book" size={13} className="text-[#8593a0]" />
                  {subjectName(p.subjectId)}
                  {p.foreignLang && <span className="text-ink-400">({p.foreignLang})</span>}
                </span>
              </td>
              <td className="td text-[12.5px]">
                {t ? (
                  <span className="inline-flex items-center gap-1.5 text-[#337ab7]">
                    <Icon name="cap" size={13} />
                    {personShort(t)}
                  </span>
                ) : <Dash />}
              </td>
              <td className="td text-[12.5px]">{p.prepKind}</td>
              <td className="td text-[12.5px]">{(p.weeks1a ?? 0) + (p.weeks1b ?? 0)}</td>
              <td className="td text-[12.5px]">{(p.weeks2a ?? 0) + (p.weeks2b ?? 0)}</td>
            </tr>
          )
        })}
      </PTable>
    )
  }

  const renderStudents = () => {
    if (!students.length) return <EmptyPane text="Няма ученици в тази паралелка." />
    return (
      <PTable
        head={
          <>
            <th className="th w-12">№</th>
            <th className="th">Ученик</th>
            <th className="th w-[42%]">Родители</th>
          </>
        }
      >
        {students.map((s) => (
          <tr key={s.id} className="hover:bg-[#f6fafd]">
            <td className="td text-[12.5px] text-ink-500">{s.number}</td>
            <td className="td text-[12.5px]">
              <span className="inline-flex items-center gap-1.5 text-[#337ab7]">
                <Icon name="user" size={13} />
                {s.firstName} {s.middleName?.[0] ? `${s.middleName[0]}.` : ''} {s.lastName}
              </span>
            </td>
            <td className="td text-[12.5px] text-ink-600"><Dash>{parentsOf(s)}</Dash></td>
          </tr>
        ))}
      </PTable>
    )
  }

  const renderGroups = () => (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 border border-[#d7dee4] bg-[#eef1f4] px-3 py-2">
        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-700">
          <input
            type="checkbox"
            checked={showAllGroups}
            onChange={(e) => setShowAllGroups(e.target.checked)}
            className="h-[13px] w-[13px] accent-[#3598dc]"
          />
          Покажи общите групи
        </label>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={groupQuery}
            onChange={(e) => setGroupQuery(e.target.value)}
            placeholder="Търси предмет"
            className="w-[220px] rounded-[2px] border border-[#c7d0d8] px-2 py-[5px] text-[12px] outline-none focus:border-[#3598dc]"
          />
          <button
            type="button"
            onClick={() => { setGroupQuery(''); setShowAllGroups(false) }}
            className="db db-red"
          >
            <Icon name="close" size={13} strokeWidth={2.6} /> Изчисти
          </button>
        </div>
      </div>

      {!groups.length ? <EmptyPane text="Няма сборни групи за тази паралелка." /> : (
        <PTable
          head={
            <>
              <th className="th">Име</th>
              <th className="th w-36">Тип</th>
              <th className="th">Предмет</th>
              <th className="th w-56">Учител</th>
              <th className="th w-24">Ученици</th>
            </>
          }
        >
          {groups.map((g) => {
            const t = db.users.find((u) => u.id === g.teacherId)
            return (
              <tr key={g.id} className="hover:bg-[#f6fafd]">
                <td className="td text-[12.5px]">{g.name}</td>
                <td className="td text-[12.5px]">{g.kind}</td>
                <td className="td text-[12.5px]">{subjectName(g.subjectId)}</td>
                <td className="td text-[12.5px]"><Dash>{t ? personShort(t) : undefined}</Dash></td>
                <td className="td text-[12.5px]">{g.studentIds.length}</td>
              </tr>
            )
          })}
        </PTable>
      )}
    </div>
  )

  const content = (() => {
    switch (tab) {
      case 'teachers': return renderTeachers()
      case 'students': return renderStudents()
      case 'groups': return renderGroups()
      default: return renderMain()
    }
  })()

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#eef1f2]">
      {/* заглавие и действия */}
      <div className="shrink-0 border-b border-[#d7dee4] bg-white px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Icon name="grid" size={15} className="shrink-0 text-[#5b6b78]" />
          <h2 className="min-w-0 truncate text-[14.5px] font-bold text-[#337ab7]">
            {name} <span className="font-normal text-ink-600">({yearLabel})</span>
          </h2>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 rounded-[3px] border border-[#c7d0d8] bg-[#f7f9fa] px-2.5 py-1.5 text-[12.5px] font-semibold text-[#3d4a56] hover:bg-white"
            >
              <Icon name="chevronLeft" size={14} strokeWidth={2.2} /> Назад
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => { setMsg(''); setMenuOpen((v) => !v) }}
                className="db db-purple"
              >
                <Icon name="swap" size={14} strokeWidth={2.2} /> Прехвърли данни
                <Icon name="chevronDown" size={12} />
              </button>
              {menuOpen && (
                <>
                  <button type="button" aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-20 w-[230px] border border-[#d7dee4] bg-white py-1 shadow-pop">
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); setMsg(''); setTransferOpen(true) }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-ink-700 hover:bg-[#f2fafb]"
                    >
                      <Icon name="users" size={13} className="text-[#5b6b78]" /> Прехвърли ученици
                    </button>
                  </div>
                </>
              )}
            </div>

            <button type="button" onClick={onEdit} className="db db-blue">
              <Icon name="edit" size={14} strokeWidth={2.2} /> Редактирай
            </button>
            <button type="button" onClick={remove} className="db db-red">
              <Icon name="close" size={14} strokeWidth={2.6} /> Изтрий
            </button>
          </div>
        </div>
        {msg && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[#e7505a]">
            <Icon name="warn" size={13} /> {msg}
          </p>
        )}
      </div>

      {/* раздели */}
      <div className="flex shrink-0 items-stretch overflow-x-auto border-b border-[var(--dn-line)] bg-white">
        {TABS.map((t) => {
          const on = tab === t.id
          const count = counts[t.id]
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={`dt gap-1 px-2.5 text-[12.5px] ${on ? 'dt-on' : ''}`}
            >
              <Icon name={t.icon} size={13} />
              {t.label}
              {count !== undefined && <span className={`dt-c ${count === 0 ? 'dt-c0' : ''}`}>{count}</span>}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-[1260px]">{content}</div>
      </div>

      {/* прехвърляне на ученици */}
      {transferOpen && (
        <Dialog
          title={`Прехвърляне на ученици от ${name}`}
          onClose={() => setTransferOpen(false)}
          width={520}
          footer={
            <>
              <button
                type="button"
                onClick={() => setTransferOpen(false)}
                className="rounded-[3px] border border-[#c7d0d8] px-3 py-1.5 text-[12.5px] font-semibold text-[#3d4a56] hover:bg-[#f7f9fa]"
              >
                Отказ
              </button>
              <button type="button" onClick={transfer} className="db db-green">Прехвърли</button>
            </>
          }
        >
          {!students.length ? (
            <p className="py-4 text-center text-[12.5px] text-ink-400">В паралелката няма ученици.</p>
          ) : (
            <>
              <div className="mb-2 max-h-[220px] overflow-y-auto border border-[#e4e9ee]">
                {students.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2 border-b border-[#eef1f4] px-2 py-1.5 text-[12.5px] last:border-b-0 hover:bg-[#f2fafb]">
                    <input
                      type="checkbox"
                      checked={picked.includes(s.id)}
                      onChange={() => setPicked((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id]))}
                      className="h-[13px] w-[13px] accent-[#3598dc]"
                    />
                    <span className="w-6 text-right text-ink-500">{s.number}</span>
                    {s.firstName} {s.lastName}
                  </label>
                ))}
              </div>
              <label className="block text-[12.5px] font-semibold text-[#3d4a56]">
                Прехвърли в:
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="mt-1 w-full rounded-[3px] border border-[#c7d0d8] px-2 py-[6px] text-[13px] outline-none focus:border-[#3598dc]"
                >
                  <option value="">Изберете паралелка</option>
                  {otherClasses.map((c) => (
                    <option key={c.id} value={c.id}>{klassName(c.id)}</option>
                  ))}
                </select>
              </label>
            </>
          )}
        </Dialog>
      )}
    </div>
  )
}
