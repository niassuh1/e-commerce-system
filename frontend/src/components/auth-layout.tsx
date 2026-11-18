import { Logo } from '#/components/store-avatar'
import { useI18n } from '#/i18n'

/** Shared frame for sign-in and sign-up: a narrow form column under the line mark. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  const { t } = useI18n()
  return (
    <div className="page-wrap flex justify-center pt-10 sm:pt-16">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-lg font-semibold tracking-tight">{t('brand')}</span>
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
        <div className="mt-8">{children}</div>
        <p className="mt-8 text-sm text-muted-foreground">{footer}</p>
      </div>
    </div>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  )
}
