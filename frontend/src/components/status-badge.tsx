import { useI18n } from '#/i18n'
import type { OrderStatus } from '#/lib/types'
import { cn } from '#/lib/utils'

const dot: Record<OrderStatus, string> = {
  pending: 'bg-muted-foreground',
  confirmed: 'bg-foreground',
  shipped: 'bg-foreground',
  delivered: 'bg-success',
  cancelled: 'bg-destructive',
}

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const { t } = useI18n()
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full bg-pill px-3 text-xs font-medium whitespace-nowrap',
        status === 'cancelled' && 'text-destructive',
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', dot[status])} />
      {t(`status.${status}`)}
    </span>
  )
}
