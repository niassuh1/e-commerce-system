import { queryOptions } from '@tanstack/react-query'

import {
  getOrder,
  getProduct,
  getSession,
  getStore,
  listCarts,
  listMyOrders,
  listProducts,
  listStoreOrders,
  listStores,
  listStoreShowcase,
} from '#/server/functions'

export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: () => getSession(),
  staleTime: 60_000,
})

export const storesQuery = queryOptions({
  queryKey: ['stores'],
  queryFn: () => listStores(),
  staleTime: 30_000,
})

export const storeQuery = (storeId: string) =>
  queryOptions({
    queryKey: ['stores', storeId],
    queryFn: () => getStore({ data: storeId }),
    staleTime: 30_000,
  })

export const productsQuery = (storeId: string) =>
  queryOptions({
    queryKey: ['stores', storeId, 'products'],
    queryFn: () => listProducts({ data: storeId }),
    staleTime: 15_000,
  })

export const productQuery = (storeId: string, productId: string) =>
  queryOptions({
    queryKey: ['stores', storeId, 'products', productId],
    queryFn: () => getProduct({ data: { storeId, productId } }),
  })

export const cartsQuery = queryOptions({
  queryKey: ['carts'],
  queryFn: () => listCarts(),
})

export const myOrdersQuery = queryOptions({
  queryKey: ['orders', 'mine'],
  queryFn: () => listMyOrders(),
})

export const storeOrdersQuery = (storeId: string) =>
  queryOptions({
    queryKey: ['orders', 'store', storeId],
    queryFn: () => listStoreOrders({ data: storeId }),
  })

export const orderQuery = (orderId: string) =>
  queryOptions({
    queryKey: ['orders', 'detail', orderId],
    queryFn: () => getOrder({ data: orderId }),
    // Stock is reserved asynchronously after checkout; a fresh order can flip to cancelled.
    refetchInterval: (query) => {
      const order = query.state.data
      if (!order || order.status !== 'pending') return false
      const ageMs = Date.now() - new Date(order.created_at).getTime()
      return ageMs < 60_000 ? 3_000 : false
    },
  })

export const storeShowcaseQuery = queryOptions({
  queryKey: ['stores', 'showcase'],
  queryFn: () => listStoreShowcase(),
  staleTime: 30_000,
})
