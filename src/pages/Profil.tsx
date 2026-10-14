import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { ROLE_MAP, roleNames } from '../lib/roles'
import { MODULES } from '../lib/modules'
import { Avatar, Badge, Card, Field, Icon, Input, Modal, PageHeader, Select, Stat, Table, Tabs, formatDate } from '../components/ui'

export default function Profil() {
  const { db, user, update, updateUser, logout, mode, myChildren, myStudent, className, myModules } = useApp()
  const [tab, setTab] = useState('personal')
  const [openChild, setOpenChild] = useState(false)

  if (!user) return null

  const children = myChildren.length ? myChildren : myStudent ? [myStudent] : []

  const [childForm, setChildForm] = useState({ firstName: '', lastName: '', classId: db.classes[0]?.id ?? '' })

  const settings = [
    ['Показвай статистики и класации', true],
    ['Черно-бял дневник', false],
    ['Дневен бюлетин по имейл', true],
    ['Известия за нови съобщения', true],
    ['Известия за нови оценки', true],
    ['Известия за отсъствия', true],
  ]

  return (
    <>
      <PageHeader
        title="Профил"
        subtitle="Лични данни, парола, двуфакторна автентикация, деца, училища и настройки на дневника."
        icon="person"
        actions={<button onClick={logout} className="btn-ghost"><Icon name="logout" size={15} /> Изход</button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Роли" value={user.roles.length} icon="badge" hint={roleNames(user.roles)} />
        <Stat label="Достъпни модула" value={myModules.length} icon="grid" tone="brand" />
        <Stat label="Деца" value={children.length} icon="person" tone="ok" />
        <Stat label="2FA" value={user.twoFactor ? 'включена' : 'изключена'} icon="lock" tone={user.twoFactor ? 'ok' : 'warn'} />
      </div>

      <Tabs
        tabs={[
          { id: 'personal', label: 'Лични данни' },
          { id: 'security', label: 'Сигурност' },
          { id: 'children', label: 'Деца', count: children.length },
          { id: 'settings', label: 'Настройки' },
          { id: 'modules', label: 'Моите модули', count: myModules.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'personal' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <Card>
            <div className="mb-5 flex items-center gap-4">
              <Avatar name={`${user.firstName} ${user.lastName}`} size={64} />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-ink-900">{user.firstName} {user.middleName} {user.lastName}</p>
                <p className="truncate text-[13px] text-ink-500">{ROLE_MAP[user.roles[0]]?.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {user.roles.map((r) => <Badge key={r} tone="brand">{ROLE_MAP[r]?.name}</Badge>)}
                </div>
              </div>
            </div>
            <button onClick={() => alert('Изберете файл за профилна снимка (JPG или PNG, до 2 MB).')} className="btn-ghost w-full">
              <Icon name="upload" size={15} /> Смени профилната снимка
            </button>
            <div className="mt-3">
              <Field label="Потребителско име">
                <Input defaultValue={user.username} onBlur={(e) => updateUser(user.id, { username: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold text-ink-900">Данни за контакт</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Име">
                <Input defaultValue={user.firstName} onBlur={(e) => updateUser(user.id, { firstName: e.target.value })} />
              </Field>
              <Field label="Презиме">
                <Input defaultValue={user.middleName} onBlur={(e) => updateUser(user.id, { middleName: e.target.value })} />
              </Field>
              <Field label="Фамилия">
                <Input defaultValue={user.lastName} onBlur={(e) => updateUser(user.id, { lastName: e.target.value })} />
              </Field>
              <Field label="Имейл">
                <Input defaultValue={user.email} onBlur={(e) => updateUser(user.id, { email: e.target.value })} />
              </Field>
              <Field label="Телефон">
                <Input defaultValue={user.phone} onBlur={(e) => updateUser(user.id, { phone: e.target.value })} />
              </Field>
              <Field label="Регистриран на">
                <Input defaultValue={formatDate(user.createdAt)} readOnly />
              </Field>
            </div>

            {user.subjectIds?.length ? (
              <div className="mt-4">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-500">Преподавани предмети</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.subjectIds.map((s) => (
                    <Badge key={s} tone="neutral">{db.subjects.find((x) => x.id === s)?.name}</Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {user.homeroomId && (
              <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-[13px] text-brand-900">
                Класен ръководител на <b>{className(user.homeroomId)}</b>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'security' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 font-bold text-ink-900">Смяна на парола</h2>
            <div className="grid gap-3">
              <Field label="Текуща парола"><Input type="password" placeholder="••••••••" /></Field>
              <Field label="Нова парола" hint="Минимум 6 символа, с цифра и буква."><Input type="password" /></Field>
              <Field label="Повторете новата парола"><Input type="password" /></Field>
            </div>
            <button
              onClick={() => {
                const np = prompt('Нова парола:')
                if (np && np.length >= 6) updateUser(user.id, { password: np })
              }}
              className="btn-primary mt-4 w-full"
            >
              Смени паролата
            </button>
          </Card>

          <div className="space-y-5">
            <Card>
              <h2 className="mb-3 font-bold text-ink-900">Двуфакторна автентикация (2FA)</h2>
              <p className="mb-4 text-[13px] text-ink-500">
                Допълнителен код от мобилно приложение при всяко влизане. Силно препоръчително за
                административни профили.
              </p>
              <button
                onClick={() => updateUser(user.id, { twoFactor: !user.twoFactor })}
                className={user.twoFactor ? 'btn-ghost w-full' : 'btn-primary w-full'}
              >
                <Icon name="lock" size={15} /> {user.twoFactor ? 'Изключи 2FA' : 'Активирай 2FA'}
              </button>
            </Card>

            <Card>
              <h2 className="mb-3 font-bold text-ink-900">Сигурност на профила</h2>
              <div className="space-y-2.5 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-ink-600">Последно влизане</span>
                  <b className="text-ink-800">{formatDate(new Date().toISOString().slice(0, 10))}</b>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-600">Статус на профила</span>
                  <Badge tone={user.active ? 'ok' : 'danger'}>{user.active ? 'активен' : 'деактивиран'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-600">Съхранение на данните</span>
                  <Badge tone={mode === 'cloud' ? 'ok' : 'warn'}>{mode === 'cloud' ? 'облачна база' : 'локално в браузъра'}</Badge>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!confirm('Да се изтрие ли профилът? Действието е необратимо.')) return
                  alert('Заявката за изтриване на профила е подадена към системния администратор.')
                }}
                className="btn-danger mt-4 w-full"
              >
                <Icon name="trash" size={15} /> Изтрий профила
              </button>
            </Card>
          </div>
        </div>
      )}

      {tab === 'children' && (
        <>
          <div className="mb-3">
            <button onClick={() => setOpenChild(true)} className="btn-primary"><Icon name="plus" size={15} /> Добави дете</button>
          </div>
          {children.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Card>
                <h3 className="font-bold text-ink-900">Няма свързани деца</h3>
                <p className="mt-1 text-[13px] text-ink-500">
                  Ако сте родител, добавете детето си, за да виждате оценките, отсъствията и разписанието му.
                </p>
              </Card>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {children.map((c) => (
                <Card key={c.id}>
                  <div className="mb-3 flex items-start gap-3">
                    <Avatar name={`${c.firstName} ${c.lastName}`} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-900">{c.firstName} {c.lastName}</p>
                      <p className="text-[12px] text-ink-500">{className(c.classId)} · № {c.number}</p>
                    </div>
                    {c.sen && <Badge tone="purple">СОП</Badge>}
                  </div>
                  <div className="grid gap-1.5 text-[12px] text-ink-600">
                    <div className="flex justify-between"><span>ЕГН</span><b className="font-mono">{c.egn}</b></div>
                    <div className="flex justify-between"><span>Личен лекар</span><b>{c.doctor ?? '—'}</b></div>
                    <div className="flex justify-between"><span>Статус</span><b>{c.status}</b></div>
                  </div>
                  <button onClick={() => alert(`Заявка за достъп до дневника на ${c.firstName} ${c.lastName} е изпратена.`)} className="btn-ghost mt-3 w-full !py-1.5 text-[12px]">
                    Заяви достъп до дневника
                  </button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'settings' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 font-bold text-ink-900">Настройки на дневника</h2>
            <div className="space-y-2.5">
              {settings.map(([label, on]) => (
                <label key={label as string} className="flex items-center justify-between rounded-lg border border-ink-200 px-4 py-3">
                  <span className="text-[13px] font-medium text-ink-700">{label as string}</span>
                  <input type="checkbox" defaultChecked={on as boolean} className="h-4 w-4 rounded" />
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold text-ink-900">Училища и учебни години</h2>
            <div className="space-y-3">
              <Field label="Текущо училище">
                <Select defaultValue={db.school.id}>
                  <option value={db.school.id}>{db.school.name}</option>
                </Select>
              </Field>
              <Field label="Учебна година">
                <Select defaultValue={db.school.year}>
                  <option value={db.school.year}>{db.school.year}</option>
                  <option value="2025/2026">2025/2026</option>
                  <option value="2024/2025">2024/2025</option>
                </Select>
              </Field>
            </div>
            <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-[12px] text-brand-900">
              При преминаване към друга учебна година данните от предходната остават достъпни в режим на преглед.
            </div>
          </Card>
        </div>
      )}

      {tab === 'modules' && (
        <Table head={<><th className="th">Модул</th><th className="th">Група</th><th className="th">Описание</th><th className="th w-28">Функции</th></>}>
          {myModules.map((m) => (
            <tr key={m.id} className="hover:bg-ink-50/60">
              <td className="td">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon name={m.icon} size={14} /></span>
                  <span className="font-medium">{m.name}</span>
                </div>
              </td>
              <td className="td text-[13px] text-ink-500">{m.group}</td>
              <td className="td text-[13px] text-ink-600">{m.desc}</td>
              <td className="td"><Badge tone="neutral">{m.features}</Badge></td>
            </tr>
          ))}
        </Table>
      )}

      <Modal
        open={openChild} onClose={() => setOpenChild(false)} title="Добавяне на дете"
        footer={
          <>
            <button onClick={() => setOpenChild(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!childForm.firstName || !childForm.classId) return
                update((d) => {
                  const sid = `std_${Date.now()}`
                  d.students.push({
                    id: sid, firstName: childForm.firstName, lastName: childForm.lastName, middleName: '',
                    egn: '', number: d.students.filter((s) => s.classId === childForm.classId).length + 1,
                    classId: childForm.classId, gender: 'М', birthDate: '2012-01-01', address: '',
                    phone: '', email: '', parentIds: [user.id], status: 'активен', sen: false,
                    admittedAt: new Date().toISOString().slice(0, 10),
                  })
                  const u = d.users.find((x) => x.id === user.id)
                  if (u) u.childrenIds = [...(u.childrenIds ?? []), sid]
                  const k = d.classes.find((c) => c.id === childForm.classId)
                  if (k) k.studentIds.push(sid)
                })
                setChildForm({ ...childForm, firstName: '', lastName: '' })
                setOpenChild(false)
              }}
              className="btn-primary"
            >
              Добави
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Име"><Input value={childForm.firstName} onChange={(e) => setChildForm({ ...childForm, firstName: e.target.value })} /></Field>
          <Field label="Фамилия"><Input value={childForm.lastName} onChange={(e) => setChildForm({ ...childForm, lastName: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Field label="Паралелка">
              <Select value={childForm.classId} onChange={(e) => setChildForm({ ...childForm, classId: e.target.value })}>
                {db.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
        </div>
        <p className="mt-3 text-[12px] text-ink-400">
          За ученици под 14 години профилът се активира след одобрение от класния ръководител.
        </p>
      </Modal>
    </>
  )
}
