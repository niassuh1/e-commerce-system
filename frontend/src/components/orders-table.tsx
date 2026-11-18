import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronRightIcon, Loader2Icon, MoreHorizontalIcon } from 'lucide-react'

import { OrderJourney } from '#/components/order-journey'
import { StoreAvatar } from '#/components/store-avatar'
import { StatusBadge } from '#/components/status-badge'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import { useI18n } from '#/i18n'
import { orderRef } from '#/lib/lines'
import { useSetOrderStatus } from '#/lib/mutations'
import { NEXT_STATUS, canCancel } from '#/lib/types'
import type { OrderSummary } from '#/lib/types'

/**
 * Orders as rows, each with its mini journey line.
 * Buyers see the store they ordered from; sellers see who bought and can move the order forward.
 */
export function OrdersTable({ orders, perspective }: { orders: OrderSummary[]; perspective: 'buyer' | 'seller' }) {
  const { t, money, date, number } = useI18n()
  const navigate = useNavigate()

  return (
    <>
    {/* Phones: stacked rows, so the status pill and total are never clipped */}
    <ul className="grid gap-2 sm:hidden">
      {orders.map((order) => {
        const party = perspective === 'buyer' ? order.store_name : (order.buyer_store_name ?? order.buyer_username ?? '')
        return (
          <li key={order.id} className="rounded-3xl bg-tile p-4">
            <Link
              to="/orders/$orderId"
              params={{ orderId: order.id }}
              aria-label={t('orders.openOrder', { ref: orderRef(order.id) })}
              className="flex items-center gap-3 text-foreground no-underline"
            >
              <StoreAvatar
                name={party}
                logoUrl={perspective === 'buyer' ? order.store_logo_url : undefined}
                size="md"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{party}</span>
                <span className="tabular block text-xs text-muted-foreground">
                  #{orderRef(order.id)} · {date(order.created_at)}
                </span>
              </span>
              <span className="tabular text-sm font-medium">{money(order.total)}</span>
            </Link>
            <div className="mt-3 flex items-center justify-between gap-3">
              <StatusBadge status={order.status} className="bg-background" />
              {perspective === 'seller' ? (
                <SellerActions order={order} />
              ) : (
                <OrderJourney variant="compact" status={order.status} />
              )}
            </div>
          </li>
        )
      })}
    </ul>
    <div className="hidden overflow-hidden rounded-3xl border sm:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="ps-5">{t('orders.ref', { ref: '' }).trim()}</TableHead>
            <TableHead>{perspective === 'buyer' ? t('orders.store') : t('orders.buyer')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('orders.date')}</TableHead>
            <TableHead className="hidden text-end sm:table-cell">{t('orders.items')}</TableHead>
            <TableHead className="text-end">{t('orders.total')}</TableHead>
            <TableHead className="hidden lg:table-cell">{t('orders.progress')}</TableHead>
            <TableHead>{t('orders.status')}</TableHead>
            <TableHead className="w-px pe-5">
              <span className="sr-only">{t('orders.view')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const ref = orderRef(order.id)
            const open = () => navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
            return (
              <TableRow key={order.id} className="cursor-pointer" onClick={open}>
                <TableCell className="ps-5">
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: order.id }}
                    onClick={(event) => event.stopPropagation()}
                    className="tabular font-medium text-foreground no-underline hover:underline"
                    aria-label={t('orders.openOrder', { ref })}
                  >
                    #{ref}
                  </Link>
                </TableCell>
                <TableCell>
                  {perspective === 'buyer' ? (
                    <span className="flex items-center gap-2">
                      <StoreAvatar name={order.store_name} logoUrl={order.store_logo_url} size="sm" />
                      <span className="max-w-48 truncate">{order.store_name}</span>
                      {order.buyer_store_name && (
                        <span className="hidden text-xs text-muted-foreground xl:inline">
                          {t('orders.asStore', { store: order.buyer_store_name })}
                        </span>
                      )}
                    </span>
                  ) : order.buyer_store ? (
                    <span className="flex items-center gap-2">
                      <StoreAvatar name={order.buyer_store_name ?? ''} size="sm" />
                      <span className="max-w-48 truncate">{order.buyer_store_name}</span>
                    </span>
                  ) : (
                    <span className="max-w-48 truncate">{order.buyer_username}</span>
                  )}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{date(order.created_at)}</TableCell>
                <TableCell className="tabular hidden text-end sm:table-cell">{number(order.item_count)}</TableCell>
                <TableCell className="tabular text-end font-medium">{money(order.total)}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <OrderJourney variant="compact" status={order.status} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell className="pe-5" onClick={(event) => event.stopPropagation()}>
                  {perspective === 'seller' ? (
                    <SellerActions order={order} />
                  ) : (
                    <ChevronRightIcon aria-hidden className="size-4 text-muted-foreground rtl:rotate-180" />
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
    </>
  )
}

function SellerActions({ order }: { order: OrderSummary }) {
  const { t } = useI18n()
  const setStatus = useSetOrderStatus()
  const next = NEXT_STATUS[order.status]
  const ref = orderRef(order.id)

  return (
    <div className="flex items-center justify-end gap-1">
      {next ? (
        <Button
          size="sm"
          variant="outline"
          className="min-w-28"
          disabled={setStatus.isPending}
          onClick={() => setStatus.mutate({ orderId: order.id, status: next })}
        >
          {setStatus.isPending && <Loader2Icon className="animate-spin" aria-hidden />}
          {t(`advance.${next as 'confirmed' | 'shipped' | 'delivered'}`)}
        </Button>
      ) : (
        <span className="min-w-28 text-center text-xs text-muted-foreground">{t('so.done')}</span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t('so.moreActions', { ref })}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to="/orders/$orderId" params={{ orderId: order.id }}>
              {t('orders.view')}
            </Link>
          </DropdownMenuItem>
          {canCancel(order.status) && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setStatus.mutate({ orderId: order.id, status: 'cancelled' })}
            >
              {t('orders.cancel')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
