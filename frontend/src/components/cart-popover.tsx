import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRightIcon, ShoppingBagIcon, XIcon } from 'lucide-react'

import { ProductImage, QuantityStepper } from '#/components/bits'
import { StoreAvatar } from '#/components/store-avatar'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { useI18n } from '#/i18n'
import { useSetCartQuantity } from '#/lib/mutations'
import { cartsQuery } from '#/lib/queries'

/**
 * Header cart: a popover with every open cart (one per store), editable in place,
 * and a button through to the full cart page where checkout happens.
 */
export function CartPopover({ className }: { className?: string }) {
  const i18n = useI18n()
  const { t, money, number } = i18n
  const [open, setOpen] = useState(false)
  const { data: carts = [] } = useQuery(cartsQuery)
  const setQuantity = useSetCartQuantity()

  const itemCount = carts.reduce((sum, cart) => sum + cart.item_count, 0)
  const total = carts.reduce((sum, cart) => sum + Number(cart.subtotal), 0)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('nav.cartWithCount', { count: itemCount })}
          className={className}
        >
          <ShoppingBagIcon className="size-[18px]" aria-hidden />
          {itemCount > 0 && (
            <span className="tabular absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[10px] font-medium text-background ring-2 ring-background">
              {number(itemCount)}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="flex max-h-[min(640px,calc(100dvh-7rem))] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl p-0 shadow-[0_24px_60px_-24px_rgb(17_17_19/0.35)]"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-base font-medium">{t('carts.title')}</p>
            {itemCount > 0 && (
              <p className="text-xs text-muted-foreground">{t('carts.items', { count: itemCount })}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('cart.close')}
            className="grid size-8 place-items-center rounded-full bg-pill text-foreground hover:bg-accent"
          >
            <XIcon className="size-4" aria-hidden />
          </button>
        </div>

        {carts.length === 0 ? (
          <div className="mx-5 mb-5 grid place-items-center rounded-2xl bg-tile px-6 py-10 text-center">
            <ShoppingBagIcon className="size-6 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm font-medium">{t('cart.empty')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('cart.emptyHint')}</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-3">
            {carts.map((cart) => (
              <section key={cart.store.id} aria-label={cart.store.name} className="mb-2 rounded-2xl bg-tile p-2">
                <div className="flex items-center gap-2.5 px-2 pt-1 pb-2">
                  <StoreAvatar name={cart.store.name} logoUrl={cart.store.logo_url} size="sm" />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{cart.store.name}</p>
                  <p className="tabular text-sm font-medium">{money(cart.subtotal)}</p>
                </div>
                <ul className="grid gap-1">
                  {cart.items.map((line) => (
                    <li key={line.product_id} className="flex items-center gap-3 rounded-xl bg-background p-2">
                      <ProductImage src={line.image_url} alt="" className="size-12 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{line.name}</p>
                        <p className="tabular text-xs text-muted-foreground">{money(line.price)}</p>
                      </div>
                      <QuantityStepper
                        size="sm"
                        min={0}
                        label={`${t('cart.quantity')}: ${line.name}`}
                        value={line.quantity}
                        max={line.available}
                        onChange={(quantity) =>
                          setQuantity.mutate({ storeId: cart.store.id, productId: line.product_id, quantity })
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <div className="border-t p-4">
          {carts.length > 0 && (
            <div className="mb-3 flex items-baseline justify-between px-1">
              <span className="text-sm text-muted-foreground">{t('cart.total')}</span>
              <span className="tabular text-lg font-semibold">{money(total)}</span>
            </div>
          )}
          <Link
            to={carts.length ? '/cart' : '/'}
            onClick={() => setOpen(false)}
            className="group flex h-12 items-center justify-between rounded-full bg-foreground ps-6 pe-1.5 text-sm font-medium text-background no-underline"
          >
            {carts.length ? t('cart.openPage') : t('cart.browse')}
            <span className="grid size-9 place-items-center rounded-full bg-background text-foreground transition-transform duration-500 ease-(--ease-out-expo) group-hover:rotate-45">
              <ArrowUpRightIcon className="size-4 rtl:-scale-x-100" aria-hidden />
            </span>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
