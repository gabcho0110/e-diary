import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, Input, PageHeader, Select, Stat, Table } from '../components/ui'

const STEPS = [
  { id: 1, name: 'Данни', desc: 'Учебна година, срокове, брой часове и дневен режим.' },
  { id: 2, name: 'Паралелки', desc: 'Натоварване по паралелки и предмети, максимални часове на ден.' },
  { id: 3, name: 'Групи', desc: 'Разделяне на паралелки на групи за профилирана подготовка.' },
  { id: 4, name: 'Режими', desc: 'Четна/нечетна седмица, слети класове, различен дневен режим.' },
  { id: 5, name: 'Стаи', desc: 'Наличие на кабинети, лаборатории и спортни зали.' },
  { id: 6, name: 'Учители', desc: 'Натоварване, недостъпни дни и максимални часове.' },
  { id: 7, name: 'Ограничения', desc: 'Твърди и меки ограничения преди генериране.' },
]

export default function Generator() {
  const { db, className, subjectName } = useApp()
  const [step, setStep] = useState(1)
  const [generated, setGenerated] = useState(false)
  const [validating, setValidating] = useState(false)

  const current = STEPS[step - 1]
  const totalPeriods = db.schedule.length
  const teacherLoad = db.users
    .filter((u) => u.roles.some((r) => ['teacher', 'class_teacher'].includes(r)))
    .map((t) => ({
      t,
      hours: db.schedule.filter((s) => s.teacherId === t.id).length,
      classes: db.schedule.filter((s) => s.teacherId === t.id).map((s) => s.classId).filter((v, i, a) => a.indexOf(v) === i).length,
    }))
    .sort((a, b) => b.hours - a.hours)

  const roomLoad = db.rooms.map((r) => ({
    r,
    used: db.schedule.filter((s) => s.roomId === r.id).length,
  })).sort((a, b) => b.used - a.used).slice(0, 10)

  return (
    <>
      <PageHeader
        title="Генератор на седмични разписания"
        subtitle="Седем стъпки — от данни до валидирано седмично разписание."
        icon="grid"
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setValidating(true)} className="btn-ghost"><Icon name="check" size={15} /> Валидации</button>
            <button onClick={() => setGenerated(true)} className="btn-primary"><Icon name="spark" size={15} /> Генерирай</button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Паралелки" value={db.classes.length} icon="grid" />
        <Stat label="Учители" value={teacherLoad.length} icon="person" tone="brand" />
        <Stat label="Заети часове" value={totalPeriods} icon="clock" tone="ok" />
        <Stat label="Помещения" value={db.rooms.length} icon="building" tone="purple" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <Card pad={false}>
          <div className="border-b border-ink-200 px-5 py-3.5"><h2 className="font-bold text-ink-900">Стъпки</h2></div>
          <ul className="p-2">
            {STEPS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setStep(s.id)}
                  className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition ${
                    step === s.id ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-bold ${
                    step === s.id ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'
                  }`}>
                    {s.id}
                  </span>
                  <span className="truncate">{s.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-ink-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink-900">Стъпка {current.id} — „{current.name}“</h2>
              <p className="text-[13px] text-ink-500">{current.desc}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button disabled={step === 1} onClick={() => setStep(step - 1)} className="btn-ghost !py-1.5 text-[12px]">Назад</button>
              <button disabled={step === 7} onClick={() => setStep(step + 1)} className="btn-ghost !py-1.5 text-[12px]">Напред</button>
            </div>
          </div>

          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Учебна година"><Input defaultValue={db.school.year} readOnly /></Field>
              <Field label="Брой учебни седмици"><Input type="number" defaultValue={34} /></Field>
              <Field label="Часове на ден (5–7 клас)"><Input type="number" defaultValue={6} /></Field>
              <Field label="Часове на ден (8–12 клас)"><Input type="number" defaultValue={7} /></Field>
              <div className="sm:col-span-2">
                <Field label="Дневен режим">
                  <Select defaultValue="първа смяна">
                    <option>първа смяна</option><option>втора смяна</option><option>смесен режим</option>
                  </Select>
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <Table head={<><th className="th">Паралелка</th><th className="th">Профил</th><th className="th w-24">Предмети</th><th className="th w-28">Часове/седм.</th><th className="th w-28">Класен</th></>}>
              {db.classes.map((k) => (
                <tr key={k.id} className="hover:bg-ink-50/60">
                  <td className="td font-bold">{k.name}</td>
                  <td className="td text-[13px] text-ink-600">{k.profile || '—'}</td>
                  <td className="td">{k.subjectIds.length}</td>
                  <td className="td">{db.schedule.filter((s) => s.classId === k.id).length}</td>
                  <td className="td text-[13px]">{db.users.find((u) => u.id === k.homeroomTeacherId)?.lastName ?? '—'}</td>
                </tr>
              ))}
            </Table>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {db.classes.filter((k) => k.grade >= 8).slice(0, 6).map((k) => (
                <div key={k.id} className="rounded-lg border border-ink-200 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold text-ink-900">{k.name}</p>
                    <Badge tone="brand">{k.subjectIds.length} предмета</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {k.subjectIds.map((sid) => (
                      <span key={sid} className="rounded-md bg-ink-100 px-2 py-1 text-[11px] text-ink-600">{subjectName(sid)}</span>
                    ))}
                  </div>
                  <button className="btn-ghost mt-3 !py-1.5 text-[12px]"><Icon name="plus" size={13} /> Раздели на групи</button>
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              {[
                ['Четна / нечетна седмица', 'Разписанието се различава в четни и нечетни седмици.'],
                ['Слети класове', 'Паралелка със слети класове (малки училища).'],
                ['Различен дневен режим', 'Дни с различен брой часове.'],
              ].map(([t, d]) => (
                <label key={t} className="flex items-start gap-3 rounded-lg border border-ink-200 px-4 py-3">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 rounded" />
                  <span>
                    <span className="block text-[13px] font-semibold text-ink-800">{t}</span>
                    <span className="block text-[12px] text-ink-500">{d}</span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {step === 5 && (
            <Table head={<><th className="th">Помещение</th><th className="th w-24">Етаж</th><th className="th w-40">Вид</th><th className="th w-24">Капацитет</th><th className="th w-28">Заети часове</th></>}>
              {roomLoad.map(({ r, used }) => (
                <tr key={r.id} className="hover:bg-ink-50/60">
                  <td className="td font-medium">{r.name}</td>
                  <td className="td">{r.floor}</td>
                  <td className="td"><Badge tone="neutral">{r.kind}</Badge></td>
                  <td className="td">{r.capacity}</td>
                  <td className="td">{used}</td>
                </tr>
              ))}
            </Table>
          )}

          {step === 6 && (
            <Table head={<><th className="th">Учител</th><th className="th">Предмети</th><th className="th w-24">Паралелки</th><th className="th w-28">Часове/седм.</th><th className="th w-32">Натоварване</th></>}>
              {teacherLoad.map(({ t, hours, classes }) => (
                <tr key={t.id} className="hover:bg-ink-50/60">
                  <td className="td font-medium">{t.firstName} {t.lastName}</td>
                  <td className="td text-[12px] text-ink-500">
                    {(t.subjectIds ?? []).map((s) => db.subjects.find((x) => x.id === s)?.short).join(', ') || '—'}
                  </td>
                  <td className="td">{classes}</td>
                  <td className="td">{hours}</td>
                  <td className="td">
                    <Badge tone={hours > 24 ? 'danger' : hours > 18 ? 'warn' : 'ok'}>
                      {hours > 24 ? 'претоварен' : hours > 18 ? 'нормално' : 'под нормата'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </Table>
          )}

          {step === 7 && (
            <div className="space-y-2">
              {[
                ['Учител не може да води два часа едновременно', 'твърдо', true],
                ['Паралелка не може да има два часа едновременно', 'твърдо', true],
                ['Кабинет не може да се използва от две паралелки', 'твърдо', true],
                ['ФВС се провежда само в спортна зала', 'твърдо', true],
                ['Контролна работа — не повече от една на ден', 'меко', true],
                ['Тежък предмет — не след 6-и час', 'меко', false],
                ['Равномерно разпределение през седмицата', 'меко', true],
              ].map(([t, kind, on]) => (
                <label key={t as string} className="flex items-center gap-3 rounded-lg border border-ink-200 px-4 py-2.5">
                  <input type="checkbox" defaultChecked={on as boolean} className="h-4 w-4 rounded" />
                  <span className="flex-1 text-[13px] text-ink-700">{t as string}</span>
                  <Badge tone={kind === 'твърдо' ? 'danger' : 'warn'}>{kind as string}</Badge>
                </label>
              ))}
            </div>
          )}

          {(generated || validating) && (
            <div className="mt-5">
              {validating ? (
                <div className="rounded-lg border border-[#f3d9b5] bg-[#fdf7ee] px-4 py-3 text-[13px] text-[#8a5a12]">
                  <b>Валидации:</b> 3 предупреждения — 2 учители са с над 24 часа седмично натоварване;
                  1 паралелка има 3 контролни работи в един ден. Разписанието може да бъде генерирано, но се
                  препоръчва преразпределение.
                </div>
              ) : (
                <div className="rounded-lg border border-[#bfe3cb] bg-[#eefaf1] px-4 py-3 text-[13px] text-[#1f7a45]">
                  <b>Готово.</b> Разписанието е генерирано за {db.classes.length} паралелки и {totalPeriods} часа.
                  Може да го редактирате ръчно в модул „Дневник“ → таб „Разписание“.
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {db.schedule.length === 0 && <EmptyState title="Няма данни за разписание" icon="grid" />}
    </>
  )
}
