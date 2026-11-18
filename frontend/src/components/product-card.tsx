import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowUpRightIcon, Loader2Icon } from 'lucide-react'

import { ProductImage } from '#/components/bits'
import { useI18n } from '#/i18n'
import { useAddToCart } from '#/lib/mutations'
import type { Product } from '#/lib/types'
import { cn } from '#/lib/utils'

/**
 * Tall image tile with the name over the photo; beneath it, a black action circle
 * that widens into an "Add to cart" pill on hover, beside a price pill.
 */
export function ProductCard({
  product,
  storeId,
  storeName,
  inCart,
  mode,
}: {
  product: Product
  storeId: string
  storeName: string
  inCart: number
  /** buy: signed-in shopper · signin: visitor · owner: the store's own product */
  mode: 'buy' | 'signin' | 'owner'
}) {
  const { t, money } = useI18n()
  const navigate = useNavigate()
  const add = useAddToCart()
  const remaining = product.quantity - inCart
  const soldOut = product.quantity <= 0
  const maxed = mode === 'buy' && remaining <= 0 && !soldOut

  const label = soldOut
    ? t('product.outOfStock')
    : maxed
      ? t('product.maxed')
      : mode === 'owner'
        ? t('product.editInDashboard')
        : mode === 'signin'
          ? t('product.signInToBuy')
          : t('product.add')

  function act() {
    if (mode === 'owner') {
      navigate({ to: '/dashboard/$storeId/products', params: { storeId } })
    } else if (mode === 'signin') {
      navigate({ to: '/login', search: { redirect: `/stores/${storeId}` } })
    } else {
      add.mutate({ storeId, storeName, productId: product.id, quantity: 1 })
    }
  }

  return (
    <article className="group flex flex-col gap-3">
      <Link
        to="/stores/$storeId/products/$productId"
        params={{ storeId, productId: product.id }}
        className="relative block overflow-hidden rounded-3xl text-foreground no-underline"
      >
        <ProductImage
          src={product.image_url}
          alt={product.name}
          className="aspect-[4/5] transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/90 via-white/60 to-transparent p-4 pt-12">
          <h3 className="line-clamp-2 text-[15px] leading-snug font-medium">{product.name}</h3>
          <p
            className={cn(
              'mt-0.5 text-xs',
              soldOut ? 'text-destructive' : product.quantity <= 5 ? 'text-warning' : 'text-muted-foreground',
            )}
          >
            {soldOut
              ? t('product.outOfStock')
              : product.quantity <= 5
                ? t('product.lowStock', { count: product.quantity })
                : t('product.inStock', { count: product.quantity })}
          </p>
        </div>
        {inCart > 0 && (
          <span className="tabular absolute start-3 top-3 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-medium text-background">
            {t('product.inCart', { count: inCart })}
          </span>
        )}
      </Link>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={act}
          disabled={soldOut || maxed || add.isPending}
          aria-label={mode === 'buy' ? t('product.addNamed', { name: product.name }) : label}
          className="flex h-11 shrink-0 items-center rounded-full bg-foreground ps-[13px] pe-[13px] text-sm text-background transition-[padding,background-color] duration-500 ease-(--ease-out-expo) group-hover:pe-4 disabled:bg-pill disabled:text-muted-foreground"
        >
          {add.isPending ? (
            <Loader2Icon className="size-[18px] animate-spin" aria-hidden />
          ) : (
            <ArrowUpRightIcon className="size-[18px] rtl:-scale-x-100" aria-hidden />
          )}
          <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity,margin] duration-500 ease-(--ease-out-expo) group-hover:ms-2 group-hover:max-w-40 group-hover:opacity-100 group-focus-within:ms-2 group-focus-within:max-w-40 group-focus-within:opacity-100">
            {label}
          </span>
        </button>
        <span className="tabular flex h-11 min-w-0 flex-1 items-center justify-center rounded-full border border-input px-4 text-[15px]">
          {money(product.price)}
        </span>
      </div>
    </article>
  )
}
