import { useEffect, useState } from 'react'
import { ImageIcon } from 'lucide-react'

import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useI18n } from '#/i18n'
import { cn } from '#/lib/utils'

/** Image URL input with a live preview, since Horizon stores images as links. */
export function ImageUrlField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  fallback,
}: {
  id: string
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
  error?: string
  fallback?: React.ReactNode
}) {
  const { t } = useI18n()
  const [state, setState] = useState<'idle' | 'loaded' | 'broken'>('idle')
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim()), 300)
    return () => clearTimeout(timer)
  }, [value])

  useEffect(() => setState('idle'), [debounced])

  const message = error ?? (state === 'broken' ? t('pm.imageBroken') : undefined)

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted',
            state === 'broken' && 'border-destructive/50',
          )}
        >
          {debounced && state !== 'broken' ? (
            <img
              key={debounced}
              src={debounced}
              alt=""
              onLoad={() => setState('loaded')}
              onError={() => setState('broken')}
              className="size-full object-contain p-1.5 mix-blend-multiply"
            />
          ) : (
            (fallback ?? <ImageIcon className="size-5 text-muted-foreground" aria-hidden />)
          )}
        </div>
        <div className="grid flex-1 gap-1.5">
          <Input
            id={id}
            type="url"
            inputMode="url"
            dir="ltr"
            placeholder="https://"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={Boolean(message)}
            aria-describedby={`${id}-hint`}
          />
          <p id={`${id}-hint`} className={cn('text-xs', message ? 'text-destructive' : 'text-muted-foreground')}>
            {message ?? hint}
          </p>
        </div>
      </div>
    </div>
  )
}
