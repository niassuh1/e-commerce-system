import { useState } from 'react'
import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { AuthLayout, FieldError } from '#/components/auth-layout'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useI18n } from '#/i18n'
import { safeRedirect } from '#/lib/auth'
import { register } from '#/server/functions'

export const Route = createFileRoute('/register')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ context, search }) => {
    if (context.user) throw redirect({ to: safeRedirect(search.redirect) })
  },
  component: RegisterPage,
})

function RegisterPage() {
  const i18n = useI18n()
  const { t } = i18n
  const router = useRouter()
  const queryClient = useQueryClient()
  const search = Route.useSearch()
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const data = {
      username: String(form.get('username')).trim(),
      email: String(form.get('email')).trim(),
      password: String(form.get('password')),
      first_name: String(form.get('first_name')).trim(),
      last_name: String(form.get('last_name')).trim(),
    }
    const missing: Record<string, string> = {}
    if (!data.username) missing.username = t('pm.required')
    if (!data.email) missing.email = t('pm.required')
    if (!data.password) missing.password = t('pm.required')
    if (Object.keys(missing).length) {
      setFields(missing)
      return
    }

    setPending(true)
    setError(undefined)
    setFields({})
    try {
      const result = await register({ data })
      if (!result.ok) {
        setFields(result.fields)
        if (!Object.keys(result.fields).length) setError(i18n.error(result.message))
        return
      }
      queryClient.removeQueries({ queryKey: ['session'] })
      await router.invalidate()
      toast.success(t('auth.welcome', { name: data.first_name || data.username }))
      await router.navigate({ to: safeRedirect(search.redirect) })
    } catch (caught) {
      setError(i18n.error(caught instanceof Error ? caught.message : ''))
    } finally {
      setPending(false)
    }
  }

  const field = (name: string) => ({
    id: name,
    name,
    'aria-invalid': Boolean(fields[name]),
    'aria-describedby': fields[name] ? `${name}-error` : undefined,
  })

  return (
    <AuthLayout
      title={t('auth.signUpTitle')}
      subtitle={t('auth.signUpSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to="/login" search={{ redirect: search.redirect }} className="font-medium text-foreground">
            {t('nav.signIn')}
          </Link>
        </>
      }
    >
      <form method="post" onSubmit={onSubmit} className="grid gap-5" noValidate>
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="first_name">
              {t('auth.firstName')} <span className="font-normal text-muted-foreground">({t('auth.optional')})</span>
            </Label>
            <Input {...field('first_name')} autoComplete="given-name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="last_name">
              {t('auth.lastName')} <span className="font-normal text-muted-foreground">({t('auth.optional')})</span>
            </Label>
            <Input {...field('last_name')} autoComplete="family-name" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="username">{t('auth.username')}</Label>
          <Input {...field('username')} autoComplete="username" autoCapitalize="none" spellCheck={false} dir="ltr" />
          <FieldError id="username-error" message={fields.username} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <Input {...field('email')} type="email" autoComplete="email" dir="ltr" />
          <FieldError id="email-error" message={fields.email} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <Input {...field('password')} type="password" autoComplete="new-password" dir="ltr" />
          {fields.password ? (
            <FieldError id="password-error" message={fields.password} />
          ) : (
            <p className="text-xs text-muted-foreground">{t('auth.passwordHint')}</p>
          )}
        </div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {t('auth.submitSignUp')}
        </Button>
      </form>
    </AuthLayout>
  )
}
