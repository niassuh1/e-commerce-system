import { useMemo } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { ArrowUpRightIcon, PlusIcon, SearchIcon, StoreIcon } from 'lucide-react'
import { z } from 'zod'

import { EmptyState, ProductImage } from '#/components/bits'
import { OrderJourney } from '#/components/order-journey'
import { PillTabs } from '#/components/pill-tabs'
import { StatusBadge } from '#/components/status-badge'
import { StoreAvatar } from '#/components/store-avatar'
import { Button } from '#/components/ui/button'
import { useI18n } from '#/i18n'
import { orderRef } from '#/lib/lines'
import { myOrdersQuery, storeShowcaseQuery } from '#/lib/queries'
import type { OrderSummary } from '#/lib/types'
import type { listStoreShowcase } from '#/server/functions'

export const Route = createFileRoute('/')({
  validateSearch: z.object({
    q: z.string().optional(),
    filter: z.enum(['all', 'mine']).optional(),
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(storeShowcaseQuery),
  component: StoresPage,
})

type ShowcaseStore = Awaited<ReturnType<typeof listStoreShowcase>>[number]

function StoresPage() {
  const { t } = useI18n()
  const navigate = useNavigate({ from: '/' })
  const { q = '', filter = 'all' } = Route.useSearch()
  const { user } = Route.useRouteContext()
  const { data: stores } = useSuspenseQuery(storeShowcaseQuery)
  const { data: orders } = useQuery({ ...myOrdersQuery, enabled: Boolean(user) })

  const latestActive = orders?.find((order) => order.status !== 'delivered' && order.status !== 'cancelled')

  const visible = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase()
    return stores.filter(
      (store) =>
        (filter === 'all' || store.owner_user === user?.id) &&
        (!needle || store.name.toLocaleLowerCase().includes(needle)),
    )
  }, [stores, q, filter, user?.id])

  return (
    <div className="page-wrap pt-4">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('home.title')}</h1>
          <p className="mt-1.5 text-muted-foreground">{t('home.count', { count: stores.length })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user && (
            <PillTabs
              label={t('home.title')}
              value={filter}
              onChange={(value) => navigate({ search: (prev) => ({ ...prev, filter: value === 'all' ? undefined : value }) })}
              options={[
                { value: 'all', label: t('home.filterAll') },
                { value: 'mine', label: t('home.filterMine') },
              ]}
            />
          )}
          <div className="relative lg:hidden">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={q}
              onChange={(event) =>
                navigate({ search: (prev) => ({ ...prev, q: event.target.value || undefined }), replace: true })
              }
              placeholder={t('home.search')}
              aria-label={t('home.search')}
              className="h-9 w-48 rounded-full border border-input bg-background ps-10 pe-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-foreground"
            />
          </div>
          {user && (
            <Button asChild variant="outline" size="sm">
              <Link to="/stores/new">
                <PlusIcon aria-hidden />
                {t('home.openStore')}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {latestActive && <LatestOrder order={latestActive} />}

      {visible.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<StoreIcon className="size-6" aria-hidden />}
          title={q ? t('home.noResults', { query: q }) : filter === 'mine' ? t('home.noneMine') : t('home.empty')}
          action={
            user &&
            !q && (
              <Button asChild>
                <Link to="/stores/new">{t('home.openStore')}</Link>
              </Button>
            )
          }
        />
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((store) => (
            <li key={store.id}>
              <StoreCard store={store} isMine={store.owner_user === user?.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StoreCard({ store, isMine }: { store: ShowcaseStore; isMine: boolean }) {
  const { t, month } = useI18n()
  const [lead, ...rest] = store.preview

  return (
    <article className="group flex flex-col gap-3">
      <Link
        to="/stores/$storeId"
        params={{ storeId: store.id }}
        className="relative block overflow-hidden rounded-3xl bg-tile text-foreground no-underline"
      >
        <div className="grid aspect-[4/5] grid-cols-[1fr_38%] gap-1">
          {lead ? (
            <ProductImage
              src={lead.image_url}
              alt=""
              className={rest.length ? 'h-full' : 'col-span-2 h-full'}
            />
          ) : (
            <div className="col-span-2 grid place-items-center">
              <StoreAvatar name={store.name} logoUrl={store.logo_url} size="xl" />
            </div>
          )}
          {rest.length > 0 && (
            <div className="grid gap-1">
              {rest.map((item) => (
                <ProductImage key={item.id} src={item.image_url} alt="" className="h-full" />
              ))}
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-2.5 bg-gradient-to-t from-white/95 via-white/70 to-transparent p-3 pt-14 sm:gap-3 sm:p-4 sm:pt-16">
          <StoreAvatar name={store.name} logoUrl={store.logo_url} size="md" className="hidden sm:inline-grid" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-medium sm:text-[17px]">{store.name}</h2>
            <p className="text-xs text-muted-foreground">
              {t('store.products', { count: store.product_count })} ·{' '}
              {t('home.openedOn', { date: month(store.created_at) })}
            </p>
          </div>
        </div>
        {isMine && (
          <span className="absolute start-3 top-3 rounded-full bg-foreground px-3 py-1 text-[11px] font-medium text-background">
            {t('home.yours')}
          </span>
        )}
      </Link>
      <div className="flex items-center gap-2">
        <Link
          to="/stores/$storeId"
          params={{ storeId: store.id }}
          tabIndex={-1}
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground text-background"
        >
          <ArrowUpRightIcon className="size-[18px] transition-transform duration-500 ease-(--ease-out-expo) group-hover:rotate-45 rtl:-scale-x-100 rtl:group-hover:-rotate-45" />
        </Link>
        <Link
          to="/stores/$storeId"
          params={{ storeId: store.id }}
          className="flex h-11 flex-1 items-center justify-center rounded-full border border-input text-[15px] text-foreground no-underline transition-colors hover:bg-pill"
        >
          {t('home.visit')}
        </Link>
      </div>
    </article>
  )
}

/** One slim line, so the store imagery still leads the page. */
function LatestOrder({ order }: { order: OrderSummary }) {
  const { t, money } = useI18n()
  return (
    <Link
      to="/orders/$orderId"
      params={{ orderId: order.id }}
      aria-label={`${t('home.latestOrder')}: ${order.store_name} #${orderRef(order.id)}`}
      className="group mt-6 flex items-center gap-3 rounded-full bg-tile py-1.5 ps-1.5 pe-1.5 text-foreground no-underline transition-colors hover:bg-accent"
    >
      <StoreAvatar name={order.store_name} logoUrl={order.store_logo_url} size="md" />
      <p className="min-w-0 flex-1 text-sm leading-snug sm:truncate">
        <span className="hidden text-muted-foreground sm:inline">{t('home.latestOrder')} · </span>
        <span className="font-medium">{order.store_name}</span>{' '}
        <span className="tabular text-muted-foreground">
          #{orderRef(order.id)} · {money(order.total)}
        </span>
      </p>
      <OrderJourney variant="compact" status={order.status} className="hidden md:flex" />
      <StatusBadge status={order.status} className="bg-background" />
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground text-background">
        <ArrowUpRightIcon
          aria-hidden
          className="size-4 transition-transform duration-500 ease-(--ease-out-expo) group-hover:rotate-45 rtl:-scale-x-100 rtl:group-hover:-rotate-45"
        />
      </span>
    </Link>
  )
}
