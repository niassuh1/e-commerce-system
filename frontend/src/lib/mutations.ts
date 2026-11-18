import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { errorMessage, useI18n } from '#/i18n'
import { addToCart, setCartQuantity, setOrderStatus } from '#/server/functions'
import type { Cart, OrderStatus } from './types'

export function useAddToCart() {
  const queryClient = useQueryClient()
  const i18n = useI18n()
  return useMutation({
    mutationFn: (input: { storeId: string; storeName: string; productId: string; quantity: number }) =>
      addToCart({ data: { storeId: input.storeId, productId: input.productId, quantity: input.quantity } }),
    onSuccess: (_, input) => {
      toast.success(i18n.t('product.added', { store: input.storeName }))
      return queryClient.invalidateQueries({ queryKey: ['carts'] })
    },
    onError: (error) => toast.error(errorMessage(i18n, error)),
  })
}

/** Optimistic quantity change; 0 removes the line. */
export function useSetCartQuantity() {
  const queryClient = useQueryClient()
  const i18n = useI18n()
  return useMutation({
    mutationFn: (input: { storeId: string; productId: string; quantity: number }) =>
      setCartQuantity({ data: input }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['carts'] })
      const previous = queryClient.getQueryData<Cart[]>(['carts'])
      queryClient.setQueryData<Cart[]>(['carts'], (carts) =>
        carts
          ?.map((cart) => {
            if (cart.store.id !== input.storeId) return cart
            const items = cart.items
              .map((line) =>
                line.product_id === input.productId
                  ? { ...line, quantity: input.quantity, line_total: String(Number(line.price) * input.quantity) }
                  : line,
              )
              .filter((line) => line.quantity > 0)
            return {
              ...cart,
              items,
              item_count: items.reduce((sum, line) => sum + line.quantity, 0),
              subtotal: String(items.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0)),
            }
          })
          .filter((cart) => cart.items.length > 0),
      )
      return { previous }
    },
    onError: (error, _, context) => {
      if (context?.previous) queryClient.setQueryData(['carts'], context.previous)
      toast.error(errorMessage(i18n, error))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['carts'] }),
  })
}

export function useSetOrderStatus() {
  const queryClient = useQueryClient()
  const i18n = useI18n()
  return useMutation({
    mutationFn: (input: { orderId: string; status: OrderStatus }) => setOrderStatus({ data: input }),
    onSuccess: (order) => {
      toast.success(
        order.status === 'cancelled'
          ? i18n.t('orders.cancelled')
          : i18n.t('orders.moved', { status: i18n.t(`status.${order.status}`) }),
      )
      queryClient.setQueryData(['orders', 'detail', order.id], order)
      return queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error) => toast.error(errorMessage(i18n, error)),
  })
}
