import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Icon } from '../../components/ui'
import { DnTable, EmptyRow, RowActions, Th, dateOnly } from './shared'
import type { AbsenceNote, Klass, Student } from '../../lib/types'

/**
 * „Бележки" към отсъствията — цял екран по образеца на референтния дневник.
 *
 * Три таба (Медицински / Родителски / Други), таблица с номерация, лента с
 * действия и форма за добавяне. Записът на бележка **автоматично уважава**
 * отсъствията на ученика в периода — това е смисълът на бележката.
 */

type NoteKind = AbsenceNote['kind']

const TABS: { kind: NoteKind; label: string; icon: string; title: string }[] = [
  { kind: 'медицинска', label: 'Медицински бележки', icon: 'report', title: 'Медицински бележки' },
  { kind: 'родителска', label: 'Родителски бележки', icon: 'person', title: 'Всички бележки' },
  { kind: 'друга', label: 'Други бележки', icon: 'list', title: 'Всички бележки' },
]

const KIND_TITLE: Record<NoteKind, string> = {
  'медицинска': 'Добавяне на Бележка по медицински причини',
  'родителска': 'Добавяне на Бележка по семейни причини',
  'друга': 'Добавяне на Бележка по други причини',
}

const shortName = (s: Student) =>
  `${s.firstName} ${s.middleName ? `${s.middleName[0]}. ` : ''}${s.lastName}`

const isoToday = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Брой учебни (работни) дни в периода — събота и неделя не се броят. */
export function schoolDays(from: string, to: string): number {
  if (!from || !to || from > to) return 0
  let n = 0
  const d = new Date(`${from}T12:00:00`)
  const end = new Date(`${to}T12:00:00`)
  while (d <= end) {
    const wd = d.getDay()
    if (wd !== 0 && wd !== 6) n++
    d.setDate(d.getDate() + 1)
  }
  return n
}

/** Брой календарни дни включително двата края. */
const calendarDays = (from: string, to: string) =>
  from && to && from <= to ? Math.round((+new Date(`${to}T12:00:00`) - +new Date(`${from}T12:00:00`)) / 86400000) + 1 : 0

/** Номерът във вида от образеца: „#2600139885". */
const noteLabel = (n: AbsenceNote) =>
  n.number ? (/^\d+$/.test(n.number) ? `#${n.number}` : n.number) : '—'

// ── дребни елементи в стила на образеца ────────────────────────────────────

function NoteHeader({ title, onBack, onSave, saveDisabled }: {
  title: string
  onBack: () => void
  onSave?: () => void
  saveDisabled?: boolean
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[#d8dde3] bg-white px-4 py-2">
      <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#333]">{title}</h2>
      <button
        type="button" onClick={onBack}
        className="inline-flex items-center gap-1 rounded-[3px] border border-[#ccc] bg-[#f7f7f7] px-2.5 py-1 text-[12.5px] text-[#333] hover:bg-white"
      >
        <Icon name="chevronLeft" size={14} strokeWidth={2.2} /> Назад
      </button>
      {onSave && (
        <button
          type="button" onClick={onSave} disabled={saveDisabled}
          className="inline-flex items-center gap-1 rounded-[3px] bg-[#26b3a4] px-3 py-1 text-[12.5px] font-semibold text-white hover:brightness-105 disabled:opacity-60"
        >
          <Icon name="check" size={14} strokeWidth={2.6} /> Запази
        </button>
      )}
    </div>
  )
}

/** Синята лента с правило. */
function BlueBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-[#b8d4ea] border-l-4 border-l-[#337ab7] bg-white px-3 py-1.5 text-center text-[12.5px] text-[#333]">
      {children}
    </div>
  )
}

/** Жълтата лента „ВНИМАНИЕ". */
function YellowBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-[#f5e5a3] bg-[#fdf6d8] px-3 py-2 text-center text-[12.5px] font-semibold text-[#8a6d3b]">
      {children}
    </div>
  )
}

/** Малките бутони от лентата (Принтирай, PDF, Excel …). */
function SmallBtn({ children, color = '#555', onClick }: {
  children: React.ReactNode
  color?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button" onClick={onClick}
      className="rounded-[2px] border border-[#dcdcdc] bg-white px-2 py-[3px] text-[12px] font-semibold hover:bg-[#f7f7f7]"
      style={{ color }}
    >
      {children}
    </button>
  )
}

/** Заглавна клетка със стрелките за сортиране, както е в образеца. */
function H({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <Th className={`whitespace-nowrap ${className}`}>
      <span className="inline-flex items-center gap-1">
        {children}
        <span className="text-[7px] leading-[7px] text-[#b9c2ca]">▲▼</span>
      </span>
    </Th>
  )
}

const toDots = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}.${m}.${y}` : ''
}

/** Валидна ли е датата (проверява и 31.02). */
function isRealDate(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return false
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

/**
 * Поле за дата във вид `дд.мм.гггг` — както е в образеца.
 * Навътре пази ISO (`2026-10-26`), за да работи сравняването на низове.
 * `input[type=date]` не става: Chrome показва датата според езика на браузъра
 * (10/26/2026) и не се поддава на `lang`.
 */
function DateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [text, setText] = useState(value ? toDots(value) : '')

  const handle = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    let out = digits
    if (digits.length > 4) out = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
    else if (digits.length > 2) out = `${digits.slice(0, 2)}.${digits.slice(2)}`
    setText(out)
    if (digits.length === 8) {
      const iso = `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`
      if (isRealDate(iso)) onChange(iso)
    } else if (digits.length === 0) {
      onChange('')
    }
  }

  return (
    <input
      value={text}
      onChange={(e) => handle(e.target.value)}
      placeholder="дд.мм.гггг"
      inputMode="numeric"
      className="w-[170px] rounded-[2px] border border-[#ccc] bg-white px-2 py-[5px] text-[12.5px] text-[#333] outline-none focus:border-[#337ab7]"
    />
  )
}

// ── списък с бележки ───────────────────────────────────────────────────────

export function AbsenceNotesPage({ klass, students, onClose, onToast }: {
  klass: Klass
  students: Student[]
  onClose: () => void
  onToast: (m: string) => void
}) {
  const { db, user, isStaff, addAbsenceNotesAndExcuse, updateAbsenceNote, deleteAbsenceNote } = useApp()
  const [tab, setTab] = useState<NoteKind>('медицинска')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AbsenceNote | null>(null)

  const perPage = 50
  const today = isoToday()

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    return db.absenceNotes
      .filter((n) => n.classId === klass.id && n.kind === tab)
      .filter((n) => {
        if (!q) return true
        const s = db.students.find((x) => x.id === n.studentId)
        return `${s?.firstName ?? ''} ${s?.lastName ?? ''} ${n.number ?? ''} ${n.text}`.toLowerCase().includes(q)
      })
      .sort((a, b) => b.from.localeCompare(a.from))
  }, [db.absenceNotes, db.students, klass.id, tab, search])

  const pages = Math.max(1, Math.ceil(list.length / perPage))
  const shown = list.slice((page - 1) * perPage, page * perPage)

  /** Неуважените отсъствия на ученика в периода на бележката. */
  const unexcusedIn = (n: AbsenceNote) =>
    db.absences.filter(
      (a) => a.studentId === n.studentId && a.date >= n.from && a.date <= n.to && !a.excused && !a.deletedAt,
    ).length

  const authorName = (id: string) => {
    const u = db.users.find((x) => x.id === id)
    return u ? `${u.firstName} ${u.middleName ? `${u.middleName[0]}. ` : ''}${u.lastName}` : '—'
  }

  const openAdd = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (n: AbsenceNote) => { setEditing(n); setFormOpen(true) }

  const remove = (n: AbsenceNote) => {
    if (n.to < today) {
      onToast('Не може да изтривате бележки за изминал период.')
      return
    }
    deleteAbsenceNote(n.id)
    onToast('Бележката е изтрита.')
  }

  if (formOpen) {
    return (
      <NoteForm
        klass={klass} students={students} kind={tab} editing={editing}
        onBack={() => setFormOpen(false)}
        onSaved={(msg) => { setFormOpen(false); onToast(msg) }}
      />
    )
  }

  const t = TABS.find((x) => x.kind === tab)!
  const isMedical = tab === 'медицинска'
  const isParent = tab === 'родителска'
  const cols = isMedical ? 10 : 10

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f2f4f6]">
      <NoteHeader title={`${t.title} в ${klass.name}`} onBack={onClose} />

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {/* табовете */}
        <div className="mb-2 flex flex-wrap items-center gap-1 border-b border-[#d8dde3]">
          {TABS.map((x) => {
            const active = x.kind === tab
            return (
              <button
                key={x.kind}
                type="button"
                onClick={() => { setTab(x.kind); setPage(1) }}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-[12.5px] ${
                  active
                    ? 'border-[#337ab7] font-bold text-[#337ab7]'
                    : 'border-transparent text-[#555] hover:text-[#337ab7]'
                }`}
              >
                <Icon name={x.icon} size={13} className={active ? 'text-[#337ab7]' : 'text-[#7aa7cc]'} strokeWidth={2.2} />
                {x.label}
              </button>
            )
          })}
        </div>

        <div className="space-y-1.5">
          {isMedical ? (
            <BlueBar>
              Бележки за период над 30 дни не се използват за автоматично уважаване на отсъствия.
              Ако желаете могат да бъдат активирани от бутон „Уважи/Активирай".
            </BlueBar>
          ) : (
            <BlueBar>Не може да изтривате бележки за изминал период.</BlueBar>
          )}
          {isParent && (
            <YellowBar>
              ВНИМАНИЕ! След одобрение на бележка, подадена от родител, ще може да свалите заявление в PDF.
            </YellowBar>
          )}
        </div>

        {/* лента с действия */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {isStaff && (
            <button
              type="button" onClick={openAdd}
              className="inline-flex items-center gap-1 rounded-[2px] bg-[#26b3a4] px-2.5 py-[4px] text-[12px] font-semibold text-white hover:brightness-105"
            >
              <Icon name="plus" size={13} strokeWidth={3} /> Добави
            </button>
          )}
          <SmallBtn onClick={() => window.print()}>Принтирай</SmallBtn>
          <SmallBtn color="#d9534f">Копирай</SmallBtn>
          <SmallBtn color="#26b3a4">PDF</SmallBtn>
          <SmallBtn color="#3c8c3c">Excel</SmallBtn>
          <SmallBtn color="#8e44ad">CSV</SmallBtn>
          <SmallBtn>Колони</SmallBtn>
          <SmallBtn color="#337ab7">50 реда</SmallBtn>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-[12px] text-[#555]">Търсене:</label>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-[190px] rounded-[2px] border border-[#ccc] px-2 py-[3px] text-[12px] outline-none focus:border-[#337ab7]"
            />
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#ccc] bg-[#f7f7f7] px-2 py-[3px] text-[12px] font-semibold text-[#555] hover:bg-white"
            >
              <Icon name="filter" size={12} strokeWidth={2.2} /> Филтри
            </button>
          </div>
        </div>

        {/* таблица */}
        <div className="mt-2">
          <DnTable
            minWidth={isMedical ? 1040 : 900}
            head={
              <>
                <H className="w-[132px]">Номер</H>
                <H>Име</H>
                <H className="w-[92px]">От дата</H>
                <H className="w-[92px]">До дата</H>
                {isMedical ? (
                  <>
                    <H className="w-[122px]">Дата на издаване</H>
                    <H className="w-[112px]">НРН Бележка</H>
                    <H className="w-[112px]">НРН Преглед</H>
                    <H className="w-[112px]">УИН на лекар</H>
                  </>
                ) : (
                  <>
                    <H className="w-[100px]">Добавена на</H>
                    <H className="w-[130px]">Добавена от</H>
                    <H className="w-[130px]">Бележка</H>
                    <H className="w-[74px]">Брой дни</H>
                  </>
                )}
                <H className="w-[92px]">Неуважени</H>
                <H className="w-[92px]">Операции</H>
              </>
            }
          >
            {shown.map((n) => {
              const s = db.students.find((x) => x.id === n.studentId)
              return (
                <tr key={n.id} className="text-[12.5px] text-[#333]">
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11.5px] text-[#555]">{noteLabel(n)}</td>
                  <td className="px-3 py-1.5">
                    {s ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="person" size={13} className="text-[#337ab7]" strokeWidth={2} />
                        <span className="font-semibold text-[#337ab7]">{shortName(s)}</span>
                      </span>
                    ) : <span className="text-ink-400">—</span>}
                  </td>
                  <td className="px-3 py-1.5">{dateOnly(n.from)}</td>
                  <td className="px-3 py-1.5">{dateOnly(n.to)}</td>
                  {isMedical ? (
                    <>
                      <td className="px-3 py-1.5">{n.issuedAt ? dateOnly(n.issuedAt) : '—'}</td>
                      <td className="px-3 py-1.5">{n.nrnNote ?? '—'}</td>
                      <td className="px-3 py-1.5">{n.nrnReview ?? '—'}</td>
                      <td className="px-3 py-1.5">{n.doctorUin ?? '—'}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-1.5">{dateOnly(n.createdAt)}</td>
                      <td className="px-3 py-1.5">{authorName(n.authorId)}</td>
                      <td className="px-3 py-1.5">{n.text || '—'}</td>
                      <td className="px-3 py-1.5">{schoolDays(n.from, n.to)}</td>
                    </>
                  )}
                  <td className="px-3 py-1.5">{unexcusedIn(n)}</td>
                  <td className="px-3 py-1.5">
                    {isStaff && (
                      <RowActions
                        onEdit={() => openEdit(n)}
                        onDelete={n.authorId === user?.id || n.kind !== 'родителска' ? () => remove(n) : undefined}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
            {shown.length === 0 && <EmptyRow colSpan={cols} text="Няма данни в таблицата" />}
          </DnTable>
        </div>

        {/* долен ред с броя и страниците */}
        <div className="mt-2 flex items-center justify-between text-[12px] text-[#555]">
          <span>
            Показване на резултати от {list.length ? (page - 1) * perPage + 1 : 0} до{' '}
            {Math.min(page * perPage, list.length)} от общо {list.length}
          </span>
          <span className="inline-flex items-center gap-1">
            <button
              type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-[2px] border border-[#ccc] bg-white px-2 py-[2px] disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).slice(0, 7).map((p) => (
              <button
                key={p}
                type="button" onClick={() => setPage(p)}
                className={`rounded-[2px] border px-2.5 py-[2px] ${
                  p === page ? 'border-[#337ab7] bg-[#337ab7] font-semibold text-white' : 'border-[#ccc] bg-white text-[#337ab7]'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
              className="rounded-[2px] border border-[#ccc] bg-white px-2 py-[2px] disabled:opacity-40"
            >
              ›
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}

// ── форма за добавяне / редакция ───────────────────────────────────────────

function NoteForm({ klass, students, kind, editing, onBack, onSaved }: {
  klass: Klass
  students: Student[]
  kind: NoteKind
  editing: AbsenceNote | null
  onBack: () => void
  onSaved: (msg: string) => void
}) {
  const { db, user, addAbsenceNotesAndExcuse, updateAbsenceNote } = useApp()
  const [picked, setPicked] = useState<string[]>(editing ? [editing.studentId] : [])
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(editing?.from ?? '')
  const [to, setTo] = useState(editing?.to ?? '')
  const [notifiedAt, setNotifiedAt] = useState(editing?.notifiedAt ?? '')
  const [issuedAt, setIssuedAt] = useState(editing?.issuedAt ?? '')
  const [nrnNote, setNrnNote] = useState(editing?.nrnNote ?? '')
  const [nrnReview, setNrnReview] = useState(editing?.nrnReview ?? '')
  const [doctorUin, setDoctorUin] = useState(editing?.doctorUin ?? '')
  const [text, setText] = useState(editing?.text ?? '')
  const [fileName, setFileName] = useState(editing?.fileName ?? '')
  const [errors, setErrors] = useState<string[]>([])

  const isMedical = kind === 'медицинска'
  const isParent = kind === 'родителска'

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const summary = picked.length === 0
    ? 'Изберете'
    : picked
      .map((id) => {
        const s = students.find((x) => x.id === id)
        return s ? `${s.number} ${s.firstName} ${s.middleName ? `${s.middleName[0]}. ` : ''}${s.lastName}` : ''
      })
      .join(' , ')

  /** Колко дни в периода вече са уважени за избрания ученик (чипът до полето). */
  const alreadyExcused = (() => {
    if (picked.length !== 1 || !from || !to || from > to) return 0
    const dates = new Set(
      db.absences
        .filter((a) => a.studentId === picked[0] && a.date >= from && a.date <= to && a.excused && !a.deletedAt)
        .map((a) => a.date),
    )
    return dates.size
  })()

  const save = () => {
    const errs: string[] = []
    if (!picked.length) errs.push('Изберете ученик.')
    if (!from) errs.push('Попълнете „От дата".')
    if (!to) errs.push('Попълнете „До дата".')
    if (from && to && from > to) errs.push('„До дата" не може да е преди „От дата".')
    // по образеца: бележка по семейни причини се дава за най-много 5 дни
    if (isParent && from && to && from <= to && calendarDays(from, to) > 5) {
      errs.push('Не може да добавяте бележка за период по-голям от 5 учебни дни.')
    }
    setErrors(errs)
    if (errs.length) return

    if (editing) {
      updateAbsenceNote(editing.id, {
        from, to, text,
        notifiedAt: isParent ? notifiedAt || undefined : undefined,
        issuedAt: isMedical ? issuedAt || undefined : undefined,
        nrnNote: isMedical ? nrnNote || undefined : undefined,
        nrnReview: isMedical ? nrnReview || undefined : undefined,
        doctorUin: isMedical ? doctorUin || undefined : undefined,
        fileName: fileName || undefined,
      })
      onSaved('Бележката е запазена.')
      return
    }

    const stamp = String(Date.now()).slice(-6)
    const items = picked.map((sid, i) => ({
      classId: klass.id,
      studentId: sid,
      kind,
      from,
      to,
      text,
      number: `2600${String(Number(stamp) + i).padStart(6, '0')}`.slice(0, 10),
      authorId: user?.id ?? '',
      notifiedAt: isParent ? notifiedAt || undefined : undefined,
      issuedAt: isMedical ? issuedAt || undefined : undefined,
      nrnNote: isMedical ? nrnNote || undefined : undefined,
      nrnReview: isMedical ? nrnReview || undefined : undefined,
      doctorUin: isMedical ? doctorUin || undefined : undefined,
      fileName: fileName || undefined,
    }))

    const excused = addAbsenceNotesAndExcuse(items)
    onSaved(
      `Добавени ${items.length} ${items.length === 1 ? 'бележка' : 'бележки'}` +
      (excused ? `, уважени ${excused} ${excused === 1 ? 'отсъствие' : 'отсъствия'}.` : '.'),
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#eef1f2]">
      <NoteHeader title={KIND_TITLE[kind]} onBack={onBack} onSave={save} />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <BlueBar>Внимание! Бележката ще бъде автоматично добавена във всички паралелки, в които ученикът е записан!</BlueBar>

        {errors.length > 0 && (
          <div className="mt-2 rounded-[2px] border border-[#f0b8b8] bg-[#fbe9e9] px-3 py-2 text-[12.5px] text-[#a94442]">
            <p className="font-bold">Грешка!</p>
            <ul className="mt-1 list-disc pl-5">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}

        <div className="mt-3 max-w-[760px] space-y-2">
          {/* Ученик — мулти-избор с номера и отметки */}
          <Row label="Ученик:" required>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <button
                  type="button" onClick={() => setOpen((v) => !v)}
                  className="flex w-[268px] items-center justify-between rounded-[2px] border border-[#ccc] bg-white px-2 py-[5px] text-left text-[12.5px] text-[#333] hover:border-[#337ab7]"
                >
                  <span className={`truncate ${picked.length ? '' : 'text-[#999]'}`}>{summary}</span>
                  <Icon name="chevronDown" size={12} className="ml-1 shrink-0 text-[#888]" />
                </button>
                {open && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 top-full z-20 mt-0.5 max-h-[260px] w-[268px] overflow-y-auto rounded-[2px] border border-[#ccc] bg-white shadow-lg">
                      {students.map((s) => {
                        const on = picked.includes(s.id)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggle(s.id)}
                            className={`flex w-full items-center gap-2 px-2 py-[5px] text-left text-[12.5px] hover:bg-[#eef6fb] ${
                              on ? 'bg-[#f2f8fc] font-semibold text-[#337ab7]' : 'text-[#333]'
                            }`}
                          >
                            <span className="w-5 shrink-0 text-right text-[#888]">{s.number}</span>
                            <span className="min-w-0 flex-1 truncate">{shortName(s)}</span>
                            {on && <Icon name="check" size={12} strokeWidth={3} className="shrink-0 text-[#337ab7]" />}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
              {alreadyExcused > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#b8d4ea] bg-[#eaf4fb] px-2 py-1 text-[12px] text-[#337ab7]">
                  <Icon name="calendar" size={12} strokeWidth={2.2} />
                  Извинени дни по семейни причини:
                  <span className="grid h-[15px] w-[15px] place-items-center rounded-full bg-[#337ab7] text-[9px] font-bold text-white">
                    {alreadyExcused}
                  </span>
                  <Icon name="chevron" size={11} />
                </span>
              )}
            </div>
          </Row>

          <Row label="От дата:" required>
            <DateField value={from} onChange={setFrom} />
          </Row>

          <Row label="До дата:" required>
            <DateField value={to} onChange={setTo} />
          </Row>

          {isParent && (
            <Row label="Дата на уведомление:">
              <DateField value={notifiedAt} onChange={setNotifiedAt} />
            </Row>
          )}

          {isMedical && (
            <>
              <Row label="Дата на издаване:">
                <DateField value={issuedAt} onChange={setIssuedAt} />
              </Row>
              <Row label="НРН на бележка:">
                <input
                  value={nrnNote} onChange={(e) => setNrnNote(e.target.value)}
                  className="w-[170px] rounded-[2px] border border-[#ccc] px-2 py-[5px] text-[12.5px] outline-none focus:border-[#337ab7]"
                />
              </Row>
              <Row label="НРН на преглед:">
                <input
                  value={nrnReview} onChange={(e) => setNrnReview(e.target.value)}
                  className="w-[170px] rounded-[2px] border border-[#ccc] px-2 py-[5px] text-[12.5px] outline-none focus:border-[#337ab7]"
                />
              </Row>
              <Row label="УИН на лекар:">
                <input
                  value={doctorUin} onChange={(e) => setDoctorUin(e.target.value)}
                  className="w-[170px] rounded-[2px] border border-[#ccc] px-2 py-[5px] text-[12.5px] outline-none focus:border-[#337ab7]"
                />
              </Row>
            </>
          )}

          <Row label="Бележка:">
            <textarea
              value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Въведете описание"
              rows={3}
              className="w-full max-w-[620px] rounded-[2px] border border-[#ccc] px-2 py-[5px] text-[12.5px] outline-none focus:border-[#337ab7]"
            />
          </Row>

          <Row label="Файл:">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer rounded-[2px] bg-[#26b3a4] px-2.5 py-[5px] text-[12px] font-semibold text-white hover:brightness-105">
                Прикачи файл
                <input
                  type="file" className="hidden"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
                />
              </label>
              <span className="text-[12px] text-[#777]">{fileName || 'Не е избран файл'}</span>
            </div>
          </Row>
        </div>
      </div>
    </div>
  )
}

function Row({ label, required, children }: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-[132px] shrink-0 pt-[5px] text-right text-[12.5px] font-bold text-[#333]">
        {label} {required && <span className="text-[#d9534f]">*</span>}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
