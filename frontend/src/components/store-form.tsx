import { useState } from 'react'
import { Loader2Icon } from 'lucide-react'

import { FieldError } from '#/components/auth-layout'
import { ImageUrlField } from '#/components/image-url-field'
import { StoreAvatar } from '#/components/store-avatar'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useI18n } from '#/i18n'
import type { FormResult } from '#/server/django'

type Values = { name: string; logo_url: string }

export function StoreForm({
  initial,
  storeId,
  submitLabel,
  onSubmit,
}: {
  initial: Values
  /** Known once the store exists; drives the roundel preview. */
  storeId?: string
  submitLabel: string
  onSubmit: (values: Values) => Promise<FormResult<unknown>>
}) {
  const i18n = useI18n()
  const { t } = i18n
  const [values, setValues] = useState(initial)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const errors: Record<string, string> = {}
    if (!values.name.trim()) errors.name = t('pm.required')
    if (values.logo_url && !/^https?:\/\/\S+$/.test(values.logo_url.trim())) errors.logo_url = t('pm.urlInvalid')
    setFields(errors)
    if (Object.keys(errors).length) return

    setPending(true)
    try {
      const result = await onSubmit({ name: values.name.trim(), logo_url: values.logo_url.trim() })
      if (!result.ok) setFields(Object.keys(result.fields).length ? result.fields : { name: i18n.error(result.message) })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-6" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="store-name">{t('ss.name')}</Label>
        <Input
          id="store-name"
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          maxLength={255}
          aria-invalid={Boolean(fields.name)}
          aria-describedby={fields.name ? 'store-name-error' : undefined}
        />
        <FieldError id="store-name-error" message={fields.name} />
      </div>

      <ImageUrlField
        id="store-logo"
        label={t('ss.logo')}
        hint={t('ss.logoHint')}
        value={values.logo_url}
        onChange={(logo_url) => setValues((prev) => ({ ...prev, logo_url }))}
        error={fields.logo_url}
        fallback={
          storeId && values.name ? <StoreAvatar name={values.name} size="md" /> : undefined
        }
      />

      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
