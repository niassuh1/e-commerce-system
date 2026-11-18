import { useState } from 'react'
import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { z } from 'zod'

import { AuthLayout } from '#/components/auth-layout'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useI18n } from '#/i18n'
import { safeRedirect } from '#/lib/auth'
import { login } from '#/server/functions'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ context, search }) => {
    if (context.user) throw redirect({ to: safeRedirect(search.redirect) })
  },
  component: LoginPage,
})

function LoginPage() {
  const i18n = useI18n()
  const { t } = i18n
  const router = useRouter()
  const queryClient = useQueryClient()
  const search = Route.useSearch()
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(undefined)
    try {
      const result = await login({
        data: { username: String(form.get('username')).trim(), password: String(form.get('password')) },
      })
      if (!result.ok) {
        setError(i18n.error(result.message))
        return
      }
      queryClient.removeQueries({ queryKey: ['session'] })
      await router.invalidate()
      await router.navigate({ to: safeRedirect(search.redirect) })
    } catch (caught) {
      setError(i18n.error(caught instanceof Error ? caught.message : ''))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.signInTitle')}
      subtitle={t('auth.signInSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to="/register" search={{ redirect: search.redirect }} className="font-medium text-foreground">
            {t('nav.signUp')}
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
        <div className="grid gap-2">
          <Label htmlFor="username">{t('auth.username')}</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            autoFocus
            dir="ltr"
            aria-invalid={Boolean(error)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            dir="ltr"
            aria-invalid={Boolean(error)}
          />
        </div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {t('auth.submitSignIn')}
        </Button>
      </form>
    </AuthLayout>
  )
}
