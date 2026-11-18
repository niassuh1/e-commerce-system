import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import { ProductImage } from '#/components/bits'
import { OrderJourney } from '#/components/order-journey'
import { OrdersTable } from '#/components/orders-table'
import { Button } from '#/components/ui/button'
import { useI18n } from '#/i18n'
import { productsQuery, storeOrdersQuery } from '#/lib/queries'
import type { OrderStatus } from '#/lib/types'

export const Route = createFileRoute('/dashboard/$storeId/')({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(storeOrdersQuery(params.storeId)),
      context.queryClient.ensureQueryData(productsQuery(params.storeId)),
    ]),
  component: Overview,
})

function Overview() {
  const { t, money, number } = useI18n()
  const { storeId } = Route.useParams()
  const navigate = useNavigate()
  const { data: orders } = useSuspenseQuery(storeOrdersQuery(storeId))
  const { data: products } = useSuspenseQuery(productsQuery(storeId))

  const counts: Partial<Record<OrderStatus, number>> = {}
  for (const order of orders) counts[order.status] = (counts[order.status] ?? 0) + 1
  const live = orders.filter((order) => order.status !== 'cancelled')
  const sales = live.reduce((sum, order) => sum + Number(order.total), 0)
  const lowStock = products.filter((product) => product.quantity <= 5).sort((a, b) => a.quantity - b.quantity)

  return (
    <div className="grid gap-10">
      <section aria-labelledby="line-heading" className="rounded-3xl border">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="line-heading" className="font-semibold">
              {t('dash.lineTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('dash.lineHint')}</p>
          </div>
          <dl className="text-end">
            <dt className="text-xs text-muted-foreground">{t('dash.sales')}</dt>
            <dd className="tabular text-lg font-semibold">
              {money(sales)}
              <span className="ms-2 text-sm font-normal text-muted-foreground">
                {t('dash.ordersCount', { count: live.length })}
              </span>
            </dd>
          </dl>
        </div>
        <div className="px-5 py-8">
          <OrderJourney
            counts={counts}
            className="mx-auto max-w-3xl"
            onStationClick={(station) =>
              navigate({ to: '/dashboard/$storeId/orders', params: { storeId }, search: { status: station } })
            }
          />
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="recent-heading" className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-heading" className="font-semibold">
              {t('dash.recentOrders')}
            </h2>
            {orders.length > 5 && (
              <Button asChild variant="link" size="sm">
                <Link to="/dashboard/$storeId/orders" params={{ storeId }}>
                  {t('dash.seeAll')}
                </Link>
              </Button>
            )}
          </div>
          {orders.length === 0 ? (
            <p className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">{t('dash.noOrders')}</p>
          ) : (
            <OrdersTable orders={orders.slice(0, 5)} perspective="seller" />
          )}
        </section>

        <section aria-labelledby="stock-heading">
          <h2 id="stock-heading" className="font-semibold">
            {t('dash.lowStock')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('dash.lowStockHint')}</p>
          {lowStock.length === 0 ? (
            <p className="mt-3 rounded-3xl border border-dashed p-5 text-sm text-muted-foreground">
              {t('dash.allStocked')}
            </p>
          ) : (
            <ul className="mt-3 divide-y rounded-3xl border">
              {lowStock.slice(0, 6).map((product) => (
                <li key={product.id} className="flex items-center gap-3 p-3">
                  <ProductImage src={product.image_url} alt="" className="size-10 shrink-0 rounded-2xl" />
                  <span className="min-w-0 flex-1 truncate text-sm">{product.name}</span>
                  <span
                    className={
                      product.quantity === 0
                        ? 'tabular text-sm font-semibold text-destructive'
                        : 'tabular text-sm font-semibold text-warning'
                    }
                  >
                    {number(product.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="outline" className="mt-3 w-full">
            <Link to="/dashboard/$storeId/products" params={{ storeId }}>
              {t('dash.manageProducts')}
            </Link>
          </Button>
        </section>
      </div>
    </div>
  )
}
