import { Link } from 'react-router-dom'
import type { Klass, User } from '../lib/types'
import { personShort, shortClassName } from '../lib/classes'

/**
 * Заглавието на отворената паралелка с две отделни връзки:
 *
 *     11А  -  Алекс Т. Тодоров  (класен)
 *     ↑клик    ↑клик
 *     инфо за класа   профил на класния
 *
 * Двете части водят до екраните от „Администрация": паралелката — в
 * „Паралелки" (`?class=`), класният ръководител — в „Потребители" (`?user=`).
 * Ако ролята няма достъп до „Администрация", двете части се показват като
 * обикновен текст, а не като мъртви връзки към „Нямате достъп".
 */
export function ClassTitle({
  klass, users, meId, linkable = true,
}: {
  klass: Klass
  users: User[]
  meId?: string
  linkable?: boolean
}) {
  const name = shortClassName(klass.name)
  const teacher = users.find((u) => u.id === klass.homeroomTeacherId)
  const tag = teacher && teacher.id === meId ? 'класен' : 'класен ръководител'

  const link = 'text-[#337ab7] underline-offset-2 hover:underline'

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      {linkable ? (
        <Link
          to={`/administracia/paralelki?class=${klass.id}`}
          className={link}
          title="Информация за паралелката"
        >
          {name}
        </Link>
      ) : (
        <span>{name}</span>
      )}

      {teacher && (
        <>
          <span className="font-normal text-ink-300">-</span>
          {linkable ? (
            <Link
              to={`/administracia/potrebiteli?user=${teacher.id}`}
              className={link}
              title="Профил на класния ръководител"
            >
              {personShort(teacher)}
            </Link>
          ) : (
            <span>{personShort(teacher)}</span>
          )}
          <span className="text-[0.8em] font-normal text-ink-500">({tag})</span>
        </>
      )}
    </span>
  )
}
