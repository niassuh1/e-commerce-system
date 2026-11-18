import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { PackageIcon } from 'lucide-react'
import { z } from 'zod'

import { EmptyState, PageHeader } from '#/components/bits'
import { OrdersTable } from '#/components/orders-table'
import { Button } from '#/components/ui/button'
import { PillTabs } from '#/components/pill-tabs'
import { useI18n } from '#/i18n'
import { requireUser } from '#/lib/auth'
import { myOrdersQuery } from '#/lib/queries'
import { ORDER_VIEWS as views, filterOrders } from '#/lib/types'
import type { OrderView as View } from '#/lib/types'

export const Route = createFileRoute('/orders/')({
  validateSearch: z.object({ view: z.enum(views).optional() }),
  beforeLoad: ({ context, location }) => ({ user: requireUser(context, location) }),
  loader: ({ context }) => context.queryClient.ensureQueryData(myOrdersQuery),
  component: OrdersPage,
})

function OrdersPage() {
  const { t, number } = useI18n()
  const { view = 'all' } = Route.useSearch()
  const navigate = useNavigate({ from: '/orders/' })
  const { data: orders } = useSuspenseQuery(myOrdersQuery)
  const visible = filterOrders(orders, view)

  const labels: Record<View, string> = {
    all: t('orders.tabAll'),
    active: t('orders.tabActive'),
    delivered: t('orders.tabDelivered'),
    cancelled: t('orders.tabCancelled'),
  }

  return (
    <div className="page-wrap pt-4">
      <PageHeader title={t('orders.title')} description={t('orders.subtitle')} />

      {orders.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<PackageIcon className="size-6" aria-hidden />}
          title={t('orders.empty')}
          description={t('orders.emptyHint')}
          action={
            <Button asChild>
              <Link to="/">{t('cart.browse')}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <PillTabs<View>
            className="mt-6"
            label={t('orders.title')}
            value={view}
            onChange={(value) => navigate({ search: { view: value === 'all' ? undefined : value } })}
            options={views.map((key) => ({
              value: key,
              label: (
                <>
                  {labels[key]}
                  <span className="tabular opacity-60">{number(filterOrders(orders, key).length)}</span>
                </>
              ),
            }))}
          />
          <div className="mt-6">
            {visible.length === 0 ? (
              <EmptyState title={t('orders.emptyFiltered')} />
            ) : (
              <OrdersTable orders={visible} perspective="buyer" />
            )}
          </div>
        </>
      )}
    </div>
  )
}
