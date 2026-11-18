import { useState } from 'react'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { ArrowUpRightIcon, Loader2Icon } from 'lucide-react'
import { z } from 'zod'

import { EmptyState, ProductImage, QuantityStepper, StockNote } from '#/components/bits'
import { StoreAvatar } from '#/components/store-avatar'
import { Button } from '#/components/ui/button'
import { useI18n } from '#/i18n'
import { useAddToCart } from '#/lib/mutations'
import { cartsQuery, productQuery, storeQuery } from '#/lib/queries'

export const Route = createFileRoute('/stores/$storeId/products/$productId')({
  loader: async ({ context, params }) => {
    const ids = z.object({ storeId: z.string().uuid(), productId: z.string().uuid() })
    if (!ids.safeParse(params).success) throw notFound()
    try {
      await Promise.all([
        context.queryClient.ensureQueryData(storeQuery(params.storeId)),
        context.queryClient.ensureQueryData(productQuery(params.storeId, params.productId)),
      ])
    } catch {
      throw notFound()
    }
  },
  notFoundComponent: ProductNotFound,
  component: ProductPage,
})

function ProductNotFound() {
  const { t } = useI18n()
  return (
    <div className="page-wrap py-16">
      <EmptyState
        title={t('product.notFound')}
        action={
          <Button asChild>
            <Link to="/">{t('error.home')}</Link>
          </Button>
        }
      />
    </div>
  )
}

function ProductPage() {
  const { t, money } = useI18n()
  const { storeId, productId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const { data: store } = useSuspenseQuery(storeQuery(storeId))
  const { data: product } = useSuspenseQuery(productQuery(storeId, productId))
  const { data: carts } = useQuery({ ...cartsQuery, enabled: Boolean(user) })
  const add = useAddToCart()

  const inCart =
    carts?.find((cart) => cart.store.id === storeId)?.items.find((line) => line.product_id === productId)?.quantity ??
    0
  const remaining = Math.max(0, product.quantity - inCart)
  const [quantity, setQuantity] = useState(1)
  const isOwner = store.owner_user === user?.id
  const safeQuantity = Math.min(quantity, Math.max(1, remaining))

  return (
    <div className="page-wrap pt-2">
      <nav aria-label={t('nav.breadcrumb')} className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="text-muted-foreground no-underline hover:text-foreground">
          {t('nav.stores')}
        </Link>
        <span aria-hidden>/</span>
        <Link
          to="/stores/$storeId"
          params={{ storeId }}
          className="text-muted-foreground no-underline hover:text-foreground"
        >
          {store.name}
        </Link>
        <span aria-hidden>/</span>
        <span aria-current="page" className="truncate text-foreground">
          {product.name}
        </span>
      </nav>

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
        <ProductImage src={product.image_url} alt={product.name} className="aspect-[4/5] rounded-3xl md:aspect-square" />

        <div className="flex flex-col py-2">
          <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">{product.name}</h1>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="tabular inline-flex h-12 items-center rounded-full border border-input px-6 text-xl">
              {money(product.price)}
            </span>
            <Link
              to="/stores/$storeId"
              params={{ storeId }}
              className="flex h-12 items-center gap-2.5 rounded-full bg-pill ps-1.5 pe-5 text-sm text-foreground no-underline hover:bg-accent"
            >
              <StoreAvatar name={store.name} logoUrl={store.logo_url} size="md" />
              <span>
                <span className="text-muted-foreground">{t('product.soldBy')} </span>
                {store.name}
              </span>
            </Link>
          </div>
          <StockNote quantity={product.quantity} className="mt-4 text-sm" />

          <div className="mt-10 border-t pt-8">
            {isOwner ? (
              <div className="rounded-3xl bg-tile p-6">
                <p className="text-sm">{t('product.ownStore')}</p>
                <Button asChild variant="outline" className="mt-4 bg-background">
                  <Link to="/dashboard/$storeId/products" params={{ storeId }}>
                    {t('product.editInDashboard')}
                  </Link>
                </Button>
              </div>
            ) : !user ? (
              <Button asChild size="lg">
                <Link to="/login" search={{ redirect: `/stores/${storeId}/products/${productId}` }}>
                  {t('product.signInToBuy')}
                </Link>
              </Button>
            ) : (
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <QuantityStepper
                    label={t('product.quantity')}
                    value={safeQuantity}
                    max={Math.max(1, remaining)}
                    onChange={setQuantity}
                    disabled={remaining <= 0}
                  />
                  <button
                    type="button"
                    disabled={remaining <= 0 || add.isPending}
                    onClick={() =>
                      add.mutate(
                        { storeId, storeName: store.name, productId, quantity: safeQuantity },
                        { onSuccess: () => setQuantity(1) },
                      )
                    }
                    className="group flex h-12 flex-1 items-center justify-between gap-4 rounded-full bg-foreground ps-6 pe-1.5 text-background transition-colors disabled:bg-pill disabled:text-muted-foreground sm:max-w-80"
                  >
                    <span className="font-medium">{t('product.add')}</span>
                    <span className="grid size-9 place-items-center rounded-full bg-background text-foreground transition-transform duration-500 ease-(--ease-out-expo) group-hover:rotate-45">
                      {add.isPending ? (
                        <Loader2Icon className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <ArrowUpRightIcon className="size-4 rtl:-scale-x-100" aria-hidden />
                      )}
                    </span>
                  </button>
                </div>
                {inCart > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {remaining <= 0 ? t('product.maxed') : t('product.inCart', { count: inCart })} ·{' '}
                    <Link to="/cart" hash={storeId} className="text-foreground">
                      {t('store.checkoutHere')}
                    </Link>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
