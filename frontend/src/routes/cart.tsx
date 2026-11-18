import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Loader2Icon, ShoppingBagIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState, PageHeader, ProductImage, QuantityStepper } from '#/components/bits'
import { StoreAvatar } from '#/components/store-avatar'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import { errorMessage, useI18n } from '#/i18n'
import { requireUser } from '#/lib/auth'
import { useSetCartQuantity } from '#/lib/mutations'
import { cartsQuery } from '#/lib/queries'
import type { Cart, Store } from '#/lib/types'
import { checkout, clearCart } from '#/server/functions'

export const Route = createFileRoute('/cart')({
  beforeLoad: ({ context, location }) => ({ user: requireUser(context, location) }),
  loader: ({ context }) => context.queryClient.ensureQueryData(cartsQuery),
  component: CartsPage,
})

function CartsPage() {
  const { t } = useI18n()
  const { user } = Route.useRouteContext()
  const { data: carts } = useSuspenseQuery(cartsQuery)

  return (
    <div className="page-wrap pt-4">
      <PageHeader title={t('cart.title')} description={t('cart.subtitle')} />

      {carts.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<ShoppingBagIcon className="size-6" aria-hidden />}
          title={t('cart.empty')}
          description={t('cart.emptyHint')}
          action={
            <Button asChild>
              <Link to="/">{t('cart.browse')}</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-8 grid gap-8">
          {carts.map((cart) => (
            <CartBlock key={cart.store.id} cart={cart} ownedStores={user.stores} username={user.username} />
          ))}
        </div>
      )}
    </div>
  )
}

function CartBlock({ cart, ownedStores, username }: { cart: Cart; ownedStores: Store[]; username: string }) {
  const i18n = useI18n()
  const { t, money } = i18n
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setQuantity = useSetCartQuantity()
  const storeId = cart.store.id

  // A store can't buy from itself, so it's not offered as a buyer for its own cart.
  const buyerStores = ownedStores.filter((store) => store.id !== storeId)
  const [buyer, setBuyer] = useState<string>('me')

  const placeOrder = useMutation({
    mutationFn: () => checkout({ data: { storeId, buyerStoreId: buyer === 'me' ? null : buyer } }),
    onSuccess: async (order) => {
      toast.success(t('cart.placed', { store: cart.store.name }))
      await queryClient.invalidateQueries({ queryKey: ['carts'] })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    },
    onError: (error) => toast.error(errorMessage(i18n, error)),
  })

  const empty = useMutation({
    mutationFn: () => clearCart({ data: storeId }),
    onSuccess: () => {
      toast(t('cart.cleared'))
      return queryClient.invalidateQueries({ queryKey: ['carts'] })
    },
    onError: (error) => toast.error(errorMessage(i18n, error)),
  })

  return (
    <section id={storeId} aria-labelledby={`cart-${storeId}`} className="scroll-mt-24 overflow-hidden rounded-3xl border">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-4 sm:px-5">
        <StoreAvatar name={cart.store.name} logoUrl={cart.store.logo_url} />
        <div className="min-w-0 flex-1 basis-40">
          <h2 id={`cart-${storeId}`} className="truncate text-lg font-semibold">
            {cart.store.name}
          </h2>
          <p className="text-sm text-muted-foreground">{t('carts.items', { count: cart.item_count })}</p>
        </div>
        <div className="flex w-full gap-1 sm:w-auto">
        <Button asChild variant="ghost" size="sm" className="bg-pill sm:bg-transparent">
          <Link to="/stores/$storeId" params={{ storeId }}>
            {t('cart.visitStore')}
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => empty.mutate()}
          disabled={empty.isPending}
          className="text-muted-foreground"
        >
          {t('cart.clear')}
        </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
        <ul className="divide-y">
          {cart.items.map((line) => (
            <li key={line.product_id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:flex-nowrap sm:px-5">
              <ProductImage src={line.image_url} alt="" className="size-16 shrink-0 rounded-2xl sm:size-20" />
              <div className="min-w-0 flex-1 basis-[calc(100%-5rem)] sm:basis-auto">
                <Link
                  to="/stores/$storeId/products/$productId"
                  params={{ storeId, productId: line.product_id }}
                  className="line-clamp-2 text-sm font-medium text-foreground no-underline hover:underline"
                >
                  {line.name}
                </Link>
                <p className="tabular mt-0.5 text-sm text-muted-foreground">
                  {money(line.price)}
                  {line.quantity > 1 && <span className="sm:hidden"> · {money(line.line_total)}</span>}
                </p>
              </div>
              <div className="ms-20 flex items-center gap-2 sm:ms-0 sm:flex-col sm:gap-1">
                <QuantityStepper
                  size="sm"
                  label={`${t('cart.quantity')}: ${line.name}`}
                  value={line.quantity}
                  max={line.available}
                  onChange={(quantity) => setQuantity.mutate({ storeId, productId: line.product_id, quantity })}
                />
                <span className="tabular text-[11px] text-muted-foreground">
                  {t('cart.capacity', { count: line.available })}
                </span>
              </div>
              <span className="tabular hidden w-28 text-end text-sm font-semibold sm:block">
                {money(line.line_total)}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('cart.removeItem', { name: line.name })}
                onClick={() => setQuantity.mutate({ storeId, productId: line.product_id, quantity: 0 })}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>

        <div className="border-t bg-tile p-6 lg:border-t-0">
          <dl className="flex items-baseline justify-between">
            <dt className="text-sm text-muted-foreground">{t('cart.subtotal')}</dt>
            <dd className="tabular text-2xl font-semibold">{money(cart.subtotal)}</dd>
          </dl>

          <fieldset className="mt-6">
            <legend className="text-sm font-medium">{t('cart.buyAs')}</legend>
            <RadioGroup value={buyer} onValueChange={setBuyer} className="mt-3 gap-2" dir={i18n.dir}>
              <BuyerOption value="me" id={`${storeId}-me`} label={t('cart.buyAsMe')} detail={username} />
              {buyerStores.map((store) => (
                <BuyerOption
                  key={store.id}
                  value={store.id}
                  id={`${storeId}-${store.id}`}
                  label={store.name}
                  detail={t('cart.buyAsStore')}
                  roundel={<StoreAvatar name={store.name} logoUrl={store.logo_url} size="sm" />}
                />
              ))}
            </RadioGroup>
            {buyer !== 'me' && <p className="mt-2 text-xs text-muted-foreground">{t('cart.buyAsStoreHint')}</p>}
          </fieldset>

          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={() => placeOrder.mutate()}
            disabled={placeOrder.isPending}
          >
            {placeOrder.isPending && <Loader2Icon className="animate-spin" aria-hidden />}
            {t('cart.placeOrder')}
            <span className="tabular opacity-80">· {money(cart.subtotal)}</span>
          </Button>
        </div>
      </div>
    </section>
  )
}

function BuyerOption({
  value,
  id,
  label,
  detail,
  roundel,
}: {
  value: string
  id: string
  label: string
  detail: string
  roundel?: React.ReactNode
}) {
  return (
    <Label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 rounded-2xl border bg-background px-3 py-2.5 font-normal has-[[data-state=checked]]:border-foreground has-[[data-state=checked]]:ring-1 has-[[data-state=checked]]:ring-foreground"
    >
      <RadioGroupItem value={value} id={id} />
      {roundel}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
    </Label>
  )
}
