import { useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Badge, Field, Icon, Input, Modal, Select } from '../../components/ui'
import type { Student } from '../../lib/types'
import { STUDENT_DOCS } from '../../lib/seed'
import { DnTable, EmptyRow, FilterButton, StudentCell, TB, Th, Toolbar, dateOnly } from './shared'

/**
 * Раздел „Ученици" — списък на паралелката с личните данни и личното дело.
 * Последните 13 колони са документите от делото: тесни, с дата и с бутон за
 * преглед/редакция, точно както е в референтния дневник.
 */
export function StudentsTab({ classId }: { classId: string }) {
  const { db, isStaff, updateStudent, addStudent, className } = useApp()
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [edit, setEdit] = useState<Student | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [showLeft, setShowLeft] = useState(false)
  const [docEdit, setDocEdit] = useState<{ student: Student; key: string } | null>(null)
  const [ns, setNs] = useState({
    firstName: '', middleName: '', lastName: '', number: 1,
    gender: 'М' as 'М' | 'Ж', birthDate: '2012-01-01',
  })

  const all = db.students.filter((s) => s.classId === classId).sort((a, b) => a.number - b.number)
  const rows = showLeft ? all : all.filter((s) => s.status === 'активен')
  const pickedIds = Object.entries(picked).filter(([, v]) => v).map(([k]) => k)

  const applyToPicked = (patch: Partial<Student>, label: string) => {
    if (!pickedIds.length) return
    if (!window.confirm(`${label} за ${pickedIds.length} ученика?`)) return
    pickedIds.forEach((id) => updateStudent(id, patch))
    setPicked({})
  }

  const parentsOf = (s: Student) =>
    s.parentIds
      .map((id) => db.users.find((u) => u.id === id))
      .filter(Boolean)
      .map((u, i) => `${u!.firstName} ${u!.lastName} (${u!.active ? 'активен' : 'неактивен'})${i === 0 ? ' (основен)' : ''}`)

  const colCount = (isStaff ? 7 : 6) + STUDENT_DOCS.length

  return (
    <>
      <Toolbar>
        {isStaff && (
          <>
            <TB icon="plus" tone="teal" onClick={() => setAddOpen(true)}>Добави</TB>
            <TB icon="swap" tone="blue" disabled={!pickedIds.length}
              onClick={() => window.alert('Преместването се извършва от модул „Администрация → Ученици".')}>
              Премести
            </TB>
            <TB icon="heart" tone="purple" disabled={!pickedIds.length}
              onClick={() => applyToPicked({ sen: true }, 'Отбелязване като СОП')}>
              СОП
            </TB>
            <TB icon="check" tone="blue" disabled={!pickedIds.length}
              onClick={() => applyToPicked({ exemptFromGrades: true }, 'Освобождаване от оценяване')}>
              Осв. от оценки
            </TB>
            <TB icon="lock" tone="teal" disabled={!pickedIds.length}
              onClick={() => applyToPicked({ gradesBlocked: true }, 'Забрана за оценяване')}>
              Забрани оценки
            </TB>
            <TB icon="list" tone="gold" disabled={!pickedIds.length}
              onClick={() => applyToPicked({ mandatorySubjects: true }, 'Утвърждаване на задължителни предмети')}>
              Задължителни
            </TB>
            <TB icon="archive" tone="red" onClick={() => setShowLeft((v) => !v)}>
              {showLeft ? 'Само активни' : 'Заличени'}
            </TB>
          </>
        )}
        <FilterButton />
      </Toolbar>

      <DnTable
        minWidth={1500}
        head={
          <>
            {isStaff && <Th className="w-[36px]" />}
            <Th className="w-[44px]">#</Th>
            <Th className="w-[240px]">Ученик</Th>
            <Th className="w-[130px]">Дата на раждане</Th>
            <Th className="w-[130px]">Място на раждане</Th>
            <Th className="w-[260px]">Родители</Th>
            <Th className="w-[120px]">Личен лекар</Th>
            {STUDENT_DOCS.map((d) => (
              <Th key={d.key} className="w-[68px] text-center">
                <span className="block text-[10px] font-bold text-ink-500" title={d.label}>{d.short}</span>
                <span className="mt-0.5 flex justify-center gap-0.5">
                  <span className="grid h-[15px] w-[15px] place-items-center rounded-[2px] bg-[#eef1f4] text-[9px] font-bold text-ink-500" title={d.label}>i</span>
                  <span className="grid h-[15px] w-[15px] place-items-center rounded-[2px] bg-[#eef1f4] text-ink-500" title={`Редакция: ${d.label}`}>
                    <Icon name="edit" size={9} strokeWidth={2.6} />
                  </span>
                </span>
              </Th>
            ))}
          </>
        }
      >
        {rows.map((s) => {
          const left = s.status !== 'активен'
          const on = !!picked[s.id]
          const parents = parentsOf(s)
          return (
            <tr key={s.id} className={left ? 'bg-[#fde8e8]/70' : on ? 'bg-[#eef7fb]' : 'hover:bg-[#f7fbfd]'}>
              {isStaff && (
                <td className="px-3 py-2">
                  <input
                    type="checkbox" className="h-3.5 w-3.5"
                    checked={on}
                    onChange={(e) => setPicked((p) => ({ ...p, [s.id]: e.target.checked }))}
                  />
                </td>
              )}
              <td className="px-3 py-2 text-[12.5px] font-bold text-ink-400">{s.number}</td>
              <td className="px-3 py-2">
                <StudentCell student={s} showNumber={false} />
                <span className="ml-1.5 inline-flex gap-1">
                  {s.sen && <Badge tone="purple">СОП</Badge>}
                  {s.ifo && <Badge tone="brand">ИФО</Badge>}
                  {s.cdo && <Badge tone="neutral">ЦДО</Badge>}
                  {s.exemptFromGrades && <Badge tone="warn">Осв. оц.</Badge>}
                  {s.gradesBlocked && <Badge tone="danger">Блок. оц.</Badge>}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-1.5">
                  {isStaff ? (
                    <button
                      type="button"
                      onClick={() => setEdit(s)}
                      title="Редакция на личните данни"
                      className="grid h-[17px] w-[17px] place-items-center rounded-[2px] bg-[#eef1f4] text-ink-500 hover:bg-[#3598dc] hover:text-white"
                    >
                      <Icon name="edit" size={10} strokeWidth={2.4} />
                    </button>
                  ) : (
                    <span className="grid h-[17px] w-[17px] place-items-center rounded-[2px] bg-[#eef1f4] text-ink-400">
                      <Icon name="edit" size={10} strokeWidth={2.4} />
                    </span>
                  )}
                  <span className="text-[12.5px] text-ink-700">{dateOnly(s.birthDate)}</span>
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-[12px] text-ink-700">{s.birthPlace ?? '—'}</td>
              <td className="px-3 py-1.5 text-[12px] text-ink-700">
                {parents.length ? (
                  <span className="flex flex-col gap-0.5">
                    {parents.slice(0, 2).map((p) => (
                      <span key={p} className="whitespace-nowrap text-[11.5px] text-ink-700">
                        <Icon name="person" size={10} className="mr-1 inline align-[-1px] text-ink-400" />
                        {p}
                      </span>
                    ))}
                    {parents.length > 2 && <span className="text-[11px] text-ink-400">още {parents.length - 2}</span>}
                  </span>
                ) : (
                  <span className="text-[12px] text-ink-400">няма</span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-[12px] text-ink-700">{s.doctor ?? '—'}</td>
              {STUDENT_DOCS.map((d) => (
                <td key={d.key} className="whitespace-nowrap px-2 py-1.5 text-center">
                  {s.documents?.[d.key] ? (
                    <button
                      type="button"
                      onClick={() => isStaff && setDocEdit({ student: s, key: d.key })}
                      title={`${d.label}: ${dateOnly(s.documents[d.key])}`}
                      className="text-[11.5px] text-ink-700 hover:text-brand-700"
                    >
                      {dateOnly(s.documents[d.key])}
                    </button>
                  ) : (
                    <span className="text-ink-300">—</span>
                  )}
                </td>
              ))}
            </tr>
          )
        })}
        {rows.length === 0 && (
          <EmptyRow colSpan={colCount} text={showLeft ? 'Няма ученици в паралелката.' : 'Няма активни ученици.'} />
        )}
      </DnTable>

      <p className="mt-3 text-[11.5px] text-ink-500">
        Лично дело: {STUDENT_DOCS.map((d) => `${d.short} — ${d.label}`).join(' · ')}
      </p>

      {/* ── Профил на ученик ── */}
      <Modal
        open={!!edit} onClose={() => setEdit(null)} wide title="Профил на ученик"
        footer={<button onClick={() => setEdit(null)} className="btn-primary">Готово</button>}
      >
        {edit && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Име"><Input defaultValue={edit.firstName} onBlur={(e) => updateStudent(edit.id, { firstName: e.target.value })} /></Field>
            <Field label="Презиме"><Input defaultValue={edit.middleName} onBlur={(e) => updateStudent(edit.id, { middleName: e.target.value })} /></Field>
            <Field label="Фамилия"><Input defaultValue={edit.lastName} onBlur={(e) => updateStudent(edit.id, { lastName: e.target.value })} /></Field>
            <Field label="Пореден номер"><Input type="number" defaultValue={edit.number} onBlur={(e) => updateStudent(edit.id, { number: Number(e.target.value) })} /></Field>
            <Field label="ЕГН"><Input defaultValue={edit.egn} onBlur={(e) => updateStudent(edit.id, { egn: e.target.value })} /></Field>
            <Field label="Дата на раждане"><Input type="date" defaultValue={edit.birthDate} onBlur={(e) => updateStudent(edit.id, { birthDate: e.target.value })} /></Field>
            <Field label="Място на раждане"><Input defaultValue={edit.birthPlace ?? ''} onBlur={(e) => updateStudent(edit.id, { birthPlace: e.target.value })} /></Field>
            <Field label="Личен лекар"><Input defaultValue={edit.doctor ?? ''} onBlur={(e) => updateStudent(edit.id, { doctor: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Field label="Адрес"><Input defaultValue={edit.address} onBlur={(e) => updateStudent(edit.id, { address: e.target.value })} /></Field>
            </div>
            <Field label="Телефон"><Input defaultValue={edit.phone} onBlur={(e) => updateStudent(edit.id, { phone: e.target.value })} /></Field>
            <Field label="Дата на приемане"><Input type="date" defaultValue={edit.admittedAt} onBlur={(e) => updateStudent(edit.id, { admittedAt: e.target.value })} /></Field>
            <Field label="Статус">
              <Select defaultValue={edit.status} onChange={(e) => updateStudent(edit.id, { status: e.target.value as Student['status'] })}>
                <option>активен</option><option>преместен</option><option>отписан</option><option>завършил</option>
              </Select>
            </Field>
            <Field label="СОП">
              <Select defaultValue={edit.sen ? 'да' : 'не'} onChange={(e) => updateStudent(edit.id, { sen: e.target.value === 'да' })}>
                <option value="не">Не</option><option value="да">Да</option>
              </Select>
            </Field>
            {edit.senNote && (
              <div className="sm:col-span-2">
                <Field label="Бележка СОП"><Input defaultValue={edit.senNote} onBlur={(e) => updateStudent(edit.id, { senNote: e.target.value })} /></Field>
              </div>
            )}
            <div className="sm:col-span-2">
              <p className="label">Лично дело</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {STUDENT_DOCS.map((d) => (
                  <label key={d.key} className="block">
                    <span className="mb-1 block text-[11.5px] font-semibold text-ink-600">{d.label}</span>
                    <Input
                      type="date"
                      defaultValue={edit.documents?.[d.key] ?? ''}
                      onBlur={(e) => updateStudent(edit.id, {
                        documents: { ...(edit.documents ?? {}), [d.key]: e.target.value },
                      })}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Редакция на един документ ── */}
      <Modal
        open={!!docEdit}
        onClose={() => setDocEdit(null)}
        title="Документ от личното дело"
        footer={
          <>
            <button onClick={() => setDocEdit(null)} className="btn-ghost">Затвори</button>
            <button
              className="btn-danger mr-auto"
              onClick={() => {
                if (!docEdit) return
                const next = { ...(docEdit.student.documents ?? {}) }
                delete next[docEdit.key]
                updateStudent(docEdit.student.id, { documents: next })
                setDocEdit(null)
              }}
            >
              Изтрий датата
            </button>
          </>
        }
      >
        {docEdit && (
          <div className="grid gap-3">
            <p className="text-[13px] text-ink-600">
              <b>{STUDENT_DOCS.find((d) => d.key === docEdit.key)?.label}</b> —{' '}
              {docEdit.student.firstName} {docEdit.student.lastName}
            </p>
            <Field label="Дата на получаване">
              <Input
                type="date"
                defaultValue={docEdit.student.documents?.[docEdit.key] ?? ''}
                onChange={(e) => updateStudent(docEdit.student.id, {
                  documents: { ...(docEdit.student.documents ?? {}), [docEdit.key]: e.target.value },
                })}
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* ── Нов ученик ── */}
      <Modal
        open={addOpen} onClose={() => setAddOpen(false)} title="Нов ученик"
        footer={
          <>
            <button onClick={() => setAddOpen(false)} className="btn-ghost">Отказ</button>
            <button
              className="btn-primary"
              onClick={() => {
                addStudent({
                  ...ns, egn: '', classId, address: '', phone: '', email: '',
                  status: 'активен', sen: false, admittedAt: new Date().toISOString().slice(0, 10),
                } as Omit<Student, 'id' | 'parentIds'>)
                setAddOpen(false)
              }}
            >
              Добави
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Име"><Input value={ns.firstName} onChange={(e) => setNs({ ...ns, firstName: e.target.value })} /></Field>
          <Field label="Презиме"><Input value={ns.middleName} onChange={(e) => setNs({ ...ns, middleName: e.target.value })} /></Field>
          <Field label="Фамилия"><Input value={ns.lastName} onChange={(e) => setNs({ ...ns, lastName: e.target.value })} /></Field>
          <Field label="Пореден номер"><Input type="number" value={ns.number} onChange={(e) => setNs({ ...ns, number: Number(e.target.value) })} /></Field>
          <Field label="Пол">
            <Select value={ns.gender} onChange={(e) => setNs({ ...ns, gender: e.target.value as 'М' | 'Ж' })}>
              <option value="М">Момче</option><option value="Ж">Момиче</option>
            </Select>
          </Field>
          <Field label="Дата на раждане"><Input type="date" value={ns.birthDate} onChange={(e) => setNs({ ...ns, birthDate: e.target.value })} /></Field>
        </div>
        <p className="mt-3 text-xs text-ink-400">Ученикът ще бъде добавен в {className(classId)}.</p>
      </Modal>
    </>
  )
}
