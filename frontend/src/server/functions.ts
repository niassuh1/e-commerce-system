/**
 * Every call the app makes to the backend, as TanStack Start server functions.
 * Handlers run on the server only; the client receives RPC stubs.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import type { Cart, Order, OrderSummary, Product, Store, User } from '#/lib/types'
import { ORDER_STATUSES } from '#/lib/types'
import { asFormResult, clearTokens, django, DjangoError, hasTokens, storeTokens } from './django'

const uuid = z.string().uuid()

// ---------------------------------------------------------------- auth

export const getSession = createServerFn({ method: 'GET' }).handler(async (): Promise<User | null> => {
  if (!hasTokens()) return null
  try {
    return await django<User>('auth', 'me')
  } catch (error) {
    if (error instanceof DjangoError && (error.status === 401 || error.status === 403)) {
      clearTokens()
      return null
    }
    throw error
  }
})

export const login = createServerFn({ method: 'POST' })
  .validator(z.object({ username: z.string().min(1), password: z.string().min(1) }))
  .handler(({ data }) =>
    asFormResult(async () => {
      const tokens = await django<{ access: string; refresh: string }>('auth', 'token', {
        method: 'POST',
        body: data,
        auth: false,
      }).catch((error) => {
        // SimpleJWT answers wrong credentials with a 401 "No active account..." detail
        if (error instanceof DjangoError && error.status === 401) {
          throw new DjangoError(401, 'invalid_credentials')
        }
        throw error
      })
      storeTokens(tokens)
      return true
    }),
  )

export const register = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      username: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(1),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    }),
  )
  .handler(({ data }) =>
    asFormResult(async () => {
      await django<User>('auth', 'register', { method: 'POST', body: data, auth: false })
      const tokens = await django<{ access: string; refresh: string }>('auth', 'token', {
        method: 'POST',
        body: { username: data.username, password: data.password },
        auth: false,
      })
      storeTokens(tokens)
      return true
    }),
  )

export const logout = createServerFn({ method: 'POST' }).handler(() => {
  clearTokens()
  return true
})

// ---------------------------------------------------------------- stores & products

export const listStores = createServerFn({ method: 'GET' }).handler(() =>
  django<Store[]>('store', 'all/', { auth: false }),
)

export const getStore = createServerFn({ method: 'GET' })
  .validator(uuid)
  .handler(({ data: storeId }) => django<Store>('store', 'info/', { storeId, auth: false }))

export const listProducts = createServerFn({ method: 'GET' })
  .validator(uuid)
  .handler(({ data: storeId }) => django<Product[]>('product', 'list/', { storeId, auth: false }))

export const getProduct = createServerFn({ method: 'GET' })
  .validator(z.object({ storeId: uuid, productId: uuid }))
  .handler(({ data }) => django<Product>('product', `${data.productId}/`, { storeId: data.storeId, auth: false }))

const storeFields = z.object({
  name: z.string().trim().min(1).max(255),
  logo_url: z.union([z.string().url(), z.literal('')]),
})

export const createStore = createServerFn({ method: 'POST' })
  .validator(storeFields)
  .handler(({ data }) => asFormResult(() => django<Store>('store', 'create/', { method: 'POST', body: data })))

export const updateStore = createServerFn({ method: 'POST' })
  .validator(storeFields.extend({ storeId: uuid }))
  .handler(({ data: { storeId, ...body } }) =>
    asFormResult(() => django<Store>('store', 'info/', { method: 'PATCH', storeId, body })),
  )

const productFields = z.object({
  name: z.string().trim().min(1).max(255),
  image_url: z.union([z.string().url(), z.literal('')]),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  quantity: z.number().int().min(0),
})

export const createProduct = createServerFn({ method: 'POST' })
  .validator(productFields.extend({ storeId: uuid }))
  .handler(({ data: { storeId, ...body } }) =>
    asFormResult(() => django<Product>('product', 'create/', { method: 'POST', storeId, body })),
  )

export const updateProduct = createServerFn({ method: 'POST' })
  .validator(productFields.partial().extend({ storeId: uuid, productId: uuid }))
  .handler(({ data: { storeId, productId, ...body } }) =>
    asFormResult(() => django<Product>('product', `${productId}/`, { method: 'PATCH', storeId, body })),
  )

export const deleteProduct = createServerFn({ method: 'POST' })
  .validator(z.object({ storeId: uuid, productId: uuid }))
  .handler(({ data }) => django<void>('product', `${data.productId}/`, { method: 'DELETE', storeId: data.storeId }))

// ---------------------------------------------------------------- carts

export const listCarts = createServerFn({ method: 'GET' }).handler(async () => {
  if (!hasTokens()) return [] as Cart[]
  const data = await django<{ carts: Cart[] }>('cart', 'all/')
  return data.carts
})

export const addToCart = createServerFn({ method: 'POST' })
  .validator(z.object({ storeId: uuid, productId: uuid, quantity: z.number().int().min(1) }))
  .handler(({ data }) =>
    django<{ product_id: string; quantity: number }>('cart', 'add/', {
      method: 'POST',
      storeId: data.storeId,
      body: { product_id: data.productId, quantity: data.quantity },
    }),
  )

export const setCartQuantity = createServerFn({ method: 'POST' })
  .validator(z.object({ storeId: uuid, productId: uuid, quantity: z.number().int().min(0) }))
  .handler(({ data }) =>
    django<{ product_id: string; quantity: number } | undefined>('cart', `edit/${data.productId}/`, {
      method: 'PATCH',
      storeId: data.storeId,
      body: { quantity: data.quantity },
    }),
  )

export const clearCart = createServerFn({ method: 'POST' })
  .validator(uuid)
  .handler(({ data: storeId }) => django<void>('cart', 'clear/', { method: 'DELETE', storeId }))

// ---------------------------------------------------------------- orders

export const checkout = createServerFn({ method: 'POST' })
  .validator(z.object({ storeId: uuid, buyerStoreId: uuid.nullable() }))
  .handler(({ data }) =>
    django<Order>('order', 'checkout/', {
      method: 'POST',
      storeId: data.storeId,
      body: { buyer_store: data.buyerStoreId },
    }),
  )

export const listMyOrders = createServerFn({ method: 'GET' }).handler(async () => {
  if (!hasTokens()) return [] as OrderSummary[]
  return django<OrderSummary[]>('order', 'list/')
})

export const listStoreOrders = createServerFn({ method: 'GET' })
  .validator(uuid)
  .handler(({ data: storeId }) => django<OrderSummary[]>('order', 'store/', { storeId }))

export const getOrder = createServerFn({ method: 'GET' })
  .validator(uuid)
  .handler(({ data: orderId }) => django<Order>('order', `${orderId}/`))

export const setOrderStatus = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: uuid, status: z.enum(ORDER_STATUSES) }))
  .handler(({ data }) =>
    django<Order>('order', `${data.orderId}/status/`, { method: 'PATCH', body: { status: data.status } }),
  )

/** Stores with a few product photos each, for the image-led store cards on the home page. */
export const listStoreShowcase = createServerFn({ method: 'GET' }).handler(async () => {
  const stores = await django<Store[]>('store', 'all/', { auth: false })
  return Promise.all(
    stores.map(async (store) => {
      const products = await django<Product[]>('product', 'list/', { storeId: store.id, auth: false }).catch(
        () => [] as Product[],
      )
      return {
        ...store,
        product_count: products.length,
        preview: products
          .filter((product) => product.image_url)
          .slice(0, 3)
          .map((product) => ({ id: product.id, name: product.name, image_url: product.image_url })),
      }
    }),
  )
})
