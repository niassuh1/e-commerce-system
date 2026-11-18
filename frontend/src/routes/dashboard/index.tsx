import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowUpRightIcon, PlusIcon, StoreIcon } from 'lucide-react'

import { EmptyState, PageHeader } from '#/components/bits'
import { StoreAvatar } from '#/components/store-avatar'
import { Button } from '#/components/ui/button'
import { useI18n } from '#/i18n'
import { requireUser } from '#/lib/auth'

export const Route = createFileRoute('/dashboard/')({
  beforeLoad: ({ context, location }) => ({ user: requireUser(context, location) }),
  component: MyStoresPage,
})

function MyStoresPage() {
  const { t, month } = useI18n()
  const { user } = Route.useRouteContext()
  const stores = user.stores

  return (
    <div className="page-wrap pt-4">
      <PageHeader
        title={t('dash.title')}
        description={t('dash.subtitle')}
        actions={
          stores.length > 0 && (
            <Button asChild>
              <Link to="/stores/new">
                <PlusIcon aria-hidden />
                {t('dash.newStore')}
              </Link>
            </Button>
          )
        }
      />

      {stores.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<StoreIcon className="size-6" aria-hidden />}
          title={t('dash.empty')}
          description={t('dash.emptyHint')}
          action={
            <Button asChild>
              <Link to="/stores/new">{t('dash.newStore')}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stores.map((store) => (
            <li key={store.id}>
              <Link
                to="/dashboard/$storeId"
                params={{ storeId: store.id }}
                className="group flex items-center gap-4 rounded-3xl bg-tile p-4 text-foreground no-underline transition-colors hover:bg-accent"
              >
                <StoreAvatar name={store.name} logoUrl={store.logo_url} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[17px] font-medium">{store.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t('home.openedOn', { date: month(store.created_at) })}
                  </p>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground text-background">
                  <ArrowUpRightIcon
                    aria-hidden
                    className="size-[18px] transition-transform duration-500 ease-(--ease-out-expo) group-hover:rotate-45 rtl:-scale-x-100"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
