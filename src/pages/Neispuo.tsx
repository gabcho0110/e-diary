import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, Input, PageHeader, Select, Stat, Table, Tabs, formatDate } from '../components/ui'

export default function Neispuo() {
  const { db, update, className } = useApp()
  const [tab, setTab] = useState('sync')
  const [running, setRunning] = useState(false)

  const logs = db.syncLogs
  const success = logs.filter((l) => l.status === 'успех').length
  const errors = logs.filter((l) => l.status === 'грешка').length

  const run = (direction: 'качване' | 'сваляне', entity: string, count: number) => {
    setRunning(true)
    setTimeout(() => {
      update((d) => {
        d.syncLogs.unshift({
          id: `syn_${Date.now()}`, direction, entity, count,
          date: new Date().toISOString().slice(0, 10), status: 'успех',
          message: `Успешно ${direction === 'качване' ? 'качени' : 'свалени'} ${count} записа.`,
        })
      })
      setRunning(false)
    }, 900)
  }

  return (
    <>
      <PageHeader
        title="Интеграция с НЕИСПУО"
        subtitle="Синхронизиране на паралелки и групи и качване на дневници, оценки и отсъствия."
        icon="sync"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              disabled={running}
              onClick={() => run('сваляне', 'Паралелки и групи', db.classes.length)}
              className="btn-ghost"
            >
              <Icon name="download" size={15} /> {running ? 'Синхронизиране…' : 'Свали от НЕИСПУО'}
            </button>
            <button
              disabled={running}
              onClick={() => run('качване', 'Оценки и отсъствия', db.grades.length + db.absences.length)}
              className="btn-primary"
            >
              <Icon name="upload" size={15} /> {running ? 'Качване…' : 'Качи дневник в НЕИСПУО'}
            </button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Синхронизации" value={logs.length} icon="sync" />
        <Stat label="Успешни" value={success} icon="check" tone="ok" />
        <Stat label="С грешка" value={errors} icon="warn" tone="danger" />
        <Stat label="Записи в дневника" value={db.grades.length + db.absences.length} icon="list" tone="brand" />
      </div>

      <Tabs
        tabs={[
          { id: 'sync', label: 'Синхронизация' },
          { id: 'logs', label: 'Дневник на синхронизациите', count: logs.length },
          { id: 'groups', label: 'Групи и паралелки' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'sync' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 font-bold text-ink-900">Сваляне от НЕИСПУО</h2>
            <p className="mb-4 text-[13px] text-ink-500">
              Изтеглят се актуалните паралелки, групи, предмети и списъци на учениците от Националната
              електронна информационна система за предучилищното и училищното образование.
            </p>
            <div className="space-y-2">
              {[
                ['Паралелки и класове', db.classes.length],
                ['Ученици', db.students.length],
                ['Предмети', db.subjects.length],
                ['Учители', db.users.filter((u) => u.roles.some((r) => ['teacher', 'class_teacher'].includes(r))).length],
              ].map(([label, n]) => (
                <div key={label as string} className="flex items-center justify-between rounded-lg border border-ink-200 px-4 py-2.5">
                  <span className="text-[13px] font-medium text-ink-700">{label as string}</span>
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">{n as number} записа</Badge>
                    <button onClick={() => run('сваляне', label as string, n as number)} className="text-[12px] font-semibold text-brand-700 hover:underline">
                      Свали
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold text-ink-900">Качване в НЕИСПУО</h2>
            <p className="mb-4 text-[13px] text-ink-500">
              Качват се оценките, отсъствията и справките за избрания период. Препоръчва се качване след
              приключване на срока.
            </p>
            <div className="space-y-3">
              <Field label="Период">
                <Select defaultValue="term1">
                  <option value="term1">Първи срок</option>
                  <option value="term2">Втори срок</option>
                  <option value="year">Цялата учебна година</option>
                </Select>
              </Field>
              <Field label="Паралелка">
                <Select defaultValue="all">
                  <option value="all">Всички паралелки</option>
                  {db.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <div className="space-y-2">
                {[
                  ['Оценки', db.grades.length],
                  ['Отсъствия', db.absences.length],
                  ['Ученици в СФО', 4],
                  ['Оценки от минали години', 0],
                ].map(([label, n]) => (
                  <div key={label as string} className="flex items-center justify-between rounded-lg border border-ink-200 px-4 py-2.5">
                    <span className="text-[13px] font-medium text-ink-700">{label as string}</span>
                    <div className="flex items-center gap-2">
                      <Badge tone="brand">{n as number}</Badge>
                      <button onClick={() => run('качване', label as string, n as number)} className="text-[12px] font-semibold text-brand-700 hover:underline">
                        Качи
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'logs' && (
        <>
          {logs.length === 0 ? (
            <EmptyState title="Няма синхронизации" text="Все още не е извършвана синхронизация с НЕИСПУО." icon="sync" />
          ) : (
            <Table head={<><th className="th w-32">Посока</th><th className="th">Обект</th><th className="th w-24">Записи</th><th className="th w-28">Дата</th><th className="th w-28">Резултат</th><th className="th">Съобщение</th></>}>
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-ink-50/60">
                  <td className="td">
                    <Badge tone={l.direction === 'качване' ? 'brand' : 'neutral'}>{l.direction}</Badge>
                  </td>
                  <td className="td font-medium">{l.entity}</td>
                  <td className="td">{l.count}</td>
                  <td className="td text-[12px] text-ink-500">{formatDate(l.date)}</td>
                  <td className="td">
                    <Badge tone={l.status === 'успех' ? 'ok' : 'danger'}>{l.status}</Badge>
                  </td>
                  <td className="td text-[13px] text-ink-600">{l.message}</td>
                </tr>
              ))}
            </Table>
          )}
        </>
      )}

      {tab === 'groups' && (
        <Table head={<><th className="th">Паралелка</th><th className="th">Профил</th><th className="th w-24">Ученици</th><th className="th w-28">Синхронизирана</th><th className="th w-32">Състояние</th></>}>
          {db.classes.map((k) => (
            <tr key={k.id} className="hover:bg-ink-50/60">
              <td className="td font-bold">{k.name}</td>
              <td className="td text-[13px] text-ink-600">{k.profile || '—'}</td>
              <td className="td">{k.studentIds.length}</td>
              <td className="td text-[12px] text-ink-500">{formatDate(db.school.term1.from)}</td>
              <td className="td"><Badge tone="ok">синхронизирана</Badge></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  )
}
