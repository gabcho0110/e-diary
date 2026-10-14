import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { ROLE_MAP, ROLES } from '../lib/roles'
import type { RoleId } from '../lib/types'
import { Badge, Field, Icon, Input, Select } from '../components/ui'

const DEMO_ACCOUNTS: { username: string; role: RoleId }[] = [
  { username: 'admin', role: 'sysadmin' },
  { username: 'direktor', role: 'director' },
  { username: 'zam', role: 'deputy' },
  { username: 'ucitel', role: 'teacher' },
  { username: 'klasen', role: 'class_teacher' },
  { username: 'vazpitatel', role: 'educator' },
  { username: 'resursen', role: 'resource_teacher' },
  { username: 'psiholog', role: 'psychologist' },
  { username: 'logoped', role: 'speech_therapist' },
  { username: 'medsestra', role: 'nurse' },
  { username: 'bibliotekar', role: 'librarian' },
  { username: 'schetovoditel', role: 'accountant' },
  { username: 'sekretar', role: 'secretary' },
  { username: 'roditel', role: 'parent' },
  { username: 'ucenik', role: 'student' },
  { username: 'gost', role: 'guest' },
]

export default function Login() {
  const { login, loginAs, db, mode } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const [reg, setReg] = useState({
    firstName: '', lastName: '', username: '', password: '',
    email: '', phone: '', role: 'parent' as RoleId,
  })

  const { register } = useApp()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = login(username, password)
    if (res.ok) navigate('/')
    else setError(res.error ?? 'Входът не успя.')
  }

  const submitReg = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!reg.firstName || !reg.lastName || !reg.username || !reg.password || !reg.email) {
      setError('Попълнете всички задължителни полета.')
      return
    }
    if (reg.password.length < 6) {
      setError('Паролата трябва да е поне 6 символа.')
      return
    }
    const res = register(reg)
    if (res.ok) navigate('/')
    else setError(res.error ?? 'Регистрацията не успя.')
  }

  const quick = (u: string) => {
    const found = db.users.find((x) => x.username === u)
    if (found) {
      loginAs(found.id)
      navigate('/')
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ляв панел */}
      <div className="relative hidden flex-col justify-between bg-ink-900 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #3282fb 0, transparent 42%), radial-gradient(circle at 80% 70%, #7b3ff2 0, transparent 45%)',
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600"><Icon name="school" size={22} /></span>
            <div>
              <p className="text-lg font-bold leading-tight">е-Дневник</p>
              <p className="text-xs text-white/55">Платформа за управление на училището</p>
            </div>
          </div>

          <h1 className="mt-12 max-w-lg text-[34px] font-extrabold leading-[1.15] tracking-tight">
            Целият учебен процес — на едно място.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/65">
            Оценки, отсъствия, разписания, съобщения, документи и справки. Всеки участник в
            училищния живот вижда точно това, което му е нужно — с права според ролята.
          </p>

          <div className="mt-9 grid max-w-lg grid-cols-3 gap-3">
            {[
              ['29', 'модула'],
              ['16', 'роли'],
              ['500+', 'функции'],
            ].map(([n, l]) => (
              <div key={l} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-2xl font-bold">{n}</p>
                <p className="text-[11px] uppercase tracking-wide text-white/50">{l}</p>
              </div>
            ))}
          </div>

          <div className="mt-9 flex max-w-lg flex-wrap gap-1.5">
            {ROLES.map((r) => (
              <span key={r.id} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70">
                {r.name}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/35">
          {db.school.name} · {db.school.city} · учебна {db.school.year}
        </p>
      </div>

      {/* десен панел */}
      <div className="flex items-center justify-center bg-white px-5 py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white"><Icon name="school" size={20} /></span>
            <div>
              <p className="font-bold leading-tight text-ink-900">е-Дневник</p>
              <p className="text-xs text-ink-500">{db.school.name}</p>
            </div>
          </div>

          <div className="mb-5 flex gap-1 rounded-xl bg-ink-100 p-1">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  tab === t ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                {t === 'login' ? 'Вход' : 'Регистрация'}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#f5c2c2] bg-[#fde8e8] px-3 py-2.5 text-[13px] text-[#b42318]">
              <Icon name="warn" size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={submit} className="space-y-3.5">
              <Field label="Потребителско име или имейл">
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="напр. ucitel" autoComplete="username" />
              </Field>
              <Field label="Парола">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
              </Field>
              <div className="flex items-center justify-between text-[13px]">
                <label className="flex items-center gap-2 text-ink-600">
                  <input type="checkbox" className="h-4 w-4 rounded border-ink-300" defaultChecked /> Запомни ме
                </label>
                <button type="button" className="font-semibold text-brand-700 hover:underline">
                  Забравена парола?
                </button>
              </div>
              <button type="submit" className="btn-primary w-full py-2.5">Влизане</button>
            </form>
          ) : (
            <form onSubmit={submitReg} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Име *">
                  <Input value={reg.firstName} onChange={(e) => setReg({ ...reg, firstName: e.target.value })} />
                </Field>
                <Field label="Фамилия *">
                  <Input value={reg.lastName} onChange={(e) => setReg({ ...reg, lastName: e.target.value })} />
                </Field>
              </div>
              <Field label="Роля *">
                <Select value={reg.role} onChange={(e) => setReg({ ...reg, role: e.target.value as RoleId })}>
                  {ROLES.filter((r) => r.id !== 'sysadmin').map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Потребителско име *">
                <Input value={reg.username} onChange={(e) => setReg({ ...reg, username: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Имейл *">
                  <Input type="email" value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} />
                </Field>
                <Field label="Телефон">
                  <Input value={reg.phone} onChange={(e) => setReg({ ...reg, phone: e.target.value })} placeholder="+359…" />
                </Field>
              </div>
              <Field label="Парола *" hint="Минимум 6 символа.">
                <Input type="password" value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} />
              </Field>
              <button type="submit" className="btn-primary w-full py-2.5">Създаване на профил</button>
              <p className="text-center text-[11px] leading-relaxed text-ink-400">
                За ученици под 14 години профилът се активира от родител или класен ръководител.
              </p>
            </form>
          )}

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-ink-200" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Демо достъп</span>
            <span className="h-px flex-1 bg-ink-200" />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.username}
                onClick={() => quick(a.username)}
                className="flex items-center gap-2 rounded-lg border border-ink-200 px-2.5 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50/50"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink-100 text-ink-600">
                  <Icon name="person" size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold leading-tight text-ink-800">
                    {ROLE_MAP[a.role].name}
                  </span>
                  <span className="block truncate font-mono text-[10px] leading-tight text-ink-400">{a.username}</span>
                </span>
              </button>
            ))}
          </div>

          <p className="mt-4 text-center text-[11px] text-ink-400">
            Парола за всички демо профили: <span className="font-mono font-semibold">demo123</span>
            {' · '}
            <span className="font-mono">admin</span> → <span className="font-mono">admin123</span>
          </p>

          {mode === 'local' && (
            <div className="mt-4 flex justify-center">
              <Badge tone="warn">данните се пазят локално в браузъра</Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
