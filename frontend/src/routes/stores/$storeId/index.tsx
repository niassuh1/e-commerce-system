import { useMemo } from 'react'
import { Link, createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { PlusIcon, SearchIcon, SettingsIcon } from 'lucide-react'
import { z } from 'zod'

import { Breadcrumbs, EmptyState } from '#/components/bits'
import { PillTabs } from '#/components/pill-tabs'
import { ProductCard } from '#/components/product-card'
import { StoreAvatar } from '#/components/store-avatar'
import { Button } from '#/components/ui/button'
import { useI18n } from '#/i18n'
import { cartsQuery, productsQuery, storeQuery } from '#/lib/queries'

const sorts = ['name', 'price-asc', 'price-desc'] as const
type Sort = (typeof sorts)[number]

export const Route = createFileRoute('/stores/$storeId/')({
  validateSearch: z.object({
    q: z.string().optional(),
    sort: z.enum(sorts).optional(),
  }),
  loader: async ({ context, params }) => {
    if (!z.string().uuid().safeParse(params.storeId).success) throw notFound()
    try {
      await Promise.all([
        context.queryClient.ensureQueryData(storeQuery(params.storeId)),
        context.queryClient.ensureQueryData(productsQuery(params.storeId)),
      ])
    } catch {
      // The store middleware answers an unknown id with 403 "x-store-id required"
      throw notFound()
    }
  },
  notFoundComponent: StoreNotFound,
  component: StorePage,
})

function StoreNotFound() {
  const { t } = useI18n()
  return (
    <div className="page-wrap py-16">
      <EmptyState
        title={t('store.notFound')}
        action={
          <Button asChild>
            <Link to="/">{t('error.home')}</Link>
          </Button>
        }
      />
    </div>
  )
}

function StorePage() {
  const { t, month } = useI18n()
  const { storeId } = Route.useParams()
  const { q = '', sort = 'name' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { user } = Route.useRouteContext()
  const { data: store } = useSuspenseQuery(storeQuery(storeId))
  const { data: products } = useSuspenseQuery(productsQuery(storeId))
  const { data: carts } = useQuery({ ...cartsQuery, enabled: Boolean(user) })

  const isOwner = store.owner_user === user?.id
  const cart = carts?.find((entry) => entry.store.id === storeId)
  const inCart = (productId: string) => cart?.items.find((line) => line.product_id === productId)?.quantity ?? 0
  const mode = isOwner ? 'owner' : user ? 'buy' : 'signin'

  const visible = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase()
    const list = products.filter((product) => !needle || product.name.toLocaleLowerCase().includes(needle))
    if (sort === 'price-asc') return [...list].sort((a, b) => Number(a.price) - Number(b.price))
    if (sort === 'price-desc') return [...list].sort((a, b) => Number(b.price) - Number(a.price))
    return list
  }, [products, q, sort])

  return (
    <div className="page-wrap pt-2">
      <Breadcrumbs items={[{ label: t('nav.stores'), to: '/' }, { label: store.name }]} />

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <StoreAvatar name={store.name} logoUrl={store.logo_url} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-3xl font-semibold tracking-tight sm:text-4xl">{store.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('store.products', { count: products.length })} · {t('home.openedOn', { date: month(store.created_at) })}
          </p>
        </div>
        {isOwner && (
          <Button asChild variant="outline">
            <Link to="/dashboard/$storeId" params={{ storeId }}>
              <SettingsIcon aria-hidden />
              {t('store.manage')}
            </Link>
          </Button>
        )}
      </div>

      {products.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b pb-5">
          <PillTabs<Sort>
            label={t('store.sort')}
            value={sort}
            onChange={(value) =>
              navigate({ search: (prev) => ({ ...prev, sort: value === 'name' ? undefined : value }), replace: true })
            }
            options={[
              { value: 'name', label: t('store.sortName') },
              { value: 'price-asc', label: t('store.sortPriceAsc') },
              { value: 'price-desc', label: t('store.sortPriceDesc') },
            ]}
          />
          <div className="relative w-full sm:w-64">
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
              placeholder={t('store.search')}
              aria-label={t('store.search')}
              className="h-10 w-full rounded-full border border-input bg-background ps-10 pe-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-foreground"
            />
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={isOwner ? t('store.emptyOwner') : t('store.empty')}
          action={
            isOwner && (
              <Button asChild>
                <Link to="/dashboard/$storeId/products" params={{ storeId }} search={{ new: true }}>
                  <PlusIcon aria-hidden />
                  {t('pm.add')}
                </Link>
              </Button>
            )
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState className="mt-8" title={t('store.noResults', { query: q })} />
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-5">
          {visible.map((product) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                storeId={storeId}
                storeName={store.name}
                inCart={inCart(product.id)}
                mode={mode}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
