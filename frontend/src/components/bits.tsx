import { Fragment, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ImageOffIcon, MinusIcon, PlusIcon } from 'lucide-react'

import { useI18n } from '#/i18n'
import { cn } from '#/lib/utils'

/** Quiet "Stores / Best Buy / Product" trail, as in the reference. Only static paths are linked. */
export function Breadcrumbs({ items }: { items: { label: string; to?: '/' | '/orders' | '/dashboard' }[] }) {
  const { t } = useI18n()
  return (
    <nav aria-label={t('nav.breadcrumb')} className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && <span aria-hidden>/</span>}
          {item.to ? (
            <Link to={item.to} className="text-muted-foreground no-underline hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="truncate text-foreground">
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}

/** Page title row: heading, optional supporting line, actions at the inline end. */
export function PageHeader({
  title,
  description,
  actions,
  leading,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  leading?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}>
      <div className="flex min-w-0 items-center gap-4">
        {leading}
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-3xl bg-tile px-6 py-16 text-center',
        className,
      )}
    >
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <p className="text-base font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Product photo on a quiet ground, with a fallback when the URL is empty or broken. */
export function ProductImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const { t } = useI18n()
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  return (
    <div className={cn('relative overflow-hidden bg-tile', className)}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-contain p-[10%] mix-blend-multiply"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-muted-foreground">
          <div className="flex flex-col items-center gap-1.5 text-xs">
            <ImageOffIcon className="size-5" aria-hidden />
            <span>{t('product.noImage')}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/** Quantity control that never goes past the stock available. */
export function QuantityStepper({
  value,
  max,
  min = 1,
  onChange,
  disabled,
  size = 'md',
  label,
}: {
  value: number
  max: number
  min?: number
  onChange: (value: number) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  label: string
}) {
  const { t, number } = useI18n()
  const button = cn(
    'grid place-items-center text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-35',
    size === 'sm' ? 'size-8' : 'size-10',
  )
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex items-center rounded-full border border-input bg-background', disabled && 'opacity-60')}
    >
      <button
        type="button"
        className={cn(button, 'rounded-full')}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label={t('cart.decrease')}
      >
        <MinusIcon className="size-3.5" />
      </button>
      <output
        aria-live="polite"
        className={cn('tabular min-w-8 px-1 text-center text-sm font-medium', size === 'sm' ? 'leading-8' : 'leading-10')}
      >
        {number(value)}
      </output>
      <button
        type="button"
        className={cn(button, 'rounded-full')}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label={t('cart.increase')}
      >
        <PlusIcon className="size-3.5" />
      </button>
    </div>
  )
}

/** Stock line with capacity language: "12 in stock", "Only 3 left", "Out of stock". */
export function StockNote({ quantity, className }: { quantity: number; className?: string }) {
  const { t } = useI18n()
  if (quantity <= 0) return <span className={cn('text-destructive', className)}>{t('product.outOfStock')}</span>
  if (quantity <= 5)
    return <span className={cn('text-warning', className)}>{t('product.lowStock', { count: quantity })}</span>
  return <span className={cn('text-muted-foreground', className)}>{t('product.inStock', { count: quantity })}</span>
}
