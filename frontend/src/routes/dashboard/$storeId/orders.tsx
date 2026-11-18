import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import { EmptyState } from '#/components/bits'
import { OrderJourney } from '#/components/order-journey'
import { OrdersTable } from '#/components/orders-table'
import { Button } from '#/components/ui/button'
import { useI18n } from '#/i18n'
import { storeOrdersQuery } from '#/lib/queries'
import { ORDER_STATUSES } from '#/lib/types'
import type { OrderStatus } from '#/lib/types'
import { z } from 'zod'

export const Route = createFileRoute('/dashboard/$storeId/orders')({
  validateSearch: z.object({ status: z.enum(ORDER_STATUSES).optional() }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(storeOrdersQuery(params.storeId)),
  component: StoreOrdersPage,
})

function StoreOrdersPage() {
  const { t, number } = useI18n()
  const { storeId } = Route.useParams()
  const { status } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data: orders } = useSuspenseQuery(storeOrdersQuery(storeId))

  const counts: Partial<Record<OrderStatus, number>> = {}
  for (const order of orders) counts[order.status] = (counts[order.status] ?? 0) + 1
  const visible = status ? orders.filter((order) => order.status === status) : orders

  const select = (next: OrderStatus | undefined) =>
    navigate({ search: { status: next === status ? undefined : next }, replace: true })

  return (
    <div>
      <div>
        <h2 className="text-lg font-semibold">{t('dash.orders')}</h2>
        <p className="text-sm text-muted-foreground">{t('so.subtitle')}</p>
      </div>

      {orders.length === 0 ? (
        <EmptyState className="mt-6" title={t('dash.noOrders')} />
      ) : (
        <>
          <div className="mt-6 rounded-3xl border px-5 py-6">
            <OrderJourney
              counts={counts}
              activeStation={status ?? null}
              onStationClick={select}
              className="mx-auto max-w-3xl"
            />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
              <Button size="sm" variant={status ? 'ghost' : 'secondary'} onClick={() => select(undefined)}>
                {t('orders.tabAll')} <span className="tabular text-muted-foreground">{number(orders.length)}</span>
              </Button>
              <Button
                size="sm"
                variant={status === 'cancelled' ? 'secondary' : 'ghost'}
                onClick={() => select('cancelled')}
              >
                {t('orders.tabCancelled')}{' '}
                <span className="tabular text-muted-foreground">{number(counts.cancelled ?? 0)}</span>
              </Button>
            </div>
          </div>

          <div className="mt-6">
            {visible.length === 0 ? (
              <EmptyState title={t('orders.emptyFiltered')} />
            ) : (
              <OrdersTable orders={visible} perspective="seller" />
            )}
          </div>
        </>
      )}
    </div>
  )
}
