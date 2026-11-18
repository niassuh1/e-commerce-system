import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowLeftIcon, Loader2Icon } from 'lucide-react'
import { z } from 'zod'

import { EmptyState, ProductImage } from '#/components/bits'
import { OrderJourney } from '#/components/order-journey'
import { StoreAvatar } from '#/components/store-avatar'
import { StatusBadge } from '#/components/status-badge'
import { Alert, AlertDescription } from '#/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import { useI18n } from '#/i18n'
import { requireUser } from '#/lib/auth'
import { orderRef } from '#/lib/lines'
import { useSetOrderStatus } from '#/lib/mutations'
import { orderQuery } from '#/lib/queries'
import { NEXT_STATUS, canCancel } from '#/lib/types'
import type { Order, User } from '#/lib/types'

export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: ({ context, location }) => ({ user: requireUser(context, location) }),
  loader: async ({ context, params }) => {
    if (!z.string().uuid().safeParse(params.orderId).success) throw notFound()
    try {
      await context.queryClient.ensureQueryData(orderQuery(params.orderId))
    } catch {
      throw notFound()
    }
  },
  notFoundComponent: OrderNotFound,
  component: OrderPage,
})

function OrderNotFound() {
  const { t } = useI18n()
  return (
    <div className="page-wrap py-16">
      <EmptyState
        title={t('orders.notFound')}
        action={
          <Button asChild>
            <Link to="/orders">{t('orders.back')}</Link>
          </Button>
        }
      />
    </div>
  )
}

function roles(order: Order, user: User) {
  const owned = new Set(user.stores.map((store) => store.id))
  return {
    isSeller: owned.has(order.store),
    isBuyer: order.buyer_user === user.id || (order.buyer_store !== null && owned.has(order.buyer_store)),
  }
}

function OrderPage() {
  const { t, money, dateTime, number } = useI18n()
  const { orderId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const { data: order } = useSuspenseQuery(orderQuery(orderId))
  const setStatus = useSetOrderStatus()
  const { isSeller, isBuyer } = roles(order, user)
  const next = NEXT_STATUS[order.status]
  const ref = orderRef(order.id)
  const freshPending = order.status === 'pending' && Date.now() - new Date(order.created_at).getTime() < 60_000

  const cancelReason =
    order.status === 'cancelled' && order.cancel_reason
      ? order.cancel_reason.startsWith('Insufficient stock')
        ? t('orders.reasonStock')
        : t('orders.reasonOther', { reason: order.cancel_reason })
      : null

  return (
    <div className="page-wrap pt-2">
      <Link
        to={isSeller && !isBuyer ? '/dashboard/$storeId/orders' : '/orders'}
        params={{ storeId: order.store }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden className="size-4 rtl:rotate-180" />
        {isSeller && !isBuyer ? t('dash.orders') : t('orders.back')}
      </Link>

      <div className="mt-4 overflow-hidden rounded-3xl border">
        <div className="flex flex-wrap items-start gap-4 p-6">
          <StoreAvatar name={order.store_name} logoUrl={order.store_logo_url} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="tabular text-2xl font-semibold tracking-tight">{t('orders.ref', { ref: `#${ref}` })}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <Link to="/stores/$storeId" params={{ storeId: order.store }} className="text-foreground">
                {order.store_name}
              </Link>{' '}
              · {t('orders.placedOn', { date: dateTime(order.created_at) })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isSeller && next && (
              <Button
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate({ orderId: order.id, status: next })}
              >
                {setStatus.isPending && <Loader2Icon className="animate-spin" aria-hidden />}
                {t(`advance.${next as 'confirmed' | 'shipped' | 'delivered'}`)}
              </Button>
            )}
            {(isBuyer || isSeller) && canCancel(order.status) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">{t('orders.cancel')}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('orders.cancelTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('orders.cancelBody')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('orders.keep')}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={() => setStatus.mutate({ orderId: order.id, status: 'cancelled' })}
                    >
                      {t('orders.cancel')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="border-t px-6 py-8">
          <OrderJourney status={order.status}  className="mx-auto max-w-3xl" />
          {freshPending && (
            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
              {t('orders.reserving')}
            </p>
          )}
          {cancelReason && (
            <Alert className="mx-auto mt-6 max-w-3xl">
              <AlertDescription>{cancelReason}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="items-heading" className="overflow-hidden rounded-3xl border">
          <h2 id="items-heading" className="border-b bg-muted/50 px-5 py-3 text-sm font-medium">
            {t('orders.items')} · <span className="tabular">{number(order.items.reduce((s, i) => s + i.quantity, 0))}</span>
          </h2>
          <ul className="divide-y">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                <ProductImage src={item.image_url} alt="" className="size-14 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  {item.product ? (
                    <Link
                      to="/stores/$storeId/products/$productId"
                      params={{ storeId: order.store, productId: item.product }}
                      className="line-clamp-2 text-sm font-medium text-foreground no-underline hover:underline"
                    >
                      {item.product_name}
                    </Link>
                  ) : (
                    <p className="line-clamp-2 text-sm font-medium">{item.product_name}</p>
                  )}
                  <p className="tabular text-sm text-muted-foreground">
                    {number(item.quantity)} × {money(item.unit_price)}
                  </p>
                </div>
                <span className="tabular text-sm font-semibold">{money(item.total_sum)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between border-t bg-muted/30 px-5 py-4">
            <span className="text-sm text-muted-foreground">{t('orders.total')}</span>
            <span className="tabular text-xl font-semibold">{money(order.total)}</span>
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <dl className="grid gap-4 rounded-3xl border p-5 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('orders.store')}</dt>
              <dd className="mt-1 flex items-center gap-2 font-medium">
                <StoreAvatar name={order.store_name} logoUrl={order.store_logo_url} size="sm" />
                {order.store_name}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('orders.buyer')}</dt>
              <dd className="mt-1 flex items-center gap-2 font-medium">
                {order.buyer_store ? (
                  <>
                    <StoreAvatar name={order.buyer_store_name ?? ''} size="sm" />
                    {order.buyer_store_name}
                  </>
                ) : order.buyer_user === user.id ? (
                  t('orders.you')
                ) : (
                  order.buyer_username
                )}
              </dd>
            </div>
          </dl>
          {isSeller && (
            <p className="rounded-3xl bg-tile p-4 text-sm text-muted-foreground">
              {t('orders.sellerNote')}{' '}
              <Link to="/dashboard/$storeId/orders" params={{ storeId: order.store }} className="text-foreground">
                {t('orders.manage')}
              </Link>
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
