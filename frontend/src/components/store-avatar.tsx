import { useState } from 'react'

import { storeCode } from '#/lib/lines'
import { cn } from '#/lib/utils'

const sizes = {
  sm: 'size-7 text-[10px]',
  md: 'size-10 text-xs',
  lg: 'size-14 text-sm',
  xl: 'size-20 text-lg',
} as const

/** A store's mark: its logo in a white circle, or its initials when there is no logo (or it fails to load). */
export function StoreAvatar({
  name,
  logoUrl,
  size = 'md',
  className,
}: {
  name: string
  logoUrl?: string | null
  size?: keyof typeof sizes
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const showLogo = Boolean(logoUrl) && !failed
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-medium select-none',
        showLogo ? 'border bg-white' : 'bg-foreground text-background',
        sizes[size],
        className,
      )}
    >
      {showLogo ? (
        <img src={logoUrl!} alt="" className="size-[62%] object-contain" onError={() => setFailed(true)} />
      ) : (
        storeCode(name)
      )}
    </span>
  )
}

/** Horizon wordmark: a half sun resting on a line. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className={cn('size-7', className)}>
      <path d="M6 18a8 8 0 0 1 16 0Z" fill="currentColor" />
      <rect x="2" y="20.5" width="24" height="2.5" rx="1.25" fill="currentColor" />
    </svg>
  )
}
