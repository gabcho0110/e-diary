import { useState } from 'react'
import { useApp } from '../store/AppContext'
import type { Test, TestQuestion } from '../lib/types'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, Select, Stat, Table, Tabs, Textarea, formatDate } from '../components/ui'

export default function Testove() {
  const { db, myClasses, mySubjects, addTest, deleteTest, user, className, subjectName, studentName, myStudent, myChildren } = useApp()
  const [tab, setTab] = useState('list')
  const [open, setOpen] = useState(false)
  const [take, setTake] = useState<Test | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<{ score: number; max: number } | null>(null)

  const isFamily = user?.roles.includes('parent') || user?.roles.includes('student')
  const focus = myStudent ?? myChildren[0]

  const [form, setForm] = useState({
    title: '', classId: myClasses[0]?.id ?? '', subjectId: mySubjects[0]?.id ?? '',
    kind: 'упражнителен' as Test['kind'], timeLimit: 40, visibility: 'класа' as Test['visibility'],
    questions: [] as TestQuestion[],
  })

  const visibleTests = isFamily
    ? db.tests.filter((t) => focus && t.classId === focus.classId && t.visibility !== 'само учителя')
    : db.tests

  const addQuestion = () => {
    setForm({
      ...form,
      questions: [...form.questions, {
        id: `q_${Date.now()}`, text: '', type: 'single',
        options: ['', '', '', ''], correct: [0], points: 1,
      }],
    })
  }

  if (isFamily && focus) {
    return (
      <>
        <PageHeader title="Тестове" subtitle={`Тестове за ${className(focus.classId)} — резултати и решаване.`} icon="check" />
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <Card pad={false}>
            <div className="border-b border-ink-200 px-5 py-3.5"><h2 className="font-bold text-ink-900">Достъпни тестове</h2></div>
            <ul className="divide-y divide-ink-100">
              {visibleTests.map((t) => {
                const att = t.attempts.find((a) => a.studentId === focus.id)
                return (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon name="check" size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink-800">{t.title}</p>
                      <p className="text-[11px] text-ink-500">
                        {subjectName(t.subjectId)} · {t.questions.length} въпроса · {t.timeLimit} мин · {t.kind}
                      </p>
                    </div>
                    {att ? (
                      <Badge tone={att.score / att.max >= 0.6 ? 'ok' : 'danger'}>
                        {att.score}/{att.max} · {formatDate(att.date)}
                      </Badge>
                    ) : (
                      <button onClick={() => { setTake(t); setAnswers({}); setResult(null) }} className="btn-primary !py-1.5 text-[12px]">
                        Реши
                      </button>
                    )}
                  </li>
                )
              })}
              {visibleTests.length === 0 && <li className="p-5"><EmptyState title="Няма тестове" icon="check" /></li>}
            </ul>
          </Card>

          <Card pad={false}>
            <div className="border-b border-ink-200 px-5 py-3.5"><h2 className="font-bold text-ink-900">Моите резултати</h2></div>
            <ul className="divide-y divide-ink-100">
              {visibleTests.flatMap((t) => t.attempts.filter((a) => a.studentId === focus.id).map((a) => ({ t, a }))).map(({ t, a }) => (
                <li key={t.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-[13px] font-semibold text-ink-800">{t.title}</p>
                    <span className="shrink-0 text-sm font-bold text-ink-900">{a.score}/{a.max}</span>
                  </div>
                  <p className="text-[11px] text-ink-500">{subjectName(t.subjectId)} · {formatDate(a.date)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Modal
          open={!!take} onClose={() => { setTake(null); setResult(null) }} wide title={take?.title ?? ''}
          footer={
            result ? (
              <button onClick={() => { setTake(null); setResult(null) }} className="btn-primary">Затвори</button>
            ) : (
              <>
                <button onClick={() => setTake(null)} className="btn-ghost">Отказ</button>
                <button
                  onClick={() => {
                    if (!take) return
                    const score = take.questions.reduce((a, q, i) => a + (answers[q.id] === q.correct[0] ? q.points : 0), 0)
                    setResult({ score, max: take.questions.reduce((a, q) => a + q.points, 0) })
                  }}
                  className="btn-primary"
                >
                  Предай
                </button>
              </>
            )
          }
        >
          {result ? (
            <div className="py-6 text-center">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">Резултат</p>
              <p className="mt-2 text-4xl font-bold text-ink-900">{result.score} / {result.max}</p>
              <p className="mt-1 text-sm text-ink-500">
                {result.score / result.max >= 0.8 ? 'Отлично представяне!' : result.score / result.max >= 0.5 ? 'Добър резултат.' : 'Препоръчва се допълнителна подготовка.'}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {take?.questions.map((q, i) => (
                <div key={q.id}>
                  <p className="mb-2 text-sm font-semibold text-ink-800">{i + 1}. {q.text}</p>
                  <div className="space-y-1.5">
                    {q.options.map((o, oi) => (
                      <label key={oi} className="flex items-center gap-2.5 rounded-lg border border-ink-200 px-3 py-2 text-[13px] hover:bg-ink-50">
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === oi}
                          onChange={() => setAnswers({ ...answers, [q.id]: oi })}
                          className="h-4 w-4"
                        />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      </>
    )
  }

  // ── учителски изглед ─────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="Тестове"
        subtitle="Създаване на упражнителни и изпитни тестове, въпроси, нива на видимост и резултати."
        icon="check"
        actions={<button onClick={() => setOpen(true)} className="btn-primary"><Icon name="plus" size={15} /> Нов тест</button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Всички тестове" value={db.tests.length} icon="check" />
        <Stat label="Изпитни" value={db.tests.filter((t) => t.kind === 'изпитен').length} icon="certificate" tone="warn" />
        <Stat label="Въпроси общо" value={db.tests.reduce((a, t) => a + t.questions.length, 0)} icon="list" tone="purple" />
        <Stat label="Решени от ученици" value={db.tests.reduce((a, t) => a + t.attempts.length, 0)} icon="person" tone="ok" />
      </div>

      <Tabs
        tabs={[
          { id: 'list', label: 'Всички тестове', count: db.tests.length },
          { id: 'results', label: 'Резултати' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'list' && (
        <Table
          head={<><th className="th">Заглавие</th><th className="th">Паралелка</th><th className="th">Предмет</th><th className="th w-24">Въпроси</th><th className="th w-28">Време</th><th className="th w-32">Вид</th><th className="th w-32">Видимост</th><th className="th w-12"></th></>}
        >
          {db.tests.map((t) => (
            <tr key={t.id} className="hover:bg-ink-50/60">
              <td className="td font-medium">{t.title}</td>
              <td className="td">{className(t.classId)}</td>
              <td className="td text-[13px] text-ink-600">{subjectName(t.subjectId)}</td>
              <td className="td">{t.questions.length}</td>
              <td className="td text-ink-500">{t.timeLimit} мин</td>
              <td className="td"><Badge tone={t.kind === 'изпитен' ? 'warn' : 'neutral'}>{t.kind}</Badge></td>
              <td className="td"><Badge tone="brand">{t.visibility}</Badge></td>
              <td className="td">
                <button onClick={() => deleteTest(t.id)} className="text-ink-300 hover:text-danger"><Icon name="trash" size={15} /></button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {tab === 'results' && (
        <Table head={<><th className="th">Тест</th><th className="th">Ученик</th><th className="th w-28">Резултат</th><th className="th w-28">Дата</th></>}>
          {db.tests.flatMap((t) => t.attempts.map((a) => ({ t, a }))).slice(0, 120).map(({ t, a }, i) => (
            <tr key={`${t.id}_${a.studentId}_${i}`} className="hover:bg-ink-50/60">
              <td className="td text-[13px]">{t.title}</td>
              <td className="td">{studentName(a.studentId)}</td>
              <td className="td">
                <Badge tone={a.score / a.max >= 0.6 ? 'ok' : 'danger'}>{a.score}/{a.max} ({Math.round((a.score / a.max) * 100)}%)</Badge>
              </td>
              <td className="td text-[12px] text-ink-500">{formatDate(a.date)}</td>
            </tr>
          ))}
        </Table>
      )}

      <Modal
        open={open} onClose={() => setOpen(false)} wide title="Нов тест"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!form.title || !form.questions.length || !user) return
                addTest({
                  title: form.title, classId: form.classId, subjectId: form.subjectId,
                  teacherId: user.id, kind: form.kind, questions: form.questions,
                  timeLimit: form.timeLimit, visibility: form.visibility,
                })
                setForm({ ...form, title: '', questions: [] })
                setOpen(false)
              }}
              className="btn-primary"
            >
              Създай
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Заглавие"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          </div>
          <Field label="Паралелка">
            <Select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
              {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Предмет">
            <Select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              {mySubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Вид">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Test['kind'] })}>
              <option value="упражнителен">Упражнителен</option>
              <option value="изпитен">Изпитен</option>
            </Select>
          </Field>
          <Field label="Време (мин)">
            <Input type="number" value={form.timeLimit} onChange={(e) => setForm({ ...form, timeLimit: Number(e.target.value) })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Ниво на видимост">
              <Select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as Test['visibility'] })}>
                <option value="само учителя">Само учителя</option>
                <option value="класа">Класа</option>
                <option value="всички">Всички</option>
              </Select>
            </Field>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">Въпроси ({form.questions.length})</p>
            <button onClick={addQuestion} className="btn-ghost !py-1.5 text-[12px]"><Icon name="plus" size={13} /> Добави въпрос</button>
          </div>
          <div className="space-y-3">
            {form.questions.map((q, qi) => (
              <div key={q.id} className="rounded-lg border border-ink-200 p-3.5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[12px] font-bold text-ink-400">#{qi + 1}</span>
                  <Input
                    value={q.text}
                    onChange={(e) => {
                      const qs = [...form.questions]
                      qs[qi] = { ...q, text: e.target.value }
                      setForm({ ...form, questions: qs })
                    }}
                    placeholder="Текст на въпроса"
                  />
                  <button
                    onClick={() => setForm({ ...form, questions: form.questions.filter((x) => x.id !== q.id) })}
                    className="shrink-0 text-ink-300 hover:text-danger"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((o, oi) => (
                    <label key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={q.correct[0] === oi}
                        onChange={() => {
                          const qs = [...form.questions]
                          qs[qi] = { ...q, correct: [oi] }
                          setForm({ ...form, questions: qs })
                        }}
                        className="h-4 w-4 shrink-0"
                      />
                      <input
                        value={o}
                        onChange={(e) => {
                          const qs = [...form.questions]
                          const opts = [...q.options]
                          opts[oi] = e.target.value
                          qs[qi] = { ...q, options: opts }
                          setForm({ ...form, questions: qs })
                        }}
                        placeholder={`Отговор ${String.fromCharCode(65 + oi)}`}
                        className="input !py-1.5 text-[13px]"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {form.questions.length === 0 && (
              <p className="rounded-lg border border-dashed border-ink-200 px-4 py-6 text-center text-[13px] text-ink-400">
                Все още няма добавени въпроси.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
