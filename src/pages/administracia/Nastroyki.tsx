import { useState } from 'react'
import { useApp } from '../../store/AppContext'
import { Icon, PageHeader, Table, formatDate } from '../../components/ui'
import { Toggle } from '../dnevnik/forms'
import { AInput, Dash, EmptyRow, FormRow, ListHead, SquareAction, ToolBtn, Toolbar } from './shared'

/** „Училище" — данните и настройките на училището. */
export function Uchilishte() {
  const { db, update } = useApp()
  const s = db.school

  return (
    <>
      <PageHeader title="Училище" subtitle="Данни за училището, срокове и настройки на дневника." icon="school" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-[#d7dee4] bg-white p-4">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#3d4a56]">
            <Icon name="school" size={14} /> Данни за училището
          </p>
          <FormRow label="Наименование">
            <AInput defaultValue={s.name} onBlur={(e) => update((d) => { d.school.name = e.target.value })} />
          </FormRow>
          <FormRow label="Град">
            <AInput defaultValue={s.city} onBlur={(e) => update((d) => { d.school.city = e.target.value })} />
          </FormRow>
          <FormRow label="Адрес">
            <AInput defaultValue={s.address} onBlur={(e) => update((d) => { d.school.address = e.target.value })} />
          </FormRow>
          <FormRow label="Директор">
            <AInput defaultValue={s.principal} onBlur={(e) => update((d) => { d.school.principal = e.target.value })} />
          </FormRow>
          <FormRow label="Телефон">
            <AInput defaultValue={s.phone} onBlur={(e) => update((d) => { d.school.phone = e.target.value })} />
          </FormRow>
          <FormRow label="Имейл">
            <AInput defaultValue={s.email} onBlur={(e) => update((d) => { d.school.email = e.target.value })} />
          </FormRow>
          <FormRow label="Уебсайт">
            <AInput defaultValue={s.website} onBlur={(e) => update((d) => { d.school.website = e.target.value })} />
          </FormRow>
        </div>

        <div className="space-y-4">
          <div className="rounded border border-[#d7dee4] bg-white p-4">
            <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#3d4a56]">
              <Icon name="settings" size={14} /> Настройки на дневника
            </p>
            <div className="space-y-2.5">
              <label className="flex items-center justify-between rounded-[3px] border border-[#e4e9ee] px-3 py-2">
                <span className="text-[12.5px] text-ink-700">Стриктен режим (заключване на минали дати)</span>
                <Toggle on={s.strictMode} onChange={(v) => update((d) => { d.school.strictMode = v })} />
              </label>
              <label className="flex items-center justify-between rounded-[3px] border border-[#e4e9ee] px-3 py-2">
                <span className="text-[12.5px] text-ink-700">Автоматично уважаване на отсъствия</span>
                <Toggle on={s.autoExcuse} onChange={(v) => update((d) => { d.school.autoExcuse = v })} />
              </label>
              <div className="flex items-center justify-between rounded-[3px] border border-[#e4e9ee] px-3 py-2">
                <span className="text-[12.5px] text-ink-700">Дневникът е заключен до</span>
                <AInput
                  type="date"
                  defaultValue={s.diaryLockedUntil ?? ''}
                  onChange={(e) => update((d) => { d.school.diaryLockedUntil = e.target.value || null })}
                  className="!w-[150px] !py-1 !text-[12px]"
                />
              </div>
            </div>
          </div>

          <div className="rounded border border-[#d7dee4] bg-white p-4">
            <p className="mb-2 text-[13px] font-bold text-[#3d4a56]">Резервно копие</p>
            <p className="mb-3 text-[12px] text-ink-500">
              Демонстрационните данни са премахнати — в базата остават само профилите и паралелките,
              създадени от вас. Архив на предишното състояние се пази във файл в папката на проекта.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

/** „Учебни срокове" — начало и край на двата срока и учебната година. */
export function Srokove() {
  const { db, update } = useApp()
  const s = db.school

  return (
    <>
      <PageHeader title="Учебни срокове" subtitle="Датите на двата срока и текущата учебна година." icon="calendar" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-[#d7dee4] bg-white p-4">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#3d4a56]">
            <Icon name="calendar" size={14} /> Първи срок
          </p>
          <FormRow label="От">
            <AInput type="date" defaultValue={s.term1.from} onChange={(e) => update((d) => { d.school.term1.from = e.target.value })} />
          </FormRow>
          <FormRow label="До">
            <AInput type="date" defaultValue={s.term1.to} onChange={(e) => update((d) => { d.school.term1.to = e.target.value })} />
          </FormRow>
        </div>

        <div className="rounded border border-[#d7dee4] bg-white p-4">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#3d4a56]">
            <Icon name="calendar" size={14} /> Втори срок
          </p>
          <FormRow label="От">
            <AInput type="date" defaultValue={s.term2.from} onChange={(e) => update((d) => { d.school.term2.from = e.target.value })} />
          </FormRow>
          <FormRow label="До">
            <AInput type="date" defaultValue={s.term2.to} onChange={(e) => update((d) => { d.school.term2.to = e.target.value })} />
          </FormRow>
        </div>
      </div>

      <div className="mt-4 rounded border border-[#d7dee4] bg-white p-4">
        <FormRow label="Учебна година">
          <AInput defaultValue={s.year} onChange={(e) => update((d) => { d.school.year = e.target.value })} className="!w-[160px]" />
        </FormRow>
        <p className="ml-[222px] text-[12px] text-ink-500">
          Първи срок: {formatDate(s.term1.from)} – {formatDate(s.term1.to)} · Втори срок: {formatDate(s.term2.from)} – {formatDate(s.term2.to)}
        </p>
      </div>
    </>
  )
}

/** „Неучебни дни" — датите, в които няма учебни занятия. */
export function Neuchebni() {
  const { db, update } = useApp()
  const [date, setDate] = useState('')

  const add = () => {
    if (!date) return
    update((d) => { d.school.nonSchoolDays = [...new Set([...d.school.nonSchoolDays, date])].sort() })
    setDate('')
  }

  return (
    <>
      <PageHeader title="Неучебни дни" subtitle="Празници и ваканции — не се броят за учебни дни и не влизат в отсъствията." icon="ban" />

      <ListHead icon="ban" title="Неучебни дни" count={db.school.nonSchoolDays.length} />

      <Toolbar>
        <div className="flex items-center gap-1.5">
          <AInput type="date" value={date} onChange={(e) => setDate(e.target.value)} className="!w-[160px]" />
          <ToolBtn tone="green" icon="plus" onClick={add}>Добави</ToolBtn>
        </div>
      </Toolbar>

      <Table
        head={
          <>
            <th className="th w-16">#</th>
            <th className="th">Дата</th>
            <th className="th w-24">Операции</th>
          </>
        }
      >
        {db.school.nonSchoolDays.map((d, i) => (
          <tr key={d} className="hover:bg-[#f6fafd]">
            <td className="td text-ink-500">{i + 1}</td>
            <td className="td font-medium">{formatDate(d)}</td>
            <td className="td">
              <SquareAction
                tone="red"
                icon="close"
                title="Изтриване"
                onClick={() => update((x) => { x.school.nonSchoolDays = x.school.nonSchoolDays.filter((y) => y !== d) })}
              />
            </td>
          </tr>
        ))}
        {!db.school.nonSchoolDays.length && <EmptyRow colSpan={3} text="Няма въведени неучебни дни." />}
      </Table>
    </>
  )
}

/** „Образец №1" — справката по паралелки за началото на учебната година. */
export function Obrazec1() {
  const { db } = useApp()

  const rows = db.classes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'bg'))
    .map((k) => {
      const students = db.students.filter((s) => s.classId === k.id && s.status === 'активен')
      const girls = students.filter((s) => s.gender === 'Ж').length
      const boys = students.length - girls
      const grades = db.grades.filter((g) => g.classId === k.id && !g.draft)
      const avg = grades.length ? grades.reduce((a, g) => a + g.value, 0) / grades.length : null
      const absences = db.absences.filter((a) => a.classId === k.id).length
      return { k, total: students.length, girls, boys, avg, absences }
    })

  const total = rows.reduce((a, r) => a + r.total, 0)

  return (
    <>
      <PageHeader
        title="Образец №1"
        subtitle="Справка за броя на учениците, успеха и отсъствията по паралелки."
        icon="report"
      />

      <ListHead icon="report" title={`Образец №1 · учебна ${db.school.year}`} count={total} />

      <Toolbar>
        <ToolBtn tone="blue" icon="print">Печат</ToolBtn>
        <ToolBtn tone="green" icon="download">Excel</ToolBtn>
      </Toolbar>

      <Table
        head={
          <>
            <th className="th">Паралелка</th>
            <th className="th w-28">Ученици</th>
            <th className="th w-24">Момичета</th>
            <th className="th w-24">Момчета</th>
            <th className="th w-28">Среден успех</th>
            <th className="th w-28">Отсъствия</th>
            <th className="th">Класен ръководител</th>
          </>
        }
      >
        {rows.map((r) => {
          const homeroom = db.users.find((u) => u.id === r.k.homeroomTeacherId)
          return (
            <tr key={r.k.id} className="hover:bg-[#f6fafd]">
              <td className="td font-semibold">{r.k.name}</td>
              <td className="td"><span className="dn-num dn-olive">{r.total}</span></td>
              <td className="td">{r.girls}</td>
              <td className="td">{r.boys}</td>
              <td className="td">{r.avg === null ? <Dash /> : r.avg.toFixed(2).replace('.', ',')}</td>
              <td className="td">{r.absences}</td>
              <td className="td text-[12.5px]"><Dash>{homeroom ? `${homeroom.firstName} ${homeroom.lastName}` : undefined}</Dash></td>
            </tr>
          )
        })}
        {!rows.length && <EmptyRow colSpan={7} text="Няма паралелки." />}
      </Table>

      <p className="mt-3 text-[11.5px] text-ink-400">
        Общо ученици: <b>{total}</b> · паралелки: <b>{rows.length}</b> · учебна година: <b>{db.school.year}</b>
      </p>
    </>
  )
}
