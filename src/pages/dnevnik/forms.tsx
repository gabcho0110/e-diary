import { useEffect, useRef } from 'react'
import { Icon } from '../../components/ui'

/**
 * Строителни елементи за екраните „Добави / Редакция" в модул „Дневник".
 *
 * В референтния дневник всяко добавяне отваря **цял екран** (не модален
 * прозорец): горе е лента със заглавие и зелен „✓ Запази / ✓ Запази и
 * добави", отдолу — формуляр, който заема цялата страница. Този файл дава
 * тази рамка (`AddPage`), истински текстов редактор (`RichText`) и превключвател
 * (`Toggle`), използвани от всички раздели.
 */

/** Зеленият бутон „Запази" — както в референтния дневник. */
export function SaveBtn({
  children, onClick, tone = 'green', type = 'button', disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  tone?: 'green' | 'teal'
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`db ${tone === 'green' ? 'db-green' : 'db-teal'} disabled:opacity-50`}
    >
      <Icon name="check" size={15} strokeWidth={2.4} />
      {children}
    </button>
  )
}

/** Лентата „Назад" отляво и бутоните за запазване отдясно. */
export function AddPage({
  title, onBack, onSave, onSaveAdd, children, banner, saveLabel = 'Запази',
}: {
  title: string
  onBack: () => void
  onSave?: () => void
  onSaveAdd?: () => void
  children: React.ReactNode
  banner?: React.ReactNode
  saveLabel?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#eef1f2]">
      <div className="flex items-center gap-3 border-b border-ink-200 bg-white px-4 py-2.5 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[13.5px] font-semibold text-[#337ab7] hover:bg-ink-50"
        >
          <Icon name="chevronLeft" size={17} strokeWidth={2.2} /> Назад
        </button>
        <h2 className="min-w-0 truncate text-[15px] font-bold text-ink-900">{title}</h2>
        <div className="ml-auto flex items-center gap-2">
          {onSaveAdd && <SaveBtn tone="teal" onClick={onSaveAdd}>Запази и добави</SaveBtn>}
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="db db-green"
            >
              <Icon name="check" size={15} strokeWidth={2.4} /> {saveLabel}
            </button>
          )}
        </div>
      </div>
      {banner && <div className="border-b border-ink-200 bg-white px-4 py-3">{banner}</div>}
      <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
    </div>
  )
}

/** Жълтo предупреждение под лентата — в референтния дневник е точният този жълт цвят. */
export function WarnBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded border border-[#f5dfa0] bg-[#fdf6d7] px-3.5 py-2.5 text-[13px] text-[#7a6317]">
      <Icon name="warn" size={16} className="mt-0.5 shrink-0" strokeWidth={2.2} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** Превключвател „НЕ / ДА" — за пол, СОП, класна работа и др. */
export function Toggle({
  on, onChange, onLabel,
}: { on: boolean; onChange: (v: boolean) => void; onLabel?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative inline-flex h-[22px] w-[44px] items-center rounded-full transition ${
          on ? 'bg-[#26c281]' : 'bg-[#c7cfd4]'
        }`}
      >
        <span
          className={`absolute h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${
            on ? 'left-[24px]' : 'left-[2px]'
          }`}
        />
      </button>
      <span className={`text-[12.5px] font-semibold ${on ? 'text-[#3f9d6f]' : 'text-ink-500'}`}>
        {on ? (onLabel ?? 'ДА') : 'НЕ'}
      </span>
    </span>
  )
}

const TOOLS: { cmd: string; label: React.ReactNode; title: string }[] = [
  { cmd: 'bold', label: <b>B</b>, title: 'Удебелен' },
  { cmd: 'italic', label: <i>I</i>, title: 'Курсив' },
  { cmd: 'underline', label: <u>U</u>, title: 'Подчертан' },
  { cmd: 'insertUnorderedList', label: '•••', title: 'Списък с точки' },
  { cmd: 'insertOrderedList', label: '1.', title: 'Номериран списък' },
]

/** Богат текстов редактор на contenteditable — истинска форматировка през execCommand. */
export function RichText({
  value, onChange, minHeight = 120, placeholder,
}: {
  value: string
  onChange: (html: string) => void
  minHeight?: number
  placeholder?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || ''
    // нарочно: ъпдейтваме self само при външна промяна на value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const exec = (cmd: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false)
    if (ref.current) onChange(ref.current.innerHTML)
  }

  return (
    <div className="overflow-hidden rounded border border-ink-300 focus-within:border-brand-500">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-ink-200 bg-ink-50 px-1.5 py-1">
        <span className="mr-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-ink-500 hover:bg-white">
          <Icon name="spark" size={12} /> <Icon name="chevronDown" size={11} />
        </span>
        <span className="mr-1 rounded border border-ink-300 bg-white px-1.5 py-0.5 text-[12px] font-bold text-[#e7505a]">A</span>
        {TOOLS.map((t) => (
          <button
            key={t.cmd}
            type="button"
            title={t.title}
            onMouseDown={(e) => { e.preventDefault(); exec(t.cmd) }}
            className="min-w-[26px] rounded px-1.5 py-0.5 text-[12.5px] text-ink-700 hover:bg-white"
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto rounded border border-ink-300 bg-white px-1.5 py-0.5 text-[12px] text-ink-500">▤</span>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => ref.current && onChange(ref.current.innerHTML)}
        data-placeholder={placeholder}
        className="rich-editor px-3 py-2 text-[13.5px] leading-relaxed text-ink-900 outline-none"
        style={{ minHeight }}
      />
    </div>
  )
}
