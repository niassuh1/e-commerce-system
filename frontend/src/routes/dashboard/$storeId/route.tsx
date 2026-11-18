import { Link, Outlet, createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { ArrowUpRightIcon } from 'lucide-react'

import { Breadcrumbs, EmptyState } from '#/components/bits'
import { StoreAvatar } from '#/components/store-avatar'
import { Button } from '#/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { useI18n } from '#/i18n'
import { requireUser } from '#/lib/auth'

export const Route = createFileRoute('/dashboard/$storeId')({
  beforeLoad: ({ context, location, params }) => {
    const user = requireUser(context, location)
    const store = user.stores.find((entry) => entry.id === params.storeId)
    if (!store) throw notFound()
    return { user, store }
  },
  notFoundComponent: NotOwner,
  component: StoreDashboardLayout,
})

function NotOwner() {
  const { t } = useI18n()
  return (
    <div className="page-wrap py-16">
      <EmptyState
        title={t('dash.notOwner')}
        action={
          <Button asChild>
            <Link to="/dashboard">{t('dash.title')}</Link>
          </Button>
        }
      />
    </div>
  )
}

const TABS = [
  { to: '/dashboard/$storeId', key: 'dash.overview', exact: true },
  { to: '/dashboard/$storeId/products', key: 'dash.products', exact: false },
  { to: '/dashboard/$storeId/orders', key: 'dash.orders', exact: false },
  { to: '/dashboard/$storeId/settings', key: 'dash.settings', exact: false },
] as const

function StoreDashboardLayout() {
  const { t } = useI18n()
  const { store, user } = Route.useRouteContext()
  const navigate = useNavigate()

  return (
    <div className="page-wrap pt-2">
      <Breadcrumbs items={[{ label: t('dash.title'), to: '/dashboard' }, { label: store.name }]} />

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <StoreAvatar name={store.name} logoUrl={store.logo_url} size="lg" />
        <h1 className="min-w-0 flex-1 truncate text-3xl font-semibold tracking-tight sm:text-4xl">{store.name}</h1>
        {user.stores.length > 1 && (
          <Select
            value={store.id}
            onValueChange={(storeId) => navigate({ to: '/dashboard/$storeId', params: { storeId } })}
          >
            <SelectTrigger className="w-56" aria-label={t('dash.switchStore')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {user.stores.map((entry) => (
                <SelectItem key={entry.id} value={entry.id} className="rounded-xl">
                  <StoreAvatar name={entry.name} logoUrl={entry.logo_url} size="sm" />
                  {entry.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button asChild variant="outline">
          <Link to="/stores/$storeId" params={{ storeId: store.id }}>
            {t('dash.viewStorefront')}
            <ArrowUpRightIcon aria-hidden className="rtl:-scale-x-100" />
          </Link>
        </Button>
      </div>

      <nav aria-label={store.name} className="mt-6 flex gap-1.5 overflow-x-auto border-b pb-5">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            params={{ storeId: store.id }}
            activeOptions={{ exact: tab.exact }}
            className="inline-flex h-9 items-center rounded-full bg-pill px-4 text-sm whitespace-nowrap text-foreground no-underline transition-colors hover:bg-accent"
            activeProps={{ className: '!bg-foreground !text-background', 'aria-current': 'page' }}
          >
            {t(tab.key)}
          </Link>
        ))}
      </nav>

      <div className="pt-8">
        <Outlet />
      </div>
    </div>
  )
}
