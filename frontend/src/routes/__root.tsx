import { HeadContent, Link, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Direction } from 'radix-ui'
import { Toaster } from 'sonner'
import type { QueryClient } from '@tanstack/react-query'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import appCss from '../styles.css?url'

import { SiteHeader } from '#/components/site-header'
import { Button } from '#/components/ui/button'
import { TooltipProvider } from '#/components/ui/tooltip'
import { I18nProvider, readLocale, useI18n } from '#/i18n'
import type { Locale } from '#/i18n'
import { sessionQuery } from '#/lib/queries'
import type { User } from '#/lib/types'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context }) => {
    const [user, locale] = await Promise.all([context.queryClient.ensureQueryData(sessionQuery), readLocale()])
    return { user, locale }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#ececef' },
      { title: 'Horizon · هورايزن' },
      { name: 'description', content: 'A marketplace where every store is also a customer.' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // If beforeLoad threw (e.g. the backend is down), the shell still renders to show the
  // error page; context is then missing, so fall back instead of crashing the whole response.
  const context = Route.useRouteContext() as { locale?: Locale; user?: User | null }
  const locale: Locale = context.locale === 'ar' ? 'ar' : 'en'
  const user = context.user ?? null
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir}>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh">
        <Direction.Provider dir={dir}>
          <I18nProvider locale={locale}>
            <TooltipProvider delayDuration={300}>
              <div className="mx-auto min-h-dvh max-w-[1440px] bg-sheet sm:my-4 sm:min-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:shadow-[0_24px_60px_-30px_rgb(17_17_19/0.18)] lg:mx-6 xl:mx-auto">
                <SiteHeader user={user} />
                <main className="pb-24">{children}</main>
              </div>
              <Toaster dir={dir} position={dir === 'rtl' ? 'bottom-left' : 'bottom-right'} closeButton />
            </TooltipProvider>
          </I18nProvider>
        </Direction.Provider>
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{ position: 'bottom-left' }}
            plugins={[
              { name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> },
              TanStackQueryDevtools,
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  const { t } = useI18n()
  return (
    <div className="page-wrap flex flex-col items-center py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t('error.notFound')}</h1>
      <p className="mt-2 text-muted-foreground">{t('error.notFoundBody')}</p>
      <Button asChild className="mt-8">
        <Link to="/">{t('error.home')}</Link>
      </Button>
    </div>
  )
}
