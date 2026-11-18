import { CheckIcon, XIcon } from 'lucide-react'

import { useI18n } from '#/i18n'
import { ORDER_STATIONS } from '#/lib/types'
import type { OrderStatus } from '#/lib/types'
import { cn } from '#/lib/utils'

/**
 * Order progress: Pending → Confirmed → Shipped → Delivered.
 * `counts` turns it into the dashboard's step board (orders waiting at each step).
 */
export function OrderJourney({
  status,
  variant = 'full',
  counts,
  onStationClick,
  activeStation,
  className,
}: {
  status?: OrderStatus
  variant?: 'full' | 'compact'
  counts?: Partial<Record<OrderStatus, number>>
  onStationClick?: (station: OrderStatus) => void
  activeStation?: OrderStatus | null
  className?: string
}) {
  const { t, number } = useI18n()
  const cancelled = status === 'cancelled'
  const reached = status && !cancelled ? ORDER_STATIONS.indexOf(status as (typeof ORDER_STATIONS)[number]) : -1
  const label = t('journey.label', { status: t(`status.${status ?? 'pending'}`) })

  if (variant === 'compact') {
    return (
      <div role="img" aria-label={label} className={cn('flex w-28 items-center gap-1', className)}>
        {ORDER_STATIONS.map((station, index) => (
          <span
            key={station}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              cancelled ? 'bg-destructive/25' : index <= reached ? 'bg-foreground' : 'bg-pill',
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <ol aria-label={status ? label : undefined} className={cn('grid grid-cols-4 gap-2', className)}>
      {ORDER_STATIONS.map((station, index) => {
        const done = !counts && !cancelled && index < reached
        const current = !counts && !cancelled && index === reached
        const count = counts?.[station] ?? 0
        const body = (
          <>
            <span className="relative block h-1.5 overflow-hidden rounded-full bg-pill">
              {(done || current || (counts && count > 0)) && (
                <span
                  className="animate-bar-fill absolute inset-0 rounded-full bg-foreground"
                  style={{ animationDelay: `${index * 120}ms` }}
                />
              )}
            </span>
            <span className="mt-3 flex min-w-0 items-center gap-1 text-xs sm:gap-1.5 sm:text-sm">
              {counts ? (
                <span
                  className={cn(
                    'tabular grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-medium',
                    count ? 'bg-foreground text-background' : 'bg-pill text-muted-foreground',
                  )}
                >
                  {number(count)}
                </span>
              ) : done ? (
                <CheckIcon className="hidden size-4 shrink-0 sm:block" aria-hidden />
              ) : cancelled && index === 0 ? (
                <XIcon className="size-4 text-destructive" aria-hidden />
              ) : null}
              <span className={cn('truncate', current || (counts && count) ? 'font-medium' : 'text-muted-foreground')}>
                {t(`status.${station}`)}
              </span>
            </span>
          </>
        )
        return (
          <li key={station} aria-current={current ? 'step' : undefined}>
            {onStationClick ? (
              <button
                type="button"
                onClick={() => onStationClick(station)}
                aria-pressed={activeStation === station}
                className={cn(
                  'w-full rounded-2xl p-3 text-start transition-colors hover:bg-pill',
                  activeStation === station && 'bg-pill',
                )}
              >
                {body}
              </button>
            ) : (
              <div className="py-1">{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
