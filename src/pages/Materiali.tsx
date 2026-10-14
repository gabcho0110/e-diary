import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import { Badge, Card, EmptyState, Field, Icon, Input, Modal, PageHeader, SearchInput, Select, Stat, Table, Textarea, formatDate } from '../components/ui'

const KIND_ICON: Record<string, string> = {
  документ: 'report', презентация: 'chart', видео: 'video', линк: 'spark', снимка: 'eye',
}

export default function Materiali() {
  const { db, myClasses, mySubjects, addMaterial, likeMaterial, deleteMaterial, user, className, subjectName, myStudent, myChildren } = useApp()
  const [q, setQ] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const isFamily = user?.roles.includes('parent') || user?.roles.includes('student')
  const focus = myStudent ?? myChildren[0]

  const [form, setForm] = useState({
    title: '', subjectId: mySubjects[0]?.id ?? '', classId: myClasses[0]?.id ?? '',
    kind: 'документ' as const, url: '', description: '', access: 'класа' as const,
  })

  const materials = useMemo(() => {
    let list = db.materials
    if (isFamily && focus) list = list.filter((m) => m.classId === focus.classId && m.access !== 'избрани')
    if (subjectFilter) list = list.filter((m) => m.subjectId === subjectFilter)
    if (q.trim()) list = list.filter((m) => m.title.toLowerCase().includes(q.toLowerCase()) || m.description.toLowerCase().includes(q.toLowerCase()))
    return [...list].sort((a, b) => b.date.localeCompare(a.date))
  }, [db.materials, isFamily, focus, subjectFilter, q])

  const current = db.materials.find((m) => m.id === preview)

  return (
    <>
      <PageHeader
        title="Учебни материали"
        subtitle="Качване, редактиране, оценяване и ограничаване на достъп до материали по предмети."
        icon="folder"
        actions={
          !isFamily ? (
            <button onClick={() => setOpen(true)} className="btn-primary"><Icon name="upload" size={15} /> Добави материал</button>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Материали" value={materials.length} icon="folder" />
        <Stat label="Харесвания" value={materials.reduce((a, m) => a + m.likes, 0)} icon="heart" tone="danger" />
        <Stat label="Презентации" value={materials.filter((m) => m.kind === 'презентация').length} icon="chart" tone="purple" />
        <Stat label="Видео уроци" value={materials.filter((m) => m.kind === 'видео').length} icon="video" tone="warn" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Търсене в материалите…" />
        <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="w-auto min-w-[180px]">
          <option value="">Всички предмети</option>
          {db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>

      {materials.length === 0 ? (
        <EmptyState title="Няма материали" text="Все още не са качени учебни материали по избраните филтри." icon="folder" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {materials.map((m) => (
            <Card key={m.id} className="flex flex-col">
              <div className="mb-3 flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon name={KIND_ICON[m.kind] ?? 'folder'} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-900">{m.title}</p>
                  <p className="text-[11px] text-ink-500">{subjectName(m.subjectId)} · {className(m.classId)}</p>
                </div>
                <Badge tone={m.access === 'всички' ? 'ok' : m.access === 'класа' ? 'brand' : 'warn'}>{m.access}</Badge>
              </div>

              <p className="mb-3 line-clamp-2 flex-1 text-[13px] leading-snug text-ink-600">{m.description}</p>

              <div className="flex items-center gap-2 border-t border-ink-100 pt-3">
                <button onClick={() => likeMaterial(m.id)} className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-500 hover:text-danger">
                  <Icon name="heart" size={14} /> {m.likes}
                </button>
                <span className="text-[11px] text-ink-400">{formatDate(m.date)}</span>
                <button onClick={() => setPreview(m.id)} className="ml-auto text-[12px] font-semibold text-brand-700 hover:underline">
                  Преглед
                </button>
                {!isFamily && (
                  <button onClick={() => deleteMaterial(m.id)} className="text-ink-300 hover:text-danger"><Icon name="trash" size={14} /></button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open} onClose={() => setOpen(false)} title="Нов учебен материал"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-ghost">Отказ</button>
            <button
              onClick={() => {
                if (!form.title || !user) return
                addMaterial({ ...form, teacherId: user.id })
                setForm({ ...form, title: '', url: '', description: '' })
                setOpen(false)
              }}
              className="btn-primary"
            >
              Качи
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Заглавие"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          </div>
          <Field label="Предмет">
            <Select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              {mySubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Паралелка">
            <Select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
              {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Вид">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as typeof form.kind })}>
              <option value="документ">Документ</option>
              <option value="презентация">Презентация</option>
              <option value="видео">Видео</option>
              <option value="линк">Линк</option>
              <option value="снимка">Снимка</option>
            </Select>
          </Field>
          <Field label="Достъп">
            <Select value={form.access} onChange={(e) => setForm({ ...form, access: e.target.value as typeof form.access })}>
              <option value="класа">Само класа</option>
              <option value="всички">Всички</option>
              <option value="избрани">Избрани</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Адрес / линк" hint="Може да поставите линк в описанието на материала.">
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Описание">
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={current?.title ?? ''}>
        {current && (
          <>
            <div className="mb-4 grid gap-2 rounded-lg bg-ink-50 px-4 py-3 text-[13px]">
              <div className="flex justify-between"><span className="text-ink-500">Предмет</span><b>{subjectName(current.subjectId)}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Паралелка</span><b>{className(current.classId)}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Вид</span><b>{current.kind}</b></div>
              <div className="flex justify-between"><span className="text-ink-500">Дата</span><b>{formatDate(current.date)}</b></div>
            </div>
            <p className="text-sm leading-relaxed text-ink-700">{current.description}</p>
            <div className="mt-4 rounded-lg border border-dashed border-ink-200 px-4 py-8 text-center text-[13px] text-ink-400">
              <Icon name={KIND_ICON[current.kind] ?? 'folder'} size={22} className="mx-auto mb-2" />
              Преглед на файла: <span className="font-mono text-[12px]">{current.url}</span>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
